// Every transactional email the dashboard sends, as pure render functions:
// `{ subject, html }` from a booking (or payout / invite) document. No I/O,
// no secrets — the notify routes pick a template, send through Resend and
// write `email_log`. Booking mails render in the recipient's language
// (`BookingCtx.lang`, French by default): the member's app language, or the
// partner's Settings → Notifications choice. The dashboard-originated mails
// below are still French with a short English line.
//
// Everything interpolated from a client-written field goes through `esc`
// (bodies) or `subj` (subject lines): the app lets any member write
// `customerName`, `title`, `customerEmail`… onto a booking, so a template
// that trusted them would be an HTML injection vector.
import type { Booking } from './schema'
import { bookingPaymentLabel } from './payments'

/** Loose booking shape — the routes hand us raw Firestore data. */
export type BookingDoc = FirebaseFirestore.DocumentData

export interface Rendered { subject: string; html: string }

export const SITE = 'https://www.palmeraexp.com'

/** HTML-escape anything that came from a client-written field. */
export const esc = (v: unknown) => String(v ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
/** Subject lines: strip control chars/newlines so nothing injects headers. */
export const subj = (v: unknown) => String(v ?? '').replace(/[\r\n\t]+/g, ' ').slice(0, 120)

export const fmtXof = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(n))
const toDate = (v: unknown): Date | undefined => {
  if (!v) return undefined
  if (v instanceof Date) return v
  const t = v as { toDate?: () => Date }
  return typeof t.toDate === 'function' ? t.toDate() : undefined
}

/** The language a mail is written in. Members: their app language (the app
 *  posts it with the event; `profiles.notificationLang` overrides). Partners:
 *  `providers.notificationPrefs.lang`, set in Settings → Notifications.
 *  Senegal default: French. */
export type MailLang = 'fr' | 'en'
export const asMailLang = (v: unknown, fallback: MailLang = 'fr'): MailLang => {
  const s = String(v ?? '').toLowerCase()
  return s.startsWith('en') ? 'en' : s.startsWith('fr') ? 'fr' : fallback
}
const LOCALE: Record<MailLang, string> = { fr: 'fr-FR', en: 'en-GB' }
const WHEN: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }
export const whenIn = (b: BookingDoc, lang: MailLang) => {
  const d = toDate(b.scheduledFor)
  return d ? d.toLocaleDateString(LOCALE[lang], WHEN) : '—'
}
export const whenFr = (b: BookingDoc) => whenIn(b, 'fr')
const dayFr = (v: unknown) => {
  const d = toDate(v)
  return d ? d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'
}
/** Pick the sentence for the mail's language. */
const T = (lang: MailLang, fr: string, en: string) => (lang === 'fr' ? fr : en)

export const row = (label: string, value: string) =>
  `<tr><td style="padding:6px 14px 6px 0;color:#8a8577;font-size:13px">${label}</td><td style="padding:6px 0;color:#2a2119;font-size:14px"><strong>${value}</strong></td></tr>`
export const shell = (eyebrow: string, title: string, body: string) => `
<div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;padding:24px">
  <p style="letter-spacing:0.14em;font-size:11px;color:#9e763b;text-transform:uppercase">${esc(eyebrow)}</p>
  <h2 style="color:#2a2119;font-weight:500">${esc(title)}</h2>
  ${body}
</div>`
export const button = (href: string, label: string) =>
  `<p style="margin:22px 0"><a href="${href}" style="background:#9e763b;color:#ebe8db;text-decoration:none;padding:11px 22px;border-radius:8px;font-family:Arial,sans-serif;font-size:13px">${esc(label)}</a></p>`

const p = (text: string) => `<p style="color:#2a2119;font-size:14px">${text}</p>`
const en = (text: string) => `<p style="color:#8a8577;font-size:11px">${esc(text)}</p>`

/** `j***@domain` — enough to recognise an address in a log, not to use it. */
export const maskEmail = (email: unknown) => {
  const s = String(email ?? '')
  const at = s.indexOf('@')
  if (at < 1) return s ? '***' : ''
  return `${s[0]}***${s.slice(at)}`
}

// ── Booking context ─────────────────────────────────────────────────────────
export interface BookingCtx {
  id: string
  b: BookingDoc
  /** companies/{companyId}.name, falling back to the frozen `provider`. */
  companyName: string
  /** The recipient's language. Absent = French (how every mail read before
   *  2026-11-03, minus the small English line at the bottom). */
  lang?: MailLang
  /** Attendee mails: the guest who joined, and the host who added them. */
  attendeeName?: string
  hostName?: string
}
const langOf = (ctx: BookingCtx): MailLang => ctx.lang ?? 'fr'

