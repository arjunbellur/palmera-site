// Every transactional email the dashboard sends, as pure render functions:
// `{ subject, html }` from a booking (or payout / invite) document. No I/O,
// no secrets — the notify routes pick a template, send through Resend and
// write `email_log`. FR first with a short EN line at the bottom, the same
// shape as the partner mails that have been live since August.
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
const FR_DATE: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }
export const whenFr = (b: BookingDoc) => {
  const d = toDate(b.scheduledFor)
  return d ? d.toLocaleDateString('fr-FR', FR_DATE) : '—'
}
const dayFr = (v: unknown) => {
  const d = toDate(v)
  return d ? d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'
}

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
}

const detailsTable = (ctx: BookingCtx, opts: { withCompany?: boolean; withRef?: boolean; withPayment?: boolean } = {}) => {
  const { b } = ctx
  const payment = opts.withPayment && (b.payment || b.mode === 'reservation')
    ? row('Paiement', esc(bookingPaymentLabel(b as Pick<Booking, 'mode' | 'payment' | 'paidCount' | 'payersCount'>, 'fr')))
    : ''
  return `<table style="border-collapse:collapse">
    ${row('Expérience', esc(b.title || '—'))}
    ${opts.withCompany ? row('Chez', esc(ctx.companyName)) : row('Client', esc(b.customerName || '—'))}
    ${row('Date', esc(whenFr(b)))}
    ${row('Personnes', esc(b.guestCount || 1))}
    ${typeof b.bookingTotal === 'number' && b.bookingTotal > 0 ? row('Montant', `${fmtXof(b.bookingTotal)} XOF`) : ''}
    ${payment}
    ${opts.withRef ? row('Référence', esc(ctx.id)) : ''}
  </table>`
}

// ── Partner ─────────────────────────────────────────────────────────────────
// Wording unchanged from the August route — partners know these mails.

export const partnerNewPending = (ctx: BookingCtx): Rendered => ({
  subject: `⏳ Nouvelle réservation à confirmer — ${subj(ctx.b.title)}`,
  html: shell(`Palmera · ${ctx.companyName}`, 'Nouvelle réservation — action requise',
    `${detailsTable(ctx)}
    ${p('Cette réservation attend votre confirmation — <strong>merci de répondre sous 24 h</strong>. Sans réponse, le client risque de réserver ailleurs.')}
    ${button(`${SITE}/partner/reservations?f=pending`, 'Répondre dans le tableau de bord')}
    ${en('New booking awaiting your confirmation — please respond within 24h from your Palmera dashboard.')}`),
})

export const partnerNewConfirmed = (ctx: BookingCtx): Rendered => ({
  subject: `✓ Nouvelle réservation confirmée — ${subj(ctx.b.title)}`,
  html: shell(`Palmera · ${ctx.companyName}`, 'Nouvelle réservation — confirmée automatiquement',
    `${detailsTable(ctx)}
    ${p('Réservation instantanée — aucune action requise, elle est déjà sur votre calendrier.')}
    ${button(`${SITE}/partner/reservations`, 'Voir dans le tableau de bord')}
    ${en('Instant booking, auto-confirmed — no action needed; it is already on your calendar.')}`),
})

export const partnerPendingReminder = (ctx: BookingCtx, hours: number): Rendered => ({
  subject: `⏰ Toujours en attente — ${subj(ctx.b.title)}`,
  html: shell('Palmera · rappel', `Une réservation attend votre réponse depuis ${hours} h`,
    `${p(`<strong>${esc(ctx.b.title)}</strong> — ${esc(ctx.b.customerName || 'un client')} · ${esc(whenFr(ctx.b))} · ${esc(ctx.b.guestCount || 1)} pers.`)}
    ${p('Les clients attendent une réponse sous 24 h. Sans réponse, ils risquent de réserver ailleurs.')}
    ${button(`${SITE}/partner/reservations?f=pending`, 'Répondre maintenant')}
    ${en(`Reminder: a booking has been awaiting your response for ${hours}h — guests expect an answer within 24h.`)}`),
})

export const partnerCancelledByMember = (ctx: BookingCtx): Rendered => ({
  subject: `✕ Réservation annulée par le client — ${subj(ctx.b.title)}`,
  html: shell(`Palmera · ${ctx.companyName}`, 'Réservation annulée par le client',
    `${detailsTable(ctx, { withPayment: true })}
    ${p('Le client a annulé cette réservation. Le créneau est de nouveau disponible — aucune action requise de votre part.')}
    ${button(`${SITE}/partner/reservations`, 'Voir le calendrier')}
    ${en('The guest cancelled this booking. The slot is free again — nothing to do on your side.')}`),
})

