import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  onSnapshot,
  getCountFromServer,
} from 'firebase/firestore'
import { db } from './firebase'
import { arrayUnion } from 'firebase/firestore'
import {
  COLLECTIONS, SUB,
  type Provider, type ProviderPrivateAdmin,
  type Company, type CompanyPrivateAdmin,
  type Experience, type Option, type OptionGroup,
  type Booking, type LedgerEntry, type Payout, type CompanyPayoutProfile,
  type AppProfile, type AppDoc,
  type Supplier, type SupplyProduct, type SupplyOrder, type StaffMember,
} from './schema'

// ── Listing types ─────────────────────────────────────────────────
export type ListingMode = 'paid' | 'reservation'
export type AvailabilityType = 'always' | 'scheduled' | 'one_time'

export interface Listing {
  id?: string
  mode: ListingMode
  providerName: string
  title: string
  category: string
  city: string
  location: string
  duration: string
  minGuests: string
  maxGuests: string
  basePrice: string
  pricingModel: string
  availabilityType: AvailabilityType
  scheduledDays: string[]
  eventDate: string
  availableDays: string
  timeSlots: string
  leadTime: string
  blackoutDates: string
  cancellationPolicy: string
  requiresReservation: boolean
  minGroupSize: string
  maxGroupSize: string
  advanceBookingDays: string
  isHighlighted: boolean
  includes: string
  excludes: string
  highlights: string
  dressCode: string
  languages: string[]
  description: string
}

// ── Partner profile ──────────────────────────────────────────────
export const getPartner = async (uid: string) => {
  const ref = doc(db, 'partners', uid)
  const snap = await getDoc(ref)
  return snap.exists() ? snap.data() : null
}


export const updatePartner = async (uid: string, data: Record<string, unknown>) => {
  const ref = doc(db, 'partners', uid)
  await updateDoc(ref, { ...data, updatedAt: serverTimestamp() })
}

export const updateSectionStatus = async (
  uid: string,
  section: string,
  status: 'incomplete' | 'in_progress' | 'complete'
) => {
  const ref = doc(db, 'partners', uid)
  await updateDoc(ref, {
    [`sections.${section}`]: status,
    updatedAt: serverTimestamp(),
  })
}

