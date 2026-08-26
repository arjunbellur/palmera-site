'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { onAuthChange, needsEmailVerification } from '@/lib/auth'
import VerifyEmailGate from '@/components/dashboard/VerifyEmailGate'
import { Chip, IconButton, Spinner } from '@/components/partner/ui'
import { House, UserRound, FileSignature, Moon, Sun, LogOut } from 'lucide-react'
import { isAdminEmail } from '@/lib/admin'
import { ThemeProvider, useTheme } from '@/lib/theme'

const NAV_LABELS: Record<string, Record<string, string>> = {
  fr: { overview: 'Aperçu', account: 'Compte', agreement: 'Convention' },
  en: { overview: 'Overview', account: 'Account', agreement: 'Agreement' },
}


function DashboardInner({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { theme, toggle: toggleTheme } = useTheme()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [unverified, setUnverified] = useState(false)
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
    // A graduated partner never sees this surface — the hint (set by the
    // /partner shell) short-circuits before any onboarding chrome paints.
    if (typeof window !== 'undefined' && localStorage.getItem('palmera.role') === 'partner') {
      router.replace('/partner')
      return
    }
    if (isLoginPage) { setLoading(false); return }
    const unsub = onAuthChange(async (user) => {
      if (!user) { router.replace('/dashboard'); return }
      const userEmail = user.email || ''
      setEmail(userEmail)
      // Email verification gate — accounts created after the cutoff must
      // confirm their address before they see anything.
      if (needsEmailVerification(user)) { setUnverified(true); setLoading(false); return }
      setUnverified(false)
      // Admins live on their own /admin surface now; the old /dashboard/admin
      // pages are redirect stubs that land there too.
      if (isAdminEmail(userEmail)) { router.replace('/admin' + window.location.search); return }
      // GRADUATION (hard cutover): a partner who has published a listing has
      // finished onboarding — their home is /partner now. Recorded on the
      // provider, so unpublishing later can't drop them back into onboarding.
      //
      // BOTH conditions must hold or the mirror guards ping-pong: /partner
      // bounces anyone with zero companies back here, so a graduated account
      // whose companies were deleted (admin cleanup — Jordan's white-screen
      // loop) must be allowed to STAY in onboarding and rebuild.
      // Exception: the company page itself, which shows the graduation moment
      // right after publishing before handing off.
      const { getProvider, getCompanies } = await import('@/lib/firestore')
      const [p, companies] = await Promise.all([getProvider(user.uid), getCompanies(user.uid)])
      const onCompanyPage = pathname.startsWith('/dashboard/companies/')
      if (p?.onboardingStage === 'complete' && companies.length > 0 && !onCompanyPage) { router.replace('/partner'); return }
      setLoading(false)
    })
    return () => unsub()
  }, [router, isLoginPage, pathname])

  const labels = NAV_LABELS[locale] || NAV_LABELS.fr

  const NAV_ITEMS = [
    { href: '/dashboard/home', label: labels.overview, icon: House },
    { href: '/dashboard/account', label: labels.account, icon: UserRound },
    { href: '/dashboard/settings', label: labels.agreement, icon: FileSignature },
  ]
  const signOut = async () => { const { logOut } = await import('@/lib/auth'); await logOut(); router.push('/dashboard') }


  if (isLoginPage) return <>{children}</>

  if (unverified) return <div data-theme={theme}><VerifyEmailGate email={email} onVerified={() => window.location.reload()} /></div>

  if (loading) return (
    <div data-theme={theme} style={{ minHeight: '100vh', background: 'var(--pf-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spinner /></div>
  )

  const navLink = (item: typeof NAV_ITEMS[number], mobile: boolean) => {
    const active = pathname === item.href
    if (mobile) return (
      <a key={item.href} href={item.href} aria-label={item.label} style={{ flex: 1, minHeight: '56px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', textDecoration: 'none', color: active ? 'var(--pf-gold)' : 'var(--pf-faint)', borderTop: `2px solid ${active ? 'var(--pf-gold)' : 'transparent'}` }}>
        <item.icon size={17} strokeWidth={1.75} />
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: '10px', letterSpacing: '0.04em' }}>{item.label}</span>
      </a>
    )
    return (
      <a key={item.href} href={item.href} style={{ display: 'flex', alignItems: 'center', gap: '11px', padding: '10px 14px', borderRadius: '10px', textDecoration: 'none', background: active ? 'var(--pf-card)' : 'transparent', color: active ? 'var(--pf-gold)' : 'var(--pf-faint)' }}>
        <span style={{ lineHeight: 0, width: '18px', display: 'grid', placeItems: 'center', flexShrink: 0 }}><item.icon size={15} strokeWidth={1.75} /></span>
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: '12.5px', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{item.label}</span>
      </a>
    )
  }
  const Brand = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
      <img loading="lazy" decoding="async" src="/images/PALMERA_cracked.png" alt="" width={24} height={24} style={{ objectFit: 'contain' }} />
      <span style={{ fontFamily: 'var(--font-display)', color: 'var(--pf-head)', fontSize: '14px', letterSpacing: '0.12em' }}>PALMERA</span>
      <Chip tone="gold">{locale === 'fr' ? 'Bienvenue' : 'Onboarding'}</Chip>
    </div>
  )
  const Controls = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <IconButton onClick={toggleTheme} label="Toggle theme" tone="gold">{theme === 'dark' ? <Moon size={15} strokeWidth={1.75} /> : <Sun size={15} strokeWidth={1.75} />}</IconButton>
      <IconButton onClick={signOut} label={locale === 'fr' ? 'Déconnexion' : 'Sign out'}><LogOut size={15} strokeWidth={1.75} /></IconButton>
    </div>
  )

  if (isMobile) return (
    <div data-theme={theme} style={{ minHeight: '100vh', background: 'var(--pf-bg)', display: 'flex', flexDirection: 'column' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '12px 18px', borderBottom: '1px solid var(--pf-border)', background: 'var(--pf-nav)', position: 'sticky', top: 0, zIndex: 20 }}>
        {Brand}{Controls}
      </header>
      <main className="pf-scroll pf-ambient" style={{ flex: 1, padding: '20px 18px 84px' }}>{children}</main>
      <nav aria-label="Onboarding" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, display: 'flex', background: 'var(--pf-nav)', borderTop: '1px solid var(--pf-border)', zIndex: 30 }}>
        {NAV_ITEMS.map(n => navLink(n, true))}
      </nav>
    </div>
  )

  return (
    <div data-theme={theme} style={{ minHeight: '100vh', background: 'var(--pf-bg)', display: 'flex' }}>
      <aside style={{ width: '236px', flexShrink: 0, background: 'var(--pf-nav)', borderRight: '1px solid var(--pf-border)', padding: '22px 16px', position: 'sticky', top: 0, height: '100vh', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ padding: '0 6px' }}>{Brand}</div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>{NAV_ITEMS.map(n => navLink(n, false))}</nav>
        <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--pf-border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: '10.5px', color: 'var(--pf-faint)', wordBreak: 'break-all' }}>{email}</span>
          {Controls}
        </div>
      </aside>
      <main className="pf-scroll pf-ambient" style={{ flex: 1, minWidth: 0, padding: '34px 40px 52px', maxWidth: '62rem' }}>{children}</main>
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
