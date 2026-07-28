/**
 * Deploys firestore.indexes.json via the Firestore Admin API (same auth path
 * as deploy-rules.ts — the Firebase CLI's preflight is blocked for our key).
 *
 * WHY THIS EXISTS: the dashboard's core queries (bookings by provider ordered
 * by date, etc.) are composite queries — without these indexes Firestore
 * throws FAILED_PRECONDITION and the UI shows empty lists. This file is the
 * committed record of every index the app + dashboard need.
 *
 * Run: GOOGLE_APPLICATION_CREDENTIALS=/path/key.json npm run indexes:deploy
 * Index builds are asynchronous — the script reports state; re-run to check.
 */
import { readFileSync } from 'node:fs'
import { initializeApp, applicationDefault } from 'firebase-admin/app'

const PROJECT = 'palmera-platform'
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)`

async function token(): Promise<string> {
  const app = initializeApp({ credential: applicationDefault() })
  const t = await (app.options.credential as { getAccessToken: () => Promise<{ access_token: string }> }).getAccessToken()
  return t.access_token
}

async function main() {
  const tok = await token()
  const H = { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' }
  const spec = JSON.parse(readFileSync('firestore.indexes.json', 'utf8'))

  for (const idx of spec.indexes) {
    const body = { queryScope: idx.queryScope, fields: idx.fields }
    const label = `${idx.collectionGroup}(${idx.fields.map((f: { fieldPath: string; order: string }) => `${f.fieldPath} ${f.order === 'DESCENDING' ? '↓' : '↑'}`).join(', ')})`
    const res = await fetch(`${BASE}/collectionGroups/${idx.collectionGroup}/indexes`, {
      method: 'POST', headers: H, body: JSON.stringify(body),
    })
    const json = await res.json()
    if (res.ok) console.log(`✓ creating ${label}`)
    else if (json.error?.status === 'ALREADY_EXISTS') console.log(`· exists   ${label}`)
    else console.log(`✗ FAILED   ${label}: ${json.error?.message}`)
  }

  // Report current index states (CREATING → READY once built).
  const cgs = [...new Set(spec.indexes.map((i: { collectionGroup: string }) => i.collectionGroup))]
  console.log('\nIndex states:')
  for (const cg of cgs) {
    const res = await fetch(`${BASE}/collectionGroups/${cg}/indexes`, { headers: H })
    const json = await res.json()
    for (const ix of json.indexes || []) {
      const fields = (ix.fields || []).filter((f: { fieldPath: string }) => f.fieldPath !== '__name__')
      console.log(`  ${cg}(${fields.map((f: { fieldPath: string }) => f.fieldPath).join(', ')}): ${ix.state}`)
    }
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
