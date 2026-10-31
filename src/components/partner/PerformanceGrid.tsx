'use client'
// "How is my business doing on Palmera?" — one grid, derived from the
// company's bookings. Lives on Earnings (consolidation step 5); Home is
// today-and-actions only. Every tile that opens a list links to it with the
// filter preset.
import Link from 'next/link'
import type { Booking } from '@/lib/schema'
import { formatAmount, toDate } from '@/lib/money'
import { cardShape, eyebrow } from './ui'
import { t, type Locale } from '@/app/partner/i18n'

function Tile({ label, value, sub, href }: { label: string; value: string; sub?: string; href?: string }) {
  const body = (
    <>
      <div style={{ ...eyebrow, fontSize: '10px' }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '22px', color: 'var(--pf-text)', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</div>
      {sub && <div style={{ fontFamily: 'var(--font-sans)', fontSize: '10px', color: 'var(--pf-faint)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub}</div>}
    </>
  )
  const style = { ...cardShape, padding: '14px 16px', textDecoration: 'none', display: 'block' as const }
  return href ? <Link href={href} className="pf-glass" style={style}>{body}</Link> : <div className="pf-glass" style={style}>{body}</div>
}

export default function PerformanceGrid({ bookings, locale }: { bookings: Booking[]; locale: Locale }) {
  const L = (k: string) => t(locale, k)
  const now = new Date()
  const thisMonth = (b: Booking) => { const d = toDate(b.scheduledFor); return !!d && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() }
  const monthAll = bookings.filter(thisMonth)
  const monthLive = monthAll.filter(b => ['confirmed', 'completed'].includes(b.status) || (b.status === 'pending' && b.confirmationType !== 'instant'))
  const monthRevenue = monthLive.reduce((s, b) => s + (b.payoutAmount || 0), 0)
  const completedAll = bookings.filter(b => b.status === 'completed').length
  const decided = bookings.filter(b => ['confirmed', 'completed', 'cancelled', 'declined', 'no_show'].includes(b.status)).length
  const cancelled = bookings.filter(b => ['cancelled', 'declined'].includes(b.status)).length
  const cancelRate = decided > 0 ? Math.round((cancelled / decided) * 100) : 0
  const valued = bookings.filter(b => ['confirmed', 'completed'].includes(b.status) && (b.bookingTotal || 0) > 0)
  const avgValue = valued.length ? Math.round(valued.reduce((s, b) => s + (b.bookingTotal || 0), 0) / valued.length) : 0
  const counts = new Map<string, number>()
  for (const b of bookings) if (['confirmed', 'completed'].includes(b.status)) counts.set(b.title, (counts.get(b.title) || 0) + 1)
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]
  const upcoming = bookings.filter(b => b.status === 'confirmed' && (toDate(b.scheduledFor)?.getTime() ?? 0) >= now.getTime()).length
  const pending = bookings.filter(b => b.status === 'pending' && b.confirmationType !== 'instant').length
  if (bookings.length === 0) return null
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 9.5rem), 1fr))', gap: '10px' }}>
      <Tile label={L('perf_month_res')} value={String(monthLive.length)} href="/partner/reservations" />
      <Tile label={L('perf_month_rev')} value={formatAmount(monthRevenue)} sub="XOF" />
      <Tile label={L('perf_completed')} value={String(completedAll)} href="/partner/reservations?f=done" />
      <Tile label={L('perf_cancel')} value={`${cancelRate}%`} sub={decided > 0 ? `${cancelled}/${decided}` : undefined} href="/partner/reservations?f=cancelled" />
      <Tile label={L('perf_avg')} value={formatAmount(avgValue)} sub="XOF" />
      <Tile label={L('perf_top')} value={top ? top[0] : '—'} sub={top ? `${top[1]} ${L('bookings_n')}` : undefined} href="/partner/listings" />
      <Tile label={L('perf_upcoming')} value={String(upcoming)} href="/partner/reservations?f=next" />
      <Tile label={L('perf_pending')} value={String(pending)} href="/partner/reservations?f=pending" />
    </div>
  )
}
