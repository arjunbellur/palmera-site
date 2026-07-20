'use client'
export const dynamic = 'force-dynamic'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePartner } from '../PartnerContext'
import { t } from '../i18n'
import { useTheme } from '@/lib/theme'
import { formatDate } from '@/lib/money'
import { updateProvider } from '@/lib/firestore'
import PhotoUpload from '@/components/dashboard/PhotoUpload'
import { ScreenHeader, SectionTitle, card, eyebrow, GhostButton, bodyText } from '@/components/partner/ui'

export default function SettingsScreen() {
  const router = useRouter()
  const { uid, provider, email, company, companies, locale, setLocale, setCompanyId } = usePartner()
  const { theme, toggle } = useTheme()
  const L = (k: string) => t(locale, k)
  const [logo, setLogo] = useState(provider?.logo || '')

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
    <div>
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

      {/* Payout — nothing is collected yet, so say so honestly. */}
      <SectionTitle>{L('sec_payout')}</SectionTitle>
      <div style={{ ...card, borderStyle: 'dashed' }}>
        <div style={{ fontFamily: 'var(--font-serif)', color: 'var(--pf-text)', fontSize: '14px' }}>{L('payout_none_t')}</div>
        <p style={{ ...bodyText, fontSize: '0.8125rem', margin: '6px 0 0' }}>{L('payout_none_b')}</p>
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
