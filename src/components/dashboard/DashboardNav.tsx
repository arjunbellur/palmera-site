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
      background: 'var(--bg-body)',
      borderBottom: '1px solid rgba(223,201,166,0.12)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 32px',
      zIndex: 100,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Image
          src="/images/Footer-Logo-1.svg"
          alt="Palmera"
          width={32}
          height={32}
          style={{ opacity: 0.9 }}
        />
        <span style={{
          fontFamily: 'var(--font-display)',
          color: 'var(--color-tan)',
          fontSize: '18px',
          letterSpacing: '0.08em',
        }}>
          PALMERA
        </span>
        <span style={{
          color: 'rgba(223,201,166,0.3)',
          fontSize: '14px',
          marginLeft: '4px',
        }}>
          Partner Portal
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        {email && (
          <span style={{
            color: 'rgba(223,201,166,0.5)',
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
            border: '1px solid rgba(223,201,166,0.2)',
            color: 'var(--color-tan)',
            padding: '6px 16px',
            borderRadius: '4px',
            fontSize: '13px',
            fontFamily: 'var(--font-sans)',
            cursor: 'pointer',
            letterSpacing: '0.04em',
            transition: 'border-color 0.2s, color 0.2s',
          }}
          onMouseEnter={e => {
            (e.target as HTMLButtonElement).style.borderColor = 'var(--accent-4)'
            ;(e.target as HTMLButtonElement).style.color = 'var(--accent-4)'
          }}
          onMouseLeave={e => {
            (e.target as HTMLButtonElement).style.borderColor = 'rgba(223,201,166,0.2)'
            ;(e.target as HTMLButtonElement).style.color = 'var(--color-tan)'
          }}
        >
          Log out
        </button>
      </div>
    </nav>
  )
}
