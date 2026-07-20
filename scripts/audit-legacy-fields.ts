/**
 * AUDIT: every field partners actually entered in the legacy dashboard, and
 * where it lives now. Read-only — writes nothing.
 *
 * For each populated key on partners/{uid} (and each listing), classifies:
 *   LIVE      — value verified present on the new provider/company/experience doc
 *   ARCHIVE   — intentionally archive-only (KYC, etc.); present in migrationArchive
 *   ⚠ MISSING — populated in the legacy doc but NOT live and NOT in the archive
 *   ⚠ UNMAPPED— a key nothing in the mapping accounts for (catches my blind spots)
 *
 * Run: GOOGLE_APPLICATION_CREDENTIALS=/path/key.json npx tsx scripts/audit-legacy-fields.ts
 */
import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

initializeApp({ credential: applicationDefault() })
const db = getFirestore()
type Any = Record<string, any>

// legacy partner key → where it should now live. 'archive' = deliberately not live.
const PARTNER_MAP: Record<string, { to: 'provider' | 'company' | 'archive'; field?: string }> = {
  uid: { to: 'provider', field: 'uid' },
  email: { to: 'provider', field: 'email' },
  ownerName: { to: 'provider', field: 'fullName' },
  ownerRole: { to: 'provider', field: 'role' },
  primaryPhone: { to: 'provider', field: 'primaryPhone' },
  whatsapp: { to: 'provider', field: 'whatsapp' },
  country: { to: 'provider', field: 'country' },
  signoff: { to: 'provider', field: 'signoff' },
  onboardingComplete: { to: 'provider', field: 'onboardingStage' },
  createdAt: { to: 'provider', field: 'createdAt' },
  tradingName: { to: 'company', field: 'name' },
  legalName: { to: 'company', field: 'legalName' },
  businessType: { to: 'company', field: 'businessType' },
  industryCategory: { to: 'company', field: 'category' },
  city: { to: 'company', field: 'city' },
  address: { to: 'company', field: 'address' },
  mapsLink: { to: 'company', field: 'mapsLink' },
  websiteOrSocial: { to: 'company', field: 'websiteOrSocial' },
  sections: { to: 'company', field: 'completeness' },
  operations: { to: 'company', field: 'operations' },
  photos: { to: 'company' },            // handled per-subkey below
  // Deliberately archive-only (KYC / compliance — see plan + Documents decision)
  ownerDob: { to: 'archive' }, ownerNationality: { to: 'archive' },
  ownerResidentialAddress: { to: 'archive' }, ownerPersonalTaxId: { to: 'archive' },
  registrationNumber: { to: 'archive' }, taxId: { to: 'archive' }, documents: { to: 'archive' },
  updatedAt: { to: 'archive' },
}
const PHOTO_MAP: Record<string, string | 'archive'> = {
  heroPhoto: 'heroPhoto', providerLogo: 'logo', gallery: 'gallery',
  galleryPhoto1: 'gallery', galleryPhoto2: 'gallery', galleryPhoto3: 'gallery',
  teamHeadshot: 'archive',
}
// legacy listing key → experiences field ('archive' = archived by design)
const LISTING_MAP: Record<string, string | 'archive'> = {
  title: 'title', category: 'category', city: 'city', location: 'location',
  duration: 'duration', description: 'description', includes: 'includes',
  highlights: 'highlights', excludes: 'excludes', languages: 'languages',
  dressCode: 'dressCode', mode: 'mode', basePrice: 'price', pricingModel: 'priceUnit',
  cancellationPolicy: 'cancellationPolicy', minGuests: 'minGuests', maxGuests: 'maxGuests',
  availabilityType: 'scheduleType', scheduledDays: 'schedule', timeSlots: 'schedule',
  leadTime: 'schedule', blackoutDates: 'schedule', advanceBookingDays: 'schedule',
  eventDate: 'eventDate', isHighlighted: 'archive', requiresReservation: 'archive',
  minGroupSize: 'archive', maxGroupSize: 'archive', availableDays: 'archive',
  providerName: 'provider', createdAt: 'createdAt', updatedAt: 'updatedAt', id: 'id',
}

const populated = (v: unknown) =>
  v !== null && v !== undefined && v !== '' &&
  !(Array.isArray(v) && v.length === 0) &&
  !(typeof v === 'object' && !Array.isArray(v) && v !== null && Object.keys(v as Any).length === 0)

const has = (doc: Any | null, field?: string) => !!doc && field != null && populated(doc[field])

