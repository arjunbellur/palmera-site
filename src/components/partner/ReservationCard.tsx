'use client'
import type { Booking, BookingStatus } from '@/lib/schema'
import { formatAmount, formatDate, toDate } from '@/lib/money'
import { t, type Locale } from '@/app/partner/i18n'
import { card, eyebrow, Chip, Money, GhostButton, type Tone } from './ui'

const STATUS: Record<BookingStatus, { key: string; tone: Tone }> = {
  pending: { key: 'f_pending', tone: 'gold' },
  confirmed: { key: 'f_confirmed', tone: 'green' },
  completed: { key: 'f_done', tone: 'neutral' },
  declined: { key: 'decline', tone: 'alert' },
  cancelled: { key: 'st_unpublished', tone: 'neutral' },
  no_show: { key: 'st_noshow', tone: 'alert' },
}

export default function ReservationCard({
  booking: b, locale, compact = false, onAccept, onDecline, onNoShow, onOpen, busy,
}: {
  booking: Booking
  locale: Locale
  compact?: boolean
  onAccept?: (b: Booking) => void
  onDecline?: (b: Booking) => void
  onNoShow?: (b: Booking) => void
  /** Open the detail view. The info area becomes clickable; buttons still win. */
  onOpen?: (b: Booking) => void
  busy?: boolean
}) {
  const L = (k: string) => t(locale, k)
  const s = STATUS[b.status] ?? STATUS.pending
  const when = toDate(b.scheduledFor)
  const time = when ? when.toLocaleTimeString(locale === 'fr' ? 'fr-FR' : 'en-GB', { hour: '2-digit', minute: '2-digit' }) : '—'
  const guestsLabel = `${b.guestCount} ${b.guestCount === 1 ? L('guest') : L('guests')}`
  const showActions = b.status === 'pending' && (onAccept || onDecline)
  // No-show is only claimable AFTER the reserved time — mirrors the rule.
  const showNoShow = !!onNoShow && b.status === 'confirmed' && !!when && when.getTime() < Date.now()

  return (
    <div style={{ ...card, padding: compact ? '14px 16px' : '16px 18px' }}>
      <div onClick={() => onOpen?.(b)} style={{ cursor: onOpen ? 'pointer' : 'default' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
        <span style={eyebrow}>{b.title ? '' : ''}{(b as unknown as { category?: string }).category || ''}</span>
        {b.confirmationType === 'instant' && <Chip tone="green">● {L('instant')}</Chip>}
        <Chip tone={s.tone}>{L(s.key)}</Chip>
      </div>

      <div style={{ fontFamily: 'var(--font-serif)', color: 'var(--pf-text)', fontSize: compact ? '14.5px' : '15.5px', marginBottom: '3px' }}>{b.title}</div>
      {!compact && b.customerName && (
        <div style={{ ...eyebrow, marginBottom: '8px' }}>{b.customerName}</div>
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

      {showActions && (
        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
          <GhostButton tone="alert" onClick={() => !busy && onDecline?.(b)}>{L('decline')}</GhostButton>
          <button onClick={() => !busy && onAccept?.(b)} disabled={busy}
            style={{ flex: 1, padding: '9px 16px', background: 'var(--pf-gold-deep)', border: 'none', borderRadius: '10px', color: '#ebe8db', fontFamily: 'var(--font-sans)', fontSize: '12.5px', letterSpacing: '0.04em', cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1 }}>
            {L('accept')}
          </button>
        </div>
      )}
      {showNoShow && (
        <div style={{ marginTop: '12px' }}>
          <GhostButton tone="alert" onClick={() => !busy && onNoShow?.(b)}>{L('mark_noshow')}</GhostButton>
        </div>
      )}
    </div>
  )
}
