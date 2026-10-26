'use client'
// Admin — dépôt-vente orders and money. Every order by state, what Palmera
// collected (card settlements) vs what suppliers owe (off-platform
// settlements), and the net owed to each supplier. Admin can unblock a stuck
// order (mark paid off-platform, cancel) through the same API the portals use.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { getAllSupplyOrders, getAllSuppliers, getSupplierLedger } from '@/lib/firestore'
import { auth } from '@/lib/firebase'
import type { SupplyOrder, Supplier, SupplierLedgerEntry } from '@/lib/schema'
import { ScreenHeader, Chip, EmptyState, Skeleton, GhostButton, eyebrow, type Tone } from '@/components/partner/ui'
import { CountTile, FilterChip, inputStyle, glass, formatDate } from '../../ui'
import { formatAmount } from '@/lib/money'
import { ClipboardList } from 'lucide-react'

const STATUS_LABEL: Record<string, string> = {
  submitted: 'Submitted', pending_review: 'Awaiting review', accepted: 'Accepted', handed_over: 'Handed over',
  reported: 'Leftovers reported', settled: 'Count verified', payment_due: 'Payment due', paid: 'Paid',
  declined: 'Declined', cancelled: 'Cancelled', refunded: 'Refunded', awaiting_payment: 'Awaiting payment (v2)', delivered: 'Delivered (v2)',
}
const STATUS_TONE: Record<string, Tone> = {
  submitted: 'gold', pending_review: 'gold', accepted: 'gold', handed_over: 'neutral', reported: 'neutral',
  settled: 'gold', payment_due: 'alert', paid: 'green', declined: 'alert', cancelled: 'neutral', refunded: 'neutral',
}
type Bucket = 'all' | 'open' | 'payment_due' | 'paid' | 'closed'
const OPEN = ['submitted', 'pending_review', 'accepted', 'handed_over', 'reported', 'settled']

const ms = (v: unknown) => (v as { toMillis?: () => number } | undefined)?.toMillis?.() ?? 0

