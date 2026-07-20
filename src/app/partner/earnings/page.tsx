'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { usePartner } from '../PartnerContext'
import { t } from '../i18n'
import { getLedgerByProvider, getPayoutsByProvider } from '@/lib/firestore'
import type { LedgerEntry, Payout, PayoutStatus } from '@/lib/schema'
import { formatAmount, formatDate, toDate } from '@/lib/money'
import { ScreenHeader, StatTile, Money, EmptyState, SectionTitle, card, eyebrow, Chip, type Tone } from '@/components/partner/ui'

const PAYOUT_TONE: Record<PayoutStatus, Tone> = { scheduled: 'gold', processing: 'gold', paid: 'green', failed: 'alert' }

export default function EarningsScreen() {
  const { uid, company, locale } = usePartner()
  const L = (k: string) => t(locale, k)
  const [ledger, setLedger] = useState<LedgerEntry[]>([])
  const [payouts, setPayouts] = useState<Payout[]>([])

  useEffect(() => {
    if (!uid || !company?.id) return
    ;(async () => {
      const [l, p] = await Promise.all([getLedgerByProvider(uid), getPayoutsByProvider(uid)])
      setLedger(l.filter(e => e.companyId === company.id))
      setPayouts(p.filter(x => x.companyId === company.id))
    })()
  }, [uid, company?.id])

  const balance = ledger.reduce((s, e) => s + (e.amount || 0), 0)
  const lifetime = payouts.filter(p => p.status === 'paid').reduce((s, p) => s + (p.netAmount || 0), 0)
  const next = payouts.find(p => p.status === 'scheduled' || p.status === 'processing')

  // Commission window: 12 months from this company's activation (per the BPA).
  const activated = toDate(company?.activatedAt)
  const ends = activated ? new Date(activated.getFullYear() + 1, activated.getMonth(), activated.getDate()) : null
  const monthsLeft = ends ? Math.max(0, Math.ceil((ends.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30.44))) : null

  return (
    <div>
      <ScreenHeader label={L('earn_label')} title={L('earn_title')} intro={L('earn_intro')} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 14rem), 1fr))', gap: '12px' }}>
        <div style={{ ...card, gridColumn: '1 / -1', padding: '20px 22px', borderRadius: '18px' }}>
          <div style={{ ...eyebrow, fontSize: '10.5px', letterSpacing: '0.16em' }}>{L('balance')}</div>
          <div style={{ marginTop: '8px' }}><Money amount={formatAmount(balance)} size={46} /></div>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', color: 'var(--pf-muted)', marginTop: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: 'var(--pf-gold)' }}>◆</span>{L('next_payout')} · {next ? formatDate(next.scheduledFor) : '—'}
          </div>
        </div>
        <StatTile label={L('next_amt')} amount={formatAmount(next?.netAmount ?? 0)} />
        <StatTile label={L('lifetime')} amount={formatAmount(lifetime)} />
      </div>

      {/* Commission window — real, computed from the company's activation date. */}
      {activated && (
        <div style={{ ...card, marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap' }}>
          <div>
            <div style={eyebrow}>{L('comm_window')}</div>
            <div style={{ fontFamily: 'var(--font-serif)', color: 'var(--pf-text)', fontSize: '14px', marginTop: '6px' }}>
              10% · {monthsLeft} {locale === 'fr' ? 'mois' : 'months'} {L('months_left')}
            </div>
          </div>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', color: 'var(--pf-faint)' }}>
            {L('window_ends')} {ends ? formatDate(ends) : '—'}
          </div>
        </div>
      )}

      <SectionTitle>{L('payout_hist')}</SectionTitle>
      {payouts.length === 0 ? (
        <EmptyState icon="◆" title={L('pay_empty_t')} body={L('pay_empty_b')} />
      ) : (
        <div style={{ display: 'grid', gap: '10px' }}>
          {payouts.map(p => (
            <div key={p.id} style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-sans)', color: 'var(--pf-text)', fontSize: '12.5px' }}>
                  {formatDate(p.periodStart)} – {formatDate(p.periodEnd)}
                </div>
                <div style={{ ...eyebrow, marginTop: '5px' }}>
                  {p.status === 'paid' && p.paidAt ? formatDate(p.paidAt) : formatDate(p.scheduledFor)}
                  {p.clawbackTotal > 0 && ` · −${formatAmount(p.clawbackTotal)}`}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Chip tone={PAYOUT_TONE[p.status]}>{p.status}</Chip>
                <Money amount={formatAmount(p.netAmount)} size={20} currency={p.currency || 'XOF'} />
              </div>
            </div>
          ))}
        </div>
      )}

      <SectionTitle>{L('ledger')}</SectionTitle>
      {ledger.length === 0 ? (
        <EmptyState icon="◷" title={L('ledger_empty_t')} body={L('ledger_empty_b')} />
      ) : (
        <div style={card}>
          {ledger.map((e, i) => (
            <div key={e.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '11px 0', borderTop: i === 0 ? 'none' : '1px solid var(--pf-border)' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-serif)', color: 'var(--pf-text)', fontSize: '13px' }}>{e.description}</div>
                <div style={{ ...eyebrow, marginTop: '4px' }}>{formatDate(e.createdAt)}</div>
              </div>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: e.amount >= 0 ? 'var(--pf-success)' : 'var(--pf-alert)' }}>
                {e.amount >= 0 ? '+' : '−'}{formatAmount(Math.abs(e.amount))}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
