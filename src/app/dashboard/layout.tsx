'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { onAuthChange } from '@/lib/auth'
import { ThemeProvider, useTheme } from '@/lib/theme'
import DashboardNav from '@/components/dashboard/DashboardNav'

const NAV_LABELS: Record<string, Record<string, string>> = {
  fr: { overview: 'Aperçu', account: 'Compte', agreement: 'Convention' },
  en: { overview: 'Overview', account: 'Account', agreement: 'Agreement' },
}

const ADMIN_EMAILS = ['palmeraexp@gmail.com']

function DashboardInner({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { theme } = useTheme()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const [isTablet, setIsTablet] = useState(false)
  const [locale, setLocale] = useState('fr')
  const [mobileHeaderH, setMobileHeaderH] = useState(112)
  const mobileHeaderRef = useRef<HTMLDivElement>(null)
  const isLoginPage = pathname === '/dashboard'

  useEffect(() => {
    const checkWidth = () => {
      const w = window.innerWidth
      setIsMobile(w < 768)
      setIsTablet(w >= 768 && w < 1024)
    }
    checkWidth()
    window.addEventListener('resize', checkWidth)
    const match = document.cookie.match(/locale=([^;]+)/)
    setLocale(match ? match[1] : 'fr')
    return () => window.removeEventListener('resize', checkWidth)
  }, [])

  // Measure the fixed mobile header so page content clears it exactly, instead
  // of relying on a hardcoded top padding that hides the top of the content.
  useEffect(() => {
    if (!isMobile) return
    const measure = () => { if (mobileHeaderRef.current) setMobileHeaderH(mobileHeaderRef.current.offsetHeight) }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [isMobile, email, locale, pathname])

  useEffect(() => {
    if (isLoginPage) { setLoading(false); return }
    const unsub = onAuthChange(async (user) => {
      if (!user) { router.replace('/dashboard'); return }
      const userEmail = user.email || ''
      setEmail(userEmail)
      if (ADMIN_EMAILS.includes(userEmail)) {
        if (!pathname.startsWith('/dashboard/admin')) router.replace('/dashboard/admin')
        setLoading(false)
        return
      }
      setLoading(false)
    })
    return () => unsub()
  }, [router, isLoginPage, pathname])

  const labels = NAV_LABELS[locale] || NAV_LABELS.fr
  const isAdmin = ADMIN_EMAILS.includes(email)

  const NAV_ITEMS = isAdmin
    ? [{ href: '/dashboard/admin', label: 'Admin', short: 'Admin' }]
    : [
        { href: '/dashboard/home', label: labels.overview, short: labels.overview },
        { href: '/dashboard/account', label: labels.account, short: labels.account },
        { href: '/dashboard/settings', label: labels.agreement, short: labels.agreement },
      ]

  // Company-scoped completeness now lives inside each company page, so the
  // provider-level sidebar carries no per-item status dots.
  const getStatus = (_href: string) => 'none'

  const dotColor = (status: string) => {
    if (status === 'complete') return '#9e763b'
    if (status === 'in_progress') return '#be9a56'
    if (status === 'none') return 'transparent'
    return 'var(--db-text-faint)'
  }

  if (isLoginPage) return <>{children}</>

  if (loading) return (
    <div data-theme={theme} style={{ minHeight: '100vh', background: 'var(--db-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '2rem', height: '2rem', border: '2px solid rgba(190,154,86,0.15)', borderTopColor: '#be9a56', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (isMobile) {
    return (
      <div data-theme={theme} style={{ minHeight: '100vh', background: 'var(--db-bg)' }}>
        <div ref={mobileHeaderRef} style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: 'var(--db-bg-nav)', borderBottom: '1px solid var(--db-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem 1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <img src="/images/PALMERA_cracked.png" alt="Palmera" width={28} height={28} style={{ objectFit: 'contain' }} />
              <span style={{ fontFamily: 'var(--font-display)', color: 'var(--db-text)', fontSize: '1rem', letterSpacing: '0.1em' }}>PALMERA</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button onClick={async () => { const { logOut } = await import('@/lib/auth'); await logOut(); router.push('/dashboard') }}
                style={{ background: 'transparent', border: '1px solid var(--db-border)', color: 'var(--db-text)', padding: '0.375rem 0.875rem', borderRadius: '0.25rem', fontSize: '0.75rem', fontFamily: 'var(--font-sans)', cursor: 'pointer' }}>
                {locale === 'fr' ? 'Déconnexion' : 'Log out'}
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', overflowX: 'auto', borderTop: '1px solid var(--db-border-subtle)', scrollbarWidth: 'none' }}>
            {NAV_ITEMS.map(item => {
              const active = pathname === item.href
              const status = getStatus(item.href)
              return (
                <a key={item.href} href={item.href} style={{ flexShrink: 0, padding: '0.75rem 0.875rem', textDecoration: 'none', textAlign: 'center', borderBottom: active ? '2px solid #be9a56' : '2px solid transparent', background: active ? 'var(--db-bg-card-active)' : 'transparent', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                  <div style={{ width: '0.375rem', height: '0.375rem', borderRadius: '50%', background: dotColor(status) }} />
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', color: active ? '#be9a56' : 'var(--db-text-muted)', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{item.short}</span>
                </a>
              )
            })}
          </div>
        </div>
        <main style={{ padding: `calc(${mobileHeaderH}px + 1.25rem) 1.125rem 2.5rem` }}>{children}</main>
      </div>
    )
  }

  return (
    <div data-theme={theme} style={{ minHeight: '100vh', background: 'var(--db-bg)' }}>
      <DashboardNav email={email} locale={locale} />
      <div style={{ display: 'flex', paddingTop: '4rem', minHeight: '100vh' }}>
        <aside style={{ width: isTablet ? '11.5rem' : '13.75rem', flexShrink: 0, borderRight: '1px solid var(--db-border)', padding: '2rem 0', position: 'sticky', top: '4rem', height: 'calc(100vh - 4rem)', overflowY: 'auto', background: 'var(--db-bg)' }}>
          {NAV_ITEMS.map(item => {
            const active = pathname === item.href
            const status = getStatus(item.href)
            return (
              <a key={item.href} href={item.href}
                style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.75rem 1.5rem', textDecoration: 'none', background: active ? 'var(--db-bg-card-active)' : 'transparent', borderLeft: active ? '2px solid #be9a56' : '2px solid transparent', transition: 'background 0.15s' }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLAnchorElement).style.background = 'var(--db-bg-card)' }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLAnchorElement).style.background = 'transparent' }}>
                <div style={{ width: '0.4375rem', height: '0.4375rem', borderRadius: '50%', background: dotColor(status), flexShrink: 0, border: status === 'incomplete' ? '1px solid var(--db-text-faint)' : 'none' }} />
                <span style={{ fontSize: '0.8125rem', fontFamily: 'var(--font-sans)', color: active ? '#be9a56' : 'var(--db-text-muted)', letterSpacing: '0.02em', fontWeight: active ? 500 : 400 }}>{item.label}</span>
              </a>
            )
          })}
        </aside>
        <main style={{ flex: 1, minWidth: 0, padding: isTablet ? '1.75rem 1.5rem' : '2.5rem 3rem', maxWidth: '56.25rem' }}>{children}</main>
      </div>
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <DashboardInner>{children}</DashboardInner>
    </ThemeProvider>
  )
}
