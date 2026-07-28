'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthChange } from '@/lib/auth'
import { getProvider, createProvider, updateProvider } from '@/lib/firestore'
import { changePassword } from '@/lib/auth'
import PhotoUpload from '@/components/dashboard/PhotoUpload'
import { useLocale } from '@/lib/use-locale'
import type { Provider } from '@/lib/schema'

const STR = {
  fr: {
    eyebrow: 'Compte', title: 'Votre compte',
    sub: 'Vos informations personnelles en tant que partenaire signataire et gestionnaire de vos établissements. Chaque établissement garde son propre nom, sa marque et ses contacts.',
    fullName: 'Nom complet *', fullNamePh: 'Comme sur votre pièce d’identité',
    role: 'Rôle dans l’entreprise *', selectRole: 'Sélectionner un rôle',
    roleLabels: { Owner: 'Propriétaire', Director: 'Directeur·rice', Representative: 'Représentant·e' } as Record<string, string>,
    phone: 'Téléphone principal *', whatsapp: 'WhatsApp', whatsappPh: 'Si différent de votre téléphone',
    country: 'Pays', selectCountry: 'Sélectionner un pays', email: 'Email',
    emailHint: 'Votre email de connexion. Contactez Palmera pour le modifier.',
    logo: 'Votre logo',
    logoHint: 'Facultatif — votre marque personnelle de partenaire. Chaque établissement a aussi son propre logo, visible par les clients sur ses annonces.',
    logoUploadHint: 'Carré, PNG transparent de préférence',
    save: 'Enregistrer', saving: 'Enregistrement…', saved: '✓ Enregistré',
    pwTitle: 'Mot de passe', pwChange: 'Modifier le mot de passe',
    pwCurrent: 'Mot de passe actuel', pwNew: 'Nouveau mot de passe', pwConfirm: 'Confirmer le nouveau mot de passe',
    pwSaved: '✓ Mot de passe modifié', pwMismatch: 'Les mots de passe ne correspondent pas.',
    pwShort: 'Au moins 6 caractères.', pwWrong: 'Mot de passe actuel incorrect.',
    pwError: 'Impossible de modifier le mot de passe. Réessayez.', cancel: 'Annuler',
  },
  en: {
    eyebrow: 'Account', title: 'Your account',
    sub: 'Your personal details as the partner who signs for and manages your companies. Each company keeps its own name, branding, and contacts.',
    fullName: 'Full name *', fullNamePh: 'As on government ID',
    role: 'Role in business *', selectRole: 'Select role',
    roleLabels: { Owner: 'Owner', Director: 'Director', Representative: 'Representative' } as Record<string, string>,
    phone: 'Primary phone *', whatsapp: 'WhatsApp', whatsappPh: 'If different from your phone',
    country: 'Country', selectCountry: 'Select country', email: 'Email',
    emailHint: 'Your sign-in email. Contact Palmera to change it.',
    logo: 'Your logo',
    logoHint: 'Optional — your own mark as a partner. Each company also has its own logo, which is what guests see on its listings.',
    logoUploadHint: 'Square, transparent PNG preferred',
    save: 'Save changes', saving: 'Saving…', saved: '✓ Saved',
    pwTitle: 'Password', pwChange: 'Change password',
    pwCurrent: 'Current password', pwNew: 'New password', pwConfirm: 'Confirm new password',
    pwSaved: '✓ Password changed', pwMismatch: 'Passwords do not match.',
    pwShort: 'At least 6 characters.', pwWrong: 'Current password is incorrect.',
    pwError: 'Could not change password. Try again.', cancel: 'Cancel',
  },
}

// Countries carried over from the legacy profile page (West Africa first).
const COUNTRIES = [
  { code: '', name: 'Select country' },
  { code: 'SN', name: 'Senegal' }, { code: 'ML', name: 'Mali' }, { code: 'CI', name: "Côte d'Ivoire" },
  { code: 'BF', name: 'Burkina Faso' }, { code: 'GN', name: 'Guinea' }, { code: 'TG', name: 'Togo' },
  { code: 'BJ', name: 'Benin' }, { code: 'NE', name: 'Niger' }, { code: 'MR', name: 'Mauritania' },
  { code: 'GW', name: 'Guinea-Bissau' }, { code: 'GM', name: 'Gambia' }, { code: 'CV', name: 'Cape Verde' },
  { code: 'SL', name: 'Sierra Leone' }, { code: 'LR', name: 'Liberia' }, { code: 'GH', name: 'Ghana' },
  { code: 'NG', name: 'Nigeria' }, { code: 'MA', name: 'Morocco' }, { code: 'TN', name: 'Tunisia' },
  { code: 'DZ', name: 'Algeria' }, { code: 'EG', name: 'Egypt' }, { code: 'KE', name: 'Kenya' },
  { code: 'ZA', name: 'South Africa' }, { code: 'FR', name: 'France' }, { code: 'BE', name: 'Belgium' },
  { code: 'CH', name: 'Switzerland' }, { code: 'GB', name: 'United Kingdom' }, { code: 'DE', name: 'Germany' },
  { code: 'ES', name: 'Spain' }, { code: 'IT', name: 'Italy' }, { code: 'NL', name: 'Netherlands' },
  { code: 'PT', name: 'Portugal' }, { code: 'US', name: 'United States' }, { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
]
const ROLES = ['Owner', 'Director', 'Representative']

const lbl: React.CSSProperties = { display: 'block', fontSize: '0.6875rem', color: 'var(--db-text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.375rem', fontFamily: 'var(--font-sans)' }
const inp: React.CSSProperties = { width: '100%', background: 'var(--db-bg-input)', border: '1px solid var(--db-border-gold)', borderRadius: '0.375rem', padding: '0.6875rem 0.875rem', color: 'var(--db-text)', fontSize: '0.875rem', fontFamily: 'var(--font-sans)', outline: 'none', boxSizing: 'border-box' }
const row: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 14rem), 1fr))', gap: '1rem', marginBottom: '1rem' }