async function main() {
  const partners = await db.collection('partners').get()
  console.log(`Auditing ${partners.size} legacy partner doc(s)\n${'='.repeat(70)}\n`)

  const tally: Record<string, Set<string>> = { live: new Set(), archive: new Set(), missing: new Set(), unmapped: new Set() }
  const missingDetail: string[] = []

  for (const p of partners.docs) {
    const uid = p.id
    const partner = p.data() as Any
    const [prov, comp, arch] = await Promise.all([
      db.collection('providers').doc(uid).get(),
      db.collection('companies').doc(uid).get(),
      db.collection('migrationArchive').doc(uid).get(),
    ])
    const provider = prov.exists ? (prov.data() as Any) : null
    const company = comp.exists ? (comp.data() as Any) : null
    const archived = arch.exists
    const label = partner.tradingName || partner.legalName || `(untitled ${uid.slice(0, 6)})`
    console.log(`── ${label}`)
    if (!archived) console.log('   ⚠ NO ARCHIVE for this partner!')

    for (const [key, value] of Object.entries(partner)) {
      if (!populated(value)) continue
      if (key === 'photos') {
        for (const [pk, pv] of Object.entries(value as Any)) {
          if (!populated(pv)) continue
          const dest = PHOTO_MAP[pk]
          if (!dest) { tally.unmapped.add(`photos.${pk}`); console.log(`   ⚠ UNMAPPED  photos.${pk}`); continue }
          if (dest === 'archive') { tally.archive.add(`photos.${pk}`); continue }
          if (has(company, dest)) { tally.live.add(`photos.${pk}`) }
          else if (archived) { tally.archive.add(`photos.${pk}`); console.log(`   · photos.${pk} → archive only (not live on company.${dest})`) }
          else { tally.missing.add(`photos.${pk}`); missingDetail.push(`${label}: photos.${pk}`) }
        }
        continue
      }
      const m = PARTNER_MAP[key]
      if (!m) { tally.unmapped.add(key); console.log(`   ⚠ UNMAPPED  ${key}`); continue }
      if (m.to === 'archive') { if (archived) tally.archive.add(key); else { tally.missing.add(key); missingDetail.push(`${label}: ${key}`) }; continue }
      const target = m.to === 'provider' ? provider : company
      if (has(target, m.field)) tally.live.add(key)
      else if (archived) { tally.archive.add(key); console.log(`   · ${key} → archive only (not live on ${m.to}.${m.field})`) }
      else { tally.missing.add(key); missingDetail.push(`${label}: ${key}`) }
    }

    // Listings → experiences
    const listings = await db.collection('partners').doc(uid).collection('listings').get()
    const exps = await db.collection('experiences').where('providerId', '==', uid).get()
    console.log(`   listings: ${listings.size} legacy → ${exps.size} experience(s) live`)
    if (listings.size > exps.size) console.log(`   ⚠ ${listings.size - exps.size} listing(s) did NOT become an experience`)
    for (const l of listings.docs) {
      const src = l.data() as Any
      const match = exps.docs.find(e => (e.data() as Any).title === src.title)
      for (const [k, v] of Object.entries(src)) {
        if (!populated(v)) continue
        const dest = LISTING_MAP[k]
        if (!dest) { tally.unmapped.add(`listing.${k}`); console.log(`   ⚠ UNMAPPED  listing.${k}`); continue }
        if (dest === 'archive') { tally.archive.add(`listing.${k}`); continue }
        if (match && populated((match.data() as Any)[dest])) tally.live.add(`listing.${k}`)
        else if (archived) tally.archive.add(`listing.${k}`)
        else { tally.missing.add(`listing.${k}`); missingDetail.push(`${label}: listing.${k}`) }
      }
    }
    console.log()
  }

  const show = (s: Set<string>) => [...s].sort().join(', ') || '(none)'
  console.log('='.repeat(70))
  console.log(`\n✅ LIVE (verified on a new doc):\n   ${show(tally.live)}`)
  console.log(`\n📦 ARCHIVE-ONLY (recoverable, not shown in UI):\n   ${show(tally.archive)}`)
  console.log(`\n⚠️  MISSING (neither live nor archived):\n   ${show(tally.missing)}`)
  if (missingDetail.length) console.log(`   ${missingDetail.join('\n   ')}`)
  console.log(`\n⚠️  UNMAPPED (nothing accounts for these):\n   ${show(tally.unmapped)}\n`)
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
