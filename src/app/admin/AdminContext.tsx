'use client'
import { createContext, useContext } from 'react'

// Mirrors PartnerContext: the layout authenticates once and shares the admin's
// email (needed for countersign records) with child pages.
export const AdminContext = createContext<{ email: string; uid: string }>({ email: '', uid: '' })
export const useAdmin = () => useContext(AdminContext)
