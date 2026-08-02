'use client'
export const dynamic = 'force-dynamic'
// Company detail — the admin's working view of one company: profile,
// experiences (publish/unpublish + curation), agreement sign-off, and the
// account-level controls. pf design language; behavior identical to the old
// /dashboard/admin page it replaces.
import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import {
  getCompany, getProvider, getCompanyAdmin, getExperiencesByCompanyIdAdmin,
  activateCompany, updateCompanyAdminFields, updateCompany, setExperienceStatus, setExperienceTag,
  deleteCompanyCascade, deleteProviderAccountCascade, getCountersignature, setCountersignature, getCountersignatory, setCountersignatory,
  getProviderAdmin, setProviderStatus, getPayoutProfile,
  type Countersignature, type Countersignatory,
} from '@/lib/firestore'
import ConfirmDialog from '@/components/dashboard/ConfirmDialog'
import AgreementDocument from '@/components/dashboard/AgreementDocument'
import CompanyForm, { type CompanyFormValues } from '@/components/dashboard/CompanyForm'
import { getAgreement, formatAgreementDate, PALMERA_SIGNATORY, AGREEMENT_VERSION } from '@/lib/partner-agreement'
import { ScreenHeader, Chip, EmptyState, Skeleton, PrimaryButton, GhostButton, card, bodyText } from '@/components/partner/ui'
import { Field, Grid, SectionHeading, DangerButton, inputStyle, formatDate } from '../../ui'
import { useAdmin } from '../../AdminContext'
import type { Company, Provider, CompanyPrivateAdmin, CompanyPayoutProfile, Experience } from '@/lib/schema'

type Tab = 'overview' | 'experiences' | 'signoff' | 'admin'

const noteStyle: React.CSSProperties = { fontFamily: 'var(--font-sans)', fontSize: '13px', color: 'var(--pf-muted)', margin: '0 0 16px', lineHeight: 1.6 }

function DetailSkeleton() {
  return (
    <div className="pf-in">
      <Skeleton height="20px" style={{ width: '9rem', marginBottom: '22px' }} />
      <Skeleton height="86px" style={{ maxWidth: '30rem', marginBottom: '22px' }} />
      <Skeleton height="38px" style={{ marginBottom: '22px' }} />
      <div style={{ display: 'grid', gap: '12px' }}>
        <Skeleton height="120px" /><Skeleton height="120px" />
      </div>
    </div>
  )
}

