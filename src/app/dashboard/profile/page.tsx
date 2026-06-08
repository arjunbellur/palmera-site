'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthChange } from '@/lib/auth'
import { getPartner, updatePartner, updateSectionStatus } from '@/lib/firestore'

const inp: React.CSSProperties = { width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(190,154,86,0.2)', borderRadius: '0.375rem', padding: '0.6875rem 0.875rem', color: '#dfc9a6', fontSize: '0.875rem', fontFamily: 'var(--font-sans)', outline: 'none', boxSizing: 'border-box' }
const lbl: React.CSSProperties = { display: 'block', fontSize: '0.6875rem', color: 'rgba(223,201,166,0.75)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.375rem', fontFamily: 'var(--font-sans)' }
const row: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 12rem), 1fr))', gap: '1rem', marginBottom: '1rem' }
const PAYOUT_METHODS = ['Wave', 'Orange Money', 'Bank transfer', 'Cash pickup']
const PAYOUT_FREQUENCIES = ['Per booking', 'Weekly', 'Monthly']
const PAYOUT_CURRENCIES = ['CFA', 'EUR', 'USD']

export default function ProfilePage() {
  const router = useRouter()
  const [uid, setUid] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [activeTab, setActiveTab] = useState<'basics' | 'payouts'>('basics')
  const [form, setForm] = useState({ legalName: '', tradingName: '', registrationNumber: '', taxId: '', ownerName: '', ownerRole: '', yearsInOperation: '', primaryPhone: '', whatsapp: '', email: '', address: '', mapsLink: '', payoutMethod: '', accountName: '', accountNumber: '', bankName: '', iban: '', payoutFrequency: '', payoutCurrency: 'CFA' })
  const set = (f: string, v: string) => setForm(p => ({ ...p, [f]: v }))

  useEffect(() => {
    const unsub = onAuthChange(async (user) => {
      if (!user) { router.replace('/dashboard'); return }
      setUid(user.uid)
      const partner = await getPartner(user.uid)
      if (partner) setForm(p => ({ ...p, ...partner }))
    })
    return () => unsub()
  }, [router])

  const basicsOk = !!(form.legalName && form.tradingName && form.ownerName && form.primaryPhone && form.whatsapp && form.email && form.address)
  const payoutsOk = !!(form.payoutMethod && form.accountName && form.accountNumber && form.payoutFrequency)

  const handleSave = async () => {
    setSaving(true)
    await updatePartner(uid, form)
    await updateSectionStatus(uid, 'basics', basicsOk ? 'complete' : 'in_progress')
    await updateSectionStatus(uid, 'payouts', payoutsOk ? 'complete' : 'in_progress')
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2500)
  }

  const PageHeader = () => (
    <div style={{ marginBottom: '2rem' }}>
      <p style={{ fontFamily: 'var(--font-sans)', color: 'rgba(190,154,86,0.8)', fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 0.5rem' }}>Business Profile</p>
      <h1 style={{ fontFamily: 'var(--font-display)', color: '#dfc9a6', fontSize: 'clamp(1.375rem, 3vw, 1.625rem)', fontWeight: 400, letterSpacing: '0.06em', margin: 0 }}>Your Business Details</h1>
    </div>
  )

  return (
    <div>
      <PageHeader />
      <div style={{ display: 'flex', marginBottom: '2rem', borderBottom: '1px solid rgba(223,201,166,0.1)' }}>
        {(['basics', 'payouts'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={{ padding: '0.625rem 1.5rem', background: 'transparent', border: 'none', borderBottom: activeTab === tab ? '2px solid #be9a56' : '2px solid transparent', color: activeTab === tab ? '#be9a56' : 'rgba(223,201,166,0.65)', fontSize: '0.8125rem', fontFamily: 'var(--font-sans)', letterSpacing: '0.06em', cursor: 'pointer', textTransform: 'uppercase', transition: 'color 0.15s' }}>
            {tab === 'basics' ? 'Business Basics' : 'Payout Details'}
          </button>
        ))}
      </div>

      {activeTab === 'basics' && (
        <div>
          <div style={row}>
            <div><label style={lbl}>Legal business name *</label><input style={inp} placeholder="As registered" value={form.legalName} onChange={e => set('legalName', e.target.value)} /></div>
            <div><label style={lbl}>Trading / brand name *</label><input style={inp} placeholder='e.g. "Atlantic Yachting Sénégal"' value={form.tradingName} onChange={e => set('tradingName', e.target.value)} /></div>
          </div>
          <div style={row}>
            <div><label style={lbl}>Registration # (NINEA / RCCM)</label><input style={inp} placeholder="Registration number" value={form.registrationNumber} onChange={e => set('registrationNumber', e.target.value)} /></div>
            <div><label style={lbl}>Tax ID (NINEA fiscal)</label><input style={inp} placeholder="Tax identification number" value={form.taxId} onChange={e => set('taxId', e.target.value)} /></div>
          </div>
          <div style={row}>
            <div><label style={lbl}>Owner / primary contact *</label><input style={inp} placeholder="Full name" value={form.ownerName} onChange={e => set('ownerName', e.target.value)} /></div>
            <div><label style={lbl}>Owner role</label><input style={inp} placeholder="Founder / GM / Manager" value={form.ownerRole} onChange={e => set('ownerRole', e.target.value)} /></div>
          </div>
          <div style={row}>
            <div><label style={lbl}>Years in operation</label><input style={inp} type="number" min="0" placeholder="e.g. 5" value={form.yearsInOperation} onChange={e => set('yearsInOperation', e.target.value)} /></div>
            <div><label style={lbl}>Email *</label><input style={inp} type="email" placeholder="For booking confirmations" value={form.email} onChange={e => set('email', e.target.value)} /></div>
          </div>
          <div style={row}>
            <div><label style={lbl}>Primary phone *</label><input style={inp} placeholder="Direct line" value={form.primaryPhone} onChange={e => set('primaryPhone', e.target.value)} /></div>
            <div><label style={lbl}>WhatsApp number *</label><input style={inp} placeholder="WhatsApp contact" value={form.whatsapp} onChange={e => set('whatsapp', e.target.value)} /></div>
          </div>
          <div style={{ marginBottom: '1rem' }}><label style={lbl}>Physical address *</label><input style={inp} placeholder="Full street address" value={form.address} onChange={e => set('address', e.target.value)} /></div>
          <div style={{ marginBottom: '1.5rem' }}><label style={lbl}>Google Maps link</label><input style={inp} placeholder="Paste a Google Maps pin link" value={form.mapsLink} onChange={e => set('mapsLink', e.target.value)} /></div>
        </div>
      )}

      {activeTab === 'payouts' && (
        <div>
          <div style={row}>
            <div><label style={lbl}>Payout method *</label><select style={{ ...inp, appearance: 'none' }} value={form.payoutMethod} onChange={e => set('payoutMethod', e.target.value)}><option value="">Select method</option>{PAYOUT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
            <div><label style={lbl}>Payout currency *</label><select style={{ ...inp, appearance: 'none' }} value={form.payoutCurrency} onChange={e => set('payoutCurrency', e.target.value)}>{PAYOUT_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
          </div>
          <div style={row}>
            <div><label style={lbl}>Account name *</label><input style={inp} placeholder="Must match registered business" value={form.accountName} onChange={e => set('accountName', e.target.value)} /></div>
            <div><label style={lbl}>Account number / phone *</label><input style={inp} placeholder="Phone for Wave / Orange Money" value={form.accountNumber} onChange={e => set('accountNumber', e.target.value)} /></div>
          </div>
          {form.payoutMethod === 'Bank transfer' && (
            <div style={row}>
              <div><label style={lbl}>Bank name</label><input style={inp} placeholder="Bank name" value={form.bankName} onChange={e => set('bankName', e.target.value)} /></div>
              <div><label style={lbl}>IBAN</label><input style={inp} placeholder="International bank account number" value={form.iban} onChange={e => set('iban', e.target.value)} /></div>
            </div>
          )}
          <div style={{ marginBottom: '1.5rem' }}><label style={lbl}>Payout frequency *</label><select style={{ ...inp, appearance: 'none' }} value={form.payoutFrequency} onChange={e => set('payoutFrequency', e.target.value)}><option value="">Select frequency</option>{PAYOUT_FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}</select></div>
          <div style={{ background: 'rgba(158,118,59,0.06)', border: '1px solid rgba(158,118,59,0.15)', borderRadius: '0.375rem', padding: '0.875rem 1rem', marginBottom: '1.5rem' }}>
            <p style={{ fontSize: '0.8125rem', color: 'rgba(223,201,166,0.72)', fontFamily: 'var(--font-sans)', margin: 0, lineHeight: 1.6 }}>All payouts processed in CFA where possible. Palmera pays out weekly via Wave by default.</p>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(223,201,166,0.08)' }}>
        <button onClick={handleSave} disabled={saving}
          style={{ padding: '0.75rem 2rem', background: '#9e763b', border: 'none', borderRadius: '0.375rem', color: '#ebe8db', fontSize: '0.875rem', fontFamily: 'var(--font-sans)', letterSpacing: '0.06em', cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Saving...' : 'Save changes'}
        </button>
        {saved && <span style={{ fontSize: '0.8125rem', color: '#be9a56', fontFamily: 'var(--font-sans)' }}>✓ Saved</span>}
      </div>
    </div>
  )
}
