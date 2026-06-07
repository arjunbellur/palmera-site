
'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { signIn, signUp, onAuthChange } from '@/lib/auth'
import { getPartner, createPartner } from '@/lib/firestore'

export default function DashboardPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const unsub = onAuthChange(async (user) => {
      if (user) {
        router.replace('/dashboard/home')
      } else {
        setChecking(false)
      }
    })
    return () => unsub()
  }, [router])

  const handleSubmit = async () => {
    setError('')
    if (!email || !password) { setError('Please fill in all fields.'); return }
    if (mode === 'signup' && password !== confirm) { setError('Passwords do not match.'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }

    setLoading(true)
    try {
      if (mode === 'signup') {
        const cred = await signUp(email, password)
        await createPartner(cred.user.uid, email)
      } else {
        await signIn(email, password)
      }
      router.replace('/dashboard/home')
    } catch (e: unknown) {
      const msg = (e as { code?: string })?.code
      if (msg === 'auth/user-not-found' || msg === 'auth/wrong-password' || msg === 'auth/invalid-credential') {
        setError('Incorrect email or password.')
      } else if (msg === 'auth/email-already-in-use') {
        setError('An account with this email already exists.')
      } else {
        setError('Something went wrong. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(223,201,166,0.15)',
    borderRadius: '6px',
    padding: '12px 16px',
    color: 'var(--color-tan)',
    fontSize: '15px',
    fontFamily: 'var(--font-sans)',
    outline: 'none',
    boxSizing: 'border-box' as const,
    marginBottom: '12px',
  }

  if (checking) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'var(--bg-body)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{ width: '32px', height: '32px', border: '2px solid rgba(223,201,166,0.1)', borderTopColor: 'var(--accent-4)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-body)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <Image src="/images/Footer-Logo-1.svg" alt="Palmera" width={48} height={48} style={{ marginBottom: '12px', opacity: 0.9 }} />
          <h1 style={{
            fontFamily: 'var(--font-display)',
            color: 'var(--color-tan)',
            fontSize: '22px',
            fontWeight: 400,
            letterSpacing: '0.12em',
            margin: '0 0 6px',
          }}>
            PALMERA
          </h1>
          <p style={{
            fontFamily: 'var(--font-serif)',
            color: 'rgba(223,201,166,0.4)',
            fontSize: '14px',
            margin: 0,
            letterSpacing: '0.04em',
          }}>
            Partner Portal
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(223,201,166,0.1)',
          borderRadius: '12px',
          padding: '36px 32px',
        }}>
          <h2 style={{
            fontFamily: 'var(--font-serif)',
            color: 'var(--color-tan)',
            fontSize: '18px',
            fontWeight: 400,
            margin: '0 0 24px',
            letterSpacing: '0.02em',
          }}>
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </h2>

          <input
            style={inputStyle}
            type="email"
            placeholder="Email address"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          />
          <input
            style={inputStyle}
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          />
          {mode === 'signup' && (
            <input
              style={inputStyle}
              type="password"
              placeholder="Confirm password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
          )}

          {error && (
            <p style={{
              fontSize: '13px',
              color: '#e07070',
              fontFamily: 'var(--font-sans)',
              margin: '-4px 0 12px',
            }}>
              {error}
            </p>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              width: '100%',
              padding: '13px',
              background: 'var(--accent-3)',
              border: 'none',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '14px',
              fontFamily: 'var(--font-sans)',
              letterSpacing: '0.08em',
              cursor: loading ? 'wait' : 'pointer',
              marginBottom: '20px',
              opacity: loading ? 0.7 : 1,
              transition: 'opacity 0.2s',
            }}
          >
            {loading ? 'Please wait...' : mode === 'login' ? 'Log in' : 'Create account'}
          </button>

          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '13px', color: 'rgba(223,201,166,0.4)', fontFamily: 'var(--font-sans)' }}>
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            </span>
            <button
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError('') }}
              style={{
                background: 'none', border: 'none',
                color: 'var(--accent-4)',
                fontSize: '13px',
                fontFamily: 'var(--font-sans)',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              {mode === 'login' ? 'Sign up' : 'Log in'}
            </button>
          </div>
        </div>

        <p style={{
          textAlign: 'center',
          marginTop: '20px',
          fontSize: '12px',
          color: 'rgba(223,201,166,0.2)',
          fontFamily: 'var(--font-sans)',
        }}>
          For experience providers only. Applying to list on Palmera?{' '}
          <a href="/partners" style={{ color: 'rgba(223,201,166,0.35)', textDecoration: 'underline' }}>
            Apply here
          </a>
        </p>
      </div>
    </div>
  )
}
