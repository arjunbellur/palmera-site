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
} from 'firebase/firestore'
import { db } from './firebase'

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
