// What happened to the money on a cancelled or declined booking — derived
// from the processor receipts the app's functions write (see PaymentReceipt
// in schema.ts and functions `refundBooking`): on a cancellation inside the
// free window the app refunds Stripe synchronously (`refundState: 'refunded'`)
// or starts a pawaPay refund (`'processing'` → callback → `'refunded'` or
// `'manual_review'`); outside the window it writes `'none'` and the business
// keeps the money. Nothing here writes; the admin "mark refunded by hand"
// action lives in firestore.ts.
import type { Booking, PaymentReceipt } from './schema'
import { paymentMethodLabel } from './payments'
import { toDate } from './money'

export type RefundKind =
  | 'free'        // nothing was paid (reservation-only)
  | 'refunded'    // money went back
  | 'processing'  // pawaPay refund started, not yet settled
  | 'manual'      // refund failed / not attempted by the processor — Palmera must refund by hand
  | 'kept'        // cancelled inside the window: paid, no refund — the business keeps it
  | 'unpaid'      // cancelled before any payment landed

export interface RefundSummary {
  kind: RefundKind
  amount: number                // XOF the receipt is worth (host share)
  method: string                // "Mobile money · Wave", "Card"…
  when: Date | null             // refundedAt / refundSettledAt
  /** Co-payers' shares, each with its own state (the app refunds them one by one). */
  copays: { uid: string; kind: RefundKind; amount: number; method: string }[]
  /** Everything refunded or due back, host + co-payers. */
  total: number
}

/** XOF value of a receipt. Stripe stores minor units; XOF has none. */
export function receiptAmountXof(r: PaymentReceipt | null | undefined): number {
  if (!r) return 0
  if (r.provider === 'pawapay' || r.provider === 'paydunya') return Number(r.amountXof) || 0
  const minor = Number(r.amountMinor) || 0
  return String(r.currency || 'XOF').toUpperCase() === 'XOF' ? minor : Math.round(minor / 100)
}

function kindOf(r: PaymentReceipt | null | undefined): RefundKind {
  if (!r) return 'free'
  if (r.refundState === 'refunded' || r.status === 'refunded') return 'refunded'
  if (r.refundState === 'processing') return 'processing'
  if (r.refundState === 'manual_review') return 'manual'
  if (r.status === 'completed') return 'kept'
  return 'unpaid'
}

export function refundSummary(b: Pick<Booking, 'mode' | 'payment' | 'copayPayments' | 'customerId'>, lang: 'en' | 'fr' = 'en'): RefundSummary {
  const host = b.payment ?? null
  const kind = !host && b.mode === 'reservation' ? 'free' : kindOf(host)
  const copays = Object.entries(b.copayPayments ?? {})
    .filter(([uid]) => uid !== b.customerId)
    .map(([uid, r]) => ({ uid, kind: kindOf(r), amount: receiptAmountXof(r), method: paymentMethodLabel(r, lang) }))
  const amount = receiptAmountXof(host)
  const counts = (k: RefundKind) => (kind === k ? amount : 0) + copays.filter((c) => c.kind === k).reduce((s, c) => s + c.amount, 0)
  return {
    kind, amount, method: paymentMethodLabel(host, lang),
    when: toDate(host?.refundSettledAt) ?? toDate(host?.refundedAt),
    copays,
    total: counts('refunded') + counts('processing') + counts('manual'),
  }
}

const LABEL = {
  en: { free: 'Free reservation — nothing to refund', refunded: 'Refunded', processing: 'Refund in progress', manual: 'Refund needs Palmera', kept: 'No refund — cancelled after the cut-off', unpaid: 'Never paid' },
  fr: { free: 'Réservation gratuite — rien à rembourser', refunded: 'Remboursé', processing: 'Remboursement en cours', manual: 'Remboursement à traiter par Palmera', kept: 'Non remboursé — annulée après la date limite', unpaid: 'Jamais payée' },
} as const
export const refundKindLabel = (k: RefundKind, lang: 'en' | 'fr' = 'en') => LABEL[lang][k]
export const refundTone = (k: RefundKind): 'green' | 'gold' | 'alert' | 'neutral' =>
  k === 'refunded' ? 'green' : k === 'processing' ? 'gold' : k === 'manual' ? 'alert' : 'neutral'

/** Cancelled or declined bookings where money was ever involved. */
export const isCancelledPaid = (b: Pick<Booking, 'status' | 'payment' | 'copayPayments'>) =>
  (b.status === 'cancelled' || b.status === 'declined') && (!!b.payment || Object.keys(b.copayPayments ?? {}).length > 0)
