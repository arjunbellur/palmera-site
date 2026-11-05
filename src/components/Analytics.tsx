'use client'
// Loads GA4 on the public site (site stream) and the partner portal
// (dashboard stream), never on /admin. Rendered once from the root layout;
// keyed on the stream so moving between the two surfaces re-initialises
// gtag with the other Measurement ID.
import { usePathname } from 'next/navigation'
import { GoogleAnalytics } from '@next/third-parties/google'
import { gaIdFor } from '@/lib/ga'

export default function Analytics() {
  const pathname = usePathname() || '/'
  const id = gaIdFor(pathname)
  if (!id) return null
  return <GoogleAnalytics key={id} gaId={id} />
}
