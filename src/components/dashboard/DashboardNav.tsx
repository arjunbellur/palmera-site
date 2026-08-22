'use client'
import { useRouter } from 'next/navigation'
import { logOut } from '@/lib/auth'
import { useTheme } from '@/lib/theme'
import LanguageToggle from '@/components/LanguageToggle'

export default function DashboardNav({ email, locale = 'fr' }: { email?: string; locale?: string }) {
  const router = useRouter()
  const { theme, toggle } = useTheme()
  const handleLogout = async () => { await logOut(); router.push('/dashboard') }
  const logoutLabel = locale === 'fr' ? 'Se déconnecter' : 'Log out'
  const portalLabel = locale === 'fr' ? 'Portail Partenaire' : 'Partner Portal'

  return (
    <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '4rem', background: 'var(--db-bg-nav)', borderBottom: '1px solid var(--db-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2rem', zIndex: 100 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <img loading="lazy" decoding="async" src="/images/PALMERA_cracked.png" alt="Palmera" width={32} height={32} style={{ objectFit: 'contain' }} />
        <span style={{ fontFamily: 'var(--font-display)', color: 'var(--db-text)', fontSize: '1.125rem', letterSpacing: '0.1em' }}>PALMERA</span>
        <span style={{ color: 'rgba(190,154,86,0.5)', fontSize: '0.8125rem', marginLeft: '0.25rem', fontFamily: 'var(--font-sans)', letterSpacing: '0.04em' }}>{portalLabel}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {email && <span style={{ color: 'var(--db-text-muted)', fontSize: '0.8125rem', fontFamily: 'var(--font-sans)' }}>{email}</span>}
        <LanguageToggle />
        <button
          onClick={toggle}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          style={{ background: 'transparent', border: '1px solid var(--db-border)', color: 'var(--db-text-faint)', width: '2rem', height: '2rem', borderRadius: '0.25rem', fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', flexShrink: 0 }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--db-gold)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--db-gold)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--db-border)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--db-text-faint)' }}
        >
          {theme === 'dark' ? '☀' : '☽'}
        </button>
        <button onClick={handleLogout}
          style={{ background: 'transparent', border: '1px solid var(--db-border)', color: 'var(--db-text)', padding: '0.4375rem 1.125rem', borderRadius: '0.25rem', fontSize: '0.8125rem', fontFamily: 'var(--font-sans)', cursor: 'pointer', letterSpacing: '0.05em', transition: 'all 0.2s' }}
          onMouseEnter={e => { (e.target as HTMLButtonElement).style.borderColor = 'var(--db-gold)'; (e.target as HTMLButtonElement).style.color = 'var(--db-gold)' }}
          onMouseLeave={e => { (e.target as HTMLButtonElement).style.borderColor = 'var(--db-border)'; (e.target as HTMLButtonElement).style.color = 'var(--db-text)' }}>
          {logoutLabel}
        </button>
      </div>
    </nav>
  )
}
