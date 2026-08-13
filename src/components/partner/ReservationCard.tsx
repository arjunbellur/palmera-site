'use client'
import type { Booking, BookingStatus } from '@/lib/schema'
import { formatAmount, formatDate, toDate } from '@/lib/money'
import { t, type Locale } from '@/app/partner/i18n'
import { cardShape, eyebrow, Chip, Money, type Tone } from './ui'

const STATUS: Record<BookingStatus, { key: string; tone: Tone }> = {
  pending: { key: 'f_pending', tone: 'gold' },
  confirmed: { key: 'f_confirmed', tone: 'green' },
  completed: { key: 'f_done', tone: 'neutral' },
  declined: { key: 'decline', tone: 'alert' },
  cancelled: { key: 'st_cancelled', tone: 'alert' },
  no_show: { key: 'st_noshow', tone: 'alert' },
}

// Progressive disclosure (Airbnb): a card shows AT MOST one action — the
// primary one for its state (pending → Confirm). Decline, no-show and
// everything rarer live in the detail drawer, reached by tapping the card.
export default function ReservationCard({
  booking: b, locale, compact = false, onAccept, onOpen, busy,
}: {
  booking: Booking
  locale: Locale
  compact?: boolean
  onAccept?: (b: Booking) => void
  /** Open the detail view. The info area becomes clickable; buttons still win. */
  onOpen?: (b: Booking) => void
  busy?: boolean
}) {
  const L = (k: string) => t(locale, k)
  const s = STATUS[b.status] ?? STATUS.pending
  const when = toDate(b.scheduledFor)
  const time = when ? when.toLocaleTimeString(locale === 'fr' ? 'fr-FR' : 'en-GB', { hour: '2-digit', minute: '2-digit' }) : '—'
  const guestsLabel = `${b.guestCount} ${b.guestCount === 1 ? L('guest') : L('guests')}`
  // An INSTANT listing that's still pending is waiting on the guest's payment,
  // not on the partner (free instant bookings confirm on creation). Don't ask
  // them to approve what the checkout will confirm by itself.
  const awaitingPayment = b.status === 'pending' && b.confirmationType === 'instant'
  const showPrimary = b.status === 'pending' && !awaitingPayment && !!onAccept

  return (
    <div className="pf-glass" style={{ ...cardShape, padding: compact ? '14px 16px' : '16px 18px' }}>
      <div onClick={() => onOpen?.(b)} style={{ cursor: onOpen ? 'pointer' : 'default' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
        <span style={eyebrow}>{b.title ? '' : ''}{(b as unknown as { category?: string }).category || ''}</span>
        {b.confirmationType === 'instant' && <Chip tone="green">● {L('instant')}</Chip>}
        <Chip tone={awaitingPayment ? 'gold' : s.tone}>{awaitingPayment ? `◷ ${L('await_pay')}` : L(s.key)}</Chip>
      </div>

      <div style={{ fontFamily: 'var(--font-serif)', color: 'var(--pf-text)', fontSize: compact ? '14.5px' : '15.5px', marginBottom: '3px' }}>{b.title}</div>
      {!compact && b.customerName && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '8px' }}>
          <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--pf-green-soft)', color: 'var(--pf-gold)', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-display)', fontSize: '11px', flexShrink: 0 }}>{b.customerName.trim().charAt(0).toUpperCase()}</span>
          <span style={eyebrow}>{b.customerName}</span>
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontFamily: 'var(--font-sans)', fontSize: '11.5px', color: 'var(--pf-muted)', marginTop: '6px' }}>
        <span>▤ {formatDate(b.scheduledFor)}</span>
        <span>◷ {time}</span>
        <span>◍ {guestsLabel}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--pf-border)' }}>
        <div>
          <div style={eyebrow}>{L('you_earn')}</div>
          <div style={{ marginTop: '4px' }}><Money amount={formatAmount(b.payoutAmount)} size={compact ? 22 : 26} currency={b.currency || 'XOF'} /></div>
        </div>
        {!compact && (
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: '10.5px', color: 'var(--pf-faint)', textAlign: 'right', lineHeight: 1.7 }}>
            <div>{L('total')} {formatAmount(b.bookingTotal)}</div>
            <div>{L('commission')} −{formatAmount(b.commissionAmount)}</div>
          </div>
        )}
      </div>
      </div>

      {awaitingPayment && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '12px' }}>
          <span style={{ flex: 1, fontFamily: 'var(--font-sans)', fontSize: '10.5px', color: 'var(--pf-faint)', lineHeight: 1.45 }}>{L('await_pay_note')}</span>
          <button onClick={() => onOpen?.(b)} title={L('more_options')}
            style={{ padding: '9px 13px', background: 'transparent', border: '1px solid var(--pf-border)', borderRadius: '10px', color: 'var(--pf-faint)', fontFamily: 'var(--font-sans)', fontSize: '12.5px', cursor: 'pointer', flexShrink: 0 }}>
            ⋯
          </button>
        </div>
      )}
      {showPrimary && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '12px' }}>
          <button onClick={() => !busy && onAccept?.(b)} disabled={busy}
            style={{ flex: 1, padding: '9px 16px', background: 'var(--pf-gold-deep)', border: 'none', borderRadius: '10px', color: '#ebe8db', fontFamily: 'var(--font-sans)', fontSize: '12.5px', letterSpacing: '0.04em', cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1, boxShadow: '0 0 18px rgba(190,154,86,0.28)' }}>
            {L('accept')}
          </button>
          <button onClick={() => onOpen?.(b)} title={L('more_options')}
            style={{ padding: '9px 13px', background: 'transparent', border: '1px solid var(--pf-border)', borderRadius: '10px', color: 'var(--pf-faint)', fontFamily: 'var(--font-sans)', fontSize: '12.5px', cursor: 'pointer' }}>
            ⋯
          </button>
        </div>
      )}
    </div>
  )
}
