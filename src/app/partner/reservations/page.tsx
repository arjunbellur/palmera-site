'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { usePartner } from '../PartnerContext'
import { t } from '../i18n'
import { getBookingsByCompany, setBookingStatus } from '@/lib/firestore'
import type { Booking } from '@/lib/schema'
import { toDate } from '@/lib/money'
import { ScreenHeader, EmptyState, Chip, Money, eyebrow, GhostButton } from '@/components/partner/ui'
import ReservationCard from '@/components/partner/ReservationCard'
import { formatAmount, formatDate } from '@/lib/money'

type Filter = 'all' | 'pending' | 'confirmed' | 'done'

export default function ReservationsScreen() {
  const { uid, company, locale } = usePartner()
  const L = (k: string) => t(locale, k)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [datePreset, setDatePreset] = useState<'' | 'today' | 'tomorrow' | 'week'>('')
  const [detail, setDetail] = useState<Booking | null>(null)
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')

  const load = async () => {
    if (!uid || !company?.id) return
    setBookings(await getBookingsByCompany(uid, company.id))
  }
  useEffect(() => { load() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [uid, company?.id])

  const respond = async (b: Booking, status: 'confirmed' | 'declined' | 'no_show') => {
    if (!b.id) return
    setBusyId(b.id); setError('')
    try {
      await setBookingStatus(b.id, status)
      setDetail(null)
      await load()
    } catch {
      // Most likely cause: the security rule for partner-side confirmation
      // isn't deployed, or the booking already moved on. Say so plainly.
      setError(locale === 'fr'
        ? 'Impossible de mettre à jour cette réservation. Réessayez ou contactez Palmera.'
        : 'Could not update this reservation. Try again, or contact Palmera.')
    }
    setBusyId('')
  }

  const pendingCount = bookings.filter(b => b.status === 'pending').length
  const q = search.trim().toLowerCase()
  const sameDay = (d: Date, ref: Date) => d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth() && d.getDate() === ref.getDate()
  const shown = bookings.filter(b => {
    if (filter === 'pending' && b.status !== 'pending') return false
    if (filter === 'confirmed' && b.status !== 'confirmed') return false
    if (filter === 'done' && !['completed', 'no_show', 'cancelled', 'declined'].includes(b.status)) return false
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
  }).sort((a, b) => (toDate(b.scheduledFor)?.getTime() ?? 0) - (toDate(a.scheduledFor)?.getTime() ?? 0))

  const FILTERS: { key: Filter; label: string; count?: number }[] = [
    { key: 'all', label: L('f_all') },
    { key: 'pending', label: L('f_pending'), count: pendingCount },
    { key: 'confirmed', label: L('f_confirmed') },
    { key: 'done', label: L('f_done') },
  ]

  return (
    <div className="pf-in">
      <ScreenHeader label={L('res_label')} title={L('res_title')} intro={L('res_intro')} />

      {/* Search + date, above the status pills (Jordan: find a booking fast). */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder={L('search_ph')}
          style={{ flex: '1 1 14rem', background: 'var(--pf-card)', border: '1px solid var(--pf-border)', borderRadius: '10px', padding: '9px 13px', color: 'var(--pf-text)', fontFamily: 'var(--font-sans)', fontSize: '12.5px', outline: 'none' }} />
        {([['today', 'dp_today'], ['tomorrow', 'dp_tomorrow'], ['week', 'dp_week']] as const).map(([k, label]) => (
          <button key={k} onClick={() => { setDatePreset(p => p === k ? '' : k); setDateFilter('') }}
            style={{ padding: '8px 13px', borderRadius: '10px', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: '11.5px', border: `1px solid ${datePreset === k ? 'var(--pf-border-strong)' : 'var(--pf-border)'}`, background: datePreset === k ? 'var(--pf-card)' : 'transparent', color: datePreset === k ? 'var(--pf-gold)' : 'var(--pf-faint)' }}>
            {L(label)}
          </button>
        ))}
        <input type="date" value={dateFilter} onChange={e => { setDateFilter(e.target.value); setDatePreset('') }}
          style={{ background: 'var(--pf-card)', border: '1px solid var(--pf-border)', borderRadius: '10px', padding: '8px 12px', color: dateFilter ? 'var(--pf-text)' : 'var(--pf-faint)', fontFamily: 'var(--font-sans)', fontSize: '12.5px', outline: 'none', colorScheme: 'dark' }} />
        {(search || dateFilter || datePreset) && (
          <button onClick={() => { setSearch(''); setDateFilter(''); setDatePreset('') }}
            style={{ background: 'transparent', border: '1px solid var(--pf-border)', borderRadius: '10px', padding: '8px 13px', color: 'var(--pf-faint)', fontFamily: 'var(--font-sans)', fontSize: '11.5px', cursor: 'pointer' }}>
            {L('clear')}
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap', marginBottom: '16px' }}>
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

      {shown.length === 0 ? (
        <EmptyState icon="◷" title={L('res_empty_t')} body={L('res_empty_b')} />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 22rem), 1fr))', gap: '12px' }}>
          {shown.map(b => (
            <ReservationCard key={b.id} booking={b} locale={locale}
              busy={busyId === b.id}
              onOpen={setDetail}
              onAccept={x => respond(x, 'confirmed')}
              onDecline={x => respond(x, 'declined')}
              onNoShow={x => respond(x, 'no_show')} />
          ))}
        </div>
      )}

      {/* Detail drawer — everything we know about one booking, in one place. */}
      {detail && (() => {
        const b = detail
        const when = toDate(b.scheduledFor)
        const payLabel = b.paymentStatus === 'paid' ? L('dt_paid') : b.paymentStatus === 'refunded' ? L('dt_refunded') : b.paymentStatus === 'unpaid' ? L('dt_unpaid') : L('dt_none')
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
              {b.status === 'pending' && (
                <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                  <GhostButton tone="alert" onClick={() => respond(b, 'declined')}>{L('decline')}</GhostButton>
                  <button onClick={() => respond(b, 'confirmed')} disabled={busyId === b.id}
                    style={{ flex: 1, padding: '10px 16px', background: 'var(--pf-gold-deep)', border: 'none', borderRadius: '10px', color: '#ebe8db', fontFamily: 'var(--font-sans)', fontSize: '12.5px', cursor: 'pointer', opacity: busyId === b.id ? 0.6 : 1 }}>
                    {L('accept')}
                  </button>
                </div>
              )}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
