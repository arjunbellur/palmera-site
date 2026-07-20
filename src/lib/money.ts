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