// ── Listings ─────────────────────────────────────────────────────
export const getListings = async (uid: string) => {
  const ref = collection(db, 'partners', uid, 'listings')
  const snap = await getDocs(ref)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export const addListing = async (uid: string, listing: Record<string, unknown>) => {
  const ref = collection(db, 'partners', uid, 'listings')
  return addDoc(ref, { ...listing, createdAt: serverTimestamp() })
}

export const updateListing = async (
  uid: string,
  listingId: string,
  data: Record<string, unknown>
) => {
  const ref = doc(db, 'partners', uid, 'listings', listingId)
  await updateDoc(ref, { ...data, updatedAt: serverTimestamp() })
}

export const deleteListing = async (uid: string, listingId: string) => {
  const ref = doc(db, 'partners', uid, 'listings', listingId)
  await deleteDoc(ref)
}


// ── Countersignature ─────────────────────────────────────────────
// Palmera's manual approval of a partner's signed agreement. Stored in its own
// collection (not on the partner doc) so it can be admin-write / owner-read
// without loosening the partner document's own rules. Admin-only write is
// enforced by firestore.rules.
export interface Countersignature {
  status: 'executed'
  agreementVersion: string
  signatoryEntity: string
  signatoryName: string
  signatoryTitle: string
  executedByEmail: string
  executedAt: string
}

// Palmera's fixed countersignatory (representative name + title), set once
// through the admin UI. Admin read/write only (firestore.rules). Partners never
// read this — the executed name/title is snapshotted onto each countersignature.
export interface Countersignatory {
  name: string
  title: string
  updatedByEmail?: string
  updatedAt?: string
}

export const getCountersignatory = async (): Promise<Countersignatory | null> => {
  try {
    const snap = await getDoc(doc(db, 'config', 'countersignatory'))
    return snap.exists() ? (snap.data() as Countersignatory) : null
  } catch {
    return null
  }
}

export const setCountersignatory = async (data: Countersignatory) => {
  await setDoc(doc(db, 'config', 'countersignatory'), data)
}

export const getCountersignature = async (uid: string): Promise<Countersignature | null> => {
  // Degrade gracefully: a missing countersignature — or rules not yet deployed —
  // means "not countersigned", it must never crash the page that reads it.
  try {
    const snap = await getDoc(doc(db, 'countersignatures', uid))
    return snap.exists() ? (snap.data() as Countersignature) : null
  } catch {
    return null
  }
}

export const setCountersignature = async (uid: string, data: Countersignature) => {
  await setDoc(doc(db, 'countersignatures', uid), data)
}


// ═══════════════════════════════════════════════════════════════════════════
// SCHEMA v3.2 DATA LAYER — providers / companies / experiences / options.
// Added alongside the legacy partners/listings API above; the consumer pages
// migrate onto these phase by phase, after which the legacy fns are removed.
// ═══════════════════════════════════════════════════════════════════════════

// ── Providers ──────────────────────────────────────────────────────────────
export const getProvider = async (uid: string): Promise<Provider | null> => {
  const snap = await getDoc(doc(db, COLLECTIONS.providers, uid))
  return snap.exists() ? (snap.data() as Provider) : null
}

export const createProvider = async (uid: string, email: string) => {
  await setDoc(doc(db, COLLECTIONS.providers, uid), {
    uid,
    email,
    fullName: '',
    role: '',
    primaryPhone: '',
    whatsapp: '',
    country: '',
    logo: null,
    onboardingStage: 'registered',
    signoff: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export const updateProvider = async (uid: string, data: Partial<Provider>) => {
  await updateDoc(doc(db, COLLECTIONS.providers, uid), { ...data, updatedAt: serverTimestamp() })
}

/** providers/{uid}/private/admin — provider may read (own status). */
export const getProviderAdmin = async (uid: string): Promise<ProviderPrivateAdmin | null> => {
  const snap = await getDoc(doc(db, COLLECTIONS.providers, uid, SUB.privateAdmin.col, SUB.privateAdmin.doc))
  return snap.exists() ? (snap.data() as ProviderPrivateAdmin) : null
}

// ── Companies ──────────────────────────────────────────────────────────────
export const getCompanies = async (providerId: string): Promise<Company[]> => {
  const q = query(collection(db, COLLECTIONS.companies), where('providerId', '==', providerId))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Company) }))
}

export const getCompany = async (companyId: string): Promise<Company | null> => {
  const snap = await getDoc(doc(db, COLLECTIONS.companies, companyId))
  return snap.exists() ? ({ id: snap.id, ...(snap.data() as Company) }) : null
}

export const createCompany = async (providerId: string, data: Partial<Company>) => {
  return addDoc(collection(db, COLLECTIONS.companies), {
    providerId,
    name: '', legalName: '', businessType: '', category: '', city: '',
    address: '', mapsLink: null, websiteOrSocial: null, phone: '', whatsapp: '',
    logo: null, heroPhoto: null, gallery: [], operations: null, completeness: {},
    activatedAt: null, active: false,
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export const updateCompany = async (companyId: string, data: Partial<Company>) => {
  await updateDoc(doc(db, COLLECTIONS.companies, companyId), { ...data, updatedAt: serverTimestamp() })
}


/** companies/{companyId}/private/admin — provider may read (own rate). */
export const getCompanyAdmin = async (companyId: string): Promise<CompanyPrivateAdmin | null> => {
  const snap = await getDoc(doc(db, COLLECTIONS.companies, companyId, SUB.privateAdmin.col, SUB.privateAdmin.doc))
  return snap.exists() ? (snap.data() as CompanyPrivateAdmin) : null
}

// ── Experiences (top-level, shared with the app) ────────────────────────────
// Queries anchor on providerId so they satisfy the read rule (which authorizes
// by providerId); companyId is an additional filter (needs a providerId+companyId
// composite index). Fetch-all-then-filter is fine at partner scale.
export const getExperiencesByProvider = async (providerId: string): Promise<Experience[]> => {
  const q = query(collection(db, COLLECTIONS.experiences), where('providerId', '==', providerId))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Experience) }))
}

