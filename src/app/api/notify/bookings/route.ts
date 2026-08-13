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
    <a href="https://www.palmeraexp.com/partner/reservations" style="background:#9e763b;color:#ebe8db;text-decoration:none;padding:11px 22px;border-radius:8px;font-family:Arial,sans-serif;font-size:13px">${pending ? 'Répondre dans le tableau de bord' : 'Voir dans le tableau de bord'}</a>
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

    const results: { booking: string; to?: string; title?: string; skipped?: string }[] = []
    for (const doc of snap.docs) {
      const b = doc.data()
      // Malformed payment-only docs never notify. Pending → action email;
      // confirmed (instant approvals) → FYI email. Terminal states → nothing.
      if (typeof b.providerId !== 'string' || typeof b.bookingTotal !== 'number') { continue }
      if (!['pending', 'confirmed'].includes(b.status)) { continue }

      const logRef = db.collection('email_log').doc(doc.id)
      if ((await logRef.get()).exists) { continue }

      const provider = (await db.collection('providers').doc(b.providerId).get()).data()
      const to = provider?.email
      if (!to) { results.push({ booking: doc.id, skipped: 'provider has no email' }); continue }
      const company = (await db.collection('companies').doc(b.companyId).get()).data()
      const companyName = company?.name || 'votre établissement'

      if (dry) { results.push({ booking: doc.id, to, title: String(b.title) }); continue }

      const mail = bookingEmail(b, companyName)
      await sendEmail({ to, subject: mail.subject, html: mail.html })
      await logRef.set({ kind: b.status === 'pending' ? 'new_booking_pending' : 'new_booking_confirmed', to, sentAt: new Date(), title: b.title ?? null })
      results.push({ booking: doc.id, to, title: String(b.title) })
    }
    return NextResponse.json({ ok: true, dry, checked: snap.size, sent: results })
  } catch (e) {
    console.error('notify/bookings failed:', e)
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}

// Vercel cron invokes via GET (with Authorization: Bearer CRON_SECRET).
export { POST as GET }
