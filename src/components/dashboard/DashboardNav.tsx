'use client'
import { useRouter } from 'next/navigation'
import { logOut } from '@/lib/auth'

export default function DashboardNav({ email }: { email?: string }) {
  const router = useRouter()
  const handleLogout = async () => { await logOut(); router.push('/dashboard') }

  return (
    <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '4rem', background: '#0a0a08', borderBottom: '1px solid rgba(190,154,86,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2rem', zIndex: 100 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <img src="/images/PALMERA_cracked.png" alt="Palmera" width={32} height={32} style={{ objectFit: 'contain' }} />
        <span style={{ fontFamily: 'var(--font-display)', color: '#dfc9a6', fontSize: '1.125rem', letterSpacing: '0.1em' }}>PALMERA</span>
        <span style={{ color: 'rgba(190,154,86,0.5)', fontSize: '0.8125rem', marginLeft: '0.25rem', fontFamily: 'var(--font-sans)', letterSpacing: '0.04em' }}>Partner Portal</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        {email && <span style={{ color: 'rgba(223,201,166,0.7)', fontSize: '0.8125rem', fontFamily: 'var(--font-sans)' }}>{email}</span>}
        <button onClick={handleLogout}
          style={{ background: 'transparent', border: '1px solid rgba(190,154,86,0.35)', color: '#dfc9a6', padding: '0.4375rem 1.125rem', borderRadius: '0.25rem', fontSize: '0.8125rem', fontFamily: 'var(--font-sans)', cursor: 'pointer', letterSpacing: '0.05em', transition: 'all 0.2s' }}
          onMouseEnter={e => { (e.target as HTMLButtonElement).style.borderColor = '#be9a56'; (e.target as HTMLButtonElement).style.color = '#be9a56' }}
          onMouseLeave={e => { (e.target as HTMLButtonElement).style.borderColor = 'rgba(190,154,86,0.35)'; (e.target as HTMLButtonElement).style.color = '#dfc9a6' }}>
          Log out
        </button>
      </div>
    </nav>
  )
}
