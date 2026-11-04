'use client'
// Messages — every member who wrote to Palmera support from the app, newest
// first, and the thread with them. Reads and writes go through the app's
// support endpoints (src/lib/support.ts); a reply lands in the member's app
// with a push. The inbox refreshes every 30 seconds while the tab is open,
// the open thread too, so a member writing back shows up without a reload.
import { useEffect, useRef, useState, useCallback, Suspense } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useSWRLite } from '@/lib/swr-lite'
import { supportInbox, supportThread, supportReply, supportStatus, type InboxThread, type Thread, type ThreadStatus } from '@/lib/support'
import { ScreenHeader, Chip, Skeleton, EmptyState, SearchInput, eyebrow, type Tone } from '@/components/partner/ui'
import { FilterChip, timeAgo, glass } from '../ui'
import { MessageSquare, ArrowLeft, Send, CheckCircle2, RotateCcw } from 'lucide-react'

const POLL_MS = 30_000
const STATUS_TONE: Record<ThreadStatus, Tone> = { open: 'gold', answered: 'green', closed: 'neutral' }
const STATUS_LABEL: Record<ThreadStatus, string> = { open: 'Waiting on us', answered: 'Answered', closed: 'Closed' }

const initials = (name: string | null, uid: string) => {
  const n = (name || '').trim()
  if (!n) return uid.slice(0, 2).toUpperCase()
  const parts = n.split(/\s+/)
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase()
}

function Avatar({ name, avatar, uid, size = 36 }: { name: string | null; avatar: string | null; uid: string; size?: number }) {
  const [broken, setBroken] = useState(false)
  if (avatar && !broken) return <img src={avatar} alt="" width={size} height={size} onError={() => setBroken(true)} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1px solid var(--pf-border)' }} />
  return (
    <span aria-hidden style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, display: 'grid', placeItems: 'center', background: 'linear-gradient(165deg, rgba(233,188,79,0.22), rgba(190,154,86,0.10))', border: '1px solid var(--pf-border-strong)', color: 'var(--pf-gold)', fontFamily: 'var(--font-sans)', fontSize: size > 30 ? '12px' : '10px', letterSpacing: '0.04em' }}>
      {initials(name, uid)}
    </span>
  )
}

const when = (iso: string) => { const d = new Date(iso); return isNaN(d.getTime()) ? '' : timeAgo(d) }
const clock = (iso: string) => { const d = new Date(iso); return isNaN(d.getTime()) ? '' : d.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) }

function MessagesSkeleton() {
  return (
    <div className="pf-in">
      <Skeleton height="74px" style={{ maxWidth: '30rem', marginBottom: '22px' }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 340px) 1fr', gap: '14px' }}>
        <Skeleton height="520px" /><Skeleton height="520px" />
      </div>
    </div>
  )
}

