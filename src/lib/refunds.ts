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
  /** What the processor actually moved when it wasn't XOF — "1.65 USD" (Apple
   *  Pay charges in USD at the app's fixed rate). Null when charged in XOF. */
  charged: string | null
  method: string                // "Mobile money · Wave", "Card"…
  when: unknown                 // refundSettledAt ?? refundedAt (Timestamp) — pass to formatDate
  /** Co-payers' shares, each with its own state (the app refunds them one by one). */
  copays: { uid: string; kind: RefundKind; amount: number; method: string }[]
  /** Everything refunded or due back, host + co-payers. */
  total: number
}

/** XOF value of a receipt. Every rail writes `amountXof` (the app adds it on
 *  Stripe receipts too, next to the USD `amountMinor` it actually charged —
 *  1 000 XOF rides as 165 cents). Fall back to the booking's XOF share when a
 *  receipt lacks it; never read foreign minor units as francs. */
export function receiptAmountXof(r: PaymentReceipt | null | undefined, fallbackXof = 0): number {
  if (!r) return 0
  const xof = Number((r as { amountXof?: unknown }).amountXof)
  if (xof > 0) return xof
  if (r.provider === 'stripe') {
    const minor = Number(r.amountMinor) || 0
    return String(r.currency || 'XOF').toUpperCase() === 'XOF' ? minor : fallbackXof
  }
  return fallbackXof
}

/** "1.65 USD" when the processor moved something other than XOF. */
export function receiptCharged(r: PaymentReceipt | null | undefined): string | null {
  if (!r || r.provider !== 'stripe') return null
  const cur = String(r.currency || 'XOF').toUpperCase()
  if (cur === 'XOF') return null
  return `${(Number(r.amountMinor) / 100).toFixed(2)} ${cur}`
}

function kindOf(r: PaymentReceipt | null | undefined): RefundKind {
  if (!r) return 'free'
  if (r.refundState === 'refunded' || r.status === 'refunded') return 'refunded'
  if (r.refundState === 'processing') return 'processing'
  if (r.refundState === 'manual_review') return 'manual'
  if (r.status === 'completed') return 'kept'
  return 'unpaid'
}

export function refundSummary(b: Pick<Booking, 'mode' | 'payment' | 'copayPayments' | 'customerId' | 'bookingTotal' | 'payersCount'>, lang: 'en' | 'fr' = 'en'): RefundSummary {
  const host = b.payment ?? null
  const kind = !host && b.mode === 'reservation' ? 'free' : kindOf(host)
  // A share of the booking in XOF, for receipts that only carry a foreign amount.
  const share = Math.round((Number(b.bookingTotal) || 0) / Math.max(1, Number(b.payersCount) || 1))
  const copays = Object.entries(b.copayPayments ?? {})
    .filter(([uid]) => uid !== b.customerId)
    .map(([uid, r]) => ({ uid, kind: kindOf(r), amount: receiptAmountXof(r, share), method: paymentMethodLabel(r, lang) }))
  const amount = receiptAmountXof(host, share)
  const counts = (k: RefundKind) => (kind === k ? amount : 0) + copays.filter((c) => c.kind === k).reduce((s, c) => s + c.amount, 0)
  return {
    kind, amount, charged: receiptCharged(host), method: paymentMethodLabel(host, lang),
    when: host?.refundSettledAt ?? host?.refundedAt ?? null,
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
