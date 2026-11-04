// Split-payment cases the app's functions flag for Palmera (Part 5,
// 2026-11-03) — pure readers over the booking doc; the writes live in
// firestore.ts (settlePayoutAdjustment, markCopayRefundedManually).
import type { Booking } from './schema'
import { receiptAmountXof } from './refunds'

export interface ShortSplit {
  b: Booking
  held: number | null       // XOF actually collected (null when the ledger could not say)
  total: number             // bookingTotal the partner priced for
  uncovered: number | null  // total − held
  reason: 'copayer_refunded' | 'split_reduced' | string
  leaver: string            // uid of the payer who left
  at: Date | null
  /** What the partner should be paid on the money held, at the booking's rate. */
  suggestedPayout: number
  suggestedCommission: number
}

/** Bookings whose split came up short and nobody has settled yet. */
export function shortSplits(bookings: Booking[]): ShortSplit[] {
  return bookings.filter((b) => b.payoutAdjustmentNeeded === true).map(shortSplitOf)
}

export function shortSplitOf(b: Booking): ShortSplit {
  const a = b.payoutAdjustment
  const total = Number(a?.bookingTotal ?? b.bookingTotal) || 0
  const held = a && a.heldXof !== null && a.heldXof !== undefined ? Number(a.heldXof) : null
  const uncovered = a && a.uncoveredXof !== null && a.uncoveredXof !== undefined ? Number(a.uncoveredXof) : (held !== null ? Math.max(0, total - held) : null)
  const rate = Number(b.commissionRate) || 0
  const base = held ?? 0
  const suggestedCommission = Math.round(base * rate)
  return {
    b, held, total, uncovered, reason: String(a?.reason || ''), leaver: String(a?.uid || ''),
    at: a?.at ? new Date(Number(a.at)) : null,
    suggestedPayout: Math.max(0, base - suggestedCommission), suggestedCommission,
  }
}

export interface CopayManual { b: Booking; uid: string; amount: number }

/** Co-payer refunds the processor rejected, still to send by hand. */
export function copayManualRefunds(bookings: Booking[]): CopayManual[] {
  const out: CopayManual[] = []
  for (const b of bookings) {
    for (const [uid, state] of Object.entries(b.copayRefunds ?? {})) {
      if (state !== 'manual_review') continue
      const share = Math.round((Number(b.bookingTotal) || 0) / Math.max(1, Number(b.payersCount) || 1))
      out.push({ b, uid, amount: receiptAmountXof(b.copayPayments?.[uid], share) })
    }
  }
  return out
}

export const splitReasonLabel = (reason: string, lang: 'en' | 'fr' = 'en') =>
  reason === 'copayer_refunded' ? (lang === 'fr' ? 'un invité a été remboursé' : 'a guest was refunded')
  : reason === 'split_reduced' ? (lang === 'fr' ? 'un invité a quitté le partage sans payer' : 'a guest left the split without paying')
  : (lang === 'fr' ? 'le partage a été réduit' : 'the split was reduced')
