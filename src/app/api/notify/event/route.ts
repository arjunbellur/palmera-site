// Event-driven booking emails — the PRIMARY path since 2026-10-25.
//
// The app's `onBookingWritten` function posts `{ bookingId, event }` here on
// real transitions (contract: docs/app-notify-event-contract.md). We load the
// booking, decide who hears about it, render from email-templates.ts, send
// through Resend and record `email_log/{bookingId}_{event}_{recipient}` plus
// a `notified.{event}_{recipient}` stamp on the booking. The scheduled poll
// (/api/notify/bookings) is now only a backstop keyed on those stamps.
//
// Idempotent: a terminal log row for the slot → `{ ok, skipped }`, so the
// function may retry freely. One bad send never 500s: the failure is logged
// on the slot (`kind: 'send_failed'`) and reported in a 200.
//
//   POST /api/notify/event          Authorization: Bearer <NOTIFY_SECRET>
//   POST /api/notify/event?dry=1    decide + render, send and write nothing
import { NextRequest, NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { adminDb } from '@/lib/firebase-admin'
import { sendEmail } from '@/lib/email'
import { renderBookingEmail, maskEmail, type BookingEmailKind, type BookingCtx } from '@/lib/email-templates'
import {
  NOTIFY_EVENTS, type NotifyEvent,
  bearerMatches, isRealBooking, isUnpaidCheckoutStub, logIsTerminal,
  memberAddress, memberMailAllowed, partnerAddress, partnerOptedOut,
} from '@/lib/notify'

export const dynamic = 'force-dynamic'

type Doc = FirebaseFirestore.DocumentData
type Recipient = 'partner' | 'member'

interface Job { recipient: Recipient; kind: BookingEmailKind }
interface Result { recipient: Recipient; kind: BookingEmailKind; to?: string; sent?: boolean; skipped?: string; failed?: string }

/** Which mails an event produces, given the booking as it is NOW. The
 *  status is re-checked rather than trusted from the caller: a late or
 *  replayed 'confirmed' for a booking that is already cancelled sends
 *  nothing. */
function jobsFor(event: NotifyEvent, b: Doc): { jobs: Job[]; skipped?: string } {
  switch (event) {
    case 'created':
      if (isUnpaidCheckoutStub(b)) return { jobs: [], skipped: 'unpaid checkout stub' }
      if (b.status === 'pending') return { jobs: [{ recipient: 'partner', kind: 'partner_new_pending' }] }
      if (b.status === 'confirmed') return { jobs: [{ recipient: 'partner', kind: 'partner_new_confirmed' }] }
      return { jobs: [], skipped: `status is ${b.status}` }
    case 'confirmed':
      if (b.status !== 'confirmed' && b.status !== 'completed') return { jobs: [], skipped: `status is ${b.status}` }
      return { jobs: [{ recipient: 'member', kind: 'member_confirmed' }] }
    case 'declined':
      if (b.status !== 'declined') return { jobs: [], skipped: `status is ${b.status}` }
      return { jobs: [{ recipient: 'member', kind: 'member_declined' }] }
    case 'cancelled':
      if (b.status !== 'cancelled') return { jobs: [], skipped: `status is ${b.status}` }
      return { jobs: [{ recipient: 'partner', kind: 'partner_cancelled_by_member' }, { recipient: 'member', kind: 'member_cancelled' }] }
    case 'refunded': {
      const settled = b.payment?.refundState === 'refunded' || b.payment?.status === 'refunded'
      if (!settled) return { jobs: [], skipped: 'refund not settled on payment receipt' }
      return { jobs: [{ recipient: 'partner', kind: 'partner_refund_issued' }] }
    }
    case 'payment_received':
      // Only while the partner still has to answer — once confirmed, the
      // confirmation mail says everything this one would.
      if (b.payment?.status !== 'completed') return { jobs: [], skipped: 'payment not completed' }
      if (b.status !== 'pending') return { jobs: [], skipped: `status is ${b.status}` }
      return { jobs: [{ recipient: 'member', kind: 'member_payment_received' }] }
  }
}

export async function POST(req: NextRequest) {
  if (!bearerMatches(req.headers.get('authorization'), process.env.NOTIFY_SECRET)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const dry = req.nextUrl.searchParams.get('dry') === '1'
  const body = await req.json().catch(() => null) as { bookingId?: unknown; event?: unknown } | null
  const bookingId = typeof body?.bookingId === 'string' && /^[A-Za-z0-9_-]{4,128}$/.test(body.bookingId) ? body.bookingId : null
  const event = (NOTIFY_EVENTS as readonly string[]).includes(String(body?.event)) ? body!.event as NotifyEvent : null
  if (!bookingId || !event) return NextResponse.json({ ok: false, error: 'bad request: { bookingId, event } required' }, { status: 400 })

  try {
    const db = adminDb()
    const bookingRef = db.collection('bookings').doc(bookingId)
    const bookingSnap = await bookingRef.get()
    if (!bookingSnap.exists) return NextResponse.json({ ok: false, error: 'booking not found' }, { status: 404 })
    const b = bookingSnap.data() as Doc
    if (!isRealBooking(b)) return NextResponse.json({ ok: true, bookingId, event, skipped: 'not a v3.3 booking' })

    const { jobs, skipped } = jobsFor(event, b)
    if (jobs.length === 0) return NextResponse.json({ ok: true, dry, bookingId, event, skipped })

    const logRef = (recipient: Recipient) => db.collection('email_log').doc(`${bookingId}_${event}_${recipient}`)
    const [provSnap, coSnap, ...logSnaps] = await db.getAll(
      db.collection('providers').doc(String(b.providerId)),
      db.collection('companies').doc(String(b.companyId || '_')),
      ...jobs.map(j => logRef(j.recipient)),
    )
    const provider = provSnap.exists ? provSnap.data() : undefined
    const company = coSnap.exists ? coSnap.data() : undefined
    const ctx: BookingCtx = { id: bookingId, b, companyName: company?.name || b.provider || 'votre établissement' }

    const results: Result[] = []
    const stamps: Record<string, FieldValue> = {}  // nested under `notified`
    const log = async (recipient: Recipient, data: Doc) => {
      if (dry) return
      await logRef(recipient).set({ ...data, event, bookingId, title: b.title ?? null, party: `${b.customerId}__${b.experienceId}__${b.scheduledFor?.toMillis?.() ?? ''}`, sentAt: new Date() })
    }

    for (const [i, job] of jobs.entries()) {
      const existing = logSnaps[i]?.exists ? logSnaps[i].data() : undefined
      if (logIsTerminal(existing)) { results.push({ ...job, skipped: 'already sent' }); continue }

      let to: string | null
      if (job.recipient === 'partner') {
        if (partnerOptedOut(provider)) {
          await log('partner', { kind: 'opted_out' })
          results.push({ ...job, skipped: 'partner opted out' }); continue
        }
        to = partnerAddress(provider, company)
        if (!to) { await log('partner', { kind: 'skipped', reason: 'no partner email' }); results.push({ ...job, skipped: 'provider and company have no email' }); continue }
      } else {
        if (!memberMailAllowed(b)) {
          await log('member', { kind: 'skipped', reason: 'unpaid and not a reservation' })
          results.push({ ...job, skipped: 'member mail only after a completed payment or on a free reservation' }); continue
        }
        to = memberAddress(b)
        if (!to) { await log('member', { kind: 'skipped', reason: 'no member email' }); results.push({ ...job, skipped: 'booking has no customer email' }); continue }
      }

      const { subject, html } = renderBookingEmail(job.kind, ctx)
      try {
        if (!dry) await sendEmail({ to, subject, html })
      } catch (e) {
        const reason = (e instanceof Error ? e.message : String(e)).slice(0, 200)
        console.error('notify/event send failed', bookingId, job.kind, reason)
        await log(job.recipient, { kind: 'send_failed', reason, to })
        results.push({ ...job, to: maskEmail(to), failed: reason }); continue
      }
      await log(job.recipient, { kind: job.kind, to })
      stamps[`${event}_${job.recipient}`] = FieldValue.serverTimestamp()
      results.push({ ...job, to: maskEmail(to), sent: true })
    }

    // The stamp is what the backstop reads — written after the log so a
    // crash between the two leaves the slot retryable, never silent.
    // Nested map + merge: touches only `notified.<slot>`, and does not throw
    // if the app deleted the booking between our read and this write.
    if (!dry && Object.keys(stamps).length) await bookingRef.set({ notified: stamps }, { merge: true }).catch(e => console.error('notify stamp failed', bookingId, e))

    const allSkipped = results.every(r => r.skipped === 'already sent')
    return NextResponse.json({ ok: true, dry, bookingId, event, ...(allSkipped ? { skipped: 'already sent' } : {}), results })
  } catch (e) {
    console.error('notify/event failed:', e)
    const reason = (e instanceof Error ? `${e.name}: ${e.message}` : String(e)).slice(0, 200)
    return NextResponse.json({ ok: false, error: 'notify failed', reason }, { status: 500 })
  }
}