type Form = Pick<Provider, 'fullName' | 'role' | 'primaryPhone' | 'whatsapp' | 'country'>
const EMPTY: Form = { fullName: '', role: '', primaryPhone: '', whatsapp: '', country: '' }

export default function AccountPage() {
  const router = useRouter()
  const locale = useLocale()
  const s = STR[locale]
  // Country names localize from their ISO codes — no hand-maintained FR list.
  const regionNames = new Intl.DisplayNames([locale === 'fr' ? 'fr' : 'en'], { type: 'region' })
  const countryName = (code: string) => { try { return regionNames.of(code) || code } catch { return code } }
  const [uid, setUid] = useState('')
  const [email, setEmail] = useState('')
  const [logo, setLogo] = useState('')
  const [form, setForm] = useState<Form>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const set = (k: keyof Form, v: string) => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => {
    const unsub = onAuthChange(async user => {
      if (!user) { router.replace('/dashboard'); return }
      setUid(user.uid); setEmail(user.email || '')
      // Same self-heal as the overview: an account whose provider doc was never
      // created still gets one, so this page can always save.
      let p = await getProvider(user.uid)
      if (!p) { await createProvider(user.uid, user.email || ''); p = await getProvider(user.uid) }
      if (p) {
        setForm({ fullName: p.fullName || '', role: p.role || '', primaryPhone: p.primaryPhone || '', whatsapp: p.whatsapp || '', country: p.country || '' })
        setLogo(p.logo || '')
      }
      setLoading(false)
    })
    return () => unsub()
  }, [router])

  const handleSave = async () => {
    setSaving(true)
    await updateProvider(uid, form)
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2500)
  }

  // Change password — reauth with the current one, then update.
  const [pwOpen, setPwOpen] = useState(false)
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
  const [pwBusy, setPwBusy] = useState(false)
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const savePassword = async () => {
    setPwMsg(null)
    if (pw.next.length < 6) { setPwMsg({ ok: false, text: s.pwShort }); return }
    if (pw.next !== pw.confirm) { setPwMsg({ ok: false, text: s.pwMismatch }); return }
    setPwBusy(true)
    try {
      await changePassword(pw.current, pw.next)
      setPw({ current: '', next: '', confirm: '' }); setPwOpen(false)
      setPwMsg({ ok: true, text: s.pwSaved }); setTimeout(() => setPwMsg(null), 3000)
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code
      setPwMsg({ ok: false, text: code === 'auth/wrong-password' || code === 'auth/invalid-credential' ? s.pwWrong : s.pwError })
    }
    setPwBusy(false)
  }

  if (loading) return null

  return (
    <div>
      <div style={{ marginBottom: '1.75rem' }}>
        <p style={{ fontFamily: 'var(--font-sans)', color: 'rgba(190,154,86,0.8)', fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 0.5rem' }}>{s.eyebrow}</p>
        <h1 style={{ fontFamily: 'var(--font-display)', color: 'var(--db-text)', fontSize: 'clamp(1.5rem, 3vw, 1.875rem)', fontWeight: 400, letterSpacing: '0.06em', margin: '0 0 0.5rem' }}>{s.title}</h1>
        <p style={{ fontFamily: 'var(--font-serif)', color: 'var(--db-text-muted)', fontSize: '0.9375rem', margin: 0 }}>
          {s.sub}
        </p>
      </div>

      <div style={row}>
        <div>
          <label style={lbl}>{s.fullName}</label>
          <input style={inp} placeholder={s.fullNamePh} value={form.fullName} onChange={e => set('fullName', e.target.value)} />
        </div>
        <div>
          <label style={lbl}>{s.role}</label>
          <select style={{ ...inp, appearance: 'none' }} value={form.role} onChange={e => set('role', e.target.value)}>
            <option value="">{s.selectRole}</option>
            {ROLES.map(r => <option key={r} value={r}>{s.roleLabels[r]}</option>)}
          </select>
        </div>
      </div>

      <div style={row}>
        <div>
          <label style={lbl}>{s.phone}</label>
          <input style={inp} placeholder="+221 …" value={form.primaryPhone} onChange={e => set('primaryPhone', e.target.value)} />
        </div>
        <div>
          <label style={lbl}>{s.whatsapp}</label>
          <input style={inp} placeholder={s.whatsappPh} value={form.whatsapp} onChange={e => set('whatsapp', e.target.value)} />
        </div>
      </div>

      <div style={row}>
        <div>
          <label style={lbl}>{s.country}</label>
          <select style={{ ...inp, appearance: 'none' }} value={form.country} onChange={e => set('country', e.target.value)}>
            {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.code ? countryName(c.code) : s.selectCountry}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>{s.email}</label>
          <input style={{ ...inp, opacity: 0.6, cursor: 'not-allowed' }} value={email} disabled />
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.625rem', color: 'var(--db-text-ghost)', margin: '0.375rem 0 0' }}>{s.emailHint}</p>
        </div>
      </div>

      <div style={{ marginTop: '1.75rem', marginBottom: '1.75rem' }}>
        <label style={lbl}>{s.logo}</label>
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', color: 'var(--db-text-ghost)', margin: '0 0 0.625rem' }}>
          {s.logoHint}
        </p>
        <div style={{ maxWidth: '20rem' }}>
          <PhotoUpload uid={uid} label={s.logo} fieldName="provider_logo" existingUrl={logo}
            hint={s.logoUploadHint}
            onUploaded={async (url) => { setLogo(url); await updateProvider(uid, { logo: url }) }} />
        </div>
      </div>

      {/* Password */}
      <div style={{ margin: '0 0 1.75rem', padding: '1rem 1.25rem', background: 'var(--db-bg-card)', border: '1px solid var(--db-border-subtle)', borderRadius: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <label style={{ ...lbl, marginBottom: 0 }}>{s.pwTitle}</label>
          {pwMsg?.ok && <span style={{ fontSize: '0.75rem', color: '#9e763b', fontFamily: 'var(--font-sans)' }}>{pwMsg.text}</span>}
          {!pwOpen && (
            <button onClick={() => { setPwOpen(true); setPwMsg(null) }}
              style={{ background: 'transparent', border: '1px solid var(--db-border-gold)', borderRadius: '0.375rem', color: 'var(--db-text-muted)', padding: '0.4375rem 0.875rem', fontSize: '0.75rem', fontFamily: 'var(--font-sans)', cursor: 'pointer' }}>
              {s.pwChange}
            </button>
          )}
        </div>
        {pwOpen && (
          <div style={{ marginTop: '0.875rem' }}>
            <div style={{ ...row, marginBottom: '0.75rem' }}>
              <div><label style={lbl}>{s.pwCurrent}</label><input style={inp} type="password" autoComplete="current-password" value={pw.current} onChange={e => setPw(p => ({ ...p, current: e.target.value }))} /></div>
              <div><label style={lbl}>{s.pwNew}</label><input style={inp} type="password" autoComplete="new-password" value={pw.next} onChange={e => setPw(p => ({ ...p, next: e.target.value }))} /></div>
              <div><label style={lbl}>{s.pwConfirm}</label><input style={inp} type="password" autoComplete="new-password" value={pw.confirm} onChange={e => setPw(p => ({ ...p, confirm: e.target.value }))} /></div>
            </div>
            {pwMsg && !pwMsg.ok && <p style={{ fontSize: '0.75rem', color: '#e07070', fontFamily: 'var(--font-sans)', margin: '0 0 0.75rem' }}>{pwMsg.text}</p>}
            <div style={{ display: 'flex', gap: '0.625rem' }}>
              <button onClick={savePassword} disabled={pwBusy || !pw.current || !pw.next || !pw.confirm}
                style={{ padding: '0.5625rem 1.25rem', background: pw.current && pw.next && pw.confirm ? '#9e763b' : 'var(--db-bg-card)', border: 'none', borderRadius: '0.375rem', color: pw.current && pw.next && pw.confirm ? '#ebe8db' : 'var(--db-text-ghost)', fontSize: '0.8125rem', fontFamily: 'var(--font-sans)', cursor: pwBusy ? 'wait' : 'pointer', opacity: pwBusy ? 0.6 : 1 }}>
                {s.save}
              </button>
              <button onClick={() => { setPwOpen(false); setPw({ current: '', next: '', confirm: '' }); setPwMsg(null) }}
                style={{ padding: '0.5625rem 1rem', background: 'transparent', border: '1px solid var(--db-border-subtle)', borderRadius: '0.375rem', color: 'var(--db-text-muted)', fontSize: '0.8125rem', fontFamily: 'var(--font-sans)', cursor: 'pointer' }}>
                {s.cancel}
              </button>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
        <button onClick={handleSave} disabled={saving}
          style={{ padding: '0.625rem 1.5rem', background: '#9e763b', border: 'none', borderRadius: '0.375rem', color: '#ebe8db', fontSize: '0.8125rem', fontFamily: 'var(--font-sans)', letterSpacing: '0.06em', cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1 }}>
          {saving ? s.saving : s.save}
        </button>
        {saved && <span style={{ fontSize: '0.8125rem', color: '#be9a56', fontFamily: 'var(--font-sans)' }}>{s.saved}</span>}
      </div>
    </div>
  )
}
