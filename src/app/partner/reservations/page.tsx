'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { usePartner } from '../PartnerContext'
import { t } from '../i18n'
import { getBookingsByCompany, setBookingStatus } from '@/lib/firestore'
import type { Booking } from '@/lib/schema'
import { toDate } from '@/lib/money'
import { ScreenHeader, EmptyState, Chip } from '@/components/partner/ui'
import ReservationCard from '@/components/partner/ReservationCard'

type Filter = 'all' | 'pending' | 'confirmed' | 'done'

export default function ReservationsScreen() {
  const { uid, company, locale } = usePartner()
  const L = (k: string) => t(locale, k)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const [dateFilter, setDateFilter] = useState('')
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
  const shown = bookings.filter(b => {
    if (filter === 'pending' && b.status !== 'pending') return false
    if (filter === 'confirmed' && b.status !== 'confirmed') return false
    if (filter === 'done' && !['completed', 'no_show', 'cancelled', 'declined'].includes(b.status)) return false
    if (q && !`${b.title} ${b.customerName}`.toLowerCase().includes(q)) return false
    if (dateFilter) {
      const d = toDate(b.scheduledFor)
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
        <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)}
          style={{ background: 'var(--pf-card)', border: '1px solid var(--pf-border)', borderRadius: '10px', padding: '8px 12px', color: dateFilter ? 'var(--pf-text)' : 'var(--pf-faint)', fontFamily: 'var(--font-sans)', fontSize: '12.5px', outline: 'none', colorScheme: 'dark' }} />
        {(search || dateFilter) && (
          <button onClick={() => { setSearch(''); setDateFilter('') }}
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
              onAccept={x => respond(x, 'confirmed')}
              onDecline={x => respond(x, 'declined')}
              onNoShow={x => respond(x, 'no_show')} />
          ))}
        </div>
      )}
    </div>
  )
}
