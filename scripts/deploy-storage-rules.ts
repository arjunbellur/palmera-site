/**
 * Deploys storage.rules WITHOUT the Firebase CLI's service-usage preflight
 * (which our Admin-SDK service account isn't permitted to call). Uses the same
 * GOOGLE_APPLICATION_CREDENTIALS key to mint a token, then talks to the
 * Firebase Rules REST API directly: create a ruleset from the local file, then
 * point the firebase.storage release at it.
 *
 * Run: GOOGLE_APPLICATION_CREDENTIALS=/path/key.json npm run storage:deploy
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { initializeApp, applicationDefault } from 'firebase-admin/app'

// FIREBASE_PROJECT=palmera-staging to target staging; production is the default.
const PROJECT = process.env.FIREBASE_PROJECT || 'palmera-platform'
const RULES_PATH = resolve(process.cwd(), 'storage.rules')
const BUCKET = `${PROJECT}.firebasestorage.app`
const API = 'https://firebaserules.googleapis.com/v1'

async function token(): Promise<string> {
  // Staging / any project: FIREBASE_ACCESS_TOKEN=$(gcloud auth print-access-token).
  // Production default: the Admin SDK key in GOOGLE_APPLICATION_CREDENTIALS.
  if (process.env.FIREBASE_ACCESS_TOKEN) return process.env.FIREBASE_ACCESS_TOKEN
  const app = initializeApp({ credential: applicationDefault() })
  const t = await (app.options.credential as { getAccessToken: () => Promise<{ access_token: string }> }).getAccessToken()
  return t.access_token
}

async function call(path: string, method: string, body: unknown, tok: string) {
  const res = await fetch(`${API}/${path}`, {
    method,
    // x-goog-user-project: a user token (staging path) must name a quota project.
    headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json', 'x-goog-user-project': PROJECT },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${JSON.stringify(json)}`)
  return json as any
}

async function main() {
  const source = readFileSync(RULES_PATH, 'utf8')
  const tok = await token()

  // 1) Create a ruleset holding the local firestore.rules source.
  const ruleset = await call(`projects/${PROJECT}/rulesets`, 'POST', {
    source: { files: [{ name: 'storage.rules', content: source }] },
  }, tok)
  console.log(`✓ Created ruleset ${ruleset.name}`)

  // 2) Point the firebase.storage release at the new ruleset (update, else create).
  const releaseName = `projects/${PROJECT}/releases/firebase.storage/${BUCKET}`
  const payload = { release: { name: releaseName, rulesetName: ruleset.name } }
  try {
    await call(`projects/${PROJECT}/releases/firebase.storage/${BUCKET}`, 'PATCH', payload, tok)
  } catch {
    await call(`projects/${PROJECT}/releases`, 'POST', payload.release, tok)
  }
  console.log('✓ Deployed storage.rules → firebase.storage release is live')
}

main().then(() => process.exit(0)).catch((e) => { console.error('✗ Rules deploy failed:\n', e.message); process.exit(1) })
