'use client'
// The DOOR surface — staff with the 'door' role land here and get exactly one
// tool: the ticket scanner for their company's bookings. No nav, no money,
// no settings. Sign-in + claim mirror the supplier portal; access is the
// staff_access doc booking rules key on.
import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { onAuthChange, signIn, signUp, resetPassword, logOut, needsEmailVerification } from '@/lib/auth'
import { ThemeProvider, useTheme } from '@/lib/theme'
import { getStaffByUid, claimStaffByEmail, subscribeBookingsForStaff, checkInBookingGuest, getCompany } from '@/lib/firestore'
import type { Booking, StaffMember } from '@/lib/schema'
import type { Locale } from '@/app/partner/i18n'
import { Chip, PrimaryButton, EmptyState, Spinner, IconButton, fieldStyle } from '@/components/partner/ui'
import VerifyEmailGate from '@/components/dashboard/VerifyEmailGate'
import { ScanLine, LogOut, DoorOpen } from 'lucide-react'
const TicketScanner = dynamic(() => import('@/components/partner/TicketScanner'), { ssr: false })

const STR = {
  fr: {
    tag: 'Porte', title: 'Accès porte', intro: 'Connectez-vous avec l’adresse e-mail invitée par votre établissement.',
    email: 'Adresse e-mail', password: 'Mot de passe', signin: 'Se connecter', signup: 'Créer mon accès',
    first: 'Première connexion ? Créez votre mot de passe avec la même adresse.', back: 'Déjà un accès ? Se connecter', forgot: 'Mot de passe oublié',
    none_t: 'Aucun accès', none_b: 'Aucun accès porte n’est associé à cette adresse. Demandez à votre établissement de vous inviter (Réglages → Équipe).',
    open: 'Ouvrir le scanner', today: 'réservation(s) confirmées aujourd’hui', signout: 'Déconnexion', reset_sent: 'E-mail envoyé.',
  },
  en: {
    tag: 'Door', title: 'Door access', intro: 'Sign in with the email your venue invited.',
    email: 'Email address', password: 'Password', signin: 'Sign in', signup: 'Create my access',
    first: 'First time? Create your password with the same email.', back: 'Already have access? Sign in', forgot: 'Forgot password',
    none_t: 'No access', none_b: 'No door access is linked to this email. Ask your venue to invite you (Settings → Team).',
    open: 'Open the scanner', today: 'confirmed reservation(s) today', signout: 'Sign out', reset_sent: 'Email sent.',
  },
}

