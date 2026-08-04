'use client'
export const dynamic = 'force-dynamic'
// Admin home — a PARTNER directory, matching the real hierarchy: one row per
// provider (person), their companies nested inside the row. Live-updating
// (collection listeners), filters carried in the URL so views are shareable
// and survive reloads.
import { useEffect, useRef, useState, Suspense } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import {
  subscribeAllProviders, subscribeAllCompanies, getAllExperiencesAdmin,
  getProviderAdmin, getCountersignature, deleteCompanyCascade, deleteProviderAccountCascade,
} from '@/lib/firestore'
import { isAdminEmail } from '@/lib/admin'
import ConfirmDialog from '@/components/dashboard/ConfirmDialog'
import { ScreenHeader, Chip, EmptyState, Skeleton, GhostButton, card, eyebrow } from '@/components/partner/ui'
import { CountTile, FilterChip, DangerButton, inputStyle, formatDate, glass } from '../ui'
import type { Company, Provider } from '@/lib/schema'

type StageFilter = 'all' | 'graduated' | 'onboarding'
type AgreementFilter = 'all' | 'signed' | 'unsigned' | 'countersigned'
type AccountFilter = 'all' | 'active' | 'suspended' | 'commission'

function DirectorySkeleton() {
  return (
    <div className="pf-in">
      <Skeleton height="74px" style={{ maxWidth: '30rem', marginBottom: '22px' }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        <Skeleton height="86px" /><Skeleton height="86px" /><Skeleton height="86px" /><Skeleton height="86px" />
      </div>
      <div style={{ display: 'grid', gap: '10px' }}>
        {[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} height="64px" />)}
      </div>
    </div>
  )
}

