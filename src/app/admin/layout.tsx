'use client'
// The admin surface's own slim shell — pf design language, separate from both
// the partner dashboard and the onboarding portal. Internal tool: English
// only, no locale switcher, no company pill.
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { onAuthChange } from '@/lib/auth'
import { ThemeProvider, useTheme } from '@/lib/theme'
import { isAdminEmail } from '@/lib/admin'
import { Chip } from '@/components/partner/ui'
import { AdminContext } from './AdminContext'

const NAV = [
  { href: '/admin', icon: '▤', label: 'Directory' },
] as const

function Shell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { theme, toggle: toggleTheme } = useTheme()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [isMobile, setIsMobile] = useState(false)

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
      setEmail(user.email || '')
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
      <div style={{ width: '2rem', height: '2rem', border: '2px solid rgba(190,154,86,0.15)', borderTopColor: 'var(--pf-gold)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const Logo = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
      <img src="/images/PALMERA_cracked.png" alt="" width={24} height={24} style={{ objectFit: 'contain' }} />
      <span style={{ fontFamily: 'var(--font-display)', color: 'var(--pf-head)', fontSize: '14px', letterSpacing: '0.12em' }}>PALMERA</span>
      <Chip tone="gold">Admin</Chip>
    </div>
  )

  const ThemeButton = (
    <button onClick={toggleTheme} aria-label="Toggle theme" style={{ width: '30px', height: '30px', borderRadius: '8px', border: '1px solid var(--pf-border)', background: 'transparent', color: 'var(--pf-gold)', cursor: 'pointer', fontSize: '12px' }}>
      {theme === 'dark' ? '☾' : '☀'}
    </button>
  )

  const navLink = (item: typeof NAV[number]) => {
    const active = item.href === '/admin'
      ? (pathname === '/admin' || pathname.startsWith('/admin/companies'))
      : pathname.startsWith(item.href)
    return (
      <a key={item.href} href={item.href} style={{
        display: 'flex', alignItems: 'center', gap: '11px', justifyContent: 'flex-start',
        padding: '10px 14px', borderRadius: '10px', textDecoration: 'none',
        background: active ? 'var(--pf-card)' : 'transparent',
        color: active ? 'var(--pf-gold)' : 'var(--pf-faint)',
      }}>
        <span style={{ fontSize: '13px', lineHeight: 1, width: '18px', textAlign: 'center', flexShrink: 0 }}>{item.icon}</span>
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: '12.5px', letterSpacing: '0.04em' }}>{item.label}</span>
      </a>
    )
  }

  return (
    <AdminContext.Provider value={{ email }}>
      <div data-theme={theme} style={{ minHeight: '100vh', background: 'var(--pf-bg)', display: 'flex' }}>
        {!isMobile && (
          <aside style={{ width: '236px', flexShrink: 0, background: 'var(--pf-nav)', borderRight: '1px solid var(--pf-border)', padding: '22px 16px', position: 'sticky', top: 0, height: '100vh', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ padding: '0 6px' }}>{Logo}</div>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>{NAV.map(navLink)}</nav>
            <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--pf-border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: '10.5px', color: 'var(--pf-faint)', wordBreak: 'break-all' }}>{email}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {ThemeButton}
                <button onClick={signOut} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--pf-faint)', fontFamily: 'var(--font-sans)', fontSize: '11.5px', letterSpacing: '0.04em' }}>
                  <span style={{ fontSize: '13px' }}>⎋</span> Sign out
                </button>
              </div>
            </div>
          </aside>
        )}

        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {isMobile && (
            <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '14px 18px', borderBottom: '1px solid var(--pf-border)', background: 'var(--pf-nav)', position: 'sticky', top: 0, zIndex: 20 }}>
              {Logo}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {ThemeButton}
                <button onClick={signOut} aria-label="Sign out" title="Sign out" style={{ width: '30px', height: '30px', borderRadius: '8px', border: '1px solid var(--pf-border)', background: 'transparent', color: 'var(--pf-faint)', cursor: 'pointer', fontSize: '13px' }}>⎋</button>
              </div>
            </header>
          )}

          <main className="pf-scroll" style={{ flex: 1, padding: isMobile ? '20px 18px 40px' : '30px 34px 52px', maxWidth: '1080px', width: '100%' }}>
            {children}
          </main>
        </div>
      </div>
    </AdminContext.Provider>
  )
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <ThemeProvider><Shell>{children}</Shell></ThemeProvider>
}
