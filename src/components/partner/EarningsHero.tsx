'use client'
// The partner's earnings headline (Jordan's logic, Stripe-style): the big
// number is NET EARNED on experiences DELIVERED in a period the partner
// picks; the next payout is always visible beside it. Shared by Home and
// Earnings so the two can never disagree.
import { useState, type ReactNode } from 'react'
import type { Booking } from '@/lib/schema'
import { formatAmount, formatDate, toDate, isDelivered, nextPayoutDate } from '@/lib/money'
import { Money, eyebrow } from './ui'
import { ChevronDown, Wallet } from 'lucide-react'
import { t, type Locale } from '@/app/partner/i18n'

export type HeroPeriod = 'today' | '7d' | '4w' | 'mtd' | 'qtd' | 'all'

export function periodStart(k: HeroPeriod): Date | null {
  const n = new Date(); const d0 = new Date(n.getFullYear(), n.getMonth(), n.getDate())
  if (k === 'today') return d0
  if (k === '7d') return new Date(d0.getTime() - 6 * 86400_000)
  if (k === '4w') return new Date(d0.getTime() - 27 * 86400_000)
  if (k === 'mtd') return new Date(n.getFullYear(), n.getMonth(), 1)
  if (k === 'qtd') return new Date(n.getFullYear(), Math.floor(n.getMonth() / 3) * 3, 1)
  return null
}

export default function EarningsHero({ bookings, locale, rate, nextPayout, available, children, size = 52 }: {
  bookings: Booking[]
  locale: Locale
  rate?: number | null
  /** Scheduled payout date if a batch exists; defaults to the 1st/16th rule. */
  nextPayout?: Date | null
  /** Net available for that payout (delivered, not yet paid). */
  available: number
  /** Extra stats rendered beside the headline. */
  children?: ReactNode
  size?: number
}) {
  const L = (k: string) => t(locale, k)
  const [period, setPeriod] = useState<HeroPeriod>('4w')
  const [open, setOpen] = useState(false)
  const from = periodStart(period)
  const inPeriod = bookings.filter(b => (b.payoutAmount || 0) > 0 && isDelivered(b) && (!from || ((toDate(b.scheduledFor)?.getTime() ?? 0) >= from.getTime())))
  const net = inPeriod.reduce((s, b) => s + (b.payoutAmount || 0), 0)
  const gross = inPeriod.reduce((s, b) => s + (b.bookingTotal || 0), 0)
  const PERIODS: { k: HeroPeriod; label: string }[] = [
    { k: 'today', label: L('hp_today') }, { k: '7d', label: L('hp_7d') }, { k: '4w', label: L('hp_4w') },
    { k: 'mtd', label: L('hp_mtd') }, { k: 'qtd', label: L('hp_qtd') }, { k: 'all', label: L('hp_all') },
  ]
  return (
    <div style={{ padding: '24px', borderRadius: '18px', background: 'linear-gradient(150deg, rgba(190,154,86,0.12), var(--pf-card))', border: '1px solid var(--pf-border-strong)', display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: '22px' }}>
      <div style={{ position: 'relative', minWidth: 0 }}>
        <button onClick={() => setOpen(o => !o)} aria-haspopup="listbox" aria-expanded={open}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'transparent', border: '1px solid var(--pf-border-strong)', borderRadius: '999px', padding: '6px 12px 6px 14px', cursor: 'pointer', color: 'var(--pf-gold)', fontFamily: 'var(--font-sans)', fontSize: '10.5px', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
          {L('hp_earnings')} · {PERIODS.find(p => p.k === period)?.label} <ChevronDown size={13} strokeWidth={1.75} />
        </button>
        {open && (
          <div role="listbox" onMouseLeave={() => setOpen(false)} style={{ position: 'absolute', top: '36px', left: 0, zIndex: 30, minWidth: '13rem', background: 'var(--pf-sheet)', border: '1px solid var(--pf-border-strong)', borderRadius: '14px', padding: '6px', boxShadow: '0 16px 36px rgba(0,0,0,0.35)' }}>
            {PERIODS.map(p => (
              <button key={p.k} role="option" aria-selected={period === p.k} onClick={() => { setPeriod(p.k); setOpen(false) }}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 12px', borderRadius: '9px', border: 'none', cursor: 'pointer', background: period === p.k ? 'var(--pf-gold-soft)' : 'transparent', color: period === p.k ? 'var(--pf-gold)' : 'var(--pf-text)', fontFamily: 'var(--font-sans)', fontSize: '13px' }}>
                {p.label}
              </button>
            ))}
          </div>
        )}
        <div style={{ marginTop: '10px' }}><Money amount={formatAmount(net)} size={size} /></div>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', color: 'var(--pf-muted)', marginTop: '8px', maxWidth: '26rem', lineHeight: 1.55 }}>
          {inPeriod.length} {L('bookings_n')} · {L('flow_gross').toLowerCase()} {formatAmount(gross)} XOF{rate != null ? ` · ${L('flow_commission').toLowerCase()} ${+(rate * 100).toFixed(2)}%` : ''}
        </div>
      </div>
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ width: '44px', height: '44px', borderRadius: '50%', border: '1px solid rgba(122,158,107,0.45)', display: 'grid', placeItems: 'center', color: 'var(--pf-success)', flexShrink: 0 }}><Wallet size={14} strokeWidth={1.75} /></span>
          <div>
            <div style={{ ...eyebrow, fontSize: '9.5px' }}>{L('next_payout')} · {formatDate(nextPayout ?? nextPayoutDate())}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '17px', color: 'var(--pf-text)', marginTop: '3px' }}>{formatAmount(available)} <span style={{ fontFamily: 'var(--font-sans)', fontSize: '10px', color: 'var(--pf-muted)' }}>XOF</span></div>
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}
