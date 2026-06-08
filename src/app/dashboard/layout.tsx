'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { onAuthChange } from '@/lib/auth'
import { getPartner } from '@/lib/firestore'
import DashboardNav from '@/components/dashboard/DashboardNav'

const NAV_ITEMS = [
  { href: '/dashboard/home', label: 'Overview', short: 'Home' },
  { href: '/dashboard/profile', label: 'Business Profile', short: 'Profile' },
  { href: '/dashboard/listings', label: 'Listings', short: 'Listings' },
  { href: '/dashboard/photos', label: 'Photos', short: 'Photos' },
  { href: '/dashboard/operations', label: 'Operations', short: 'Ops' },
  { href: '/dashboard/documents', label: 'Documents', short: 'Docs' },
  { href: '/dashboard/settings', label: 'Terms & Sign-off', short: 'Terms' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [email, setEmail] = useState('')
  const [sections, setSections] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const isLoginPage = pathname === '/dashboard'

  useEffect(() => {
    const checkWidth = () => setIsMobile(window.innerWidth < 768)
    checkWidth()
    window.addEventListener('resize', checkWidth)
    return () => window.removeEventListener('resize', checkWidth)
  }, [])

  useEffect(() => {
    if (isLoginPage) { setLoading(false); return }
    const unsub = onAuthChange(async (user) => {
      if (!user) { router.replace('/dashboard'); return }
      setEmail(user.email || '')
      const partner = await getPartner(user.uid)
      if (partner?.sections) setSections(partner.sections)
      setLoading(false)
    })
    return () => unsub()
  }, [router, isLoginPage])

  const getStatus = (href: string) => {
    const key = href.split('/').pop() || ''
    const map: Record<string, string> = {
      profile: sections.basics === 'complete' && sections.payouts === 'complete' ? 'complete'
        : (sections.basics || sections.payouts) ? 'in_progress' : 'incomplete',
      listings: sections.listings || 'incomplete',
      photos: sections.photos || 'incomplete',
      operations: sections.operations || 'incomplete',
      documents: sections.documents || 'incomplete',
      settings: sections.signoff || 'incomplete',
      home: 'none',
    }
    return map[key] || 'incomplete'
  }

  const dotColor = (status: string) => {
    if (status === 'complete') return '#9e763b'
    if (status === 'in_progress') return '#be9a56'
    if (status === 'none') return 'transparent'
    return 'rgba(223,201,166,0.3)'
  }

  if (isLoginPage) return <>{children}</>

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#040404', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '2rem', height: '2rem', border: '2px solid rgba(190,154,86,0.15)', borderTopColor: '#be9a56', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  // Mobile: top tab bar
  if (isMobile) {
    return (
      <div style={{ minHeight: '100vh', background: '#040404' }}>
        {/* Mobile header */}
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: '#0a0a08', borderBottom: '1px solid rgba(190,154,86,0.15)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem 1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <img src="/images/PALMERA_cracked.png" alt="Palmera" width={28} height={28} style={{ objectFit: 'contain' }} />
              <span style={{ fontFamily: 'var(--font-display)', color: '#dfc9a6', fontSize: '1rem', letterSpacing: '0.1em' }}>PALMERA</span>
            </div>
            <button onClick={async () => { const { logOut } = await import('@/lib/auth'); await logOut(); router.push('/dashboard') }}
              style={{ background: 'transparent', border: '1px solid rgba(190,154,86,0.3)', color: '#dfc9a6', padding: '0.375rem 0.875rem', borderRadius: '0.25rem', fontSize: '0.75rem', fontFamily: 'var(--font-sans)', cursor: 'pointer' }}>
              Log out
            </button>
          </div>
          {/* Tab bar */}
          <div style={{ display: 'flex', overflowX: 'auto', borderTop: '1px solid rgba(190,154,86,0.08)', scrollbarWidth: 'none' }}>
            {NAV_ITEMS.map(item => {
              const active = pathname === item.href
              const status = getStatus(item.href)
              return (
                <a key={item.href} href={item.href} style={{
                  flexShrink: 0, padding: '0.75rem 0.875rem',
                  textDecoration: 'none', textAlign: 'center',
                  borderBottom: active ? '2px solid #be9a56' : '2px solid transparent',
                  background: active ? 'rgba(158,118,59,0.08)' : 'transparent',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem',
                }}>
                  <div style={{ width: '0.375rem', height: '0.375rem', borderRadius: '50%', background: dotColor(status) }} />
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', color: active ? '#be9a56' : 'rgba(223,201,166,0.7)', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                    {item.short}
                  </span>
                </a>
              )
            })}
          </div>
        </div>
        <main style={{ paddingTop: '7.5rem', padding: '7.5rem 1.25rem 2rem' }}>
          {children}
        </main>
      </div>
    )
  }

  // Desktop: sidebar
  return (
    <div style={{ minHeight: '100vh', background: '#040404' }}>
      <DashboardNav email={email} />
      <div style={{ display: 'flex', paddingTop: '4rem', minHeight: '100vh' }}>
        <aside style={{ width: '13.75rem', flexShrink: 0, borderRight: '1px solid rgba(190,154,86,0.1)', padding: '2rem 0', position: 'sticky', top: '4rem', height: 'calc(100vh - 4rem)', overflowY: 'auto', background: '#040404' }}>
          {NAV_ITEMS.map(item => {
            const active = pathname === item.href
            const status = getStatus(item.href)
            return (
              <a key={item.href} href={item.href}
                style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.75rem 1.5rem', textDecoration: 'none', background: active ? 'rgba(158,118,59,0.1)' : 'transparent', borderLeft: active ? '2px solid #be9a56' : '2px solid transparent', transition: 'background 0.15s' }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.04)' }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLAnchorElement).style.background = 'transparent' }}>
                <div style={{ width: '0.4375rem', height: '0.4375rem', borderRadius: '50%', background: dotColor(status), flexShrink: 0, border: status === 'incomplete' ? '1px solid rgba(223,201,166,0.35)' : 'none' }} />
                <span style={{ fontSize: '0.8125rem', fontFamily: 'var(--font-sans)', color: active ? '#be9a56' : 'rgba(223,201,166,0.8)', letterSpacing: '0.02em', fontWeight: active ? 500 : 400 }}>
                  {item.label}
                </span>
              </a>
            )
          })}
        </aside>
        <main style={{ flex: 1, padding: '2.5rem 3rem', maxWidth: '56.25rem' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
