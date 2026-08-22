// Booking notification emails for partners.
//
// The app writes bookings straight to Firestore, so nothing server-side sees
// them happen — this route POLLS: called on a schedule (cron) or manually, it
// finds bookings created in the last 24h and emails the partner
// (provider.email) — two variants: PENDING gets the action-required email
// (confirm/decline), instant-CONFIRMED gets a calm FYI ("it's on your
// calendar"). Each send is recorded in the
// dashboard-owned `email_log` collection (doc id = booking id) so nothing
// ever sends twice. The app never reads email_log — zero Samson impact.
//
//   POST /api/notify/bookings          (Authorization: Bearer <CRON_SECRET>)
//   POST /api/notify/bookings?dry=1    report what WOULD send, send nothing
//
// Cadence: .github/workflows/notify-bookings.yml polls every 5 minutes (the
// real driver); vercel.json's daily 07:00 UTC cron is a backstop only —
// Vercel Hobby allows just one cron run per day.
import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { sendEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'

const WINDOW_MS = 24 * 3600 * 1000

const fmtXof = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(n))

function bookingEmail(b: Record<string, unknown>, companyName: string) {
  const when = (b.scheduledFor as { toDate?: () => Date })?.toDate?.()
  const whenStr = when
    ? when.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
    : '—'
  const guests = (b.guestCount as number) || 1
  const total = (b.bookingTotal as number) || 0
  const pending = b.status === 'pending'
  const row = (label: string, value: string) =>
    `<tr><td style="padding:6px 14px 6px 0;color:#8a8577;font-size:13px">${label}</td><td style="padding:6px 0;color:#2a2119;font-size:14px"><strong>${value}</strong></td></tr>`
  return {
    subject: pending
      ? `⏳ Nouvelle réservation à confirmer — ${b.title}`
      : `✓ Nouvelle réservation confirmée — ${b.title}`,
    html: `
<div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;padding:24px">
  <p style="letter-spacing:0.14em;font-size:11px;color:#9e763b;text-transform:uppercase">Palmera · ${companyName}</p>
  <h2 style="color:#2a2119;font-weight:500">${pending ? 'Nouvelle réservation — action requise' : 'Nouvelle réservation — confirmée automatiquement'}</h2>
  <table style="border-collapse:collapse">
    ${row('Expérience', String(b.title || '—'))}
    ${row('Client', String(b.customerName || '—'))}
    ${row('Date', whenStr)}
    ${row('Personnes', String(guests))}
    ${total > 0 ? row('Montant', `${fmtXof(total)} XOF`) : ''}
  </table>
  <p style="color:#2a2119;font-size:14px">${pending
    ? 'Cette réservation attend votre confirmation.'
    : 'Réservation instantanée — aucune action requise, elle est déjà sur votre calendrier.'}</p>
  <p style="margin:22px 0">
    <a href="https://www.palmeraexp.com/partner/reservations${pending ? '?f=pending' : ''}" style="background:#9e763b;color:#ebe8db;text-decoration:none;padding:11px 22px;border-radius:8px;font-family:Arial,sans-serif;font-size:13px">${pending ? 'Répondre dans le tableau de bord' : 'Voir dans le tableau de bord'}</a>
  </p>
  <p style="color:#8a8577;font-size:11px">${pending
    ? 'New booking awaiting your confirmation — open your Palmera dashboard to respond.'
    : 'Instant booking, auto-confirmed — no action needed; it is already on your calendar.'}</p>
</div>`,
  }
}

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get('authorization') || ''
  if (process.env.NODE_ENV === 'production' && (!secret || auth !== `Bearer ${secret}`)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const dry = req.nextUrl.searchParams.get('dry') === '1'

  try {
    const db = adminDb()
    const since = new Date(Date.now() - WINDOW_MS)
    const snap = await db.collection('bookings').where('createdAt', '>=', since).get()

    // The app creates a NEW booking + NEW Stripe session on every checkout
    // attempt, so one party can arrive as 2-3 identical docs seconds apart.
    // Notify once per party; log the rest as suppressed so they never send.
    const partyKey = (b: FirebaseFirestore.DocumentData) =>
      `${b.customerId}__${b.experienceId}__${b.scheduledFor?.toMillis?.() ?? ''}`
    const seenParty = new Set<string>()
    const ordered = [...snap.docs].sort(
      (a, b) => (a.data().createdAt?.toMillis?.() ?? 0) - (b.data().createdAt?.toMillis?.() ?? 0),
    )

    const results: { booking: string; to?: string; title?: string; skipped?: string }[] = []
    for (const doc of ordered) {
      const b = doc.data()
      // Malformed payment-only docs never notify. Pending → action email;
      // confirmed (instant approvals) → FYI email. Terminal states → nothing.
      if (typeof b.providerId !== 'string' || typeof b.bookingTotal !== 'number') { continue }
      if (!['pending', 'confirmed'].includes(b.status)) { continue }
      // Pending on an INSTANT listing = the guest's checkout is unfinished.
      // Nothing for the partner to do; staying silent also leaves the log
      // entry unwritten, so the "✓ confirmed" FYI still fires once paid.
      if (b.status === 'pending' && b.confirmationType === 'instant') { continue }

      const logRef = db.collection('email_log').doc(doc.id)
      const existing = await logRef.get()
      if (existing.exists) {
        // Already handled — but remember the party so its duplicates stay quiet.
        seenParty.add(partyKey(b))
        continue
      }
      if (seenParty.has(partyKey(b))) {
        if (!dry) await logRef.set({ kind: 'duplicate_suppressed', party: partyKey(b), sentAt: new Date(), title: b.title ?? null })
        results.push({ booking: doc.id, skipped: 'duplicate of an already-notified party' })
        continue
      }

      const provider = (await db.collection('providers').doc(b.providerId).get()).data()
      const to = provider?.email
      if (!to) { results.push({ booking: doc.id, skipped: 'provider has no email' }); continue }
      const company = (await db.collection('companies').doc(b.companyId).get()).data()
      const companyName = company?.name || 'votre établissement'

      if (dry) { results.push({ booking: doc.id, to, title: String(b.title) }); continue }

      const mail = bookingEmail(b, companyName)
      await sendEmail({ to, subject: mail.subject, html: mail.html })
      await logRef.set({ kind: b.status === 'pending' ? 'new_booking_pending' : 'new_booking_confirmed', to, sentAt: new Date(), title: b.title ?? null, party: partyKey(b) })
      seenParty.add(partyKey(b))
      results.push({ booking: doc.id, to, title: String(b.title) })
    }
    // ── Reminder pass (Jordan/ChatGPT #26): a manual-approval booking still
    // pending after 12h gets ONE nudge. Partners are told to answer within
    // 24h; guests shouldn't sit waiting indefinitely. Logged as
    // `${id}_reminder` so it never repeats.
    const REMIND_AFTER_MS = 12 * 3600 * 1000
    const reminders: { booking: string; to?: string; skipped?: string }[] = []
    for (const doc of ordered) {
      const b = doc.data()
      if (b.status !== 'pending' || b.confirmationType === 'instant') continue
      if (typeof b.providerId !== 'string' || typeof b.bookingTotal !== 'number') continue
      const created = b.createdAt?.toMillis?.() ?? 0
      if (!created || Date.now() - created < REMIND_AFTER_MS) continue
      const logRef = db.collection('email_log').doc(`${doc.id}_reminder`)
      if ((await logRef.get()).exists) continue
      // Only remind about bookings we actually notified (skips suppressed duplicates).
      const first = await db.collection('email_log').doc(doc.id).get()
      if (!first.exists || first.data()?.kind !== 'new_booking_pending') continue
      const provider = (await db.collection('providers').doc(b.providerId).get()).data()
      const to = provider?.email
      if (!to) { reminders.push({ booking: doc.id, skipped: 'no email' }); continue }
      if (dry) { reminders.push({ booking: doc.id, to }); continue }
      const hours = Math.round((Date.now() - created) / 3600000)
      const whenStr = b.scheduledFor?.toDate?.()?.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) ?? '—'
      await sendEmail({
        to,
        subject: `⏰ Toujours en attente — ${b.title}`,
        html: `
<div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;padding:24px">
  <p style="letter-spacing:0.14em;font-size:11px;color:#9e763b;text-transform:uppercase">Palmera · rappel</p>
  <h2 style="color:#2a2119;font-weight:500">Une réservation attend votre réponse depuis ${hours} h</h2>
  <p style="color:#2a2119;font-size:14px"><strong>${b.title}</strong> — ${String(b.customerName || 'un client')} · ${whenStr} · ${(b.guestCount as number) || 1} pers.</p>
  <p style="color:#2a2119;font-size:14px">Les clients attendent une réponse sous 24 h. Sans réponse, ils risquent de réserver ailleurs.</p>
  <p style="margin:22px 0"><a href="https://www.palmeraexp.com/partner/reservations?f=pending" style="background:#9e763b;color:#ebe8db;text-decoration:none;padding:11px 22px;border-radius:8px;font-family:Arial,sans-serif;font-size:13px">Répondre maintenant</a></p>
  <p style="color:#8a8577;font-size:11px">Reminder: a booking has been awaiting your response for ${hours}h — guests expect an answer within 24h.</p>
</div>`,
      })
      await logRef.set({ kind: 'pending_reminder', to, sentAt: new Date(), title: b.title ?? null, party: partyKey(b) })
      reminders.push({ booking: doc.id, to })
    }

    return NextResponse.json({ ok: true, dry, checked: snap.size, sent: results, reminders })
  } catch (e) {
    console.error('notify/bookings failed:', e)
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}

// Vercel cron invokes via GET (with Authorization: Bearer CRON_SECRET).
export { POST as GET }
