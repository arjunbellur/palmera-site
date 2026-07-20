/**
 * Syncs experiences.provider (the display name the customer app shows) with its
 * company's current name.
 *
 * `provider` is a denormalized copy of company.name. Without Cloud Functions
 * there's no automatic fanout, so renaming a company leaves its live listings
 * showing the old (or an empty) name. Run this after renaming companies — and
 * it doubles as the fix for migrated listings whose legacy providerName was blank.
 *
 * Idempotent. Reports companies still untitled, since those can't be fixed here.
 *
 * Run: GOOGLE_APPLICATION_CREDENTIALS=/path/key.json npx tsx scripts/backfill-experience-provider.ts [--dry]
 */
import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const DRY = process.argv.includes('--dry')
initializeApp({ credential: applicationDefault() })
const db = getFirestore()
type Any = Record<string, any>

async function main() {
  const [exps, comps] = await Promise.all([
    db.collection('experiences').get(),
    db.collection('companies').get(),
  ])
  const nameById = new Map(comps.docs.map(c => [c.id, (c.data() as Any).name || '']))
  console.log(`${DRY ? '[DRY RUN] ' : ''}Checking ${exps.size} experience(s)…\n`)

  let fixed = 0, ok = 0, blocked = 0
  for (const e of exps.docs) {
    const d = e.data() as Any
    const want = nameById.get(d.companyId) ?? ''
    if (!want) {
      console.log(`⚠ "${d.title}" — its company is still untitled; name the company, then re-run`)
      blocked++; continue
    }
    if (d.provider === want) { ok++; continue }
    console.log(`✓ "${d.title}" — provider: ${d.provider ? `"${d.provider}"` : '(empty)'} → "${want}"`)
    if (!DRY) await e.ref.update({ provider: want })
    fixed++
  }
  console.log(`\n${DRY ? '[DRY RUN] ' : ''}Done — ${fixed} updated, ${ok} already correct, ${blocked} blocked by an untitled company.`)
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
