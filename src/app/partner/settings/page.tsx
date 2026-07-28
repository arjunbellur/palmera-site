'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePartner } from '../PartnerContext'
import { t } from '../i18n'
import { useTheme } from '@/lib/theme'
import { formatDate } from '@/lib/money'
import { changePassword } from '@/lib/auth'
import { updateProvider, updateCompany, getPayoutProfile, setPayoutProfile, getExperiencesByCompany, updateExperience } from '@/lib/firestore'
import { getEnabledCategories, getEnabledCities } from '@/lib/config'
import type { CompanyPayoutProfile } from '@/lib/schema'
import PhotoUpload from '@/components/dashboard/PhotoUpload'
import GalleryUpload from '@/components/dashboard/GalleryUpload'
import { ScreenHeader, SectionTitle, card, eyebrow, GhostButton, bodyText } from '@/components/partner/ui'

const inputStyle: React.CSSProperties = { width: '100%', background: 'var(--pf-card)', border: '1px solid var(--pf-border)', borderRadius: '10px', padding: '9px 13px', color: 'var(--pf-text)', fontFamily: 'var(--font-sans)', fontSize: '12.5px', outline: 'none', boxSizing: 'border-box' }

type PoMethod = CompanyPayoutProfile['method']

const EMPTY_CO = { name: '', legalName: '', category: '', city: '', address: '', mapsLink: '', websiteOrSocial: '' }

