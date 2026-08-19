'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { usePartner } from '../PartnerContext'
import { t } from '../i18n'
import { subscribeBookingsByCompany, setBookingStatus } from '@/lib/firestore'
import type { Booking } from '@/lib/schema'
import { toDate } from '@/lib/money'
import { ScreenHeader, EmptyState, Chip, Money, eyebrow, GhostButton, Skeleton } from '@/components/partner/ui'
import ReservationCard from '@/components/partner/ReservationCard'
import { formatAmount, formatDate } from '@/lib/money'

type Filter = 'all' | 'action' | 'upcoming' | 'done' | 'cancelled' | 'noshow'

export default function ReservationsScreen() {
  const { uid, company, locale } = usePartner()
  const L = (k: string) => t(locale, k)
  const [bookings, setBookings] = useState<Booking[]>([])
  // Jordan: the page must OPEN on what's coming next, past excluded.
  const [filter, setFilter] = useState<Filter>('upcoming')
  const [search, setSearch] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [datePreset, setDatePreset] = useState<'' | 'today' | 'tomorrow' | 'week'>('')
  // Calendar view (Airbnb host): month grid with status dots, tap a day for
  // its bookings. List stays the default.
  const [view, setView] = useState<'list' | 'calendar'>('list')
  const [calMonth, setCalMonth] = useState(() => { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d })
  const [selectedDay, setSelectedDay] = useState<string>(() => {
    const d = new Date(); const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  })
  const [detail, setDetail] = useState<Booking | null>(null)
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')
  const [loaded, setLoaded] = useState(false)

  // LIVE feed — the app's writes (new bookings, cancellations) appear without
  // a refresh; this is what makes cancel-in-app show up here in real time.
  useEffect(() => {
    if (!uid || !company?.id) return
    const unsub = subscribeBookingsByCompany(uid, company.id, (bs) => { setBookings(bs); setLoaded(true) })
    return () => unsub()
  }, [uid, company?.id])

  // Deep link from Home's Today tile: /partner/reservations?f=today
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('f') === 'today') setDatePreset('today')
  }, [])

  const respond = async (b: Booking, status: 'confirmed' | 'declined' | 'no_show') => {
    if (!b.id) return
    setBusyId(b.id); setError('')
    try {
      await setBookingStatus(b.id, status)
      setDetail(null) // the live snapshot delivers the updated list
    } catch {
      // Most likely cause: the security rule for partner-side confirmation
      // isn't deployed, or the booking already moved on. Say so plainly.
      setError(locale === 'fr'
        ? 'Impossible de mettre à jour cette réservation. Réessayez ou contactez Palmera.'
        : 'Could not update this reservation. Try again, or contact Palmera.')
    }
    setBusyId('')
  }

  // "À traiter" = strictly reservations awaiting the partner's approval
  // (Arjun: auto-confirms are not action). Past-confirmed no-show decisions
  // live in the detail drawer under Toutes until auto-completion exists
  // (SYNC-STATUS item 11).
  const guestStats = (customerId: string) => {
    const mine = bookings.filter(x => x.customerId === customerId)
    const counted = mine.filter(x => !['cancelled', 'declined'].includes(x.status))
    const dates = mine.map(x => toDate(x.scheduledFor)).filter(Boolean) as Date[]
    dates.sort((a, b) => a.getTime() - b.getTime())
    return {
      visits: counted.length,
      spend: counted.reduce((sum, x) => sum + (x.bookingTotal || 0), 0),
      since: dates[0] ?? null,
    }
  }

  const isPastNow = (b: Booking) => { const d = toDate(b.scheduledFor); return !!d && d.getTime() < Date.now() }
  // Pending on an INSTANT listing = the guest's checkout is unfinished; the
  // payment confirms it automatically. Not the partner's queue.
  const awaitingPayment = (b: Booking) => b.status === 'pending' && b.confirmationType === 'instant'
  const needsAction = (b: Booking) => b.status === 'pending' && !awaitingPayment(b)
  const actionCount = bookings.filter(needsAction).length
  const q = search.trim().toLowerCase()
  const sameDay = (d: Date, ref: Date) => d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth() && d.getDate() === ref.getDate()
  const shown = bookings.filter(b => {
    if (filter === 'action' && !needsAction(b)) return false
    if (filter === 'upcoming' && !(['pending', 'confirmed'].includes(b.status) && !isPastNow(b))) return false
    // "Terminées" is DELIVERED only — cancellations and no-shows have their
    // own pills now.
    if (filter === 'done' && b.status !== 'completed') return false
    if (filter === 'cancelled' && !['cancelled', 'declined'].includes(b.status)) return false
    if (filter === 'noshow' && b.status !== 'no_show') return false
    if (q && !`${b.title} ${b.customerName} ${b.id}`.toLowerCase().includes(q)) return false
    const d = toDate(b.scheduledFor)
    if (datePreset) {
      if (!d) return false
      const now = new Date()
      if (datePreset === 'today' && !sameDay(d, now)) return false
      if (datePreset === 'tomorrow') {
        const tm = new Date(now); tm.setDate(now.getDate() + 1)
        if (!sameDay(d, tm)) return false
      }
      if (datePreset === 'week') {
        const end = new Date(now); end.setDate(now.getDate() + 7)
        const start = new Date(now); start.setHours(0, 0, 0, 0)
        if (d < start || d > end) return false
      }
    }
    if (dateFilter) {
      if (!d) return false
      const pad = (n: number) => String(n).padStart(2, '0')
      if (`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` !== dateFilter) return false
    }
    return true
  })
  // Airbnb host ordering: what's NEXT comes first. Upcoming sorts SOONEST-
  // first (today on top — the old most-future-first pile buried near-term
  // bookings and partners missed them), past sits below, most recent first.
  const startToday = new Date(); startToday.setHours(0, 0, 0, 0)
  const ts = (b: Booking) => toDate(b.scheduledFor)?.getTime() ?? 0
  const upcoming = shown.filter(b => ts(b) >= startToday.getTime()).sort((a, b) => ts(a) - ts(b))
  const past = shown.filter(b => ts(b) < startToday.getTime()).sort((a, b) => ts(b) - ts(a))

  const matchesStatus = (b: Booking) => {
    if (filter === 'action' && !needsAction(b)) return false
    if (filter === 'upcoming' && !(['pending', 'confirmed'].includes(b.status) && !isPastNow(b))) return false
    if (filter === 'done' && b.status !== 'completed') return false
    if (filter === 'cancelled' && !['cancelled', 'declined'].includes(b.status)) return false
    if (filter === 'noshow' && b.status !== 'no_show') return false
    if (q && !`${b.title} ${b.customerName} ${b.id}`.toLowerCase().includes(q)) return false
    return true
  }
  const baseShown = bookings.filter(matchesStatus)
  const pad2 = (n: number) => String(n).padStart(2, '0')
  const dayKey = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`

  const FILTERS: { key: Filter; label: string; count?: number }[] = [
    { key: 'action', label: L('f_action'), count: actionCount },
    { key: 'upcoming', label: L('f_upcoming') },
    { key: 'all', label: L('f_all') },
    { key: 'done', label: L('f_done') },
    { key: 'cancelled', label: L('f_cancelled') },
    { key: 'noshow', label: L('f_noshow') },
  ]

  return (
    <div className="pf-in">
      <ScreenHeader label={L('res_label')} title={L('res_title')} intro={L('res_intro')} />

      {/* Search + date, above the status pills (Jordan: find a booking fast). */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder={L('search_ph')}
          style={{ flex: '1 1 14rem', background: 'var(--pf-card)', border: '1px solid var(--pf-border)', borderRadius: '10px', padding: '9px 13px', color: 'var(--pf-text)', fontFamily: 'var(--font-sans)', fontSize: '12.5px', outline: 'none' }} />
        {view === 'list' && ([['today', 'dp_today'], ['tomorrow', 'dp_tomorrow'], ['week', 'dp_week']] as const).map(([k, label]) => (
          <button key={k} onClick={() => { setDatePreset(p => p === k ? '' : k); setDateFilter('') }}
            style={{ padding: '8px 13px', borderRadius: '10px', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: '11.5px', border: `1px solid ${datePreset === k ? 'var(--pf-border-strong)' : 'var(--pf-border)'}`, background: datePreset === k ? 'var(--pf-card)' : 'transparent', color: datePreset === k ? 'var(--pf-gold)' : 'var(--pf-faint)' }}>
            {L(label)}
          </button>
        ))}
        {view === 'list' && <input type="date" value={dateFilter} onChange={e => { setDateFilter(e.target.value); setDatePreset('') }}
          style={{ background: 'var(--pf-card)', border: '1px solid var(--pf-border)', borderRadius: '10px', padding: '8px 12px', color: dateFilter ? 'var(--pf-text)' : 'var(--pf-faint)', fontFamily: 'var(--font-sans)', fontSize: '12.5px', outline: 'none', colorScheme: 'dark' }} />}
        {(search || dateFilter || datePreset) && (
          <button onClick={() => { setSearch(''); setDateFilter(''); setDatePreset('') }}
            style={{ background: 'transparent', border: '1px solid var(--pf-border)', borderRadius: '10px', padding: '8px 13px', color: 'var(--pf-faint)', fontFamily: 'var(--font-sans)', fontSize: '11.5px', cursor: 'pointer' }}>
            {L('clear')}
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap', marginBottom: '16px', alignItems: 'center' }}>
        <div style={{ display: 'flex', border: '1px solid var(--pf-border)', borderRadius: '10px', overflow: 'hidden', marginRight: '4px' }}>
          {([['list', 'view_list', '▤'], ['calendar', 'view_cal', '▦']] as const).map(([v, key, icon]) => (
            <button key={v} onClick={() => setView(v)}
              style={{ padding: '7px 13px', background: view === v ? 'var(--pf-card)' : 'transparent', border: 'none', color: view === v ? 'var(--pf-gold)' : 'var(--pf-faint)', fontFamily: 'var(--font-sans)', fontSize: '11.5px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px' }}>{icon}</span> {L(key)}
            </button>
          ))}
        </div>
        {FILTERS.map(f => {
          const active = filter === f.key
          return (
            <button key={f.key} onClick={() => setFilter(f.key)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '999px', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: '11.5px', letterSpacing: '0.03em', border: `1px solid ${active ? 'var(--pf-border-strong)' : 'var(--pf-border)'}`, background: active ? 'var(--pf-card)' : 'transparent', color: active ? 'var(--pf-gold)' : 'var(--pf-faint)' }}>
              {f.label}
              {!!f.count && <Chip tone="gold">{f.count}</Chip>}
            </button>
          )
        })}
      </div>

      {error && (
        <div style={{ padding: '11px 14px', borderRadius: '10px', background: 'rgba(196,124,124,0.12)', border: '1px solid rgba(196,124,124,0.3)', color: 'var(--pf-alert)', fontFamily: 'var(--font-sans)', fontSize: '12px', marginBottom: '12px' }}>{error}</div>
      )}

      {!loaded ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 22rem), 1fr))', gap: '12px' }}>
          <Skeleton height="150px" /><Skeleton height="150px" /><Skeleton height="150px" />
        </div>
      ) : view === 'calendar' ? (
        // ── Month grid (Airbnb host): dots per day by status, tap a day for
        // its bookings below. Monday-start weeks.
        (() => {
          const byDay = new Map<string, Booking[]>()
          baseShown.forEach(b => {
            const d = toDate(b.scheduledFor); if (!d) return
            const k = dayKey(d)
            byDay.set(k, [...(byDay.get(k) || []), b])
          })
          const first = new Date(calMonth)
          const gridStart = new Date(first); gridStart.setDate(1 - ((first.getDay() + 6) % 7))
          const cells: Date[] = Array.from({ length: 42 }, (_, i) => { const d = new Date(gridStart); d.setDate(gridStart.getDate() + i); return d })
          const todayK = dayKey(new Date())
          const monthLabel = calMonth.toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-GB', { month: 'long', year: 'numeric' })
          const weekdays = Array.from({ length: 7 }, (_, i) => { const d = new Date(gridStart); d.setDate(gridStart.getDate() + i); return d.toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-GB', { weekday: 'narrow' }) })
          const DOT: Record<string, string> = { pending: 'var(--pf-gold)', confirmed: 'var(--pf-success)' }
          const shiftMonth = (n: number) => setCalMonth(m => new Date(m.getFullYear(), m.getMonth() + n, 1))
          const dayBookings = (byDay.get(selectedDay) || []).sort((a, b2) => (toDate(a.scheduledFor)?.getTime() ?? 0) - (toDate(b2.scheduledFor)?.getTime() ?? 0))
          const selDate = new Date(`${selectedDay}T12:00`)
          return (
            <>
              <div className="pf-glass" style={{ borderRadius: '16px', padding: '16px 14px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', padding: '0 4px' }}>
                  <button onClick={() => shiftMonth(-1)} aria-label="Previous month" style={{ width: '30px', height: '30px', borderRadius: '8px', border: '1px solid var(--pf-border)', background: 'transparent', color: 'var(--pf-gold)', cursor: 'pointer' }}>‹</button>
                  <span style={{ fontFamily: 'var(--font-display)', color: 'var(--pf-head)', fontSize: '15px', letterSpacing: '0.04em', textTransform: 'capitalize' }}>{monthLabel}</span>
                  <button onClick={() => shiftMonth(1)} aria-label="Next month" style={{ width: '30px', height: '30px', borderRadius: '8px', border: '1px solid var(--pf-border)', background: 'transparent', color: 'var(--pf-gold)', cursor: 'pointer' }}>›</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '4px' }}>
                  {weekdays.map((w, i) => <div key={i} style={{ ...eyebrow, textAlign: 'center', fontSize: '9px' }}>{w}</div>)}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                  {cells.map(d => {
                    const k = dayKey(d)
                    const inMonth = d.getMonth() === calMonth.getMonth()
                    const dayBs = byDay.get(k) || []
                    const isSel = k === selectedDay
                    const isToday = k === todayK
                    return (
                      <button key={k} onClick={() => setSelectedDay(k)}
                        style={{
                          minHeight: '52px', borderRadius: '10px', cursor: 'pointer', padding: '6px 2px 4px',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                          border: `1px solid ${isSel ? 'var(--pf-gold)' : isToday ? 'var(--pf-border-strong)' : 'transparent'}`,
                          background: isSel ? 'rgba(190,154,86,0.12)' : dayBs.length > 0 ? 'var(--pf-card)' : 'transparent',
                        }}>
                        <span style={{ fontFamily: 'var(--font-sans)', fontSize: '11.5px', color: isSel || isToday ? 'var(--pf-gold)' : inMonth ? 'var(--pf-text)' : 'var(--pf-faint)', opacity: inMonth ? 1 : 0.45 }}>{d.getDate()}</span>
                        <span style={{ display: 'flex', gap: '3px', minHeight: '5px' }}>
                          {dayBs.slice(0, 3).map((b, i) => (
                            <span key={i} style={{ width: '5px', height: '5px', borderRadius: '50%', background: DOT[b.status] || 'var(--pf-faint)' }} />
                          ))}
                          {dayBs.length > 3 && <span style={{ fontFamily: 'var(--font-sans)', fontSize: '8px', color: 'var(--pf-gold)', lineHeight: '5px' }}>+</span>}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div style={{ ...eyebrow, color: 'var(--pf-eyebrow)', margin: '0 0 10px', textTransform: 'capitalize' }}>
                {selDate.toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
              </div>
              {dayBookings.length === 0 ? (
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: 'var(--pf-faint)', fontStyle: 'italic' }}>{L('cal_none')}</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 22rem), 1fr))', gap: '12px' }}>
                  {dayBookings.map(b => (
                    <ReservationCard key={b.id} booking={b} locale={locale}
                      busy={busyId === b.id}
                      onOpen={setDetail}
                      onAccept={x => respond(x, 'confirmed')} />
                  ))}
                </div>
              )}
            </>
          )
        })()
      ) : shown.length === 0 ? (
        <EmptyState icon="◷" title={L('res_empty_t')} body={L('res_empty_b')} />
      ) : (
        // Grouped by day (Airbnb host pattern) — partners read their bookings
        // like a service sheet: Today, Tomorrow, then dated sections; anything
        // already behind us lives under a separate Past divider.
        (() => {
          const now = new Date()
          const tm = new Date(now); tm.setDate(now.getDate() + 1)
          const dayLabel = (d: Date | null) => {
            if (!d) return '—'
            if (sameDay(d, now)) return L('dp_today')
            if (sameDay(d, tm)) return L('dp_tomorrow')
            return d.toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
          }
          const toGroups = (list: Booking[]) => {
            const groups: { label: string; items: Booking[] }[] = []
            for (const b of list) {
              const label = dayLabel(toDate(b.scheduledFor))
              const g = groups[groups.length - 1]
              if (g && g.label === label) g.items.push(b)
              else groups.push({ label, items: [b] })
            }
            return groups
          }
          const renderGroups = (list: Booking[]) => toGroups(list).map(g => (
            <div key={g.label} style={{ marginBottom: '18px' }}>
              <div style={{ ...eyebrow, color: 'var(--pf-eyebrow)', margin: '0 0 8px', textTransform: 'capitalize' }}>{g.label}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 22rem), 1fr))', gap: '12px' }}>
                {g.items.map(b => (
                  <ReservationCard key={b.id} booking={b} locale={locale}
                    busy={busyId === b.id}
                    onOpen={setDetail}
                    onAccept={x => respond(x, 'confirmed')} />
                ))}
              </div>
            </div>
          ))
          return (
            <>
              {renderGroups(upcoming)}
              {past.length > 0 && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '26px 0 14px' }}>
                    <span style={{ ...eyebrow, color: 'var(--pf-faint)' }}>{L('past_hdr')}</span>
                    <span style={{ flex: 1, height: '1px', background: 'var(--pf-border)' }} />
                  </div>
                  {renderGroups(past)}
                </>
              )}
            </>
          )
        })()
      )}

      {/* Detail drawer — everything we know about one booking, in one place. */}
      {detail && (() => {
        const b = detail
        const when = toDate(b.scheduledFor)
        const payMap = b.payment as { provider?: string; status?: string } | undefined
        const payLabel = b.paymentStatus === 'paid' ? L('dt_paid')
          : b.paymentStatus === 'refunded' ? L('dt_refunded')
          : b.paymentStatus === 'unpaid' ? L('dt_unpaid')
          : payMap?.status ? `${payMap.provider ?? '—'} · ${payMap.status}` : L('dt_none')
        const row = (label: string, value: React.ReactNode) => (
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '14px', padding: '9px 0', borderTop: '1px solid var(--pf-border)' }}>
            <span style={eyebrow}>{label}</span>
            <span style={{ fontFamily: 'var(--font-serif)', color: 'var(--pf-text)', fontSize: '13.5px', textAlign: 'right', overflowWrap: 'anywhere' }}>{value}</span>
          </div>
        )
        return (
          <div onClick={() => setDetail(null)} style={{ position: 'fixed', inset: 0, background: 'var(--pf-scrim)', zIndex: 80, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
            <div onClick={e => e.stopPropagation()} className="pf-in"
              style={{ background: 'var(--pf-sheet)', border: '1px solid var(--pf-border)', borderRadius: '18px 18px 0 0', padding: '20px', width: '100%', maxWidth: '30rem', maxHeight: '85vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '10px' }}>
                <div style={{ ...eyebrow, color: 'var(--pf-eyebrow)' }}>{L('dt_title')}</div>
                <button onClick={() => setDetail(null)} style={{ background: 'transparent', border: 'none', color: 'var(--pf-faint)', fontSize: '18px', cursor: 'pointer', lineHeight: 1 }}>×</button>
              </div>
              <div style={{ fontFamily: 'var(--font-display)', color: 'var(--pf-head)', fontSize: '1.25rem', letterSpacing: '0.03em', marginBottom: '12px' }}>{b.title}</div>
              {row(L('status_lbl'), <Chip tone={b.status === 'confirmed' ? 'green' : b.status === 'pending' ? 'gold' : 'neutral'}>{L({ pending: 'f_pending', confirmed: 'f_confirmed', completed: 'f_done', declined: 'st_declined', cancelled: 'st_cancelled', no_show: 'st_noshow' }[b.status] || b.status)}</Chip>)}
              {row(L('dt_booking_id'), <span style={{ fontFamily: 'var(--font-sans)', fontSize: '11.5px' }}>{b.id}</span>)}
              {row(locale === 'fr' ? 'Client' : 'Guest', b.customerName || L('dt_none'))}
              {b.customerPhone && row(L('dt_phone'), <a href={`tel:${b.customerPhone}`} style={{ color: 'var(--pf-gold)' }}>{b.customerPhone}</a>)}
              {b.customerEmail && row(L('dt_email'), <a href={`mailto:${b.customerEmail}`} style={{ color: 'var(--pf-gold)' }}>{b.customerEmail}</a>)}
              {row(locale === 'fr' ? 'Personnes' : 'Party size', `${b.guestCount}`)}
              {row(locale === 'fr' ? 'Date' : 'Date', when ? `${formatDate(when)} · ${when.toLocaleTimeString(locale === 'fr' ? 'fr-FR' : 'en-GB', { hour: '2-digit', minute: '2-digit' })}` : L('dt_none'))}
              {row(L('dt_payment'), payLabel)}
              {b.specialRequests && row(L('dt_requests'), b.specialRequests)}
              {row(L('total'), `${formatAmount(b.bookingTotal)} ${b.currency || 'XOF'}`)}
              {row(L('commission'), `−${formatAmount(b.commissionAmount)}`)}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '10px 0 0' }}>
                <span style={eyebrow}>{L('you_earn')}</span>
                <Money amount={formatAmount(b.payoutAmount)} size={24} currency={b.currency || 'XOF'} />
              </div>
              {/* Who is this guest to us? (Jordan) — history with THIS
                  company, plus how far the group's split payment has got. */}
              {(() => {
                const g = guestStats(b.customerId)
                const payers = b.payersCount ?? 0
                const paid = b.paidCount ?? 0
                const phone = b.customerPhone || b.checkout?.customerPhone
                const email = b.customerEmail || b.checkout?.customerEmail
                return (
                  <div className="pf-glass" style={{ borderRadius: '14px', padding: '14px 16px', marginTop: '16px' }}>
                    <div style={{ ...eyebrow, marginBottom: '10px' }}>{L('g_panel')}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 7rem), 1fr))', gap: '12px' }}>
                      <div>
                        <div style={{ fontFamily: 'var(--font-sans)', fontSize: '9.5px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--pf-faint)' }}>{L('g_visits')}</div>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: '22px', color: 'var(--pf-text)', marginTop: '3px' }}>{g.visits}</div>
                      </div>
                      <div>
                        <div style={{ fontFamily: 'var(--font-sans)', fontSize: '9.5px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--pf-faint)' }}>{L('g_spend')}</div>
                        <div style={{ marginTop: '3px' }}><Money amount={formatAmount(g.spend)} size={22} currency={b.currency || 'XOF'} /></div>
                      </div>
                      <div>
                        <div style={{ fontFamily: 'var(--font-sans)', fontSize: '9.5px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--pf-faint)' }}>{L('g_since')}</div>
                        <div style={{ fontFamily: 'var(--font-sans)', fontSize: '12.5px', color: 'var(--pf-text)', marginTop: '6px' }}>
                          {g.visits <= 1 ? L('g_first_time') : (g.since ? formatDate(g.since) : '—')}
                        </div>
                      </div>
                    </div>
                    {(phone || email) && (
                      <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--pf-border)' }}>
                        {phone && <a href={`tel:${phone}`} style={{ fontFamily: 'var(--font-sans)', fontSize: '11.5px', color: 'var(--pf-gold)' }}>☏ {phone}</a>}
                        {email && <a href={`mailto:${email}`} style={{ fontFamily: 'var(--font-sans)', fontSize: '11.5px', color: 'var(--pf-gold)', overflowWrap: 'anywhere' }}>✉ {email}</a>}
                      </div>
                    )}
                    {payers > 1 && (
                      <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--pf-border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
                          <span style={{ fontFamily: 'var(--font-sans)', fontSize: '10.5px', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--pf-faint)' }}>{L('g_pay_progress')}</span>
                          <span style={{ fontFamily: 'var(--font-sans)', fontSize: '11.5px', color: paid >= payers ? 'var(--pf-success)' : 'var(--pf-gold)' }}>{paid} {L('g_paid_of')} {payers}</span>
                        </div>
                        <div style={{ height: '7px', borderRadius: '999px', background: 'var(--pf-card)', border: '1px solid var(--pf-border)', overflow: 'hidden' }}>
                          <div className="pf-pill" style={{ height: '100%', width: `${Math.min(100, Math.round((paid / payers) * 100))}%`, borderRadius: '999px', background: paid >= payers ? 'var(--pf-success)' : 'linear-gradient(90deg, var(--pf-gold-deep), var(--pf-gold))' }} />
                        </div>
                      </div>
                    )}
                  </div>
                )
              })()}
              {awaitingPayment(b) && (
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: '11.5px', color: 'var(--pf-gold)', background: 'rgba(190,154,86,0.1)', border: '1px solid var(--pf-border-strong)', borderRadius: '10px', padding: '10px 12px', margin: '14px 0 0', lineHeight: 1.5 }}>
                  ◷ {L('await_pay_note')}
                </p>
              )}
              {b.status === 'pending' && (
                <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                  <GhostButton tone="alert" onClick={() => respond(b, 'declined')}>{L('decline')}</GhostButton>
                  <button onClick={() => respond(b, 'confirmed')} disabled={busyId === b.id}
                    style={{ flex: 1, padding: '10px 16px', background: 'var(--pf-gold-deep)', border: 'none', borderRadius: '10px', color: '#ebe8db', fontFamily: 'var(--font-sans)', fontSize: '12.5px', cursor: 'pointer', opacity: busyId === b.id ? 0.6 : 1 }}>
                    {L('accept')}
                  </button>
                </div>
              )}
              {b.status === 'confirmed' && when && when.getTime() < Date.now() && (
                <div style={{ marginTop: '16px' }}>
                  <GhostButton tone="alert" onClick={() => respond(b, 'no_show')}>{L('mark_noshow')}</GhostButton>
                </div>
              )}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
