/**
 * Migrates legacy partners/{uid} (+ listings subcollection) to Schema v3.2:
 *   providers/{uid} + companies/{uid} + experiences/* + migrationArchive/{uid}
 *
 * Guarantees: (1) writes the raw archive FIRST, so nothing is ever lost;
 * (2) idempotent — a partner already having providers/{uid} is skipped;
 * (3) deterministic ids (companyId = uid; experienceId = source listing id) so
 * re-runs don't duplicate.
 *
 * Run (dry-run — logs, writes nothing):
 *   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json npx tsx scripts/migrate-partners-to-v3.ts --dry
 * Run (live):
 *   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json npx tsx scripts/migrate-partners-to-v3.ts
 */
import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore'

const DRY = process.argv.includes('--dry')
initializeApp({ credential: applicationDefault() })
const db = getFirestore()

type Any = Record<string, unknown>
const s = (v: unknown) => (typeof v === 'string' ? v : '')
const lines = (v: unknown) => s(v).split('\n').map((x) => x.trim()).filter(Boolean)
const intOf = (v: unknown) => { const n = parseInt(s(v), 10); return Number.isFinite(n) ? n : 0 }

const mapScheduleType = (a: unknown): 'one_time' | 'ongoing' | 'scheduled' =>
  a === 'scheduled' ? 'scheduled' : (a === 'one_time' || a === 'one_off' || a === 'temporary') ? 'one_time' : 'ongoing'

// pricingModel free-text → priceUnit. Anything mentioning "person" → per_person.
const mapPriceUnit = (m: unknown): 'flat' | 'per_person' => /person/i.test(s(m)) ? 'per_person' : 'flat'

// Best-effort id: lowercase the free value; a value that isn't an enabled config
// id still migrates (the experience just can't publish until it's fixed/enabled).
const toId = (v: unknown) => s(v).trim().toLowerCase().replace(/\s+/g, '_')

const deriveGuests = (min: unknown, max: unknown) => {
  const a = s(min), b = s(max)
  return a && b ? `${a}–${b}` : a || b || ''
}

const mapCompleteness = (sections: Any = {}) => ({
  profile: sections.basics === 'complete',
  listings: sections.listings === 'complete',
  photos: sections.photos === 'complete',
  operations: sections.operations === 'complete',
  documents: sections.documents === 'complete',
  payouts: sections.payouts === 'complete',
})

