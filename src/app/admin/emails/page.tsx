'use client'
// Emails — every row of `email_log`: what was sent, what was skipped and
// why, what failed. Read through /api/admin/emails (the collection has no
// client read rule, and rules are shared with the app), addresses already
// masked server-side. Filters are client-side like the Money page.
import { useEffect, useState } from 'react'
import { auth } from '@/lib/firebase'
import { ScreenHeader, Chip, Skeleton, EmptyState, SearchInput, eyebrow, type Tone } from '@/components/partner/ui'
import { FilterChip, formatDate, timeAgo, glass } from '../ui'
import { Mail } from 'lucide-react'

interface Row {
  id: string
  kind: string
  event: string | null
  to: string
  sentAt: string | null
  title: string | null
  bookingId: string | null
  reason: string | null
  via: string | null
}

type Status = 'sent' | 'skipped' | 'failed'
const SKIP_KINDS = new Set(['skipped', 'opted_out', 'duplicate_suppressed'])
const statusOf = (r: Row): { status: Status; label: string } => {
  if (r.kind === 'send_failed') return { status: 'failed', label: `failed: ${r.reason || 'unknown'}` }
  if (SKIP_KINDS.has(r.kind)) return { status: 'skipped', label: `skipped: ${r.reason || r.kind.replace('_', ' ')}` }
  return { status: 'sent', label: 'sent' }
}
const TONE: Record<Status, Tone> = { sent: 'green', skipped: 'neutral', failed: 'alert' }
/** The template name — for skip/failure rows the event tells which mail it was. */
const kindOf = (r: Row) => (r.kind === 'send_failed' || r.kind === 'skipped' ? r.event || r.kind : r.kind).replace(/_/g, ' ')

function EmailsSkeleton() {
  return (
    <div className="pf-in">
      <Skeleton height="74px" style={{ maxWidth: '30rem', marginBottom: '22px' }} />
      <Skeleton height="420px" />
    </div>
  )
}

