'use client'
// Earnings — ported faithfully from the Claude Design mockup: gradient hero
// card with circled stat icons, a monthly bar chart and per-experience revenue
// pills (real data, shown once it exists), and list-card payout/ledger rows.
import { useEffect, useState } from 'react'
import { usePartner } from '../PartnerContext'
import { t } from '../i18n'
import { getLedgerByProvider, getPayoutsByProvider, getCompanyAdmin, getExperiencesByCompany } from '@/lib/firestore'
import type { Booking, LedgerEntry, LedgerEntryType, Payout, PayoutStatus } from '@/lib/schema'
import { formatAmount, formatDate, toDate } from '@/lib/money'
import { ScreenHeader, Money, EmptyState, SectionTitle, Skeleton, card, cardShape, eyebrow } from '@/components/partner/ui'
import { BarChart, RankPills } from '@/components/charts'
import { CalendarClock, TrendingUp, BadgeCheck, Wallet, Clock, Check } from 'lucide-react'

const PAYOUT_COLOR: Record<PayoutStatus, string> = {
  scheduled: 'var(--pf-gold)', processing: 'var(--pf-gold)', paid: 'var(--pf-success)', failed: 'var(--pf-alert)',
}
const LEDGER_DOT: Record<LedgerEntryType, string> = {
  commission_earned: 'var(--pf-success)', payout: 'var(--pf-gold)',
  refund: 'var(--pf-alert)', clawback: 'var(--pf-alert)', adjustment: 'var(--pf-faint)',
}

