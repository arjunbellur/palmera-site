'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthChange } from '@/lib/auth'
import { getAllPartners } from '@/lib/firestore'

const ADMIN_EMAILS = ['palmeraexp@gmail.com']

const SECTIONS: { key: string; label: string }[] = [
  { key: 'basics', label: 'Basics' },
  { key: 'payouts', label: 'Payouts' },
  { key: 'listings', label: 'Listings' },
  { key: 'photos', label: 'Photos' },
  { key: 'operations', label: 'Operations' },
  { key: 'documents', label: 'Documents' },
  { key: 'signoff', label: 'Sign-off' },
]

type Status = 'complete' | 'in_progress' | 'incomplete'
type Partner = Record<string, unknown> & { id: string }

function dotColor(s: Status) {
  if (s === 'complete') return '#9e763b'
  if (s === 'in_progress') return '#be9a56'
  return 'var(--db-text-ghost)'
}

function statusBadge(pct: number) {
  if (pct === 100) return { label: 'Complete', color: '#9e763b', bg: 'rgba(158,118,59,0.12)' }
  if (pct > 0) return { label: 'In progress', color: '#be9a56', bg: 'rgba(190,154,86,0.1)' }
  return { label: 'Not started', color: 'var(--db-text-faint)', bg: 'var(--db-bg-card)' }
}

