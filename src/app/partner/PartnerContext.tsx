'use client'
import { createContext, useContext } from 'react'
import type { Booking, Company, Provider } from '@/lib/schema'

export interface PartnerCtx {
  uid: string
  email: string
  provider: Provider | null
  /** Every ACTIVATED company this provider owns — the dashboard only shows live ones. */
  companies: Company[]
  company: Company | null
  /** LIVE bookings for the selected company — ONE subscription owned by the
   *  layout; Home/Reservations/Earnings read from here instead of opening
   *  their own (halves Firestore reads and listener count). */
  bookings: Booking[]
  bookingsLoaded: boolean
  setCompanyId: (id: string) => void
  locale: 'fr' | 'en'
  setLocale: (l: 'fr' | 'en') => void
  /** Refetch provider + companies after an edit, keeping the selected company. */
  refresh: () => Promise<void>
}

export const PartnerContext = createContext<PartnerCtx | null>(null)

export function usePartner(): PartnerCtx {
  const ctx = useContext(PartnerContext)
  if (!ctx) throw new Error('usePartner must be used inside the /partner layout')
  return ctx
}
