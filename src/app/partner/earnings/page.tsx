'use client'
export const dynamic = 'force-dynamic'
// Earnings — ported faithfully from the Claude Design mockup: gradient hero
// card with circled stat icons, a monthly bar chart and per-experience revenue
// pills (real data, shown once it exists), and list-card payout/ledger rows.
import { useEffect, useState } from 'react'
import { usePartner } from '../PartnerContext'
import { t } from '../i18n'
import { getBookingsByCompany, getLedgerByProvider, getPayoutsByProvider } from '@/lib/firestore'
import type { Booking, LedgerEntry, LedgerEntryType, Payout, PayoutStatus } from '@/lib/schema'
import { formatAmount, formatDate, toDate } from '@/lib/money'
import { ScreenHeader, Money, EmptyState, SectionTitle, Skeleton, card, eyebrow } from '@/components/partner/ui'

const PAYOUT_COLOR: Record<PayoutStatus, string> = {
  scheduled: 'var(--pf-gold)', processing: 'var(--pf-gold)', paid: 'var(--pf-success)', failed: 'var(--pf-alert)',
}
const LEDGER_DOT: Record<LedgerEntryType, string> = {
  commission_earned: 'var(--pf-success)', payout: 'var(--pf-gold)',
  refund: 'var(--pf-alert)', clawback: 'var(--pf-alert)', adjustment: 'var(--pf-faint)',
}

