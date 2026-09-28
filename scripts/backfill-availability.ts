/**
 * One-time: derive the app-shaped `availability` + `closedDays` from each
 * listing's dashboard `schedule` (see SYNC-STATUS 2026-09-27, hours contract).
 * Additive — never touches `schedule`. Idempotent; safe to re-run.
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=… npx tsx scripts/backfill-availability.ts --dry
 *   GOOGLE_APPLICATION_CREDENTIALS=… npx tsx scripts/backfill-availability.ts
 */
import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { availabilityFromSchedule } from '../src/lib/availability'

const DRY = process.argv.includes('--dry')
initializeApp({ credential: applicationDefault() })
const db = getFirestore()

async function main() {
  const snap = await db.collection('experiences').get()
  let n = 0, skipped = 0
  const batch = db.batch()
  for (const d of snap.docs) {
    const x = d.data()
    const derived = availabilityFromSchedule(x.scheduleType, x.schedule)
    if (!derived) { skipped++; continue }
    n++
    console.log(`${DRY ? 'would set' : 'set'} ${d.id} ${String(x.title).slice(0, 28).padEnd(28)} closedDays=${JSON.stringify(derived.closedDays)}`)
    if (!DRY) batch.set(d.ref, derived, { merge: true })
  }
  if (!DRY && n) await batch.commit()
  console.log(`${DRY ? 'would update' : 'updated'} ${n}, skipped ${skipped} (one-time events / stays / no hours)`)
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
