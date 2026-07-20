'use client'
import { createContext, useContext } from 'react'
import type { Company, Provider } from '@/lib/schema'

export interface PartnerCtx {
  uid: string
  email: string
  provider: Provider | null
  /** Every ACTIVATED company this provider owns — the dashboard only shows live ones. */
  companies: Company[]
  company: Company | null
  setCompanyId: (id: string) => void
  locale: 'fr' | 'en'
  setLocale: (l: 'fr' | 'en') => void
}

export const PartnerContext = createContext<PartnerCtx | null>(null)

export function usePartner(): PartnerCtx {
  const ctx = useContext(PartnerContext)
  if (!ctx) throw new Error('usePartner must be used inside the /partner layout')
  return ctx
}
