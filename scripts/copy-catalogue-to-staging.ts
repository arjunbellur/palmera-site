/**
 * Copies the PUBLIC catalogue from production into staging so the staging app
 * has something real to show. Nothing private crosses over.
 *
 *   Copied:   experiences (published only) + their options subcollection,
 *             companies (contact fields scrubbed), config (categories,
 *             markets, policies, featured).
 *   Skipped:  providers, partners, companies_private, bookings, profiles,
 *             chats, moments, notifications, points, invites, payouts,
 *             email_log, countersignatures, config/countersignatory —
 *             anything that is a person, a payment, or an internal record.
 *
 * Source auth: GOOGLE_APPLICATION_CREDENTIALS (production Admin SDK key).
 * Target auth: FIREBASE_ACCESS_TOKEN=$(gcloud auth print-access-token) as a
 * staging Owner — no service-account key is ever minted for staging.
 *
 *   npm run catalogue:copy:staging -- --dry    # report only
 *   npm run catalogue:copy:staging             # write
 */
// @google-cloud/firestore directly (it is what firebase-admin wraps): the
// staging side authenticates with a plain OAuth2 access token, which the
// admin SDK's Firestore client refuses but the underlying client accepts.
import { Firestore } from '@google-cloud/firestore'
import { OAuth2Client } from 'google-auth-library'

const TARGET = process.env.FIREBASE_PROJECT || 'palmera-staging'
const DRY = process.argv.includes('--dry')
if (TARGET === 'palmera-platform') throw new Error('refusing to write into production')

const tok = process.env.FIREBASE_ACCESS_TOKEN
if (!tok) throw new Error('FIREBASE_ACCESS_TOKEN is required (gcloud auth print-access-token)')

const from = new Firestore({ projectId: 'palmera-platform', keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS })
const authClient = new OAuth2Client(); authClient.setCredentials({ access_token: tok })
const to = new Firestore({ projectId: TARGET, authClient } as ConstructorParameters<typeof Firestore>[0])

// Partner contact details never leave production. Everything else on a
// company is what the app already shows publicly.
const SCRUB_COMPANY = ['phone', 'whatsapp', 'email']
const CONFIG_DOCS = ['categories', 'markets', 'policies', 'featured']

let writes = 0
const batchWrite = (() => {
  let batch = to.batch(); let n = 0
  return {
    set: async (ref: FirebaseFirestore.DocumentReference, data: FirebaseFirestore.DocumentData) => {
      writes++
      if (DRY) return
      batch.set(ref, data); n++
      if (n >= 400) { await batch.commit(); batch = to.batch(); n = 0 }
    },
    flush: async () => { if (!DRY && n > 0) await batch.commit() },
  }
})()

async function main() {
  console.log(`${DRY ? 'DRY RUN' : 'WRITING'} → ${TARGET}`)

  const exps = await from.collection('experiences').where('status', '==', 'published').get()
  const companyIds = new Set<string>()
  let options = 0
  for (const d of exps.docs) {
    const x = d.data()
    if (x.companyId) companyIds.add(String(x.companyId))
    await batchWrite.set(to.collection('experiences').doc(d.id), x)
    const opts = await d.ref.collection('options').get()
    for (const o of opts.docs) { await batchWrite.set(to.collection('experiences').doc(d.id).collection('options').doc(o.id), o.data()); options++ }
  }
  console.log(`experiences: ${exps.size} published (+${options} options)`)

  const companies = await from.collection('companies').get()
  let copied = 0, scrubbed = 0
  for (const d of companies.docs) {
    if (!companyIds.has(d.id)) continue // companies with nothing published stay out
    const c = { ...d.data() }
    for (const k of SCRUB_COMPANY) if (k in c) { c[k] = ''; scrubbed++ }
    await batchWrite.set(to.collection('companies').doc(d.id), c)
    copied++
  }
  console.log(`companies: ${copied} of ${companies.size} (with a published listing), ${scrubbed} contact fields blanked`)

  for (const id of CONFIG_DOCS) {
    const snap = await from.collection('config').doc(id).get()
    if (snap.exists) await batchWrite.set(to.collection('config').doc(id), snap.data()!)
  }
  console.log(`config: ${CONFIG_DOCS.join(', ')}`)

  await batchWrite.flush()
  console.log(`${DRY ? 'would write' : 'wrote'} ${writes} documents`)
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
