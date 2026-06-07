'use client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { logOut } from '@/lib/auth'

interface DashboardNavProps {
  email?: string
}

export default function DashboardNav({ email }: DashboardNavProps) {
  const router = useRouter()

  const handleLogout = async () => {
    await logOut()
    router.push('/dashboard')
  }

  return (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '64px',
      background: '#0a0a08',
      borderBottom: '1px solid rgba(190,154,86,0.2)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 32px',
      zIndex: 100,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Image
          src="/images/PALMERA_cracked.png"
          alt="Palmera"
          width={36}
          height={36}
          style={{ objectFit: 'contain' }}
        />
        <span style={{
          fontFamily: 'var(--font-display)',
          color: '#dfc9a6',
          fontSize: '18px',
          letterSpacing: '0.1em',
        }}>
          PALMERA
        </span>
        <span style={{
          color: 'rgba(190,154,86,0.5)',
          fontSize: '13px',
          marginLeft: '4px',
          fontFamily: 'var(--font-sans)',
          letterSpacing: '0.04em',
        }}>
          Partner Portal
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        {email && (
          <span style={{
            color: 'rgba(223,201,166,0.7)',
            fontSize: '13px',
            fontFamily: 'var(--font-sans)',
          }}>
            {email}
          </span>
        )}
        <button
          onClick={handleLogout}
          style={{
            background: 'transparent',
            border: '1px solid rgba(190,154,86,0.4)',
            color: '#dfc9a6',
            padding: '7px 18px',
            borderRadius: '4px',
            fontSize: '13px',
            fontFamily: 'var(--font-sans)',
            cursor: 'pointer',
            letterSpacing: '0.05em',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => {
            (e.target as HTMLButtonElement).style.borderColor = '#be9a56'
            ;(e.target as HTMLButtonElement).style.color = '#be9a56'
          }}
          onMouseLeave={e => {
            (e.target as HTMLButtonElement).style.borderColor = 'rgba(190,154,86,0.4)'
            ;(e.target as HTMLButtonElement).style.color = '#dfc9a6'
          }}
        >
          Log out
        </button>
      </div>
    </nav>
  )
}
