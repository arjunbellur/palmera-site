'use client'
// Loads GA4 on the public site and the partner portal, never on /admin.
// Rendered once from the root layout; the gtag loader is deferred so it
// never competes with the preloader or the fonts.
import { usePathname } from 'next/navigation'
import { GoogleAnalytics } from '@next/third-parties/google'
import { GA_ID, gaAllowedOn } from '@/lib/ga'

export default function Analytics() {
  const pathname = usePathname() || '/'
  if (!gaAllowedOn(pathname)) return null
  return <GoogleAnalytics gaId={GA_ID} />
}