export default function AdminEmailsPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState<Status | 'all'>('all')
  const [q, setQ] = useState('')

  useEffect(() => {
    ;(async () => {
      try {
        const token = await auth.currentUser?.getIdToken()
        const res = await fetch('/api/admin/emails', { headers: { authorization: `Bearer ${token ?? ''}` } })
        const data = await res.json().catch(() => null) as { ok?: boolean; rows?: Row[]; error?: string; reason?: string } | null
        if (!res.ok || !data?.ok) { setError(data?.error ? `${data.error}${data.reason ? ` — ${data.reason}` : ''}` : `HTTP ${res.status}`); setLoaded(true); return }
        setRows(data.rows ?? [])
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      }
      setLoaded(true)
    })()
  }, [])

  if (!loaded) return <EmailsSkeleton />

  const needle = q.trim().toLowerCase()
  const visible = rows.filter((r) => {
    if (status !== 'all' && statusOf(r).status !== status) return false
    if (needle && ![r.to, r.title, r.bookingId, r.kind, r.event, r.reason].some(v => String(v || '').toLowerCase().includes(needle))) return false
    return true
  })
  const counts = rows.reduce((m, r) => { m[statusOf(r).status]++; return m }, { sent: 0, skipped: 0, failed: 0 } as Record<Status, number>)

  return (
    <div className="pf-in">
      <ScreenHeader label="Palmera HQ" title="Emails" intro="The last 200 transactional emails — partner and member booking mails, invites, agreements, payouts — with every skip and failure and its reason." />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 11rem), 1fr))', gap: '12px', marginBottom: '16px' }}>
        {(['sent', 'skipped', 'failed'] as Status[]).map((s) => (
          <div key={s} className={`pf-glass${s === 'failed' && counts.failed > 0 ? ' pf-glass-gold' : ''}`} style={glass}>
            <div style={eyebrow}>{s}</div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: '28px', color: s === 'failed' && counts.failed > 0 ? 'var(--pf-alert)' : 'var(--pf-text)', marginTop: '6px' }}>{counts[s]}</div>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: '10.5px', color: 'var(--pf-muted)', marginTop: '6px' }}>of the last {rows.length}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
        {/* SearchInput flexes along its parent's main axis — in this column
            it would stretch tall, so give it a row to size against. */}
        <div style={{ display: 'flex' }}>
          <SearchInput value={q} onChange={setQ} placeholder="Search — address, title, booking id, kind, reason…" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ ...eyebrow, marginRight: '2px' }}>Status</span>
          {(['sent', 'skipped', 'failed'] as Status[]).map((s) => (
            <FilterChip key={s} active={status === s} onClick={() => setStatus(status === s ? 'all' : s)}>{s}</FilterChip>
          ))}
          <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-sans)', fontSize: '10.5px', color: 'var(--pf-faint)' }}>{visible.length} of {rows.length}</span>
        </div>
      </div>

      {error ? (
        <EmptyState icon={<Mail size={22} strokeWidth={1.75} />} title="Could not load the log" body={error} />
      ) : visible.length === 0 ? (
        <EmptyState icon={<Mail size={22} strokeWidth={1.75} />} title={rows.length === 0 ? 'Nothing sent yet' : 'No emails match'} body={rows.length === 0 ? 'Rows appear here as soon as the notify routes send, skip or fail a mail.' : 'Try clearing the filter or the search.'} />
      ) : (
        <div className="pf-glass" style={{ ...glass, padding: '8px' }}>
          {/* Header row — the columns the eye scans: when · kind · to · booking · status */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(7rem, 0.9fr) minmax(8rem, 1fr) minmax(8rem, 1fr) minmax(10rem, 1.6fr) minmax(8rem, 1.4fr)', gap: '12px', padding: '6px 12px 10px', borderBottom: '1px solid var(--pf-border)' }}>
            {['When', 'Kind', 'To', 'Booking / title', 'Status'].map((h) => <span key={h} style={eyebrow}>{h}</span>)}
          </div>
          {visible.map((r, i) => {
            const s = statusOf(r)
            const when = r.sentAt ? new Date(r.sentAt) : null
            return (
              <div key={r.id} className="pf-note" style={{ display: 'grid', gridTemplateColumns: 'minmax(7rem, 0.9fr) minmax(8rem, 1fr) minmax(8rem, 1fr) minmax(10rem, 1.6fr) minmax(8rem, 1.4fr)', gap: '12px', alignItems: 'center', padding: '10px 12px', borderTop: i > 0 ? '1px solid var(--pf-border)' : 'none', animationDelay: `${Math.min(i * 20, 400)}ms` }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-sans)', color: 'var(--pf-text)', fontSize: '12px' }}>{when ? timeAgo(when) : '—'}</div>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: '10px', color: 'var(--pf-faint)', marginTop: '2px' }}>{when ? formatDate(when.toISOString()) : ''}</div>
                </div>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: 'var(--pf-text)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.kind}>
                  {kindOf(r)}{r.via ? <span style={{ color: 'var(--pf-faint)' }}> · {r.via}</span> : null}
                </div>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: 'var(--pf-muted)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.to || '—'}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: 'var(--pf-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title || '—'}</div>
                  {r.bookingId && <div style={{ fontFamily: 'var(--font-sans)', fontSize: '10px', color: 'var(--pf-faint)', marginTop: '2px' }}>{r.bookingId}</div>}
                </div>
                <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Chip tone={TONE[s.status]}>{s.status}</Chip>
                  {s.status !== 'sent' && <span style={{ fontFamily: 'var(--font-sans)', fontSize: '10.5px', color: s.status === 'failed' ? 'var(--pf-alert)' : 'var(--pf-faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={s.label}>{s.label.replace(/^(failed|skipped): /, '')}</span>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
