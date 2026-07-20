'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { signIn, signUp, onAuthChange } from '@/lib/auth'
import { createProvider } from '@/lib/firestore'
import LanguageToggle from '@/components/LanguageToggle'

// Read locale from cookie client-side
function useLocale() {
  const [locale, setLocale] = useState('fr')
  useEffect(() => {
    const match = document.cookie.match(/locale=([^;]+)/)
    setLocale(match ? match[1] : 'fr')
  }, [])
  return locale
}

const T: Record<string, Record<string, string>> = {
  fr: {
    welcome: 'Bon retour', createAccount: "Créer votre compte", email: 'Adresse e-mail',
    password: 'Mot de passe', confirmPassword: 'Confirmer le mot de passe',
    login: 'Se connecter', signup: 'Créer un compte',
    noAccount: "Pas encore de compte ? ", hasAccount: 'Déjà un compte ? ',
    signupLink: "S'inscrire", loginLink: 'Se connecter',
    providerOnly: "Réservé aux prestataires d'expériences. Vous souhaitez rejoindre Palmera ? ",
    applyHere: 'Postuler ici', pleaseWait: 'Veuillez patienter...',
    fillFields: 'Veuillez remplir tous les champs.',
    passwordMismatch: 'Les mots de passe ne correspondent pas.',
    passwordShort: 'Le mot de passe doit contenir au moins 6 caractères.',
    wrongCredentials: 'Email ou mot de passe incorrect.',
    emailInUse: 'Un compte avec cet email existe déjà.',
    error: "Une erreur s'est produite. Veuillez réessayer.",
    partnerPortal: 'Portail Partenaire',
    backHome: 'Accueil',
  },
  en: {
    welcome: 'Welcome back', createAccount: 'Create your account', email: 'Email address',
    password: 'Password', confirmPassword: 'Confirm password',
    login: 'Log in', signup: 'Create account',
    noAccount: "Don't have an account? ", hasAccount: 'Already have an account? ',
    signupLink: 'Sign up', loginLink: 'Log in',
    providerOnly: 'For experience providers only. Applying to list on Palmera? ',
    applyHere: 'Apply here', pleaseWait: 'Please wait...',
    fillFields: 'Please fill in all fields.',
    passwordMismatch: 'Passwords do not match.',
    passwordShort: 'Password must be at least 6 characters.',
    wrongCredentials: 'Incorrect email or password.',
    emailInUse: 'An account with this email already exists.',
    error: 'Something went wrong. Please try again.',
    partnerPortal: 'Partner Portal',
    backHome: 'Home',
  }
}

