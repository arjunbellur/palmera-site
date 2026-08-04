// Client-side analytics helpers for the /admin hub. Everything is defensive:
// the app side writes snake_case (user_id, created_at) while the dashboard
// writes camelCase (customerId, createdAt), and a handful of legacy booking
// docs are malformed — so every date/join/count goes through these
// normalizers instead of touching fields directly.
// Accepts ANY doc shape (typed interfaces lack index signatures, so the
// public parameter type is `object`; fields are read via this cast).
export type AnyDoc = object
const rec = (d: AnyDoc) => d as Record<string, unknown>

/** Timestamp | ISO string | millis → Date, trying created_at then createdAt
 *  (or an explicit key first). Returns null rather than an Invalid Date. */
export function docDate(d: AnyDoc, key?: string): Date | null {
  const doc = rec(d)
  const raw = (key && doc[key] != null ? doc[key] : undefined) ?? doc.created_at ?? doc.createdAt
  if (raw == null) return null
  const sec = (raw as { seconds?: number })?.seconds
  if (typeof sec === 'number') return new Date(sec * 1000)
  if (typeof raw === 'string' || typeof raw === 'number') {
    const d = new Date(raw)
    return isNaN(d.getTime()) ? null : d
  }
  if (raw instanceof Date) return isNaN(raw.getTime()) ? null : raw
  return null
}

export const startOfToday = (): Date => {
  const d = new Date(); d.setHours(0, 0, 0, 0); return d
}

/** Monday 00:00 of the current week. */
export const startOfWeek = (): Date => {
  const d = startOfToday()
  const day = d.getDay() // 0=Sun
  d.setDate(d.getDate() - ((day + 6) % 7))
  return d
}

export const startOfMonth = (): Date => {
  const d = startOfToday(); d.setDate(1); return d
}

export function countSince(docs: AnyDoc[], since: Date, dateKey?: string): number {
  return docs.filter((d) => {
    const dt = docDate(d, dateKey)
    return dt !== null && dt >= since
  }).length
}

export function sumField(docs: AnyDoc[], field: string): number {
  return docs.reduce((s, d) => s + (typeof rec(d)[field] === 'number' ? (rec(d)[field] as number) : 0), 0)
}

/** Count docs per value of a field ("city", "kind"…), skipping empties. */
export function groupCount(docs: AnyDoc[], key: string): { label: string; value: number }[] {
  const map = new Map<string, number>()
  docs.forEach((d) => {
    const v = rec(d)[key]
    if (typeof v !== 'string' || !v.trim()) return
    map.set(v, (map.get(v) || 0) + 1)
  })
  return [...map.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value)
}

export interface Bucket { label: string; start: Date; count: number; sum: number }

/** Last N weekly (Mon-start) or monthly buckets ending in the current period.
 *  Docs with unparseable dates are excluded, never NaN. */
export function bucketByPeriod(docs: AnyDoc[], opts: {
  period: 'week' | 'month'; buckets: number; dateKey?: string
  valueOf?: (d: AnyDoc) => number
}): Bucket[] {
  const { period, buckets, dateKey, valueOf } = opts
  const starts: Date[] = []
  if (period === 'week') {
    const w0 = startOfWeek()
    for (let i = buckets - 1; i >= 0; i--) {
      const s = new Date(w0); s.setDate(s.getDate() - 7 * i); starts.push(s)
    }
  } else {
    const now = startOfMonth()
    for (let i = buckets - 1; i >= 0; i--) {
      starts.push(new Date(now.getFullYear(), now.getMonth() - i, 1))
    }
  }
  const out: Bucket[] = starts.map((start) => ({
    label: period === 'week'
      ? start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
      : start.toLocaleDateString('en-GB', { month: 'short' }),
    start, count: 0, sum: 0,
  }))
  docs.forEach((d) => {
    const dt = docDate(d, dateKey)
    if (!dt) return
    for (let i = out.length - 1; i >= 0; i--) {
      if (dt >= out[i].start) {
        out[i].count += 1
        if (valueOf) {
          const v = valueOf(d)
          if (typeof v === 'number' && !isNaN(v)) out[i].sum += v
        }
        break
      }
    }
  })
  return out
}

/** A handful of legacy booking docs hold only a {payment} map (pre-fix rule
 *  gap) — every consumer filters through this. */
export function isRealBooking(b: AnyDoc): boolean {
  return typeof rec(b).providerId === 'string' && typeof rec(b).bookingTotal === 'number'
}

/** Attach a display handle/name from profiles to app-side docs (user_id →
 *  profile doc id). Tolerant of missing profiles. */
export function joinProfiles<T extends AnyDoc>(
  docs: T[],
  profiles: { id?: string; handle?: string; name?: string }[],
  key = 'user_id',
): (T & { _who: string })[] {
  const byId = new Map(profiles.map((p) => [p.id, p]))
  return docs.map((d) => {
    const p = byId.get(rec(d)[key] as string)
    return { ...d, _who: p?.handle || p?.name || '—' }
  })
}
