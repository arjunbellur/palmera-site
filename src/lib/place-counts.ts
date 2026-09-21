// Server-only: live count of published listings per market, for the homepage
// "Follow the coast" section. Cached for an hour so the marketing page never
// waits on Firestore; falls back to the last known numbers if the read fails,
// so the section always renders.
import { unstable_cache } from 'next/cache'
import { adminDb } from './firebase-admin'

export type PlaceCounts = Record<string, number>

const FALLBACK: PlaceCounts = { dakar: 28, saly: 5, ngor: 1, goree: 1, 'lac-rose': 1 }

export const getPlaceCounts = unstable_cache(async (): Promise<PlaceCounts> => {
  try {
    const snap = await adminDb().collection('experiences').where('status', '==', 'published').select('city').get()
    const counts: PlaceCounts = {}
    snap.docs.forEach((d) => { const c = String(d.get('city') || '').toLowerCase(); if (c) counts[c] = (counts[c] || 0) + 1 })
    return Object.keys(counts).length ? counts : FALLBACK
  } catch {
    return FALLBACK
  }
}, ['place-counts'], { revalidate: 3600 })
