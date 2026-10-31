'use client'
// Stale-while-revalidate for page data, in 40 lines.
//
// Every shell screen used to mount, show a skeleton, fetch, then paint — on
// EVERY visit, because navigation was a full reload. Now that the shells use
// client-side navigation, a page can paint what it showed last time at once
// and refresh in the background: no skeleton on the second visit, and the
// data is never older than one round-trip.
//
//   const { data, loaded, reload } = useSWRLite('listings:' + companyId, () => fetchAll(companyId), [companyId])
//
// - `data` is the cached value immediately (if any), then the fresh one.
// - `loaded` is true as soon as there is anything to paint.
// - `reload()` bypasses the cache (call it after a save).
// Cache is per browser tab (module memory), keyed by string, no TTL — a
// visit always revalidates. `clearSWR(prefix)` drops entries, e.g. on sign-out.
import { useCallback, useEffect, useRef, useState } from 'react'

const cache = new Map<string, unknown>()

export function clearSWR(prefix = '') {
  for (const k of [...cache.keys()]) if (k.startsWith(prefix)) cache.delete(k)
}

export function useSWRLite<T>(key: string | null, fetcher: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(() => (key && cache.has(key) ? (cache.get(key) as T) : null))
  const [loaded, setLoaded] = useState<boolean>(() => !!key && cache.has(key))
  const [error, setError] = useState<unknown>(null)
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher
  const alive = useRef(true)

  const run = useCallback(async () => {
    if (!key) return
    try {
      const fresh = await fetcherRef.current()
      cache.set(key, fresh)
      if (alive.current) { setData(fresh); setLoaded(true); setError(null) }
    } catch (e) {
      if (alive.current) { setError(e); setLoaded(true) }
    }
  }, [key])

  useEffect(() => {
    alive.current = true
    if (key && cache.has(key)) { setData(cache.get(key) as T); setLoaded(true) }
    else { setData(null); setLoaded(false) }
    run()
    return () => { alive.current = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ...deps])

  // Optimistic updates write through to the cache too, so a revisit never
  // repaints the pre-save value for a round-trip.
  const setCached = useCallback((next: T | null | ((prev: T | null) => T | null)) => {
    setData((prev) => {
      const v = typeof next === 'function' ? (next as (p: T | null) => T | null)(prev) : next
      if (key && v !== null) cache.set(key, v)
      return v
    })
  }, [key])

  return { data, loaded, error, reload: run, setData: setCached }
}
