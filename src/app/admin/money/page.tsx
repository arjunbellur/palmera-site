'use client'
// Money — every booking across all partners, revenue, and what Palmera will
// owe each company. Read-only over collections the admin rules already allow;
// all filtering client-side (no query shapes → no indexes). Filters live in
// the URL so a view can be shared or reloaded.
import { useEffect, useState, Suspense } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { getAllBookingsAdmin, getAllCompanies, getAppProfiles, getPayoutProfile } from '@/lib/firestore'
import { docDate, isRealBooking, startOfMonth, sumField, bucketByPeriod } from '@/lib/analytics'
import { ScreenHeader, Chip, Skeleton, Money, SectionTitle, EmptyState, card, eyebrow, type Tone } from '@/components/partner/ui'
import { BarChart, RankPills, Donut } from '@/components/charts'
import { FilterChip, inputStyle, formatDate, glass } from '../ui'
import type { Booking, BookingStatus, Company, AppProfile, CompanyPayoutProfile } from '@/lib/schema'
import { Wallet, CalendarDays } from 'lucide-react'
import { formatAmount, isDelivered, isUpcoming } from '@/lib/money'

const fmt = formatAmount

const STATUS_TONE: Record<string, Tone> = {
  pending: 'gold', confirmed: 'green', completed: 'neutral', declined: 'alert', cancelled: 'alert', no_show: 'alert',
}
const STATUSES: BookingStatus[] = ['pending', 'confirmed', 'completed', 'declined', 'cancelled', 'no_show']

function MoneySkeleton() {
  return (
    <div className="pf-in">
      <Skeleton height="74px" style={{ maxWidth: '30rem', marginBottom: '22px' }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '12px' }}>
        <Skeleton height="86px" /><Skeleton height="86px" /><Skeleton height="86px" />
      </div>
      <Skeleton height="300px" />
    </div>
  )
}