function formatDate(ts: unknown): string {
  if (!ts) return '—'
  // Firestore Timestamp has .seconds
  const sec = (ts as { seconds?: number }).seconds
  if (sec) return new Date(sec * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  if (ts instanceof Date) return ts.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  return '—'
}

export default function AdminPage() {
  const router = useRouter()
  const [partners, setPartners] = useState<Partner[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const all = await getAllPartners()
    setPartners(all as Partner[])
    setRefreshedAt(new Date())
    setLoading(false)
  }, [])

  useEffect(() => {
    const unsub = onAuthChange(async (user) => {
      if (!user || !ADMIN_EMAILS.includes(user.email || '')) {
        router.replace('/dashboard/home')
        return
      }
      await load()
    })
    return () => unsub()
  }, [router, load])

  const sections = (p: Partner) => (p.sections as Record<string, Status>) || {}
  const progress = (p: Partner) => {
    const s = sections(p)
    const complete = SECTIONS.filter(({ key }) => s[key] === 'complete').length
    return Math.round((complete / SECTIONS.length) * 100)
  }

  const totalComplete = partners.filter(p => progress(p) === 100).length
  const totalInProgress = partners.filter(p => { const pct = progress(p); return pct > 0 && pct < 100 }).length
  const totalNotStarted = partners.filter(p => progress(p) === 0).length

  const statCard = (label: string, value: number, color?: string) => (
    <div style={{ background: 'var(--db-bg-card)', border: '1px solid var(--db-border)', borderRadius: '0.5rem', padding: '1rem 1.25rem', minWidth: '7rem', flex: 1 }}>
      <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.625rem', color: 'var(--db-text-faint)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.375rem' }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', color: color || 'var(--db-text)', letterSpacing: '0.04em' }}>{value}</div>
    </div>
  )

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh' }}>
      <div style={{ width: '1.75rem', height: '1.75rem', border: '2px solid rgba(190,154,86,0.15)', borderTopColor: '#be9a56', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <p style={{ fontFamily: 'var(--font-sans)', color: 'rgba(190,154,86,0.8)', fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 0.5rem' }}>Internal</p>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', color: 'var(--db-text)', fontSize: 'clamp(1.375rem, 3vw, 1.625rem)', fontWeight: 400, letterSpacing: '0.06em', margin: '0 0 0.375rem' }}>Partner Onboarding</h1>
            <p style={{ fontFamily: 'var(--font-serif)', color: 'var(--db-text-muted)', fontSize: '0.875rem', margin: 0 }}>Live view of all partner onboarding progress.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', flexShrink: 0 }}>
            {refreshedAt && <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', color: 'var(--db-text-ghost)', letterSpacing: '0.04em' }}>Updated {refreshedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
            <button onClick={load} style={{ background: 'transparent', border: '1px solid var(--db-border-gold)', color: 'var(--db-text-muted)', padding: '0.375rem 0.875rem', borderRadius: '0.25rem', fontSize: '0.75rem', fontFamily: 'var(--font-sans)', cursor: 'pointer', letterSpacing: '0.04em' }}>
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Summary stats */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        {statCard('Total partners', partners.length)}
        {statCard('Complete', totalComplete, '#9e763b')}
        {statCard('In progress', totalInProgress, '#be9a56')}
        {statCard('Not started', totalNotStarted)}
      </div>

      {/* Partner table */}
      {partners.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--db-text-faint)', fontFamily: 'var(--font-sans)', fontSize: '0.875rem' }}>No partners yet.</div>
      ) : (
        <div style={{ border: '1px solid var(--db-border)', borderRadius: '0.5rem', overflow: 'hidden' }}>
          {/* Table header */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto auto', gap: 0, background: 'var(--db-bg-card)', borderBottom: '1px solid var(--db-border)', padding: '0.625rem 1.25rem', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.625rem', color: 'var(--db-text-faint)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Partner</span>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.625rem', color: 'var(--db-text-faint)', letterSpacing: '0.1em', textTransform: 'uppercase', textAlign: 'center', minWidth: '11rem' }}>Sections</span>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.625rem', color: 'var(--db-text-faint)', letterSpacing: '0.1em', textTransform: 'uppercase', textAlign: 'right', minWidth: '4.5rem' }}>Progress</span>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.625rem', color: 'var(--db-text-faint)', letterSpacing: '0.1em', textTransform: 'uppercase', textAlign: 'right', minWidth: '6rem' }}>Status</span>
            <span style={{ minWidth: '4rem' }} />
          </div>

          {partners.map((p, i) => {
            const sec = sections(p)
            const pct = progress(p)
            const badge = statusBadge(pct)
            const isExp = expanded === p.id
            const basics = (p.basics as Record<string, string>) || {}
            const ops = (p.operations as Record<string, string>) || {}

            return (
              <div key={p.id} style={{ borderBottom: i < partners.length - 1 ? '1px solid var(--db-border-subtle)' : 'none' }}>
                {/* Main row */}
                <div
                  onClick={() => setExpanded(isExp ? null : p.id)}
                  style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto auto', gap: 0, padding: '0.875rem 1.25rem', alignItems: 'center', cursor: 'pointer', transition: 'background 0.12s', background: isExp ? 'var(--db-bg-card-active)' : 'transparent' }}
                  onMouseEnter={e => { if (!isExp) (e.currentTarget as HTMLDivElement).style.background = 'var(--db-bg-card)' }}
                  onMouseLeave={e => { if (!isExp) (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}>
                  {/* Email + join date */}
                  <div>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--db-text)', marginBottom: '0.125rem' }}>
                      {basics.businessName || (p.email as string) || p.id}
                    </div>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', color: 'var(--db-text-faint)' }}>
                      {basics.businessName ? (p.email as string) : ''}{basics.businessName && p.createdAt ? ' · ' : ''}{formatDate(p.createdAt)}
                    </div>
                  </div>

                  {/* Section dots */}
                  <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center', minWidth: '11rem', justifyContent: 'center' }}>
                    {SECTIONS.map(({ key, label }) => {
                      const s = (sec[key] || 'incomplete') as Status
                      return (
                        <div key={key} title={`${label}: ${s.replace('_', ' ')}`} style={{ width: '0.5rem', height: '0.5rem', borderRadius: '50%', background: dotColor(s), flexShrink: 0, border: s === 'incomplete' ? '1px solid var(--db-text-ghost)' : 'none' }} />
                      )
                    })}
                  </div>

                  {/* Progress */}
                  <div style={{ minWidth: '4.5rem', textAlign: 'right' }}>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: pct === 100 ? '#9e763b' : 'var(--db-text-muted)', marginBottom: '0.25rem' }}>{pct}%</div>
                    <div style={{ height: '3px', background: 'var(--db-border-subtle)', borderRadius: '2px', overflow: 'hidden', width: '4rem', marginLeft: 'auto' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#9e763b' : '#be9a56', borderRadius: '2px', transition: 'width 0.3s' }} />
                    </div>
                  </div>

                  {/* Status badge */}
                  <div style={{ minWidth: '6rem', textAlign: 'right' }}>
                    <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.625rem', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '0.1875rem 0.5rem', borderRadius: '0.25rem', background: badge.bg, color: badge.color, whiteSpace: 'nowrap' }}>
                      {badge.label}
                    </span>
                  </div>

                  {/* View link */}
                  <div style={{ minWidth: '4rem', textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                    <a href={`/dashboard/admin/partner/${p.id}`}
                      style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', color: '#be9a56', textDecoration: 'none', letterSpacing: '0.04em', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', border: '1px solid rgba(190,154,86,0.25)', whiteSpace: 'nowrap' }}>
                      View →
                    </a>
                  </div>
                </div>

                {/* Expanded detail panel */}
                {isExp && (
                  <div style={{ borderTop: '1px solid var(--db-border-subtle)', background: 'var(--db-bg-card)', padding: '1.25rem 1.25rem 1.25rem 1.5rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(14rem, 1fr))', gap: '0.625rem 2rem' }}>
                      {/* Section statuses */}
                      <div>
                        <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.625rem', color: 'var(--db-text-faint)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Section progress</p>
                        {SECTIONS.map(({ key, label }) => {
                          const s = (sec[key] || 'incomplete') as Status
                          return (
                            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3125rem' }}>
                              <div style={{ width: '0.4375rem', height: '0.4375rem', borderRadius: '50%', background: dotColor(s), flexShrink: 0, border: s === 'incomplete' ? '1px solid var(--db-text-ghost)' : 'none' }} />
                              <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--db-text-muted)' }}>{label}</span>
                              <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', color: s === 'complete' ? '#9e763b' : s === 'in_progress' ? '#be9a56' : 'var(--db-text-ghost)', marginLeft: 'auto' }}>{s.replace('_', ' ')}</span>
                            </div>
                          )
                        })}
                      </div>

                      {/* Business details */}
                      {(basics.businessName || basics.country || basics.category) && (
                        <div>
                          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.625rem', color: 'var(--db-text-faint)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Business</p>
                          {[
                            { label: 'Name', value: basics.businessName },
                            { label: 'Country', value: basics.country },
                            { label: 'Category', value: basics.category },
                            { label: 'City', value: basics.city },
                          ].filter(r => r.value).map(r => (
                            <div key={r.label} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.25rem' }}>
                              <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', color: 'var(--db-text-faint)', minWidth: '4rem' }}>{r.label}</span>
                              <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', color: 'var(--db-text-muted)' }}>{r.value}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Operations contact */}
                      {(ops.opsContactName || ops.opsContactWhatsapp) && (
                        <div>
                          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.625rem', color: 'var(--db-text-faint)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Operations</p>
                          {[
                            { label: 'Contact', value: ops.opsContactName },
                            { label: 'WhatsApp', value: ops.opsContactWhatsapp },
                            { label: 'Backup', value: ops.backupContactName },
                            { label: 'Notification', value: ops.notificationPreference },
                          ].filter(r => r.value).map(r => (
                            <div key={r.label} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.25rem' }}>
                              <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', color: 'var(--db-text-faint)', minWidth: '5rem' }}>{r.label}</span>
                              <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', color: 'var(--db-text-muted)' }}>{r.value}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