/** Circled icon + tiny label + serif value — the hero card's stat idiom. */
function CircleStat({ icon, label, value, tone = 'var(--pf-gold)' }: { icon: React.ReactNode; label: string; value: React.ReactNode; tone?: string }) {
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
  const { uid, company, locale, bookings } = usePartner()
  const L = (k: string) => t(locale, k)
  const [ledger, setLedger] = useState<LedgerEntry[]>([])
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [period, setPeriod] = useState<'all' | 'month' | 'last' | '30'>('all')
  const [loaded, setLoaded] = useState(false)
  const [rate, setRate] = useState<number | null>(null)
  const [extrasGroupIds, setExtrasGroupIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!uid || !company?.id) return
    ;(async () => {
      const [l, p, adm, exps] = await Promise.all([
        getLedgerByProvider(uid), getPayoutsByProvider(uid),
        getCompanyAdmin(company.id!).catch(() => null),
        getExperiencesByCompany(uid, company.id!).catch(() => []),
      ])
      setRate(typeof adm?.commissionRate === 'number' ? adm.commissionRate : null)
      // Which option groups are ADD-ONS (vs required choices) — extras revenue counts only those.
      setExtrasGroupIds(new Set(exps.flatMap(e => (e.optionGroups || []).filter(g => !g.required).map(g => g.id))))
      setLedger(l.filter(e => e.companyId === company.id))
      setPayouts(p.filter(x => x.companyId === company.id))
      setLoaded(true)
    })()
  }, [uid, company?.id])

  const ledgerBalance = ledger.reduce((s, e) => s + (e.amount || 0), 0)
  // Until the ledger/payout writer exists (and bookings start completing),
  // derive earnings from the bookings themselves — they already carry
  // payoutAmount/commissionAmount. Ledger wins the moment it has entries.
  const earning = bookings.filter(b => (b.payoutAmount || 0) > 0)
  const upcomingEarn = earning.filter(b => b.status === 'confirmed').reduce((s, b) => s + (b.payoutAmount || 0), 0)
  const deliveredEarn = earning.filter(b => b.status === 'completed').reduce((s, b) => s + (b.payoutAmount || 0), 0)
  const derived = ledger.length === 0
  // Jordan's vocabulary: Upcoming earnings (confirmed, not yet delivered) /
  // Available for payout (delivered, not yet paid out) / Paid to date.
  const balance = derived ? Math.max(0, deliveredEarn - payouts.filter(p => p.status === 'paid').reduce((s, p) => s + (p.netAmount || 0), 0)) : ledgerBalance
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
  if (derived) {
    // Money lands in the month the experience is scheduled for.
    for (const b of earning) {
      if (!['confirmed', 'completed'].includes(b.status)) continue
      const d = toDate(b.scheduledFor); if (!d) continue
      const key = `${d.getFullYear()}-${d.getMonth()}`
      if (monthSums.has(key)) monthSums.set(key, (monthSums.get(key) || 0) + (b.payoutAmount || 0))
    }
  } else {
    for (const e of ledger) {
      if (e.type !== 'commission_earned' || e.amount <= 0) continue
      const d = toDate(e.createdAt); if (!d) continue
      const key = `${d.getFullYear()}-${d.getMonth()}`
      if (monthSums.has(key)) monthSums.set(key, (monthSums.get(key) || 0) + e.amount)
    }
  }
  const chart = months.map(m => ({ ...m, val: monthSums.get(m.key) || 0 }))
  const chartMax = Math.max(...chart.map(c => c.val))

  // ── Earnings per experience — confirmed counts too, else a partner with
  //    real paid bookings sees an empty screen. ──
  const byTitle = new Map<string, number>()
  earning.filter(b => ['confirmed', 'completed'].includes(b.status))
    .forEach(b => byTitle.set(b.title, (byTitle.get(b.title) || 0) + (b.payoutAmount || 0)))
  const revBars = [...byTitle.entries()].map(([label, val]) => ({ label, val })).sort((a, b) => b.val - a.val).slice(0, 4)
  const hasData = chartMax > 0 || revBars.length > 0

  // Top-paying clients (Jordan) — from this company's own bookings.
  const topClients = (() => {
    const m = new Map<string, { spend: number; visits: number }>()
    bookings.filter(b => !['cancelled', 'declined'].includes(b.status)).forEach(b => {
      const name = b.customerName?.trim() || '—'
      const cur = m.get(name) || { spend: 0, visits: 0 }
      m.set(name, { spend: cur.spend + (b.bookingTotal || 0), visits: cur.visits + 1 })
    })
    return [...m.entries()]
      .filter(([, v]) => v.spend > 0)
      .map(([label, v]) => ({ label, value: v.spend, display: `${formatAmount(v.spend)} XOF · ${v.visits}×` }))
      .sort((a, b) => b.value - a.value).slice(0, 5)
  })()

  const h3: React.CSSProperties = { margin: '0 0 12px', fontFamily: 'var(--font-display)', fontSize: '1.125rem', fontWeight: 400, letterSpacing: '0.03em', color: 'var(--pf-head)' }
  const listCard: React.CSSProperties = { borderRadius: '16px', overflow: 'hidden' }

  return (
    <div className="pf-in">
      <ScreenHeader label={L('earn_label')} title={L('earn_title')} intro={L('earn_intro')} />

      {!loaded && <><Skeleton height="120px" style={{ marginBottom: '12px' }} /><Skeleton height="220px" /></>}
      {loaded && <>
      {/* Hero: gradient balance card with circled stats. */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 14rem), 1fr))', gap: '12px' }}>
        <div style={{ gridColumn: '1 / -1', padding: '24px', borderRadius: '18px', background: 'linear-gradient(150deg, rgba(190,154,86,0.12), var(--pf-card))', border: '1px solid var(--pf-border-strong)', display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: '22px' }}>
          <div>
            <div style={{ ...eyebrow, fontSize: '10.5px', letterSpacing: '0.16em' }}>{L('avail_payout')}</div>
            <div style={{ marginTop: '8px' }}><Money amount={formatAmount(balance)} size={52} /></div>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: '10.5px', color: 'var(--pf-muted)', marginTop: '8px', maxWidth: '22rem', lineHeight: 1.5 }}>{L('avail_payout_note')}</div>
          </div>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            <CircleStat icon={<TrendingUp size={14} strokeWidth={1.75} />} label={L('upcoming_earn')} value={<>{formatAmount(upcomingEarn)} <span style={{ fontFamily: 'var(--font-sans)', fontSize: '10px', color: 'var(--pf-muted)' }}>XOF</span></>} />
            <CircleStat icon={<CalendarClock size={14} strokeWidth={1.75} />} label={L('next_payout')} value={next ? formatDate(next.scheduledFor) : '—'} />
            <CircleStat icon={<BadgeCheck size={14} strokeWidth={1.75} />} label={L('status_lbl')} value={company?.active ? (locale === 'fr' ? 'Actif' : 'Active') : '—'} tone="var(--pf-success)" />
          </div>
        </div>

        <div className="pf-glass" style={cardShape}>
          <div style={eyebrow}>{L('lifetime')}</div>
          <div style={{ marginTop: '6px' }}><Money amount={formatAmount(lifetime)} size={26} /></div>
        </div>
        {/* Jordan/ChatGPT #23: extras are the upsell engine — show what they bring in. */}
        {(() => {
          const live = bookings.filter(b => ['confirmed', 'completed'].includes(b.status))
          const isExtra = (sel: { groupId?: string }) => extrasGroupIds.size === 0 || extrasGroupIds.has(sel.groupId || '')
          const extras = live.reduce((s, b) => s + (b.selections || []).filter(isExtra).reduce((t, sel) => t + (sel.price || 0) * (sel.quantity || 1), 0), 0)
          const withExtras = live.filter(b => (b.selections || []).some(isExtra)).length
          if (live.length === 0) return null
          return (
            <div className="pf-glass" style={cardShape}>
              <div style={eyebrow}>{L('extras_rev')}</div>
              <div style={{ marginTop: '6px' }}><Money amount={formatAmount(extras)} size={26} /></div>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: '10px', color: 'var(--pf-faint)', marginTop: '5px' }}>
                {withExtras}/{live.length} {L('extras_rev_sub')}
              </div>
            </div>
          )
        })()}
        <div className="pf-glass" style={cardShape}>
          <div style={eyebrow}>{L('comm_title')}</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '26px', color: 'var(--pf-text)', marginTop: '6px' }}>
            {rate != null ? `${+(rate * 100).toFixed(2)}%` : '—'}<span style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', color: 'var(--pf-muted)', marginLeft: '6px' }}>{L('comm_per_booking')}</span>
          </div>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: '10px', color: 'var(--pf-faint)', marginTop: '5px' }}>
            {ends ? `${L('comm_first_year')} ${formatDate(ends)}${monthsLeft != null ? ` · ${monthsLeft} ${locale === 'fr' ? 'mois' : 'mo'} ${L('months_left')}` : ''}` : locale === 'fr' ? 'Pas encore activée' : 'Not activated yet'}
          </div>
        </div>
      </div>

      {/* Money lifecycle (Jordan #8): where a franc is on its way to you. */}
      {(() => {
        const paidCount = earning.filter(b => ['confirmed', 'completed'].includes(b.status)).length
        const upcomingCount = earning.filter(b => b.status === 'confirmed').length
        const doneCount = earning.filter(b => b.status === 'completed').length
        const paidOut = payouts.filter(p => p.status === 'paid').length
        const steps = [
          { k: 'lc_paid', n: paidCount }, { k: 'lc_upcoming', n: upcomingCount },
          { k: 'lc_done', n: doneCount }, { k: 'lc_eligible', n: derived ? doneCount : unsettled.filter(e => e.type === 'commission_earned').length },
          { k: 'lc_paidout', n: paidOut },
        ]
        return (
          <div className="pf-glass" style={{ ...cardShape, marginTop: '12px' }}>
            <div style={{ ...eyebrow, marginBottom: '12px' }}>{L('lc_title')}</div>
            <div style={{ display: 'flex', alignItems: 'stretch', gap: '0', overflowX: 'auto' }}>
              {steps.map((st, i) => (
                <div key={st.k} style={{ flex: '1 1 0', minWidth: '6.5rem', position: 'relative', padding: '0 6px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                    <span style={{ width: '26px', height: '26px', borderRadius: '50%', border: `1px solid ${st.n > 0 ? 'var(--pf-gold)' : 'var(--pf-border)'}`, background: st.n > 0 ? 'rgba(190,154,86,0.14)' : 'transparent', color: st.n > 0 ? 'var(--pf-gold)' : 'var(--pf-faint)', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-sans)', fontSize: '11px', flexShrink: 0 }}>
                      {st.n > 0 ? st.n : <Check size={12} strokeWidth={2} style={{ opacity: 0.35 }} />}
                    </span>
                    {i < steps.length - 1 && <span style={{ position: 'absolute', left: '50%', right: '-50%', top: '13px', height: '1px', background: 'var(--pf-border)', zIndex: -1 }} />}
                  </div>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: '10.5px', color: st.n > 0 ? 'var(--pf-text)' : 'var(--pf-faint)', lineHeight: 1.35 }}>{L(st.k)}</div>
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      {/* Derived breakdown: what's coming vs what's already delivered. */}
      {derived && balance > 0 && (
        <div className="pf-glass" style={{ ...cardShape, marginTop: '12px' }}>
          <div style={{ ...eyebrow, marginBottom: '10px' }}>{L('breakdown_title')}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--pf-border)', fontFamily: 'var(--font-sans)', fontSize: '12.5px' }}>
            <span style={{ color: 'var(--pf-muted)' }}>{L('exp_upcoming')} · {earning.filter(b => b.status === 'confirmed').length}</span>
            <span style={{ color: 'var(--pf-gold)' }}>{formatAmount(upcomingEarn)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', fontFamily: 'var(--font-sans)', fontSize: '12.5px' }}>
            <span style={{ color: 'var(--pf-muted)' }}>{L('exp_done')} · {earning.filter(b => b.status === 'completed').length}</span>
            <span style={{ color: 'var(--pf-success)' }}>{formatAmount(deliveredEarn)}</span>
          </div>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '10px', color: 'var(--pf-faint)', margin: '10px 0 0', lineHeight: 1.5 }}>{L('ledger_soon')}</p>
        </div>
      )}
      {/* Next-payout breakdown — Jordan: transparency on gross vs deductions. */}
      {unsettled.length > 0 && (
        <div className="pf-glass" style={{ ...cardShape, marginTop: '12px' }}>
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
              {/* Shared kit — same markup this page pioneered, one source of truth. */}
              <BarChart data={chart.map(c => ({ label: c.label, value: c.val, display: formatAmount(c.val) }))} />
            </div>
          )}

          {revBars.length > 0 && (
            <div style={{ marginTop: '22px' }}>
              <h3 style={h3}>{L('rev_title')}</h3>
              <RankPills items={revBars.map(b => ({ label: b.label, value: b.val, display: `${formatAmount(b.val)} XOF` }))} />
            </div>
          )}
        </>
      )}

      {topClients.length > 0 && (
        <div style={{ marginTop: '22px' }}>
          <h3 style={h3}>{L('top_clients')}</h3>
          <RankPills items={topClients} />
        </div>
      )}

      <SectionTitle>{L('payout_hist')}</SectionTitle>
      {payouts.length === 0 ? (
        <EmptyState icon={<Wallet size={22} strokeWidth={1.75} />} title={L('pay_empty_t')} body={L('pay_empty_b')} chip={L('pay_empty_chip')} />
      ) : (
        <div className="pf-glass" style={listCard}>
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
      {earning.length > 0 && (
          /* Jordan #7: the reconciliation table — every booking with money on it.
             Always shown; the itemised ledger (below) is the settlement view. */
          <div className="pf-glass" style={{ ...listCard, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-sans)', fontSize: '12px', minWidth: '38rem' }}>
              <thead>
                <tr style={{ color: 'var(--pf-faint)', fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  {['tx_date', 'tx_booking', 'tx_customer', 'tx_total', 'tx_commission', 'tx_net', 'tx_status'].map((k, i) => (
                    <th key={k} style={{ textAlign: i >= 3 && i <= 5 ? 'right' : 'left', padding: '11px 14px', borderBottom: '1px solid var(--pf-border)', fontWeight: 400 }}>{L(k)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...earning].sort((a, b) => (toDate(b.scheduledFor)?.getTime() ?? 0) - (toDate(a.scheduledFor)?.getTime() ?? 0)).map((b, i, arr) => (
                  <tr key={b.id} style={{ borderBottom: i < arr.length - 1 ? '1px solid var(--pf-border)' : 'none' }}>
                    <td style={{ padding: '10px 14px', color: 'var(--pf-muted)', whiteSpace: 'nowrap' }}>{formatDate(b.scheduledFor)}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--pf-text)', fontFamily: 'var(--font-serif)', fontSize: '13px' }}>{b.title}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--pf-muted)' }}>{b.customerName || '—'}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--pf-text)' }}>{formatAmount(b.bookingTotal)}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--pf-faint)' }}>−{formatAmount(b.commissionAmount)}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', color: b.status === 'completed' ? 'var(--pf-success)' : 'var(--pf-gold)', fontWeight: 600 }}>{formatAmount(b.payoutAmount)}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--pf-muted)', whiteSpace: 'nowrap' }}>{L(b.status === 'completed' ? (ledger.some(e => e.bookingId === b.id && e.payoutId) ? 'lc_paid_s' : 'lc_eligible_s') : 'lc_upcoming_s')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
      )}
      {ledger.length === 0 ? (
        earning.length === 0 ? <EmptyState icon={<Clock size={22} strokeWidth={1.75} />} title={L('ledger_empty_t')} body={L('ledger_empty_b')} /> : null
      ) : shownLedger.length === 0 ? (
        <div className="pf-glass" style={{ ...cardShape, textAlign: 'center', fontFamily: 'var(--font-sans)', fontSize: '12px', color: 'var(--pf-faint)' }}>—</div>
      ) : (
        <div className="pf-glass" style={listCard}>
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