export const getExperiencesByCompany = async (providerId: string, companyId: string): Promise<Experience[]> => {
  const all = await getExperiencesByProvider(providerId)
  return all.filter((e) => e.companyId === companyId)
}

export const addExperience = async (data: Partial<Experience>) => {
  // status/active are DEFAULTS, not overrides — a partner may publish straight
  // from the editor. `active` always mirrors `status` (the rules enforce it).
  const status = data.status ?? 'draft'
  return addDoc(collection(db, COLLECTIONS.experiences), {
    ...data,
    status,
    active: status === 'published',
    rating: 0,
    reviews: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export const updateExperience = async (id: string, data: Partial<Experience>) => {
  await updateDoc(doc(db, COLLECTIONS.experiences, id), { ...data, updatedAt: serverTimestamp() })
}

/** Owner-side delete: the experience plus every option under it. */
export const deleteExperience = async (id: string) => {
  const opts = await getDocs(collection(db, COLLECTIONS.experiences, id, SUB.options))
  await Promise.all(opts.docs.map((o) => deleteDoc(o.ref)))
  await deleteDoc(doc(db, COLLECTIONS.experiences, id))
}

// ── Options (subcollection of an experience) ────────────────────────────────
export const getOptions = async (experienceId: string): Promise<Option[]> => {
  const snap = await getDocs(collection(db, COLLECTIONS.experiences, experienceId, SUB.options))
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Option) }))
}

export const addOption = async (experienceId: string, data: Partial<Option>) => {
  return addDoc(collection(db, COLLECTIONS.experiences, experienceId, SUB.options), data)
}

export const updateOption = async (experienceId: string, optionId: string, data: Partial<Option>) => {
  await updateDoc(doc(db, COLLECTIONS.experiences, experienceId, SUB.options, optionId), data)
}

export const deleteOption = async (experienceId: string, optionId: string) => {
  await deleteDoc(doc(db, COLLECTIONS.experiences, experienceId, SUB.options, optionId))
}


/**
 * LIVE full-collection listeners for the admin directory — every provider/
 * company change lands without a Refresh button. Same read shape (and doc
 * mapping) as the getters above; no where/orderBy, so no index needed.
 * Returns the unsubscribe function.
 */
export const subscribeAllProviders = (cb: (ps: Provider[]) => void): (() => void) =>
  onSnapshot(collection(db, COLLECTIONS.providers),
    (snap) => cb(snap.docs.map((d) => ({ ...(d.data() as Provider), uid: d.id }))),
    (e) => { console.error('subscribeAllProviders failed:', e); cb([]) },
  )

export const subscribeAllCompanies = (cb: (cs: Company[]) => void): (() => void) =>
  onSnapshot(collection(db, COLLECTIONS.companies),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Company) }))),
    (e) => { console.error('subscribeAllCompanies failed:', e); cb([]) },
  )

// ── Admin analytics reads ─────────────────────────────────────────────────
// The /admin hub reads the APP's collections (Samson's side: profiles,
// moments, points…) purely for display. All snake_case fields, all readable
// under the app's existing signedIn() rules — NO rules change involved, and
// nothing here ever writes. Full-collection reads at current scale (<200
// docs); revisit with server aggregation if a collection passes ~2k docs.

const readAll = async <T extends { id?: string }>(name: string): Promise<T[]> => {
  try {
    const snap = await getDocs(collection(db, name))
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) })) as T[]
  } catch (e) {
    console.error(`readAll(${name}) failed:`, e)
    return []
  }
}

