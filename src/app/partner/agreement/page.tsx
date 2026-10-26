'use client'
// The partner's signed agreement, inside the partner shell. Both signature
// blocks come from stored records: the partner's own sign-off and Palmera's
// countersignature (set by an admin, so "pending" until then). "Print / Save
// as PDF" prints just the document — the same stylesheet trick as the
// onboarding page, which graduated partners can no longer reach.
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { usePartner } from '../PartnerContext'
import { t } from '../i18n'
import { getCountersignature, type Countersignature } from '@/lib/firestore'
import { getAgreement, formatAgreementDate, PALMERA_SIGNATORY, type AgreementSignatures } from '@/lib/partner-agreement'
import { ScreenHeader, Chip, EmptyState, Skeleton, PrimaryButton, GhostButton } from '@/components/partner/ui'
import { FileSignature } from 'lucide-react'
const AgreementDocument = dynamic(() => import('@/components/dashboard/AgreementDocument'), { ssr: false })

export default function PartnerAgreement() {
  const router = useRouter()
  const { uid, provider, locale } = usePartner()
  const L = (k: string) => t(locale, k)
  const [countersign, setCountersign] = useState<Countersignature | null | undefined>(undefined)

  useEffect(() => {
    if (!uid) return
    getCountersignature(uid).then(setCountersign).catch(() => setCountersign(null))
  }, [uid])

  const content = useMemo(() => getAgreement(locale), [locale])
  const signoff = provider?.signoff ?? null
  const executed = countersign?.status === 'executed'

  const signatures: AgreementSignatures | undefined = useMemo(() => {
    if (!signoff?.signedAt) return undefined
    const providerDate = formatAgreementDate(signoff.signedAt, locale)
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
        businessName: signoff.businessName || provider?.fullName || '',
        name: signoff.typedSignature || signoff.signedBy || '',
        title: signoff.signatoryRole || '',
        date: providerDate,
      },
    }
  }, [signoff, countersign, executed, locale, provider?.fullName])

  if (!provider || countersign === undefined) return <Skeleton height="24rem" />

  if (!signoff?.signedAt) {
    return (
      <>
        <ScreenHeader label={L('ag_label')} title={L('ag_title')} />
        <EmptyState icon={<FileSignature size={22} strokeWidth={1.75} />} title={L('ag_unsigned_t')} body={L('ag_unsigned_b')}
          action={<GhostButton onClick={() => router.push('/partner/settings')}>{L('ag_back')}</GhostButton>} />
      </>
    )
  }

  return (
    <div id="agreement-print">
      <style>{`@media print {
        body * { visibility: hidden !important; }
        #agreement-print, #agreement-print * { visibility: visible !important; }
        #agreement-print { position: absolute; inset: 0; padding: 1.5rem; background: #fff; }
        .no-print { display: none !important; }
        .agreement-doc-scroll { max-height: none !important; overflow: visible !important; }
      }`}</style>

      <div className="no-print" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap' }}>
        <ScreenHeader label={L('ag_label')} title={L('ag_title')} intro={L('ag_intro')} />
        <div style={{ paddingTop: '4px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <GhostButton onClick={() => router.push('/partner/settings')}>{L('ag_back')}</GhostButton>
          <PrimaryButton onClick={() => window.print()}>{L('ag_print')}</PrimaryButton>
        </div>
      </div>

      <div className="no-print" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '16px' }}>
        <Chip tone="green">{L('ag_signed')} {formatAgreementDate(signoff.signedAt, locale)} · {signoff.typedSignature || signoff.signedBy}</Chip>
        {executed
          ? <Chip tone="gold">{L('ag_countersigned')} {countersign?.executedAt ? formatAgreementDate(countersign.executedAt, locale) : ''} · {countersign?.signatoryName}</Chip>
          : <Chip tone="neutral">{L('ag_pending')}</Chip>}
        {signoff.agreementVersion && <Chip tone="neutral">{L('ag_version')} {signoff.agreementVersion}</Chip>}
      </div>

      <AgreementDocument content={content} locale={locale} signatures={signatures} maxHeight="34rem" />

      <p className="no-print" style={{ fontFamily: 'var(--font-sans)', fontSize: '11.5px', color: 'var(--pf-faint)', lineHeight: 1.5, marginTop: '12px' }}>
        {executed ? L('ag_hint_executed') : L('ag_hint_pending')}
      </p>
    </div>
  )
}
