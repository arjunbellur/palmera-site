'use client'
// Catalogue — everything about what members can see: the Featured tonight
// picks and every live listing with the category the app files it under.
// (Consolidation step 3: Featured left App growth, Categories became this.)
import { getAllExperiencesAdmin } from '@/lib/firestore'
import { useSWRLite } from '@/lib/swr-lite'
import FeaturedPanel from '@/components/admin/FeaturedPanel'
import AdminCategories from '../categories/page'

export default function AdminCatalogue() {
  const { data: experiences } = useSWRLite('admin:catalogue-experiences', () => getAllExperiencesAdmin())
  return (
    <>
      {experiences && <FeaturedPanel experiences={experiences} />}
      <AdminCategories />
    </>
  )
}
