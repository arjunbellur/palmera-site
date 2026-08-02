'use client'
export const dynamic = 'force-dynamic'
// The admin surface moved to /admin — this stub keeps old company links working.
import { useEffect, use } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminCompanyRedirect({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = use(params)
  const router = useRouter()
  useEffect(() => {
    router.replace(`/admin/companies/${companyId}`)
  }, [router, companyId])
  return null
}
