'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePartner } from '../PartnerContext'
import { t } from '../i18n'
import { useTheme } from '@/lib/theme'
import { formatDate } from '@/lib/money'
import { updateProvider, updateCompany, getPayoutProfile, setPayoutProfile } from '@/lib/firestore'
import type { CompanyPayoutProfile } from '@/lib/schema'
import PhotoUpload from '@/components/dashboard/PhotoUpload'
import { ScreenHeader, SectionTitle, card, eyebrow, GhostButton, bodyText } from '@/components/partner/ui'

const inputStyle: React.CSSProperties = { width: '100%', background: 'var(--pf-card)', border: '1px solid var(--pf-border)', borderRadius: '10px', padding: '9px 13px', color: 'var(--pf-text)', fontFamily: 'var(--font-sans)', fontSize: '12.5px', outline: 'none', boxSizing: 'border-box' }

type PoMethod = CompanyPayoutProfile['method']

export default function SettingsScreen() {
  const router = useRouter()
  const { uid, provider, email, company, companies, locale, setLocale, setCompanyId } = usePartner()
  const { theme, toggle } = useTheme()
  const L = (k: string) => t(locale, k)
  const [logo, setLogo] = useState(provider?.logo || '')

  // Payout details — the partner's own, per company (Jordan: biggest omission).
  const [poEditing, setPoEditing] = useState(false)
  const [poSaved, setPoSaved] = useState(false)
  const [po, setPo] = useState<{ method: PoMethod; accountName: string; phone: string; bankName: string; accountRef: string }>({
    method: 'wave', accountName: '', phone: '', bankName: '', accountRef: '',
  })
  const [poLoaded, setPoLoaded] = useState<CompanyPayoutProfile | null>(null)

  // Contact & hours — light operational info Jordan asked for.
  const [contact, setContact] = useState({ phone: '', whatsapp: '', hours: '' })
  const [contactSaved, setContactSaved] = useState(false)

  useEffect(() => {
    if (!company?.id) return
    getPayoutProfile(company.id).then(p => {
      setPoLoaded(p)
      if (p) setPo({ method: p.method, accountName: p.accountName || '', phone: p.phone || '', bankName: p.bankName || '', accountRef: p.accountRef || '' })
    })
    setContact({
      phone: company.phone || '',
      whatsapp: company.whatsapp || '',
      hours: String((company.operations as Record<string, unknown>)?.businessHours || ''),
    })
  }, [company?.id]) // eslint-disable-line react-hooks/exhaustive-deps

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
      operations: { ...((company.operations as Record<string, unknown>) || {}), businessHours: contact.hours.trim() },
    })
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

      {/* Company */}
      <SectionTitle>{L('sec_company')}</SectionTitle>
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ fontFamily: 'var(--font-display)', color: 'var(--pf-head)', fontSize: '1.0625rem', letterSpacing: '0.03em' }}>{company?.name}</div>
          {companies.length > 1 && (
            <GhostButton onClick={() => setCompanyId(companies.find(c => c.id !== company?.id)?.id || company!.id!)}>{L('switch_company')}</GhostButton>
          )}
        </div>
        <div style={{ marginTop: '10px' }}>
          {row(locale === 'fr' ? 'Ville' : 'City', company?.city || '')}
          {row(L('activated'), company?.activatedAt ? formatDate(company.activatedAt) : '—')}
          {row(L('comm_window'), '10%')}
        </div>
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
