'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthChange } from '@/lib/auth'
import {
  getCompany, getProvider, getCompanyAdmin, getExperiencesByCompanyIdAdmin,
  activateCompany, updateCompanyAdminFields, updateCompany, setExperienceStatus, setExperienceTag,
  deleteCompanyCascade, getCountersignature, setCountersignature, getCountersignatory, setCountersignatory,
  getProviderAdmin, setProviderStatus,
  type Countersignature, type Countersignatory,
} from '@/lib/firestore'
import ConfirmDialog from '@/components/dashboard/ConfirmDialog'
import AgreementDocument from '@/components/dashboard/AgreementDocument'
import CompanyForm, { type CompanyFormValues } from '@/components/dashboard/CompanyForm'
import { getAgreement, formatAgreementDate, PALMERA_SIGNATORY, AGREEMENT_VERSION } from '@/lib/partner-agreement'
import type { Company, Provider, CompanyPrivateAdmin, Experience } from '@/lib/schema'

const ADMIN_EMAILS = ['palmeraexp@gmail.com']
type Tab = 'overview' | 'experiences' | 'signoff' | 'admin'

function formatDate(ts: unknown): string {
  if (!ts) return '—'
  const sec = (ts as { seconds?: number })?.seconds
  if (sec) return new Date(sec * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  if (typeof ts === 'string') return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  return '—'
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.625rem', color: 'var(--db-text-faint)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 0.25rem' }}>{label}</p>
      <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: value ? 'var(--db-text)' : 'var(--db-text-ghost)', margin: 0, lineHeight: 1.5, fontStyle: value ? 'normal' : 'italic' }}>{value || 'Not provided'}</p>
    </div>
  )
}
function Grid({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(14rem, 1fr))', gap: '0 2rem' }}>{children}</div>
}
function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h3 style={{ fontFamily: 'var(--font-serif)', color: 'var(--db-text)', fontSize: '0.9375rem', fontWeight: 400, margin: '1.75rem 0 1rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--db-border-subtle)' }}>{children}</h3>
}