/** Circled icon + tiny label + serif value — the hero card's stat idiom. */
function CircleStat({ icon, label, value, tone = 'var(--pf-gold)' }: { icon: string; label: string; value: React.ReactNode; tone?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <span style={{ width: '34px', height: '34px', borderRadius: '50%', border: '1px solid var(--pf-border-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: tone, fontSize: '13px', flexShrink: 0 }}>{icon}</span>
      <div>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--pf-faint)' }}>{label}</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '16px', color: 'var(--pf-text)', marginTop: '2px' }}>{value}</div>
      </div>
    </div>
  )
}

export default function EarningsScreen() {
  const { uid, company, locale } = usePartner()
  const L = (k: string) => t(locale, k)
  const [ledger, setLedger] = useState<LedgerEntry[]>([])
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [period, setPeriod] = useState<'all' | 'month' | 'last' | '30'>('all')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!uid || !company?.id) return
    ;(async () => {
      const [l, p, b] = await Promise.all([
        getLedgerByProvider(uid), getPayoutsByProvider(uid), getBookingsByCompany(uid, company.id!),
      ])
      setLedger(l.filter(e => e.companyId === company.id))
      setPayouts(p.filter(x => x.companyId === company.id))
      setBookings(b)
      setLoaded(true)
    })()
  }, [uid, company?.id])

  const balance = ledger.reduce((s, e) => s + (e.amount || 0), 0)
  const lifetime = payouts.filter(p => p.status === 'paid').reduce((s, p) => s + (p.netAmount || 0), 0)
  const next = payouts.find(p => p.status === 'scheduled' || p.status === 'processing')

  const activated = toDate(company?.activatedAt)
  const ends = activated ? new Date(activated.getFullYear() + 1, activated.getMonth(), activated.getDate()) : null
  const monthsLeft = ends ? Math.max(0, Math.ceil((ends.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30.44))) : null

  // ── Period filter (applies to the itemized Activity list only — balances
  //    and the payout breakdown are always all-time; a partial balance lies). ──
  const inPeriod = (e: LedgerEntry) => {
    if (period === 'all') return true
    const d = toDate(e.createdAt); if (!d) return false
    const now = new Date()
    if (period === '30') return now.getTime() - d.getTime() <= 30 * 86400_000
    if (period === 'month') return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
    const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    return d.getFullYear() === lm.getFullYear() && d.getMonth() === lm.getMonth()
  }
  const shownLedger = ledger.filter(inPeriod)

  // ── Next-payout breakdown: ledger money not yet rolled into a batch ──
  const unsettled = ledger.filter(e => !e.payoutId)
  const pendingBookings = unsettled.filter(e => e.type === 'commission_earned' && e.bookingId).length
  const pendingGross = unsettled.filter(e => e.type === 'commission_earned' && e.amount > 0).reduce((s, e) => s + e.amount, 0)
  const pendingDeductions = unsettled.filter(e => e.amount < 0).reduce((s, e) => s + e.amount, 0)
  const pendingNet = pendingGross + pendingDeductions

  const downloadCsv = () => {
    const header = 'date,type,description,amount,currency,bookingId,payoutId'
    const rows = ledger.map(e => {
      const d = toDate(e.createdAt)
      const cells = [d ? d.toISOString().slice(0, 10) : '', e.type, `"${(e.description || '').replace(/"/g, '""')}"`, e.amount, e.currency || 'XOF', e.bookingId || '', e.payoutId || '']
      return cells.join(',')
    })
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `palmera-statement-${(company?.name || 'company').replace(/\W+/g, '-').toLowerCase()}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  // ── Monthly earnings, last 6 months, from commission credits ──
  const now = new Date()
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    return { key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-GB', { month: 'short' }) }
  })
  const monthSums = new Map(months.map(m => [m.key, 0]))
  for (const e of ledger) {
    if (e.type !== 'commission_earned' || e.amount <= 0) continue
    const d = toDate(e.createdAt); if (!d) continue
    const key = `${d.getFullYear()}-${d.getMonth()}`
    if (monthSums.has(key)) monthSums.set(key, (monthSums.get(key) || 0) + e.amount)
  }
  const chart = months.map(m => ({ ...m, val: monthSums.get(m.key) || 0 }))
  const chartMax = Math.max(...chart.map(c => c.val))

  // ── Earnings per experience, from completed bookings ──
  const byTitle = new Map<string, number>()
  bookings.filter(b => b.status === 'completed').forEach(b => byTitle.set(b.title, (byTitle.get(b.title) || 0) + (b.payoutAmount || 0)))
  const revBars = [...byTitle.entries()].map(([label, val]) => ({ label, val })).sort((a, b) => b.val - a.val).slice(0, 4)
  const revMax = Math.max(...revBars.map(r => r.val), 1)
  const hasData = chartMax > 0 || revBars.length > 0

  const h3: React.CSSProperties = { margin: '0 0 12px', fontFamily: 'var(--font-display)', fontSize: '1.125rem', fontWeight: 400, letterSpacing: '0.03em', color: 'var(--pf-head)' }
  const listCard: React.CSSProperties = { borderRadius: '16px', background: 'var(--pf-card)', border: '1px solid var(--pf-border)', overflow: 'hidden' }

  return (
    <div className="pf-in">
      <ScreenHeader label={L('earn_label')} title={L('earn_title')} intro={L('earn_intro')} />

      {!loaded && <><Skeleton height="120px" style={{ marginBottom: '12px' }} /><Skeleton height="220px" /></>}
      {loaded && <>
      {/* Hero: gradient balance card with circled stats. */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 14rem), 1fr))', gap: '12px' }}>
        <div style={{ gridColumn: '1 / -1', padding: '24px', borderRadius: '18px', background: 'linear-gradient(150deg, rgba(190,154,86,0.12), var(--pf-card))', border: '1px solid var(--pf-border-strong)', display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: '22px' }}>
          <div>
            <div style={{ ...eyebrow, fontSize: '10.5px', letterSpacing: '0.16em' }}>{L('balance')}</div>
            <div style={{ marginTop: '8px' }}><Money amount={formatAmount(balance)} size={52} /></div>
          </div>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            <CircleStat icon="◆" label={L('next_payout')} value={next ? formatDate(next.scheduledFor) : '—'} />
            <CircleStat icon="↑" label={L('next_amt')} value={<>{formatAmount(next?.netAmount ?? 0)} <span style={{ fontFamily: 'var(--font-sans)', fontSize: '10px', color: 'var(--pf-muted)' }}>XOF</span></>} />
            <CircleStat icon="✓" label={L('status_lbl')} value={company?.active ? (locale === 'fr' ? 'Actif' : 'Active') : '—'} tone="var(--pf-success)" />
          </div>
        </div>

        <div style={card}>
          <div style={eyebrow}>{L('lifetime')}</div>
          <div style={{ marginTop: '6px' }}><Money amount={formatAmount(lifetime)} size={26} /></div>
        </div>
        <div style={card}>
          <div style={eyebrow}>{L('comm_window')}</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '26px', color: 'var(--pf-text)', marginTop: '6px' }}>
            10%{monthsLeft != null && <span style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', color: 'var(--pf-muted)', marginLeft: '6px' }}>{monthsLeft} {locale === 'fr' ? 'mois' : 'mo'} {L('months_left')}</span>}
          </div>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: '10px', color: 'var(--pf-faint)', marginTop: '5px' }}>
            {ends ? `${L('window_ends')} ${formatDate(ends)}` : locale === 'fr' ? 'Pas encore activée' : 'Not activated yet'}
          </div>
        </div>
      </div>

      {/* Next-payout breakdown — Jordan: transparency on gross vs deductions. */}
      {unsettled.length > 0 && (
        <div style={{ ...card, marginTop: '12px' }}>
          <div style={{ ...eyebrow, marginBottom: '10px' }}>{L('breakdown_title')}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--pf-border)', fontFamily: 'var(--font-sans)', fontSize: '12.5px' }}>
            <span style={{ color: 'var(--pf-muted)' }}>{L('gross')}{pendingBookings > 0 && ` · ${pendingBookings} ${L('bookings_n')}`}</span>
            <span style={{ color: 'var(--pf-success)' }}>+{formatAmount(pendingGross)}</span>
          </div>
          {pendingDeductions !== 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--pf-border)', fontFamily: 'var(--font-sans)', fontSize: '12.5px' }}>
              <span style={{ color: 'var(--pf-muted)' }}>{L('refunds')}</span>
              <span style={{ color: 'var(--pf-alert)' }}>−{formatAmount(Math.abs(pendingDeductions))}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '9px 0 0' }}>
            <span style={{ ...eyebrow }}>{L('net_due')}</span>
            <Money amount={formatAmount(pendingNet)} size={22} />
          </div>
        </div>
      )}

      {/* Charts — real data only; before the first booking the empty states below carry. */}
      {hasData && (
        <>
          {chartMax > 0 && (
            <div style={{ marginTop: '22px' }}>
              <h3 style={h3}>{L('chart_title')}</h3>
              <div style={{ padding: '20px 18px 14px', borderRadius: '18px', background: 'var(--pf-card)', border: '1px solid var(--pf-border)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px' }}>
                  {chart.map(c => (
                    <div key={c.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '7px' }}>
                      {c.val > 0 && <span style={{ fontFamily: 'var(--font-sans)', fontSize: '9.5px', color: 'var(--pf-gold)' }}>{formatAmount(c.val)}</span>}
                      <div style={{ height: '96px', width: '100%', maxWidth: '46px', display: 'flex', alignItems: 'flex-end' }}>
                        <div className="pf-bar" style={{ width: '100%', height: `${Math.max((c.val / chartMax) * 100, c.val > 0 ? 6 : 2)}%`, borderRadius: '9px 9px 4px 4px', background: c.val > 0 ? 'linear-gradient(180deg, var(--pf-gold), var(--pf-gold-deep))' : 'var(--pf-border)' }} />
                      </div>
                      <span style={{ fontFamily: 'var(--font-sans)', fontSize: '8.5px', letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--pf-faint)', whiteSpace: 'nowrap' }}>{c.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {revBars.length > 0 && (
            <div style={{ marginTop: '22px' }}>
              <h3 style={h3}>{L('rev_title')}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {revBars.map(b => (
                  <div key={b.label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '7px' }}>
                      <span style={{ fontFamily: 'var(--font-serif)', fontSize: '14.5px', color: 'var(--pf-text)' }}>{b.label}</span>
                      <span style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', color: 'var(--pf-gold)' }}>{formatAmount(b.val)} XOF</span>
                    </div>
                    <div style={{ height: '30px', borderRadius: '20px', background: 'var(--pf-card)', border: '1px solid var(--pf-border)', overflow: 'hidden' }}>
                      <div className="pf-pill" style={{ height: '100%', width: `${Math.max((b.val / revMax) * 100, 4)}%`, borderRadius: '20px', background: 'linear-gradient(90deg, var(--pf-gold-deep), var(--pf-gold))' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <SectionTitle>{L('payout_hist')}</SectionTitle>
      {payouts.length === 0 ? (
        <EmptyState icon="◆" title={L('pay_empty_t')} body={L('pay_empty_b')} chip={L('pay_empty_chip')} />
      ) : (
        <div style={listCard}>
          {payouts.map((p, i) => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '15px 18px', borderBottom: i < payouts.length - 1 ? '1px solid var(--pf-border)' : 'none' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: '14.5px', color: 'var(--pf-text)' }}>
                  {formatDate(p.periodStart)} – {formatDate(p.periodEnd)}
                </div>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', color: PAYOUT_COLOR[p.status], marginTop: '3px' }}>
                  {L(({ scheduled: 'ps_scheduled', processing: 'ps_processing', paid: 'ps_paid', failed: 'ps_failed' } as const)[p.status])}{p.clawbackTotal > 0 && ` · −${formatAmount(p.clawbackTotal)}`}
                </div>
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '20px', color: 'var(--pf-text)' }}>
                {formatAmount(p.netAmount)}<span style={{ fontFamily: 'var(--font-sans)', fontSize: '10px', color: 'var(--pf-muted)', marginLeft: '4px' }}>XOF</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <SectionTitle action={ledger.length > 0 ? (
        <button onClick={downloadCsv} style={{ background: 'transparent', border: '1px solid var(--pf-border-strong)', borderRadius: '10px', padding: '7px 13px', color: 'var(--pf-gold)', fontFamily: 'var(--font-sans)', fontSize: '11px', letterSpacing: '0.04em', cursor: 'pointer' }}>
          ↓ {L('download_csv')}
        </button>
      ) : undefined}>{L('ledger')}</SectionTitle>
      {ledger.length > 0 && (
        <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap', marginBottom: '10px' }}>
          {([['all', 'ef_all'], ['month', 'ef_month'], ['last', 'ef_last'], ['30', 'ef_30']] as const).map(([k, label]) => (
            <button key={k} onClick={() => setPeriod(k)}
              style={{ padding: '6px 12px', borderRadius: '999px', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: '11px', border: `1px solid ${period === k ? 'var(--pf-border-strong)' : 'var(--pf-border)'}`, background: period === k ? 'var(--pf-card)' : 'transparent', color: period === k ? 'var(--pf-gold)' : 'var(--pf-faint)' }}>
              {L(label)}
            </button>
          ))}
        </div>
      )}
      {ledger.length === 0 ? (
        <EmptyState icon="◷" title={L('ledger_empty_t')} body={L('ledger_empty_b')} />
      ) : shownLedger.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', fontFamily: 'var(--font-sans)', fontSize: '12px', color: 'var(--pf-faint)' }}>—</div>
      ) : (
        <div style={listCard}>
          {shownLedger.map((e, i) => (
            <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '13px 18px', borderBottom: i < shownLedger.length - 1 ? '1px solid var(--pf-border)' : 'none' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: LEDGER_DOT[e.type] || 'var(--pf-faint)', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: '14px', color: 'var(--pf-text)' }}>{e.description}</div>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: '9.5px', color: 'var(--pf-faint)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '2px' }}>{formatDate(e.createdAt)}</div>
              </div>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: e.amount >= 0 ? 'var(--pf-success)' : 'var(--pf-alert)' }}>
                {e.amount >= 0 ? '+' : '−'}{formatAmount(Math.abs(e.amount))}
              </div>
            </div>
          ))}
        </div>
      )}
      </>}
    </div>
  )
}
