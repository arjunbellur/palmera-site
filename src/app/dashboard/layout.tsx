'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { onAuthChange } from '@/lib/auth'
import { getPartner } from '@/lib/firestore'
import DashboardNav from '@/components/dashboard/DashboardNav'

const NAV_ITEMS = [
  { href: '/dashboard/home', label: 'Overview', icon: '◈' },
  { href: '/dashboard/profile', label: 'Business Profile', icon: '○' },
  { href: '/dashboard/listings', label: 'Listings', icon: '◇' },
  { href: '/dashboard/photos', label: 'Photos', icon: '□' },
  { href: '/dashboard/operations', label: 'Operations', icon: '△' },
  { href: '/dashboard/documents', label: 'Documents', icon: '◻' },
  { href: '/dashboard/settings', label: 'Terms & Sign-off', icon: '◉' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [email, setEmail] = useState('')
  const [sections, setSections] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthChange(async (user) => {
      if (!user) {
        router.replace('/dashboard')
        return
      }
      setEmail(user.email || '')
      const partner = await getPartner(user.uid)
      if (partner?.sections) setSections(partner.sections)
      setLoading(false)
    })
    return () => unsub()
  }, [router])

  const getStatusDot = (href: string) => {
    const key = href.split('/').pop() || ''
    const map: Record<string, string> = {
      profile: sections.basics === 'complete' && sections.payouts === 'complete' ? 'complete'
        : sections.basics === 'in_progress' || sections.payouts === 'in_progress' ? 'in_progress' : 'incomplete',
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
    return 'rgba(223,201,166,0.2)'
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-body)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '32px', height: '32px', border: '2px solid rgba(223,201,166,0.1)', borderTopColor: 'var(--accent-4)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-body)' }}>
      <DashboardNav email={email} />

      <div style={{ display: 'flex', paddingTop: '64px', minHeight: '100vh' }}>
        {/* Sidebar */}
        <aside style={{
          width: '220px',
          flexShrink: 0,
          borderRight: '1px solid rgba(223,201,166,0.08)',
          padding: '32px 0',
          position: 'sticky',
          top: '64px',
          height: 'calc(100vh - 64px)',
          overflowY: 'auto',
        }}>
          {NAV_ITEMS.map(item => {
            const active = pathname === item.href
            const status = getStatusDot(item.href)
            return (
              <a
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '11px 24px',
                  textDecoration: 'none',
                  background: active ? 'rgba(158,118,59,0.1)' : 'transparent',
                  borderLeft: active ? '2px solid var(--accent-3)' : '2px solid transparent',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.03)' }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLAnchorElement).style.background = 'transparent' }}
              >
                <div style={{
                  width: '7px', height: '7px', borderRadius: '50%',
                  background: dotColor(status),
                  flexShrink: 0,
                  border: status === 'incomplete' ? '1px solid rgba(223,201,166,0.2)' : 'none',
                }} />
                <span style={{
                  fontSize: '13px',
                  fontFamily: 'var(--font-sans)',
                  color: active ? 'var(--accent-4)' : 'rgba(223,201,166,0.55)',
                  letterSpacing: '0.02em',
                  fontWeight: active ? 500 : 400,
                }}>
                  {item.label}
                </span>
              </a>
            )
          })}
        </aside>

        {/* Main content */}
        <main style={{ flex: 1, padding: '40px 48px', maxWidth: '900px' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