function Shell() {
  const { theme } = useTheme()
  const [locale] = useState<Locale>(() => (typeof document !== 'undefined' && document.cookie.includes('locale=en') ? 'en' : 'fr'))
  const s = STR[locale]
  const [state, setState] = useState<'loading' | 'out' | 'unverified' | 'none' | 'in'>('loading')
  const [email, setEmail] = useState('')
  const [member, setMember] = useState<StaffMember | null>(null)
  const [companyName, setCompanyName] = useState('')
  const [bookings, setBookings] = useState<Booking[]>([])
  const [scanOpen, setScanOpen] = useState(true)
  const [form, setForm] = useState({ email: '', pw: '' })
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const unsub = onAuthChange(async (user) => {
      if (!user) { setState('out'); setMember(null); return }
      setEmail(user.email || '')
      if (needsEmailVerification(user) || !user.emailVerified) { setState('unverified'); return }
      try {
        let m = await getStaffByUid(user.uid)
        if (!m && user.email) m = await claimStaffByEmail(user.email, user.uid)
        if (!m) { setState('none'); return }
        setMember(m)
        getCompany(m.companyId).then(c => setCompanyName(c?.name || '')).catch(() => {})
        setState('in')
      } catch (e) { console.error('door lookup failed:', e); setState('none') }
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    if (state !== 'in' || !member) return
    const unsub = subscribeBookingsForStaff(member.companyId, setBookings)
    return () => unsub()
  }, [state, member])

  const submit = async () => {
    setErr(''); setBusy(true)
    try { mode === 'signin' ? await signIn(form.email.trim(), form.pw) : await signUp(form.email.trim(), form.pw) }
    catch (e) { setErr(String((e as { code?: string })?.code || 'error').replace('auth/', '').replace(/-/g, ' ')) }
    setBusy(false)
  }

  const today = bookings.filter(b => {
    if (b.status !== 'confirmed') return false
    const d = (b.scheduledFor as { toDate?: () => Date })?.toDate?.()
    const n = new Date()
    return !!d && d.getDate() === n.getDate() && d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear()
  }).length

  const center: React.CSSProperties = { minHeight: '100vh', background: 'var(--pf-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }
  const Brand = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '9px', justifyContent: 'center', marginBottom: '18px' }}>
      <img loading="lazy" decoding="async" src="/images/PALMERA_cracked.png" alt="" width={24} height={24} style={{ objectFit: 'contain' }} />
      <span style={{ fontFamily: 'var(--font-display)', color: 'var(--pf-head)', fontSize: '14px', letterSpacing: '0.12em' }}>PALMERA</span>
      <Chip tone="gold">{s.tag}</Chip>
    </div>
  )

  if (state === 'loading') return <div data-theme={theme} style={center}><Spinner /></div>
  if (state === 'unverified') return <div data-theme={theme}><VerifyEmailGate email={email} locale={locale} onVerified={() => window.location.reload()} /></div>
  if (state === 'out') return (
    <div data-theme={theme} style={center}>
      <div className="pf-glass" style={{ width: 'min(380px, 100%)', borderRadius: '18px', padding: '28px' }}>
        {Brand}
        <h1 style={{ fontFamily: 'var(--font-display)', color: 'var(--pf-head)', fontSize: '20px', fontWeight: 600, margin: '0 0 6px', textAlign: 'center' }}>{s.title}</h1>
        <p style={{ fontFamily: 'var(--font-sans)', color: 'var(--pf-muted)', fontSize: '12.5px', lineHeight: 1.5, margin: '0 0 16px', textAlign: 'center' }}>{s.intro}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input style={fieldStyle} type="email" placeholder={s.email} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          <input style={fieldStyle} type="password" placeholder={s.password} value={form.pw} onChange={e => setForm(f => ({ ...f, pw: e.target.value }))} onKeyDown={e => e.key === 'Enter' && submit()} />
          {err && <p style={{ color: 'var(--pf-alert)', fontFamily: 'var(--font-sans)', fontSize: '12px', margin: 0 }}>{err}</p>}
          <PrimaryButton fullWidth disabled={busy} onClick={submit}>{busy ? '…' : mode === 'signin' ? s.signin : s.signup}</PrimaryButton>
          <button onClick={() => setMode(m => m === 'signin' ? 'signup' : 'signin')} style={{ background: 'none', border: 'none', color: 'var(--pf-gold)', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: '12px', padding: '4px 0' }}>{mode === 'signin' ? s.first : s.back}</button>
          {mode === 'signin' && <button onClick={async () => { if (form.email.trim()) { await resetPassword(form.email.trim()).catch(() => {}); setErr(s.reset_sent) } }} style={{ background: 'none', border: 'none', color: 'var(--pf-faint)', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: '11px', padding: 0 }}>{s.forgot}</button>}
        </div>
      </div>
    </div>
  )
  if (state === 'none') return (
    <div data-theme={theme} style={center}>
      <div style={{ width: 'min(400px,100%)' }}>
        <EmptyState icon={<DoorOpen size={22} strokeWidth={1.75} />} title={s.none_t} body={`${s.none_b} (${email})`}
          action={<PrimaryButton onClick={() => logOut()}>{s.signout}</PrimaryButton>} />
      </div>
    </div>
  )

  return (
    <div data-theme={theme} style={{ minHeight: '100vh', background: 'var(--pf-bg)', display: 'flex', flexDirection: 'column' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--pf-border)', background: 'var(--pf-nav)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
          <img loading="lazy" decoding="async" src="/images/PALMERA_cracked.png" alt="" width={22} height={22} style={{ objectFit: 'contain' }} />
          <div>
            <div style={{ fontFamily: 'var(--font-serif)', color: 'var(--pf-text)', fontSize: '13.5px' }}>{companyName || '—'}</div>
            <div style={{ fontFamily: 'var(--font-sans)', color: 'var(--pf-faint)', fontSize: '10px' }}>{member?.name} · {s.tag}</div>
          </div>
        </div>
        <IconButton onClick={() => logOut()} label={s.signout}><LogOut size={15} strokeWidth={1.75} /></IconButton>
      </header>
      <main className="pf-ambient" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '24px' }}>
        <p style={{ fontFamily: 'var(--font-sans)', color: 'var(--pf-muted)', fontSize: '13px', margin: 0 }}>{today} {s.today}</p>
        <PrimaryButton onClick={() => setScanOpen(true)}><ScanLine size={16} strokeWidth={1.75} /> {s.open}</PrimaryButton>
      </main>
      {scanOpen && (
        <TicketScanner bookings={bookings} locale={locale} onClose={() => setScanOpen(false)}
          onCheckIn={async (b, guestId) => { await checkInBookingGuest(b.id!, guestId, b.status === 'confirmed') }} />
      )}
    </div>
  )
}

export default function DoorPage() {
  return <ThemeProvider><Shell /></ThemeProvider>
}