function AdminDirectory() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [providers, setProviders] = useState<Provider[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [providersLoaded, setProvidersLoaded] = useState(false)
  const [companiesLoaded, setCompaniesLoaded] = useState(false)
  const [expCounts, setExpCounts] = useState<Record<string, number>>({})
  const [expanded, setExpanded] = useState<string | null>(null)

  // Per-provider admin metadata (suspension + countersignature). Hydrated in
  // the background AFTER the directory renders — the old page blocked its
  // whole load on 2 reads per partner.
  const [accountStatus, setAccountStatus] = useState<Record<string, 'active' | 'suspended'>>({})
  const [countersigned, setCountersigned] = useState<Record<string, boolean>>({})
  const [metaLoaded, setMetaLoaded] = useState(false)
  const hydratedFor = useRef<Set<string>>(new Set())

  const [toDelete, setToDelete] = useState<Company | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [toDeleteProvider, setToDeleteProvider] = useState<Provider | null>(null)
  const [deletingProvider, setDeletingProvider] = useState(false)

  // ── Live data ──
  useEffect(() => {
    const unsubP = subscribeAllProviders((ps) => { setProviders(ps.filter((p) => !isAdminEmail(p.email))); setProvidersLoaded(true) })
    const unsubC = subscribeAllCompanies((cs) => { setCompanies(cs); setCompaniesLoaded(true) })
    getAllExperiencesAdmin().then((exps) => {
      const counts: Record<string, number> = {}
      exps.forEach((e) => { counts[e.companyId] = (counts[e.companyId] || 0) + 1 })
      setExpCounts(counts)
    })
    return () => { unsubP(); unsubC() }
  }, [])

  // Background hydration of admin metadata — new providers (from later
  // snapshots) get picked up too; already-hydrated uids are skipped.
  useEffect(() => {
    if (!providersLoaded) return
    const fresh = providers.filter((p) => !hydratedFor.current.has(p.uid))
    if (fresh.length === 0) return
    fresh.forEach((p) => hydratedFor.current.add(p.uid))
    ;(async () => {
      const metas = await Promise.all(fresh.map(async (p) => {
        const [pa, cs] = await Promise.all([getProviderAdmin(p.uid), getCountersignature(p.uid)])
        return [p.uid, (pa?.status || 'active') as 'active' | 'suspended', !!cs] as const
      }))
      setAccountStatus((prev) => ({ ...prev, ...Object.fromEntries(metas.map(([uid, st]) => [uid, st])) }))
      setCountersigned((prev) => ({ ...prev, ...Object.fromEntries(metas.map(([uid, , cs]) => [uid, cs])) }))
      setMetaLoaded(true)
    })()
  }, [providers, providersLoaded])

  // ── URL-backed filters ──
  const stage = (searchParams.get('stage') || 'all') as StageFilter
  const agreement = (searchParams.get('agreement') || 'all') as AgreementFilter
  const account = (searchParams.get('account') || 'all') as AccountFilter
  const urlQ = searchParams.get('q') || ''
  const [search, setSearch] = useState(urlQ)

  const setParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value && value !== 'all') params.set(key, value); else params.delete(key)
    router.replace(params.size ? `${pathname}?${params}` : pathname, { scroll: false })
  }
  // Debounced search → URL, so a shared link carries the query too.
  useEffect(() => {
    if (search === urlQ) return
    const t = setTimeout(() => setParam('q', search.trim()), 250)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])
  const clearFilters = () => { setSearch(''); router.replace(pathname, { scroll: false }) }

  const loading = !(providersLoaded && companiesLoaded)
  if (loading) return <DirectorySkeleton />

  const companiesOf = (uid: string) => companies.filter((c) => c.providerId === uid)

  const handleDelete = async () => {
    if (!toDelete?.id) return
    setDeleting(true); setDeleteError('')
    try { await deleteCompanyCascade(toDelete.id); setToDelete(null); setDeleting(false) }
    catch { setDeleteError('Could not delete this company. Please try again.'); setDeleting(false) }
  }
  const handleDeleteProvider = async () => {
    if (!toDeleteProvider) return
    setDeletingProvider(true); setDeleteError('')
    try { await deleteProviderAccountCascade(toDeleteProvider.uid); setToDeleteProvider(null); setDeletingProvider(false) }
    catch { setDeleteError('Could not delete this account. Please try again.'); setDeletingProvider(false) }
  }

  // ── Filters (same predicate as the old page) ──
  const q = search.trim().toLowerCase()
  const shown = providers.filter((p) => {
    const cos = companiesOf(p.uid)
    if (stage === 'graduated' && p.onboardingStage !== 'complete') return false
    if (stage === 'onboarding' && p.onboardingStage === 'complete') return false
    if (agreement === 'signed' && !p.signoff) return false
    if (agreement === 'unsigned' && p.signoff) return false
    if (agreement === 'countersigned' && !countersigned[p.uid]) return false
    if (account === 'suspended' && accountStatus[p.uid] !== 'suspended') return false
    if (account === 'active' && accountStatus[p.uid] === 'suspended') return false
    if (account === 'commission' && !cos.some((c) => c.activatedAt)) return false
    if (q) {
      const hay = `${p.fullName} ${p.email} ${cos.map((c) => c.name).join(' ')}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  }).sort((a, b) => (a.fullName || a.email).localeCompare(b.fullName || b.email))

  const graduated = providers.filter((p) => p.onboardingStage === 'complete').length
  const unsignedCount = providers.filter((p) => !p.signoff).length
  const suspendedCount = providers.filter((p) => accountStatus[p.uid] === 'suspended').length

  const filterGroup = <T extends string>(label: string, key: string, value: T, opts: [T, string][]) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
      <span style={{ ...eyebrow, marginRight: '2px' }}>{label}</span>
      {opts.map(([k, lab]) => (
        <FilterChip key={k} active={value === k} onClick={() => setParam(key, value === k ? 'all' : k)}>{lab}</FilterChip>
      ))}
    </div>
  )

  return (
    <div className="pf-in">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap' }}>
        <ScreenHeader label="Internal" title="Partners" intro="Every partner on Palmera — their companies live inside each row." />
        <span style={{ marginTop: '4px' }}><Chip tone="green">● Live</Chip></span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        <CountTile label="Partners" value={providers.length} />
        <CountTile label="Graduated" value={graduated} />
        <CountTile label="Agreement missing" value={unsignedCount} tone={unsignedCount > 0 ? 'gold' : undefined} />
        <CountTile label="Suspended" value={suspendedCount} tone={suspendedCount > 0 ? 'alert' : undefined} />
      </div>

      {/* Search + filter chips — all mirrored in the URL */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '18px' }}>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search partner, email, or company…"
          style={{ ...inputStyle, maxWidth: '24rem' }} />
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          {filterGroup<StageFilter>('Stage', 'stage', stage, [['graduated', 'Graduated'], ['onboarding', 'In onboarding']])}
          {filterGroup<AgreementFilter>('Agreement', 'agreement', agreement, [['signed', 'Signed'], ['unsigned', 'Not signed'], ['countersigned', 'Countersigned']])}
          {filterGroup<AccountFilter>('Account', 'account', account, [['active', 'Active'], ['suspended', 'Suspended'], ['commission', 'Commission on']])}
        </div>
      </div>

      {/* Partner rows */}
      {shown.length === 0 ? (
        <EmptyState icon="◎" title="No partners match" body="Try clearing a filter or changing the search."
          action={<GhostButton onClick={clearFilters}>Clear filters</GhostButton>} />
      ) : (
        <div className="pf-glass" style={{ ...glass, padding: 0, overflow: 'hidden' }}>
          {shown.map((p, i) => {
            const cos = companiesOf(p.uid)
            const isExp = expanded === p.uid
            const suspended = accountStatus[p.uid] === 'suspended'
            return (
              <div key={p.uid} style={{ borderBottom: i < shown.length - 1 ? '1px solid var(--pf-border)' : 'none' }}>
                <div onClick={() => setExpanded(isExp ? null : p.uid)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap', padding: '15px 20px', cursor: 'pointer', background: isExp ? 'var(--pf-card)' : 'transparent' }}>
                  <div style={{ minWidth: 0, flex: '1 1 14rem' }}>
                    <div style={{ fontFamily: 'var(--font-serif)', fontSize: '14px', color: 'var(--pf-text)', marginBottom: '3px' }}>{p.fullName || p.email}</div>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', color: 'var(--pf-faint)' }}>
                      {p.email} · {cos.length} {cos.length === 1 ? 'company' : 'companies'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <Chip tone={p.onboardingStage === 'complete' ? 'gold' : 'neutral'}>{p.onboardingStage === 'complete' ? 'Graduated' : 'Onboarding'}</Chip>
                    <Chip tone={p.signoff ? 'green' : 'alert'}>{p.signoff ? (countersigned[p.uid] ? 'Executed' : 'Signed') : 'No agreement'}</Chip>
                    {!metaLoaded && <Skeleton height="18px" style={{ width: '58px', borderRadius: '999px' }} />}
                    {suspended && <Chip tone="alert">Suspended</Chip>}
                    {cos.some((c) => c.activatedAt) && <Chip tone="green">Commission on</Chip>}
                    <span style={{ color: 'var(--pf-faint)', fontSize: '12px', marginLeft: '4px' }}>{isExp ? '▾' : '▸'}</span>
                  </div>
                </div>

                {isExp && (
                  <div style={{ borderTop: '1px solid var(--pf-border)', background: 'var(--pf-card)', padding: '16px 20px' }}>
                    {/* Provider facts */}
                    <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', fontFamily: 'var(--font-sans)', fontSize: '11px', color: 'var(--pf-muted)', marginBottom: cos.length > 0 ? '14px' : 0 }}>
                      {p.primaryPhone && <span>📞 {p.primaryPhone}</span>}
                      <span>{p.signoff ? `Agreement signed ${formatDate(p.signoff.signedAt)}` : 'Agreement not signed'}</span>
                      {p.role && <span style={{ textTransform: 'capitalize' }}>{p.role}</span>}
                    </div>

                    {/* Nested companies */}
                    {cos.length === 0 ? (
                      <p style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: 'var(--pf-faint)', fontStyle: 'italic', margin: '0 0 14px' }}>No companies yet.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                        {cos.map((c) => (
                          <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', border: '1px solid var(--pf-border)', borderRadius: '12px', padding: '10px 14px', background: 'var(--pf-card-solid)' }}>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontFamily: 'var(--font-serif)', fontSize: '13px', color: 'var(--pf-text)' }}>{c.name || 'Untitled company'}</div>
                              <div style={{ fontFamily: 'var(--font-sans)', fontSize: '10.5px', color: 'var(--pf-faint)', textTransform: 'capitalize' }}>
                                {[c.category, c.city].filter(Boolean).join(' · ') || '—'} · {expCounts[c.id!] || 0} experience(s)
                                {c.activatedAt ? ` · commission since ${formatDate(c.activatedAt)}` : ' · not commission-activated'}
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                              <DangerButton onClick={() => { setDeleteError(''); setToDelete(c) }}>Delete</DangerButton>
                              <a href={`/admin/companies/${c.id}`} style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', color: 'var(--pf-gold)', textDecoration: 'none', padding: '8px 14px', borderRadius: '10px', border: '1px solid var(--pf-border-strong)', letterSpacing: '0.03em' }}>Manage →</a>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <DangerButton onClick={() => { setDeleteError(''); setToDeleteProvider(p) }}>Delete entire account</DangerButton>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {toDeleteProvider && (
        <ConfirmDialog
          title="Delete this partner account?"
          note="Removes ALL their companies, listings, payout details, countersignature, and the provider record. Their login is NOT deleted — signing in again starts a fresh, blank account."
          error={deleteError} confirmLabel="Delete account" busyLabel="Deleting…" busy={deletingProvider}
          onConfirm={handleDeleteProvider} onCancel={() => setToDeleteProvider(null)}>
          You&apos;re about to erase <strong style={{ color: 'var(--db-text)' }}>{toDeleteProvider.fullName || toDeleteProvider.email}</strong> — {companiesOf(toDeleteProvider.uid).length} company(ies) included. This cannot be undone.
        </ConfirmDialog>
      )}
      {toDelete && (
        <ConfirmDialog
          title="Delete this company?"
          note="Removes the company and its experiences. The partner keeps their account and any other companies."
          error={deleteError} confirmLabel="Delete permanently" busyLabel="Deleting…" busy={deleting}
          onConfirm={handleDelete} onCancel={() => setToDelete(null)}>
          You&apos;re about to permanently delete <strong style={{ color: 'var(--db-text)' }}>{toDelete.name || 'this company'}</strong> and {expCounts[toDelete.id!] || 0} experience(s). This cannot be undone.
        </ConfirmDialog>
      )}
    </div>
  )
}

export default function AdminPage() {
  // useSearchParams requires a Suspense boundary at build time.
  return <Suspense fallback={<DirectorySkeleton />}><AdminDirectory /></Suspense>
}