export const getAppProfiles = () => readAll<AppProfile>('profiles')
export const getAppMoments = () => readAll<AppDoc>('moments')
export const getAppMomentComments = () => readAll<AppDoc>('moment_comments')
export const getAppFriends = () => readAll<AppDoc>('friends')
export const getAppFavorites = () => readAll<AppDoc>('favorites')
export const getAppReviews = () => readAll<AppDoc>('reviews')
export const getAppPointsLedger = () => readAll<AppDoc>('points_ledger')
export const getAppChatMessages = () => readAll<AppDoc>('chat_messages')

/** LIVE app-user roster for the admin Pulse — a signup appears the moment
 *  the app writes the profile. */
export const subscribeAppProfiles = (cb: (ps: AppProfile[]) => void): (() => void) =>
  onSnapshot(collection(db, 'profiles'),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) })) as AppProfile[]),
    (e) => { console.error('subscribeAppProfiles failed:', e); cb([]) },
  )

/** Every booking across all partners (admin read rule). Consumers filter
 *  malformed legacy docs through isRealBooking() from lib/analytics. */
export const getAllBookingsAdmin = async (): Promise<Booking[]> => {
  try {
    const snap = await getDocs(collection(db, COLLECTIONS.bookings))
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) })) as Booking[]
  } catch (e) {
    console.error('getAllBookingsAdmin failed:', e)
    return []
  }
}

/** Bookings created in the last `days` (default 90) — every Overview tile
 *  derives from ≤8-week windows, so a lifetime listener was pure waste that
 *  grew with the platform. Pass Infinity for the full collection. */
export const subscribeAllBookings = (cb: (bs: Booking[]) => void, days = 90): (() => void) => {
  const q = Number.isFinite(days)
    ? query(collection(db, COLLECTIONS.bookings), where('createdAt', '>=', new Date(Date.now() - days * 86400_000)))
    : collection(db, COLLECTIONS.bookings)
  return onSnapshot(q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) })) as Booking[]),
    (e) => { console.error('subscribeAllBookings failed:', e); cb([]) },
  )
}

/** Server-side count — 1 read per 1,000 docs instead of one per doc. */
export const countDocs = async (name: string): Promise<number> =>
  (await getCountFromServer(collection(db, name))).data().count

/** All countersigned provider uids in ONE query (was one getDoc per provider). */
export const getCountersignedUids = async (): Promise<Set<string>> => {
  const snap = await getDocs(collection(db, 'countersignatures'))
  return new Set(snap.docs.map((d) => d.id))
}

export const getAllCompanies = async (): Promise<Company[]> => {
  const snap = await getDocs(collection(db, COLLECTIONS.companies))
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Company) }))
}

export const getAllExperiencesAdmin = async (): Promise<Experience[]> => {
  const snap = await getDocs(collection(db, COLLECTIONS.experiences))
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Experience) }))
}

/** All experiences under one company — admin use (bypasses the providerId-anchored query). */
export const getExperiencesByCompanyIdAdmin = async (companyId: string): Promise<Experience[]> => {
  const q = query(collection(db, COLLECTIONS.experiences), where('companyId', '==', companyId))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Experience) }))
}

/** Admin-only: activation + commission window for one company. */
export const activateCompany = async (companyId: string, commissionRate: number) => {
  await updateDoc(doc(db, COLLECTIONS.companies, companyId), { activatedAt: serverTimestamp(), active: true, updatedAt: serverTimestamp() })
  await setDoc(doc(db, COLLECTIONS.companies, companyId, SUB.privateAdmin.col, SUB.privateAdmin.doc),
    { commissionRate, payoutMethod: null, payoutConfig: null, payoutVerification: null } satisfies CompanyPrivateAdmin, { merge: true })
}

export const updateCompanyAdminFields = async (companyId: string, data: Partial<CompanyPrivateAdmin>) => {
  await setDoc(doc(db, COLLECTIONS.companies, companyId, SUB.privateAdmin.col, SUB.privateAdmin.doc), data, { merge: true })
}