export default function DashboardPage() {
  const router = useRouter()
  const locale = useLocale()
  const t = (key: string) => T[locale]?.[key] || T.fr[key]
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const unsub = onAuthChange(async (user) => {
      if (user) router.replace('/dashboard/home')
      else setChecking(false)
    })
    return () => unsub()
  }, [router])

  const handleSubmit = async () => {
    setError('')
    if (!email || !password) { setError(t('fillFields')); return }
    if (mode === 'signup' && password !== confirm) { setError(t('passwordMismatch')); return }
    if (password.length < 6) { setError(t('passwordShort')); return }
    setLoading(true)
    try {
      if (mode === 'signup') { const cred = await signUp(email, password); await createProvider(cred.user.uid, email) }
      else await signIn(email, password)
      router.replace('/dashboard/home')
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') setError(t('wrongCredentials'))
      else if (code === 'auth/email-already-in-use') setError(t('emailInUse'))
      else setError(t('error'))
    } finally { setLoading(false) }
  }

  const inp: React.CSSProperties = { width: '100%', background: 'var(--db-bg-input)', border: '1px solid var(--db-border-gold)', borderRadius: '0.375rem', padding: '0.8125rem 1rem', color: 'var(--db-text)', fontSize: '0.9375rem', fontFamily: 'var(--font-sans)', outline: 'none', boxSizing: 'border-box', marginBottom: '0.75rem' }

  if (checking) return (
    <div style={{ minHeight: '100vh', background: 'var(--db-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '2rem', height: '2rem', border: '2px solid rgba(190,154,86,0.15)', borderTopColor: '#be9a56', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--db-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      {/* Back to home — top left */}
      <a href="/" style={{ position: 'fixed', top: '1.25rem', left: '1.5rem', zIndex: 10, display: 'flex', alignItems: 'center', gap: '0.375rem', textDecoration: 'none', color: 'var(--db-text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', letterSpacing: '0.08em', textTransform: 'uppercase', transition: 'color 0.2s' }}
        onMouseEnter={e => (e.currentTarget.style.color = '#be9a56')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--db-text-muted)')}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M8.75 2.5L4.25 7L8.75 11.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/></svg>
        {t('backHome')}
      </a>

      {/* Language toggle top right */}
      <div style={{ position: 'fixed', top: '1.25rem', right: '1.5rem', zIndex: 10 }}>
        <LanguageToggle />
      </div>

      <div style={{ width: '100%', maxWidth: '26.25rem' }}>
        {/* Logo — centered */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2.5rem' }}>
          <img src="/images/PALMERA_cracked.png" alt="Palmera" width={52} height={52} style={{ objectFit: 'contain', marginBottom: '0.875rem', display: 'block' }} />
          <h1 style={{ fontFamily: 'var(--font-display)', color: 'var(--db-text)', fontSize: '1.5rem', fontWeight: 400, letterSpacing: '0.14em', margin: '0 0 0.375rem', textAlign: 'center' }}>PALMERA</h1>
          <p style={{ fontFamily: 'var(--font-serif)', color: 'rgba(190,154,86,0.8)', fontSize: '0.875rem', margin: 0, letterSpacing: '0.06em', textAlign: 'center' }}>{t('partnerPortal')}</p>
        </div>

        <div style={{ background: 'var(--db-bg-card)', border: '1px solid var(--db-border)', borderRadius: '0.75rem', padding: '2.25rem 2rem' }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', color: 'var(--db-text)', fontSize: '1.25rem', fontWeight: 400, margin: '0 0 1.5rem', letterSpacing: '0.02em' }}>
            {mode === 'login' ? t('welcome') : t('createAccount')}
          </h2>
          <input style={inp} type="email" placeholder={t('email')} value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
          <input style={inp} type="password" placeholder={t('password')} value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
          {mode === 'signup' && <input style={inp} type="password" placeholder={t('confirmPassword')} value={confirm} onChange={e => setConfirm(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()} />}
          {error && <p style={{ fontSize: '0.8125rem', color: '#e07070', fontFamily: 'var(--font-sans)', margin: '-0.25rem 0 0.75rem' }}>{error}</p>}
          <button onClick={handleSubmit} disabled={loading}
            style={{ width: '100%', padding: '0.875rem', background: '#9e763b', border: 'none', borderRadius: '0.375rem', color: '#ebe8db', fontSize: '0.875rem', fontFamily: 'var(--font-sans)', letterSpacing: '0.08em', cursor: loading ? 'wait' : 'pointer', marginBottom: '1.25rem', opacity: loading ? 0.7 : 1, transition: 'background 0.2s' }}
            onMouseEnter={e => { if (!loading) (e.target as HTMLButtonElement).style.background = '#be9a56' }}
            onMouseLeave={e => { if (!loading) (e.target as HTMLButtonElement).style.background = '#9e763b' }}>
            {loading ? t('pleaseWait') : mode === 'login' ? t('login') : t('signup')}
          </button>
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--db-text-muted)', fontFamily: 'var(--font-sans)' }}>
              {mode === 'login' ? t('noAccount') : t('hasAccount')}
            </span>
            <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError('') }}
              style={{ background: 'none', border: 'none', color: '#be9a56', fontSize: '0.8125rem', fontFamily: 'var(--font-sans)', cursor: 'pointer', textDecoration: 'underline' }}>
              {mode === 'login' ? t('signupLink') : t('loginLink')}
            </button>
          </div>
        </div>
        <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.8125rem', color: 'var(--db-text-faint)', fontFamily: 'var(--font-sans)' }}>
          {t('providerOnly')}<a href="/partners" style={{ color: '#be9a56', textDecoration: 'underline' }}>{t('applyHere')}</a>
        </p>
      </div>
    </div>
  )
}
