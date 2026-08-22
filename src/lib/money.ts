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