export const setProviderStatus = async (uid: string, status: ProviderPrivateAdmin['status']) => {
  await setDoc(doc(db, COLLECTIONS.providers, uid, SUB.privateAdmin.col, SUB.privateAdmin.doc), { status }, { merge: true })
}

/** Admin-only: publish/unpublish an experience and set its curation tag. */
export const setExperienceStatus = async (id: string, status: Experience['status']) => {
  await updateDoc(doc(db, COLLECTIONS.experiences, id), { status, active: status === 'published', updatedAt: serverTimestamp() })
}

export const setExperienceTag = async (id: string, tag: string | null) => {
  await updateDoc(doc(db, COLLECTIONS.experiences, id), { tag, updatedAt: serverTimestamp() })
}

/** Admin-only: delete a company and everything under it (experiences, options,
 * and the ENTIRE private subcollection — admin + payout + any future docs).
 * Provider doc is untouched — a provider may own other companies. */
export const deleteCompanyCascade = async (companyId: string) => {
  const exps = await getExperiencesByCompanyIdAdmin(companyId)
  await Promise.all(exps.map(async (e) => {
    const opts = await getDocs(collection(db, COLLECTIONS.experiences, e.id!, SUB.options))
    await Promise.all(opts.docs.map((o) => deleteDoc(o.ref)))
    await deleteDoc(doc(db, COLLECTIONS.experiences, e.id!))
  }))
  const priv = await getDocs(collection(db, COLLECTIONS.companies, companyId, SUB.privateAdmin.col))
  await Promise.all(priv.docs.map((d) => deleteDoc(d.ref)))
  await deleteDoc(doc(db, COLLECTIONS.companies, companyId))
}

/**
 * Admin-only: delete the ENTIRE partner account's Firestore footprint —
 * every company (full cascade), the countersignature, the provider's private
 * subcollection, and the provider doc itself.
 *
 * What this CANNOT do from the browser: remove the Firebase Auth login or
 * Storage uploads. The login survives; on next sign-in the self-heal creates
 * a fresh provider doc, so the account restarts onboarding from zero.
 */
export const deleteProviderAccountCascade = async (uid: string) => {
  const companies = await getCompanies(uid)
  for (const c of companies) await deleteCompanyCascade(c.id!)
  await deleteDoc(doc(db, 'countersignatures', uid)).catch(() => {})
  const priv = await getDocs(collection(db, COLLECTIONS.providers, uid, SUB.privateAdmin.col))
  await Promise.all(priv.docs.map((d) => deleteDoc(d.ref)))
  await deleteDoc(doc(db, COLLECTIONS.providers, uid))
}

// ══════════════════════════════════════════════════════════════════════════
// v3.3 — reservations & money (READ-ONLY from the dashboard).
// All queries are providerId-anchored so they pass the read rules, and degrade
// to [] on error (rules not yet deployed / empty) so a page never crashes.
// ══════════════════════════════════════════════════════════════════════════
const rows = <T>(snap: { docs: { id: string; data: () => unknown }[] }): T[] =>
  snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) })) as T[]

/** Reservations for a provider, newest scheduled first. Optional status filter. */
export const getBookingsByProvider = async (uid: string, status?: Booking['status']): Promise<Booking[]> => {
  try {
    const clauses = [where('providerId', '==', uid), ...(status ? [where('status', '==', status)] : [])]
    const snap = await getDocs(query(collection(db, COLLECTIONS.bookings), ...clauses, orderBy('scheduledFor', 'desc')))
    return rows<Booking>(snap)
  } catch (e) {
    // A failed query must be LOUD — a missing index looks identical to an
    // empty list otherwise (root cause of the invisible-reservations bug).
    console.error('getBookingsByProvider query failed:', e)
    return []
  }
}

/**
 * LIVE reservations for one company — pushes every change the moment the
 * customer app writes it (new booking, cancellation, payment update), so the
 * partner never needs to refresh. Returns the unsubscribe function.
 */
