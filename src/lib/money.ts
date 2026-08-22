// XOF (West African CFA franc) has no minor unit — amounts are whole-franc ints.
export function formatXOF(amount: number | null | undefined, currency = 'XOF'): string {
  const n = Math.round(amount || 0)
  try {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n)
  } catch {
    // Fallback if the currency code isn't recognized by the runtime.
    return `${new Intl.NumberFormat('fr-FR').format(n)} ${currency}`
  }
}

/**
 * Grouped whole number with NO currency symbol — the partner dashboard renders
 * the amount and a separate "XOF" suffix, so the two need to be independent.
 * Uses a narrow no-break space (fr-FR grouping) e.g. 45 000.
 */
// One formatter instance — admin/money calls this hundreds of times per render.
const XOF = new Intl.NumberFormat('fr-FR')
export function formatAmount(amount: number | null | undefined): string {
  return XOF.format(Math.round(amount || 0))
}

/** A Firestore Timestamp, a JS Date, or an ISO string → a JS Date, or null. */
export function toDate(value: unknown): Date | null {
  if (!value) return null
  const v = value as { toDate?: () => Date }
  const d = typeof v?.toDate === 'function' ? v.toDate() : new Date(value as string | number | Date)
  return isNaN(d.getTime()) ? null : d
}

/** A Firestore Timestamp, a JS Date, or an ISO string → a short readable date. */
export function formatDate(value: unknown, withTime = false): string {
  if (!value) return '—'
  let d: Date
  if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as { toDate: unknown }).toDate === 'function') {
    d = (value as { toDate: () => Date }).toDate()
  } else {
    d = new Date(value as string | number | Date)
  }
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  })
}

// ── Money-state helpers (shared by partner Home/Earnings and admin Money) ──
// How money actually flows: the app charges the GUEST the full amount into
// Palmera's Stripe; Palmera keeps its commission; the business is paid the
// net (payoutAmount) biweekly, once the experience has taken place.
type MoneyBooking = { status: string; scheduledFor?: unknown; payoutAmount?: number; bookingTotal?: number; commissionAmount?: number }

/** Delivered = the experience has taken place: explicitly completed, OR
 *  confirmed with its date in the past. (Interim until auto-completion
 *  exists — SYNC item 11 — but it's also simply what "delivered" means.) */
export function isDelivered(b: MoneyBooking): boolean {
  if (b.status === 'completed') return true
  if (b.status !== 'confirmed') return false
  const d = toDate(b.scheduledFor)
  return !!d && d.getTime() < Date.now()
}
/** Upcoming = confirmed, date still ahead. Money is collected but not yet earned. */
export function isUpcoming(b: MoneyBooking): boolean {
  if (b.status !== 'confirmed') return false
  const d = toDate(b.scheduledFor)
  return !!d && d.getTime() >= Date.now()
}

/** Payout schedule: the 1st and the 16th of each month (biweekly, per the
 *  BPA). Returns the next run strictly after `from`. */
export function nextPayoutDate(from = new Date()): Date {
  const y = from.getFullYear(), m = from.getMonth(), d = from.getDate()
  if (d < 16) return new Date(y, m, 16)
  return new Date(y, m + 1, 1)
}
/** Per-state totals for a set of bookings, in XOF. */
export function moneySplit(bookings: MoneyBooking[]) {
  const sum = (xs: MoneyBooking[], k: 'bookingTotal' | 'commissionAmount' | 'payoutAmount') => xs.reduce((s, b) => s + (b[k] || 0), 0)
  const upcoming = bookings.filter(isUpcoming)
  const delivered = bookings.filter(isDelivered)
  return {
    upcoming: { gross: sum(upcoming, 'bookingTotal'), commission: sum(upcoming, 'commissionAmount'), net: sum(upcoming, 'payoutAmount'), count: upcoming.length },
    delivered: { gross: sum(delivered, 'bookingTotal'), commission: sum(delivered, 'commissionAmount'), net: sum(delivered, 'payoutAmount'), count: delivered.length },
  }
}
