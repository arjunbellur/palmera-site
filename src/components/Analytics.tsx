'use client'
// Loads GA4 on the public site (site stream) and the partner portal
// (dashboard stream), never on /admin, and only after cookie consent. Rendered once from the root layout;
// keyed on the stream so moving between the two surfaces re-initialises
// gtag with the other Measurement ID.
import { usePathname } from 'next/navigation'
import { GoogleAnalytics } from '@next/third-parties/google'
import { gaIdFor } from '@/lib/ga'
import { useConsent } from '@/lib/consent'

export default function Analytics() {
  const pathname = usePathname() || '/'
  const consent = useConsent()
  const id = gaIdFor(pathname)
  // Nothing loads until the visitor accepts in the cookie banner.
  if (!id || consent !== 'granted') return null
  return <GoogleAnalytics key={id} gaId={id} />
}
