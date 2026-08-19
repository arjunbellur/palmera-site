'use client'
// Supplier portal shell — the third surface. Concierge model: admins create
// the supplier record (with email) first; the supplier signs in — or signs
// UP on first visit — with that email, and the record is claimed to their
// auth uid. No record for the email → friendly "contact Palmera" screen.
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthChange, signIn, signUp, resetPassword, logOut } from '@/lib/auth'
import { ThemeProvider, useTheme } from '@/lib/theme'
import { getSupplierByUid, claimSupplierByEmail } from '@/lib/firestore'
import type { Supplier } from '@/lib/schema'
import { SupplierContext } from './SupplierContext'
import { t, type Locale } from './i18n'
import { Chip, PrimaryButton, EmptyState } from '@/components/partner/ui'

function Shell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { theme, toggle: toggleTheme } = useTheme()
  const [uid, setUid] = useState('')
  const [email, setEmail] = useState('')
  const [supplier, setSupplier] = useState<Supplier | null>(null)
  const [authed, setAuthed] = useState<'loading' | 'out' | 'unclaimed' | 'in'>('loading')
  const [locale, setLocaleState] = useState<Locale>('fr')

  // Login form state
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [formEmail, setFormEmail] = useState('')
  const [formPw, setFormPw] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    const m = document.cookie.match(/locale=([^;]+)/)
    if (m && (m[1] === 'fr' || m[1] === 'en')) setLocaleState(m[1] as Locale)
  }, [])
  const setLocale = (l: Locale) => { setLocaleState(l); document.cookie = `locale=${l}; path=/; max-age=31536000` }
  const L = (k: string) => t(locale, k)

  useEffect(() => {
    const unsub = onAuthChange(async user => {
      if (!user) { setSupplier(null); setAuthed('out'); return }
      setUid(user.uid); setEmail(user.email || '')
      let s = await getSupplierByUid(user.uid)
      if (!s && user.email) s = await claimSupplierByEmail(user.email, user.uid)
      if (!s) { setAuthed('unclaimed'); return }
      setSupplier(s)
      setAuthed('in')
    })
    return () => unsub()
  }, [])

  const refresh = async () => { if (uid) setSupplier(await getSupplierByUid(uid)) }

  const submit = async () => {
    setErr(''); setBusy(true)
    try {
      if (mode === 'signin') await signIn(formEmail.trim(), formPw)
      else await signUp(formEmail.trim(), formPw)
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code || ''
      setErr(code.replace('auth/', '').replace(/-/g, ' ') || 'error')
    }
    setBusy(false)
  }
  const forgot = async () => {
    if (!formEmail.trim()) return
    try { await resetPassword(formEmail.trim()); setNotice(L('reset_sent')) } catch { /* silent */ }
  }
  const signOutAll = async () => { await logOut(); router.refresh() }

  const spinner = (
    <div data-theme={theme} style={{ minHeight: '100vh', background: 'var(--pf-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '2rem', height: '2rem', border: '2px solid rgba(190,154,86,0.15)', borderTopColor: 'var(--pf-gold)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
  if (authed === 'loading') return spinner

  const field: React.CSSProperties = {
    width: '100%', padding: '11px 13px', borderRadius: '10px',
    border: '1px solid var(--pf-border)', background: 'var(--pf-card)',
    color: 'var(--pf-text)', fontFamily: 'var(--font-sans)', fontSize: '14px',
  }
  const Brand = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
      <img loading="lazy" decoding="async" src="/images/PALMERA_cracked.png" alt="" width={24} height={24} style={{ objectFit: 'contain' }} />
      <span style={{ fontFamily: 'var(--font-display)', color: 'var(--pf-head)', fontSize: '14px', letterSpacing: '0.12em' }}>PALMERA</span>
      <Chip tone="gold">{L('brand_tag')}</Chip>
    </div>
  )
  const LangToggle = (
    <button onClick={() => setLocale(locale === 'fr' ? 'en' : 'fr')} style={{ border: '1px solid var(--pf-border)', background: 'transparent', color: 'var(--pf-faint)', borderRadius: '8px', padding: '5px 10px', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: '11px', letterSpacing: '0.06em' }}>
      {locale === 'fr' ? 'EN' : 'FR'}
    </button>
  )

  if (authed === 'out') return (
    <div data-theme={theme} style={{ minHeight: '100vh', background: 'var(--pf-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div className="pf-glass" style={{ width: 'min(400px, 100%)', borderRadius: '18px', padding: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>{Brand}{LangToggle}</div>
        <h1 style={{ fontFamily: 'var(--font-serif)', color: 'var(--pf-head)', fontSize: '21px', fontWeight: 500, margin: '0 0 6px' }}>{L('login_title')}</h1>
        <p style={{ fontFamily: 'var(--font-sans)', color: 'var(--pf-muted)', fontSize: '13px', lineHeight: 1.55, margin: '0 0 18px' }}>{L('login_intro')}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input style={field} type="email" placeholder={L('email')} value={formEmail} onChange={e => setFormEmail(e.target.value)} />
          <input style={field} type="password" placeholder={L('password')} value={formPw} onChange={e => setFormPw(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} />
          {err && <p style={{ color: 'var(--pf-red, #c0564f)', fontFamily: 'var(--font-sans)', fontSize: '12.5px', margin: 0 }}>{err}</p>}
          {notice && <p style={{ color: 'var(--pf-gold)', fontFamily: 'var(--font-sans)', fontSize: '12.5px', margin: 0 }}>{notice}</p>}
          <PrimaryButton onClick={submit}>{busy ? '…' : mode === 'signin' ? L('sign_in') : L('create_account')}</PrimaryButton>
          <button onClick={() => { setMode(m => m === 'signin' ? 'signup' : 'signin'); setErr('') }} style={{ background: 'none', border: 'none', color: 'var(--pf-gold)', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: '12.5px', padding: '4px 0' }}>
            {mode === 'signin' ? L('first_time') : L('back_to_login')}
          </button>
          {mode === 'signin' && <button onClick={forgot} style={{ background: 'none', border: 'none', color: 'var(--pf-faint)', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: '11.5px', padding: 0 }}>{L('forgot')}</button>}
        </div>
      </div>
    </div>
  )

  if (authed === 'unclaimed') return (
    <div data-theme={theme} style={{ minHeight: '100vh', background: 'var(--pf-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ width: 'min(420px,100%)' }}>
        <EmptyState icon="◫" title={L('not_registered_title')} body={`${L('not_registered_body')} (${email})`}
          action={<PrimaryButton onClick={signOutAll}>{L('sign_out')}</PrimaryButton>} />
      </div>
    </div>
  )

  if (supplier?.status === 'paused') return (
    <div data-theme={theme} style={{ minHeight: '100vh', background: 'var(--pf-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ width: 'min(420px,100%)' }}>
        <EmptyState icon="⏸" title={L('paused_title')} body={L('paused_body')}
          action={<PrimaryButton onClick={signOutAll}>{L('sign_out')}</PrimaryButton>} />
      </div>
    </div>
  )

  return (
    <SupplierContext.Provider value={{ supplier, uid, locale, refresh }}>
      <div data-theme={theme} style={{ minHeight: '100vh', background: 'var(--pf-bg)', display: 'flex', flexDirection: 'column' }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '14px 22px', borderBottom: '1px solid var(--pf-border)', background: 'var(--pf-nav)', position: 'sticky', top: 0, zIndex: 20 }}>
          {Brand}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: 'var(--pf-faint)' }}>{supplier?.name}</span>
            {LangToggle}
            <button onClick={toggleTheme} aria-label="Theme" style={{ width: '30px', height: '30px', borderRadius: '8px', border: '1px solid var(--pf-border)', background: 'transparent', color: 'var(--pf-gold)', cursor: 'pointer', fontSize: '12px' }}>{theme === 'dark' ? '☾' : '☀'}</button>
            <button onClick={signOutAll} title={L('sign_out')} style={{ width: '30px', height: '30px', borderRadius: '8px', border: '1px solid var(--pf-border)', background: 'transparent', color: 'var(--pf-faint)', cursor: 'pointer', fontSize: '13px' }}>⎋</button>
          </div>
        </header>
        <main className="pf-scroll" style={{ flex: 1, padding: '28px 22px 48px', maxWidth: '1100px', width: '100%', margin: '0 auto' }}>
          {children}
        </main>
      </div>
    </SupplierContext.Provider>
  )
}

export default function SupplierLayout({ children }: { children: React.ReactNode }) {
  return <ThemeProvider><Shell>{children}</Shell></ThemeProvider>
}
