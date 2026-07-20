'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthChange } from '@/lib/auth'
import { getProvider, createProvider, updateProvider } from '@/lib/firestore'
import PhotoUpload from '@/components/dashboard/PhotoUpload'
import type { Provider } from '@/lib/schema'

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

  if (loading) return null

  return (
    <div>
      <div style={{ marginBottom: '1.75rem' }}>
        <p style={{ fontFamily: 'var(--font-sans)', color: 'rgba(190,154,86,0.8)', fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 0.5rem' }}>Account</p>
        <h1 style={{ fontFamily: 'var(--font-display)', color: 'var(--db-text)', fontSize: 'clamp(1.5rem, 3vw, 1.875rem)', fontWeight: 400, letterSpacing: '0.06em', margin: '0 0 0.5rem' }}>Your account</h1>
        <p style={{ fontFamily: 'var(--font-serif)', color: 'var(--db-text-muted)', fontSize: '0.9375rem', margin: 0 }}>
          Your personal details as the partner who signs for and manages your companies. Each company keeps its own name, branding, and contacts.
        </p>
      </div>

      <div style={row}>
        <div>
          <label style={lbl}>Full name *</label>
          <input style={inp} placeholder="As on government ID" value={form.fullName} onChange={e => set('fullName', e.target.value)} />
        </div>
        <div>
          <label style={lbl}>Role in business *</label>
          <select style={{ ...inp, appearance: 'none' }} value={form.role} onChange={e => set('role', e.target.value)}>
            <option value="">Select role</option>
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>

      <div style={row}>
        <div>
          <label style={lbl}>Primary phone *</label>
          <input style={inp} placeholder="+221 …" value={form.primaryPhone} onChange={e => set('primaryPhone', e.target.value)} />
        </div>
        <div>
          <label style={lbl}>WhatsApp</label>
          <input style={inp} placeholder="If different from your phone" value={form.whatsapp} onChange={e => set('whatsapp', e.target.value)} />
        </div>
      </div>

      <div style={row}>
        <div>
          <label style={lbl}>Country</label>
          <select style={{ ...inp, appearance: 'none' }} value={form.country} onChange={e => set('country', e.target.value)}>
            {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>Email</label>
          <input style={{ ...inp, opacity: 0.6, cursor: 'not-allowed' }} value={email} disabled />
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.625rem', color: 'var(--db-text-ghost)', margin: '0.375rem 0 0' }}>Your sign-in email. Contact Palmera to change it.</p>
        </div>
      </div>

      <div style={{ marginTop: '1.75rem', marginBottom: '1.75rem' }}>
        <label style={lbl}>Your logo</label>
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', color: 'var(--db-text-ghost)', margin: '0 0 0.625rem' }}>
          Optional — your own mark as a partner. Each company also has its own logo, which is what guests see on its listings.
        </p>
        <div style={{ maxWidth: '20rem' }}>
          <PhotoUpload uid={uid} label="Your logo" fieldName="provider_logo" existingUrl={logo}
            hint="Square, transparent PNG preferred"
            onUploaded={async (url) => { setLogo(url); await updateProvider(uid, { logo: url }) }} />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
        <button onClick={handleSave} disabled={saving}
          style={{ padding: '0.625rem 1.5rem', background: '#9e763b', border: 'none', borderRadius: '0.375rem', color: '#ebe8db', fontSize: '0.8125rem', fontFamily: 'var(--font-sans)', letterSpacing: '0.06em', cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1 }}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        {saved && <span style={{ fontSize: '0.8125rem', color: '#be9a56', fontFamily: 'var(--font-sans)' }}>✓ Saved</span>}
      </div>
    </div>
  )
}
