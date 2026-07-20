/**
 * Restores company photos that the v3.2 migration had no live home for.
 *
 * `photos.heroPhoto` and `photos.gallery` were archived (inside the raw
 * sourcePartner doc) but never written to a live field, because Company had no
 * heroPhoto/gallery until now. This reads them back out of migrationArchive and
 * fills them in. `logo` is also topped up if it's somehow missing.
 *
 * Idempotent and NON-DESTRUCTIVE: only fills fields that are currently empty —
 * anything a partner has since uploaded is left alone.
 *
 * Run: GOOGLE_APPLICATION_CREDENTIALS=/path/key.json npx tsx scripts/backfill-company-photos.ts [--dry]
 */
import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const DRY = process.argv.includes('--dry')
initializeApp({ credential: applicationDefault() })
const db = getFirestore()

type Any = Record<string, any>

async function main() {
  const archives = await db.collection('migrationArchive').get()
  console.log(`${DRY ? '[DRY RUN] ' : ''}Scanning ${archives.size} archived migration(s)…\n`)

  let filled = 0, skipped = 0, missing = 0

  for (const snap of archives.docs) {
    const uid = snap.id
    const photos = ((snap.data() as Any).sourcePartner?.photos || {}) as Any
    // Company id == uid for every migrated partner (deterministic in the migration).
    const ref = db.collection('companies').doc(uid)
    const companySnap = await ref.get()
    if (!companySnap.exists) { console.log(`· ${uid} — no company doc, skipped`); missing++; continue }

    const c = companySnap.data() as Any
    const patch: Any = {}
    if (!c.heroPhoto && photos.heroPhoto) patch.heroPhoto = photos.heroPhoto
    if (!c.logo && photos.providerLogo) patch.logo = photos.providerLogo
    const archivedGallery: string[] = Array.isArray(photos.gallery)
      ? photos.gallery
      : [photos.galleryPhoto1, photos.galleryPhoto2, photos.galleryPhoto3].filter(Boolean)
    if (!(c.gallery?.length) && archivedGallery.length) patch.gallery = archivedGallery

    const name = c.name || '(untitled)'
    if (Object.keys(patch).length === 0) { console.log(`· ${name} — nothing to restore`); skipped++; continue }

    console.log(`✓ ${name} — restoring: ${Object.keys(patch).join(', ')}${patch.gallery ? ` (${patch.gallery.length} gallery photo(s))` : ''}`)
    if (!DRY) await ref.update(patch)
    filled++
  }

  console.log(`\n${DRY ? '[DRY RUN] ' : ''}Done — ${filled} restored, ${skipped} already set, ${missing} without a company doc.`)
  if (DRY) console.log('Re-run without --dry to apply.')
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