export default function AdminCompanyDetailPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = use(params)
  const router = useRouter()
  const { email: adminEmail } = useAdmin()
  const [company, setCompany] = useState<Company | null>(null)
  const [provider, setProvider] = useState<Provider | null>(null)
  const [companyAdmin, setCompanyAdmin] = useState<CompanyPrivateAdmin | null>(null)
  const [experiences, setExperiences] = useState<Experience[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('overview')

  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [confirmDeleteAccount, setConfirmDeleteAccount] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [payoutProfile, setPayoutProfile] = useState<CompanyPayoutProfile | null>(null)

  const [rateInput, setRateInput] = useState('10')
  const [savingRate, setSavingRate] = useState(false)

  const [savingProfile, setSavingProfile] = useState(false)
  const [savedProfile, setSavedProfile] = useState(false)

  // Account status: is this partner's dashboard account usable at all. Default
  // 'active' when no admin doc exists yet (every fresh signup). Distinct from
  // company.active, which only reflects the commission-window activation below.
  const [accountStatus, setAccountStatus] = useState<'active' | 'suspended'>('active')
  const [savingStatus, setSavingStatus] = useState(false)

  const [countersign, setCountersign] = useState<Countersignature | null>(null)
  const [signatory, setSignatory] = useState<Countersignatory | null>(null)
  const [repName, setRepName] = useState('')
  const [repTitle, setRepTitle] = useState('')
  const [savingRep, setSavingRep] = useState(false)
  const [editingRep, setEditingRep] = useState(false)
  const [confirmCountersign, setConfirmCountersign] = useState(false)
  const [countersigning, setCountersigning] = useState(false)
  const [countersignError, setCountersignError] = useState('')

  const load = async () => {
    const c = await getCompany(companyId)
    if (!c) { router.replace('/admin'); return }
    const [p, ca, exps, cs, sig, pa, pp] = await Promise.all([
      getProvider(c.providerId), getCompanyAdmin(companyId), getExperiencesByCompanyIdAdmin(companyId),
      getCountersignature(c.providerId), getCountersignatory(), getProviderAdmin(c.providerId),
      getPayoutProfile(companyId),
    ])
    setCompany(c); setProvider(p); setCompanyAdmin(ca); setExperiences(exps)
    setPayoutProfile(pp)
    setCountersign(cs); setSignatory(sig)
    setAccountStatus(pa?.status || 'active')
    if (ca?.commissionRate != null) setRateInput(String(Math.round(ca.commissionRate * 100)))
    if (sig) { setRepName(sig.name); setRepTitle(sig.title) }
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId])

  // Admin fills in company profile fields directly — for partners (like the
  // several migrated ones with no name at all) who never finished this step.
  const handleSaveProfile = async (values: CompanyFormValues) => {
    setSavingProfile(true)
    await updateCompany(companyId, values)
    setCompany((c) => (c ? { ...c, ...values } : c))
    setSavingProfile(false); setSavedProfile(true); setTimeout(() => setSavedProfile(false), 2500)
  }

  const handleToggleAccountStatus = async () => {
    if (!provider) return
    setSavingStatus(true)
    const next = accountStatus === 'active' ? 'suspended' : 'active'
    await setProviderStatus(provider.uid, next)
    setAccountStatus(next)
    setSavingStatus(false)
  }

  const handleActivate = async () => {
    setSavingRate(true)
    const rate = Math.max(0, Math.min(100, parseFloat(rateInput) || 0)) / 100
    await activateCompany(companyId, rate)
    await load(); setSavingRate(false)
  }
  const handleSaveRate = async () => {
    setSavingRate(true)
    const rate = Math.max(0, Math.min(100, parseFloat(rateInput) || 0)) / 100
    await updateCompanyAdminFields(companyId, { commissionRate: rate })
    await load(); setSavingRate(false)
  }
  const [publishError, setPublishError] = useState('')
  // Invariant #7: lat/lng, img, and cancellationPolicy are required at publish.
  const publishBlockers = (e: Experience): string[] => [
    ...(!e.img ? ['hero photo'] : []),
    ...(!e.mapsLink ? ['a Google Maps link'] : []),
    ...(!e.cancellationPolicy?.tier ? ['cancellation policy'] : []),
  ]
  const handlePublish = async (id: string, status: Experience['status']) => {
    setPublishError('')
    if (status === 'published') {
      const e = experiences.find((x) => x.id === id)
      const missing = e ? publishBlockers(e) : []
      if (missing.length) { setPublishError(`Can’t publish “${e?.title}” — the provider still needs to add: ${missing.join(', ')}.`); return }
    }
    await setExperienceStatus(id, status)
    setExperiences((prev) => prev.map((e) => (e.id === id ? { ...e, status, active: status === 'published' } : e)))
  }
  const handleTag = async (id: string, tag: string) => {
    await setExperienceTag(id, tag || null)
    setExperiences((prev) => prev.map((e) => (e.id === id ? { ...e, tag: tag || null } : e)))
  }
  const handleDelete = async () => {
    setDeleting(true); setDeleteError('')
    try { await deleteCompanyCascade(companyId); router.replace('/admin') }
    catch { setDeleteError('Could not delete this company. Please try again.'); setDeleting(false) }
  }

  const handleDeleteAccount = async () => {
    if (!company) return
    setDeletingAccount(true); setDeleteError('')
    try { await deleteProviderAccountCascade(company.providerId); router.replace('/admin') }
    catch { setDeleteError('Could not delete this account. Please try again.'); setDeletingAccount(false); setConfirmDeleteAccount(false) }
  }
  const handleSaveRep = async () => {
    if (!repName.trim() || !repTitle.trim()) return
    setSavingRep(true); setCountersignError('')
    try {
      const rec: Countersignatory = { name: repName.trim(), title: repTitle.trim(), updatedByEmail: adminEmail, updatedAt: new Date().toISOString() }
      await setCountersignatory(rec)
      setSignatory(rec); setEditingRep(false); setSavingRep(false)
    } catch { setCountersignError('Could not save the representative.'); setSavingRep(false) }
  }
  const handleCountersign = async () => {
    if (!signatory || !provider) return
    setCountersigning(true); setCountersignError('')
    try {
      const record: Countersignature = {
        status: 'executed', agreementVersion: AGREEMENT_VERSION, signatoryEntity: PALMERA_SIGNATORY.entity,
        signatoryName: signatory.name, signatoryTitle: signatory.title, executedByEmail: adminEmail, executedAt: new Date().toISOString(),
      }
      await setCountersignature(provider.uid, record)
      setCountersign(record); setConfirmCountersign(false); setCountersigning(false)
    } catch { setCountersignError('Could not countersign.'); setCountersigning(false) }
  }

  if (loading) return <DetailSkeleton />
  if (!company) return null

  const signoff = provider?.signoff
  const executed = countersign?.status === 'executed'
  const configured = !!signatory?.name && !!signatory?.title
  const showRepForm = editingRep || !configured
  const providerDate = signoff ? formatAgreementDate(signoff.signedAt, 'en') : ''

  const TABS: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'experiences', label: `Experiences (${experiences.length})` },
    { key: 'signoff', label: 'Sign-off' },
    { key: 'admin', label: 'Admin controls' },
  ]

  return (
    <div className="pf-in">
      <a href="/admin" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none', color: 'var(--pf-faint)', fontFamily: 'var(--font-sans)', fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '22px' }}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M7.5 2L3.5 6L7.5 10" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" /></svg>
        All partners
      </a>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap', marginBottom: '8px' }}>
        <ScreenHeader label="Company profile" title={company.name || 'Untitled company'} />
        <DangerButton onClick={() => { setDeleteError(''); setConfirmDelete(true) }}>Delete company</DangerButton>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '24px' }}>
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: 'var(--pf-faint)' }}>{provider?.email}</span>
        <Chip tone={accountStatus === 'suspended' ? 'alert' : 'green'}>{accountStatus === 'suspended' ? 'Account suspended' : 'Account active'}</Chip>
        <Chip tone={provider?.onboardingStage === 'complete' ? 'gold' : 'neutral'}>{provider?.onboardingStage === 'complete' ? 'Graduated' : 'In onboarding'}</Chip>
        {companyAdmin?.commissionRate != null && <Chip tone="neutral">{Math.round(companyAdmin.commissionRate * 100)}% commission</Chip>}
      </div>

      {confirmDelete && (
        <ConfirmDialog title="Delete this company?" note="Removes the company and its experiences. The provider account is not affected."
          error={deleteError} confirmLabel="Delete permanently" busyLabel="Deleting…" busy={deleting}
          onConfirm={handleDelete} onCancel={() => setConfirmDelete(false)}>
          You&apos;re about to permanently delete <strong style={{ color: 'var(--db-text)' }}>{company.name}</strong> and {experiences.length} experience(s). This cannot be undone.
        </ConfirmDialog>
      )}
      {confirmDeleteAccount && (
        <ConfirmDialog title="Delete this entire partner account?" note="Removes ALL of this provider's companies, listings, payout details, countersignature, and the provider record. Their login is NOT deleted — signing in again starts a fresh, blank account."
          error={deleteError} confirmLabel="Delete entire account" busyLabel="Deleting…" busy={deletingAccount}
          onConfirm={handleDeleteAccount} onCancel={() => setConfirmDeleteAccount(false)}>
          You&apos;re about to erase <strong style={{ color: 'var(--db-text)' }}>{provider?.fullName || provider?.email}</strong> — every company and listing they have. This cannot be undone.
        </ConfirmDialog>
      )}
      {confirmCountersign && signatory && (
        <ConfirmDialog title="Countersign as Palmera?" note={`Executes the agreement on behalf of ${PALMERA_SIGNATORY.entity}, recorded against your account (${adminEmail}).`}
          error={countersignError} confirmLabel="Countersign" busyLabel="Signing…" busy={countersigning}
          onConfirm={handleCountersign} onCancel={() => setConfirmCountersign(false)}>
          You&apos;re countersigning as <strong style={{ color: 'var(--db-text)' }}>{signatory.name}, {signatory.title}</strong> for <strong style={{ color: 'var(--db-text)' }}>{provider?.fullName || provider?.email}</strong>. This marks the agreement fully executed.
        </ConfirmDialog>
      )}

      <div style={{ display: 'flex', overflowX: 'auto', borderBottom: '1px solid var(--pf-border)', marginBottom: '26px', scrollbarWidth: 'none' }}>
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ flexShrink: 0, padding: '10px 20px', background: 'transparent', border: 'none', borderBottom: tab === t.key ? '2px solid var(--pf-gold)' : '2px solid transparent', color: tab === t.key ? 'var(--pf-gold)' : 'var(--pf-faint)', fontSize: '13px', fontFamily: 'var(--font-sans)', letterSpacing: '0.04em', cursor: 'pointer', marginBottom: '-1px' }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div>
          <SectionHeading>Company</SectionHeading>
          <p style={noteStyle}>
            Editable by admin — use this to fill in or correct a company&apos;s profile, e.g. when a partner never finished their own Business Profile.
          </p>
          <CompanyForm initial={company} submitLabel="Save company profile" saving={savingProfile} onSubmit={handleSaveProfile} />
          {savedProfile && <p style={{ fontSize: '13px', color: 'var(--pf-gold)', fontFamily: 'var(--font-sans)', marginTop: '12px' }}>✓ Saved</p>}
          <SectionHeading>Provider (the person)</SectionHeading>
          <Grid>
            <Field label="Full name" value={provider?.fullName} />
            <Field label="Role" value={provider?.role} />
            <Field label="Email" value={provider?.email} />
            <Field label="Phone" value={provider?.primaryPhone} />
            <Field label="Country" value={provider?.country} />
            <Field label="Onboarding stage" value={provider?.onboardingStage} />
          </Grid>
        </div>
      )}

      {tab === 'experiences' && (
        <div>
          {publishError && <p style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: 'var(--pf-alert)', margin: '0 0 16px' }}>{publishError}</p>}
          {experiences.length === 0 ? (
            <EmptyState icon="▦" title="No experiences yet" body="This company hasn't created any listings." />
          ) : experiences.map((e) => (
            <div key={e.id} style={{ ...card, marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
                <p style={{ fontFamily: 'var(--font-serif)', color: 'var(--pf-text)', fontSize: '15px', margin: 0 }}>{e.title || 'Untitled'}</p>
                <Chip tone={e.status === 'published' ? 'green' : 'neutral'}>{e.status}</Chip>
                {(e.needsReview?.length ?? 0) > 0 && (
                  <Chip tone="alert">Needs review: {e.needsReview!.join(', ')}</Chip>
                )}
              </div>
              <Grid>
                <Field label="Category" value={e.category} />
                <Field label="City" value={e.city} />
                <Field label="Price" value={e.price != null ? `${e.price.toLocaleString()} ${e.currency || ''} (${e.priceUnit})` : 'Reservation'} />
                <Field label="Duration" value={e.duration} />
              </Grid>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px', flexWrap: 'wrap' }}>
                {e.status === 'published' ? (
                  <GhostButton onClick={() => handlePublish(e.id!, 'unpublished')}>Unpublish</GhostButton>
                ) : (() => {
                  const blockers = publishBlockers(e)
                  return blockers.length ? (
                    <>
                      {/* Clicking still routes through handlePublish, which
                          surfaces the full error line — not a dead button. */}
                      <GhostButton onClick={() => handlePublish(e.id!, 'published')}>Publish</GhostButton>
                      {/* Blockers stay VISIBLE, not buried in a hover tooltip. */}
                      {blockers.map((b) => <Chip key={b} tone="alert">needs {b}</Chip>)}
                    </>
                  ) : (
                    <PrimaryButton onClick={() => handlePublish(e.id!, 'published')}>Publish</PrimaryButton>
                  )
                })()}
                <input defaultValue={e.tag || ''} placeholder="Curation tag" onBlur={(ev) => { if (ev.target.value !== (e.tag || '')) handleTag(e.id!, ev.target.value) }}
                  style={{ ...inputStyle, width: '10rem' }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'signoff' && (
        <div>
          {!signoff?.signedAt ? (
            <EmptyState icon="✎" title="Not signed yet" body="The provider has not signed the partnership agreement." />
          ) : (
            <>
              <SectionHeading>Provider signature</SectionHeading>
              <div style={{ ...card, marginBottom: '22px' }}>
                <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'var(--pf-text)', fontSize: '18px', margin: '0 0 4px' }}>{signoff.typedSignature || signoff.signedBy}</p>
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: 'var(--pf-muted)', margin: 0 }}>{signoff.signatoryRole ? `${signoff.signatoryRole} · ` : ''}{providerDate}{signoff.agreementVersion ? ` · Version ${signoff.agreementVersion}` : ''}</p>
              </div>

              <SectionHeading>Palmera countersignature</SectionHeading>
              {executed ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--pf-green-soft)', border: '1px solid var(--pf-border-strong)', borderRadius: '14px', padding: '14px 20px', marginBottom: '22px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--pf-success)', flexShrink: 0 }} />
                  <p style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: 'var(--pf-text)', margin: 0 }}>{countersign!.signatoryName}{countersign!.signatoryTitle ? `, ${countersign!.signatoryTitle}` : ''} · countersigned {formatDate(countersign!.executedAt)} by {countersign!.executedByEmail}</p>
                </div>
              ) : (
                <div style={{ ...card, marginBottom: '22px' }}>
                  <p style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: 'var(--pf-muted)', margin: '0 0 16px', fontStyle: 'italic' }}>Awaiting Palmera countersignature.</p>
                  {showRepForm ? (
                    <div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 12rem), 1fr))', gap: '12px', marginBottom: '14px' }}>
                        <input value={repName} onChange={(e) => setRepName(e.target.value)} placeholder="Full name" style={inputStyle} />
                        <input value={repTitle} onChange={(e) => setRepTitle(e.target.value)} placeholder="Title" style={inputStyle} />
                      </div>
                      {countersignError && <p style={{ fontSize: '12px', color: 'var(--pf-alert)', margin: '0 0 12px' }}>{countersignError}</p>}
                      <PrimaryButton onClick={handleSaveRep}>{savingRep ? 'Saving…' : 'Save representative'}</PrimaryButton>
                    </div>
                  ) : (
                    <div>
                      <p style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: 'var(--pf-text)', margin: '0 0 14px' }}>
                        Signing as <strong>{signatory!.name}</strong>, {signatory!.title}
                        <button onClick={() => setEditingRep(true)} style={{ marginLeft: '10px', background: 'transparent', border: 'none', color: 'var(--pf-gold)', fontSize: '12px', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}>edit</button>
                      </p>
                      <PrimaryButton onClick={() => { setCountersignError(''); setConfirmCountersign(true) }}>Countersign as Palmera</PrimaryButton>
                    </div>
                  )}
                </div>
              )}

              <SectionHeading>Agreement as signed</SectionHeading>
              <AgreementDocument content={getAgreement('en')} locale="en" maxHeight="24rem"
                signatures={{
                  effectiveDate: providerDate, palmeraPending: !executed,
                  palmera: { entity: countersign?.signatoryEntity || PALMERA_SIGNATORY.entity, name: countersign?.signatoryName || '', title: countersign?.signatoryTitle || '', date: executed && countersign?.executedAt ? formatDate(countersign.executedAt) : '' },
                  provider: { businessName: signoff.businessName || company.legalName, name: signoff.typedSignature || signoff.signedBy, title: signoff.signatoryRole, date: providerDate },
                }} />
            </>
          )}
        </div>
      )}

      {tab === 'admin' && (
        <div>
          <SectionHeading>Provider account</SectionHeading>
          <p style={noteStyle}>
            {accountStatus === 'suspended'
              ? 'This provider is suspended — they cannot access the dashboard. Suspending affects every company they own.'
              : 'This provider can access the dashboard normally, whether or not they’ve finished onboarding.'}
          </p>
          {accountStatus === 'suspended' ? (
            <PrimaryButton onClick={handleToggleAccountStatus}>{savingStatus ? 'Saving…' : 'Reactivate account'}</PrimaryButton>
          ) : (
            <DangerButton onClick={handleToggleAccountStatus} disabled={savingStatus}>{savingStatus ? 'Saving…' : 'Suspend account'}</DangerButton>
          )}

          <SectionHeading>Commission activation</SectionHeading>
          <p style={noteStyle}>
            {company.activatedAt ? `Activated ${formatDate(company.activatedAt)}. Commission window runs 12 months from that date.` : 'Not yet activated — this is a separate step from the account itself; it starts the 12-month commission window when the business is ready to go live.'}
          </p>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '10px', color: 'var(--pf-faint)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 6px' }}>Commission rate (%)</p>
              <input type="number" min="0" max="100" value={rateInput} onChange={(e) => setRateInput(e.target.value)} style={{ ...inputStyle, width: '6rem' }} />
            </div>
            {company.activatedAt ? (
              <GhostButton onClick={handleSaveRate}>{savingRate ? 'Saving…' : 'Update rate'}</GhostButton>
            ) : (
              <PrimaryButton onClick={handleActivate}>{savingRate ? 'Activating…' : 'Activate company'}</PrimaryButton>
            )}
          </div>
          <SectionHeading>Partner payout details</SectionHeading>
          {payoutProfile ? (
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: 'var(--pf-muted)', margin: 0 }}>
              {payoutProfile.method === 'wave' ? 'Wave' : payoutProfile.method === 'orange_money' ? 'Orange Money' : 'Bank transfer'}
              {' — '}{payoutProfile.accountName}
              {' · '}{payoutProfile.method === 'bank_transfer' ? `${payoutProfile.bankName} · ${payoutProfile.accountRef}` : payoutProfile.phone}
            </p>
          ) : (
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: 'var(--pf-faint)', fontStyle: 'italic', margin: 0 }}>
              Not provided yet — the partner adds this in their dashboard Settings. No payouts can be sent until it exists.
            </p>
          )}

          <SectionHeading>Danger zone</SectionHeading>
          <div style={{ ...card, borderColor: 'rgba(196,124,124,0.4)' }}>
            <p style={{ ...bodyText, fontSize: '13px', margin: '0 0 16px' }}>
              <strong style={{ color: 'var(--pf-text)' }}>Delete company</strong> removes this business and its listings; the provider keeps their account and any other companies.
              {' '}<strong style={{ color: 'var(--pf-text)' }}>Delete entire account</strong> erases everything this provider has — all companies, listings, payout details, and their signed-agreement countersignature. Their Firebase login itself can&apos;t be removed from here; if they sign in again they start from a blank account.
            </p>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <DangerButton onClick={() => { setDeleteError(''); setConfirmDelete(true) }}>Delete company</DangerButton>
              <DangerButton solid onClick={() => { setDeleteError(''); setConfirmDeleteAccount(true) }}>Delete entire partner account</DangerButton>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
