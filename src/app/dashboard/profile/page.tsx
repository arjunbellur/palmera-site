'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthChange } from '@/lib/auth'
import { getPartner, updatePartner, updateSectionStatus } from '@/lib/firestore'

const inp: React.CSSProperties = { width: '100%', background: 'var(--db-bg-input)', border: '1px solid var(--db-border-gold)', borderRadius: '0.375rem', padding: '0.6875rem 0.875rem', color: 'var(--db-text)', fontSize: '0.875rem', fontFamily: 'var(--font-sans)', boxSizing: 'border-box' }
const sel: React.CSSProperties = { ...inp, appearance: 'none' as const }
const lbl: React.CSSProperties = { display: 'block', fontSize: '0.6875rem', color: 'var(--db-text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.375rem', fontFamily: 'var(--font-sans)' }
const row: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 12rem), 1fr))', gap: '1rem', marginBottom: '1rem' }
const h2s: React.CSSProperties = { fontFamily: 'var(--font-serif)', color: 'var(--db-text)', fontSize: '1.0625rem', fontWeight: 400, margin: '1.75rem 0 1rem' }
const hint: React.CSSProperties = { fontSize: '0.6875rem', color: 'var(--db-text-faint)', fontFamily: 'var(--font-sans)', marginTop: '0.25rem' }

const WEST_AFRICA_CODES = new Set(['SN', 'ML', 'CI', 'BF', 'GN', 'TG', 'BJ', 'NE', 'MR', 'GW', 'GM', 'CV', 'SL', 'LR', 'GH', 'NG'])
const STRIPE_SUPPORTED_CODES = new Set(['US', 'CA', 'GB', 'FR', 'DE', 'ES', 'IT', 'NL', 'BE', 'PT', 'CH', 'AT', 'IE', 'SE', 'NO', 'DK', 'FI', 'AU', 'NZ', 'SG', 'HK', 'JP'])

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

const INDUSTRY_CATEGORIES = [
  'Water sports & sailing', 'Land & safari', 'Cultural & heritage tours',
  'Food & culinary', 'Wellness & spa', 'Nightlife & entertainment',
  'Transport & transfers', 'Accommodation', 'Photography & media',
  'Adventure & outdoor', 'Art & crafts', 'Music & performance', 'Other',
]

const MOBILE_MONEY_PROVIDERS = ['Wave', 'Orange Money', 'Free Money', 'MTN Mobile Money', 'Moov Money']
const PAYOUT_CURRENCIES_WA = ['XOF', 'USD', 'EUR']
const PAYOUT_CURRENCIES_STRIPE = ['EUR', 'USD', 'GBP']

interface BeneficialOwner { name: string; dob: string; ownershipPct: string }

