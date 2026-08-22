'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { usePartner } from './PartnerContext'
import { t } from './i18n'
import { getBookingsByCompany, getLedgerByProvider, getPayoutsByProvider, getExperiencesByCompany, getPayoutProfile } from '@/lib/firestore'
import type { Booking, Experience, LedgerEntry, Payout } from '@/lib/schema'
import { formatAmount, formatDate, toDate } from '@/lib/money'
import { ScreenHeader, StatTile, Money, EmptyState, SectionTitle, Skeleton, card, cardShape, eyebrow } from '@/components/partner/ui'
import ReservationCard from '@/components/partner/ReservationCard'
import { Clock, Wallet, LayoutGrid, Image as ImageIcon, Sparkles } from 'lucide-react'

export default function PartnerHome() {
  const { uid, company, provider, locale } = usePartner()
  const L = (k: string) => t(locale, k)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [ledger, setLedger] = useState<LedgerEntry[]>([])
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [experiences, setExperiences] = useState<Experience[]>([])
  const [hasPayoutProfile, setHasPayoutProfile] = useState(true)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!uid || !company?.id) return
    ;(async () => {
      const [b, l, p, e, pp] = await Promise.all([
        getBookingsByCompany(uid, company.id!), getLedgerByProvider(uid), getPayoutsByProvider(uid),
        getExperiencesByCompany(uid, company.id!), getPayoutProfile(company.id!),
      ])
      setBookings(b)
      setLedger(l.filter(x => x.companyId === company.id))
      setPayouts(p.filter(x => x.companyId === company.id))
      setExperiences(e)
      setHasPayoutProfile(!!pp)
      setLoaded(true)
    })()
  }, [uid, company?.id])

  const ledgerBalance = ledger.reduce((s, e) => s + (e.amount || 0), 0)
  // Same fallback as /partner/earnings: until the ledger writer exists, show
  // the money already sitting on confirmed/completed bookings.
  const upcomingEarn = bookings.filter(b => b.status === 'confirmed').reduce((s, b) => s + (b.payoutAmount || 0), 0)
  const deliveredEarn = bookings.filter(b => b.status === 'completed').reduce((s, b) => s + (b.payoutAmount || 0), 0)
  const derived = ledger.length === 0
  // Jordan's vocabulary: available for payout = delivered, not yet paid out.
  const balance = derived ? Math.max(0, deliveredEarn - payouts.filter(p => p.status === 'paid').reduce((s, p) => s + (p.netAmount || 0), 0)) : ledgerBalance
  const lifetime = payouts.filter(p => p.status === 'paid').reduce((s, p) => s + (p.netAmount || 0), 0)
  const next = payouts.find(p => p.status === 'scheduled' || p.status === 'processing')
  const pending = bookings.filter(b => b.status === 'pending')
  const upcomingAll = bookings
    .filter(b => ['pending', 'confirmed'].includes(b.status) && (toDate(b.scheduledFor)?.getTime() ?? 0) >= Date.now())
    .sort((a, b) => (toDate(a.scheduledFor)?.getTime() ?? 0) - (toDate(b.scheduledFor)?.getTime() ?? 0))
  const upcoming = upcomingAll.slice(0, 4)

  // Jordan's priority: what's happening TODAY, before any money numbers.
  const today = new Date()
  const isToday = (d: Date | null) => !!d && d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()
  const todayCount = bookings.filter(b => ['pending', 'confirmed'].includes(b.status) && isToday(toDate(b.scheduledFor))).length
  const nextRes = upcomingAll[0]
  const nextResWhen = nextRes ? toDate(nextRes.scheduledFor) : null

  const firstName = (provider?.fullName || '').trim().split(' ')[0]

  return (
    <div className="pf-in">
      <ScreenHeader
        label={L('home_label')}
        title={firstName ? `${L('greeting')}, ${firstName}` : L('home_title')}
        intro={L('home_intro')}
      />

      {/* Pending actions — severity-ranked (urgent → whenever), each row a
          colored badge + what's wrong + an Airbnb-style action pill saying
          exactly what to do. Every row links straight to where it gets fixed. */}
      {(() => {
        const incompleteListings = experiences.filter(e => (e.needsReview?.length ?? 0) > 0 || e.status === 'draft').length
        const missingPhotos = !!company && (!company.heroPhoto || !company.logo)
        type Tone = 'alert' | 'gold' | 'neutral'
        const TONE_BG: Record<Tone, string> = { alert: 'rgba(196,124,124,0.16)', gold: 'rgba(190,154,86,0.16)', neutral: 'var(--pf-card)' }
        const TONE_FG: Record<Tone, string> = { alert: 'var(--pf-alert)', gold: 'var(--pf-gold)', neutral: 'var(--pf-faint)' }
        const items: { href: string; label: string; icon: React.ReactNode; tone: Tone; act: string; when: string }[] = [
          // 1 — guests are literally waiting on a human. Red, top.
          ...(pending.length > 0 ? [{ href: '/partner/reservations?f=pending', label: `${pending.length} ${L('pa_pending_res')}`, icon: <Clock size={14} strokeWidth={1.75} />, tone: 'alert' as Tone, act: L('pa_act_respond'), when: L('pa_now') }] : []),
          // 2 — blocks getting paid. Gold.
          ...(!hasPayoutProfile ? [{ href: '/partner/settings?s=payout', label: L('pa_missing_payout'), icon: <Wallet size={14} strokeWidth={1.75} />, tone: 'gold' as Tone, act: L('pa_act_add'), when: L('pa_soon') }] : []),
          // 3 — unfinished listings can't sell. Gold.
          ...(incompleteListings > 0 ? [{ href: '/partner/listings', label: `${incompleteListings} ${L('pa_incomplete_listing')}`, icon: <LayoutGrid size={14} strokeWidth={1.75} />, tone: 'gold' as Tone, act: L('pa_act_finish'), when: L('pa_soon') }] : []),
          // 4 — polish. Neutral, bottom.
          ...(missingPhotos ? [{ href: '/partner/settings?s=photos', label: L('pa_missing_photos'), icon: <ImageIcon size={14} strokeWidth={1.75} />, tone: 'neutral' as Tone, act: L('pa_act_upload'), when: L('pa_optional') }] : []),
        ]
        if (items.length === 0) return null
        return (
          <div className="pf-glass" style={{ ...cardShape, marginBottom: '14px', padding: '14px 16px' }}>
            <div style={{ ...eyebrow, marginBottom: '10px' }}>{L('pa_title')}</div>
            {items.map((it, i) => (
              <a key={it.href + it.label} href={it.href} className="pf-note" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '9px 10px', textDecoration: 'none', borderTop: i > 0 ? '1px solid var(--pf-border)' : 'none', animationDelay: `${i * 60}ms` }}>
                <span style={{ width: '28px', height: '28px', borderRadius: '9px', background: TONE_BG[it.tone], color: TONE_FG[it.tone], display: 'grid', placeItems: 'center', fontSize: '13px', flexShrink: 0 }}>{it.icon}</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontFamily: 'var(--font-serif)', color: 'var(--pf-text)', fontSize: '13.5px', lineHeight: 1.35 }}>{it.label}</span>
                  <span style={{ display: 'block', fontFamily: 'var(--font-sans)', fontSize: '9.5px', letterSpacing: '0.06em', textTransform: 'uppercase', color: TONE_FG[it.tone], marginTop: '2px' }}>{it.when}</span>
                </span>
                <span style={{ flexShrink: 0, fontFamily: 'var(--font-sans)', fontSize: '10.5px', letterSpacing: '0.04em', color: TONE_FG[it.tone], background: TONE_BG[it.tone], border: `1px solid ${it.tone === 'neutral' ? 'var(--pf-border)' : TONE_FG[it.tone]}`, borderRadius: '999px', padding: '5px 12px' }}>
                  {it.act} →
                </span>
              </a>
            ))}
          </div>
        )
      })()}

      {/* Quick actions — saves the hunt for common tasks. */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
        {[
          { href: '/partner/listings', label: `+ ${L('qa_new')}` },
          { href: '/partner/reservations', label: L('qa_res') },
          { href: '/partner/settings?s=company', label: L('qa_company') },
          { href: 'mailto:palmeraexp@gmail.com', label: L('qa_support') },
        ].map(a => (
          <a key={a.label} href={a.href} style={{ padding: '8px 15px', borderRadius: '999px', border: '1px solid var(--pf-border-strong)', color: 'var(--pf-gold)', textDecoration: 'none', fontFamily: 'var(--font-sans)', fontSize: '11.5px', letterSpacing: '0.03em', background: 'transparent' }}>
            {a.label}
          </a>
        ))}
      </div>

      {/* Today first — a partner opening the app wants operations, then money. */}
      {!loaded && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
          <Skeleton height="86px" /><Skeleton height="86px" />
        </div>
      )}
      {loaded && <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
        <a href="/partner/reservations?f=today" className="pf-glass" style={{ ...cardShape, textDecoration: 'none', display: 'block' }}>
          <div style={eyebrow}>{L('today_res')}</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '27px', color: 'var(--pf-text)', marginTop: '6px' }}>
            {todayCount}
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', color: 'var(--pf-muted)', marginLeft: '6px' }}>
              {todayCount === 1 ? (locale === 'fr' ? 'réservation' : 'reservation') : (locale === 'fr' ? 'réservations' : 'reservations')}
            </span>
            <span style={{ color: 'var(--pf-gold)', fontSize: '13px', marginLeft: '8px' }}>→</span>
          </div>
        </a>
        <a href="/partner/reservations?f=next" className="pf-glass" style={{ ...cardShape, textDecoration: 'none', display: 'block' }}>
          <div style={eyebrow}>{L('next_res')}</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: nextRes ? '18px' : '27px', color: 'var(--pf-text)', marginTop: '6px', lineHeight: 1.25 }}>
            {nextRes && nextResWhen
              ? <>{formatDate(nextResWhen)} · {nextResWhen.toLocaleTimeString(locale === 'fr' ? 'fr-FR' : 'en-GB', { hour: '2-digit', minute: '2-digit' })}</>
              : '—'}
          </div>
          {nextRes && <div style={{ fontFamily: 'var(--font-sans)', fontSize: '10.5px', color: 'var(--pf-faint)', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nextRes.title} <span style={{ color: 'var(--pf-gold)' }}>→</span></div>}
        </a>
      </div>}

      {/* Metrics: balance leads full-width, the two smaller tiles sit beside it. */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 15rem), 1fr))', gap: '12px' }}>
        <div className="pf-glass" style={{ ...cardShape, gridColumn: '1 / -1', padding: '20px 22px', borderRadius: '18px', background: 'linear-gradient(150deg, rgba(190,154,86,0.12), var(--pf-card))', borderColor: 'var(--pf-border-strong)' }}>
          <div style={{ ...eyebrow, fontSize: '10.5px', letterSpacing: '0.16em' }}>{L('upcoming_earn')}</div>
          <div style={{ marginTop: '8px' }}><Money amount={formatAmount(upcomingEarn)} size={46} /></div>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', color: 'var(--pf-muted)', marginTop: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Wallet size={12} strokeWidth={1.75} style={{ color: 'var(--pf-gold)' }} />
            {L('upcoming_earn_note')}
          </div>
        </div>
        <StatTile label={L('balance')} amount={formatAmount(balance)} sub={next ? `${L('next_payout')} · ${formatDate(next.scheduledFor)}` : undefined} />
        <StatTile label={L('lifetime')} amount={formatAmount(lifetime)} />
      </div>

      {/* Performance this month (Jordan/ChatGPT #1): "How is my business doing
          on Palmera?" answered in one row. All derived from bookings. */}
      {loaded && (() => {
        const now = new Date()
        const thisMonth = (b: Booking) => { const d = toDate(b.scheduledFor); return !!d && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() }
        const monthAll = bookings.filter(thisMonth)
        const monthLive = monthAll.filter(b => ['confirmed', 'completed'].includes(b.status) || (b.status === 'pending' && b.confirmationType !== 'instant'))
        const monthRevenue = monthLive.reduce((s, b) => s + (b.payoutAmount || 0), 0)
        const completedAll = bookings.filter(b => b.status === 'completed').length
        const decided = bookings.filter(b => ['confirmed', 'completed', 'cancelled', 'declined', 'no_show'].includes(b.status)).length
        const cancelled = bookings.filter(b => ['cancelled', 'declined'].includes(b.status)).length
        const cancelRate = decided > 0 ? Math.round((cancelled / decided) * 100) : 0
        const valued = bookings.filter(b => (b.bookingTotal || 0) > 0 && ['confirmed', 'completed'].includes(b.status))
        const avgValue = valued.length ? Math.round(valued.reduce((s, b) => s + (b.bookingTotal || 0), 0) / valued.length) : 0
        const counts = new Map<string, number>()
        for (const b of bookings) if (['confirmed', 'completed'].includes(b.status)) counts.set(b.title, (counts.get(b.title) || 0) + 1)
        const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]
        const Tile = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
          <div className="pf-glass" style={{ ...cardShape, padding: '14px 16px' }}>
            <div style={{ ...eyebrow, fontSize: '9.5px' }}>{label}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '22px', color: 'var(--pf-text)', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</div>
            {sub && <div style={{ fontFamily: 'var(--font-sans)', fontSize: '10px', color: 'var(--pf-faint)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub}</div>}
          </div>
        )
        if (bookings.length === 0) return null
        return (
          <div style={{ marginTop: '12px' }}>
            <div style={{ ...eyebrow, margin: '0 0 8px 2px' }}>{L('perf_title')}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 9.5rem), 1fr))', gap: '10px' }}>
              <Tile label={L('perf_month_res')} value={String(monthLive.length)} />
              <Tile label={L('perf_month_rev')} value={formatAmount(monthRevenue)} sub="XOF" />
              <Tile label={L('perf_completed')} value={String(completedAll)} />
              <Tile label={L('perf_cancel')} value={`${cancelRate}%`} sub={decided > 0 ? `${cancelled}/${decided}` : undefined} />
              <Tile label={L('perf_avg')} value={formatAmount(avgValue)} sub="XOF" />
              <Tile label={L('perf_top')} value={top ? top[0] : '—'} sub={top ? `${top[1]} ${L('bookings_n')}` : undefined} />
              <Tile label={L('perf_upcoming')} value={String(upcomingAll.filter(b => b.status === 'confirmed').length)} />
              <Tile label={L('perf_pending')} value={String(pending.filter(b => !(b.confirmationType === 'instant')).length)} />
            </div>
          </div>
        )
      })()}

      <SectionTitle action={upcoming.length > 0 ? <a href="/partner/reservations" style={{ fontFamily: 'var(--font-sans)', fontSize: '11.5px', color: 'var(--pf-gold)' }}>{L('see_all')}</a> : undefined}>
        {L('upcoming')}
      </SectionTitle>

      {upcoming.length === 0 ? (
        <EmptyState icon={<Sparkles size={22} strokeWidth={1.75} />} title={L('home_empty_t')} body={L('home_empty_b')} />
      ) : (
        <div style={{ display: 'grid', gap: '10px' }}>
          {upcoming.map(b => <ReservationCard key={b.id} booking={b} locale={locale} compact />)}
        </div>
      )}
    </div>
  )
}
