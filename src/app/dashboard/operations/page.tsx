'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthChange } from '@/lib/auth'
import { getPartner, updatePartner, updateSectionStatus } from '@/lib/firestore'

const inp: React.CSSProperties = { width: '100%', background: 'var(--db-bg-input)', border: '1px solid var(--db-border-gold)', borderRadius: '0.375rem', padding: '0.6875rem 0.875rem', color: 'var(--db-text)', fontSize: '0.875rem', fontFamily: 'var(--font-sans)', outline: 'none', boxSizing: 'border-box' }
const lbl: React.CSSProperties = { display: 'block', fontSize: '0.6875rem', color: 'var(--db-text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.375rem', fontFamily: 'var(--font-sans)' }
const row: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 12rem), 1fr))', gap: '1rem', marginBottom: '1rem' }
const NOTIFICATION_PREFS = ['WhatsApp message', 'SMS', 'Email', 'Phone call']
const CONFIRMATION_SPEEDS = ['Real-time', 'Within 1 hour', 'Same day', 'Within 24 hours']

export default function OperationsPage() {
  const router = useRouter()
  const [uid, setUid] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({ opsContactName: '', opsContactWhatsapp: '', backupContactName: '', backupContactWhatsapp: '', notificationPreference: '', confirmationSpeed: '', noShowPolicy: '', cancellationRate: '', specialRequestHandling: '' })
  const set = (f: string, v: string) => setForm(p => ({ ...p, [f]: v }))

  useEffect(() => {
    const unsub = onAuthChange(async (user) => {
      if (!user) { router.replace('/dashboard'); return }
      setUid(user.uid)
      const partner = await getPartner(user.uid)
      if (partner?.operations) setForm(p => ({ ...p, ...partner.operations }))
    })
    return () => unsub()
  }, [router])

  const isComplete = !!(form.opsContactName && form.opsContactWhatsapp && form.backupContactName && form.notificationPreference && form.confirmationSpeed && form.noShowPolicy)

  const handleSave = async () => {
    setSaving(true)
    await updatePartner(uid, { operations: form })
    await updateSectionStatus(uid, 'operations', isComplete ? 'complete' : 'in_progress')
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <p style={{ fontFamily: 'var(--font-sans)', color: 'rgba(190,154,86,0.8)', fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 0.5rem' }}>Operations</p>
        <h1 style={{ fontFamily: 'var(--font-display)', color: 'var(--db-text)', fontSize: 'clamp(1.375rem, 3vw, 1.625rem)', fontWeight: 400, letterSpacing: '0.06em', margin: '0 0 0.375rem' }}>Booking Operations</h1>
        <p style={{ fontFamily: 'var(--font-serif)', color: 'var(--db-text-muted)', fontSize: '0.875rem', margin: 0 }}>How bookings flow once a guest reserves.</p>
      </div>
      <div style={{ background: 'var(--db-bg-banner)', border: '1px solid rgba(158,118,59,0.15)', borderRadius: '0.5rem', padding: '1rem 1.25rem', marginBottom: '2rem' }}>
        <p style={{ fontSize: '0.8125rem', color: 'var(--db-text-muted)', fontFamily: 'var(--font-sans)', margin: 0, lineHeight: 1.6 }}>Standard Palmera operations: we send you bookings via WhatsApp, you confirm within 1 hour, we pay weekly via Wave. Please provide the contact of the person who actually runs day-to-day operations.</p>
      </div>
      <h2 style={{ fontFamily: 'var(--font-serif)', color: 'var(--db-text)', fontSize: '1.0625rem', fontWeight: 400, margin: '0 0 1.25rem' }}>Booking contacts</h2>
      <div style={row}>
        <div><label style={lbl}>Operations contact name *</label><input style={inp} placeholder="Person who runs day-to-day operations" value={form.opsContactName} onChange={e => set('opsContactName', e.target.value)} /></div>
        <div><label style={lbl}>Operations contact WhatsApp *</label><input style={inp} placeholder="Direct WhatsApp number" value={form.opsContactWhatsapp} onChange={e => set('opsContactWhatsapp', e.target.value)} /></div>
      </div>
      <div style={row}>
        <div><label style={lbl}>Backup contact name *</label><input style={inp} placeholder="Used when primary is unreachable" value={form.backupContactName} onChange={e => set('backupContactName', e.target.value)} /></div>
        <div><label style={lbl}>Backup WhatsApp</label><input style={inp} placeholder="Backup WhatsApp number" value={form.backupContactWhatsapp} onChange={e => set('backupContactWhatsapp', e.target.value)} /></div>
      </div>
      <h2 style={{ fontFamily: 'var(--font-serif)', color: 'var(--db-text)', fontSize: '1.0625rem', fontWeight: 400, margin: '1.75rem 0 1.25rem' }}>Booking flow</h2>
      <div style={row}>
        <div><label style={lbl}>Notification preference *</label><select style={{ ...inp, appearance: 'none' }} value={form.notificationPreference} onChange={e => set('notificationPreference', e.target.value)}><option value="">How should we notify you?</option>{NOTIFICATION_PREFS.map(p => <option key={p} value={p}>{p}</option>)}</select></div>
        <div><label style={lbl}>Confirmation speed *</label><select style={{ ...inp, appearance: 'none' }} value={form.confirmationSpeed} onChange={e => set('confirmationSpeed', e.target.value)}><option value="">How quickly do you confirm?</option>{CONFIRMATION_SPEEDS.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
      </div>
      <div style={{ marginBottom: '1rem' }}><label style={lbl}>No-show policy *</label><input style={inp} placeholder="What happens when a guest doesn't arrive?" value={form.noShowPolicy} onChange={e => set('noShowPolicy', e.target.value)} /></div>
      <h2 style={{ fontFamily: 'var(--font-serif)', color: 'var(--db-text)', fontSize: '1.0625rem', fontWeight: 400, margin: '1.75rem 0 1.25rem', display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
        Additional info <span style={{ fontSize: '0.625rem', color: 'var(--db-text-muted)', border: '1px solid var(--db-border-subtle)', padding: '0.125rem 0.5rem', borderRadius: '0.1875rem', fontFamily: 'var(--font-sans)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>First month</span>
      </h2>
      <div style={row}>
        <div><label style={lbl}>Your cancellation rate</label><input style={inp} placeholder='e.g. "Rarely" / "Less than 5%"' value={form.cancellationRate} onChange={e => set('cancellationRate', e.target.value)} /></div>
        <div><label style={lbl}>Special request handling</label><input style={inp} placeholder="Cakes, surprises, dietary needs — OK?" value={form.specialRequestHandling} onChange={e => set('specialRequestHandling', e.target.value)} /></div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--db-border-subtle)', marginTop: '0.5rem' }}>
        <button onClick={handleSave} disabled={saving}
          style={{ padding: '0.75rem 2rem', background: '#9e763b', border: 'none', borderRadius: '0.375rem', color: '#ebe8db', fontSize: '0.875rem', fontFamily: 'var(--font-sans)', letterSpacing: '0.06em', cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Saving...' : 'Save changes'}
        </button>
        {saved && <span style={{ fontSize: '0.8125rem', color: '#be9a56', fontFamily: 'var(--font-sans)' }}>✓ Saved</span>}
      </div>
    </div>
  )
}