const detailsTable = (ctx: BookingCtx, opts: { withCompany?: boolean; withRef?: boolean; withPayment?: boolean } = {}) => {
  const { b } = ctx
  const l = langOf(ctx)
  const payment = opts.withPayment && (b.payment || b.mode === 'reservation')
    ? row(T(l, 'Paiement', 'Payment'), esc(bookingPaymentLabel(b as Pick<Booking, 'mode' | 'payment' | 'paidCount' | 'payersCount'>, l)))
    : ''
  return `<table style="border-collapse:collapse">
    ${row(T(l, 'Expérience', 'Experience'), esc(b.title || '—'))}
    ${opts.withCompany ? row(T(l, 'Chez', 'At'), esc(ctx.companyName)) : row(T(l, 'Client', 'Guest'), esc(b.customerName || '—'))}
    ${row('Date', esc(whenIn(b, l)))}
    ${row(T(l, 'Personnes', 'Guests'), esc(b.guestCount || 1))}
    ${typeof b.bookingTotal === 'number' && b.bookingTotal > 0 ? row(T(l, 'Montant', 'Amount'), `${fmtXof(b.bookingTotal)} XOF`) : ''}
    ${payment}
    ${opts.withRef ? row(T(l, 'Référence', 'Reference'), esc(ctx.id)) : ''}
  </table>`
}

// ── Partner ─────────────────────────────────────────────────────────────────
// French wording unchanged from the August route — partners know these
// mails; the English versions say the same thing.

export const partnerNewPending = (ctx: BookingCtx): Rendered => {
  const l = langOf(ctx)
  return {
    subject: T(l, `⏳ Nouvelle réservation à confirmer — ${subj(ctx.b.title)}`, `⏳ New booking to confirm — ${subj(ctx.b.title)}`),
    html: shell(`Palmera · ${ctx.companyName}`, T(l, 'Nouvelle réservation — action requise', 'New booking — action required'),
      `${detailsTable(ctx)}
      ${p(T(l, 'Cette réservation attend votre confirmation — <strong>merci de répondre sous 24 h</strong>. Sans réponse, le client risque de réserver ailleurs.',
                'This booking is waiting for your confirmation — <strong>please respond within 24h</strong>. Without an answer the guest may book elsewhere.'))}
      ${button(`${SITE}/partner/reservations?f=pending`, T(l, 'Répondre dans le tableau de bord', 'Respond in the dashboard'))}`),
  }
}

export const partnerNewConfirmed = (ctx: BookingCtx): Rendered => {
  const l = langOf(ctx)
  return {
    subject: T(l, `✓ Nouvelle réservation confirmée — ${subj(ctx.b.title)}`, `✓ New confirmed booking — ${subj(ctx.b.title)}`),
    html: shell(`Palmera · ${ctx.companyName}`, T(l, 'Nouvelle réservation — confirmée automatiquement', 'New booking — confirmed automatically'),
      `${detailsTable(ctx)}
      ${p(T(l, 'Réservation instantanée — aucune action requise, elle est déjà sur votre calendrier.',
                'Instant booking — no action needed, it is already on your calendar.'))}
      ${button(`${SITE}/partner/reservations`, T(l, 'Voir dans le tableau de bord', 'Open the dashboard'))}`),
  }
}

export const partnerPendingReminder = (ctx: BookingCtx, hours: number): Rendered => {
  const l = langOf(ctx)
  return {
    subject: T(l, `⏰ Toujours en attente — ${subj(ctx.b.title)}`, `⏰ Still waiting — ${subj(ctx.b.title)}`),
    html: shell(T(l, 'Palmera · rappel', 'Palmera · reminder'), T(l, `Une réservation attend votre réponse depuis ${hours} h`, `A booking has been waiting on you for ${hours}h`),
      `${p(`<strong>${esc(ctx.b.title)}</strong> — ${esc(ctx.b.customerName || T(l, 'un client', 'a guest'))} · ${esc(whenIn(ctx.b, l))} · ${esc(ctx.b.guestCount || 1)} ${T(l, 'pers.', 'guest(s)')}`)}
      ${p(T(l, 'Les clients attendent une réponse sous 24 h. Sans réponse, ils risquent de réserver ailleurs.',
                'Guests expect an answer within 24h. Without one they may book elsewhere.'))}
      ${button(`${SITE}/partner/reservations?f=pending`, T(l, 'Répondre maintenant', 'Respond now'))}`),
  }
}

