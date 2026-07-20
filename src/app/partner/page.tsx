'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { usePartner } from './PartnerContext'
import { t } from './i18n'
import { getBookingsByCompany, getLedgerByProvider, getPayoutsByProvider } from '@/lib/firestore'
import type { Booking, LedgerEntry, Payout } from '@/lib/schema'
import { formatAmount, formatDate, toDate } from '@/lib/money'
import { ScreenHeader, StatTile, Money, EmptyState, SectionTitle, card, eyebrow, Chip } from '@/components/partner/ui'
import ReservationCard from '@/components/partner/ReservationCard'

export default function PartnerHome() {
  const { uid, company, provider, locale } = usePartner()
  const L = (k: string) => t(locale, k)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [ledger, setLedger] = useState<LedgerEntry[]>([])
  const [payouts, setPayouts] = useState<Payout[]>([])

  useEffect(() => {
    if (!uid || !company?.id) return
    ;(async () => {
      const [b, l, p] = await Promise.all([
        getBookingsByCompany(uid, company.id!), getLedgerByProvider(uid), getPayoutsByProvider(uid),
      ])
      setBookings(b)
      setLedger(l.filter(e => e.companyId === company.id))
      setPayouts(p.filter(x => x.companyId === company.id))
    })()
  }, [uid, company?.id])

  const balance = ledger.reduce((s, e) => s + (e.amount || 0), 0)
  const lifetime = payouts.filter(p => p.status === 'paid').reduce((s, p) => s + (p.netAmount || 0), 0)
  const next = payouts.find(p => p.status === 'scheduled' || p.status === 'processing')
  const pending = bookings.filter(b => b.status === 'pending')
  const upcoming = bookings
    .filter(b => ['pending', 'confirmed'].includes(b.status) && (toDate(b.scheduledFor)?.getTime() ?? 0) >= Date.now())
    .sort((a, b) => (toDate(a.scheduledFor)?.getTime() ?? 0) - (toDate(b.scheduledFor)?.getTime() ?? 0))
    .slice(0, 4)

  const firstName = (provider?.fullName || '').trim().split(' ')[0]

  return (
    <div className="pf-in">
      <ScreenHeader
        label={L('home_label')}
        title={firstName ? `${L('greeting')}, ${firstName}` : L('home_title')}
        intro={L('home_intro')}
      />

      {pending.length > 0 && (
        <a href="/partner/reservations" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', ...card, background: 'var(--pf-green-soft)', borderColor: 'var(--pf-border-strong)', textDecoration: 'none', marginBottom: '14px' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-serif)', color: 'var(--pf-text)', fontSize: '14.5px' }}>{L('action_title')}</div>
            <div style={{ ...eyebrow, marginTop: '5px' }}>{L('action_sub')}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Chip tone="gold">{pending.length}</Chip>
            <span style={{ color: 'var(--pf-gold)' }}>→</span>
          </div>
        </a>
      )}

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
