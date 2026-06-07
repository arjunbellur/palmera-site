
'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthChange } from '@/lib/auth'
import { getPartner, updatePartner, updateSectionStatus } from '@/lib/firestore'

const inputStyle = {
  width: '100%',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(223,201,166,0.15)',
  borderRadius: '6px',
  padding: '11px 14px',
  color: 'var(--color-tan)',
  fontSize: '14px',
  fontFamily: 'var(--font-sans)',
  outline: 'none',
  boxSizing: 'border-box' as const,
}

const labelStyle = {
  display: 'block',
  fontSize: '11px',
  color: 'rgba(223,201,166,0.5)',
  letterSpacing: '0.08em',
  textTransform: 'uppercase' as const,
  marginBottom: '6px',
  fontFamily: 'var(--font-sans)',
}

const rowStyle = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '16px',
  marginBottom: '16px',
}

const NOTIFICATION_PREFS = ['WhatsApp message', 'SMS', 'Email', 'Phone call']
const CONFIRMATION_SPEEDS = ['Real-time', 'Within 1 hour', 'Same day', 'Within 24 hours']

export default function OperationsPage() {
  const router = useRouter()
  const [uid, setUid] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [form, setForm] = useState({
    opsContactName: '',
    opsContactWhatsapp: '',
    backupContactName: '',
    backupContactWhatsapp: '',
    notificationPreference: '',
    confirmationSpeed: '',
    noShowPolicy: '',
    cancellationRate: '',
    specialRequestHandling: '',
  })

  const set = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }))

  useEffect(() => {
    const unsub = onAuthChange(async (user) => {
      if (!user) { router.replace('/dashboard'); return }
      setUid(user.uid)
      const partner = await getPartner(user.uid)
      if (partner?.operations) setForm(prev => ({ ...prev, ...partner.operations }))
    })
    return () => unsub()
  }, [router])

  const isComplete = !!(form.opsContactName && form.opsContactWhatsapp && form.backupContactName && form.notificationPreference && form.confirmationSpeed && form.noShowPolicy)

  const handleSave = async () => {
    setSaving(true)
    await updatePartner(uid, { operations: form })
    await updateSectionStatus(uid, 'operations', isComplete ? 'complete' : 'in_progress')
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <p style={{ fontFamily: 'var(--font-sans)', color: 'rgba(223,201,166,0.4)', fontSize: '12px', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 8px' }}>
          Operations
        </p>
        <h1 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-tan)', fontSize: '26px', fontWeight: 400, letterSpacing: '0.06em', margin: '0 0 6px' }}>
          Booking Operations
        </h1>
        <p style={{ fontFamily: 'var(--font-serif)', color: 'rgba(223,201,166,0.4)', fontSize: '14px', margin: 0, letterSpacing: '0.02em' }}>
          How bookings flow once a guest reserves. This is how the operations loop works on day one.
        </p>
      </div>

      {/* Ops callout */}
      <div style={{
        background: 'rgba(158,118,59,0.06)',
        border: '1px solid rgba(158,118,59,0.15)',
        borderRadius: '8px',
        padding: '16px 20px',
        marginBottom: '32px',
      }}>
        <p style={{ fontSize: '13px', color: 'rgba(223,201,166,0.5)', fontFamily: 'var(--font-sans)', margin: 0, lineHeight: 1.6 }}>
          Standard Palmera ops: we send you bookings via WhatsApp, you confirm within 1 hour, we pay weekly via Wave. Please give us the contact of the person who actually runs day-to-day operations — not just the owner.
        </p>
      </div>

      {/* Primary ops contact */}
      <h2 style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-tan)', fontSize: '17px', fontWeight: 400, margin: '0 0 20px', letterSpacing: '0.04em' }}>
        Booking contacts
      </h2>

      <div style={rowStyle}>
        <div>
          <label style={labelStyle}>Ops contact name *</label>
          <input style={inputStyle} placeholder="Person who runs day-to-day ops" value={form.opsContactName} onChange={e => set('opsContactName', e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Ops contact WhatsApp *</label>
          <input style={inputStyle} placeholder="Direct WhatsApp number" value={form.opsContactWhatsapp} onChange={e => set('opsContactWhatsapp', e.target.value)} />
        </div>
      </div>

      <div style={rowStyle}>
        <div>
          <label style={labelStyle}>Backup contact name *</label>
          <input style={inputStyle} placeholder="Used when primary is unreachable" value={form.backupContactName} onChange={e => set('backupContactName', e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Backup contact WhatsApp</label>
          <input style={inputStyle} placeholder="Backup WhatsApp number" value={form.backupContactWhatsapp} onChange={e => set('backupContactWhatsapp', e.target.value)} />
        </div>
      </div>

      {/* Booking flow */}
      <h2 style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-tan)', fontSize: '17px', fontWeight: 400, margin: '28px 0 20px', letterSpacing: '0.04em' }}>
        Booking flow
      </h2>

      <div style={rowStyle}>
        <div>
          <label style={labelStyle}>Notification preference *</label>
          <select style={{ ...inputStyle, appearance: 'none' }} value={form.notificationPreference} onChange={e => set('notificationPreference', e.target.value)}>
            <option value="">How should we notify you?</option>
            {NOTIFICATION_PREFS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Confirmation speed *</label>
          <select style={{ ...inputStyle, appearance: 'none' }} value={form.confirmationSpeed} onChange={e => set('confirmationSpeed', e.target.value)}>
            <option value="">How quickly do you confirm?</option>
            {CONFIRMATION_SPEEDS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={labelStyle}>No-show policy *</label>
        <input style={inputStyle} placeholder="What happens when a guest doesn't arrive?" value={form.noShowPolicy} onChange={e => set('noShowPolicy', e.target.value)} />
      </div>

      {/* Optional */}
      <h2 style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-tan)', fontSize: '17px', fontWeight: 400, margin: '28px 0 20px', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '10px' }}>
        Additional info
        <span style={{ fontSize: '10px', color: 'rgba(223,201,166,0.4)', border: '1px solid rgba(223,201,166,0.15)', padding: '2px 8px', borderRadius: '2px', fontFamily: 'var(--font-sans)', letterSpacing: '0.06em' }}>
          First month
        </span>
      </h2>

      <div style={rowStyle}>
        <div>
          <label style={labelStyle}>Your typical cancellation rate</label>
          <input style={inputStyle} placeholder='e.g. "Rarely" / "Less than 5%"' value={form.cancellationRate} onChange={e => set('cancellationRate', e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Special request handling</label>
          <input style={inputStyle} placeholder="Cakes, surprises, dietary needs — OK?" value={form.specialRequestHandling} onChange={e => set('specialRequestHandling', e.target.value)} />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', paddingTop: '16px', borderTop: '1px solid rgba(223,201,166,0.08)', marginTop: '8px' }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '12px 32px',
            background: 'var(--accent-3)',
            border: 'none',
            borderRadius: '6px',
            color: '#fff',
            fontSize: '14px',
            fontFamily: 'var(--font-sans)',
            letterSpacing: '0.06em',
            cursor: saving ? 'wait' : 'pointer',
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? 'Saving...' : 'Save changes'}
        </button>
        {saved && <span style={{ fontSize: '13px', color: 'var(--accent-4)', fontFamily: 'var(--font-sans)' }}>✓ Saved</span>}
      </div>
    </div>
  )
}