export default function AdminCompanyDetailPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = use(params)
  const router = useRouter()
  const [company, setCompany] = useState<Company | null>(null)
  const [provider, setProvider] = useState<Provider | null>(null)
  const [companyAdmin, setCompanyAdmin] = useState<CompanyPrivateAdmin | null>(null)
  const [experiences, setExperiences] = useState<Experience[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('overview')
  const [adminEmail, setAdminEmail] = useState('')

  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

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
    if (!c) { router.replace('/dashboard/admin'); return }
    const [p, ca, exps, cs, sig, pa] = await Promise.all([
      getProvider(c.providerId), getCompanyAdmin(companyId), getExperiencesByCompanyIdAdmin(companyId),
      getCountersignature(c.providerId), getCountersignatory(), getProviderAdmin(c.providerId),
    ])
    setCompany(c); setProvider(p); setCompanyAdmin(ca); setExperiences(exps)
    setCountersign(cs); setSignatory(sig)
    setAccountStatus(pa?.status || 'active')
    if (ca?.commissionRate != null) setRateInput(String(Math.round(ca.commissionRate * 100)))
    if (sig) { setRepName(sig.name); setRepTitle(sig.title) }
    setLoading(false)
  }

  useEffect(() => {
    const unsub = onAuthChange(async (user) => {
      if (!user || !ADMIN_EMAILS.includes(user.email || '')) { router.replace('/dashboard/home'); return }
      setAdminEmail(user.email || '')
      await load()
    })
    return () => unsub()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, companyId])

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
    ...(e.lat == null || e.lng == null ? ['map coordinates'] : []),
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
    try { await deleteCompanyCascade(companyId); router.replace('/dashboard/admin') }
    catch { setDeleteError('Could not delete this company. Please try again.'); setDeleting(false) }
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

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh' }}>
      <div style={{ width: '1.75rem', height: '1.75rem', border: '2px solid rgba(190,154,86,0.15)', borderTopColor: '#be9a56', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
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
    <div>
      <a href="/dashboard/admin" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', textDecoration: 'none', color: 'var(--db-text-faint)', fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '1.5rem' }}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M7.5 2L3.5 6L7.5 10" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" /></svg>
        All companies
      </a>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.75rem' }}>
        <div>
          <p style={{ fontFamily: 'var(--font-sans)', color: 'rgba(190,154,86,0.8)', fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 0.375rem' }}>Company Profile</p>
          <h1 style={{ fontFamily: 'var(--font-display)', color: 'var(--db-text)', fontSize: 'clamp(1.25rem, 3vw, 1.5rem)', fontWeight: 400, letterSpacing: '0.06em', margin: '0 0 0.25rem' }}>{company.name || 'Untitled company'}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--db-text-faint)' }}>{provider?.email}</span>
            <span style={{ color: 'var(--db-border)', fontSize: '0.75rem' }}>·</span>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: accountStatus === 'suspended' ? '#e07070' : '#9e763b' }}>{accountStatus === 'suspended' ? 'Account suspended' : 'Account active'}</span>
          </div>
        </div>
        <button onClick={() => { setDeleteError(''); setConfirmDelete(true) }}
          style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '0.375rem', background: 'transparent', border: '1px solid rgba(224,112,112,0.4)', color: '#e07070', padding: '0.4375rem 0.875rem', borderRadius: '0.25rem', fontSize: '0.75rem', fontFamily: 'var(--font-sans)', cursor: 'pointer' }}>
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M2 3.5h10M5.5 3.5V2.5a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v1M11 3.5l-.5 8a1 1 0 0 1-1 .9H4.5a1 1 0 0 1-1-.9L3 3.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Delete company
        </button>
      </div>

      {confirmDelete && (
        <ConfirmDialog title="Delete this company?" note="Removes the company and its experiences. The provider account is not affected."
          error={deleteError} confirmLabel="Delete permanently" busyLabel="Deleting…" busy={deleting}
          onConfirm={handleDelete} onCancel={() => setConfirmDelete(false)}>
          You&apos;re about to permanently delete <strong style={{ color: 'var(--db-text)' }}>{company.name}</strong> and {experiences.length} experience(s). This cannot be undone.
        </ConfirmDialog>
      )}
      {confirmCountersign && signatory && (
        <ConfirmDialog title="Countersign as Palmera?" note={`Executes the agreement on behalf of ${PALMERA_SIGNATORY.entity}, recorded against your account (${adminEmail}).`}
          error={countersignError} confirmLabel="Countersign" busyLabel="Signing…" busy={countersigning}
          onConfirm={handleCountersign} onCancel={() => setConfirmCountersign(false)}>
          You&apos;re countersigning as <strong style={{ color: 'var(--db-text)' }}>{signatory.name}, {signatory.title}</strong> for <strong style={{ color: 'var(--db-text)' }}>{provider?.fullName || provider?.email}</strong>. This marks the agreement fully executed.
        </ConfirmDialog>
      )}

      <div style={{ display: 'flex', overflowX: 'auto', borderBottom: '1px solid var(--db-border-subtle)', marginBottom: '1.75rem', scrollbarWidth: 'none' }}>
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ flexShrink: 0, padding: '0.625rem 1.25rem', background: 'transparent', border: 'none', borderBottom: tab === t.key ? '2px solid #be9a56' : '2px solid transparent', color: tab === t.key ? '#be9a56' : 'var(--db-text-muted)', fontSize: '0.8125rem', fontFamily: 'var(--font-sans)', letterSpacing: '0.04em', cursor: 'pointer', marginBottom: '-1px' }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div>
          <SectionHeading>Company</SectionHeading>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--db-text-faint)', margin: '0 0 1rem' }}>
            Editable by admin — use this to fill in or correct a company&apos;s profile, e.g. when a partner never finished their own Business Profile.
          </p>
          <CompanyForm initial={company} submitLabel="Save company profile" saving={savingProfile} onSubmit={handleSaveProfile} />
          {savedProfile && <p style={{ fontSize: '0.8125rem', color: '#be9a56', fontFamily: 'var(--font-sans)', marginTop: '0.75rem' }}>✓ Saved</p>}
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
          {publishError && <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: '#e07070', margin: '0 0 1rem' }}>{publishError}</p>}
          {experiences.length === 0 ? (
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--db-text-ghost)', fontStyle: 'italic' }}>No experiences yet.</p>
          ) : experiences.map((e) => (
            <div key={e.id} style={{ background: 'var(--db-bg-card)', border: '1px solid var(--db-border-subtle)', borderRadius: '0.5rem', padding: '1rem 1.25rem', marginBottom: '0.875rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                <p style={{ fontFamily: 'var(--font-serif)', color: 'var(--db-text)', fontSize: '0.9375rem', margin: 0 }}>{e.title || 'Untitled'}</p>
                <span style={{ fontSize: '0.625rem', fontFamily: 'var(--font-sans)', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: '2px', border: '1px solid var(--db-border-subtle)', color: 'var(--db-text-muted)' }}>{e.status}</span>
                {(e.needsReview?.length ?? 0) > 0 && (
                  <span style={{ fontSize: '0.625rem', fontFamily: 'var(--font-sans)', letterSpacing: '0.04em', padding: '2px 8px', borderRadius: '2px', border: '1px solid rgba(224,112,112,0.35)', color: '#e07070' }}>
                    Needs review: {e.needsReview!.join(', ')}
                  </span>
                )}
              </div>
              <Grid>
                <Field label="Category" value={e.category} />
                <Field label="City" value={e.city} />
                <Field label="Price" value={e.price != null ? `${e.price.toLocaleString()} ${e.currency || ''} (${e.priceUnit})` : 'Reservation'} />
                <Field label="Duration" value={e.duration} />
              </Grid>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                {e.status === 'published' ? (
                  <button onClick={() => handlePublish(e.id!, 'unpublished')}
                    style={{ padding: '0.4375rem 0.875rem', background: 'transparent', border: '1px solid var(--db-border)', borderRadius: '0.25rem', color: 'var(--db-text-muted)', fontSize: '0.75rem', fontFamily: 'var(--font-sans)', cursor: 'pointer' }}>Unpublish</button>
                ) : (() => {
                  const blockers = publishBlockers(e)
                  return (
                    <button onClick={() => handlePublish(e.id!, 'published')} disabled={blockers.length > 0}
                      title={blockers.length ? `Needs: ${blockers.join(', ')}` : ''}
                      style={{ padding: '0.4375rem 0.875rem', background: blockers.length ? 'var(--db-bg-card)' : '#9e763b', border: blockers.length ? '1px solid var(--db-border-subtle)' : 'none', borderRadius: '0.25rem', color: blockers.length ? 'var(--db-text-ghost)' : '#ebe8db', fontSize: '0.75rem', fontFamily: 'var(--font-sans)', cursor: blockers.length ? 'not-allowed' : 'pointer' }}>
                      {blockers.length ? `Publish — needs ${blockers.length} item(s)` : 'Publish'}
                    </button>
                  )
                })()}
                <input defaultValue={e.tag || ''} placeholder="Curation tag" onBlur={(ev) => { if (ev.target.value !== (e.tag || '')) handleTag(e.id!, ev.target.value) }}
                  style={{ background: 'var(--db-bg-input)', border: '1px solid var(--db-border-subtle)', borderRadius: '0.25rem', padding: '0.375rem 0.625rem', color: 'var(--db-text)', fontSize: '0.75rem', fontFamily: 'var(--font-sans)', outline: 'none', width: '10rem' }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'signoff' && (
        <div>
          {!signoff?.signedAt ? (
            <div style={{ background: 'var(--db-bg-card)', border: '1px solid var(--db-border-subtle)', borderRadius: '0.5rem', padding: '0.875rem 1.25rem' }}>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--db-text-ghost)', margin: 0, fontStyle: 'italic' }}>Provider has not signed off yet.</p>
            </div>
          ) : (
            <>
              <SectionHeading>Provider signature</SectionHeading>
              <div style={{ background: 'var(--db-bg-card)', border: '1px solid var(--db-border-subtle)', borderRadius: '0.5rem', padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
                <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'var(--db-text)', fontSize: '1.125rem', margin: '0 0 0.25rem' }}>{signoff.typedSignature || signoff.signedBy}</p>
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--db-text-muted)', margin: 0 }}>{signoff.signatoryRole ? `${signoff.signatoryRole} · ` : ''}{providerDate}{signoff.agreementVersion ? ` · Version ${signoff.agreementVersion}` : ''}</p>
              </div>

              <SectionHeading>Palmera countersignature</SectionHeading>
              {executed ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', background: 'rgba(158,118,59,0.08)', border: '1px solid rgba(158,118,59,0.25)', borderRadius: '0.5rem', padding: '0.875rem 1.25rem', marginBottom: '1.5rem' }}>
                  <div style={{ width: '0.5rem', height: '0.5rem', borderRadius: '50%', background: '#9e763b', flexShrink: 0 }} />
                  <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: '#be9a56', margin: 0 }}>{countersign!.signatoryName}{countersign!.signatoryTitle ? `, ${countersign!.signatoryTitle}` : ''} · countersigned {formatDate(countersign!.executedAt)} by {countersign!.executedByEmail}</p>
                </div>
              ) : (
                <div style={{ background: 'var(--db-bg-card)', border: '1px solid var(--db-border-subtle)', borderRadius: '0.5rem', padding: '1.125rem 1.25rem', marginBottom: '1.5rem' }}>
                  <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--db-text-muted)', margin: '0 0 1rem', fontStyle: 'italic' }}>Awaiting Palmera countersignature.</p>
                  {showRepForm ? (
                    <div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 12rem), 1fr))', gap: '0.75rem', marginBottom: '0.875rem' }}>
                        <input value={repName} onChange={(e) => setRepName(e.target.value)} placeholder="Full name"
                          style={{ background: 'var(--db-bg-input)', border: '1px solid var(--db-border-subtle)', borderRadius: '0.375rem', padding: '0.625rem 0.875rem', color: 'var(--db-text)', fontSize: '0.875rem', fontFamily: 'var(--font-sans)', outline: 'none' }} />
                        <input value={repTitle} onChange={(e) => setRepTitle(e.target.value)} placeholder="Title"
                          style={{ background: 'var(--db-bg-input)', border: '1px solid var(--db-border-subtle)', borderRadius: '0.375rem', padding: '0.625rem 0.875rem', color: 'var(--db-text)', fontSize: '0.875rem', fontFamily: 'var(--font-sans)', outline: 'none' }} />
                      </div>
                      {countersignError && <p style={{ fontSize: '0.75rem', color: '#e07070', margin: '0 0 0.75rem' }}>{countersignError}</p>}
                      <button onClick={handleSaveRep} disabled={!repName.trim() || !repTitle.trim() || savingRep}
                        style={{ padding: '0.5rem 1.125rem', background: '#9e763b', border: 'none', borderRadius: '0.375rem', color: '#ebe8db', fontSize: '0.8125rem', fontFamily: 'var(--font-sans)', cursor: 'pointer' }}>
                        {savingRep ? 'Saving…' : 'Save representative'}
                      </button>
                    </div>
                  ) : (
                    <div>
                      <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--db-text)', margin: '0 0 0.875rem' }}>
                        Signing as <strong>{signatory!.name}</strong>, {signatory!.title}
                        <button onClick={() => setEditingRep(true)} style={{ marginLeft: '0.625rem', background: 'transparent', border: 'none', color: '#be9a56', fontSize: '0.75rem', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}>edit</button>
                      </p>
                      <button onClick={() => { setCountersignError(''); setConfirmCountersign(true) }}
                        style={{ padding: '0.5rem 1.125rem', background: '#9e763b', border: 'none', borderRadius: '0.375rem', color: '#ebe8db', fontSize: '0.8125rem', fontFamily: 'var(--font-sans)', cursor: 'pointer' }}>
                        Countersign as Palmera
                      </button>
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
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--db-text-muted)', margin: '0 0 1rem' }}>
            {accountStatus === 'suspended'
              ? 'This provider is suspended — they cannot access the dashboard. Suspending affects every company they own.'
              : 'This provider can access the dashboard normally, whether or not they’ve finished onboarding.'}
          </p>
          <button onClick={handleToggleAccountStatus} disabled={savingStatus}
            style={{ padding: '0.625rem 1.25rem', background: accountStatus === 'suspended' ? '#9e763b' : 'transparent', border: `1px solid ${accountStatus === 'suspended' ? 'transparent' : 'rgba(224,112,112,0.4)'}`, borderRadius: '0.375rem', color: accountStatus === 'suspended' ? '#ebe8db' : '#e07070', fontSize: '0.8125rem', fontFamily: 'var(--font-sans)', cursor: 'pointer' }}>
            {savingStatus ? 'Saving…' : accountStatus === 'suspended' ? 'Reactivate account' : 'Suspend account'}
          </button>

          <SectionHeading>Commission activation</SectionHeading>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--db-text-muted)', margin: '0 0 1rem' }}>
            {company.activatedAt ? `Activated ${formatDate(company.activatedAt)}. Commission window runs 12 months from that date.` : 'Not yet activated — this is a separate step from the account itself; it starts the 12-month commission window when the business is ready to go live.'}
          </p>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.625rem', color: 'var(--db-text-faint)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 0.375rem' }}>Commission rate (%)</p>
              <input type="number" min="0" max="100" value={rateInput} onChange={(e) => setRateInput(e.target.value)}
                style={{ width: '6rem', background: 'var(--db-bg-input)', border: '1px solid var(--db-border-subtle)', borderRadius: '0.375rem', padding: '0.625rem 0.875rem', color: 'var(--db-text)', fontSize: '0.875rem', fontFamily: 'var(--font-sans)', outline: 'none' }} />
            </div>
            {company.activatedAt ? (
              <button onClick={handleSaveRate} disabled={savingRate}
                style={{ padding: '0.625rem 1.25rem', background: 'transparent', border: '1px solid var(--db-border-gold)', borderRadius: '0.375rem', color: 'var(--db-text-muted)', fontSize: '0.8125rem', fontFamily: 'var(--font-sans)', cursor: 'pointer' }}>
                {savingRate ? 'Saving…' : 'Update rate'}
              </button>
            ) : (
              <button onClick={handleActivate} disabled={savingRate}
                style={{ padding: '0.625rem 1.25rem', background: '#9e763b', border: 'none', borderRadius: '0.375rem', color: '#ebe8db', fontSize: '0.8125rem', fontFamily: 'var(--font-sans)', cursor: 'pointer' }}>
                {savingRate ? 'Activating…' : 'Activate company'}
              </button>
            )}
          </div>
          {companyAdmin?.payoutMethod === null && (
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--db-text-ghost)', fontStyle: 'italic', marginTop: '1rem' }}>Payout method not yet set up (Phase 4).</p>
          )}
        </div>
      )}
    </div>
  )
}
