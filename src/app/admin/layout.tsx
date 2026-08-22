'use client'
// The admin surface's own slim shell — pf design language, separate from both
// the partner dashboard and the onboarding portal. Internal tool: English
// only, no locale switcher, no company pill.
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { onAuthChange } from '@/lib/auth'
import { ThemeProvider, useTheme } from '@/lib/theme'
import { isAdminEmail } from '@/lib/admin'
import { Chip, IconButton, Spinner } from '@/components/partner/ui'
import { AdminContext } from './AdminContext'
import { LayoutDashboard, Smartphone, CircleDollarSign, Building2, Truck, Moon, Sun, LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react'

const NAV = [
  { href: '/admin', icon: LayoutDashboard, label: 'Overview' },
  { href: '/admin/app', icon: Smartphone, label: 'App' },
  { href: '/admin/money', icon: CircleDollarSign, label: 'Money' },
  { href: '/admin/directory', icon: Building2, label: 'Directory' },
  { href: '/admin/suppliers', icon: Truck, label: 'Suppliers' },
] as const

function Shell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { theme, toggle: toggleTheme } = useTheme()
  const [email, setEmail] = useState('')
  const [uid, setUid] = useState('')
  const [loading, setLoading] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  // Collapsed = a 68px icon rail; the whole width goes to the content.
  const [collapsed, setCollapsed] = useState(false)
  useEffect(() => { setCollapsed(localStorage.getItem('palmera.admin.nav') === 'collapsed') }, [])
  const toggleNav = () => setCollapsed((c) => { localStorage.setItem('palmera.admin.nav', c ? 'open' : 'collapsed'); return !c })

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 900)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    const unsub = onAuthChange((user) => {
      if (!user) { router.replace('/dashboard'); return }
      // Non-admins get a real destination, not a silent spinner.
      if (!isAdminEmail(user.email)) { router.replace('/dashboard/home'); return }
      setEmail(user.email || ''); setUid(user.uid)
      setLoading(false)
    })
    return () => unsub()
  }, [router])

  const signOut = async () => {
    const { logOut } = await import('@/lib/auth')
    await logOut()
    router.push('/dashboard')
  }

  if (loading) return (
    <div data-theme={theme} style={{ minHeight: '100vh', background: 'var(--pf-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Spinner />
    </div>
  )

  const Logo = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
      <img loading="lazy" decoding="async" src="/images/PALMERA_cracked.png" alt="" width={24} height={24} style={{ objectFit: 'contain' }} />
      {(!collapsed || isMobile) && <>
        <span style={{ fontFamily: 'var(--font-display)', color: 'var(--pf-head)', fontSize: '14px', letterSpacing: '0.12em' }}>PALMERA</span>
        <Chip tone="gold">Admin</Chip>
      </>}
    </div>
  )

  const ThemeButton = (
    <button onClick={toggleTheme} aria-label="Toggle theme" style={{ width: '30px', height: '30px', borderRadius: '8px', border: '1px solid var(--pf-border)', background: 'transparent', color: 'var(--pf-gold)', cursor: 'pointer', fontSize: '12px' }}>
      {theme === 'dark' ? <Moon size={14} strokeWidth={1.75} /> : <Sun size={14} strokeWidth={1.75} />}
    </button>
  )

  const navLink = (item: typeof NAV[number], mobile = false) => {
    // Company detail pages belong to the Directory's world.
    const active = item.href === '/admin'
      ? pathname === '/admin'
      : pathname.startsWith(item.href) || (item.href === '/admin/directory' && pathname.startsWith('/admin/companies'))
    if (mobile) return (
      // Bottom tab bar (same pattern as the partner shell) — ≥44px targets.
      <a key={item.href} href={item.href} aria-label={item.label} style={{ flex: 1, minHeight: '56px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', textDecoration: 'none', color: active ? 'var(--pf-gold)' : 'var(--pf-faint)', borderTop: `2px solid ${active ? 'var(--pf-gold)' : 'transparent'}` }}>
        <item.icon size={17} strokeWidth={1.75} />
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: '10px', letterSpacing: '0.04em' }}>{item.label}</span>
      </a>
    )
    return (
      <a key={item.href} href={item.href} title={collapsed ? item.label : undefined} style={{
        display: 'flex', alignItems: 'center', gap: collapsed ? 0 : '11px',
        justifyContent: collapsed ? 'center' : 'flex-start',
        padding: collapsed ? '11px 0' : '10px 14px', borderRadius: '10px', textDecoration: 'none',
        background: active ? 'var(--pf-card)' : 'transparent',
        color: active ? 'var(--pf-gold)' : 'var(--pf-faint)',
      }}>
        <span style={{ lineHeight: 0, width: '18px', display: 'grid', placeItems: 'center', flexShrink: 0 }}><item.icon size={15} strokeWidth={1.75} /></span>
        {!collapsed && <span style={{ fontFamily: 'var(--font-sans)', fontSize: '12.5px', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{item.label}</span>}
      </a>
    )
  }

  return (
    <AdminContext.Provider value={{ email, uid }}>
      <div data-theme={theme} style={{ minHeight: '100vh', background: 'var(--pf-bg)', display: 'flex' }}>
        {!isMobile && (
          <aside style={{ width: collapsed ? '68px' : '236px', flexShrink: 0, background: 'var(--pf-nav)', borderRight: '1px solid var(--pf-border)', padding: collapsed ? '22px 10px' : '22px 16px', position: 'sticky', top: 0, height: '100vh', display: 'flex', flexDirection: 'column', gap: '20px', transition: 'width 0.25s cubic-bezier(0.22,1,0.36,1), padding 0.25s ease', overflow: 'hidden' }}>
            <div style={{ padding: collapsed ? 0 : '0 6px', display: 'flex', justifyContent: collapsed ? 'center' : 'flex-start' }}>{Logo}</div>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>{NAV.map(n => navLink(n, false))}</nav>
            <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--pf-border)', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: collapsed ? 'center' : 'stretch' }}>
              {!collapsed && <span style={{ fontFamily: 'var(--font-sans)', fontSize: '10.5px', color: 'var(--pf-faint)', wordBreak: 'break-all' }}>{email}</span>}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexDirection: collapsed ? 'column' : 'row' }}>
                {ThemeButton}
                <button onClick={signOut} title="Sign out" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--pf-faint)', fontFamily: 'var(--font-sans)', fontSize: '11.5px', letterSpacing: '0.04em' }}>
                  <LogOut size={14} strokeWidth={1.75} /> {!collapsed && 'Sign out'}
                </button>
              </div>
              {/* Collapse toggle — reclaim the full width for the content. */}
              <button onClick={toggleNav} aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
                style={{ width: collapsed ? '30px' : '100%', height: '30px', borderRadius: '8px', border: '1px solid var(--pf-border)', background: 'transparent', color: 'var(--pf-faint)', cursor: 'pointer', fontSize: '12px' }}>
                {collapsed ? <PanelLeftOpen size={14} strokeWidth={1.75} /> : <PanelLeftClose size={14} strokeWidth={1.75} />}
              </button>
            </div>
          </aside>
        )}

        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {isMobile && (
            <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '14px 18px', borderBottom: '1px solid var(--pf-border)', background: 'var(--pf-nav)', position: 'sticky', top: 0, zIndex: 20 }}>
              {Logo}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {ThemeButton}
                <button onClick={signOut} aria-label="Sign out" title="Sign out" style={{ width: '30px', height: '30px', borderRadius: '8px', border: '1px solid var(--pf-border)', background: 'transparent', color: 'var(--pf-faint)', cursor: 'pointer', fontSize: '13px' }}><LogOut size={14} strokeWidth={1.75} /></button>
              </div>
            </header>
          )}

          <main className="pf-scroll pf-ambient" style={{ flex: 1, padding: isMobile ? '20px 18px 84px' : '30px 38px 52px', maxWidth: '1440px', width: '100%', margin: '0 auto' }}>
            {children}
          </main>
          {isMobile && (
            <nav aria-label="Admin" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, display: 'flex', background: 'var(--pf-nav)', borderTop: '1px solid var(--pf-border)', zIndex: 30 }}>
              {NAV.map(n => navLink(n, true))}
            </nav>
          )}
        </div>
      </div>
    </AdminContext.Provider>
  )
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <ThemeProvider><Shell>{children}</Shell></ThemeProvider>
}
