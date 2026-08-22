// Booking notification emails — partners AND guests.
//
// The app writes bookings straight to Firestore, so nothing server-side sees
// them happen — this route POLLS (GitHub Actions every 5 min; Vercel's daily
// cron as backstop). Three passes over the last 7 days of bookings:
//
//   1. New booking → PARTNER: pending = "action required, answer within 24h";
//      instant-confirmed = FYI. Pending+instant (unfinished checkout) = silent.
//   2. Still pending after 12h → PARTNER reminder (once).
//   3. Confirmed → GUEST confirmation. Gated on server-owned payment state:
//      app rules let any member create a "confirmed" booking with ANY
//      customerEmail, so without this gate the route is a mass mailer.
//
// Every send is recorded in `email_log` (dashboard-owned; the app never reads
// it): `{bookingId}` for pass 1, `{bookingId}_reminder`, `{bookingId}_guest`.
// Party-level dedupe (`party` key) absorbs the app's duplicate-doc bug.
//
// Efficiency: ONE bookings query, then db.getAll() for logs / providers /
// companies, and all decisions in memory — ~6 round trips per run regardless
// of volume (was ~45 sequential at 5 bookings/day).
//
//   POST /api/notify/bookings          Authorization: Bearer <CRON_SECRET>
//   POST /api/notify/bookings?dry=1    report what WOULD send, send nothing
import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { adminDb } from '@/lib/firebase-admin'
import { sendEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'

const DAY = 24 * 3600 * 1000
const LOOKBACK_MS = 7 * DAY          // one query covers all three passes
const NEW_WINDOW_MS = DAY            // pass 1 only looks at the last 24h
const REMIND_AFTER_MS = 12 * 3600 * 1000
const MAX_GUEST_MAILS_PER_RUN = 25   // cap: even a gated vector shouldn't burst
const SITE = 'https://www.palmeraexp.com'

type Doc = FirebaseFirestore.DocumentData

/** HTML-escape anything that came from a client-written field. */
const esc = (v: unknown) => String(v ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
/** Subject lines: strip control chars/newlines so nothing injects headers. */
const subj = (v: unknown) => String(v ?? '').replace(/[\r\n\t]+/g, ' ').slice(0, 120)

const fmtXof = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(n))
const whenFr = (b: Doc) => {
  const d = b.scheduledFor?.toDate?.() as Date | undefined
  return d ? d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : '—'
}
const row = (label: string, value: string) =>
  `<tr><td style="padding:6px 14px 6px 0;color:#8a8577;font-size:13px">${label}</td><td style="padding:6px 0;color:#2a2119;font-size:14px"><strong>${value}</strong></td></tr>`
const shell = (eyebrow: string, title: string, body: string) => `
<div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;padding:24px">
  <p style="letter-spacing:0.14em;font-size:11px;color:#9e763b;text-transform:uppercase">${esc(eyebrow)}</p>
  <h2 style="color:#2a2119;font-weight:500">${esc(title)}</h2>
  ${body}
</div>`
const button = (href: string, label: string) =>
  `<p style="margin:22px 0"><a href="${href}" style="background:#9e763b;color:#ebe8db;text-decoration:none;padding:11px 22px;border-radius:8px;font-family:Arial,sans-serif;font-size:13px">${esc(label)}</a></p>`

const partyKey = (b: Doc) => `${b.customerId}__${b.experienceId}__${b.scheduledFor?.toMillis?.() ?? ''}`
const isReal = (b: Doc) => typeof b.providerId === 'string' && typeof b.bookingTotal === 'number'
const awaitingPayment = (b: Doc) => b.status === 'pending' && b.confirmationType === 'instant'
/** Guest mail only when money actually moved (server-owned field) — or the
 *  booking is a free reservation whose email matches the Auth account. */
const guestMailAllowed = (b: Doc, authEmail: string | null) => {
  if (b.payment?.status === 'completed') return true
  const to = String(b.customerEmail || b.checkout?.customerEmail || '').toLowerCase()
  return !!authEmail && authEmail.toLowerCase() === to
}

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const got = Buffer.from((req.headers.get('authorization') || '').replace(/^Bearer /, ''))
  const want = Buffer.from(secret)
  return got.length === want.length && timingSafeEqual(got, want)
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const dry = req.nextUrl.searchParams.get('dry') === '1'

  try {
    const db = adminDb()
    const now = Date.now()

    // ── 1 query: every booking from the last 7 days, oldest first ──────────
    const snap = await db.collection('bookings').where('createdAt', '>=', new Date(now - LOOKBACK_MS)).get()
    const bookings = snap.docs
      .map(d => ({ id: d.id, b: d.data() }))
      .filter(x => isReal(x.b))
      .sort((a, z) => (a.b.createdAt?.toMillis?.() ?? 0) - (z.b.createdAt?.toMillis?.() ?? 0))

    // ── batch reads: logs (3 per booking), providers, companies ───────────
    const getAll = async (refs: FirebaseFirestore.DocumentReference[]) => {
      const out: FirebaseFirestore.DocumentSnapshot[] = []
      for (let i = 0; i < refs.length; i += 100) out.push(...(refs.length ? await db.getAll(...refs.slice(i, i + 100)) : []))
      return out
    }
    const logRefs = bookings.flatMap(x => [x.id, `${x.id}_reminder`, `${x.id}_guest`].map(id => db.collection('email_log').doc(id)))
    const providerIds = [...new Set(bookings.map(x => x.b.providerId as string))]
    const companyIds = [...new Set(bookings.map(x => x.b.companyId as string).filter(Boolean))]
    const [logSnaps, provSnaps, coSnaps] = await Promise.all([
      getAll(logRefs),
      getAll(providerIds.map(id => db.collection('providers').doc(id))),
      getAll(companyIds.map(id => db.collection('companies').doc(id))),
    ])
    const logs = new Map(logSnaps.filter(s => s.exists).map(s => [s.id, s.data() as Doc]))
    const providers = new Map(provSnaps.filter(s => s.exists).map(s => [s.id, s.data() as Doc]))
    const companies = new Map(coSnaps.filter(s => s.exists).map(s => [s.id, s.data() as Doc]))
    // Parties already handled, per kind — rebuilt from the logs we just read.
    const partyDone = new Set<string>()
    for (const [, l] of logs) if (l.party && l.kind && l.kind !== 'duplicate_suppressed') partyDone.add(`${l.kind}:${l.party}`)
    const guestPartyDone = new Set([...partyDone].filter(k => k.startsWith('guest_confirmation:')).map(k => k.slice('guest_confirmation:'.length)))

    const batch = db.batch()
    let writes = 0
    const log = (id: string, data: Doc) => { if (!dry) { batch.set(db.collection('email_log').doc(id), data); writes++ } }
    const companyName = (b: Doc) => companies.get(b.companyId)?.name || b.provider || 'votre établissement'

    // ── pass 1: new bookings → partner ─────────────────────────────────────
    const sent: { booking: string; to?: string; title?: string; skipped?: string }[] = []
    const seenParty = new Set<string>()
    for (const { id, b } of bookings) {
      if ((b.createdAt?.toMillis?.() ?? 0) < now - NEW_WINDOW_MS) continue
      if (!['pending', 'confirmed'].includes(b.status) || awaitingPayment(b)) continue
      const party = partyKey(b)
      if (logs.has(id)) { seenParty.add(party); continue }
      if (seenParty.has(party) || partyDone.has(`new_booking_pending:${party}`) || partyDone.has(`new_booking_confirmed:${party}`)) {
        log(id, { kind: 'duplicate_suppressed', party, sentAt: new Date(), title: b.title ?? null })
        sent.push({ booking: id, skipped: 'duplicate of an already-notified party' }); continue
      }
      const provider = providers.get(b.providerId)
      const to = provider?.email
      if (!to) { sent.push({ booking: id, skipped: 'provider has no email' }); continue }
      if (provider?.notificationPrefs?.bookings === false) {
        log(id, { kind: 'opted_out', party, sentAt: new Date(), title: b.title ?? null })
        sent.push({ booking: id, skipped: 'partner opted out' }); seenParty.add(party); continue
      }
      const pending = b.status === 'pending'
      if (!dry) {
        await sendEmail({
          to,
          subject: pending ? `⏳ Nouvelle réservation à confirmer — ${subj(b.title)}` : `✓ Nouvelle réservation confirmée — ${subj(b.title)}`,
          html: shell(`Palmera · ${companyName(b)}`,
            pending ? 'Nouvelle réservation — action requise' : 'Nouvelle réservation — confirmée automatiquement',
            `<table style="border-collapse:collapse">
              ${row('Expérience', esc(b.title || '—'))}
              ${row('Client', esc(b.customerName || '—'))}
              ${row('Date', esc(whenFr(b)))}
              ${row('Personnes', esc(b.guestCount || 1))}
              ${b.bookingTotal > 0 ? row('Montant', `${fmtXof(b.bookingTotal)} XOF`) : ''}
            </table>
            <p style="color:#2a2119;font-size:14px">${pending
              ? 'Cette réservation attend votre confirmation — <strong>merci de répondre sous 24 h</strong>. Sans réponse, le client risque de réserver ailleurs.'
              : 'Réservation instantanée — aucune action requise, elle est déjà sur votre calendrier.'}</p>
            ${button(`${SITE}/partner/reservations${pending ? '?f=pending' : ''}`, pending ? 'Répondre dans le tableau de bord' : 'Voir dans le tableau de bord')}
            <p style="color:#8a8577;font-size:11px">${pending
              ? 'New booking awaiting your confirmation — please respond within 24h from your Palmera dashboard.'
              : 'Instant booking, auto-confirmed — no action needed; it is already on your calendar.'}</p>`),
        })
      }
      log(id, { kind: pending ? 'new_booking_pending' : 'new_booking_confirmed', to, sentAt: new Date(), title: b.title ?? null, party })
      seenParty.add(party)
      sent.push({ booking: id, to, title: String(b.title) })
    }

    // ── pass 2: still pending after 12h → partner reminder (once) ──────────
    const reminders: { booking: string; to?: string; skipped?: string }[] = []
    for (const { id, b } of bookings) {
      if (b.status !== 'pending' || awaitingPayment(b)) continue
      const created = b.createdAt?.toMillis?.() ?? 0
      if (!created || now - created < REMIND_AFTER_MS) continue
      if (logs.has(`${id}_reminder`)) continue
      if (logs.get(id)?.kind !== 'new_booking_pending') continue  // only bookings we actually notified
      const provider = providers.get(b.providerId)
      const to = provider?.email
      if (!to) { reminders.push({ booking: id, skipped: 'no email' }); continue }
      if (provider?.notificationPrefs?.bookings === false) { reminders.push({ booking: id, skipped: 'opted out' }); continue }
      const hours = Math.round((now - created) / 3600000)
      if (!dry) {
        await sendEmail({
          to,
          subject: `⏰ Toujours en attente — ${subj(b.title)}`,
          html: shell('Palmera · rappel', `Une réservation attend votre réponse depuis ${hours} h`,
            `<p style="color:#2a2119;font-size:14px"><strong>${esc(b.title)}</strong> — ${esc(b.customerName || 'un client')} · ${esc(whenFr(b))} · ${esc(b.guestCount || 1)} pers.</p>
            <p style="color:#2a2119;font-size:14px">Les clients attendent une réponse sous 24 h. Sans réponse, ils risquent de réserver ailleurs.</p>
            ${button(`${SITE}/partner/reservations?f=pending`, 'Répondre maintenant')}
            <p style="color:#8a8577;font-size:11px">Reminder: a booking has been awaiting your response for ${hours}h — guests expect an answer within 24h.</p>`),
        })
      }
      log(`${id}_reminder`, { kind: 'pending_reminder', to, sentAt: new Date(), title: b.title ?? null, party: partyKey(b) })
      reminders.push({ booking: id, to })
    }

    // ── pass 3: confirmed → guest confirmation (gated, capped, one per party) ─
    const guestMails: { booking: string; to?: string; skipped?: string }[] = []
    const authEmailCache = new Map<string, string | null>()
    const authEmailOf = async (uid: string) => {
      if (!authEmailCache.has(uid)) {
        const { getAuth } = await import('firebase-admin/auth')
        authEmailCache.set(uid, await getAuth().getUser(uid).then(u => u.emailVerified ? (u.email ?? null) : null).catch(() => null))
      }
      return authEmailCache.get(uid) ?? null
    }
    let guestCount = 0
    for (const { id, b } of bookings) {
      if (b.status !== 'confirmed') continue
      const to = b.customerEmail || b.checkout?.customerEmail
      if (!to) continue
      if (logs.has(`${id}_guest`)) continue
      const party = partyKey(b)
      if (guestPartyDone.has(party)) { log(`${id}_guest`, { kind: 'duplicate_suppressed', party, sentAt: new Date() }); continue }
      const allowed = await guestMailAllowed(b, b.payment?.status === 'completed' ? null : await authEmailOf(String(b.customerId || '')))
      if (!allowed) { guestMails.push({ booking: id, skipped: 'unpaid and email does not match the verified account' }); continue }
      if (guestCount >= MAX_GUEST_MAILS_PER_RUN) { guestMails.push({ booking: id, skipped: 'per-run cap' }); continue }
      if (!dry) {
        await sendEmail({
          to,
          subject: `✓ Réservation confirmée — ${subj(b.title)}`,
          html: shell('Palmera', 'Votre réservation est confirmée',
            `<table style="border-collapse:collapse">
              ${row('Expérience', esc(b.title || '—'))}
              ${row('Chez', esc(companyName(b)))}
              ${row('Date', esc(whenFr(b)))}
              ${row('Personnes', esc(b.guestCount || 1))}
              ${b.bookingTotal > 0 ? row('Montant', `${fmtXof(b.bookingTotal)} XOF`) : ''}
              ${row('Référence', esc(id))}
            </table>
            <p style="color:#2a2119;font-size:14px">Tout est prêt. Retrouvez les détails dans l’app Palmera.</p>
            <p style="color:#8a8577;font-size:11px">Your booking is confirmed — details are in the Palmera app.</p>`),
        })
      }
      log(`${id}_guest`, { kind: 'guest_confirmation', to, sentAt: new Date(), title: b.title ?? null, party })
      guestPartyDone.add(party)
      guestCount++
      guestMails.push({ booking: id, to })
    }

    if (writes > 0) await batch.commit()
    return NextResponse.json({ ok: true, dry, checked: bookings.length, sent, reminders, guestMails })
  } catch (e) {
    console.error('notify/bookings failed:', e)
    return NextResponse.json({ ok: false, error: 'notify failed' }, { status: 500 })
  }
}

// Vercel cron invokes via GET (with Authorization: Bearer CRON_SECRET).
export { POST as GET }
