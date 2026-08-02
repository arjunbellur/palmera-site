'use client'
export const dynamic = 'force-dynamic'
// The admin surface moved to its own /admin route (pf design language). This
// stub keeps old bookmarks working; query params carry over (filters are
// URL-backed on the new page).
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/admin' + window.location.search)
  }, [router])
  return null
}