export const partnerCancelledByMember = (ctx: BookingCtx): Rendered => {
  const l = langOf(ctx)
  return {
    subject: T(l, `✕ Réservation annulée par le client — ${subj(ctx.b.title)}`, `✕ Booking cancelled by the guest — ${subj(ctx.b.title)}`),
    html: shell(`Palmera · ${ctx.companyName}`, T(l, 'Réservation annulée par le client', 'Booking cancelled by the guest'),
      `${detailsTable(ctx, { withPayment: true })}
      ${p(T(l, 'Le client a annulé cette réservation. Le créneau est de nouveau disponible — aucune action requise de votre part.',
                'The guest cancelled this booking. The slot is free again — nothing to do on your side.'))}
      ${button(`${SITE}/partner/reservations`, T(l, 'Voir le calendrier', 'Open the calendar'))}`),
  }
}

export const partnerRefundIssued = (ctx: BookingCtx): Rendered => {
  const l = langOf(ctx)
  return {
    subject: T(l, `↩ Remboursement effectué — ${subj(ctx.b.title)}`, `↩ Refund issued — ${subj(ctx.b.title)}`),
    html: shell(`Palmera · ${ctx.companyName}`, T(l, 'Remboursement effectué au client', 'The guest was refunded'),
      `${detailsTable(ctx, { withPayment: true })}
      ${p(T(l, 'Le paiement de cette réservation a été remboursé au client par Palmera. Le montant n’apparaîtra pas dans votre prochain versement.',
                'Palmera refunded the guest for this booking. The amount will not be part of your next payout.'))}
      ${button(`${SITE}/partner/reservations`, T(l, 'Voir dans le tableau de bord', 'Open the dashboard'))}`),
  }
}

// ── Member ──────────────────────────────────────────────────────────────────
// Sent only when the recipient is trustworthy: the routes gate on
// `payment.status === 'completed'` or `mode === 'reservation'`, never on the
// client-writable address alone.

export const memberConfirmed = (ctx: BookingCtx): Rendered => {
  const l = langOf(ctx)
  return {
    subject: T(l, `✓ Réservation confirmée — ${subj(ctx.b.title)}`, `✓ Booking confirmed — ${subj(ctx.b.title)}`),
    html: shell('Palmera', T(l, 'Votre réservation est confirmée', 'Your booking is confirmed'),
      `${detailsTable(ctx, { withCompany: true, withRef: true, withPayment: true })}
      ${p(T(l, 'Tout est prêt. Retrouvez les détails et votre billet dans l’app Palmera.',
                'All set. The details and your ticket are in the Palmera app.'))}`),
  }
}

export const memberDeclined = (ctx: BookingCtx): Rendered => {
  const l = langOf(ctx)
  const paid = ctx.b.payment?.status === 'completed'
  return {
    subject: T(l, `Réservation non disponible — ${subj(ctx.b.title)}`, `Booking not available — ${subj(ctx.b.title)}`),
    html: shell('Palmera', T(l, 'Votre réservation n’a pas pu être acceptée', 'Your booking could not be accepted'),
      `${detailsTable(ctx, { withCompany: true, withRef: true })}
      ${p(T(l, `${esc(ctx.companyName)} n’a pas pu accepter cette réservation pour ce créneau.${paid ? ' Votre paiement vous est intégralement remboursé.' : ''} Vous pouvez choisir une autre date ou une autre expérience dans l’app.`,
                `${esc(ctx.companyName)} could not accept this booking for that slot.${paid ? ' Your payment is refunded in full.' : ''} Pick another date or experience in the app.`))}`),
  }
}