export const partnerRefundIssued = (ctx: BookingCtx): Rendered => ({
  subject: `↩ Remboursement effectué — ${subj(ctx.b.title)}`,
  html: shell(`Palmera · ${ctx.companyName}`, 'Remboursement effectué au client',
    `${detailsTable(ctx, { withPayment: true })}
    ${p('Le paiement de cette réservation a été remboursé au client par Palmera. Le montant n’apparaîtra pas dans votre prochain versement.')}
    ${button(`${SITE}/partner/reservations`, 'Voir dans le tableau de bord')}
    ${en('Palmera refunded the guest for this booking; the amount will not be part of your next payout.')}`),
})

// ── Member ──────────────────────────────────────────────────────────────────
// Sent only when the recipient is trustworthy: the routes gate on
// `payment.status === 'completed'` or `mode === 'reservation'`, never on the
// client-writable address alone.

export const memberConfirmed = (ctx: BookingCtx): Rendered => ({
  subject: `✓ Réservation confirmée — ${subj(ctx.b.title)}`,
  html: shell('Palmera', 'Votre réservation est confirmée',
    `${detailsTable(ctx, { withCompany: true, withRef: true, withPayment: true })}
    ${p('Tout est prêt. Retrouvez les détails et votre billet dans l’app Palmera.')}
    ${en('Your booking is confirmed — details and your ticket are in the Palmera app.')}`),
})

export const memberDeclined = (ctx: BookingCtx): Rendered => ({
  subject: `Réservation non disponible — ${subj(ctx.b.title)}`,
  html: shell('Palmera', 'Votre réservation n’a pas pu être acceptée',
    `${detailsTable(ctx, { withCompany: true, withRef: true })}
    ${p(`${esc(ctx.companyName)} n’a pas pu accepter cette réservation pour ce créneau.${ctx.b.payment?.status === 'completed' ? ' Votre paiement vous est intégralement remboursé.' : ''} Vous pouvez choisir une autre date ou une autre expérience dans l’app.`)}
    ${en('The partner could not accept this booking for that slot. Any payment is refunded in full — pick another date or experience in the app.')}`),
})

export const memberCancelled = (ctx: BookingCtx): Rendered => {
  const paid = !!ctx.b.payment && ctx.b.payment.status !== 'pending' && ctx.b.payment.status !== 'failed'
  const settled = ctx.b.payment?.refundState === 'refunded' || ctx.b.payment?.status === 'refunded'
  const refundLine = paid
    ? settled
      ? p('Votre paiement a été remboursé. Selon votre banque ou votre opérateur, il peut apparaître sous 5 à 10 jours ouvrés.')
      : p('Le remboursement de votre paiement est en cours. Selon votre banque ou votre opérateur, il peut apparaître sous 5 à 10 jours ouvrés.')
    : ''
  return {
    subject: `Réservation annulée — ${subj(ctx.b.title)}`,
    html: shell('Palmera', 'Votre réservation est annulée',
      `${detailsTable(ctx, { withCompany: true, withRef: true, withPayment: paid })}
      ${refundLine}
      ${p('Nous espérons vous retrouver bientôt sur Palmera.')}
      ${en(paid ? 'Your booking is cancelled and your payment is being refunded (5–10 business days depending on your bank or operator).' : 'Your booking is cancelled.')}`),
  }
}

export const memberReminder24h = (ctx: BookingCtx): Rendered => ({
  subject: `Demain — ${subj(ctx.b.title)}`,
  html: shell('Palmera · rappel', 'C’est demain',
    `${detailsTable(ctx, { withCompany: true, withRef: true })}
    ${p('Votre billet est dans l’app Palmera — présentez le QR code à l’arrivée.')}
    ${en('Your experience is tomorrow — your ticket (QR code) is in the Palmera app.')}`),
})

/** Replaces the app's "Confirmation sent" claim: the money is in, the
 *  partner still has to say yes. */
export const memberPaymentReceived = (ctx: BookingCtx): Rendered => ({
  subject: `Paiement reçu — ${subj(ctx.b.title)}`,
  html: shell('Palmera', 'Paiement reçu — en attente de confirmation',
    `${detailsTable(ctx, { withCompany: true, withRef: true, withPayment: true })}
    ${p(`Votre paiement est bien reçu. ${esc(ctx.companyName)} confirme généralement sous 24 h — vous recevrez un e-mail dès que c’est fait. En cas de refus, vous êtes intégralement remboursé.`)}
    ${en('Payment received. The partner usually confirms within 24h — you will get an email as soon as they do; if they decline you are refunded in full.')}`),
})

export type BookingEmailKind =
  | 'partner_new_pending' | 'partner_new_confirmed' | 'partner_pending_reminder'
  | 'partner_cancelled_by_member' | 'partner_refund_issued'
  | 'member_confirmed' | 'member_declined' | 'member_cancelled' | 'member_reminder_24h' | 'member_payment_received'

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