export default function SettingsScreen() {
  const router = useRouter()
  const { uid, provider, email, company, companies, locale, setLocale, setCompanyId, refresh } = usePartner()
  const { theme, toggle } = useTheme()
  const L = (k: string) => t(locale, k)
  const [logo, setLogo] = useState(provider?.logo || '')

  // Company profile editing — the onboarding info a graduated partner could
  // no longer reach anywhere (Jordan's catch).
  const [coEditing, setCoEditing] = useState(false)
  const [coSaving, setCoSaving] = useState(false)
  const [coSaved, setCoSaved] = useState(false)
  const [coForm, setCoForm] = useState(EMPTY_CO)
  const [cats, setCats] = useState<{ id: string; name: string }[]>([])
  const [cities, setCities] = useState<{ id: string; name: string }[]>([])

  // Payout details — the partner's own, per company (Jordan: biggest omission).
  const [poEditing, setPoEditing] = useState(false)
  const [poSaved, setPoSaved] = useState(false)
  const [po, setPo] = useState<{ method: PoMethod; accountName: string; phone: string; bankName: string; accountRef: string }>({
    method: 'wave', accountName: '', phone: '', bankName: '', accountRef: '',
  })
  const [poLoaded, setPoLoaded] = useState<CompanyPayoutProfile | null>(null)

  // Contact & hours — light operational info Jordan asked for.
  const [contact, setContact] = useState({ phone: '', whatsapp: '', hours: '', opsName: '', opsWa: '' })
  const [contactSaved, setContactSaved] = useState(false)

  // Change password — reauthenticates with the current one, then updates.
  const [pwOpen, setPwOpen] = useState(false)
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
  const [pwBusy, setPwBusy] = useState(false)
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const savePassword = async () => {
    setPwMsg(null)
    if (pw.next.length < 6) { setPwMsg({ ok: false, text: L('pw_short') }); return }
    if (pw.next !== pw.confirm) { setPwMsg({ ok: false, text: L('pw_mismatch') }); return }
    setPwBusy(true)
    try {
      await changePassword(pw.current, pw.next)
      setPw({ current: '', next: '', confirm: '' })
      setPwOpen(false)
      setPwMsg({ ok: true, text: L('pw_saved') })
      setTimeout(() => setPwMsg(null), 3000)
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code
      setPwMsg({ ok: false, text: code === 'auth/wrong-password' || code === 'auth/invalid-credential' ? L('pw_wrong') : L('pw_error') })
    }
    setPwBusy(false)
  }

  useEffect(() => {
    getEnabledCategories().then(setCats)
    getEnabledCities().then(setCities)
  }, [])

  useEffect(() => {
    if (!company?.id) return
    getPayoutProfile(company.id).then(p => {
      setPoLoaded(p)
      if (p) setPo({ method: p.method, accountName: p.accountName || '', phone: p.phone || '', bankName: p.bankName || '', accountRef: p.accountRef || '' })
    })
    const ops = (company.operations as Record<string, unknown>) || {}
    setContact({
      phone: company.phone || '',
      whatsapp: company.whatsapp || '',
      hours: String(ops.businessHours || ''),
      opsName: String(ops.opsContactName || ''),
      opsWa: String(ops.opsContactWhatsapp || ''),
    })
    setCoForm({
      name: company.name || '', legalName: company.legalName || '',
      category: company.category || '', city: company.city || '',
      address: company.address || '', mapsLink: company.mapsLink || '',
      websiteOrSocial: company.websiteOrSocial || '',
    })
    setCoEditing(false)
  }, [company?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const saveCompany = async () => {
    if (!company?.id || !coForm.name.trim()) return
    setCoSaving(true)
    const renamed = coForm.name.trim() !== (company.name || '')
    await updateCompany(company.id, {
      name: coForm.name.trim(), legalName: coForm.legalName.trim(),
      category: coForm.category, city: coForm.city,
      address: coForm.address.trim(),
      mapsLink: coForm.mapsLink.trim() || null,
      websiteOrSocial: coForm.websiteOrSocial.trim() || null,
    })
    // Rename fanout: experiences carry a denormalized display name the app
    // shows; without Cloud Functions we update the company's own listings here.
    if (renamed) {
      const exps = await getExperiencesByCompany(uid, company.id)
      await Promise.all(exps.map(e => updateExperience(e.id!, { provider: coForm.name.trim() })))
    }
    await refresh()
    setCoSaving(false); setCoEditing(false)
    setCoSaved(true); setTimeout(() => setCoSaved(false), 2500)
  }

  // Company photos auto-persist on upload, then refresh so the pill updates.
  const persistCoPhotos = async (patch: Record<string, unknown>) => {
    if (!company?.id) return
    await updateCompany(company.id, patch)
    await refresh()
  }

  const isMobileMoney = po.method !== 'bank_transfer'
  const poComplete = !!po.accountName && (isMobileMoney ? !!po.phone : !!(po.bankName && po.accountRef))

  const savePo = async () => {
    if (!company?.id || !poComplete) return
    const data = {
      method: po.method, accountName: po.accountName.trim(),
      phone: isMobileMoney ? po.phone.trim() : null,
      bankName: !isMobileMoney ? po.bankName.trim() : null,
      accountRef: !isMobileMoney ? po.accountRef.trim() : null,
    }
    await setPayoutProfile(company.id, data)
    setPoLoaded({ ...data, updatedAt: new Date() as unknown as CompanyPayoutProfile['updatedAt'] })
    setPoEditing(false); setPoSaved(true); setTimeout(() => setPoSaved(false), 2500)
  }

  const saveContact = async () => {
    if (!company?.id) return
    await updateCompany(company.id, {
      phone: contact.phone.trim(), whatsapp: contact.whatsapp.trim(),
      operations: {
        ...((company.operations as Record<string, unknown>) || {}),
        businessHours: contact.hours.trim(),
        opsContactName: contact.opsName.trim(),
        opsContactWhatsapp: contact.opsWa.trim(),
      },
    })
    await refresh()
    setContactSaved(true); setTimeout(() => setContactSaved(false), 2500)
  }

  const mask = (s: string) => (s.length > 4 ? `${s.slice(0, 3)} ••• ${s.slice(-2)}` : s)
  const methodLabel: Record<PoMethod, string> = { wave: L('po_wave'), orange_money: L('po_om'), bank_transfer: L('po_bank') }

  const signOut = async () => {
    const { logOut } = await import('@/lib/auth')
    await logOut()
    router.push('/dashboard')
  }

  const row = (label: string, value: string) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', padding: '10px 0', borderTop: '1px solid var(--pf-border)' }}>
      <span style={eyebrow}>{label}</span>
      <span style={{ fontFamily: 'var(--font-serif)', color: 'var(--pf-text)', fontSize: '13.5px', textAlign: 'right' }}>{value || '—'}</span>
    </div>
  )

  return (
    <div className="pf-in">
      <ScreenHeader label={L('set_label')} title={L('set_title')} />

      {/* Account */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span style={{ width: '46px', height: '46px', borderRadius: '13px', background: 'var(--pf-green-soft)', color: 'var(--pf-gold)', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-display)', fontSize: '19px', flexShrink: 0, overflow: 'hidden' }}>
            {logo ? <img src={logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (provider?.fullName || email || '?').charAt(0).toUpperCase()}
          </span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-serif)', color: 'var(--pf-text)', fontSize: '15px' }}>{provider?.fullName || (locale === 'fr' ? 'Votre nom' : 'Your name')}</div>
            <div style={{ ...eyebrow, marginTop: '4px', textTransform: 'none', letterSpacing: '0.03em' }}>{provider?.primaryPhone || '—'} · {email}</div>
          </div>
        </div>
        <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid var(--pf-border)' }}>
          <div style={{ ...eyebrow, marginBottom: '4px' }}>{L('your_logo')}</div>
          <p style={{ ...bodyText, fontSize: '0.75rem', margin: '0 0 10px' }}>{L('logo_hint')}</p>
          <div style={{ maxWidth: '18rem' }}>
            <PhotoUpload uid={uid} label={L('your_logo')} fieldName="provider_logo" existingUrl={logo}
              hint={locale === 'fr' ? 'Carré, PNG transparent de préférence' : 'Square, transparent PNG preferred'}
              onUploaded={async (url) => { setLogo(url); await updateProvider(uid, { logo: url }) }} />
          </div>
        </div>
      </div>

      {/* Password */}
      <SectionTitle action={pwMsg?.ok ? <span style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', color: 'var(--pf-success)' }}>{pwMsg.text}</span> : undefined}>
        {L('pw_title')}
      </SectionTitle>
      <div style={card}>
        {!pwOpen ? (
          <GhostButton onClick={() => { setPwOpen(true); setPwMsg(null) }}>{L('pw_change')}</GhostButton>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 13rem), 1fr))', gap: '10px', marginBottom: '12px' }}>
              <div>
                <div style={{ ...eyebrow, marginBottom: '5px' }}>{L('pw_current')}</div>
                <input style={inputStyle} type="password" autoComplete="current-password" value={pw.current} onChange={e => setPw(p => ({ ...p, current: e.target.value }))} />
              </div>
              <div>
                <div style={{ ...eyebrow, marginBottom: '5px' }}>{L('pw_new')}</div>
                <input style={inputStyle} type="password" autoComplete="new-password" value={pw.next} onChange={e => setPw(p => ({ ...p, next: e.target.value }))} />
              </div>
              <div>
                <div style={{ ...eyebrow, marginBottom: '5px' }}>{L('pw_confirm')}</div>
                <input style={inputStyle} type="password" autoComplete="new-password" value={pw.confirm} onChange={e => setPw(p => ({ ...p, confirm: e.target.value }))} />
              </div>
            </div>
            {pwMsg && !pwMsg.ok && (
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: 'var(--pf-alert)', margin: '0 0 10px' }}>{pwMsg.text}</p>
            )}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={savePassword} disabled={pwBusy || !pw.current || !pw.next || !pw.confirm}
                style={{ padding: '9px 18px', background: pw.current && pw.next && pw.confirm ? 'var(--pf-gold-deep)' : 'var(--pf-card)', border: 'none', borderRadius: '10px', color: pw.current && pw.next && pw.confirm ? '#ebe8db' : 'var(--pf-faint)', fontFamily: 'var(--font-sans)', fontSize: '12.5px', cursor: pwBusy ? 'wait' : 'pointer', opacity: pwBusy ? 0.6 : 1 }}>
                {L('po_save')}
              </button>
              <GhostButton onClick={() => { setPwOpen(false); setPw({ current: '', next: '', confirm: '' }); setPwMsg(null) }}>{L('cancel')}</GhostButton>
            </div>
          </>
        )}
      </div>

      {/* Company — view, or full onboarding-profile edit (Jordan's catch). */}
      <SectionTitle action={coSaved ? <span style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', color: 'var(--pf-success)' }}>{L('po_saved')}</span> : undefined}>
        {L('sec_company')}
      </SectionTitle>
      {!coEditing ? (
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ fontFamily: 'var(--font-display)', color: 'var(--pf-head)', fontSize: '1.0625rem', letterSpacing: '0.03em' }}>{company?.name}</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <GhostButton onClick={() => setCoEditing(true)}>{L('edit')}</GhostButton>
              {companies.length > 1 && (
                <GhostButton onClick={() => setCompanyId(companies.find(c => c.id !== company?.id)?.id || company!.id!)}>{L('switch_company')}</GhostButton>
              )}
            </div>
          </div>
          <div style={{ marginTop: '10px' }}>
            {row(L('co_city'), cities.find(c => c.id === company?.city)?.name || company?.city || '')}
            {row(L('co_category'), cats.find(c => c.id === company?.category)?.name || company?.category || '')}
            {row(L('co_address'), company?.address || '')}
            {row(L('activated'), company?.activatedAt ? formatDate(company.activatedAt) : '—')}
            {row(L('comm_window'), '10%')}
          </div>
        </div>
      ) : (
        <div style={card}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 13rem), 1fr))', gap: '10px', marginBottom: '10px' }}>
            <div>
              <div style={{ ...eyebrow, marginBottom: '5px' }}>{L('co_name')} *</div>
              <input style={inputStyle} value={coForm.name} onChange={e => setCoForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <div style={{ ...eyebrow, marginBottom: '5px' }}>{L('co_legal')}</div>
              <input style={inputStyle} value={coForm.legalName} onChange={e => setCoForm(f => ({ ...f, legalName: e.target.value }))} />
            </div>
            <div>
              <div style={{ ...eyebrow, marginBottom: '5px' }}>{L('co_category')}</div>
              <select style={{ ...inputStyle, appearance: 'none' }} value={coForm.category} onChange={e => setCoForm(f => ({ ...f, category: e.target.value }))}>
                <option value="">{L('select')}</option>
                {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <div style={{ ...eyebrow, marginBottom: '5px' }}>{L('co_city')}</div>
              <select style={{ ...inputStyle, appearance: 'none' }} value={coForm.city} onChange={e => setCoForm(f => ({ ...f, city: e.target.value }))}>
                <option value="">{L('select')}</option>
                {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <div style={{ ...eyebrow, marginBottom: '5px' }}>{L('co_address')}</div>
              <input style={inputStyle} value={coForm.address} onChange={e => setCoForm(f => ({ ...f, address: e.target.value }))} />
            </div>
            <div>
              <div style={{ ...eyebrow, marginBottom: '5px' }}>{L('co_maps')}</div>
              <input style={inputStyle} type="url" value={coForm.mapsLink} onChange={e => setCoForm(f => ({ ...f, mapsLink: e.target.value }))} />
            </div>
            <div>
              <div style={{ ...eyebrow, marginBottom: '5px' }}>{L('co_web')}</div>
              <input style={inputStyle} value={coForm.websiteOrSocial} onChange={e => setCoForm(f => ({ ...f, websiteOrSocial: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={saveCompany} disabled={coSaving || !coForm.name.trim()}
              style={{ padding: '9px 18px', background: coForm.name.trim() ? 'var(--pf-gold-deep)' : 'var(--pf-card)', border: 'none', borderRadius: '10px', color: coForm.name.trim() ? '#ebe8db' : 'var(--pf-faint)', fontFamily: 'var(--font-sans)', fontSize: '12.5px', cursor: coForm.name.trim() && !coSaving ? 'pointer' : 'not-allowed', opacity: coSaving ? 0.6 : 1 }}>
              {coSaving ? '…' : L('po_save')}
            </button>
            <GhostButton onClick={() => setCoEditing(false)}>{L('cancel')}</GhostButton>
          </div>
        </div>
      )}

      {/* Company photos — hero, logo, gallery; auto-persist on upload. */}
      <SectionTitle>{L('co_photos')}</SectionTitle>
      <div style={card}>
        <p style={{ ...bodyText, fontSize: '0.75rem', margin: '0 0 12px' }}>{L('co_photos_hint')}</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 14rem), 1fr))', gap: '12px', marginBottom: '14px' }}>
          <div>
            <div style={{ ...eyebrow, marginBottom: '6px' }}>{L('co_hero')}</div>
            <PhotoUpload uid={uid} label={L('co_hero')} fieldName={`company_${company?.id}_hero`} existingUrl={company?.heroPhoto || ''}
              onUploaded={(url) => persistCoPhotos({ heroPhoto: url })} />
          </div>
          <div>
            <div style={{ ...eyebrow, marginBottom: '6px' }}>{L('co_logo')}</div>
            <PhotoUpload uid={uid} label={L('co_logo')} fieldName={`company_${company?.id}_logo`} existingUrl={company?.logo || ''}
              hint={locale === 'fr' ? 'Carré, PNG transparent de préférence' : 'Square, transparent PNG preferred'}
              onUploaded={(url) => persistCoPhotos({ logo: url })} />
          </div>
        </div>
        <div style={{ ...eyebrow, marginBottom: '6px' }}>{L('co_gallery')}</div>
        <GalleryUpload uid={uid} value={company?.gallery || []} onChange={(urls) => persistCoPhotos({ gallery: urls })} />
      </div>

      {/* Payout details — owner-entered, per company. */}
      <SectionTitle>{L('sec_payout')}</SectionTitle>
      {!poEditing && poLoaded ? (
        <div style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
            <span style={{ width: '34px', height: '34px', borderRadius: '50%', border: '1px solid var(--pf-border-strong)', display: 'grid', placeItems: 'center', color: 'var(--pf-gold)', fontSize: '13px' }}>◆</span>
            <div>
              <div style={{ fontFamily: 'var(--font-serif)', color: 'var(--pf-text)', fontSize: '14px' }}>
                {methodLabel[poLoaded.method]} — {poLoaded.accountName}
              </div>
              <div style={{ ...eyebrow, marginTop: '3px', textTransform: 'none' }}>
                {poLoaded.method === 'bank_transfer' ? `${poLoaded.bankName} · ${mask(poLoaded.accountRef || '')}` : mask(poLoaded.phone || '')}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {poSaved && <span style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', color: 'var(--pf-success)' }}>{L('po_saved')}</span>}
            <GhostButton onClick={() => setPoEditing(true)}>{L('edit')}</GhostButton>
          </div>
        </div>
      ) : !poEditing ? (
        <div style={{ ...card, borderStyle: 'dashed' }}>
          <div style={{ fontFamily: 'var(--font-serif)', color: 'var(--pf-text)', fontSize: '14px' }}>{L('payout_none_t')}</div>
          <p style={{ ...bodyText, fontSize: '0.8125rem', margin: '6px 0 12px' }}>{L('payout_none_b')}</p>
          <GhostButton onClick={() => setPoEditing(true)}>+ {L('po_add')}</GhostButton>
        </div>
      ) : (
        <div style={card}>
          <div style={{ ...eyebrow, marginBottom: '8px' }}>{L('po_method')}</div>
          <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap', marginBottom: '14px' }}>
            {(['wave', 'orange_money', 'bank_transfer'] as PoMethod[]).map(m => (
              <button key={m} onClick={() => setPo(p => ({ ...p, method: m }))}
                style={{ padding: '7px 14px', borderRadius: '999px', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: '11.5px', border: `1px solid ${po.method === m ? 'var(--pf-border-strong)' : 'var(--pf-border)'}`, background: po.method === m ? 'var(--pf-card)' : 'transparent', color: po.method === m ? 'var(--pf-gold)' : 'var(--pf-faint)' }}>
                {methodLabel[m]}
              </button>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 13rem), 1fr))', gap: '10px', marginBottom: '14px' }}>
            <div>
              <div style={{ ...eyebrow, marginBottom: '5px' }}>{L('po_name')}</div>
              <input style={inputStyle} value={po.accountName} onChange={e => setPo(p => ({ ...p, accountName: e.target.value }))} />
            </div>
            {isMobileMoney ? (
              <div>
                <div style={{ ...eyebrow, marginBottom: '5px' }}>{L('po_phone')}</div>
                <input style={inputStyle} placeholder="+221 …" value={po.phone} onChange={e => setPo(p => ({ ...p, phone: e.target.value }))} />
              </div>
            ) : (
              <>
                <div>
                  <div style={{ ...eyebrow, marginBottom: '5px' }}>{L('po_bankname')}</div>
                  <input style={inputStyle} value={po.bankName} onChange={e => setPo(p => ({ ...p, bankName: e.target.value }))} />
                </div>
                <div>
                  <div style={{ ...eyebrow, marginBottom: '5px' }}>{L('po_ref')}</div>
                  <input style={inputStyle} value={po.accountRef} onChange={e => setPo(p => ({ ...p, accountRef: e.target.value }))} />
                </div>
              </>
            )}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={savePo} disabled={!poComplete}
              style={{ padding: '9px 18px', background: poComplete ? 'var(--pf-gold-deep)' : 'var(--pf-card)', border: 'none', borderRadius: '10px', color: poComplete ? '#ebe8db' : 'var(--pf-faint)', fontFamily: 'var(--font-sans)', fontSize: '12.5px', cursor: poComplete ? 'pointer' : 'not-allowed' }}>
              {L('po_save')}
            </button>
            <GhostButton onClick={() => setPoEditing(false)}>{locale === 'fr' ? 'Annuler' : 'Cancel'}</GhostButton>
          </div>
        </div>
      )}

      {/* Contact & hours */}
      <SectionTitle>{L('sec_contact')}</SectionTitle>
      <div style={card}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 13rem), 1fr))', gap: '10px', marginBottom: '12px' }}>
          <div>
            <div style={{ ...eyebrow, marginBottom: '5px' }}>{L('phone_label')}</div>
            <input style={inputStyle} value={contact.phone} onChange={e => setContact(c => ({ ...c, phone: e.target.value }))} />
          </div>
          <div>
            <div style={{ ...eyebrow, marginBottom: '5px' }}>{L('whatsapp_label')}</div>
            <input style={inputStyle} value={contact.whatsapp} onChange={e => setContact(c => ({ ...c, whatsapp: e.target.value }))} />
          </div>
          <div>
            <div style={{ ...eyebrow, marginBottom: '5px' }}>{L('ops_name')}</div>
            <input style={inputStyle} placeholder={locale === 'fr' ? 'Qui gère les réservations au quotidien' : 'Who handles bookings day-to-day'} value={contact.opsName} onChange={e => setContact(c => ({ ...c, opsName: e.target.value }))} />
          </div>
          <div>
            <div style={{ ...eyebrow, marginBottom: '5px' }}>{L('ops_wa')}</div>
            <input style={inputStyle} value={contact.opsWa} onChange={e => setContact(c => ({ ...c, opsWa: e.target.value }))} />
          </div>
        </div>
        <div style={{ marginBottom: '12px' }}>
          <div style={{ ...eyebrow, marginBottom: '5px' }}>{L('hours_label')}</div>
          <input style={inputStyle} placeholder={L('hours_ph')} value={contact.hours} onChange={e => setContact(c => ({ ...c, hours: e.target.value }))} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button onClick={saveContact}
            style={{ padding: '9px 18px', background: 'var(--pf-gold-deep)', border: 'none', borderRadius: '10px', color: '#ebe8db', fontFamily: 'var(--font-sans)', fontSize: '12.5px', cursor: 'pointer' }}>
            {L('po_save')}
          </button>
          {contactSaved && <span style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', color: 'var(--pf-success)' }}>{L('po_saved')}</span>}
        </div>
      </div>

      {/* Notification preferences — stored on the provider; email-only today. */}
      <SectionTitle>{L('np_title')}</SectionTitle>
      <div style={card}>
        <p style={{ ...bodyText, fontSize: '0.75rem', margin: '0 0 6px' }}>{L('np_hint')}</p>
        {(['bookings', 'payouts', 'marketing'] as const).map((k, i) => {
          const on = provider?.notificationPrefs?.[k] ?? true
          return (
            <div key={k} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', padding: '10px 0', borderTop: i === 0 ? 'none' : '1px solid var(--pf-border)' }}>
              <span style={eyebrow}>{L(`np_${k}`)}</span>
              <button onClick={async () => {
                await updateProvider(uid, { notificationPrefs: { ...(provider?.notificationPrefs || {}), [k]: !on } })
                await refresh()
              }}
                aria-pressed={on}
                style={{ width: '38px', height: '22px', borderRadius: '999px', border: '1px solid var(--pf-border-strong)', background: on ? 'var(--pf-gold-deep)' : 'var(--pf-card)', position: 'relative', cursor: 'pointer', padding: 0 }}>
                <span style={{ position: 'absolute', top: '2px', left: on ? '18px' : '2px', width: '16px', height: '16px', borderRadius: '50%', background: on ? '#ebe8db' : 'var(--pf-faint)', transition: 'left 0.15s ease' }} />
              </button>
            </div>
          )
        })}
      </div>

      {/* Preferences */}
      <SectionTitle>{L('sec_prefs')}</SectionTitle>
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', padding: '4px 0' }}>
          <span style={eyebrow}>{L('lang_label')}</span>
          <div style={{ display: 'flex', border: '1px solid var(--pf-border)', borderRadius: '8px', overflow: 'hidden' }}>
            {(['fr', 'en'] as const).map(l => (
              <button key={l} onClick={() => setLocale(l)} style={{ padding: '6px 12px', background: locale === l ? 'var(--pf-card)' : 'transparent', border: 'none', color: locale === l ? 'var(--pf-gold)' : 'var(--pf-faint)', fontFamily: 'var(--font-sans)', fontSize: '11px', cursor: 'pointer' }}>{l.toUpperCase()}</button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', padding: '10px 0 4px', borderTop: '1px solid var(--pf-border)' }}>
          <span style={eyebrow}>{L('theme_label')}</span>
          <GhostButton onClick={toggle}>{theme === 'dark' ? L('theme_dark') : L('theme_light')}</GhostButton>
        </div>
      </div>

      {/* Support */}
      <SectionTitle>{L('sec_support')}</SectionTitle>
      <div style={card}>
        <p style={{ ...bodyText, fontSize: '0.875rem', margin: 0 }}>{L('support_body')}</p>
        <div style={{ marginTop: '12px' }}>
          <a href="mailto:palmeraexp@gmail.com" style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: 'var(--pf-gold)' }}>{L('contact')} →</a>
        </div>
      </div>

      <div style={{ marginTop: '26px' }}>
        <GhostButton tone="alert" onClick={signOut}>{L('signout')}</GhostButton>
      </div>
    </div>
  )
}