export const memberCancelled = (ctx: BookingCtx): Rendered => {
  const l = langOf(ctx)
  const paid = !!ctx.b.payment && ctx.b.payment.status !== 'pending' && ctx.b.payment.status !== 'failed'
  const settled = ctx.b.payment?.refundState === 'refunded' || ctx.b.payment?.status === 'refunded'
  const refundLine = paid
    ? settled
      ? p(T(l, 'Votre paiement a été remboursé. Selon votre banque ou votre opérateur, il peut apparaître sous 5 à 10 jours ouvrés.',
                'Your payment has been refunded. Depending on your bank or operator it can take 5 to 10 business days to appear.'))
      : p(T(l, 'Le remboursement de votre paiement est en cours. Selon votre banque ou votre opérateur, il peut apparaître sous 5 à 10 jours ouvrés.',
                'Your refund is on its way. Depending on your bank or operator it can take 5 to 10 business days to appear.'))
    : ''
  return {
    subject: T(l, `Réservation annulée — ${subj(ctx.b.title)}`, `Booking cancelled — ${subj(ctx.b.title)}`),
    html: shell('Palmera', T(l, 'Votre réservation est annulée', 'Your booking is cancelled'),
      `${detailsTable(ctx, { withCompany: true, withRef: true, withPayment: paid })}
      ${refundLine}
      ${p(T(l, 'Nous espérons vous retrouver bientôt sur Palmera.', 'We hope to see you again on Palmera soon.'))}`),
  }
}

export const memberReminder24h = (ctx: BookingCtx): Rendered => {
  const l = langOf(ctx)
  return {
    subject: T(l, `Demain — ${subj(ctx.b.title)}`, `Tomorrow — ${subj(ctx.b.title)}`),
    html: shell(T(l, 'Palmera · rappel', 'Palmera · reminder'), T(l, 'C’est demain', 'It’s tomorrow'),
      `${detailsTable(ctx, { withCompany: true, withRef: true })}
      ${p(T(l, 'Votre billet est dans l’app Palmera — présentez le QR code à l’arrivée.',
                'Your ticket is in the Palmera app — show the QR code when you arrive.'))}`),
  }
}

/** Replaces the app's "Confirmation sent" claim: the money is in, the
 *  partner still has to say yes. */
export const memberPaymentReceived = (ctx: BookingCtx): Rendered => {
  const l = langOf(ctx)
  return {
    subject: T(l, `Paiement reçu — ${subj(ctx.b.title)}`, `Payment received — ${subj(ctx.b.title)}`),
    html: shell('Palmera', T(l, 'Paiement reçu — en attente de confirmation', 'Payment received — awaiting confirmation'),
      `${detailsTable(ctx, { withCompany: true, withRef: true, withPayment: true })}
      ${p(T(l, `Votre paiement est bien reçu. ${esc(ctx.companyName)} confirme généralement sous 24 h — vous recevrez un e-mail dès que c’est fait. En cas de refus, vous êtes intégralement remboursé.`,
                `Your payment is in. ${esc(ctx.companyName)} usually confirms within 24h — you will get an email as soon as they do. If they decline, you are refunded in full.`))}`),
  }
}

/** A guest the host added to the group (invite accepted, or join request
 *  approved): their own copy of the plan, and where their ticket is. */
export const memberAttendeeJoined = (ctx: BookingCtx): Rendered => {
  const l = langOf(ctx)
  const host = esc(ctx.hostName || ctx.b.customerName || T(l, 'votre hôte', 'your host'))
  const hello = ctx.attendeeName ? `${esc(ctx.attendeeName)}, ` : ''
  return {
    subject: T(l, `Vous êtes sur la liste — ${subj(ctx.b.title)}`, `You’re on the list — ${subj(ctx.b.title)}`),
    html: shell('Palmera', T(l, `${host} vous a ajouté à sa réservation`, `${host} added you to their booking`),
      `${detailsTable(ctx, { withCompany: true, withRef: true })}
      ${p(T(l, `${hello}vous faites partie du groupe. Votre billet (QR code) est dans l’app Palmera, onglet Journey — présentez-le à l’arrivée.`,
                `${hello}you are part of the group. Your ticket (QR code) is in the Palmera app under Journey — show it when you arrive.`))}`),
  }
}

export type BookingEmailKind =
  | 'partner_new_pending' | 'partner_new_confirmed' | 'partner_pending_reminder'
  | 'partner_cancelled_by_member' | 'partner_refund_issued'
  | 'member_confirmed' | 'member_declined' | 'member_cancelled' | 'member_reminder_24h' | 'member_payment_received'
  | 'member_attendee_joined'

