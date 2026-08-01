'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthChange } from '@/lib/auth'
import { getProvider, updateProvider, getCountersignature, type Countersignature } from '@/lib/firestore'
import AgreementDocument from '@/components/dashboard/AgreementDocument'
import {
  getAgreement, formatAgreementDate,
  AGREEMENT_VERSION, PALMERA_SIGNATORY,
  type AgreementLocale, type AgreementSignatures,
} from '@/lib/partner-agreement'

interface SignoffRecord {
  signedAt?: string
  signedBy?: string
  typedSignature?: string
  signatoryRole?: string
  agreementVersion?: string
  businessName?: string
}

const T: Record<string, Record<string, string>> = {
  fr: {
    eyebrow: 'Conditions & Signature', title: 'Convention de Partenariat',
    subtitle: 'Consultez et signez votre convention pour référencer vos expériences sur Palmera.',
    signedOff: 'Signé le', by: 'par',
    scrollHint: 'Faites défiler la convention jusqu’en bas pour activer la signature.',
    signatureHeading: 'Signature électronique',
    nameLabel: 'Représentant autorisé (votre signature)', namePlaceholder: 'Tapez votre nom complet',
    roleLabel: 'Fonction', rolePlaceholder: 'ex. Gérant, Propriétaire',
    ack: 'J’ai lu, compris et j’accepte d’être lié par la présente Convention de Partenariat Fournisseur.',
    sign: 'Confirmer et signer', processing: 'Traitement…',
    print: 'Imprimer / Enregistrer en PDF', version: 'Version',
    notConfigured: 'La signature est indisponible : le représentant autorisé de Palmera n’est pas encore configuré. Contactez Palmera.',
  },
  en: {
    eyebrow: 'Terms & Sign-off', title: 'Partnership Agreement',
    subtitle: 'Review and sign your agreement to list your experiences on Palmera.',
    signedOff: 'Signed on', by: 'by',
    scrollHint: 'Scroll to the end of the agreement to enable signing.',
    signatureHeading: 'Electronic signature',
    nameLabel: 'Authorized representative (your signature)', namePlaceholder: 'Type your full name',
    roleLabel: 'Title', rolePlaceholder: 'e.g. Manager, Owner',
    ack: 'I have read, understood, and agree to be bound by this Provider Partnership Agreement.',
    sign: 'Confirm & sign', processing: 'Processing…',
    print: 'Print / Save as PDF', version: 'Version',
    notConfigured: 'Signing is unavailable: Palmera’s authorized representative is not yet configured. Please contact Palmera.',
  },
}

