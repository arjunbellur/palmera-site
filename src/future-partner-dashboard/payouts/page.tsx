'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthChange } from '@/lib/auth'
import { getLedgerByProvider, getPayoutsByProvider } from '@/lib/firestore'
import type { LedgerEntry, Payout, PayoutStatus } from '@/lib/schema'
import { formatXOF, formatDate }  from '@/lib/money'

const PAYOUT_STATUS: Record<PayoutStatus, { label: string; color: string }> = {
  scheduled: { label: 'Scheduled', color: '#be9a56' },
  processing: { label: 'Processing', color: '#be9a56' },
  paid: { label: 'Paid', color: '#7a9e6b' },
  failed: { label: 'Failed', color: '#c47c7c' },
}

export default function PayoutsPage() {
  const router = useRouter()
  const [ledger, setLedger] = useState<LedgerEntry[]>([])
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthChange(async user => {
      if (!user) { router.replace('/dashboard'); return }
      const [l, p] = await Promise.all([getLedgerByProvider(user.uid), getPayoutsByProvider(user.uid)])
      setLedger(l); setPayouts(p)
      setLoading(false)
    })
    return () => unsub()
  }, [router])

  if (loading) return null

  const balance = ledger.reduce((s, e) => s + (e.amount || 0), 0)
  const currency = ledger[0]?.currency || payouts[0]?.currency || 'XOF'
  const lifetimePaid = payouts.filter(p => p.status === 'paid').reduce((s, p) => s + (p.netAmount || 0), 0)
  const next = payouts.find(p => p.status === 'scheduled' || p.status === 'processing')

  const eyebrow: React.CSSProperties = { fontFamily: 'var(--font-sans)', color: 'rgba(190,154,86,0.8)', fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 0.5rem' }
  const card: React.CSSProperties = { background: 'var(--db-bg-card)', border: '1px solid var(--db-border-subtle)', borderRadius: '0.625rem', padding: '1.25rem 1.375rem' }
  const statLabel: React.CSSProperties = { fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', color: 'var(--db-text-faint)', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 0.375rem' }
  const statValue: React.CSSProperties = { fontFamily: 'var(--font-display)', color: 'var(--db-text)', fontSize: '1.5rem', fontWeight: 400, letterSpacing: '0.02em', margin: 0 }
  const sectionH: React.CSSProperties = { fontFamily: 'var(--font-serif)', color: 'var(--db-text)', fontSize: '1.0625rem', fontWeight: 400, margin: '2rem 0 1rem' }

  return (
    <div>
      <div style={{ marginBottom: '1.75rem' }}>
        <p style={eyebrow}>Payouts</p>
        <h1 style={{ fontFamily: 'var(--font-display)', color: 'var(--db-text)', fontSize: 'clamp(1.5rem, 3vw, 1.875rem)', fontWeight: 400, letterSpacing: '0.06em', margin: '0 0 0.5rem' }}>
          Earnings &amp; payouts
        </h1>
        <p style={{ fontFamily: 'var(--font-serif)', color: 'var(--db-text-muted)', fontSize: '0.9375rem', margin: 0 }}>
          What you&apos;ve earned from completed bookings, and the biweekly payouts Palmera sends you.
        </p>
      </div>

      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 12rem), 1fr))', gap: '1rem' }}>
        <div style={card}>
          <p style={statLabel}>Current balance</p>
          <p style={statValue}>{formatXOF(balance, currency)}</p>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', color: 'var(--db-text-ghost)', margin: '0.375rem 0 0' }}>owed to you, not yet paid</p>
        </div>
        <div style={card}>
          <p style={statLabel}>Next payout</p>
          <p style={statValue}>{next ? formatXOF(next.netAmount, next.currency) : '—'}</p>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', color: 'var(--db-text-ghost)', margin: '0.375rem 0 0' }}>{next ? formatDate(next.scheduledFor) : 'none scheduled'}</p>
        </div>
        <div style={card}>
          <p style={statLabel}>Paid to date</p>
          <p style={statValue}>{formatXOF(lifetimePaid, currency)}</p>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', color: 'var(--db-text-ghost)', margin: '0.375rem 0 0' }}>across {payouts.filter(p => p.status === 'paid').length} payout{payouts.filter(p => p.status === 'paid').length === 1 ? '' : 's'}</p>
        </div>
      </div>

      {/* Payout history */}
      <h2 style={sectionH}>Payout history</h2>
      {payouts.length === 0 ? (
        <div style={{ ...card, borderStyle: 'dashed', textAlign: 'center', padding: '2.25rem 2rem' }}>
          <p style={{ fontFamily: 'var(--font-serif)', color: 'var(--db-text-faint)', fontSize: '1rem', margin: '0 0 0.375rem' }}>No payouts yet</p>
          <p style={{ fontFamily: 'var(--font-sans)', color: 'var(--db-text-ghost)', fontSize: '0.8125rem', margin: 0, maxWidth: '26rem', marginInline: 'auto', lineHeight: 1.6 }}>
            Palmera pays out every two weeks. Once your first completed bookings are settled, each payout will appear here with its amount and status.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {payouts.map(p => {
            const s = PAYOUT_STATUS[p.status]
            return (
              <div key={p.id} style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-sans)', color: 'var(--db-text)', fontSize: '0.8125rem', marginBottom: '0.25rem' }}>
                    {formatDate(p.periodStart)} – {formatDate(p.periodEnd)}
                  </div>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', color: 'var(--db-text-ghost)' }}>
                    {p.status === 'paid' && p.paidAt ? `Paid ${formatDate(p.paidAt)}` : `Scheduled ${formatDate(p.scheduledFor)}`}
                    {p.clawbackTotal > 0 && ` · −${formatXOF(p.clawbackTotal, p.currency)} clawback`}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                  <span style={{ fontSize: '0.625rem', color: s.color, fontFamily: 'var(--font-sans)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{s.label}</span>
                  <span style={{ fontFamily: 'var(--font-sans)', color: 'var(--db-text)', fontSize: '0.9375rem', fontWeight: 600 }}>{formatXOF(p.netAmount, p.currency)}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Ledger / activity */}
      <h2 style={sectionH}>Activity</h2>
      {ledger.length === 0 ? (
        <div style={{ ...card, borderStyle: 'dashed', textAlign: 'center', padding: '2.25rem 2rem' }}>
          <p style={{ fontFamily: 'var(--font-serif)', color: 'var(--db-text-faint)', fontSize: '1rem', margin: '0 0 0.375rem' }}>No activity yet</p>
          <p style={{ fontFamily: 'var(--font-sans)', color: 'var(--db-text-ghost)', fontSize: '0.8125rem', margin: 0 }}>
            Every commission you earn and every payout you receive will be itemized here.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {ledger.map(e => (
            <div key={e.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: '0.75rem 0', borderBottom: '1px solid var(--db-border-subtle)' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-sans)', color: 'var(--db-text)', fontSize: '0.8125rem' }}>{e.description}</div>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', color: 'var(--db-text-ghost)' }}>{formatDate(e.createdAt)}</div>
              </div>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', fontWeight: 600, color: e.amount >= 0 ? '#7a9e6b' : '#c47c7c' }}>
                {e.amount >= 0 ? '+' : '−'}{formatXOF(Math.abs(e.amount), e.currency)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