export const subscribeBookingsByCompany = (
  uid: string,
  companyId: string,
  cb: (bookings: Booking[]) => void,
): (() => void) => {
  const q = query(
    collection(db, COLLECTIONS.bookings),
    where('providerId', '==', uid), where('companyId', '==', companyId),
    orderBy('scheduledFor', 'desc'),
  )
  return onSnapshot(q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) })) as Booking[]),
    (e) => { console.error('subscribeBookingsByCompany failed:', e); cb([]) },
  )
}

/** Reservations scoped to one company (subset of the provider's). */
export const getBookingsByCompany = async (uid: string, companyId: string): Promise<Booking[]> => {
  try {
    const snap = await getDocs(query(
      collection(db, COLLECTIONS.bookings),
      where('providerId', '==', uid), where('companyId', '==', companyId),
      orderBy('scheduledFor', 'desc'),
    ))
    return rows<Booking>(snap)
  } catch (e) {
    // A failed query must be LOUD — a missing index looks identical to an
    // empty list otherwise (root cause of the invisible-reservations bug).
    console.error('getBookingsByCompany query failed:', e)
    return []
  }
}

/** Ledger events for a provider, newest first. */
export const getLedgerByProvider = async (uid: string): Promise<LedgerEntry[]> => {
  try {
    const snap = await getDocs(query(
      collection(db, COLLECTIONS.ledger),
      where('providerId', '==', uid), orderBy('createdAt', 'desc'),
    ))
    return rows<LedgerEntry>(snap)
  } catch (e) {
    // A failed query must be LOUD — a missing index looks identical to an
    // empty list otherwise (root cause of the invisible-reservations bug).
    console.error('getLedgerByProvider query failed:', e)
    return []
  }
}


/** Payout batches for a provider, newest scheduled first. */
export const getPayoutsByProvider = async (uid: string): Promise<Payout[]> => {
  try {
    const snap = await getDocs(query(
      collection(db, COLLECTIONS.payouts),
      where('providerId', '==', uid), orderBy('scheduledFor', 'desc'),
    ))
    return rows<Payout>(snap)
  } catch (e) {
    // A failed query must be LOUD — a missing index looks identical to an
    // empty list otherwise (root cause of the invisible-reservations bug).
    console.error('getPayoutsByProvider query failed:', e)
    return []
  }
}

/**
 * Partner-side response to a booking request. Only 'confirmed' | 'declined',
 * and only on a booking they own — enforced again in firestore.rules, which
 * also freezes the money fields so a partner can't rewrite what they're owed.
 */
/** Door check-in for one scanned ticket. First scan of a confirmed booking
 *  marks it completed (the delivery event); every scan records the guest so
 *  a party's remaining tickets stay valid. */
export const checkInBookingGuest = async (id: string, guestId: string | null, firstScan: boolean) => {
  await updateDoc(doc(db, COLLECTIONS.bookings, id), {
    ...(firstScan ? { status: 'completed', checkedInAt: serverTimestamp() } : {}),
    ...(guestId ? { checkedInGuests: arrayUnion(guestId) } : {}),
    updatedAt: serverTimestamp(),
  })
}

export const setBookingStatus = async (id: string, status: 'confirmed' | 'declined' | 'no_show' | 'completed') => {
  await updateDoc(doc(db, COLLECTIONS.bookings, id), {
    status,
    ...(status === 'confirmed' ? { confirmedAt: serverTimestamp() } : {}),
    ...(status === 'completed' ? { checkedInAt: serverTimestamp() } : {}),
    updatedAt: serverTimestamp(),
  })
}

// ── Partner payout details (companies/{id}/private/payout) ──────────────────
// Owner-entered in dashboard Settings; owner read/write, admin read (rules).
export const getPayoutProfile = async (companyId: string): Promise<CompanyPayoutProfile | null> => {
  try {
    const snap = await getDoc(doc(db, COLLECTIONS.companies, companyId, SUB.privatePayout.col, SUB.privatePayout.doc))
    return snap.exists() ? (snap.data() as CompanyPayoutProfile) : null
  } catch { return null }
}

