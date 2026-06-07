'use client'
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

const PAYOUT_METHODS = ['Wave', 'Orange Money', 'Bank transfer', 'Cash pickup']
const PAYOUT_FREQUENCIES = ['Per booking', 'Weekly', 'Monthly']
const PAYOUT_CURRENCIES = ['CFA', 'EUR', 'USD']

export default function ProfilePage() {
  const router = useRouter()
  const [uid, setUid] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [activeTab, setActiveTab] = useState<'basics' | 'payouts'>('basics')

  const [form, setForm] = useState({
    // Section 1 - Basics
    legalName: '',
    tradingName: '',
    registrationNumber: '',
    taxId: '',
    ownerName: '',
    ownerRole: '',
    yearsInOperation: '',
    primaryPhone: '',
    whatsapp: '',
    email: '',
    address: '',
    mapsLink: '',
    // Section 2 - Payouts
    payoutMethod: '',
    accountName: '',
    accountNumber: '',
    bankName: '',
    iban: '',
    payoutFrequency: '',
    payoutCurrency: 'CFA',
  })

  const set = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }))

  useEffect(() => {
    const unsub = onAuthChange(async (user) => {
      if (!user) { router.replace('/dashboard'); return }
      setUid(user.uid)
      const partner = await getPartner(user.uid)
      if (partner) setForm(prev => ({ ...prev, ...partner }))
    })
    return () => unsub()
  }, [router])

  const basicsComplete = !!(form.legalName && form.tradingName && form.ownerName && form.primaryPhone && form.whatsapp && form.email && form.address)
  const payoutsComplete = !!(form.payoutMethod && form.accountName && form.accountNumber && form.payoutFrequency && form.payoutCurrency)

  const handleSave = async () => {
    setSaving(true)
    await updatePartner(uid, form)
    await updateSectionStatus(uid, 'basics', basicsComplete ? 'complete' : 'in_progress')
    await updateSectionStatus(uid, 'payouts', payoutsComplete ? 'complete' : 'in_progress')
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const SectionHeader = ({ label, complete }: { label: string; complete: boolean }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
      <h2 style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-tan)', fontSize: '20px', fontWeight: 400, margin: 0, letterSpacing: '0.02em' }}>
        {label}
      </h2>
      {complete && (
        <span style={{ fontSize: '11px', color: 'var(--accent-4)', border: '1px solid rgba(190,154,86,0.3)', padding: '3px 10px', borderRadius: '3px', fontFamily: 'var(--font-sans)', letterSpacing: '0.06em' }}>
          Complete
        </span>
      )}
    </div>
  )

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <p style={{ fontFamily: 'var(--font-sans)', color: 'rgba(223,201,166,0.4)', fontSize: '12px', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 8px' }}>
          Business Profile
        </p>
        <h1 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-tan)', fontSize: '26px', fontWeight: 400, letterSpacing: '0.06em', margin: 0 }}>
          Your Business Details
        </h1>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0', marginBottom: '32px', borderBottom: '1px solid rgba(223,201,166,0.1)' }}>
        {(['basics', 'payouts'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '10px 24px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === tab ? '2px solid var(--accent-4)' : '2px solid transparent',
              color: activeTab === tab ? 'var(--accent-4)' : 'rgba(223,201,166,0.4)',
              fontSize: '13px',
              fontFamily: 'var(--font-sans)',
              letterSpacing: '0.06em',
              cursor: 'pointer',
              textTransform: 'uppercase',
              transition: 'color 0.15s',
            }}
          >
            {tab === 'basics' ? 'Business Basics' : 'Payout Details'}
          </button>
        ))}
      </div>

      {activeTab === 'basics' && (
        <div>
          <SectionHeader label="Business Basics" complete={basicsComplete} />

          <div style={rowStyle}>
            <div>
              <label style={labelStyle}>Legal business name *</label>
              <input style={inputStyle} placeholder="As registered" value={form.legalName} onChange={e => set('legalName', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Trading / brand name *</label>
              <input style={inputStyle} placeholder='e.g. "Atlantic Yachting Sénégal"' value={form.tradingName} onChange={e => set('tradingName', e.target.value)} />
            </div>
          </div>

          <div style={rowStyle}>
            <div>
              <label style={labelStyle}>Business registration # <span style={{ color: 'rgba(223,201,166,0.3)' }}>(NINEA / RCCM)</span></label>
              <input style={inputStyle} placeholder="Registration number" value={form.registrationNumber} onChange={e => set('registrationNumber', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Tax ID <span style={{ color: 'rgba(223,201,166,0.3)' }}>(NINEA fiscal)</span></label>
              <input style={inputStyle} placeholder="Tax identification number" value={form.taxId} onChange={e => set('taxId', e.target.value)} />
            </div>
          </div>

          <div style={rowStyle}>
            <div>
              <label style={labelStyle}>Owner / primary contact name *</label>
              <input style={inputStyle} placeholder="Full name" value={form.ownerName} onChange={e => set('ownerName', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Owner role</label>
              <input style={inputStyle} placeholder="Founder / GM / Manager" value={form.ownerRole} onChange={e => set('ownerRole', e.target.value)} />
            </div>
          </div>

          <div style={{ ...rowStyle }}>
            <div>
              <label style={labelStyle}>Years in operation</label>
              <input style={inputStyle} type="number" min="0" placeholder="e.g. 5" value={form.yearsInOperation} onChange={e => set('yearsInOperation', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Email *</label>
              <input style={inputStyle} type="email" placeholder="For booking confirmations" value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
          </div>

          <div style={rowStyle}>
            <div>
              <label style={labelStyle}>Primary phone *</label>
              <input style={inputStyle} placeholder="Direct line" value={form.primaryPhone} onChange={e => set('primaryPhone', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>WhatsApp number *</label>
              <input style={inputStyle} placeholder="WhatsApp contact" value={form.whatsapp} onChange={e => set('whatsapp', e.target.value)} />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Physical address *</label>
            <input style={inputStyle} placeholder="Full street address" value={form.address} onChange={e => set('address', e.target.value)} />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={labelStyle}>Google Maps link</label>
            <input style={inputStyle} placeholder="Paste a Google Maps pin link" value={form.mapsLink} onChange={e => set('mapsLink', e.target.value)} />
          </div>
        </div>
      )}

      {activeTab === 'payouts' && (
        <div>
          <SectionHeader label="Payout Details" complete={payoutsComplete} />

          <div style={rowStyle}>
            <div>
              <label style={labelStyle}>Preferred payout method *</label>
              <select style={{ ...inputStyle, appearance: 'none' }} value={form.payoutMethod} onChange={e => set('payoutMethod', e.target.value)}>
                <option value="">Select method</option>
                {PAYOUT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Payout currency *</label>
              <select style={{ ...inputStyle, appearance: 'none' }} value={form.payoutCurrency} onChange={e => set('payoutCurrency', e.target.value)}>
                {PAYOUT_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div style={rowStyle}>
            <div>
              <label style={labelStyle}>Account name *</label>
              <input style={inputStyle} placeholder="Must match registered business" value={form.accountName} onChange={e => set('accountName', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Account number / phone *</label>
              <input style={inputStyle} placeholder="Phone for Wave / Orange Money" value={form.accountNumber} onChange={e => set('accountNumber', e.target.value)} />
            </div>
          </div>

          {form.payoutMethod === 'Bank transfer' && (
            <div style={rowStyle}>
              <div>
                <label style={labelStyle}>Bank name</label>
                <input style={inputStyle} placeholder="Bank name" value={form.bankName} onChange={e => set('bankName', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>IBAN</label>
                <input style={inputStyle} placeholder="International bank account number" value={form.iban} onChange={e => set('iban', e.target.value)} />
              </div>
            </div>
          )}

          <div style={{ marginBottom: '24px' }}>
            <label style={labelStyle}>Payout frequency *</label>
            <select style={{ ...inputStyle, appearance: 'none' }} value={form.payoutFrequency} onChange={e => set('payoutFrequency', e.target.value)}>
              <option value="">Select frequency</option>
              {PAYOUT_FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>

          <div style={{
            background: 'rgba(158,118,59,0.06)',
            border: '1px solid rgba(158,118,59,0.15)',
            borderRadius: '6px',
            padding: '14px 16px',
            marginBottom: '24px',
          }}>
            <p style={{ fontSize: '13px', color: 'rgba(223,201,166,0.5)', fontFamily: 'var(--font-sans)', margin: 0, lineHeight: 1.6 }}>
              All payouts are processed in CFA where possible. Palmera pays out weekly via Wave by default. You&apos;ll receive a notification each time a payout is sent.
            </p>
          </div>
        </div>
      )}

      {/* Save button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', paddingTop: '8px', borderTop: '1px solid rgba(223,201,166,0.08)' }}>
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
        {saved && (
          <span style={{ fontSize: '13px', color: 'var(--accent-4)', fontFamily: 'var(--font-sans)' }}>
            ✓ Saved
          </span>
        )}
      </div>
    </div>
  )
}
