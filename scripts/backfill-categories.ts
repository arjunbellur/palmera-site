/**
 * One-time: write the app taxonomy pair (`mainCategory` + `subcategory`) on
 * every listing that doesn't have one yet, plus `nameLower` on every company.
 * See docs/app-parity-plan-2026-10.md §A6 and SYNC-STATUS 2026-10-25.
 *
 * Invisible to members by construction: the value written is exactly what
 * the app's classifier already computes at read time for that listing
 * (src/lib/categories.ts is a port of it). Additive — `category` is never
 * touched. Idempotent; safe to re-run. Listings that already carry a valid
 * pair are left alone, so partner choices made in the editor are preserved.
 *
 *   Staging:    FIREBASE_PROJECT=palmera-staging FIREBASE_ACCESS_TOKEN=$(gcloud auth print-access-token) npx tsx scripts/backfill-categories.ts --dry
 *   Production: GOOGLE_APPLICATION_CREDENTIALS=… npx tsx scripts/backfill-categories.ts --dry
 *   Drop --dry to write. Add --companies-only or --experiences-only to limit.
 */
import { Firestore } from '@google-cloud/firestore'
import { OAuth2Client } from 'google-auth-library'
import { classifyListing, isMainCategoryId, isSubcategoryId, mainOfSub } from '../src/lib/categories'

const PROJECT = process.env.FIREBASE_PROJECT || 'palmera-platform'
const DRY = process.argv.includes('--dry')
const ONLY_COMPANIES = process.argv.includes('--companies-only')
const ONLY_EXPERIENCES = process.argv.includes('--experiences-only')

function client(): Firestore {
  const tok = process.env.FIREBASE_ACCESS_TOKEN
  if (tok) {
    // Staging: a plain OAuth2 token from gcloud (no service-account key is
    // ever minted for staging). Same pattern as copy-catalogue-to-staging.
    const authClient = new OAuth2Client(); authClient.setCredentials({ access_token: tok })
    return new Firestore({ projectId: PROJECT, authClient } as ConstructorParameters<typeof Firestore>[0])
  }
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) throw new Error('set FIREBASE_ACCESS_TOKEN (staging) or GOOGLE_APPLICATION_CREDENTIALS (production)')
  return new Firestore({ projectId: PROJECT, keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS })
}

const db = client()

async function experiences() {
  const snap = await db.collection('experiences').get()
  let set = 0, kept = 0
  let batch = db.batch(); let inBatch = 0
  const flush = async () => { if (!DRY && inBatch) await batch.commit(); batch = db.batch(); inBatch = 0 }
  for (const d of snap.docs) {
    const x = d.data()
    const main = x.mainCategory, sub = x.subcategory
    const validPair = isMainCategoryId(main) && (sub == null || (isSubcategoryId(sub) && mainOfSub(sub) === main))
    if (validPair) { kept++; continue }
    const c = classifyListing({
      category: x.category, mainCategory: main, subcategory: sub,
      title: x.title, subtitle: x.subtitle ?? x.tagline, tag: x.tag, tags: Array.isArray(x.tags) ? x.tags : null,
    })
    set++
    console.log(`${DRY ? 'would set' : 'set'} ${d.id} ${String(x.title ?? '').slice(0, 30).padEnd(30)} ${String(x.category ?? '-').padEnd(13)} → ${c.main}/${c.sub ?? '∅'}`)
    if (!DRY) { batch.set(d.ref, { mainCategory: c.main, subcategory: c.sub }, { merge: true }); if (++inBatch >= 400) await flush() }
  }
  await flush()
  console.log(`experiences: ${DRY ? 'would set' : 'set'} ${set}, already had a valid pair ${kept}`)
}

async function companies() {
  const snap = await db.collection('companies').get()
  let set = 0, kept = 0
  let batch = db.batch(); let inBatch = 0
  const flush = async () => { if (!DRY && inBatch) await batch.commit(); batch = db.batch(); inBatch = 0 }
  for (const d of snap.docs) {
    const x = d.data()
    const want = typeof x.name === 'string' ? x.name.trim().toLowerCase() : null
    if (!want || x.nameLower === want) { kept++; continue }
    set++
    console.log(`${DRY ? 'would set' : 'set'} companies/${d.id} nameLower="${want}"`)
    if (!DRY) { batch.set(d.ref, { nameLower: want }, { merge: true }); if (++inBatch >= 400) await flush() }
  }
  await flush()
  console.log(`companies: ${DRY ? 'would set' : 'set'} ${set}, already correct ${kept}`)
}

async function main() {
  console.log(`project ${PROJECT} · ${DRY ? 'DRY RUN' : 'WRITING'}`)
  if (!ONLY_COMPANIES) await experiences()
  if (!ONLY_EXPERIENCES) await companies()
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