/** One dispatcher so the routes never hold a template switch of their own. */
export function renderBookingEmail(kind: BookingEmailKind, ctx: BookingCtx, extra: { hours?: number } = {}): Rendered {
  switch (kind) {
    case 'partner_new_pending': return partnerNewPending(ctx)
    case 'partner_new_confirmed': return partnerNewConfirmed(ctx)
    case 'partner_pending_reminder': return partnerPendingReminder(ctx, extra.hours ?? 12)
    case 'partner_cancelled_by_member': return partnerCancelledByMember(ctx)
    case 'partner_refund_issued': return partnerRefundIssued(ctx)
    case 'member_confirmed': return memberConfirmed(ctx)
    case 'member_declined': return memberDeclined(ctx)
    case 'member_cancelled': return memberCancelled(ctx)
    case 'member_reminder_24h': return memberReminder24h(ctx)
    case 'member_payment_received': return memberPaymentReceived(ctx)
    case 'member_attendee_joined': return memberAttendeeJoined(ctx)
  }
}

// ── Dashboard-originated ────────────────────────────────────────────────────

export const staffInvite = (args: { companyName: string; name?: string | null; invitedBy?: string | null }): Rendered => ({
  subject: `Accès équipe — ${subj(args.companyName)} sur Palmera`,
  html: shell('Palmera · équipe', `Vous rejoignez l’équipe de ${args.companyName}`,
    `${p(`${args.name ? `${esc(args.name)}, b` : 'B'}ienvenue. <strong>${esc(args.companyName)}</strong> vous a donné accès à son tableau de bord Palmera pour accueillir les clients et scanner leurs billets.`)}
    ${p('Connectez-vous avec cette adresse e-mail — l’accès est rattaché à l’adresse, pas besoin d’invitation supplémentaire.')}
    ${button(`${SITE}/dashboard`, 'Ouvrir le tableau de bord')}
    ${en(`${args.companyName} added you to their Palmera team. Sign in with this email address to check guests in.`)}`),
})

export const agreementCountersigned = (args: { providerName: string; signatoryName: string; signatoryTitle?: string | null; agreementVersion?: string | null }): Rendered => ({
  subject: 'Votre accord partenaire Palmera est signé',
  html: shell('Palmera · accord partenaire', 'Accord contresigné — vous êtes partenaire Palmera',
    `${p(`${esc(args.providerName)}, Palmera a contresigné votre accord partenaire${args.agreementVersion ? ` (version ${esc(args.agreementVersion)})` : ''}. Il est désormais pleinement exécuté.`)}
    ${p(`Signé pour Palmera par ${esc(args.signatoryName)}${args.signatoryTitle ? `, ${esc(args.signatoryTitle)}` : ''}. Retrouvez l’accord signé dans Réglages → Convention de partenariat.`)}
    ${button(`${SITE}/partner/agreement`, 'Voir l’accord')}
    ${en('Palmera countersigned your partner agreement; it is now fully executed. Open it from Settings → Partnership agreement in your dashboard.')}`),
})

export const payoutSent = (args: { companyName: string; amount: number; currency: string; periodStart: unknown; periodEnd: unknown; reference?: string | null; method?: string | null }): Rendered => ({
  subject: `Versement envoyé — ${fmtXof(args.amount)} ${subj(args.currency)} · ${subj(args.companyName)}`,
  html: shell(`Palmera · ${args.companyName}`, 'Votre versement est parti',
    `<table style="border-collapse:collapse">
      ${row('Montant', `${fmtXof(args.amount)} ${esc(args.currency)}`)}
      ${row('Période', `${esc(dayFr(args.periodStart))} → ${esc(dayFr(args.periodEnd))}`)}
      ${args.method ? row('Moyen', esc(args.method)) : ''}
      ${args.reference ? row('Référence', esc(args.reference)) : ''}
    </table>
    ${p('Le détail des réservations réglées par ce versement est dans votre tableau de bord, onglet Revenus.')}
    ${button(`${SITE}/partner/earnings`, 'Voir le détail')}
    ${en('Your payout has been sent — the bookings it settles are listed under Earnings in your dashboard.')}`),
})

// ── Marketplace (dépôt-vente) — docs/marketplace-api.md ────────────────────
// Suppliers and businesses are both French-first; one English line at the end.

export type MarketplaceMailKind = 'supplier_new_order' | 'supplier_reported' | 'business_paid' | 'business_payment_due' | 'business_declined'

type MarketOrder = FirebaseFirestore.DocumentData & { id: string }
const linesHtml = (o: MarketOrder) => `<ul style="padding-left:18px;color:#2a2119;font-size:14px">${(o.items as { qty: number; name: string; mode: string; usedQty?: number | null }[])
  .map((i) => `<li>${i.qty}× ${esc(i.name)} · ${i.mode === 'buy' ? 'achat' : 'emprunt'}${typeof i.usedQty === 'number' && i.mode === 'borrow' ? ` — ${i.usedQty} utilisée(s)` : ''}</li>`).join('')}</ul>`

