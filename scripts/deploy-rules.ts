/**
 * Deploys firestore.rules WITHOUT the Firebase CLI's service-usage preflight
 * (which our Admin-SDK service account isn't permitted to call). Uses the same
 * GOOGLE_APPLICATION_CREDENTIALS key to mint a token, then talks to the
 * Firebase Rules REST API directly: create a ruleset from the local file, then
 * point the cloud.firestore release at it.
 *
 * Run: GOOGLE_APPLICATION_CREDENTIALS=/path/key.json npm run rules:deploy
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const PROJECT = 'palmera-platform'
const RULES_PATH = resolve(process.cwd(), 'firestore.rules')
const API = 'https://firebaserules.googleapis.com/v1'

async function token(): Promise<string> {
  // Reuse the Admin SDK's credential to obtain an OAuth2 access token.
  const app = initializeApp({ credential: applicationDefault() })
  const t = await (app.options.credential as any).getAccessToken()
  await getFirestore(app).terminate().catch(() => {})
  return t.access_token
}

async function call(path: string, method: string, body: unknown, tok: string) {
  const res = await fetch(`${API}/${path}`, {
    method,
    headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
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
    source: { files: [{ name: 'firestore.rules', content: source }] },
  }, tok)
  console.log(`✓ Created ruleset ${ruleset.name}`)

  // 2) Point the cloud.firestore release at the new ruleset (update, else create).
  const releaseName = `projects/${PROJECT}/releases/cloud.firestore`
  const payload = { release: { name: releaseName, rulesetName: ruleset.name } }
  try {
    await call(`projects/${PROJECT}/releases/cloud.firestore`, 'PATCH', payload, tok)
  } catch {
    await call(`projects/${PROJECT}/releases`, 'POST', payload, tok)
  }
  console.log('✓ Deployed firestore.rules → cloud.firestore release is live')
}

main().then(() => process.exit(0)).catch((e) => { console.error('✗ Rules deploy failed:\n', e.message); process.exit(1) })
