// Booking notification BACKSTOP — the scheduled poll.
//
// Since 2026-10-25 the primary path is event-driven: the app's
// `onBookingWritten` posts each real transition to /api/notify/event, which
// sends immediately and stamps `notified.{event}_{recipient}` on the
// booking. This route exists for what that path can miss — an outage on
// either side, a function retry budget exhausted, a booking written while
// NOTIFY_SECRET was rotated — and for the two mails that are time-based
// rather than event-based. It is keyed on MISSING stamps/logs, never on
// "created in the last N hours", so a booking is never dropped by a gap.
//
//   1. New booking without a partner mail (whole 7-day lookback) → PARTNER:
//      pending = "action required", confirmed = FYI. Unpaid stubs = silent.
//   2. Still pending 12h after we told the partner → PARTNER reminder (once).
//   3. (retired) guest confirmation — now `member_confirmed` through
//      /api/notify/event, fired by the app's function on pending→confirmed.
//   4. Confirmed and happening in 20–28h → MEMBER day-before reminder (once).
//
// `email_log` ids: `{id}` (pass 1, legacy slot), `{id}_reminder`,
// `{id}_member_reminder_24h`; the event route uses `{id}_{event}_{party}`.
// Party-level dedupe (`party` key) absorbs the app's duplicate-doc bug.
//
// Efficiency: two bookings queries (7-day createdAt window; a scheduledFor
// window for pass 4 — a booking happening tomorrow may be weeks old) then
// db.getAll() for logs / providers / companies, all decisions in memory.
//
//   POST /api/notify/bookings          Authorization: Bearer <CRON_SECRET>
//   POST /api/notify/bookings?dry=1    report what WOULD send, send nothing
import { NextRequest, NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { adminDb } from '@/lib/firebase-admin'
import { sendEmail } from '@/lib/email'
import { renderBookingEmail, type BookingCtx } from '@/lib/email-templates'
import {
  bearerMatches, isRealBooking, isUnpaidCheckoutStub, logIsTerminal,
  memberAddress, memberMailAllowed, partnerAddress, partnerOptedOut,
} from '@/lib/notify'

export const dynamic = 'force-dynamic'

const HOUR = 3600 * 1000
const DAY = 24 * HOUR
const LOOKBACK_MS = 7 * DAY            // pass 1 + 2: every booking created in this window
const REMIND_AFTER_MS = 12 * HOUR
const MEMBER_REMINDER_MIN_MS = 20 * HOUR  // pass 4 window: scheduledFor in [now+20h, now+28h]
const MEMBER_REMINDER_MAX_MS = 28 * HOUR
const MAX_MEMBER_MAILS_PER_RUN = 25    // cap: even a gated vector shouldn't burst

type Doc = FirebaseFirestore.DocumentData
type Row = { id: string; b: Doc }

const partyKey = (b: Doc) => `${b.customerId}__${b.experienceId}__${b.scheduledFor?.toMillis?.() ?? ''}`

export async function POST(req: NextRequest) {
  if (!bearerMatches(req.headers.get('authorization'), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const dry = req.nextUrl.searchParams.get('dry') === '1'

  try {
    const db = adminDb()
    const now = Date.now()

    // ── bookings: last 7 days by createdAt (passes 1–2) + tomorrow's by
    //    scheduledFor (pass 4). Both are single-field range queries — no
    //    composite index, status filtered in memory. ─────────────────────
    const [recentSnap, tomorrowSnap] = await Promise.all([
      db.collection('bookings').where('createdAt', '>=', new Date(now - LOOKBACK_MS)).get(),
      db.collection('bookings')
        .where('scheduledFor', '>=', new Date(now + MEMBER_REMINDER_MIN_MS))
        .where('scheduledFor', '<=', new Date(now + MEMBER_REMINDER_MAX_MS)).get(),
    ])
    const toRows = (snap: FirebaseFirestore.QuerySnapshot) => snap.docs
      .map(d => ({ id: d.id, b: d.data() }))
      .filter(x => isRealBooking(x.b))
    const bookings: Row[] = toRows(recentSnap)
      .sort((a, z) => (a.b.createdAt?.toMillis?.() ?? 0) - (z.b.createdAt?.toMillis?.() ?? 0))
    const tomorrow: Row[] = toRows(tomorrowSnap).filter(x => x.b.status === 'confirmed')

    // ── batch reads: logs, providers, companies ─────────────────────────
    const getAll = async (refs: FirebaseFirestore.DocumentReference[]) => {
      const out: FirebaseFirestore.DocumentSnapshot[] = []
      for (let i = 0; i < refs.length; i += 100) out.push(...(refs.length ? await db.getAll(...refs.slice(i, i + 100)) : []))
      return out
    }
    const logIds = [
      ...bookings.flatMap(x => [x.id, `${x.id}_created_partner`, `${x.id}_reminder`]),
      ...tomorrow.map(x => `${x.id}_member_reminder_24h`),
    ]
    const all = [...bookings, ...tomorrow]
    const providerIds = [...new Set(all.map(x => x.b.providerId as string))]
    const companyIds = [...new Set(all.map(x => x.b.companyId as string).filter(Boolean))]
    const [logSnaps, provSnaps, coSnaps] = await Promise.all([
      getAll(logIds.map(id => db.collection('email_log').doc(id))),
      getAll(providerIds.map(id => db.collection('providers').doc(id))),
      getAll(companyIds.map(id => db.collection('companies').doc(id))),
    ])
    const logs = new Map(logSnaps.filter(s => s.exists).map(s => [s.id, s.data() as Doc]))
    const providers = new Map(provSnaps.filter(s => s.exists).map(s => [s.id, s.data() as Doc]))
    const companies = new Map(coSnaps.filter(s => s.exists).map(s => [s.id, s.data() as Doc]))
    // Parties already handled, per kind — rebuilt from the logs we just read.
    const partyDone = new Set<string>()
    for (const [, l] of logs) if (l.party && l.kind && l.kind !== 'duplicate_suppressed' && logIsTerminal(l)) partyDone.add(`${l.kind}:${l.party}`)
    const partyNotified = (party: string) =>
      ['new_booking_pending', 'new_booking_confirmed', 'partner_new_pending', 'partner_new_confirmed'].some(k => partyDone.has(`${k}:${party}`))

    const batch = db.batch()
    let writes = 0
    const log = (id: string, data: Doc) => { if (!dry) { batch.set(db.collection('email_log').doc(id), data); writes++ } }
    // set+merge, not update: a booking the app deleted mid-run must not sink
    // the whole batch (and every log row in it).
    const stamp = (id: string, key: string) => { if (!dry) { batch.set(db.collection('bookings').doc(id), { notified: { [key]: FieldValue.serverTimestamp() } }, { merge: true }); writes++ } }
    const ctxOf = (id: string, b: Doc): BookingCtx => ({ id, b, companyName: companies.get(b.companyId)?.name || b.provider || 'votre établissement' })
    /** Pass 1 already happened for this booking, by either path. */
    const partnerNotified = (id: string, b: Doc) =>
      logIsTerminal(logs.get(id)) || logIsTerminal(logs.get(`${id}_created_partner`)) || !!b.notified?.created_partner

    // ── pass 1: new bookings without a partner mail → partner ───────────
    const sent: { booking: string; to?: string; title?: string; skipped?: string }[] = []
    const seenParty = new Set<string>()
    for (const { id, b } of bookings) {
      if (!['pending', 'confirmed'].includes(b.status) || isUnpaidCheckoutStub(b)) continue
      const party = partyKey(b)
      if (partnerNotified(id, b)) { seenParty.add(party); continue }
      if (seenParty.has(party) || partyNotified(party)) {
        log(id, { kind: 'duplicate_suppressed', party, sentAt: new Date(), title: b.title ?? null })
        sent.push({ booking: id, skipped: 'duplicate of an already-notified party' }); continue
      }
      const provider = providers.get(b.providerId)
      const to = partnerAddress(provider, companies.get(b.companyId))
      if (!to) { sent.push({ booking: id, skipped: 'provider has no email' }); continue }
      if (partnerOptedOut(provider)) {
        log(id, { kind: 'opted_out', party, sentAt: new Date(), title: b.title ?? null })
        sent.push({ booking: id, skipped: 'partner opted out' }); seenParty.add(party); continue
      }
      const pending = b.status === 'pending'
      const kind = pending ? 'partner_new_pending' : 'partner_new_confirmed'
      try {
        if (!dry) await sendEmail({ to, ...renderBookingEmail(kind, ctxOf(id, b)) })
      } catch (e) {
        const reason = (e instanceof Error ? e.message : String(e)).slice(0, 200)
        console.error('partner mail failed', id, reason)
        log(id, { kind: 'send_failed', reason, to, party, sentAt: new Date(), title: b.title ?? null })
        sent.push({ booking: id, skipped: `send failed: ${reason}` }); continue
      }
      // Legacy kind names kept on the `{id}` slot: the admin page and older
      // logs read them, and pass 2 keys on `new_booking_pending`.
      log(id, { kind: pending ? 'new_booking_pending' : 'new_booking_confirmed', to, sentAt: new Date(), title: b.title ?? null, party, via: 'backstop' })
      stamp(id, 'created_partner')
      seenParty.add(party)
      sent.push({ booking: id, to, title: String(b.title) })
    }

    // ── pass 2: still pending 12h after our mail → partner reminder (once) ─
    const reminders: { booking: string; to?: string; skipped?: string }[] = []
    for (const { id, b } of bookings) {
      if (b.status !== 'pending' || isUnpaidCheckoutStub(b)) continue
      const created = b.createdAt?.toMillis?.() ?? 0
      if (!created || now - created < REMIND_AFTER_MS) continue
      if (logs.has(`${id}_reminder`)) continue
      // Only bookings we actually told the partner about, by either path.
      const told = logs.get(id)?.kind === 'new_booking_pending' || logs.get(`${id}_created_partner`)?.kind === 'partner_new_pending'
      if (!told) continue
      const provider = providers.get(b.providerId)
      const to = partnerAddress(provider, companies.get(b.companyId))
      if (!to) { reminders.push({ booking: id, skipped: 'no email' }); continue }
      if (partnerOptedOut(provider)) { reminders.push({ booking: id, skipped: 'opted out' }); continue }
      const hours = Math.round((now - created) / HOUR)
      try {
        if (!dry) await sendEmail({ to, ...renderBookingEmail('partner_pending_reminder', ctxOf(id, b), { hours }) })
      } catch (e) {
        const reason = (e instanceof Error ? e.message : String(e)).slice(0, 200)
        console.error('reminder mail failed', id, reason)
        reminders.push({ booking: id, skipped: `send failed: ${reason}` }); continue
      }
      log(`${id}_reminder`, { kind: 'pending_reminder', to, sentAt: new Date(), title: b.title ?? null, party: partyKey(b) })
      reminders.push({ booking: id, to })
    }

    // ── pass 3: guest confirmation — retired; see /api/notify/event ───────

    // ── pass 4: confirmed, happening in 20–28h → member reminder (once) ───
    // Hourly-ish cadence + an 8h window means every booking is seen at least
    // once even if a few GitHub runs are throttled; the log makes it once.
    const memberReminders: { booking: string; to?: string; skipped?: string }[] = []
    const reminderPartyDone = new Set<string>()
    let memberCount = 0
    for (const { id, b } of tomorrow) {
      if (logIsTerminal(logs.get(`${id}_member_reminder_24h`))) continue
      const party = partyKey(b)
      if (reminderPartyDone.has(party) || partyDone.has(`member_reminder_24h:${party}`)) {
        log(`${id}_member_reminder_24h`, { kind: 'duplicate_suppressed', party, sentAt: new Date() }); continue
      }
      if (!memberMailAllowed(b)) { memberReminders.push({ booking: id, skipped: 'unpaid and not a reservation' }); continue }
      const to = memberAddress(b)
      if (!to) { memberReminders.push({ booking: id, skipped: 'no member email' }); continue }
      if (memberCount >= MAX_MEMBER_MAILS_PER_RUN) { memberReminders.push({ booking: id, skipped: 'per-run cap' }); continue }
      // One bad send must never 500 the run (that would re-fail every tick
      // and starve the partner passes). Record it on the slot — retryable.
      try {
        if (!dry) await sendEmail({ to, ...renderBookingEmail('member_reminder_24h', ctxOf(id, b)) })
      } catch (e) {
        const reason = (e instanceof Error ? e.message : String(e)).slice(0, 200)
        console.error('member reminder failed', id, reason)
        log(`${id}_member_reminder_24h`, { kind: 'send_failed', reason, to, party, sentAt: new Date(), title: b.title ?? null })
        memberReminders.push({ booking: id, skipped: `send failed: ${reason}` }); continue
      }
      log(`${id}_member_reminder_24h`, { kind: 'member_reminder_24h', to, sentAt: new Date(), title: b.title ?? null, party })
      stamp(id, 'reminder_24h_member')
      reminderPartyDone.add(party)
      memberCount++
      memberReminders.push({ booking: id, to })
    }

    if (writes > 0) await batch.commit()
    return NextResponse.json({ ok: true, dry, checked: bookings.length, checkedTomorrow: tomorrow.length, sent, reminders, memberReminders })
  } catch (e) {
    console.error('notify/bookings failed:', e)
    // The reason (no payload, no addresses) so the Actions log says WHY.
    const reason = (e instanceof Error ? `${e.name}: ${e.message}` : String(e)).slice(0, 200)
    return NextResponse.json({ ok: false, error: 'notify failed', reason }, { status: 500 })
  }
}

// Vercel cron invokes via GET (with Authorization: Bearer CRON_SECRET).
export { POST as GET }