export const setPayoutProfile = async (companyId: string, data: Omit<CompanyPayoutProfile, 'updatedAt'>) => {
  await setDoc(doc(db, COLLECTIONS.companies, companyId, SUB.privatePayout.col, SUB.privatePayout.doc), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

/**
 * The ONE save path for the listing editor — both surfaces (onboarding company
 * page and /partner Listings) call this so the documents they write can never
 * drift. Finalizes schema invariants, writes the experience + options, and
 * returns the saved id/status for follow-ups (toasts, graduation).
 */
export const saveExperienceWithOptions = async (args: {
  companyName: string
  existingId?: string
  data: Partial<Experience>
  groups: (OptionGroup & { options: (Option & { _isNew?: boolean })[] })[]
}): Promise<{ id: string; status: Experience['status'] }> => {
  const { companyName, existingId, data, groups } = args
  const paidOption = groups.some((g) => g.options.some((o) => (o.price || 0) > 0))
  const isPaid = data.mode === 'paid'
  const finalData: Partial<Experience> = {
    ...data,
    price: isPaid ? (data.price ?? null) : null,
    currency: isPaid || paidOption ? 'XOF' : null,
    guests: data.minGuests != null && data.maxGuests != null ? `${data.minGuests}–${data.maxGuests}` : '',
    provider: companyName || '',
    needsReview: [
      ...(!data.img ? ['photos'] : []),
      ...(!data.mapsLink ? ['coords'] : []),
    ],
  }
  let id = existingId
  if (id) await updateExperience(id, finalData)
  else { const ref = await addExperience(finalData); id = ref.id }

  // Options: clear-and-recreate from form state. Fine at this scale.
  const existing = await getOptions(id)
  await Promise.all(existing.map((o: Option) => deleteOption(id!, o.id!)))
  for (const g of groups) {
    for (const o of g.options) {
      const { id: _oid, ...rest } = o
      delete (rest as { _isNew?: boolean })._isNew
      await addOption(id, rest)
    }
  }
  return { id, status: (finalData.status || 'draft') as Experience['status'] }
}

// ── Marketplace: suppliers + products (see docs/marketplace-plan.md) ──────
// All CRUD is client-SDK under the marketplace rules block; supplier docs
// are auto-id (uid claimed at first login), products are a FLAT collection
// so the partner store is one query.
export const getAllSuppliers = async (): Promise<Supplier[]> => {
  const snap = await getDocs(collection(db, 'suppliers'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Supplier)
}

export const getSupplierByUid = async (uid: string): Promise<Supplier | null> => {
  const snap = await getDocs(query(collection(db, 'suppliers'), where('uid', '==', uid)))
  return snap.empty ? null : ({ id: snap.docs[0].id, ...snap.docs[0].data() } as Supplier)
}

// Concierge claim: an invited supplier signs in with the email the admin
// registered; the doc with that email and no uid becomes theirs.
export const claimSupplierByEmail = async (email: string, uid: string): Promise<Supplier | null> => {
  const snap = await getDocs(query(collection(db, 'suppliers'), where('email', '==', email)))
  const doc0 = snap.docs.find(d => !d.data().uid)
  if (!doc0) return null
  await updateDoc(doc(db, 'suppliers', doc0.id), { uid, updatedAt: serverTimestamp() })
  return { id: doc0.id, ...doc0.data(), uid } as Supplier
}

export const createSupplier = async (data: Partial<Supplier>) => {
  const ref = await addDoc(collection(db, 'suppliers'), {
    uid: null, status: 'active', commissionRate: 0.1, ...data,
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  })
  return ref.id
}

export const updateSupplier = async (id: string, data: Partial<Supplier>) => {
  await updateDoc(doc(db, 'suppliers', id), { ...data, updatedAt: serverTimestamp() })
}

export const getProductsBySupplier = async (supplierId: string): Promise<SupplyProduct[]> => {
  const snap = await getDocs(query(collection(db, 'products'), where('supplierId', '==', supplierId)))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as SupplyProduct)
}

export const getLiveProducts = async (): Promise<SupplyProduct[]> => {
  const snap = await getDocs(query(collection(db, 'products'), where('status', '==', 'live')))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as SupplyProduct)
}

export const addSupplyProduct = async (data: Partial<SupplyProduct>) => {
  const ref = await addDoc(collection(db, 'products'), {
    status: 'live', photo: null, stock: 0, ...data,
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  })
  return ref.id
}

export const updateSupplyProduct = async (id: string, data: Partial<SupplyProduct>) => {
  await updateDoc(doc(db, 'products', id), { ...data, updatedAt: serverTimestamp() })
}

export const deleteSupplyProduct = async (id: string) => {
  await deleteDoc(doc(db, 'products', id))
}

export const getSupplyOrdersByPartner = async (partnerId: string): Promise<SupplyOrder[]> => {
  const snap = await getDocs(query(collection(db, 'supply_orders'), where('partnerId', '==', partnerId)))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as SupplyOrder)
}