async function act(orderId: string, body: Record<string, unknown>) {
  const token = await auth.currentUser?.getIdToken()
  const res = await fetch(`/api/marketplace/orders/${orderId}`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify(body) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data
}

export default function AdminMarketOrders() {
  const [orders, setOrders] = useState<SupplyOrder[] | null>(null)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [ledger, setLedger] = useState<SupplierLedgerEntry[]>([])
  const [bucket, setBucket] = useState<Bucket>('open')
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const [os, ss, ls] = await Promise.all([getAllSupplyOrders(), getAllSuppliers(), getSupplierLedger()])
    setOrders(os.sort((a, b) => ms(b.createdAt) - ms(a.createdAt)))
    setSuppliers(ss); setLedger(ls)
  }, [])
  useEffect(() => { load().catch(() => setError('Could not load orders.')) }, [load])

  const money = useMemo(() => {
    const paid = (orders || []).filter((o) => o.status === 'paid')
    const card = paid.filter((o) => o.paymentMethod === 'card')
    const off = paid.filter((o) => o.paymentMethod === 'off_platform')
    return {
      collected: card.reduce((s, o) => s + (o.finalTotal || 0), 0),
      commissionEarned: card.reduce((s, o) => s + (o.finalCommissionAmount || 0), 0),
      commissionOwed: off.reduce((s, o) => s + (o.finalCommissionAmount || 0), 0),
      netOwedToSuppliers: ledger.filter((l) => l.kind === 'order_net').reduce((s, l) => s + l.amount, 0),
      due: (orders || []).filter((o) => o.status === 'payment_due').reduce((s, o) => s + (o.finalTotal || 0), 0),
    }
  }, [orders, ledger])

  const perSupplier = useMemo(() => suppliers.map((s) => {
    const mine = ledger.filter((l) => l.supplierId === s.id)
    return { s, net: mine.filter((l) => l.kind === 'order_net').reduce((a, l) => a + l.amount, 0), owed: -mine.filter((l) => l.kind === 'commission_owed').reduce((a, l) => a + l.amount, 0) }
  }).filter((r) => r.net || r.owed), [suppliers, ledger])

  if (orders === null) return <div className="pf-in"><Skeleton height="74px" style={{ maxWidth: '30rem', marginBottom: '22px' }} /><Skeleton height="86px" /><div style={{ height: 12 }} /><Skeleton height="200px" /></div>

  const needle = q.trim().toLowerCase()
  const shown = orders.filter((o) => {
    if (bucket === 'open' && !OPEN.includes(o.status)) return false
    if (bucket === 'payment_due' && o.status !== 'payment_due') return false
    if (bucket === 'paid' && o.status !== 'paid') return false
    if (bucket === 'closed' && !['declined', 'cancelled', 'refunded'].includes(o.status)) return false
    if (needle && !`${o.companyName} ${o.supplierName} ${o.items.map((i) => i.name).join(' ')} ${o.id}`.toLowerCase().includes(needle)) return false
    return true
  })

  const run = async (o: SupplyOrder, body: Record<string, unknown>) => {
    if (!o.id || busy) return
    setBusy(o.id); setError('')
    try { await act(o.id, body); await load() } catch (e) { setError(e instanceof Error ? e.message : 'failed') }
    setBusy('')
  }

  return (
    <div className="pf-in">
      <ScreenHeader label="Marketplace" title="Orders & money" intro="Every dépôt-vente order, what Palmera collected, and what each supplier is owed or owes." />
      <div className="pf-cols">
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '18px' }}>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search business, supplier, product, id…" style={{ ...inputStyle, maxWidth: '24rem' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ ...eyebrow, marginRight: '2px' }}>Show</span>
              {([['open', 'Open'], ['payment_due', 'Payment due'], ['paid', 'Paid'], ['closed', 'Closed'], ['all', 'All']] as [Bucket, string][]).map(([k, l]) => (
                <FilterChip key={k} active={bucket === k} onClick={() => setBucket(k)}>{l} · {k === 'all' ? orders.length : orders.filter((o) => k === 'open' ? OPEN.includes(o.status) : k === 'closed' ? ['declined', 'cancelled', 'refunded'].includes(o.status) : o.status === k).length}</FilterChip>
              ))}
            </div>
          </div>
          {error && <p style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: 'var(--pf-alert)', margin: '0 0 12px' }}>{error}</p>}
          {shown.length === 0 ? (
            <EmptyState icon={<ClipboardList size={22} strokeWidth={1.75} />} title="No orders here" body="Orders appear as soon as a business sends one to a supplier." />
          ) : (
            <div className="pf-glass" style={{ ...glass, padding: 0, overflow: 'hidden' }}>
              {shown.map((o, i) => (
                <div key={o.id} style={{ padding: '13px 20px', borderBottom: i < shown.length - 1 ? '1px solid var(--pf-border)' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ minWidth: 0, flex: '1 1 16rem' }}>
                      <div style={{ fontFamily: 'var(--font-serif)', fontSize: '14px', color: 'var(--pf-text)', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                        {o.companyName} <span style={{ color: 'var(--pf-faint)' }}>←</span> {o.supplierName}
                        <Chip tone={STATUS_TONE[o.status] || 'neutral'}>{STATUS_LABEL[o.status] || o.status}</Chip>
                      </div>
                      <div style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', color: 'var(--pf-faint)', marginTop: '3px' }}>
                        {formatDate(o.createdAt)} · {o.fulfilment === 'delivery' ? `delivery +${formatAmount(o.deliveryFee)}` : 'pickup'} · {o.items.map((it) => `${it.qty}× ${it.name}${it.mode === 'buy' ? ' (buy)' : ''}`).join(' · ')}
                        {o.payment?.cardLabel ? ` · ${o.payment.cardLabel}` : ' · no card'}
                        {o.payment?.failureReason ? ` · ${o.payment.failureReason}` : ''}
                        {o.reviewReason ? ` · review: ${o.reviewReason}` : ''}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', fontFamily: 'var(--font-sans)', fontSize: '12px', color: 'var(--pf-muted)' }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: '15px', color: 'var(--pf-text)' }}>{formatAmount(o.finalTotal ?? o.orderTotal)} XOF</div>
                      <div>{o.finalTotal != null ? `commission ${formatAmount(o.finalCommissionAmount || 0)} · net ${formatAmount(o.finalSupplierNet || 0)}` : `lend value · ${Math.round(o.commissionRate * 1000) / 10}%`}</div>
                      {o.paymentMethod && <div>{o.paymentMethod === 'card' ? 'paid by card' : `paid off-platform (${o.offPlatform?.method || '—'})`}</div>}
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {['payment_due', 'settled'].includes(o.status) && <GhostButton tone="gold" disabled={busy === o.id} onClick={() => run(o, { action: 'mark_paid', method: 'other', note: 'marked paid by admin' })}>Mark paid</GhostButton>}
                      {['submitted', 'pending_review', 'accepted'].includes(o.status) && <GhostButton tone="alert" disabled={busy === o.id} onClick={() => run(o, { action: 'cancel' })}>Cancel</GhostButton>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="pf-rail" style={{ minWidth: 0 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', gap: '12px' }}>
            <CountTile label="Collected by card (XOF)" value={money.collected} tone="gold" />
            <CountTile label="Commission earned" value={money.commissionEarned} tone="gold" />
            <CountTile label="Commission owed by suppliers" value={money.commissionOwed} tone={money.commissionOwed ? 'alert' : undefined} />
            <CountTile label="Net owed to suppliers" value={money.netOwedToSuppliers} />
            <CountTile label="Payments due" value={money.due} tone={money.due ? 'alert' : undefined} />
          </div>
          {perSupplier.length > 0 && (
            <div className="pf-glass" style={{ ...glass, marginTop: '14px' }}>
              <p style={{ ...eyebrow, margin: '0 0 10px' }}>Per supplier</p>
              {perSupplier.map(({ s, net, owed }) => (
                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', fontFamily: 'var(--font-sans)', fontSize: '12px', color: 'var(--pf-muted)', padding: '6px 0', borderTop: '1px solid var(--pf-border)' }}>
                  <span style={{ color: 'var(--pf-text)' }}>{s.name}</span>
                  <span>owed {formatAmount(net)} · owes {formatAmount(owed)}</span>
                </div>
              ))}
            </div>
          )}
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', color: 'var(--pf-faint)', lineHeight: 1.5, marginTop: '14px' }}>
            Card settlements are collected by Palmera and the supplier's net accrues in the supplier ledger. Off-platform settlements (cash or Wave handed to the supplier) accrue the commission the supplier owes Palmera instead.
          </p>
        </div>
      </div>
    </div>
  )
}