export default function SettingsPage() {
  const router = useRouter()
  const [locale, setLocale] = useState<AgreementLocale>('fr')
  const [uid, setUid] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [signoff, setSignoff] = useState<SignoffRecord | null>(null)
  const [countersign, setCountersign] = useState<Countersignature | null>(null)

  const [typedSignature, setTypedSignature] = useState('')
  const [signatoryRole, setSignatoryRole] = useState('')
  const [acknowledged, setAcknowledged] = useState(false)
  const [scrolledToEnd, setScrolledToEnd] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const match = document.cookie.match(/locale=([^;]+)/)
    if (match && (match[1] === 'fr' || match[1] === 'en')) setLocale(match[1])
  }, [])

  useEffect(() => {
    const unsub = onAuthChange(async (user) => {
      if (!user) { router.replace('/dashboard'); return }
      setUid(user.uid)
      const provider = await getProvider(user.uid)
      if (provider) {
        setBusinessName(provider.signoff?.businessName || provider.fullName || provider.email || '')
        setSignatoryRole(prev => prev || provider.role || '')
        if (provider.signoff) setSignoff(provider.signoff as SignoffRecord)
      }
      setCountersign(await getCountersignature(user.uid))
    })
    return () => unsub()
  }, [router])

  const t = (k: string) => T[locale]?.[k] || T.fr[k]
  const content = useMemo(() => getAgreement(locale), [locale])

  const alreadySigned = !!signoff?.signedAt
  const canSign = !!typedSignature.trim() && !!signatoryRole.trim() && acknowledged && scrolledToEnd && !saving

  // Executed signature block, rendered from the stored records (not live form state).
  // Provider side comes from the partner's signoff; Palmera side from the admin
  // countersignature (which arrives later), so it shows "pending" until then.
  const signatures: AgreementSignatures | undefined = useMemo(() => {
    if (!signoff?.signedAt) return undefined
    const providerDate = formatAgreementDate(signoff.signedAt, locale)
    const executed = countersign?.status === 'executed'
    return {
      effectiveDate: providerDate,
      palmeraPending: !executed,
      palmera: {
        entity: countersign?.signatoryEntity || PALMERA_SIGNATORY.entity,
        name: countersign?.signatoryName || '',
        title: countersign?.signatoryTitle || '',
        date: executed && countersign?.executedAt ? formatAgreementDate(countersign.executedAt, locale) : '',
      },
      provider: {
        businessName: signoff.businessName || businessName,
        name: signoff.typedSignature || signoff.signedBy || '',
        title: signoff.signatoryRole || '',
        date: providerDate,
      },
    }
  }, [signoff, countersign, locale, businessName])

  const handleSign = async () => {
    if (!canSign) return
    setSaving(true)
    const now = new Date().toISOString()
    const record = {
      signedAt: now,
      signedBy: businessName,
      typedSignature: typedSignature.trim(),
      signatoryRole: signatoryRole.trim(),
      agreementVersion: AGREEMENT_VERSION,
      businessName,
    }
    await updateProvider(uid, { signoff: record, onboardingStage: 'active' })
    setSignoff(record)
    setSaving(false)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'var(--db-bg-input)', border: '1px solid var(--db-border-subtle)',
    borderRadius: '0.375rem', padding: '0.75rem 1rem', color: 'var(--db-text)', fontSize: '0.9375rem',
    fontFamily: 'var(--font-sans)', outline: 'none', boxSizing: 'border-box',
  }
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '0.6875rem', color: 'var(--db-text-faint)', letterSpacing: '0.08em',
    textTransform: 'uppercase', marginBottom: '0.5rem', fontFamily: 'var(--font-sans)',
  }

  return (
    <div id="agreement-print">
      <style>{`@media print {
        body * { visibility: hidden !important; }
        #agreement-print, #agreement-print * { visibility: visible !important; }
        #agreement-print { position: absolute; inset: 0; padding: 1.5rem; }
        .no-print { display: none !important; }
        /* On paper the scroll box must unroll — otherwise the PDF clips at the
           box height and only the visible slice of the agreement prints. */
        .agreement-doc-scroll { max-height: none !important; overflow: visible !important; }
      }`}</style>

      <div style={{ marginBottom: '2rem' }}>
        <p style={{ fontFamily: 'var(--font-sans)', color: 'rgba(190,154,86,0.8)', fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 0.5rem' }}>{t('eyebrow')}</p>
        <h1 style={{ fontFamily: 'var(--font-display)', color: 'var(--db-text)', fontSize: 'clamp(1.375rem, 3vw, 1.625rem)', fontWeight: 400, letterSpacing: '0.06em', margin: '0 0 0.375rem' }}>{t('title')}</h1>
        <p style={{ fontFamily: 'var(--font-serif)', color: 'var(--db-text-muted)', fontSize: '0.875rem', margin: 0 }}>{t('subtitle')}</p>
      </div>

      {alreadySigned && (
        <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', background: 'rgba(158,118,59,0.08)', border: '1px solid rgba(158,118,59,0.25)', borderRadius: '0.5rem', padding: '0.875rem 1.25rem', marginBottom: '1.75rem' }}>
          <div style={{ width: '0.5rem', height: '0.5rem', borderRadius: '50%', background: '#9e763b', flexShrink: 0 }} />
          <p style={{ fontSize: '0.8125rem', color: '#be9a56', fontFamily: 'var(--font-sans)', margin: 0 }}>
            {t('signedOff')} {formatAgreementDate(signoff!.signedAt!, locale)} {t('by')} {signoff?.typedSignature || signoff?.signedBy}
            {signoff?.agreementVersion ? ` · ${t('version')} ${signoff.agreementVersion}` : ''}
          </p>
        </div>
      )}

      <div style={{ marginBottom: '1.75rem' }}>
        {/* ALWAYS a bounded scroll box — signed too. Rendering the signed
            agreement at natural height grew the page under Lenis's stale
            height cache (scroll hit a wall mid-document) and pushed the
            Print/Save action thousands of pixels down. The box keeps the
            action visible; the print stylesheet unrolls it on paper. */}
        <AgreementDocument
          content={content}
          locale={locale}
          signatures={signatures}
          maxHeight="30rem"
          onScrolledToEnd={alreadySigned ? undefined : () => setScrolledToEnd(true)}
        />
      </div>

      {alreadySigned ? (
        <button className="no-print" onClick={() => window.print()}
          style={{ padding: '0.625rem 1.25rem', background: 'transparent', border: '1px solid var(--db-border-gold)', borderRadius: '0.375rem', color: 'var(--db-text-muted)', fontSize: '0.8125rem', fontFamily: 'var(--font-sans)', letterSpacing: '0.04em', cursor: 'pointer' }}>
          {t('print')}
        </button>
      ) : (
        <div className="no-print">
          <h2 style={{ fontFamily: 'var(--font-serif)', color: 'var(--db-text)', fontSize: '1.0625rem', fontWeight: 400, margin: '0 0 1rem' }}>{t('signatureHeading')}</h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 14rem), 1fr))', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={labelStyle}>{t('nameLabel')}</label>
              <input style={{ ...inputStyle, fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '1.0625rem' }} value={typedSignature} onChange={e => setTypedSignature(e.target.value)} placeholder={t('namePlaceholder')} />
            </div>
            <div>
              <label style={labelStyle}>{t('roleLabel')}</label>
              <input style={inputStyle} value={signatoryRole} onChange={e => setSignatoryRole(e.target.value)} placeholder={t('rolePlaceholder')} />
            </div>
          </div>

          <div onClick={() => setAcknowledged(v => !v)}
            style={{ display: 'flex', alignItems: 'flex-start', gap: '0.875rem', padding: '1rem 1.25rem', background: acknowledged ? 'var(--db-bg-card-active)' : 'var(--db-bg-card)', border: `1px solid ${acknowledged ? 'rgba(158,118,59,0.2)' : 'var(--db-border-subtle)'}`, borderRadius: '0.5rem', cursor: 'pointer', marginBottom: '1.25rem' }}>
            <div style={{ width: '1.25rem', height: '1.25rem', borderRadius: '0.25rem', flexShrink: 0, marginTop: '0.0625rem', border: `1.5px solid ${acknowledged ? '#9e763b' : 'var(--db-text-ghost)'}`, background: acknowledged ? '#9e763b' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {acknowledged && <span style={{ color: '#fff', fontSize: '0.75rem', lineHeight: 1 }}>✓</span>}
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--db-text)', fontFamily: 'var(--font-sans)', margin: 0, lineHeight: 1.4 }}>{t('ack')}</p>
          </div>

          {!scrolledToEnd && (
            <p style={{ fontSize: '0.75rem', color: 'var(--db-text-faint)', fontFamily: 'var(--font-sans)', margin: '0 0 0.75rem' }}>{t('scrollHint')}</p>
          )}

          <button onClick={handleSign} disabled={!canSign}
            style={{ padding: '0.8125rem 2.25rem', background: canSign ? '#9e763b' : 'var(--db-bg-card)', border: `1px solid ${canSign ? 'transparent' : 'var(--db-border-subtle)'}`, borderRadius: '0.375rem', color: canSign ? '#ebe8db' : 'var(--db-text-ghost)', fontSize: '0.875rem', fontFamily: 'var(--font-sans)', letterSpacing: '0.06em', cursor: canSign ? 'pointer' : 'not-allowed', transition: 'all 0.2s' }}>
            {saving ? t('processing') : t('sign')}
          </button>
        </div>
      )}
    </div>
  )
}
