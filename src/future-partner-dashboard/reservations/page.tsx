'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthChange } from '@/lib/auth'
import { getBookingsByProvider } from '@/lib/firestore'
import type { Booking, BookingStatus } from '@/lib/schema'
import { formatXOF, formatDate } from '@/lib/money'

const STATUS_STYLE: Record<BookingStatus, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pending', color: '#be9a56', bg: 'rgba(190,154,86,0.12)' },
  confirmed: { label: 'Confirmed', color: '#7a9e6b', bg: 'rgba(122,158,107,0.12)' },
  completed: { label: 'Completed', color: '#9e763b', bg: 'rgba(158,118,59,0.12)' },
  declined: { label: 'Declined', color: '#c47c7c', bg: 'rgba(196,124,124,0.12)' },
  cancelled: { label: 'Cancelled', color: 'var(--db-text-faint)', bg: 'var(--db-border-subtle)' },
  no_show: { label: 'No-show', color: '#c47c7c', bg: 'rgba(196,124,124,0.12)' },
}

const FILTERS: { key: 'all' | 'upcoming' | 'pending' | 'past'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Needs response' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'past', label: 'Past' },
]

export default function ReservationsPage() {
  const router = useRouter()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'pending' | 'past'>('all')

  useEffect(() => {
    const unsub = onAuthChange(async user => {
      if (!user) { router.replace('/dashboard'); return }
      setBookings(await getBookingsByProvider(user.uid))
      setLoading(false)
    })
    return () => unsub()
  }, [router])

  const now = Date.now()
  const when = (b: Booking) => {
    const v = b.scheduledFor as unknown as { toDate?: () => Date }
    return v?.toDate ? v.toDate().getTime() : new Date(b.scheduledFor as unknown as string).getTime()
  }
  const shown = bookings.filter(b => {
    if (filter === 'pending') return b.status === 'pending'
    if (filter === 'upcoming') return when(b) >= now && ['pending', 'confirmed'].includes(b.status)
    if (filter === 'past') return when(b) < now || ['completed', 'no_show', 'cancelled', 'declined'].includes(b.status)
    return true
  })

  const eyebrow: React.CSSProperties = { fontFamily: 'var(--font-sans)', color: 'rgba(190,154,86,0.8)', fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 0.5rem' }

  if (loading) return null

  return (
    <div>
      <div style={{ marginBottom: '1.75rem' }}>
        <p style={eyebrow}>Reservations</p>
        <h1 style={{ fontFamily: 'var(--font-display)', color: 'var(--db-text)', fontSize: 'clamp(1.5rem, 3vw, 1.875rem)', fontWeight: 400, letterSpacing: '0.06em', margin: '0 0 0.5rem' }}>
          Your reservations
        </h1>
        <p style={{ fontFamily: 'var(--font-serif)', color: 'var(--db-text-muted)', fontSize: '0.9375rem', margin: 0 }}>
          Bookings guests make on Palmera appear here. Confirm or decline the ones that need your response.
        </p>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {FILTERS.map(f => {
          const active = filter === f.key
          return (
            <button key={f.key} onClick={() => setFilter(f.key)}
              style={{ padding: '0.375rem 0.875rem', borderRadius: '2rem', border: `1px solid ${active ? '#be9a56' : 'var(--db-border-subtle)'}`, background: active ? 'rgba(190,154,86,0.12)' : 'transparent', color: active ? '#be9a56' : 'var(--db-text-muted)', fontFamily: 'var(--font-sans)', fontSize: '0.75rem', letterSpacing: '0.03em', cursor: 'pointer' }}>
              {f.label}
            </button>
          )
        })}
      </div>

      {shown.length === 0 ? (
        <div style={{ background: 'var(--db-bg-card)', border: '1px dashed var(--db-border-dashed)', borderRadius: '0.625rem', padding: '3rem 2rem', textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--font-serif)', color: 'var(--db-text-faint)', fontSize: '1.0625rem', margin: '0 0 0.5rem' }}>No reservations yet</p>
          <p style={{ fontFamily: 'var(--font-sans)', color: 'var(--db-text-ghost)', fontSize: '0.8125rem', margin: 0, maxWidth: '26rem', marginInline: 'auto', lineHeight: 1.6 }}>
            When guests book your experiences on the Palmera app, they&apos;ll show up here — with the date, party size, and what you&apos;ll earn.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {shown.map(b => {
            const s = STATUS_STYLE[b.status]
            return (
              <div key={b.id} style={{ background: 'var(--db-bg-card)', border: '1px solid var(--db-border-subtle)', borderRadius: '0.5rem', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontFamily: 'var(--font-serif)', color: 'var(--db-text)', fontSize: '0.9375rem', fontWeight: 500 }}>{b.title}</span>
                    <span style={{ fontSize: '0.625rem', color: s.color, background: s.bg, padding: '0.125rem 0.5rem', borderRadius: '2rem', fontFamily: 'var(--font-sans)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{s.label}</span>
                  </div>
                  <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--db-text-faint)', margin: 0 }}>
                    {formatDate(b.scheduledFor, true)} · {b.guestCount} guest{b.guestCount === 1 ? '' : 's'} · {b.customerName}
                  </p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontFamily: 'var(--font-sans)', color: 'var(--db-text)', fontSize: '0.9375rem', fontWeight: 600 }}>{formatXOF(b.payoutAmount, b.currency)}</div>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', color: 'var(--db-text-ghost)' }}>you earn · {formatXOF(b.bookingTotal, b.currency)} total</div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