export function marketplaceMail(kind: MarketplaceMailKind, o: MarketOrder): Rendered {
  const fee = o.deliveryFee ? row('Frais de livraison', `${fmtXof(o.deliveryFee)} XOF`) : ''
  switch (kind) {
    case 'supplier_new_order':
      return {
        subject: `${o.status === 'pending_review' ? '⏳ Commande à valider' : 'Nouvelle commande'} — ${subj(o.companyName)}`,
        html: shell('Palmera · dépôt-vente', `${o.companyName} vous passe commande`,
          `${linesHtml(o)}
          <table style="border-collapse:collapse">${row('Valeur prêtée', `${fmtXof(o.orderTotal)} XOF`)}${row('Remise', o.fulfilment === 'delivery' ? 'Livraison' : 'Retrait sur place')}${row('Carte enregistrée', o.payment?.cardLabel ? esc(o.payment.cardLabel) : 'pas encore')}</table>
          ${o.reviewReason ? p(`<strong>À valider :</strong> ${esc(o.reviewReason)}`) : ''}
          ${o.note ? p(`Note : ${esc(o.note)}`) : ''}
          ${button(`${SITE}/supplier/orders`, 'Voir la commande')}
          ${en(`${o.companyName} placed an order. Review it in your supplier portal.`)}`),
      }
    case 'supplier_reported':
      return {
        subject: `Retours déclarés — ${subj(o.companyName)}`,
        html: shell('Palmera · dépôt-vente', `${o.companyName} a déclaré ses retours`,
          `${p('Vérifiez le décompte lors de la reprise, puis validez-le pour encaisser.')}${linesHtml(o)}
          ${button(`${SITE}/supplier/orders`, 'Vérifier et clôturer')}
          ${en('The business reported its leftovers. Verify the count and settle to get paid.')}`),
      }
    case 'business_paid':
      return {
        subject: `Reçu — ${fmtXof(o.finalTotal || 0)} XOF · ${subj(o.supplierName)}`,
        html: shell(`Palmera · ${o.supplierName}`, 'Décompte validé et réglé',
          `${linesHtml(o)}
          <table style="border-collapse:collapse">${row('Produits utilisés', `${fmtXof(o.finalGoods || 0)} XOF`)}${fee}${row('Total réglé', `${fmtXof(o.finalTotal || 0)} XOF`)}${row('Moyen', o.paymentMethod === 'card' ? esc(o.payment?.cardLabel || 'carte') : 'réglé au fournisseur')}</table>
          ${button(`${SITE}/partner/marketplace`, 'Voir mes commandes')}
          ${en('Your supplier verified the returned count; this is your receipt for what you used.')}`),
      }
    case 'business_payment_due':
      return {
        subject: `Paiement dû — ${fmtXof(o.finalTotal || 0)} XOF · ${subj(o.supplierName)}`,
        html: shell(`Palmera · ${o.supplierName}`, 'Décompte validé — paiement à régler',
          `${p(`Le fournisseur a validé le décompte. ${o.payment?.failureReason ? `Le prélèvement n’a pas abouti (${esc(o.payment.failureReason)}).` : 'Aucune carte n’est enregistrée.'}`)}
          <table style="border-collapse:collapse">${row('Montant dû', `${fmtXof(o.finalTotal || 0)} XOF`)}</table>
          ${p('Réglez en ligne depuis vos commandes, ou directement au fournisseur qui enregistrera le paiement. Les nouvelles commandes sont bloquées tant que ce montant est dû.')}
          ${button(`${SITE}/partner/marketplace`, 'Payer maintenant')}
          ${en('Your supplier settled the order; the charge did not go through. Pay online or settle with the supplier directly.')}`),
      }
    case 'business_declined':
      return {
        subject: `Commande refusée — ${subj(o.supplierName)}`,
        html: shell(`Palmera · ${o.supplierName}`, 'Le fournisseur a refusé la commande',
          `${o.declineReason ? p(`Motif : ${esc(o.declineReason)}`) : ''}${linesHtml(o)}
          ${button(`${SITE}/partner/marketplace`, 'Voir mes commandes')}
          ${en('The supplier declined this order.')}`),
      }
  }
}
