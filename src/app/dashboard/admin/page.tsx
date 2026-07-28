'use client'
export const dynamic = 'force-dynamic'
// Admin home — a PARTNER directory, matching the real hierarchy: one row per
// provider (person), their companies nested inside the row. Filterable by the
// three states that drive admin action: onboarding stage, agreement, account.
import { useEffect, useState, useCallback } from 'react'
import { onAuthChange } from '@/lib/auth'
import {
  getAllCompanies, getAllProviders, getAllExperiencesAdmin, getProviderAdmin,
  getCountersignature, deleteCompanyCascade, deleteProviderAccountCascade,
} from '@/lib/firestore'
import ConfirmDialog from '@/components/dashboard/ConfirmDialog'
import type { Company, Provider } from '@/lib/schema'

const ADMIN_EMAILS = ['palmeraexp@gmail.com']

function formatDate(ts: unknown): string {
  if (!ts) return '—'
  const sec = (ts as { seconds?: number })?.seconds
  if (sec) return new Date(sec * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  if (typeof ts === 'string') return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  return '—'
}

type StageFilter = 'all' | 'graduated' | 'onboarding'
type AgreementFilter = 'all' | 'signed' | 'unsigned' | 'countersigned'
type AccountFilter = 'all' | 'active' | 'suspended' | 'commission'

const chipStyle = (active: boolean): React.CSSProperties => ({
  padding: '0.375rem 0.75rem', borderRadius: '2rem', cursor: 'pointer',
  fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', letterSpacing: '0.03em',
  border: `1px solid ${active ? '#be9a56' : 'var(--db-border-subtle)'}`,
  background: active ? 'rgba(190,154,86,0.12)' : 'transparent',
  color: active ? '#be9a56' : 'var(--db-text-faint)',
})

function Tag({ children, tone }: { children: React.ReactNode; tone: 'gold' | 'green' | 'red' | 'dim' }) {
  const colors = {
    gold: { c: '#be9a56', bg: 'rgba(190,154,86,0.12)' },
    green: { c: '#7a9e6b', bg: 'rgba(122,158,107,0.12)' },
    red: { c: '#e07070', bg: 'rgba(224,112,112,0.12)' },
    dim: { c: 'var(--db-text-faint)', bg: 'var(--db-bg-card)' },
  }[tone]
  return (
    <span style={{ flexShrink: 0, fontFamily: 'var(--font-sans)', fontSize: '0.5625rem', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '0.1875rem 0.5rem', borderRadius: '2rem', background: colors.bg, color: colors.c }}>
      {children}
    </span>
  )
}

export default function AdminPage() {
  const [providers, setProviders] = useState<Provider[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [accountStatus, setAccountStatus] = useState<Record<string, 'active' | 'suspended'>>({})
  const [countersigned, setCountersigned] = useState<Record<string, boolean>>({})
  const [expCounts, setExpCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  const [stage, setStage] = useState<StageFilter>('all')
  const [agreement, setAgreement] = useState<AgreementFilter>('all')
  const [account, setAccount] = useState<AccountFilter>('all')
  const [search, setSearch] = useState('')

  const [toDelete, setToDelete] = useState<Company | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [toDeleteProvider, setToDeleteProvider] = useState<Provider | null>(null)
  const [deletingProvider, setDeletingProvider] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [cos, provs, exps] = await Promise.all([getAllCompanies(), getAllProviders(), getAllExperiencesAdmin()])
    const partners = provs.filter((p) => !ADMIN_EMAILS.includes(p.email))
    setProviders(partners)
    setCompanies(cos)
    const counts: Record<string, number> = {}
    exps.forEach((e) => { counts[e.companyId] = (counts[e.companyId] || 0) + 1 })
    setExpCounts(counts)
    const [statuses, csigns] = await Promise.all([
      Promise.all(partners.map(async (p) => [p.uid, (await getProviderAdmin(p.uid))?.status || 'active'] as const)),
      Promise.all(partners.map(async (p) => [p.uid, !!(await getCountersignature(p.uid))] as const)),
    ])
    setAccountStatus(Object.fromEntries(statuses))
    setCountersigned(Object.fromEntries(csigns))
    setRefreshedAt(new Date())
    setLoading(false)
  }, [])

  useEffect(() => {
    const unsub = onAuthChange(async (user) => {
      if (!user || !ADMIN_EMAILS.includes(user.email || '')) return
      await load()
    })
    return () => unsub()
  }, [load])

  const companiesOf = (uid: string) => companies.filter((c) => c.providerId === uid)

  const handleDelete = async () => {
    if (!toDelete?.id) return
    setDeleting(true); setDeleteError('')
    try { await deleteCompanyCascade(toDelete.id); setToDelete(null); setDeleting(false); await load() }
    catch { setDeleteError('Could not delete this company. Please try again.'); setDeleting(false) }
  }
  const handleDeleteProvider = async () => {
    if (!toDeleteProvider) return
    setDeletingProvider(true); setDeleteError('')
    try { await deleteProviderAccountCascade(toDeleteProvider.uid); setToDeleteProvider(null); setDeletingProvider(false); await load() }
    catch { setDeleteError('Could not delete this account. Please try again.'); setDeletingProvider(false) }
  }

  // ── Filters ──
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

  const statCard = (label: string, value: number, color?: string) => (
    <div style={{ background: 'var(--db-bg-card)', border: '1px solid var(--db-border)', borderRadius: '0.5rem', padding: '1rem 1.25rem', minWidth: '7rem', flex: 1 }}>
      <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.625rem', color: 'var(--db-text-faint)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.375rem' }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', color: color || 'var(--db-text)', letterSpacing: '0.04em' }}>{value}</div>
    </div>
  )

  const filterGroup = <T extends string>(label: string, value: T, set: (v: T) => void, opts: [T, string][]) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexWrap: 'wrap' }}>
      <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.625rem', color: 'var(--db-text-ghost)', letterSpacing: '0.08em', textTransform: 'uppercase', marginRight: '0.125rem' }}>{label}</span>
      {opts.map(([k, lab]) => (
        <button key={k} onClick={() => set(value === k ? ('all' as T) : k)} style={chipStyle(value === k)}>{lab}</button>
      ))}
    </div>
  )

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh' }}>
      <div style={{ width: '1.75rem', height: '1.75rem', border: '2px solid rgba(190,154,86,0.15)', borderTopColor: '#be9a56', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const graduated = providers.filter((p) => p.onboardingStage === 'complete').length
  const unsignedCount = providers.filter((p) => !p.signoff).length
  const suspendedCount = providers.filter((p) => accountStatus[p.uid] === 'suspended').length

  return (
    <div>
      <div style={{ marginBottom: '1.75rem' }}>
        <p style={{ fontFamily: 'var(--font-sans)', color: 'rgba(190,154,86,0.8)', fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 0.5rem' }}>Internal</p>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', color: 'var(--db-text)', fontSize: 'clamp(1.375rem, 3vw, 1.625rem)', fontWeight: 400, letterSpacing: '0.06em', margin: '0 0 0.375rem' }}>Partners</h1>
            <p style={{ fontFamily: 'var(--font-serif)', color: 'var(--db-text-muted)', fontSize: '0.875rem', margin: 0 }}>Every partner on Palmera — their companies live inside each row.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', flexShrink: 0 }}>
            {refreshedAt && <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', color: 'var(--db-text-ghost)', letterSpacing: '0.04em' }}>Updated {refreshedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
            <button onClick={load} style={{ background: 'transparent', border: '1px solid var(--db-border-gold)', color: 'var(--db-text-muted)', padding: '0.375rem 0.875rem', borderRadius: '0.25rem', fontSize: '0.75rem', fontFamily: 'var(--font-sans)', cursor: 'pointer', letterSpacing: '0.04em' }}>Refresh</button>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {statCard('Partners', providers.length)}
        {statCard('Graduated', graduated)}
        {statCard('Agreement missing', unsignedCount, unsignedCount > 0 ? '#be9a56' : undefined)}
        {statCard('Suspended', suspendedCount, suspendedCount > 0 ? '#e07070' : undefined)}
      </div>

      {/* Search + filter tags */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', marginBottom: '1.25rem' }}>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search partner, email, or company…"
          style={{ maxWidth: '24rem', background: 'var(--db-bg-input)', border: '1px solid var(--db-border-subtle)', borderRadius: '0.375rem', padding: '0.5625rem 0.875rem', color: 'var(--db-text)', fontSize: '0.8125rem', fontFamily: 'var(--font-sans)', outline: 'none' }} />
        <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
          {filterGroup<StageFilter>('Stage', stage, setStage, [['graduated', 'Graduated'], ['onboarding', 'In onboarding']])}
          {filterGroup<AgreementFilter>('Agreement', agreement, setAgreement, [['signed', 'Signed'], ['unsigned', 'Not signed'], ['countersigned', 'Countersigned']])}
          {filterGroup<AccountFilter>('Account', account, setAccount, [['active', 'Active'], ['suspended', 'Suspended'], ['commission', 'Commission on']])}
        </div>
      </div>

      {/* Partner rows */}
      {shown.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--db-text-faint)', fontFamily: 'var(--font-sans)', fontSize: '0.875rem' }}>No partners match these filters.</div>
      ) : (
        <div style={{ border: '1px solid var(--db-border)', borderRadius: '0.5rem', overflow: 'hidden' }}>
          {shown.map((p, i) => {
            const cos = companiesOf(p.uid)
            const isExp = expanded === p.uid
            const suspended = accountStatus[p.uid] === 'suspended'
            return (
              <div key={p.uid} style={{ borderBottom: i < shown.length - 1 ? '1px solid var(--db-border-subtle)' : 'none' }}>
                <div onClick={() => setExpanded(isExp ? null : p.uid)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.875rem', flexWrap: 'wrap', padding: '0.9375rem 1.25rem', cursor: 'pointer', background: isExp ? 'var(--db-bg-card-active)' : 'transparent' }}>
                  <div style={{ minWidth: 0, flex: '1 1 14rem' }}>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', color: 'var(--db-text)', marginBottom: '0.1875rem' }}>{p.fullName || p.email}</div>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', color: 'var(--db-text-faint)' }}>
                      {p.email} · {cos.length} {cos.length === 1 ? 'company' : 'companies'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexWrap: 'wrap' }}>
                    <Tag tone={p.onboardingStage === 'complete' ? 'gold' : 'dim'}>{p.onboardingStage === 'complete' ? 'Graduated' : 'Onboarding'}</Tag>
                    <Tag tone={p.signoff ? 'green' : 'red'}>{p.signoff ? (countersigned[p.uid] ? 'Executed' : 'Signed') : 'No agreement'}</Tag>
                    {suspended && <Tag tone="red">Suspended</Tag>}
                    {cos.some((c) => c.activatedAt) && <Tag tone="green">Commission on</Tag>}
                    <span style={{ color: 'var(--db-text-ghost)', fontSize: '0.75rem', marginLeft: '0.25rem' }}>{isExp ? '▾' : '▸'}</span>
                  </div>
                </div>

                {isExp && (
                  <div style={{ borderTop: '1px solid var(--db-border-subtle)', background: 'var(--db-bg-card)', padding: '1rem 1.25rem' }}>
                    {/* Provider facts */}
                    <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', color: 'var(--db-text-muted)', marginBottom: cos.length > 0 ? '0.875rem' : 0 }}>
                      {p.primaryPhone && <span>📞 {p.primaryPhone}</span>}
                      <span>{p.signoff ? `Agreement signed ${formatDate(p.signoff.signedAt)}` : 'Agreement not signed'}</span>
                      {p.role && <span style={{ textTransform: 'capitalize' }}>{p.role}</span>}
                    </div>

                    {/* Nested companies */}
                    {cos.length === 0 ? (
                      <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--db-text-ghost)', fontStyle: 'italic', margin: '0 0 0.875rem' }}>No companies yet.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.875rem' }}>
                        {cos.map((c) => (
                          <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap', border: '1px solid var(--db-border-subtle)', borderRadius: '0.375rem', padding: '0.625rem 0.875rem', background: 'var(--db-bg)' }}>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--db-text)' }}>{c.name || 'Untitled company'}</div>
                              <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6563rem', color: 'var(--db-text-faint)', textTransform: 'capitalize' }}>
                                {[c.category, c.city].filter(Boolean).join(' · ') || '—'} · {expCounts[c.id!] || 0} experience(s)
                                {c.activatedAt ? ` · commission since ${formatDate(c.activatedAt)}` : ' · not commission-activated'}
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexShrink: 0 }}>
                              <button onClick={() => { setDeleteError(''); setToDelete(c) }}
                                style={{ background: 'transparent', border: '1px solid rgba(224,112,112,0.35)', color: '#e07070', padding: '0.25rem 0.625rem', borderRadius: '0.25rem', fontSize: '0.6563rem', fontFamily: 'var(--font-sans)', cursor: 'pointer' }}>Delete</button>
                              <a href={`/dashboard/admin/companies/${c.id}`} style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6563rem', color: '#be9a56', textDecoration: 'none', padding: '0.25rem 0.625rem', borderRadius: '0.25rem', border: '1px solid rgba(190,154,86,0.25)' }}>Manage →</a>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <button onClick={() => { setDeleteError(''); setToDeleteProvider(p) }}
                      style={{ background: 'transparent', border: '1px solid rgba(224,112,112,0.35)', color: '#e07070', padding: '0.3125rem 0.75rem', borderRadius: '0.25rem', fontSize: '0.6875rem', fontFamily: 'var(--font-sans)', cursor: 'pointer' }}>
                      Delete entire account
                    </button>
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
