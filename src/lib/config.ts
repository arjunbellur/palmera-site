// Reads the admin-owned config/* reference data (cities, categories, cancellation
// policies). The dashboard renders dropdowns from these — never hard-coded lists.
// Cached in-memory for the session; config changes rarely.
import { doc, getDoc } from 'firebase/firestore'
import { db } from './firebase'
import { COLLECTIONS, CONFIG_DOCS, type MarketsConfig, type CategoriesConfig, type PoliciesConfig } from './schema'

const cache = new Map<string, unknown>()

async function readConfig<T>(docId: string): Promise<T | null> {
  if (cache.has(docId)) return cache.get(docId) as T
  try {
    const snap = await getDoc(doc(db, COLLECTIONS.config, docId))
    const data = snap.exists() ? (snap.data() as T) : null
    if (data) cache.set(docId, data)
    return data
  } catch {
    return null
  }
}

export const getMarkets = () => readConfig<MarketsConfig>(CONFIG_DOCS.markets)
export const getCategories = () => readConfig<CategoriesConfig>(CONFIG_DOCS.categories)
export const getPolicies = () => readConfig<PoliciesConfig>(CONFIG_DOCS.policies)

/** Enabled cities only, for provider-facing city pickers. */
export async function getEnabledCities() {
  const m = await getMarkets()
  return (m?.cities ?? []).filter(c => c.enabled)
}

/** Enabled categories only, for provider-facing category pickers. */
export async function getEnabledCategories() {
  const c = await getCategories()
  return (c?.categories ?? []).filter(x => x.enabled)
}

/** Clear the cache (e.g. after an admin toggles a city/category). */
export const clearConfigCache = () => cache.clear()