function AdminMessages() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const selected = searchParams.get('u') || ''
  const select = (uid: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (uid) params.set('u', uid); else params.delete('u')
    router.replace(params.size ? `${pathname}?${params}` : pathname, { scroll: false })
  }

  const [filter, setFilter] = useState<ThreadStatus | 'all'>('all')
  const [q, setQ] = useState('')
  const [narrow, setNarrow] = useState(false)
  useEffect(() => {
    const check = () => setNarrow(window.innerWidth < 900)
    check(); window.addEventListener('resize', check); return () => window.removeEventListener('resize', check)
  }, [])

  // Inbox: cached across visits, re-polled while visible.
  const { data: threads, loaded, error, reload, setData: setThreads } = useSWRLite<InboxThread[]>('admin:support-inbox', () => supportInbox(), [])
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null)
  useEffect(() => {
    let alive = true
    const tick = async () => { if (document.visibilityState === 'visible') { await reload(); if (alive) setRefreshedAt(new Date()) } }
    const id = setInterval(tick, POLL_MS)
    const onVis = () => { if (document.visibilityState === 'visible') tick() }
    document.addEventListener('visibilitychange', onVis)
    return () => { alive = false; clearInterval(id); document.removeEventListener('visibilitychange', onVis) }
  }, [reload])
  useEffect(() => { if (loaded) setRefreshedAt(new Date()) }, [loaded])

  // The open thread. Opening it marks it read server-side, so the inbox row's
  // unread count is zeroed here at once rather than on the next poll.
  const [thread, setThread] = useState<Thread | null>(null)
  const [threadError, setThreadError] = useState('')
  const [threadLoading, setThreadLoading] = useState(false)
  const openThread = useCallback(async (uid: string, quiet = false) => {
    if (!quiet) { setThreadLoading(true); setThreadError('') }
    try {
      const t = await supportThread(uid)
      setThread(t)
      setThreads((rows) => rows ? rows.map((r) => r.userId === uid ? { ...r, unread: 0, status: t.status } : r) : rows)
    } catch (e) { if (!quiet) setThreadError(e instanceof Error ? e.message : 'Could not open this conversation.') }
    if (!quiet) setThreadLoading(false)
  }, [setThreads])
  useEffect(() => {
    if (!selected) { setThread(null); return }
    openThread(selected)
    const id = setInterval(() => { if (document.visibilityState === 'visible') openThread(selected, true) }, POLL_MS)
    return () => clearInterval(id)
  }, [selected, openThread])

  // Composer.
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')
  const [statusBusy, setStatusBusy] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  useEffect(() => { bottomRef.current?.scrollIntoView({ block: 'end' }) }, [thread?.messages.length, selected])

  const send = async () => {
    const body = draft.trim()
    if (!body || !thread || sending) return
    setSending(true); setSendError('')
    try {
      const id = await supportReply(thread.userId, body)
      const now = new Date().toISOString()
      setThread((t) => t ? { ...t, status: 'answered', messages: [...t.messages, { id, body, from: 'team', at: now }] } : t)
      setThreads((rows) => rows ? rows.map((r) => r.userId === thread.userId ? { ...r, lastBody: body, lastAt: now, lastFrom: 'team', unread: 0, status: 'answered' } : r) : rows)
      setDraft('')
    } catch (e) { setSendError(e instanceof Error ? e.message : 'Could not send — try again.') }
    setSending(false)
  }
  const setStatus = async (status: 'open' | 'closed') => {
    if (!thread || statusBusy) return
    setStatusBusy(true)
    try {
      const s = await supportStatus(thread.userId, status)
      setThread((t) => t ? { ...t, status: s } : t)
      setThreads((rows) => rows ? rows.map((r) => r.userId === thread.userId ? { ...r, status: s } : r) : rows)
    } catch (e) { setSendError(e instanceof Error ? e.message : 'Could not change the status.') }
    setStatusBusy(false)
  }

  if (!loaded && !error) return <MessagesSkeleton />

  const all = threads ?? []
  const needle = q.trim().toLowerCase()
  const rows = all
    .filter((t) => filter === 'all' || t.status === filter)
    .filter((t) => !needle || [t.name, t.email, t.lastBody, t.userId].some((v) => (v || '').toLowerCase().includes(needle)))
  const unreadTotal = all.reduce((n, t) => n + (t.unread || 0), 0)
  const waiting = all.filter((t) => t.status === 'open').length
  const counts: Record<ThreadStatus | 'all', number> = { all: all.length, open: waiting, answered: all.filter((t) => t.status === 'answered').length, closed: all.filter((t) => t.status === 'closed').length }
  const errorText = error ? (error instanceof Error ? error.message : String(error)) : ''

  const list = (
    <div className="pf-glass" style={{ ...glass, padding: '6px 0', display: 'flex', flexDirection: 'column', minHeight: narrow ? undefined : '560px', maxHeight: narrow ? undefined : 'calc(100vh - 220px)', overflow: 'hidden' }}>
      <div style={{ padding: '8px 14px 10px', display: 'flex', flexDirection: 'column', gap: '10px', borderBottom: '1px solid var(--pf-border)' }}>
        {/* SearchInput flexes along its parent's main axis — give it a row. */}
        <div style={{ display: 'flex' }}><SearchInput value={q} onChange={setQ} placeholder="Search name, email, message" ariaLabel="Search conversations" /></div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {(['all', 'open', 'answered', 'closed'] as const).map((k) => (
            <FilterChip key={k} active={filter === k} onClick={() => setFilter(filter === k && k !== 'all' ? 'all' : k)}>{k === 'all' ? 'All' : STATUS_LABEL[k]} · {counts[k]}</FilterChip>
          ))}
        </div>
      </div>
      <div className="pf-scroll" style={{ overflowY: 'auto', flex: 1 }}>
        {errorText && all.length === 0 ? (
          <div style={{ padding: '18px 14px' }}><EmptyState icon={<MessageSquare size={22} strokeWidth={1.75} />} title="Inbox unavailable" body={`The support endpoints did not answer: ${errorText}`} /></div>
        ) : rows.length === 0 ? (
          <div style={{ padding: '18px 14px' }}><EmptyState icon={<MessageSquare size={22} strokeWidth={1.75} />} title={all.length ? 'No conversations match' : 'No messages yet'} body={all.length ? 'Try another filter or search.' : 'When a member writes to Palmera support from the app, the conversation shows here.'} /></div>
        ) : rows.map((t) => {
          const active = t.userId === selected
          return (
            <button key={t.userId} type="button" onClick={() => select(t.userId)} aria-current={active ? 'true' : undefined}
              style={{ width: '100%', display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '12px 14px', border: 'none', borderBottom: '1px solid var(--pf-border)', background: active ? 'linear-gradient(165deg, rgba(233,188,79,0.14), rgba(190,154,86,0.05))' : 'transparent', cursor: 'pointer', textAlign: 'left' }}>
              <Avatar name={t.name} avatar={t.avatar} uid={t.userId} />
              <span style={{ minWidth: 0, flex: 1 }}>
                <span style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <span style={{ fontFamily: 'var(--font-serif)', color: 'var(--pf-text)', fontSize: '13.5px', fontWeight: t.unread ? 600 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{t.name || t.email || t.userId}</span>
                  <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-sans)', fontSize: '10.5px', color: 'var(--pf-faint)', whiteSpace: 'nowrap' }}>{when(t.lastAt)}</span>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: '11.5px', color: t.unread ? 'var(--pf-text)' : 'var(--pf-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0, flex: 1 }}>{t.lastFrom === 'team' ? 'You: ' : ''}{t.lastBody}</span>
                  {t.unread > 0 && <span style={{ minWidth: '18px', height: '18px', padding: '0 5px', borderRadius: '999px', background: 'var(--pf-gold)', color: '#1a1408', fontFamily: 'var(--font-sans)', fontSize: '10px', fontWeight: 600, lineHeight: '18px', textAlign: 'center', flexShrink: 0 }}>{t.unread}</span>}
                  {t.status !== 'open' && <Chip tone={STATUS_TONE[t.status]}>{STATUS_LABEL[t.status]}</Chip>}
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )

  const pane = (
    <div className="pf-glass" style={{ ...glass, padding: 0, display: 'flex', flexDirection: 'column', minHeight: narrow ? 'calc(100vh - 200px)' : '560px', maxHeight: narrow ? undefined : 'calc(100vh - 220px)', overflow: 'hidden' }}>
      {!selected ? (
        <div style={{ flex: 1, display: 'grid', placeItems: 'center', padding: '24px' }}>
          <EmptyState icon={<MessageSquare size={22} strokeWidth={1.75} />} title="Pick a conversation" body={waiting ? `${waiting} member(s) are waiting on a reply.` : 'Nobody is waiting on a reply right now.'} />
        </div>
      ) : threadLoading && !thread ? (
        <div style={{ padding: '18px' }}><Skeleton height="120px" style={{ marginBottom: '12px' }} /><Skeleton height="240px" /></div>
      ) : threadError && !thread ? (
        <div style={{ padding: '24px' }}><EmptyState icon={<MessageSquare size={22} strokeWidth={1.75} />} title="Could not open" body={threadError} /></div>
      ) : thread ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderBottom: '1px solid var(--pf-border)' }}>
            {narrow && <button type="button" onClick={() => select(null)} aria-label="Back to inbox" style={{ background: 'transparent', border: 'none', color: 'var(--pf-gold)', cursor: 'pointer', lineHeight: 0, padding: '4px' }}><ArrowLeft size={18} strokeWidth={1.75} /></button>}
            <Avatar name={thread.name} avatar={thread.avatar} uid={thread.userId} size={40} />
            <span style={{ minWidth: 0, flex: 1 }}>
              <span style={{ fontFamily: 'var(--font-serif)', color: 'var(--pf-text)', fontSize: '15px', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{thread.name || thread.email || thread.userId}</span>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: '10.5px', color: 'var(--pf-faint)', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{[thread.email, thread.userId].filter(Boolean).join(' · ')}</span>
            </span>
            <Chip tone={STATUS_TONE[thread.status]}>{STATUS_LABEL[thread.status]}</Chip>
            {thread.status === 'closed'
              ? <button type="button" disabled={statusBusy} onClick={() => setStatus('open')} className="pf-cap pf-cap-ghost" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 12px', border: '1px solid var(--pf-border-strong)', background: 'transparent', color: 'var(--pf-gold)', fontFamily: 'var(--font-sans)', fontSize: '11px', cursor: 'pointer' }}><RotateCcw size={13} strokeWidth={1.75} /> Reopen</button>
              : <button type="button" disabled={statusBusy} onClick={() => setStatus('closed')} className="pf-cap pf-cap-ghost" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 12px', border: '1px solid var(--pf-border-strong)', background: 'transparent', color: 'var(--pf-muted)', fontFamily: 'var(--font-sans)', fontSize: '11px', cursor: 'pointer' }}><CheckCircle2 size={13} strokeWidth={1.75} /> Close</button>}
          </div>
          <div className="pf-scroll" style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {thread.messages.length === 0 && <p style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: 'var(--pf-faint)', fontStyle: 'italic', margin: 0 }}>No messages in this thread.</p>}
            {thread.messages.map((m, i) => {
              const mine = m.from === 'team'
              const prev = thread.messages[i - 1]
              const gap = prev && new Date(m.at).getTime() - new Date(prev.at).getTime() > 20 * 60_000
              return (
                <div key={m.id}>
                  {(i === 0 || gap) && <div style={{ textAlign: 'center', fontFamily: 'var(--font-sans)', fontSize: '10px', color: 'var(--pf-faint)', letterSpacing: '0.06em', margin: '6px 0' }}>{clock(m.at)}</div>}
                  <div style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
                    <div title={clock(m.at)} style={{ maxWidth: 'min(78%, 46rem)', padding: '9px 13px', borderRadius: mine ? '16px 16px 4px 16px' : '16px 16px 16px 4px', background: mine ? 'linear-gradient(165deg, rgba(233,188,79,0.26), rgba(190,154,86,0.14))' : 'var(--pf-card)', border: `1px solid ${mine ? 'rgba(233,188,79,0.35)' : 'var(--pf-border)'}`, color: 'var(--pf-text)', fontFamily: 'var(--font-sans)', fontSize: '13px', lineHeight: 1.45, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {m.body}
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>
          <div style={{ borderTop: '1px solid var(--pf-border)', padding: '10px 12px', display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
            <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={2} maxLength={4000} placeholder="Reply as Palmera Support — the member gets it in the app with a push"
              onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); send() } }}
              aria-label="Reply"
              style={{ flex: 1, resize: 'vertical', minHeight: '44px', maxHeight: '200px', padding: '10px 14px', borderRadius: '14px', border: '1px solid var(--pf-border)', background: 'var(--pf-card)', color: 'var(--pf-text)', fontFamily: 'var(--font-sans)', fontSize: '13px', lineHeight: 1.4, outline: 'none' }} />
            <button type="button" onClick={send} disabled={sending || !draft.trim()} className="pf-cap pf-cap-primary" aria-label="Send reply"
              style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '11px 16px', border: 'none', color: '#f4ecdb', fontFamily: 'var(--font-sans)', fontSize: '12px', cursor: sending || !draft.trim() ? 'default' : 'pointer', opacity: sending || !draft.trim() ? 0.55 : 1 }}>
              <Send size={14} strokeWidth={1.75} /> {sending ? 'Sending…' : 'Send'}
            </button>
          </div>
          {sendError && <div style={{ padding: '0 14px 10px', fontFamily: 'var(--font-sans)', fontSize: '11px', color: 'var(--pf-alert)' }}>{sendError}</div>}
        </>
      ) : null}
    </div>
  )

  return (
    <div className="pf-in">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap' }}>
        <ScreenHeader label="Support" title="Messages" intro="Members who wrote to Palmera from the app. Replies reach them in the app, with a push." />
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
          {unreadTotal > 0 && <Chip tone="gold">{unreadTotal} unread</Chip>}
          <Chip tone={waiting ? 'alert' : 'green'}>{waiting ? `${waiting} waiting` : 'all answered'}</Chip>
          {refreshedAt && <span style={{ fontFamily: 'var(--font-sans)', fontSize: '10.5px', color: 'var(--pf-faint)' }}>refreshed {timeAgo(refreshedAt)}</span>}
        </span>
      </div>
      <div style={eyebrow}>Inbox</div>
      {narrow ? (
        <div style={{ marginTop: '10px' }}>{selected ? pane : list}</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 340px) minmax(0, 1fr)', gap: '14px', marginTop: '10px', alignItems: 'stretch' }}>
          {list}{pane}
        </div>
      )}
    </div>
  )
}

export default function AdminMessagesPage() {
  return <Suspense fallback={<MessagesSkeleton />}><AdminMessages /></Suspense>
}