// ── Company staff (invite → claim, mirrors the supplier pattern) ───────────
export const getStaffByCompany = async (providerId: string, companyId: string): Promise<StaffMember[]> => {
  // providerId is in the query so the list is PROVABLE against the read rule
  // (rules can't scan: a companyId-only query gets denied wholesale).
  const snap = await getDocs(query(collection(db, 'staff'), where('providerId', '==', providerId), where('companyId', '==', companyId)))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as StaffMember)
}

export const inviteStaff = async (data: Pick<StaffMember, 'companyId' | 'providerId' | 'email' | 'name' | 'role'>) => {
  await addDoc(collection(db, 'staff'), {
    ...data, email: data.email.trim().toLowerCase(), uid: null, status: 'active',
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  })
}

export const setStaffStatus = async (id: string, status: StaffMember['status']) => {
  await updateDoc(doc(db, 'staff', id), { status, updatedAt: serverTimestamp() })
}

export const deleteStaff = async (id: string) => { await deleteDoc(doc(db, 'staff', id)) }

export const getStaffByUid = async (uid: string): Promise<StaffMember | null> => {
  const snap = await getDocs(query(collection(db, 'staff'), where('uid', '==', uid)))
  const active = snap.docs.find(d => d.data().status === 'active')
  return active ? ({ id: active.id, ...active.data() } as StaffMember) : null
}

export const claimStaffByEmail = async (email: string, uid: string): Promise<StaffMember | null> => {
  const snap = await getDocs(query(collection(db, 'staff'), where('email', '==', email.toLowerCase())))
  const doc0 = snap.docs.find(d => !d.data().uid && d.data().status === 'active')
  if (!doc0) return null
  const data = doc0.data()
  // The access doc is what booking rules key on — created by the invitee,
  // validated by rules against the invite itself.
  await setDoc(doc(db, 'staff_access', `${data.companyId}_${uid}`), {
    companyId: data.companyId, uid, role: data.role, staffDocId: doc0.id, createdAt: serverTimestamp(),
  })
  await updateDoc(doc(db, 'staff', doc0.id), { uid, updatedAt: serverTimestamp() })
  return { id: doc0.id, ...data, uid } as StaffMember
}

/** Revoke = kill the access doc (the actual power) + mark the invite. */
export const revokeStaff = async (m: StaffMember) => {
  if (m.uid) await deleteDoc(doc(db, 'staff_access', `${m.companyId}_${m.uid}`)).catch(() => {})
  await updateDoc(doc(db, 'staff', m.id!), { status: 'revoked', updatedAt: serverTimestamp() })
}

/** Bookings for a company, for STAFF (no providerId available client-side). */
export const subscribeBookingsForStaff = (companyId: string, cb: (bs: Booking[]) => void): (() => void) =>
  onSnapshot(query(collection(db, COLLECTIONS.bookings), where('companyId', '==', companyId)),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) })) as Booking[]),
    (e) => { console.error('subscribeBookingsForStaff failed:', e); cb([]) },
  )
