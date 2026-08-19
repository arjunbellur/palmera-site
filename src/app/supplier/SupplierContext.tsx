'use client'
import { createContext, useContext } from 'react'
import type { Supplier } from '@/lib/schema'

// The layout authenticates + claims once; pages get the supplier record and
// the locale. Mirrors PartnerContext.
export const SupplierContext = createContext<{
  supplier: Supplier | null
  uid: string
  locale: 'fr' | 'en'
  refresh: () => Promise<void>
}>({ supplier: null, uid: '', locale: 'fr', refresh: async () => {} })
export const useSupplier = () => useContext(SupplierContext)
