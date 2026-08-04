'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { onAuthChange } from '@/lib/auth'
import { ThemeProvider, useTheme } from '@/lib/theme'
import { getProvider, getCompanies, subscribeBookingsByCompany } from '@/lib/firestore'
import type { Company, Provider } from '@/lib/schema'
import { PartnerContext } from './PartnerContext'
import { t, type Locale } from './i18n'
import { isAdminEmail } from '@/lib/admin'

const STORE_KEY = 'palmera.partner.companyId'

const NAV = [
  { href: '/partner', icon: '⌂', key: 'nav_home' },
  { href: '/partner/reservations', icon: '▤', key: 'nav_res' },
  { href: '/partner/earnings', icon: '◆', key: 'nav_earn' },
  { href: '/partner/listings', icon: '▦', key: 'nav_list' },
  { href: '/partner/messages', icon: '✉', key: 'nav_msg' },
  { href: '/partner/settings', icon: '◎', key: 'nav_set' },
] as const

function Shell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { theme, toggle: toggleTheme } = useTheme()
  const [uid, setUid] = useState('')
  const [email, setEmail] = useState('')
  const [provider, setProvider] = useState<Provider | null>(null)
  const [companies, setCompanies] = useState<Company[]>([])
  const [companyId, setCompanyIdState] = useState('')
  const [locale, setLocaleState] = useState<Locale>('fr')
  const [loading, setLoading] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  // Collapsed = icon rail; full width for the content. Remembered per device.
  const [collapsed, setCollapsed] = useState(false)
  useEffect(() => { setCollapsed(localStorage.getItem('palmera.partner.nav') === 'collapsed') }, [])
  const toggleNav = () => setCollapsed(c => { localStorage.setItem('palmera.partner.nav', c ? 'open' : 'collapsed'); return !c })

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 900)
    check()
    window.addEventListener('resize', check)
    const m = document.cookie.match(/locale=([^;]+)/)
    if (m && (m[1] === 'fr' || m[1] === 'en')) setLocaleState(m[1])
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    const unsub = onAuthChange(async user => {
      if (!user) { router.replace('/dashboard'); return }
      if (isAdminEmail(user.email)) { router.replace('/admin'); return }
      setUid(user.uid); setEmail(user.email || '')
      const [p, all] = await Promise.all([getProvider(user.uid), getCompanies(user.uid)])
      // GRADUATION GATE (mirror of the /dashboard guard): the dashboard is for
      // partners who have finished onboarding by publishing a listing. Anyone
      // else belongs back in the onboarding portal.
      if (p?.onboardingStage !== 'complete' || all.length === 0) { router.replace('/dashboard/home'); return }
      setProvider(p); setCompanies(all)
      const stored = typeof window !== 'undefined' ? localStorage.getItem(STORE_KEY) : null
      setCompanyIdState(all.some(c => c.id === stored) ? stored! : all[0].id!)
      setLoading(false)
    })
    return () => unsub()
  }, [router])

  const setCompanyId = (id: string) => {
    setCompanyIdState(id)
    localStorage.setItem(STORE_KEY, id)
    setSwitcherOpen(false)
  }

  useEffect(() => {
    if (!uid || !companyId) return
    // Live badge: a new booking from the app lights the tab up immediately.
    const unsub = subscribeBookingsByCompany(uid, companyId, (bs) => setPendingCount(bs.filter((b) => b.status === 'pending').length))
    return () => unsub()
  }, [uid, companyId])

  const refresh = async () => {
    if (!uid) return
    const [p, all] = await Promise.all([getProvider(uid), getCompanies(uid)])
    setProvider(p)
    setCompanies(all)
  }
  const setLocale = (l: Locale) => {
    setLocaleState(l)
    document.cookie = `locale=${l}; path=/; max-age=31536000`
  }

  const signOut = async () => {
    const { logOut } = await import('@/lib/auth')
    await logOut()
    router.push('/dashboard')
  }

  if (loading) return (
    <div data-theme={theme} style={{ minHeight: '100vh', background: 'var(--pf-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '2rem', height: '2rem', border: '2px solid rgba(190,154,86,0.15)', borderTopColor: 'var(--pf-gold)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const company = companies.find(c => c.id === companyId) || companies[0] || null
  const L = (k: string) => t(locale, k)
  const initial = (company?.name || '?').trim().charAt(0).toUpperCase()

  // Always opens the sheet — with one company it's how you ADD another.
  const CompanyPill = (
    <button onClick={() => setSwitcherOpen(true)}
      style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}>
      <span style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'var(--pf-green-soft)', color: 'var(--pf-gold)', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-display)', fontSize: '15px', flexShrink: 0, overflow: 'hidden' }}>
        {company?.logo ? <img loading="lazy" decoding="async" src={company.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initial}
      </span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'block', fontFamily: 'var(--font-serif)', color: 'var(--pf-text)', fontSize: '13.5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{company?.name || 'Company'}</span>
        <span style={{ display: 'block', fontFamily: 'var(--font-sans)', color: 'var(--pf-faint)', fontSize: '10.5px', textTransform: 'capitalize' }}>{company?.city || '—'}</span>
      </span>
      <span style={{ color: 'var(--pf-faint)', fontSize: '11px' }}>⌄</span>
    </button>
  )

  const navLink = (item: typeof NAV[number], mobile: boolean) => {
    const active = pathname === item.href
    const iconOnly = !mobile && collapsed
    return (
      <a key={item.href} href={item.href} title={iconOnly ? L(item.key) : undefined} style={{
        display: 'flex', alignItems: 'center', gap: mobile || iconOnly ? 0 : '11px',
        flexDirection: mobile ? 'column' : 'row',
        justifyContent: mobile || iconOnly ? 'center' : 'flex-start',
        padding: mobile ? '9px 4px 7px' : iconOnly ? '11px 0' : '10px 14px', borderRadius: mobile ? 0 : '10px',
        textDecoration: 'none', flex: mobile ? 1 : undefined,
        background: !mobile && active ? 'var(--pf-card)' : 'transparent',
        color: active ? 'var(--pf-gold)' : 'var(--pf-faint)',
        borderTop: mobile ? `2px solid ${active ? 'var(--pf-gold)' : 'transparent'}` : undefined,
      }}>
        {/* Fixed-width icon slot — the glyphs have different natural widths,
            so without this the labels would still start at ragged x positions. */}
        <span style={{ fontSize: mobile ? '15px' : '13px', lineHeight: 1, position: 'relative', width: mobile ? undefined : '18px', textAlign: mobile ? undefined : 'center', flexShrink: 0 }}>
          {item.icon}
          {/* Attention badge — the partner learns they're needed WITHOUT visiting the tab. */}
          {item.key === 'nav_res' && pendingCount > 0 && (mobile || collapsed) && (
            <span style={{ position: 'absolute', top: '-4px', right: '-8px', minWidth: '14px', height: '14px', borderRadius: '999px', background: 'var(--pf-gold)', color: '#0a0e18', fontSize: '9px', fontFamily: 'var(--font-sans)', display: 'grid', placeItems: 'center', padding: '0 3px', lineHeight: 1 }}>{pendingCount}</span>
          )}
        </span>
        {!iconOnly && <span style={{ fontFamily: 'var(--font-sans)', fontSize: mobile ? '9.5px' : '12.5px', letterSpacing: '0.04em', marginTop: mobile ? '5px' : 0 }}>{L(item.key)}</span>}
        {item.key === 'nav_res' && pendingCount > 0 && !mobile && !collapsed && (
          <span style={{ marginLeft: 'auto', minWidth: '18px', height: '18px', borderRadius: '999px', background: 'var(--pf-gold)', color: '#0a0e18', fontSize: '10px', fontFamily: 'var(--font-sans)', display: 'grid', placeItems: 'center', padding: '0 5px' }}>{pendingCount}</span>
        )}
      </a>
    )
  }

  return (
    <PartnerContext.Provider value={{ uid, email, provider, companies, company, setCompanyId, locale, setLocale, refresh }}>
      <div data-theme={theme} style={{ minHeight: '100vh', background: 'var(--pf-bg)', display: 'flex' }}>
        {!isMobile && (
          <aside style={{ width: collapsed ? '68px' : '236px', flexShrink: 0, background: 'var(--pf-nav)', borderRight: '1px solid var(--pf-border)', padding: collapsed ? '22px 10px' : '22px 16px', position: 'sticky', top: 0, height: '100vh', display: 'flex', flexDirection: 'column', gap: '20px', transition: 'width 0.25s cubic-bezier(0.22,1,0.36,1), padding 0.25s ease', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: collapsed ? 0 : '0 6px', justifyContent: collapsed ? 'center' : 'flex-start' }}>
              <img loading="lazy" decoding="async" src="/images/PALMERA_cracked.png" alt="" width={24} height={24} style={{ objectFit: 'contain' }} />
              {!collapsed && <span style={{ fontFamily: 'var(--font-display)', color: 'var(--pf-head)', fontSize: '14px', letterSpacing: '0.12em' }}>PALMERA</span>}
            </div>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>{NAV.map(n => navLink(n, false))}</nav>
            <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--pf-border)', display: 'flex', flexDirection: 'column', gap: '14px', alignItems: collapsed ? 'center' : 'stretch' }}>
              {!collapsed && CompanyPill}
              <button onClick={signOut} title={L('signout')} style={{ display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start', gap: '9px', background: 'transparent', border: 'none', padding: '2px 0', cursor: 'pointer', color: 'var(--pf-faint)', fontFamily: 'var(--font-sans)', fontSize: '11.5px', letterSpacing: '0.04em' }}>
                <span style={{ fontSize: '13px' }}>⎋</span> {!collapsed && L('signout')}
              </button>
              <button onClick={toggleNav} aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
                style={{ width: collapsed ? '30px' : '100%', height: '30px', borderRadius: '8px', border: '1px solid var(--pf-border)', background: 'transparent', color: 'var(--pf-faint)', cursor: 'pointer', fontSize: '12px' }}>
                {collapsed ? '⟩' : '⟨'}
              </button>
            </div>
          </aside>
        )}

        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: isMobile ? '14px 18px' : '18px 34px', borderBottom: '1px solid var(--pf-border)', background: 'var(--pf-nav)', position: 'sticky', top: 0, zIndex: 20 }}>
            {isMobile ? CompanyPill : <span />}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ display: 'flex', border: '1px solid var(--pf-border)', borderRadius: '8px', overflow: 'hidden' }}>
                {(['fr', 'en'] as const).map(l => (
                  <button key={l} onClick={() => setLocale(l)} style={{ padding: '5px 9px', background: locale === l ? 'var(--pf-card)' : 'transparent', border: 'none', color: locale === l ? 'var(--pf-gold)' : 'var(--pf-faint)', fontFamily: 'var(--font-sans)', fontSize: '10px', letterSpacing: '0.06em', cursor: 'pointer' }}>{l.toUpperCase()}</button>
                ))}
              </div>
              <button onClick={toggleTheme} aria-label="Toggle theme" style={{ width: '30px', height: '30px', borderRadius: '8px', border: '1px solid var(--pf-border)', background: 'transparent', color: 'var(--pf-gold)', cursor: 'pointer', fontSize: '12px' }}>
                {theme === 'dark' ? '☾' : '☀'}
              </button>
              {isMobile && (
                <button onClick={signOut} aria-label={L('signout')} title={L('signout')} style={{ width: '30px', height: '30px', borderRadius: '8px', border: '1px solid var(--pf-border)', background: 'transparent', color: 'var(--pf-faint)', cursor: 'pointer', fontSize: '13px' }}>
                  ⎋
                </button>
              )}
            </div>
          </header>

          <main className="pf-scroll" style={{ flex: 1, padding: isMobile ? '20px 18px 84px' : '30px 38px 52px', maxWidth: '1280px', width: '100%', margin: '0 auto' }}>
            {children}
          </main>

          {isMobile && (
            <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, display: 'flex', background: 'var(--pf-nav)', borderTop: '1px solid var(--pf-border)', zIndex: 30 }}>
              {NAV.map(n => navLink(n, true))}
            </nav>
          )}
        </div>

        {switcherOpen && (
          <div onClick={() => setSwitcherOpen(false)} style={{ position: 'fixed', inset: 0, background: 'var(--pf-scrim)', zIndex: 60, display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', padding: isMobile ? 0 : '20px' }}>
            <div onClick={e => e.stopPropagation()} style={{ background: 'var(--pf-sheet)', border: '1px solid var(--pf-border)', borderRadius: isMobile ? '18px 18px 0 0' : '18px', padding: '20px', width: '100%', maxWidth: isMobile ? undefined : '380px' }}>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--pf-faint)', marginBottom: '14px' }}>{L('switch_company')}</div>
              {companies.map(c => (
                <button key={c.id} onClick={() => setCompanyId(c.id!)} style={{ display: 'flex', alignItems: 'center', gap: '11px', width: '100%', padding: '11px 10px', borderRadius: '12px', background: c.id === companyId ? 'var(--pf-card)' : 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                  <span style={{ width: '32px', height: '32px', borderRadius: '9px', background: 'var(--pf-green-soft)', color: 'var(--pf-gold)', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-display)', fontSize: '14px' }}>{(c.name || '?').charAt(0).toUpperCase()}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontFamily: 'var(--font-serif)', color: 'var(--pf-text)', fontSize: '13.5px' }}>{c.name || 'Untitled'}</span>
                    <span style={{ display: 'block', fontFamily: 'var(--font-sans)', color: 'var(--pf-faint)', fontSize: '10.5px', textTransform: 'capitalize' }}>{c.city || '—'}</span>
                  </span>
                  {c.id === companyId && <span style={{ color: 'var(--pf-gold)' }}>✓</span>}
                </button>
              ))}
              {/* New companies are set up in the onboarding flow — that route
                  stays reachable for graduated partners (guard exempts it). */}
              <a href="/dashboard/companies/new" style={{ display: 'flex', alignItems: 'center', gap: '11px', padding: '11px 10px', marginTop: '4px', borderTop: '1px solid var(--pf-border)', textDecoration: 'none' }}>
                <span style={{ width: '32px', height: '32px', borderRadius: '9px', border: '1px dashed var(--pf-border-strong)', color: 'var(--pf-gold)', display: 'grid', placeItems: 'center', fontSize: '15px' }}>+</span>
                <span style={{ fontFamily: 'var(--font-sans)', color: 'var(--pf-gold)', fontSize: '12.5px', letterSpacing: '0.03em' }}>{L('add_company')}</span>
              </a>
            </div>
          </div>
        )}
      </div>
    </PartnerContext.Provider>
  )
}

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  return <ThemeProvider><Shell>{children}</Shell></ThemeProvider>
}
