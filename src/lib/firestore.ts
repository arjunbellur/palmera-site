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
} from 'firebase/firestore'
import { db } from './firebase'
import {
  COLLECTIONS, SUB,
  type Provider, type ProviderPrivateAdmin,
  type Company, type CompanyPrivateAdmin,
  type Experience, type Option,
  type Booking, type LedgerEntry, type Payout, type CompanyPayoutProfile,
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

export const createPartner = async (uid: string, email: string) => {
  const ref = doc(db, 'partners', uid)
  await setDoc(ref, {
    uid,
    email,
    createdAt: serverTimestamp(),
    onboardingComplete: false,
    sections: {
      basics: 'incomplete',
      payouts: 'incomplete',
      listings: 'incomplete',
      photos: 'incomplete',
      operations: 'incomplete',
      documents: 'incomplete',
      signoff: 'incomplete',
    },
  })
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

// ── Admin ─────────────────────────────────────────────────────────
export const getAllPartners = async () => {
  const snap = await getDocs(collection(db, 'partners'))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
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

// Permanently delete a partner application: its listings subcollection first
// (deleting the parent doc alone would leave those orphaned), then the doc.
// Admin-only — enforced by firestore.rules. Does not remove Storage uploads or
// the Firebase Auth login (those must be cleared separately).
export const deletePartner = async (uid: string) => {
  const listingsSnap = await getDocs(collection(db, 'partners', uid, 'listings'))
  await Promise.all(listingsSnap.docs.map((d) => deleteDoc(d.ref)))
  await deleteDoc(doc(db, 'partners', uid))
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

export const updateCompanyCompleteness = async (companyId: string, key: string, done: boolean) => {
  await updateDoc(doc(db, COLLECTIONS.companies, companyId), {
    [`completeness.${key}`]: done,
    updatedAt: serverTimestamp(),
  })
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

// ── Admin (all-collection reads + admin-only writes) ────────────────────────
// Reads here return every doc in the collection: rules allow it because
// isAdmin() doesn't depend on the returned doc's own fields.
export const getAllProviders = async (): Promise<Provider[]> => {
  const snap = await getDocs(collection(db, COLLECTIONS.providers))
  return snap.docs.map((d) => ({ ...(d.data() as Provider), uid: d.id }))
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

/** Admin-only: delete a company and everything under it (experiences + private subdoc). Provider doc is untouched — a provider may own other companies. */
export const deleteCompanyCascade = async (companyId: string) => {
  const exps = await getExperiencesByCompanyIdAdmin(companyId)
  await Promise.all(exps.map(async (e) => {
    const opts = await getDocs(collection(db, COLLECTIONS.experiences, e.id!, SUB.options))
    await Promise.all(opts.docs.map((o) => deleteDoc(o.ref)))
    await deleteDoc(doc(db, COLLECTIONS.experiences, e.id!))
  }))
  await deleteDoc(doc(db, COLLECTIONS.companies, companyId, SUB.privateAdmin.col, SUB.privateAdmin.doc)).catch(() => {})
  await deleteDoc(doc(db, COLLECTIONS.companies, companyId))
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
  } catch { return [] }
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
  } catch { return [] }
}

/** Ledger events for a provider, newest first. */
export const getLedgerByProvider = async (uid: string): Promise<LedgerEntry[]> => {
  try {
    const snap = await getDocs(query(
      collection(db, COLLECTIONS.ledger),
      where('providerId', '==', uid), orderBy('createdAt', 'desc'),
    ))
    return rows<LedgerEntry>(snap)
  } catch { return [] }
}

/** Current balance owed to a provider = Σ signed ledger amounts. */
export const getBalanceByProvider = async (uid: string): Promise<number> => {
  const entries = await getLedgerByProvider(uid)
  return entries.reduce((sum, e) => sum + (e.amount || 0), 0)
}

/** Payout batches for a provider, newest scheduled first. */
export const getPayoutsByProvider = async (uid: string): Promise<Payout[]> => {
  try {
    const snap = await getDocs(query(
      collection(db, COLLECTIONS.payouts),
      where('providerId', '==', uid), orderBy('scheduledFor', 'desc'),
    ))
    return rows<Payout>(snap)
  } catch { return [] }
}

/**
 * Partner-side response to a booking request. Only 'confirmed' | 'declined',
 * and only on a booking they own — enforced again in firestore.rules, which
 * also freezes the money fields so a partner can't rewrite what they're owed.
 */
export const setBookingStatus = async (id: string, status: 'confirmed' | 'declined' | 'no_show') => {
  await updateDoc(doc(db, COLLECTIONS.bookings, id), {
    status,
    ...(status === 'confirmed' ? { confirmedAt: serverTimestamp() } : {}),
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