async function migrate() {
  const partners = await db.collection('partners').get()
  console.log(`${DRY ? '[DRY] ' : ''}Found ${partners.size} partner(s)\n`)
  let migrated = 0, skipped = 0

  for (const pDoc of partners.docs) {
    const uid = pDoc.id
    const partner = pDoc.data() as Any

    // Skip only if this uid was actually migrated (has a company from a prior
    // run), NOT merely if a providers/{uid} doc exists — the dashboard's
    // self-heal creates a bare empty provider doc on first login, which must
    // never cause a real partner's data to be silently skipped here.
    if ((await db.collection('companies').doc(uid).get()).exists) {
      console.log(`- skip ${uid} (already migrated)`); skipped++; continue
    }

    const listingsSnap = await db.collection('partners').doc(uid).collection('listings').get()
    const listings = listingsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Any) })) as (Any & { id: string })[]
    const photos = (partner.photos as Any) || {}

    // 1) Archive — raw source + everything without a live home. Written first.
    const archive = {
      migratedAt: FieldValue.serverTimestamp(),
      sourcePartner: partner,
      sourceListings: listings,
      unmappedFields: {
        kyc: {
          ownerDob: partner.ownerDob ?? null, ownerNationality: partner.ownerNationality ?? null,
          ownerResidentialAddress: partner.ownerResidentialAddress ?? null, ownerPersonalTaxId: partner.ownerPersonalTaxId ?? null,
          registrationNumber: partner.registrationNumber ?? null, taxId: partner.taxId ?? null,
          documents: partner.documents ?? null,
        },
        teamHeadshot: photos.teamHeadshot ?? null,
        isHighlighted: listings.map((l) => ({ id: l.id, isHighlighted: l.isHighlighted ?? false })),
      },
    }

    // 2) provider (the person)
    const provider = {
      uid, email: s(partner.email),
      fullName: s(partner.ownerName), role: s(partner.ownerRole),
      primaryPhone: s(partner.primaryPhone), whatsapp: s(partner.whatsapp),
      country: s(partner.country),
      onboardingStage: partner.onboardingComplete ? 'complete' : 'registered',
      signoff: partner.signoff ?? null,
      createdAt: partner.createdAt ?? FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }

    // 3) company (deterministic id = uid → one company per migrated provider)
    // The legacy partner doc never collected a business-level city (only each
    // listing had one), so infer it from the first listing when possible;
    // providers with zero listings get an empty city, same as any new signup.
    const companyId = uid
    const inferredCity = toId(partner.city) || toId(listings[0]?.city)
    const company = {
      providerId: uid,
      name: s(partner.tradingName), legalName: s(partner.legalName),
      businessType: s(partner.businessType),
      category: toId(partner.industryCategory), city: inferredCity,
      address: s(partner.address), mapsLink: partner.mapsLink ?? null, websiteOrSocial: partner.websiteOrSocial ?? null,
      phone: s(partner.primaryPhone), whatsapp: s(partner.whatsapp),
      logo: photos.providerLogo ?? null,
      heroPhoto: photos.heroPhoto ?? null,
      gallery: Array.isArray(photos.gallery)
        ? photos.gallery
        : [photos.galleryPhoto1, photos.galleryPhoto2, photos.galleryPhoto3].filter(Boolean),
      operations: partner.operations ?? null,
      completeness: mapCompleteness(partner.sections as Any),
      activatedAt: null, active: false,
      createdAt: partner.createdAt ?? FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }
    const companyAdmin = { commissionRate: 0.1, payoutMethod: null, payoutConfig: null, payoutVerification: null }
    const providerAdmin = { status: 'active' }

    // 4) experiences (one per legacy listing; id = source listing id)
    const experiences = listings.map((l) => {
      const mode = l.mode === 'paid' ? 'paid' : 'reservation'
      const scheduleType = mapScheduleType(l.availabilityType)
      const eventDate = scheduleType === 'one_time' && s(l.eventDate)
        ? Timestamp.fromDate(new Date(s(l.eventDate))) : null
      return {
        id: l.id,
        data: {
          providerId: uid, companyId,
          mode, price: mode === 'paid' ? intOf(l.basePrice) : null,
          priceUnit: mapPriceUnit(l.pricingModel),
          currency: mode === 'paid' ? 'XOF' : null,
          confirmationType: 'provider_confirmed',
          cancellationPolicy: { tier: 'moderate', customNotes: s(l.cancellationPolicy) || null, policyVersion: 'v1' },
          scheduleType, eventDate,
          schedule: scheduleType === 'ongoing' ? null : {
            days: Array.isArray(l.scheduledDays) ? l.scheduledDays : [],
            timeSlots: lines(l.timeSlots),
            leadTime: s(l.leadTime), blackoutDates: s(l.blackoutDates), advanceBookingDays: s(l.advanceBookingDays),
          },
          optionGroups: [],
          title: s(l.title), location: s(l.location),
          category: toId(l.category || partner.industryCategory), city: toId(l.city || partner.city),
          lat: null, lng: null,
          duration: s(l.duration), guests: deriveGuests(l.minGuests, l.maxGuests),
          minGuests: intOf(l.minGuests), maxGuests: intOf(l.maxGuests),
          img: '', gallery: [],
          provider: s(partner.tradingName),
          description: s(l.description), includes: lines(l.includes), highlights: s(l.highlights) ? [s(l.highlights)] : [],
          languages: Array.isArray(l.languages) ? l.languages : [], excludes: lines(l.excludes), dressCode: s(l.dressCode) || null,
          tag: null, active: false, status: 'draft', rating: 0, reviews: 0,
          needsReview: ['cancellationTier', 'photos', 'coords'],
          createdAt: l.createdAt ?? FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
      }
    })

    if (DRY) {
      console.log(`- ${uid}: → provider + company(${companyId}) + ${experiences.length} experience(s) [+ archive]`)
      const badCity = !['dakar', 'saly'].includes(company.city)
      if (badCity && company.city) console.log(`    ⚠ city "${company.city}" not enabled at launch — experiences can't publish until enabled`)
      migrated++; continue
    }

    // Write order: archive first, then live docs, in one batch.
    const batch = db.batch()
    batch.set(db.collection('migrationArchive').doc(uid), archive)
    batch.set(db.collection('providers').doc(uid), provider)
    batch.set(db.collection('providers').doc(uid).collection('private').doc('admin'), providerAdmin)
    batch.set(db.collection('companies').doc(companyId), company)
    batch.set(db.collection('companies').doc(companyId).collection('private').doc('admin'), companyAdmin)
    for (const e of experiences) batch.set(db.collection('experiences').doc(e.id), e.data)
    await batch.commit()
    console.log(`✓ ${uid}: migrated (${experiences.length} experience(s))`)
    migrated++
  }

  console.log(`\n${DRY ? '[DRY] ' : ''}Done. ${migrated} migrated, ${skipped} skipped.`)
}

migrate().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
