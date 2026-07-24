'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { usePartner } from './PartnerContext'
import { t } from './i18n'
import { getBookingsByCompany, getLedgerByProvider, getPayoutsByProvider, getExperiencesByCompany, getPayoutProfile } from '@/lib/firestore'
import type { Booking, Experience, LedgerEntry, Payout } from '@/lib/schema'
import { formatAmount, formatDate, toDate } from '@/lib/money'
import { ScreenHeader, StatTile, Money, EmptyState, SectionTitle, card, eyebrow } from '@/components/partner/ui'
import ReservationCard from '@/components/partner/ReservationCard'

export default function PartnerHome() {
  const { uid, company, provider, locale } = usePartner()
  const L = (k: string) => t(locale, k)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [ledger, setLedger] = useState<LedgerEntry[]>([])
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [experiences, setExperiences] = useState<Experience[]>([])
  const [hasPayoutProfile, setHasPayoutProfile] = useState(true)

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
    })()
  }, [uid, company?.id])

  const balance = ledger.reduce((s, e) => s + (e.amount || 0), 0)
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

      {/* Pending actions — Jordan: "what do I need to do next?" answered first.
          Every row is a link straight to where it gets fixed. */}
      {(() => {
        const incompleteListings = experiences.filter(e => (e.needsReview?.length ?? 0) > 0 || e.status === 'draft').length
        const items = [
          ...(pending.length > 0 ? [{ href: '/partner/reservations', label: `${pending.length} ${L('pa_pending_res')}`, count: pending.length }] : []),
          ...(incompleteListings > 0 ? [{ href: '/partner/listings', label: `${incompleteListings} ${L('pa_incomplete_listing')}`, count: incompleteListings }] : []),
          ...(!hasPayoutProfile ? [{ href: '/partner/settings', label: L('pa_missing_payout'), count: 0 }] : []),
        ]
        if (items.length === 0) return null
        return (
          <div style={{ ...card, background: 'var(--pf-green-soft)', borderColor: 'var(--pf-border-strong)', marginBottom: '14px', padding: '14px 16px' }}>
            <div style={{ ...eyebrow, marginBottom: '8px' }}>{L('pa_title')}</div>
            {items.map(it => (
              <a key={it.href + it.label} href={it.href} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '7px 0', textDecoration: 'none', borderTop: '1px solid var(--pf-border)' }}>
                <span style={{ fontFamily: 'var(--font-serif)', color: 'var(--pf-text)', fontSize: '13.5px' }}>{it.label}</span>
                <span style={{ color: 'var(--pf-gold)', fontSize: '13px' }}>→</span>
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
          { href: '/partner/settings', label: L('qa_company') },
          { href: 'mailto:palmeraexp@gmail.com', label: L('qa_support') },
        ].map(a => (
          <a key={a.label} href={a.href} style={{ padding: '8px 15px', borderRadius: '999px', border: '1px solid var(--pf-border-strong)', color: 'var(--pf-gold)', textDecoration: 'none', fontFamily: 'var(--font-sans)', fontSize: '11.5px', letterSpacing: '0.03em', background: 'transparent' }}>
            {a.label}
          </a>
        ))}
      </div>

      {/* Today first — a partner opening the app wants operations, then money. */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
        <div style={card}>
          <div style={eyebrow}>{L('today_res')}</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '27px', color: 'var(--pf-text)', marginTop: '6px' }}>
            {todayCount}
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', color: 'var(--pf-muted)', marginLeft: '6px' }}>
              {todayCount === 1 ? (locale === 'fr' ? 'réservation' : 'reservation') : (locale === 'fr' ? 'réservations' : 'reservations')}
            </span>
          </div>
        </div>
        <div style={card}>
          <div style={eyebrow}>{L('next_res')}</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: nextRes ? '18px' : '27px', color: 'var(--pf-text)', marginTop: '6px', lineHeight: 1.25 }}>
            {nextRes && nextResWhen
              ? <>{formatDate(nextResWhen)} · {nextResWhen.toLocaleTimeString(locale === 'fr' ? 'fr-FR' : 'en-GB', { hour: '2-digit', minute: '2-digit' })}</>
              : '—'}
          </div>
          {nextRes && <div style={{ fontFamily: 'var(--font-sans)', fontSize: '10.5px', color: 'var(--pf-faint)', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nextRes.title}</div>}
        </div>
      </div>

      {/* Metrics: balance leads full-width, the two smaller tiles sit beside it. */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 15rem), 1fr))', gap: '12px' }}>
        <div style={{ ...card, gridColumn: '1 / -1', padding: '20px 22px', borderRadius: '18px', background: 'linear-gradient(150deg, rgba(190,154,86,0.12), var(--pf-card))', borderColor: 'var(--pf-border-strong)' }}>
          <div style={{ ...eyebrow, fontSize: '10.5px', letterSpacing: '0.16em' }}>{L('balance')}</div>
          <div style={{ marginTop: '8px' }}><Money amount={formatAmount(balance)} size={46} /></div>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', color: 'var(--pf-muted)', marginTop: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: 'var(--pf-gold)' }}>◆</span>
            {L('next_payout')} · {next ? formatDate(next.scheduledFor) : '—'}
          </div>
        </div>
        <StatTile label={L('next_amt')} amount={formatAmount(next?.netAmount ?? 0)} />
        <StatTile label={L('lifetime')} amount={formatAmount(lifetime)} />
      </div>

      <SectionTitle action={upcoming.length > 0 ? <a href="/partner/reservations" style={{ fontFamily: 'var(--font-sans)', fontSize: '11.5px', color: 'var(--pf-gold)' }}>{L('see_all')}</a> : undefined}>
        {L('upcoming')}
      </SectionTitle>

      {upcoming.length === 0 ? (
        <EmptyState icon="✦" title={L('home_empty_t')} body={L('home_empty_b')} />
      ) : (
        <div style={{ display: 'grid', gap: '10px' }}>
          {upcoming.map(b => <ReservationCard key={b.id} booking={b} locale={locale} compact />)}
        </div>
      )}
    </div>
  )
}