export default function ProfilePage() {
  const router = useRouter()
  const [uid, setUid] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [activeTab, setActiveTab] = useState<'business' | 'owner' | 'payouts'>('business')
  const [form, setForm] = useState({
    legalName: '', tradingName: '', businessType: '', country: '',
    registrationNumber: '', taxId: '', industryCategory: '', websiteOrSocial: '',
    address: '', mapsLink: '',
    ownerName: '', ownerDob: '', ownerNationality: '', ownerRole: '',
    ownerResidentialAddress: '', ownerPersonalTaxId: '',
    primaryPhone: '', whatsapp: '', email: '',
    payoutMethod: '', mobileMoneyProvider: '', mobileMoneyNumber: '',
    accountName: '', bankName: '', accountNumber: '', iban: '',
    stripeAccountHolderName: '', stripeBankName: '', stripeIban: '', stripeRouting: '',
    payoutCurrency: 'XOF', stripeCurrency: 'EUR',
  })
  const [beneficialOwners, setBeneficialOwners] = useState<BeneficialOwner[]>([])
  const set = (f: string, v: string) => { setForm(p => ({ ...p, [f]: v })); setErrors(p => { const n = { ...p }; delete n[f]; return n }) }
  const err = (f: string) => errors[f] ? { border: '1px solid rgba(224,112,112,0.6)' } : {}
  const errMsg = (f: string) => errors[f] ? <p style={{ fontSize: '0.6875rem', color: 'var(--db-alert)', fontFamily: 'var(--font-sans)', margin: '0.25rem 0 0' }}>{errors[f]}</p> : null

  const isWestAfrica = WEST_AFRICA_CODES.has(form.country)
  const isStripe = STRIPE_SUPPORTED_CODES.has(form.country)
  const isCompany = form.businessType === 'Registered Company'

  useEffect(() => {
    const unsub = onAuthChange(async (user) => {
      if (!user) { router.replace('/dashboard'); return }
      setUid(user.uid)
      const partner = await getPartner(user.uid)
      if (partner) {
        setForm(p => ({ ...p, ...partner }))
        if (Array.isArray(partner.beneficialOwners)) setBeneficialOwners(partner.beneficialOwners)
      }
    })
    return () => unsub()
  }, [router])

  const basicsOk = !!(form.legalName && form.country && form.businessType && form.taxId && form.address && form.industryCategory)
  const ownerOk = !!(form.ownerName && form.ownerDob && form.ownerNationality && form.ownerRole && form.ownerResidentialAddress && form.primaryPhone && form.email)
  const payoutsOk = isWestAfrica
    ? !!(form.payoutMethod && form.accountName && (form.payoutMethod === 'Bank Transfer' ? form.bankName && form.accountNumber : form.mobileMoneyProvider && form.mobileMoneyNumber))
    : isStripe
    ? !!(form.stripeAccountHolderName && form.stripeIban)
    : false

  const handleSave = async () => {
    const newErrors: Record<string, string> = {}
    if (activeTab === 'business') {
      if (!form.legalName) newErrors.legalName = 'Required'
      if (!form.businessType) newErrors.businessType = 'Required'
      if (!form.country) newErrors.country = 'Required'
      if (!form.taxId) newErrors.taxId = 'Required'
      if (!form.industryCategory) newErrors.industryCategory = 'Required'
      if (!form.address) newErrors.address = 'Required'
    }
    if (activeTab === 'owner') {
      if (!form.ownerName) newErrors.ownerName = 'Required'
      if (!form.ownerDob) newErrors.ownerDob = 'Required'
      if (!form.ownerNationality) newErrors.ownerNationality = 'Required'
      if (!form.ownerRole) newErrors.ownerRole = 'Required'
      if (!form.ownerResidentialAddress) newErrors.ownerResidentialAddress = 'Required'
      if (!form.primaryPhone) newErrors.primaryPhone = 'Required'
      if (!form.email) newErrors.email = 'Required'
    }
    if (activeTab === 'payouts' && form.country) {
      if (isWestAfrica) {
        if (!form.payoutMethod) newErrors.payoutMethod = 'Required'
        if (!form.accountName) newErrors.accountName = 'Required'
        if (form.payoutMethod === 'Mobile Money') {
          if (!form.mobileMoneyProvider) newErrors.mobileMoneyProvider = 'Required'
          if (!form.mobileMoneyNumber) newErrors.mobileMoneyNumber = 'Required'
        }
        if (form.payoutMethod === 'Bank Transfer') {
          if (!form.bankName) newErrors.bankName = 'Required'
          if (!form.accountNumber) newErrors.accountNumber = 'Required'
        }
      }
      if (isStripe) {
        if (!form.stripeAccountHolderName) newErrors.stripeAccountHolderName = 'Required'
        if (!form.stripeIban) newErrors.stripeIban = 'Required'
      }
    }
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return }
    setErrors({})
    setSaving(true)
    await updatePartner(uid, { ...form, beneficialOwners })
    await updateSectionStatus(uid, 'basics', basicsOk && ownerOk ? 'complete' : 'in_progress')
    await updateSectionStatus(uid, 'payouts', payoutsOk ? 'complete' : 'in_progress')
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2500)
  }

  const addBO = () => setBeneficialOwners(p => [...p, { name: '', dob: '', ownershipPct: '' }])
  const removeBO = (i: number) => setBeneficialOwners(p => p.filter((_, idx) => idx !== i))
  const setBO = (i: number, f: keyof BeneficialOwner, v: string) =>
    setBeneficialOwners(p => p.map((o, idx) => idx === i ? { ...o, [f]: v } : o))

  const TABS = [
    { key: 'business', label: 'Business' },
    { key: 'owner', label: 'Owner / KYC' },
    { key: 'payouts', label: 'Payouts' },
  ] as const

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <p style={{ fontFamily: 'var(--font-sans)', color: 'rgba(190,154,86,0.8)', fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 0.5rem' }}>Business Profile</p>
        <h1 style={{ fontFamily: 'var(--font-display)', color: 'var(--db-text)', fontSize: 'clamp(1.375rem, 3vw, 1.625rem)', fontWeight: 400, letterSpacing: '0.06em', margin: 0 }}>Your Business Details</h1>
      </div>

      <div style={{ display: 'flex', marginBottom: '2rem', borderBottom: '1px solid var(--db-border-subtle)' }}>
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            style={{ padding: '0.625rem 1.5rem', background: 'transparent', border: 'none', borderBottom: activeTab === tab.key ? '2px solid #be9a56' : '2px solid transparent', color: activeTab === tab.key ? 'var(--db-gold)' : 'var(--db-text-muted)', fontSize: '0.8125rem', fontFamily: 'var(--font-sans)', letterSpacing: '0.06em', cursor: 'pointer', textTransform: 'uppercase', transition: 'color 0.15s' }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Business tab ── */}
      {activeTab === 'business' && (
        <div>
          <div style={row}>
            <div><label style={lbl}>Legal business name *</label><input style={{...inp,...err('legalName')}} placeholder="As registered" value={form.legalName} onChange={e => set('legalName', e.target.value)} />{errMsg('legalName')}</div>
            <div><label style={lbl}>Trading / brand name</label><input style={inp} placeholder='e.g. "Atlantic Yachting Sénégal"' value={form.tradingName} onChange={e => set('tradingName', e.target.value)} /></div>
          </div>
          <div style={row}>
            <div>
              <label style={lbl}>Business type *</label>
              <select style={{...sel,...err('businessType')}} value={form.businessType} onChange={e => set('businessType', e.target.value)}>
                <option value="">Select type</option>
                <option value="Individual">Individual / Sole trader</option>
                <option value="Registered Company">Registered Company</option>
                <option value="Cooperative">Cooperative</option>
              </select>
              {errMsg('businessType')}
            </div>
            <div>
              <label style={lbl}>Country of registration *</label>
              <select style={{...sel,...err('country')}} value={form.country} onChange={e => set('country', e.target.value)}>
                {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
              </select>
              {errMsg('country')}
            </div>
          </div>
          <div style={row}>
            <div>
              <label style={lbl}>NINEA (tax ID) *</label>
              <input style={{...inp,...err('taxId')}} placeholder="e.g. 1234567A" value={form.taxId} onChange={e => set('taxId', e.target.value)} />
              {errMsg('taxId')}
              <p style={hint}>7 digits followed by a check letter — Senegalese tax identifier</p>
            </div>
            {isCompany && (
              <div>
                <label style={lbl}>RCCM registration number</label>
                <input style={inp} placeholder="Business registration number" value={form.registrationNumber} onChange={e => set('registrationNumber', e.target.value)} />
              </div>
            )}
          </div>
          <div style={row}>
            <div>
              <label style={lbl}>Industry / experience category *</label>
              <select style={{...sel,...err('industryCategory')}} value={form.industryCategory} onChange={e => set('industryCategory', e.target.value)}>
                <option value="">Select category</option>
                {INDUSTRY_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {errMsg('industryCategory')}
            </div>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={lbl}>Registered business address *</label>
            <input style={{...inp,...err('address')}} placeholder="Street, city, region" value={form.address} onChange={e => set('address', e.target.value)} />
            {errMsg('address')}
          </div>
          <div style={row}>
            <div>
              <label style={lbl}>Website or social link</label>
              <input style={inp} type="url" placeholder="https://" value={form.websiteOrSocial} onChange={e => set('websiteOrSocial', e.target.value)} />
            </div>
            <div>
              <label style={lbl}>Google Maps link</label>
              <input style={inp} placeholder="Paste a Google Maps pin link" value={form.mapsLink} onChange={e => set('mapsLink', e.target.value)} />
            </div>
          </div>

          {isCompany && (
            <div style={{ marginTop: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <h2 style={{ ...h2s, margin: 0 }}>Beneficial owners</h2>
                <button onClick={addBO}
                  style={{ padding: '0.375rem 0.875rem', background: 'transparent', border: '1px solid rgba(190,154,86,0.3)', borderRadius: '0.25rem', color: 'var(--db-gold)', fontSize: '0.75rem', fontFamily: 'var(--font-sans)', cursor: 'pointer', letterSpacing: '0.04em' }}>
                  + Add owner
                </button>
              </div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--db-text-muted)', fontFamily: 'var(--font-sans)', marginBottom: '1rem', lineHeight: 1.5 }}>
                List all individuals who directly or indirectly own 25% or more of the company.
              </p>
              {beneficialOwners.length === 0 && (
                <div style={{ padding: '1.25rem', background: 'var(--db-bg-card)', border: '1px dashed var(--db-border-dashed)', borderRadius: '0.375rem', textAlign: 'center' }}>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--db-text-faint)', fontFamily: 'var(--font-sans)', margin: 0 }}>No beneficial owners added yet</p>
                </div>
              )}
              {beneficialOwners.map((bo, i) => (
                <div key={i} style={{ background: 'var(--db-bg-card)', border: '1px solid var(--db-border-subtle)', borderRadius: '0.5rem', padding: '1rem 1.25rem', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '0.6875rem', color: 'var(--db-text-faint)', fontFamily: 'var(--font-sans)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Owner {i + 1}</span>
                    <button onClick={() => removeBO(i)} style={{ background: 'none', border: 'none', color: 'var(--db-text-faint)', fontSize: '0.8125rem', cursor: 'pointer', fontFamily: 'var(--font-sans)', padding: '0.125rem 0.375rem' }}>Remove</button>
                  </div>
                  <div style={row}>
                    <div><label style={lbl}>Full legal name</label><input style={inp} placeholder="As on ID" value={bo.name} onChange={e => setBO(i, 'name', e.target.value)} /></div>
                    <div><label style={lbl}>Date of birth</label><input style={inp} type="date" value={bo.dob} onChange={e => setBO(i, 'dob', e.target.value)} /></div>
                    <div><label style={lbl}>Ownership %</label><input style={inp} type="number" min="25" max="100" placeholder="e.g. 51" value={bo.ownershipPct} onChange={e => setBO(i, 'ownershipPct', e.target.value)} /></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Owner / KYC tab ── */}
      {activeTab === 'owner' && (
        <div>
          <h2 style={h2s}>Personal identity</h2>
          <div style={row}>
            <div><label style={lbl}>Full legal name *</label><input style={{...inp,...err('ownerName')}} placeholder="As on government ID" value={form.ownerName} onChange={e => set('ownerName', e.target.value)} />{errMsg('ownerName')}</div>
            <div><label style={lbl}>Date of birth *</label><input style={{...inp,...err('ownerDob')}} type="date" value={form.ownerDob} onChange={e => set('ownerDob', e.target.value)} />{errMsg('ownerDob')}</div>
          </div>
          <div style={row}>
            <div>
              <label style={lbl}>Nationality *</label>
              <select style={{...sel,...err('ownerNationality')}} value={form.ownerNationality} onChange={e => set('ownerNationality', e.target.value)}>
                <option value="">Select nationality</option>
                {COUNTRIES.filter(c => c.code).map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
              </select>
              {errMsg('ownerNationality')}
            </div>
            <div>
              <label style={lbl}>Role in business *</label>
              <select style={{...sel,...err('ownerRole')}} value={form.ownerRole} onChange={e => set('ownerRole', e.target.value)}>
                <option value="">Select role</option>
                <option value="Owner">Owner</option>
                <option value="Director">Director</option>
                <option value="Representative">Representative</option>
              </select>
              {errMsg('ownerRole')}
            </div>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={lbl}>Residential address *</label>
            <input style={{...inp,...err('ownerResidentialAddress')}} placeholder="Personal home address (not business address)" value={form.ownerResidentialAddress} onChange={e => set('ownerResidentialAddress', e.target.value)} />
            {errMsg('ownerResidentialAddress')}
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={lbl}>Personal tax ID</label>
            <input style={inp} placeholder="Where applicable by country" value={form.ownerPersonalTaxId} onChange={e => set('ownerPersonalTaxId', e.target.value)} />
          </div>

          <h2 style={h2s}>Contact details</h2>
          <div style={row}>
            <div><label style={lbl}>Email *</label><input style={{...inp,...err('email')}} type="email" placeholder="For booking confirmations" value={form.email} onChange={e => set('email', e.target.value)} />{errMsg('email')}</div>
            <div><label style={lbl}>Primary phone *</label><input style={{...inp,...err('primaryPhone')}} type="tel" placeholder="+221 77 000 0000" value={form.primaryPhone} onChange={e => set('primaryPhone', e.target.value)} />{errMsg('primaryPhone')}</div>
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={lbl}>WhatsApp number</label>
            <input style={inp} type="tel" placeholder="If different from primary phone" value={form.whatsapp} onChange={e => set('whatsapp', e.target.value)} />
          </div>
        </div>
      )}

      {/* ── Payouts tab ── */}
      {activeTab === 'payouts' && (
        <div>
          {!form.country && (
            <div style={{ background: 'rgba(158,118,59,0.06)', border: '1px solid rgba(158,118,59,0.2)', borderRadius: '0.375rem', padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
              <p style={{ fontSize: '0.8125rem', color: 'var(--db-text-muted)', fontFamily: 'var(--font-sans)', margin: 0, lineHeight: 1.5 }}>
                Set your country of registration in the Business tab to see the correct payout options.
              </p>
            </div>
          )}

          {isWestAfrica && (
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(158,118,59,0.08)', border: '1px solid rgba(158,118,59,0.25)', borderRadius: '0.25rem', padding: '0.375rem 0.875rem', marginBottom: '1.5rem' }}>
                <div style={{ width: '0.375rem', height: '0.375rem', borderRadius: '50%', background: 'var(--db-gold-deep)' }} />
                <span style={{ fontSize: '0.75rem', color: 'var(--db-gold)', fontFamily: 'var(--font-sans)', letterSpacing: '0.04em' }}>Payout rail: PayDunya</span>
              </div>
              <div style={row}>
                <div>
                  <label style={lbl}>Payout method *</label>
                  <select style={sel} value={form.payoutMethod} onChange={e => set('payoutMethod', e.target.value)}>
                    <option value="">Select method</option>
                    <option value="Mobile Money">Mobile Money</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                </div>
                <div>
                  <label style={lbl}>Payout currency *</label>
                  <select style={sel} value={form.payoutCurrency} onChange={e => set('payoutCurrency', e.target.value)}>
                    {PAYOUT_CURRENCIES_WA.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              {form.payoutMethod === 'Mobile Money' && (
                <div style={row}>
                  <div>
                    <label style={lbl}>Mobile money provider *</label>
                    <select style={sel} value={form.mobileMoneyProvider} onChange={e => set('mobileMoneyProvider', e.target.value)}>
                      <option value="">Select provider</option>
                      {MOBILE_MONEY_PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>Mobile money number *</label>
                    <input style={inp} type="tel" placeholder="+221 77 000 0000" value={form.mobileMoneyNumber} onChange={e => set('mobileMoneyNumber', e.target.value)} />
                    <p style={hint}>Include country code</p>
                  </div>
                </div>
              )}
              <div style={{ marginBottom: '1rem' }}>
                <label style={lbl}>Account holder name *</label>
                <input style={inp} placeholder="Must match your government ID" value={form.accountName} onChange={e => set('accountName', e.target.value)} />
              </div>
              {form.payoutMethod === 'Bank Transfer' && (
                <div style={row}>
                  <div><label style={lbl}>Bank name *</label><input style={inp} placeholder="Bank name" value={form.bankName} onChange={e => set('bankName', e.target.value)} /></div>
                  <div><label style={lbl}>Account number *</label><input style={inp} placeholder="Bank account number" value={form.accountNumber} onChange={e => set('accountNumber', e.target.value)} /></div>
                  <div><label style={lbl}>IBAN</label><input style={inp} placeholder="If applicable" value={form.iban} onChange={e => set('iban', e.target.value)} /></div>
                </div>
              )}
            </div>
          )}

          {isStripe && (
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(158,118,59,0.08)', border: '1px solid rgba(158,118,59,0.25)', borderRadius: '0.25rem', padding: '0.375rem 0.875rem', marginBottom: '1.5rem' }}>
                <div style={{ width: '0.375rem', height: '0.375rem', borderRadius: '50%', background: 'var(--db-gold-deep)' }} />
                <span style={{ fontSize: '0.75rem', color: 'var(--db-gold)', fontFamily: 'var(--font-sans)', letterSpacing: '0.04em' }}>Payout rail: Stripe Connect</span>
              </div>
              <div style={row}>
                <div><label style={lbl}>Account holder name *</label><input style={inp} placeholder="As on bank account" value={form.stripeAccountHolderName} onChange={e => set('stripeAccountHolderName', e.target.value)} /></div>
                <div><label style={lbl}>Bank name *</label><input style={inp} placeholder="Bank name" value={form.stripeBankName} onChange={e => set('stripeBankName', e.target.value)} /></div>
              </div>
              <div style={row}>
                <div><label style={lbl}>IBAN / account number *</label><input style={inp} placeholder="IBAN or account number" value={form.stripeIban} onChange={e => set('stripeIban', e.target.value)} /></div>
                <div><label style={lbl}>Routing / SWIFT</label><input style={inp} placeholder="SWIFT BIC or routing number" value={form.stripeRouting} onChange={e => set('stripeRouting', e.target.value)} /></div>
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={lbl}>Payout currency *</label>
                <select style={sel} value={form.stripeCurrency} onChange={e => set('stripeCurrency', e.target.value)}>
                  {PAYOUT_CURRENCIES_STRIPE.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          )}

          {form.country && !isWestAfrica && !isStripe && (
            <div style={{ background: 'var(--db-bg-card)', border: '1px solid var(--db-border-subtle)', borderRadius: '0.5rem', padding: '1.25rem 1.5rem' }}>
              <p style={{ fontSize: '0.875rem', color: 'var(--db-text-muted)', fontFamily: 'var(--font-sans)', margin: 0, lineHeight: 1.6 }}>
                Payout support for <strong style={{ color: 'var(--db-text)' }}>{COUNTRIES.find(c => c.code === form.country)?.name}</strong> is not yet configured. Please contact Palmera to discuss payout options.
              </p>
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--db-border-subtle)', marginTop: '1.5rem' }}>
        <button onClick={handleSave} disabled={saving}
          style={{ padding: '0.75rem 2rem', background: 'var(--db-gold-deep)', border: 'none', borderRadius: '0.375rem', color: '#ebe8db', fontSize: '0.875rem', fontFamily: 'var(--font-sans)', letterSpacing: '0.06em', cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Saving...' : 'Save changes'}
        </button>
        {saved && <span style={{ fontSize: '0.8125rem', color: 'var(--db-gold)', fontFamily: 'var(--font-sans)' }}>✓ Saved</span>}
      </div>
    </div>
  )
}
