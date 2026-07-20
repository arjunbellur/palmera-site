'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState, useCallback } from 'react'
import { onAuthChange } from '@/lib/auth'
import { getAllCompanies, getAllProviders, getAllExperiencesAdmin, getProviderAdmin, deleteCompanyCascade } from '@/lib/firestore'
import { useViewport } from '@/lib/use-viewport'
import ConfirmDialog from '@/components/dashboard/ConfirmDialog'
import type { Company, Provider } from '@/lib/schema'

const ADMIN_EMAILS = ['palmeraexp@gmail.com']

function formatDate(ts: unknown): string {
  if (!ts) return '—'
  const sec = (ts as { seconds?: number })?.seconds
  if (sec) return new Date(sec * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  return '—'
}

export default function AdminPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [providers, setProviders] = useState<Record<string, Provider>>({})
  // Account status = is this partner's dashboard account usable, regardless of
  // onboarding completeness. Defaults to 'active' when no admin doc exists yet
  // (e.g. every fresh signup) — distinct from company.active, which is the
  // admin-set commission-window switch (see the Admin controls tab).
  const [accountStatus, setAccountStatus] = useState<Record<string, 'active' | 'suspended'>>({})
  const [expCounts, setExpCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const { isMobile, isTablet } = useViewport()
  const narrow = isMobile || isTablet
  const [toDelete, setToDelete] = useState<Company | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const [cos, provs, exps] = await Promise.all([getAllCompanies(), getAllProviders(), getAllExperiencesAdmin()])
    setCompanies(cos)
    setProviders(Object.fromEntries(provs.map((p) => [p.uid, p])))
    const counts: Record<string, number> = {}
    exps.forEach((e) => { counts[e.companyId] = (counts[e.companyId] || 0) + 1 })
    setExpCounts(counts)
    const statuses = await Promise.all(provs.map(async (p) => [p.uid, (await getProviderAdmin(p.uid))?.status || 'active'] as const))
    setAccountStatus(Object.fromEntries(statuses))
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

  const handleDelete = async () => {
    if (!toDelete?.id) return
    setDeleting(true); setDeleteError('')
    try {
      await deleteCompanyCascade(toDelete.id)
      setToDelete(null); setDeleting(false)
      await load()
    } catch {
      setDeleteError('Could not delete this company. Please try again.'); setDeleting(false)
    }
  }

  const totalSuspended = companies.filter((c) => accountStatus[c.providerId] === 'suspended').length
  const totalNotActivated = companies.filter((c) => !c.activatedAt).length

  // Account status (active/suspended) is the headline badge — it's whether the
  // partner can use the dashboard at all. Commission activation (company.active)
  // is a separate, later business decision shown as a secondary chip.
  const accountBadge = (providerId: string) => {
    const suspended = accountStatus[providerId] === 'suspended'
    return (
      <span style={{ flexShrink: 0, fontFamily: 'var(--font-sans)', fontSize: '0.625rem', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '0.1875rem 0.5rem', borderRadius: '0.25rem', background: suspended ? 'rgba(224,112,112,0.12)' : 'rgba(158,118,59,0.12)', color: suspended ? '#e07070' : '#9e763b' }}>
        {suspended ? 'Suspended' : 'Active'}
      </span>
    )
  }

  const statCard = (label: string, value: number, color?: string) => (
    <div style={{ background: 'var(--db-bg-card)', border: '1px solid var(--db-border)', borderRadius: '0.5rem', padding: '1rem 1.25rem', minWidth: '7rem', flex: 1 }}>
      <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.625rem', color: 'var(--db-text-faint)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.375rem' }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', color: color || 'var(--db-text)', letterSpacing: '0.04em' }}>{value}</div>
    </div>
  )

  const expandedPanel = (c: Company) => {
    const p = providers[c.providerId]
    return (
      <div style={{ borderTop: '1px solid var(--db-border-subtle)', background: 'var(--db-bg-card)', padding: '1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 13rem), 1fr))', gap: '1.25rem 2rem' }}>
          <div>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.625rem', color: 'var(--db-text-faint)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Provider</p>
            {[
              { label: 'Name', value: p?.fullName },
              { label: 'Email', value: p?.email },
              { label: 'Phone', value: p?.primaryPhone },
              { label: 'Agreement', value: p?.signoff ? `Signed ${formatDate(p.signoff.signedAt)}` : 'Not signed' },
            ].filter((r) => r.value).map((r) => (
              <div key={r.label} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', color: 'var(--db-text-faint)', minWidth: '5rem' }}>{r.label}</span>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', color: 'var(--db-text-muted)' }}>{r.value}</span>
              </div>
            ))}
          </div>
          <div>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.625rem', color: 'var(--db-text-faint)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Company</p>
            {[
              { label: 'Category', value: c.category },
              { label: 'City', value: c.city },
              { label: 'Address', value: c.address },
              { label: 'Activated', value: c.activatedAt ? formatDate(c.activatedAt) : 'Not yet' },
            ].filter((r) => r.value).map((r) => (
              <div key={r.label} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', color: 'var(--db-text-faint)', minWidth: '5rem' }}>{r.label}</span>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', color: 'var(--db-text-muted)', textTransform: 'capitalize' }}>{r.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh' }}>
      <div style={{ width: '1.75rem', height: '1.75rem', border: '2px solid rgba(190,154,86,0.15)', borderTopColor: '#be9a56', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <p style={{ fontFamily: 'var(--font-sans)', color: 'rgba(190,154,86,0.8)', fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 0.5rem' }}>Internal</p>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', color: 'var(--db-text)', fontSize: 'clamp(1.375rem, 3vw, 1.625rem)', fontWeight: 400, letterSpacing: '0.06em', margin: '0 0 0.375rem' }}>Companies</h1>
            <p style={{ fontFamily: 'var(--font-serif)', color: 'var(--db-text-muted)', fontSize: '0.875rem', margin: 0 }}>Every company on Palmera, across all providers.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', flexShrink: 0 }}>
            {refreshedAt && <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', color: 'var(--db-text-ghost)', letterSpacing: '0.04em' }}>Updated {refreshedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
            <button onClick={load} style={{ background: 'transparent', border: '1px solid var(--db-border-gold)', color: 'var(--db-text-muted)', padding: '0.375rem 0.875rem', borderRadius: '0.25rem', fontSize: '0.75rem', fontFamily: 'var(--font-sans)', cursor: 'pointer', letterSpacing: '0.04em' }}>Refresh</button>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        {statCard('Total companies', companies.length)}
        {statCard('Suspended', totalSuspended, totalSuspended > 0 ? '#e07070' : undefined)}
        {statCard('Not commission-activated', totalNotActivated)}
        {statCard('Total experiences', Object.values(expCounts).reduce((a, b) => a + b, 0))}
      </div>

      {companies.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--db-text-faint)', fontFamily: 'var(--font-sans)', fontSize: '0.875rem' }}>No companies yet.</div>
      ) : narrow ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {companies.map((c) => {
            const isExp = expanded === c.id
            const p = providers[c.providerId]
            return (
              <div key={c.id} style={{ border: '1px solid var(--db-border)', borderRadius: '0.5rem', background: 'var(--db-bg-card)', overflow: 'hidden' }}>
                <div onClick={() => setExpanded(isExp ? null : c.id!)} style={{ padding: '1rem 1.125rem', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.625rem' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', color: 'var(--db-text)', marginBottom: '0.1875rem' }}>{c.name || 'Untitled company'}</div>
                      <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', color: 'var(--db-text-faint)' }}>{p?.email || c.providerId}</div>
                    </div>
                    {accountBadge(c.providerId)}
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', color: 'var(--db-text-faint)', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ textTransform: 'capitalize' }}>{c.category || '—'}</span>·<span style={{ textTransform: 'capitalize' }}>{c.city || '—'}</span>·<span>{expCounts[c.id!] || 0} experience(s)</span>
                    {c.activatedAt ? (
                      <span style={{ fontSize: '0.625rem', color: '#9e763b', border: '1px solid rgba(158,118,59,0.3)', padding: '0.0625rem 0.375rem', borderRadius: '0.1875rem' }}>Commission activated</span>
                    ) : (
                      <span style={{ fontSize: '0.625rem', color: 'var(--db-text-ghost)', border: '1px solid var(--db-border-subtle)', padding: '0.0625rem 0.375rem', borderRadius: '0.1875rem' }}>Not commission-activated</span>
                    )}
                  </div>
                </div>
                <div style={{ borderTop: '1px solid var(--db-border-subtle)', padding: '0.625rem 1.125rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
                  <button onClick={() => setExpanded(isExp ? null : c.id!)} style={{ background: 'transparent', border: 'none', color: 'var(--db-text-faint)', fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', letterSpacing: '0.04em', cursor: 'pointer', padding: 0 }}>{isExp ? 'Hide details' : 'Show details'}</button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button onClick={() => { setDeleteError(''); setToDelete(c) }} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3125rem', background: 'transparent', border: '1px solid rgba(224,112,112,0.4)', color: '#e07070', padding: '0.3125rem 0.625rem', borderRadius: '0.25rem', fontSize: '0.6875rem', fontFamily: 'var(--font-sans)', cursor: 'pointer' }}>Delete</button>
                    <a href={`/dashboard/admin/companies/${c.id}`} style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', color: '#be9a56', textDecoration: 'none', padding: '0.3125rem 0.75rem', borderRadius: '0.25rem', border: '1px solid rgba(190,154,86,0.25)' }}>View →</a>
                  </div>
                </div>
                {isExp && expandedPanel(c)}
              </div>
            )
          })}
        </div>
      ) : (
        <div style={{ border: '1px solid var(--db-border)', borderRadius: '0.5rem', overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto auto', gap: 0, background: 'var(--db-bg-card)', borderBottom: '1px solid var(--db-border)', padding: '0.625rem 1.25rem', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.625rem', color: 'var(--db-text-faint)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Company</span>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.625rem', color: 'var(--db-text-faint)', letterSpacing: '0.1em', textTransform: 'uppercase', minWidth: '8rem' }}>Category / City</span>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.625rem', color: 'var(--db-text-faint)', letterSpacing: '0.1em', textTransform: 'uppercase', textAlign: 'right', minWidth: '6rem' }}>Experiences</span>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.625rem', color: 'var(--db-text-faint)', letterSpacing: '0.1em', textTransform: 'uppercase', textAlign: 'right', minWidth: '5rem' }}>Status</span>
            <span style={{ minWidth: '7rem' }} />
          </div>
          {companies.map((c, i) => {
            const isExp = expanded === c.id
            const p = providers[c.providerId]
            return (
              <div key={c.id} style={{ borderBottom: i < companies.length - 1 ? '1px solid var(--db-border-subtle)' : 'none' }}>
                <div onClick={() => setExpanded(isExp ? null : c.id!)}
                  style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto auto', gap: 0, padding: '0.875rem 1.25rem', alignItems: 'center', cursor: 'pointer', background: isExp ? 'var(--db-bg-card-active)' : 'transparent' }}>
                  <div>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--db-text)', marginBottom: '0.125rem' }}>{c.name || 'Untitled company'}</div>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', color: 'var(--db-text-faint)' }}>{p?.email || c.providerId}</div>
                  </div>
                  <div style={{ minWidth: '8rem', fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--db-text-muted)', textTransform: 'capitalize' }}>{[c.category, c.city].filter(Boolean).join(' · ') || '—'}</div>
                  <div style={{ minWidth: '6rem', textAlign: 'right', fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--db-text-muted)' }}>{expCounts[c.id!] || 0}</div>
                  <div style={{ minWidth: '5rem', textAlign: 'right' }}>
                    {accountBadge(c.providerId)}
                  </div>
                  <div style={{ minWidth: '7rem', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.375rem' }} onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => { setDeleteError(''); setToDelete(c) }} title="Delete company"
                      style={{ display: 'inline-flex', alignItems: 'center', background: 'transparent', border: '1px solid rgba(224,112,112,0.35)', color: '#e07070', padding: '0.25rem 0.4375rem', borderRadius: '0.25rem', cursor: 'pointer', lineHeight: 0 }}>
                      <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M2 3.5h10M5.5 3.5V2.5a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v1M11 3.5l-.5 8a1 1 0 0 1-1 .9H4.5a1 1 0 0 1-1-.9L3 3.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </button>
                    <a href={`/dashboard/admin/companies/${c.id}`} style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', color: '#be9a56', textDecoration: 'none', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', border: '1px solid rgba(190,154,86,0.25)' }}>View →</a>
                  </div>
                </div>
                {isExp && expandedPanel(c)}
              </div>
            )
          })}
        </div>
      )}

      {toDelete && (
        <ConfirmDialog
          title="Delete this company?"
          note="Removes the company and its experiences. The provider account and other companies they own are not affected."
          error={deleteError}
          confirmLabel="Delete permanently"
          busyLabel="Deleting…"
          busy={deleting}
          onConfirm={handleDelete}
          onCancel={() => setToDelete(null)}
        >
          You&apos;re about to permanently delete <strong style={{ color: 'var(--db-text)' }}>{toDelete.name || 'this company'}</strong> and {expCounts[toDelete.id!] || 0} experience(s). This cannot be undone.
        </ConfirmDialog>
      )}
    </div>
  )
}
