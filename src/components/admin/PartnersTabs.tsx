'use client'
// Partners = businesses (the directory) and suppliers (marketplace) under
// one nav tab; this strip sits at the top of both pages.
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/admin/directory', label: 'Businesses', match: (p: string) => p.startsWith('/admin/directory') || p.startsWith('/admin/companies') },
  { href: '/admin/suppliers', label: 'Suppliers', match: (p: string) => p.startsWith('/admin/suppliers') },
]

export default function PartnersTabs() {
  const pathname = usePathname()
  return (
    <div style={{ display: 'flex', gap: '6px', marginBottom: '18px' }}>
      {TABS.map((t) => {
        const active = t.match(pathname)
        return (
          <Link key={t.href} href={t.href} className="pf-cap" style={{
            padding: '7px 16px', textDecoration: 'none', fontFamily: 'var(--font-sans)', fontSize: '12px', letterSpacing: '0.04em',
            border: `1px solid ${active ? 'rgba(233,188,79,0.35)' : 'var(--pf-border)'}`,
            background: active ? 'linear-gradient(165deg, rgba(233,188,79,0.22), rgba(190,154,86,0.10))' : 'transparent',
            color: active ? 'var(--pf-gold)' : 'var(--pf-faint)',
          }}>{t.label}</Link>
        )
      })}
    </div>
  )
}