function AdminMoney() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [bookings, setBookings] = useState<Booking[]>([])
  const [orphans, setOrphans] = useState(0)
  const [companies, setCompanies] = useState<Company[]>([])
  const [profiles, setProfiles] = useState<AppProfile[]>([])
  const [payoutProfiles, setPayoutProfiles] = useState<Record<string, CompanyPayoutProfile | null>>({})
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    ;(async () => {
      const [bs, cos, ps] = await Promise.all([getAllBookingsAdmin(), getAllCompanies(), getAppProfiles()])
      const real = bs.filter(isRealBooking)
      setOrphans(bs.length - real.length)
      setBookings(real)
      setCompanies(cos)
      setProfiles(ps)
      setLoaded(true)
      // Payout-detail presence, only for companies that have completed money.
      const owedIds = [...new Set(real.filter((b) => b.status === 'completed').map((b) => b.companyId))]
      const entries = await Promise.all(owedIds.map(async (id) => [id, await getPayoutProfile(id)] as const))
      setPayoutProfiles(Object.fromEntries(entries))
    })()
  }, [])

  // ── URL-backed filters ──
  const status = searchParams.get('status') || 'all'
  const co = searchParams.get('co') || 'all'
  const from = searchParams.get('from') || ''
  const to = searchParams.get('to') || ''
  const setParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value && value !== 'all') params.set(key, value); else params.delete(key)
    router.replace(params.size ? `${pathname}?${params}` : pathname, { scroll: false })
  }

  if (!loaded) return <MoneySkeleton />

  const coName = new Map(companies.map((c) => [c.id, c.name || 'Untitled']))
  const byId = new Map(profiles.map((p) => [p.id, p]))
  const handleOf = (uid: string) => { const p = byId.get(uid); return p?.handle ? `@${p.handle.replace(/^@+/, '')}` : (p?.name || null) }

  // ── Explorer rows ──
  const fromD = from ? new Date(`${from}T00:00`) : null
  const toD = to ? new Date(`${to}T23:59:59`) : null
  const rows = bookings.filter((b) => {
    if (status !== 'all' && b.status !== status) return false
    if (co !== 'all' && b.companyId !== co) return false
    const d = docDate(b, 'scheduledFor')
    if (fromD && (!d || d < fromD)) return false
    if (toD && (!d || d > toD)) return false
    return true
  }).sort((a, b) => (docDate(b, 'scheduledFor')?.getTime() ?? 0) - (docDate(a, 'scheduledFor')?.getTime() ?? 0))

  // ── Revenue (completed only) ──
  // Delivered = completed OR confirmed with the date passed — money Palmera has
  // collected AND earned. (Auto-completion doesn't exist yet; this is what
  // 'completed' means in practice.)
  const completed = bookings.filter(isDelivered)
  const upcomingB = bookings.filter(isUpcoming)
  const collectedAll = sumField([...completed, ...upcomingB], 'bookingTotal')
  const owedAll = sumField(completed, 'payoutAmount')
  const heldForUpcoming = sumField(upcomingB, 'payoutAmount')
  const month = startOfMonth()
  const completedMonth = completed.filter((b) => { const d = docDate(b, 'scheduledFor'); return d !== null && d >= month })
  const gmvAll = sumField(completed, 'bookingTotal')
  const commAll = sumField(completed, 'commissionAmount')
  const gmvMonth = sumField(completedMonth, 'bookingTotal')
  const commMonth = sumField(completedMonth, 'commissionAmount')
  const commBuckets = bucketByPeriod(completed, { period: 'month', buckets: 6, dateKey: 'scheduledFor', sumOf: (b) => (b as Booking).commissionAmount || 0 })
  const resolved = bookings.filter((b) => b.status !== 'pending' && b.status !== 'confirmed')
  const completionRate = resolved.length ? (completed.length / resolved.length) * 100 : 0

  const byCompany = (() => {
    const m = new Map<string, number>()
    const coLogo = new Map(companies.map((c) => [c.id, c.logo || null]))
    completed.forEach((b) => m.set(b.companyId, (m.get(b.companyId) || 0) + (b.bookingTotal || 0)))
    return [...m.entries()].map(([id, v]) => ({ label: coName.get(id) || '—', value: v, display: `${fmt(v)} XOF`, img: coLogo.get(id) || null })).sort((a, b) => b.value - a.value).slice(0, 5)
  })()
  const byCategory = (() => {
    const catOf = new Map(companies.map((c) => [c.id, c.category || '—']))
    const m = new Map<string, number>()
    completed.forEach((b) => { const k = catOf.get(b.companyId) || '—'; m.set(k, (m.get(k) || 0) + (b.bookingTotal || 0)) })
    return [...m.entries()].map(([label, v]) => ({ label, value: v, display: `${fmt(v)} XOF` })).sort((a, b) => b.value - a.value).slice(0, 5)
  })()

  // ── Payout readiness ──
  const owed = (() => {
    const m = new Map<string, { gross: number; commission: number; net: number; n: number }>()
    completed.forEach((b) => {
      const c = m.get(b.companyId) || { gross: 0, commission: 0, net: 0, n: 0 }
      c.gross += b.bookingTotal || 0; c.commission += b.commissionAmount || 0; c.net += b.payoutAmount || 0; c.n++
      m.set(b.companyId, c)
    })
    return [...m.entries()].map(([id, v]) => ({ id, name: coName.get(id) || '—', ...v, amount: v.net, hasPayout: !!payoutProfiles[id] })).sort((a, b) => b.amount - a.amount)
  })()

  return (
    <div className="pf-in">
      <ScreenHeader label="Palmera HQ" title="Money" intro="Every booking on the platform, the revenue behind it, and what Palmera owes each partner." />

      {/* Composition: the working column (revenue + explorer) with the payout
          rail pinned right on wide screens. */}
      <div className="pf-cols">
      <div style={{ minWidth: 0 }}>
      {/* The money position — how it actually flows: guests pay the full
          amount into Palmera's Stripe; Palmera keeps its commission; the net
          is owed to partners once the experience is delivered. */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 13rem), 1fr))', gap: '12px' }}>
        <div className="pf-glass pf-glass-gold" style={glass}>
          <div style={eyebrow}>Collected in Stripe</div>
          <div style={{ marginTop: '8px' }}><Money amount={fmt(collectedAll)} size={30} /></div>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: '10.5px', color: 'var(--pf-muted)', marginTop: '8px' }}>all paid bookings · delivered + upcoming</div>
        </div>
        <div className="pf-glass pf-glass-gold" style={glass}>
          <div style={eyebrow}>Palmera keeps · delivered</div>
          <div style={{ marginTop: '8px' }}><Money amount={fmt(commAll)} size={30} /></div>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: '10.5px', color: 'var(--pf-muted)', marginTop: '8px' }}>{fmt(commMonth)} XOF this month · GMV {fmt(gmvAll)}</div>
        </div>
        <div className="pf-glass" style={glass}>
          <div style={eyebrow}>Owed to partners · delivered</div>
          <div style={{ marginTop: '8px' }}><Money amount={fmt(owedAll)} size={30} /></div>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: '10.5px', color: 'var(--pf-muted)', marginTop: '8px' }}>pay out on the 1st / 16th</div>
        </div>
        <div className="pf-glass" style={glass}>
          <div style={eyebrow}>Held for upcoming</div>
          <div style={{ marginTop: '8px' }}><Money amount={fmt(heldForUpcoming)} size={30} /></div>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: '10.5px', color: 'var(--pf-muted)', marginTop: '8px' }}>partners' net on bookings not yet delivered</div>
        </div>
      </div>

      {commBuckets.some((b) => b.sum > 0) && (
        <div style={{ marginTop: '16px' }}>
          <div style={{ ...eyebrow, marginBottom: '10px' }}>Commission by month</div>
          <BarChart data={commBuckets.map((b) => ({ label: b.label, value: b.sum, display: fmt(b.sum) }))} />
        </div>
      )}
      {(byCompany.length > 0 || byCategory.length > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 20rem), 1fr))', gap: '20px', marginTop: '16px' }}>
          {byCompany.length > 0 && <div><div style={{ ...eyebrow, marginBottom: '10px' }}>Revenue by company</div><RankPills items={byCompany} /></div>}
          {byCategory.length > 0 && <div><div style={{ ...eyebrow, marginBottom: '10px' }}>Revenue by category</div><RankPills items={byCategory} /></div>}
        </div>
      )}

      </div>

      <div className="pf-rail" style={{ minWidth: 0 }}>
      <div className="pf-glass" style={{ ...glass, display: 'flex', alignItems: 'center' }}>
        <Donut percent={completionRate} label="Completion rate" sub={`${completed.length} completed of ${resolved.length} resolved booking(s)`} />
      </div>
      {/* Payout readiness */}
      <SectionTitle>Payout readiness</SectionTitle>
      <p style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', color: 'var(--pf-faint)', margin: '-6px 0 12px' }}>
        Net owed per partner on DELIVERED bookings (completed, or confirmed with the date passed). Guests paid Palmera in full; commission is already deducted here.
      </p>
      {owed.length === 0 ? (
        <EmptyState icon={<Wallet size={22} strokeWidth={1.75} />} title="Nothing owed yet" body="Once a paid booking's date passes, the partner's net builds up here." chip="Payouts on the 1st and 16th" />
      ) : (
        <div className="pf-glass" style={{ ...glass, padding: '6px 16px' }}>
          {owed.map((o, i) => (
            <div key={o.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '11px 0', borderTop: i > 0 ? '1px solid var(--pf-border)' : 'none', flexWrap: 'wrap' }}>
              <span style={{ minWidth: 0 }}>
                <span style={{ fontFamily: 'var(--font-serif)', color: 'var(--pf-text)', fontSize: '14px', display: 'block' }}>{o.name}</span>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '10.5px', color: 'var(--pf-faint)' }}>{o.n} delivered · guests paid {fmt(o.gross)} · Palmera keeps {fmt(o.commission)}</span>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Chip tone={o.hasPayout ? 'green' : 'alert'}>{o.hasPayout ? 'payout details ✓' : 'no payout details'}</Chip>
                <Money amount={fmt(o.amount)} size={18} />
              </span>
            </div>
          ))}
        </div>
      )}

      </div>
      </div>

      {/* Bookings explorer — full width beneath the grid; the row list wants
          every pixel it can get. */}
      <SectionTitle>All bookings</SectionTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ ...eyebrow, marginRight: '2px' }}>Status</span>
          {STATUSES.map((st) => (
            <FilterChip key={st} active={status === st} onClick={() => setParam('status', status === st ? 'all' : st)}>{st.replace('_', ' ')}</FilterChip>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <select value={co} onChange={(e) => setParam('co', e.target.value)} style={{ ...inputStyle, width: 'auto', appearance: 'none' }}>
            <option value="all">All companies</option>
            {companies.map((c) => <option key={c.id} value={c.id}>{c.name || 'Untitled'}</option>)}
          </select>
          <input type="date" value={from} onChange={(e) => setParam('from', e.target.value)} style={{ ...inputStyle, width: 'auto' }} />
          <span style={{ color: 'var(--pf-faint)', fontSize: '11px' }}>→</span>
          <input type="date" value={to} onChange={(e) => setParam('to', e.target.value)} style={{ ...inputStyle, width: 'auto' }} />
          {(status !== 'all' || co !== 'all' || from || to) && (
            <button onClick={() => router.replace(pathname, { scroll: false })} style={{ background: 'transparent', border: 'none', color: 'var(--pf-gold)', fontFamily: 'var(--font-sans)', fontSize: '11px', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>Clear</button>
          )}
          <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-sans)', fontSize: '10.5px', color: 'var(--pf-faint)' }}>
            {rows.length} of {bookings.length}{orphans > 0 ? ` · ${orphans} malformed doc(s) hidden` : ''}
          </span>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={<CalendarDays size={22} strokeWidth={1.75} />} title="No bookings match" body="Try clearing a filter or widening the date range." />
      ) : (
        <div className="pf-glass" style={{ ...glass, padding: '8px' }}>
          {rows.map((b, i) => {
            const handle = handleOf(b.customerId)
            const d = docDate(b, 'scheduledFor')
            return (
              <div key={b.id} className="pf-note" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', animationDelay: `${Math.min(i * 30, 400)}ms` }}>
                <span style={{ width: '36px', height: '36px', borderRadius: '12px', background: 'var(--pf-green-soft)', border: '1px solid var(--pf-border-strong)', color: 'var(--pf-gold)', display: 'grid', placeItems: 'center', fontSize: '13px', flexShrink: 0, overflow: 'hidden' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {byId.get(b.customerId)?.avatar_url ? <img loading="lazy" decoding="async" src={byId.get(b.customerId)!.avatar_url!} alt="" style={{ width: '36px', height: '36px', objectFit: 'cover', display: 'block' }} /> : '▤'}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-sans)', color: 'var(--pf-text)', fontSize: '12.5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {b.title} <span style={{ color: 'var(--pf-muted)' }}>· {coName.get(b.companyId) || '—'}</span>
                  </div>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: '10px', color: 'var(--pf-faint)', marginTop: '3px' }}>
                    {d ? formatDate(d.toISOString()) : '—'} · {b.customerName || 'Guest'}{handle ? ` (${handle})` : ''} · {b.guestCount || 1} guest(s)
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                  {b.bookingTotal > 0 && <span style={{ fontFamily: 'var(--font-sans)', fontSize: '11.5px', color: 'var(--pf-gold)' }}>{fmt(b.bookingTotal)}</span>}
                  <Chip tone={STATUS_TONE[b.status] || 'neutral'}>{b.status.replace('_', ' ')}</Chip>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function AdminMoneyPage() {
  // useSearchParams requires a Suspense boundary at build time.
  return <Suspense fallback={<MoneySkeleton />}><AdminMoney /></Suspense>
}
