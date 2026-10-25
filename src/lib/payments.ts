// Human labels for the processor receipts the app's functions write on
// bookings (`payment`, `copayPayments[uid]`). See PaymentReceipt in schema.ts
// and docs/booking-contract-for-app.md "Payment state". `paymentStatus` is
// never written by anyone — derive everything from the receipt.
import type { Booking, PaymentReceipt } from './schema'

type Lang = 'en' | 'fr'

const S = {
  en: {
    card: 'Card', apple: 'Apple Pay', google: 'Google Pay', wave: 'Mobile money · Wave', orange: 'Mobile money · Orange Money',
    free: 'Mobile money · Free', paydunya: 'PayDunya', unknown: 'Payment',
    pending: 'awaiting payment', completed: 'paid', failed: 'failed', cancelled: 'cancelled', refunded: 'refunded',
    refundProcessing: 'refund in progress', refundManual: 'refund needs manual action', none: '—', reservation: 'Free reservation',
    split: (paid: number, total: number) => `${paid}/${total} shares paid`,
  },
  fr: {
    card: 'Carte', apple: 'Apple Pay', google: 'Google Pay', wave: 'Mobile money · Wave', orange: 'Mobile money · Orange Money',
    free: 'Mobile money · Free', paydunya: 'PayDunya', unknown: 'Paiement',
    pending: 'en attente de paiement', completed: 'payé', failed: 'échoué', cancelled: 'annulé', refunded: 'remboursé',
    refundProcessing: 'remboursement en cours', refundManual: 'remboursement à traiter manuellement', none: '—', reservation: 'Réservation gratuite',
    split: (paid: number, total: number) => `${paid}/${total} parts payées`,
  },
} as const

/** "Mobile money · Wave", "Apple Pay", "Card"… from a receipt. */
export function paymentMethodLabel(r: PaymentReceipt | null | undefined, lang: Lang = 'en'): string {
  const s = S[lang]
  if (!r) return s.unknown
  if (r.provider === 'pawapay') return r.mmProvider === 'WAVE_SEN' ? s.wave : r.mmProvider === 'ORANGE_SEN' ? s.orange : s.free
  if (r.provider === 'stripe') return r.method === 'apple_pay' ? s.apple : r.method === 'google_pay' ? s.google : s.card
  if (r.provider === 'paydunya') return s.paydunya
  return s.unknown
}

/** "paid", "refund in progress"… — the refund state outranks the status. */
export function paymentStateLabel(r: PaymentReceipt | null | undefined, lang: Lang = 'en'): string {
  const s = S[lang]
  if (!r) return s.none
  if (r.refundState === 'processing') return s.refundProcessing
  if (r.refundState === 'manual_review') return s.refundManual
  if (r.refundState === 'refunded' || r.status === 'refunded') return s.refunded
  return s[r.status] ?? r.status
}

/** One line for the reservation detail: method · state, plus split progress
 *  when the booking has several payers. Free reservations say so. */
export function bookingPaymentLabel(b: Pick<Booking, 'mode' | 'payment' | 'paidCount' | 'payersCount'>, lang: Lang = 'en'): string {
  const s = S[lang]
  if (b.mode === 'reservation' && !b.payment) return s.reservation
  if (!b.payment) return s.none
  const base = `${paymentMethodLabel(b.payment, lang)} · ${paymentStateLabel(b.payment, lang)}`
  const payers = b.payersCount ?? 1
  return payers > 1 ? `${base} · ${s.split(b.paidCount ?? 0, payers)}` : base
}

/** True when someone at Palmera must act: a pawaPay refund that failed. */
export const needsManualRefund = (b: Pick<Booking, 'payment' | 'copayPayments'>): boolean =>
  b.payment?.refundState === 'manual_review'
  || Object.values(b.copayPayments ?? {}).some((r) => r.refundState === 'manual_review')
