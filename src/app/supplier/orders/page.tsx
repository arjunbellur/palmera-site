'use client'
// Supplier order inbox — dépôt-vente v4 (docs/marketplace-api.md).
// This screen only READS supply_orders; every transition is a
// POST /api/marketplace/orders/{id} with the Firebase ID token. The server
// owns stock moves, the settle maths and the Stripe charge — the live totals
// in the settlement panel mirror its formula so the supplier sees exactly
// what will be billed before confirming.
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useSupplier } from '../SupplierContext'
import { t, type Locale } from '../i18n'
import type { SupplyOrder, SupplyOrderItem, SupplyOrderStatus } from '@/lib/schema'
import { getSupplyOrdersBySupplier } from '@/lib/firestore'
import { useSWRLite } from '@/lib/swr-lite'
import { auth } from '@/lib/firebase'
import { formatAmount, toDate } from '@/lib/money'
import { ScreenHeader, Chip, PrimaryButton, GhostButton, EmptyState, Skeleton, SearchInput, cardShape, eyebrow, fieldStyle, fieldLabel, type Tone } from '@/components/partner/ui'
import ConfirmDialog from '@/components/dashboard/ConfirmDialog'
import { useEscape } from '@/lib/use-escape'
import { Inbox, Truck, Store, AlertTriangle, CheckCircle2 } from 'lucide-react'

// ── Contract types (local to this screen; the API route is the source) ────
type OrderWithId = SupplyOrder & { id: string }
type PaymentMethod = 'cash' | 'wave' | 'orange_money' | 'other'
type ReturnedLine = { productId: string; returnedQty: number }
type OrderAction =
  | { action: 'accept' }
  | { action: 'decline'; reason: string }
  | { action: 'hand_over' }
  | { action: 'settle'; returned: ReturnedLine[] }
  | { action: 'record_payment'; method: PaymentMethod; note: string }
type ApiResult =
  | { ok: true; order: OrderWithId }
  | { ok: false; error: string; status: number }

async function postOrderAction(orderId: string, body: OrderAction): Promise<ApiResult> {
  const token = await auth.currentUser?.getIdToken()
  if (!token) return { ok: false, error: 'not signed in', status: 401 }
  let res: Response
  try {
    res = await fetch(`/api/marketplace/orders/${orderId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
  } catch {
    return { ok: false, error: 'network', status: 0 }
  }
  let data: { ok?: boolean; error?: string; order?: OrderWithId } = {}
  try { data = await res.json() } catch { /* non-JSON error body */ }
  if (!res.ok || !data.ok || !data.order) return { ok: false, error: data.error || `HTTP ${res.status}`, status: res.status }
  return { ok: true, order: data.order }
}

// ── Sections, status vocabulary ───────────────────────────────────────────
type SectionKey = 'review' | 'handover' | 'progress' | 'due' | 'history'
const SECTIONS: { key: SectionKey; statuses: SupplyOrderStatus[] }[] = [
  { key: 'review', statuses: ['pending_review', 'submitted'] },
  { key: 'handover', statuses: ['accepted'] },
  { key: 'progress', statuses: ['handed_over', 'reported'] },
  { key: 'due', statuses: ['payment_due', 'settled'] },
  { key: 'history', statuses: ['paid', 'declined', 'cancelled', 'refunded', 'awaiting_payment', 'delivered'] },
]
const STATUS_TONE: Record<SupplyOrderStatus, Tone> = {
  submitted: 'gold', pending_review: 'gold', accepted: 'gold', handed_over: 'neutral', reported: 'gold',
  settled: 'alert', payment_due: 'alert', paid: 'green', declined: 'neutral', cancelled: 'neutral',
  refunded: 'neutral', awaiting_payment: 'neutral', delivered: 'neutral',
}
const isReviewable = (s: SupplyOrderStatus) => s === 'submitted' || s === 'pending_review'
const isSettleable = (s: SupplyOrderStatus) => s === 'handed_over' || s === 'reported'
const isDue = (s: SupplyOrderStatus) => s === 'payment_due' || s === 'settled'

const fmtDate = (v: unknown, locale: Locale) => {
  const d = toDate(v)
  return d ? d.toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
}
const clampInt = (raw: string, max: number) => {
  const n = Math.round(parseFloat(raw))
  return Number.isFinite(n) ? Math.min(max, Math.max(0, n)) : 0
}
/** Stripe's failure reasons in the supplier's words. Unknown → shown as-is. */
const humanFailure = (reason: string | null | undefined, L: (k: string) => string) => {
  const r = (reason || '').toLowerCase()
  if (!r) return L('fr_no_card') // payment_due with no reason = nothing to charge
  if (r.includes('no card') || r.includes('no_card') || r.includes('payment method')) return L('fr_no_card')
  if (r.includes('authentication')) return L('fr_auth')
  if (r.includes('declin')) return L('fr_declined')
  return reason || ''
}

const sans: React.CSSProperties = { fontFamily: 'var(--font-sans)', color: 'var(--pf-muted)', fontSize: '12.5px', lineHeight: 1.5 }
const ROW_BORDER = '1px solid var(--pf-border)'

// ── Shared bottom sheet (settlement + record payment) ─────────────────────
function Sheet({ title, onClose, children }: { title: string; onClose?: () => void; children: ReactNode }) {
  useEscape(onClose)
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'var(--pf-scrim)', zIndex: 80, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div role="dialog" aria-modal="true" aria-label={title} onClick={e => e.stopPropagation()} className="pf-in"
        style={{ background: 'var(--pf-sheet)', border: '1px solid var(--pf-border)', borderRadius: '18px 18px 0 0', padding: '20px', width: '100%', maxWidth: '34rem', maxHeight: '88dvh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '10px' }}>
          <div style={{ ...eyebrow, color: 'var(--pf-eyebrow)' }}>{title}</div>
          {onClose && <button onClick={onClose} aria-label="Close" style={{ background: 'transparent', border: 'none', color: 'var(--pf-faint)', fontSize: '18px', cursor: 'pointer', lineHeight: 1, width: '40px', height: '40px' }}>×</button>}
        </div>
        {children}
      </div>
    </div>
  )
}

// ── OrderCard ─────────────────────────────────────────────────────────────
function OrderCard({ order, locale, busy, onAccept, onDecline, onHandOver, onSettle, onRecord }: {
  order: OrderWithId; locale: Locale; busy: boolean
  onAccept: () => void; onDecline: () => void; onHandOver: () => void; onSettle: () => void; onRecord: () => void
}) {
  const L = (k: string) => t(locale, k)
  const s = order.status
  const delivery = order.fulfilment === 'delivery'
  const cardLabel = order.payment?.cardLabel ?? null
  const final = order.finalTotal != null

  return (
    <article className="pf-glass" style={{ ...cardShape, display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontFamily: 'var(--font-serif)', color: 'var(--pf-head)', fontSize: '16px', margin: 0, overflowWrap: 'anywhere' }}>{order.companyName}</p>
          <p style={{ ...sans, color: 'var(--pf-faint)', fontSize: '11.5px', margin: '2px 0 0' }}>{L('created_on')} {fmtDate(order.createdAt, locale)} · {order.totalUnits} {L('units')}</p>
        </div>
        <Chip tone={STATUS_TONE[s] ?? 'neutral'}>{L(`st_${s}`)}</Chip>
      </header>

      {s === 'pending_review' && order.reviewReason && (
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '10px 12px', borderRadius: '10px', background: 'var(--pf-gold-soft)', color: 'var(--pf-gold)' }}>
          <AlertTriangle size={15} strokeWidth={1.75} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <span style={{ ...eyebrow, color: 'var(--pf-gold)' }}>{L('review_reason')}</span>
            <p style={{ ...sans, color: 'var(--pf-text)', margin: '2px 0 0' }}>{order.reviewReason}</p>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', ...sans }}>
        {delivery ? <Truck size={14} strokeWidth={1.75} /> : <Store size={14} strokeWidth={1.75} />}
        <span>{delivery ? L('fulfil_delivery') : L('fulfil_pickup')}</span>
        {delivery && <span style={{ color: 'var(--pf-faint)' }}>· {L('delivery_fee')} {order.deliveryFee > 0 ? `${formatAmount(order.deliveryFee)} XOF` : L('free')}</span>}
      </div>

      <ul style={{ listStyle: 'none', margin: 0, padding: 0, borderTop: ROW_BORDER }}>
        {order.items.map((it, i) => (
          <li key={`${it.productId}-${i}`} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '8px 0', borderBottom: ROW_BORDER }}>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontFamily: 'var(--font-sans)', color: 'var(--pf-text)', fontSize: '13.5px', margin: 0, overflowWrap: 'anywhere' }}>
                {it.qty}× {it.name}{it.unitSize ? ` ${it.unitSize}` : ''} <span style={{ color: 'var(--pf-faint)' }}>· {L(it.mode === 'buy' ? 'mode_buy' : 'mode_borrow')}</span>
              </p>
              <p style={{ ...sans, color: 'var(--pf-faint)', fontSize: '11.5px', margin: '2px 0 0' }}>
                {formatAmount(it.unitPrice)} XOF{L('per_unit')}
                {it.usedQty != null && <> · {L('sp_col_used')} {it.usedQty}</>}
                {it.usedQty == null && it.mode === 'borrow' && it.reportedReturnedQty != null && <> · {L('sp_col_reported')} {it.reportedReturnedQty}</>}
              </p>
            </div>
            <span style={{ fontFamily: 'var(--font-sans)', color: 'var(--pf-text)', fontSize: '13px', whiteSpace: 'nowrap' }}>
              {formatAmount(it.finalLineTotal ?? it.lineTotal)}
            </span>
          </li>
        ))}
      </ul>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap' }}>
        <span style={eyebrow}>{final ? L('billed_total') : L('lend_value')}</span>
        <span style={{ fontFamily: 'var(--font-display)', color: 'var(--pf-text)', fontSize: '18px' }}>
          {formatAmount(final ? order.finalTotal : order.orderTotal + order.deliveryFee)} <span style={{ fontSize: '11px', color: 'var(--pf-faint)' }}>XOF</span>
        </span>
      </div>
      {final && order.finalSupplierNet != null && (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginTop: '-6px' }}>
          <span style={eyebrow}>{L('your_net')}</span>
          <span style={{ fontFamily: 'var(--font-sans)', color: 'var(--pf-gold)', fontSize: '13px' }}>{formatAmount(order.finalSupplierNet)} XOF</span>
        </div>
      )}

      {/* Payment state — card on file before settlement, outcome after. */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {s === 'paid' ? (
          <Chip tone="green">✓ {order.paymentMethod === 'off_platform' ? `${L('paid_off_platform')} · ${L(`rp_${order.offPlatform?.method ?? 'other'}`)}` : L('paid_card')}</Chip>
        ) : s === 'payment_due' ? (
          <>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <Chip tone="alert">{L('amount_due')} · {formatAmount(order.finalTotal)} XOF</Chip>
            </div>
            <p style={{ ...sans, margin: 0 }}><span style={{ color: 'var(--pf-alert)' }}>{L('payment_failed')}</span> — {humanFailure(order.payment?.failureReason, L)}.</p>
          </>
        ) : (isReviewable(s) || s === 'accepted' || isSettleable(s) || s === 'settled') ? (
          cardLabel ? (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <Chip tone="green">✓ {cardLabel}</Chip>
              <span style={{ ...sans, fontSize: '11.5px', color: 'var(--pf-faint)' }}>{L('card_on_file')}</span>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <Chip tone="alert">{L('no_card')}</Chip>
              {isReviewable(s) && <p style={{ ...sans, margin: 0, flex: '1 1 14rem', fontSize: '11.5px' }}>{L('no_card_hint')}</p>}
            </div>
          )
        ) : null}
        {s === 'reported' && <p style={{ ...sans, margin: 0, color: 'var(--pf-gold)' }}>{L('reported_hint')}</p>}
      </div>

      {order.note && (
        <div>
          <span style={eyebrow}>{L('business_note')}</span>
          <p style={{ ...sans, color: 'var(--pf-text)', margin: '3px 0 0', whiteSpace: 'pre-wrap' }}>{order.note}</p>
        </div>
      )}
      {s === 'declined' && order.declineReason && (
        <div>
          <span style={eyebrow}>{L('decline_reason')}</span>
          <p style={{ ...sans, margin: '3px 0 0' }}>{order.declineReason}</p>
        </div>
      )}

      {(isReviewable(s) || s === 'accepted' || isSettleable(s) || isDue(s)) && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '2px' }}>
          {isReviewable(s) && <>
            <PrimaryButton onClick={onAccept} disabled={busy}>{busy ? L('busy') : L('act_accept')}</PrimaryButton>
            <GhostButton tone="alert" onClick={onDecline} disabled={busy}>{L('act_decline')}</GhostButton>
          </>}
          {s === 'accepted' && (
            <PrimaryButton onClick={onHandOver} disabled={busy}>{busy ? L('busy') : L(delivery ? 'act_hand_over_delivery' : 'act_hand_over_pickup')}</PrimaryButton>
          )}
          {isSettleable(s) && <PrimaryButton onClick={onSettle} disabled={busy}>{L('act_settle')}</PrimaryButton>}
          {isDue(s) && <GhostButton onClick={onRecord} disabled={busy}>{L('act_record_payment')}</GhostButton>}
        </div>
      )}
    </article>
  )
}

// ── DeclineDialog ─────────────────────────────────────────────────────────
function DeclineDialog({ order, locale, busy, error, onConfirm, onCancel }: {
  order: OrderWithId; locale: Locale; busy: boolean; error: string
  onConfirm: (reason: string) => void; onCancel: () => void
}) {
  const L = (k: string) => t(locale, k)
  const [reason, setReason] = useState('')
  const [touched, setTouched] = useState(false)
  const empty = reason.trim().length === 0
  return (
    <ConfirmDialog locale={locale} title={`${L('dc_title')} — ${order.companyName}`} confirmLabel={L('dc_confirm')} busy={busy}
      error={error || (touched && empty ? L('dc_body') : undefined)}
      onCancel={onCancel} onConfirm={() => { setTouched(true); if (!empty) onConfirm(reason.trim().slice(0, 300)) }}>
      {L('dc_body')}
      <textarea value={reason} onChange={e => setReason(e.target.value)} maxLength={300} rows={3} placeholder={L('dc_placeholder')} autoFocus
        style={{ ...fieldStyle, display: 'block', marginTop: '10px', resize: 'vertical', background: 'var(--db-bg-card, var(--pf-bg))', borderColor: 'var(--db-border, var(--pf-border))', color: 'var(--db-text, var(--pf-text))' }} />
    </ConfirmDialog>
  )
}

// ── SettlementPanel ───────────────────────────────────────────────────────
type SettleRow = { item: SupplyOrderItem; returned: number; used: number; amount: number }

function SettlementPanel({ order, locale, onSubmit, onClose }: {
  order: OrderWithId; locale: Locale
  onSubmit: (returned: ReturnedLine[]) => Promise<ApiResult>
  onClose: () => void
}) {
  const L = (k: string) => t(locale, k)
  const [inputs, setInputs] = useState<Record<string, string>>(() =>
    Object.fromEntries(order.items.filter(i => i.mode === 'borrow').map(i => [i.productId, String(i.reportedReturnedQty ?? 0)])))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<OrderWithId | null>(null)

  // Mirrors the contract's settle maths exactly (docs/marketplace-api.md).
  const rows: SettleRow[] = order.items.map(item => {
    const returned = item.mode === 'buy' ? 0 : clampInt(inputs[item.productId] ?? '0', item.qty)
    const used = item.mode === 'buy' ? item.qty : item.qty - returned
    return { item, returned, used, amount: item.unitPrice * used }
  })
  const goods = rows.reduce((s, r) => s + r.amount, 0)
  const fee = order.deliveryFee // frozen at submission; 0 for pickup
  const total = goods + fee
  const commission = Math.round(order.commissionRate * goods)
  const net = total - commission

  const submit = async () => {
    if (busy) return
    setBusy(true); setError('')
    const res = await onSubmit(rows.filter(r => r.item.mode === 'borrow').map(r => ({ productId: r.item.productId, returnedQty: r.returned })))
    if (res.ok) setResult(res.order)
    else setError(res.status === 401 ? L('err_signed_out') : res.error || L('err_generic'))
    setBusy(false)
  }

  const totalRow = (label: string, value: number, strong = false, negative = false) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '7px 0', borderTop: ROW_BORDER }}>
      <span style={strong ? { ...eyebrow, color: 'var(--pf-gold)' } : eyebrow}>{label}</span>
      <span style={{ fontFamily: strong ? 'var(--font-display)' : 'var(--font-sans)', color: strong ? 'var(--pf-head)' : 'var(--pf-text)', fontSize: strong ? '18px' : '13.5px' }}>
        {negative ? '−' : ''}{formatAmount(value)} XOF
      </span>
    </div>
  )

  if (result) {
    const paid = result.status === 'paid'
    return (
      <Sheet title={L('sp_title')} onClose={onClose}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '10px', padding: '12px 0 4px' }}>
          <span style={{ color: paid ? 'var(--pf-success)' : 'var(--pf-alert)' }}>{paid ? <CheckCircle2 size={28} strokeWidth={1.5} /> : <AlertTriangle size={28} strokeWidth={1.5} />}</span>
          <p style={{ fontFamily: 'var(--font-display)', color: 'var(--pf-head)', fontSize: '1.25rem', letterSpacing: '0.03em', margin: 0 }}>{paid ? L('sp_paid_title') : L('sp_due_title')}</p>
          <p style={{ ...sans, margin: 0, maxWidth: '40ch' }}>{paid ? ((result.finalTotal ?? 0) === 0 ? L('sp_zero_body') : L('sp_paid_body')) : L('sp_due_body')}</p>
          {!paid && <p style={{ ...sans, margin: 0 }}><span style={eyebrow}>{L('sp_reason')}</span> · {humanFailure(result.payment?.failureReason, L)}</p>}
        </div>
        <div style={{ marginTop: '14px' }}>
          {totalRow(L('sp_total'), result.finalTotal ?? total, true)}
          {totalRow(L('sp_net'), result.finalSupplierNet ?? net)}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
          <PrimaryButton onClick={onClose}>{L('sp_close')}</PrimaryButton>
        </div>
      </Sheet>
    )
  }

  return (
    <Sheet title={`${L('sp_title')} — ${order.companyName}`} onClose={busy ? undefined : onClose}>
      <p style={{ ...sans, margin: '0 0 12px' }}>{L('sp_intro')}</p>

      <div style={{ display: 'flex', flexDirection: 'column', borderTop: ROW_BORDER }}>
        {rows.map(({ item, returned, used, amount }) => (
          <div key={item.productId} style={{ padding: '10px 0', borderBottom: ROW_BORDER, display: 'grid', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
              <span style={{ fontFamily: 'var(--font-sans)', color: 'var(--pf-text)', fontSize: '13.5px', overflowWrap: 'anywhere' }}>{item.name}{item.unitSize ? ` ${item.unitSize}` : ''}</span>
              <span style={{ fontFamily: 'var(--font-sans)', color: 'var(--pf-text)', fontSize: '13.5px', whiteSpace: 'nowrap' }}>{formatAmount(amount)} XOF</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(6.5rem, 1fr))', gap: '8px', alignItems: 'end' }}>
              <div>
                <span style={eyebrow}>{L('sp_col_handed')}</span>
                <p style={{ ...sans, color: 'var(--pf-text)', margin: '2px 0 0' }}>{item.qty}</p>
              </div>
              {item.mode === 'buy' ? (
                <div>
                  <span style={eyebrow}>{L('sp_col_used')}</span>
                  <p style={{ ...sans, color: 'var(--pf-text)', margin: '2px 0 0' }}>{item.qty} · {L('mode_buy')}</p>
                </div>
              ) : (
                <>
                  <div>
                    <span style={eyebrow}>{L('sp_col_reported')}</span>
                    <p style={{ ...sans, color: item.reportedReturnedQty == null ? 'var(--pf-faint)' : 'var(--pf-text)', margin: '2px 0 0' }}>
                      {item.reportedReturnedQty == null ? L('sp_not_reported') : item.reportedReturnedQty}
                    </p>
                  </div>
                  <div>
                    <label style={{ ...eyebrow, display: 'block' }} htmlFor={`ret-${item.productId}`}>{L('sp_col_verified')}</label>
                    <input id={`ret-${item.productId}`} type="number" min={0} max={item.qty} step={1} inputMode="numeric" disabled={busy}
                      value={inputs[item.productId] ?? '0'} onChange={e => setInputs(m => ({ ...m, [item.productId]: e.target.value }))}
                      onBlur={() => setInputs(m => ({ ...m, [item.productId]: String(returned) }))}
                      style={{ ...fieldStyle, marginTop: '2px', padding: '6px 10px', minHeight: '36px' }} />
                  </div>
                  <div>
                    <span style={eyebrow}>{L('sp_col_used')}</span>
                    <p style={{ ...sans, color: 'var(--pf-text)', margin: '2px 0 0' }}>{used} <span style={{ color: 'var(--pf-faint)' }}>× {formatAmount(item.unitPrice)}</span></p>
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '6px' }}>
        {totalRow(L('sp_goods'), goods)}
        {totalRow(L('delivery_fee'), fee)}
        {totalRow(L('sp_total'), total, true)}
        {totalRow(`${L('sp_commission')} (${+(order.commissionRate * 100).toFixed(2)}%)`, commission, false, true)}
        {totalRow(L('sp_net'), net)}
      </div>

      {error && <p role="alert" style={{ ...sans, color: 'var(--pf-alert)', margin: '10px 0 0' }}>{error}</p>}
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px', flexWrap: 'wrap' }}>
        <GhostButton onClick={onClose} disabled={busy}>{L('m_cancel')}</GhostButton>
        <PrimaryButton onClick={submit} disabled={busy}>{busy ? L('busy') : L('sp_confirm')}</PrimaryButton>
      </div>
    </Sheet>
  )
}

// ── RecordPaymentForm ─────────────────────────────────────────────────────
const METHODS: PaymentMethod[] = ['cash', 'wave', 'orange_money', 'other']

function RecordPaymentForm({ order, locale, onSubmit, onClose }: {
  order: OrderWithId; locale: Locale
  onSubmit: (method: PaymentMethod, note: string) => Promise<ApiResult>
  onClose: () => void
}) {
  const L = (k: string) => t(locale, k)
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    if (busy) return
    setBusy(true); setError('')
    const res = await onSubmit(method, note.trim().slice(0, 200))
    if (res.ok) { onClose(); return }
    setError(res.status === 401 ? L('err_signed_out') : res.error || L('err_generic'))
    setBusy(false)
  }

  return (
    <Sheet title={`${L('rp_title')} — ${order.companyName}`} onClose={busy ? undefined : onClose}>
      <p style={{ ...sans, margin: '0 0 4px' }}>{L('rp_intro')}</p>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '8px 0', borderBottom: ROW_BORDER }}>
        <span style={eyebrow}>{L('amount_due')}</span>
        <span style={{ fontFamily: 'var(--font-display)', color: 'var(--pf-head)', fontSize: '18px' }}>{formatAmount(order.finalTotal)} <span style={{ fontSize: '11px', color: 'var(--pf-faint)' }}>XOF</span></span>
      </div>

      <label style={fieldLabel} htmlFor="rp-method">{L('rp_method')}</label>
      <select id="rp-method" style={fieldStyle} value={method} onChange={e => setMethod(e.target.value as PaymentMethod)} disabled={busy}>
        {METHODS.map(m => <option key={m} value={m}>{L(`rp_${m}`)}</option>)}
      </select>

      <label style={fieldLabel} htmlFor="rp-note">{L('rp_note')}</label>
      <textarea id="rp-note" value={note} onChange={e => setNote(e.target.value)} maxLength={200} rows={2} placeholder={L('rp_note_ph')} disabled={busy}
        style={{ ...fieldStyle, resize: 'vertical' }} />

      {error && <p role="alert" style={{ ...sans, color: 'var(--pf-alert)', margin: '10px 0 0' }}>{error}</p>}
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px', flexWrap: 'wrap' }}>
        <GhostButton onClick={onClose} disabled={busy}>{L('m_cancel')}</GhostButton>
        <PrimaryButton onClick={submit} disabled={busy}>{busy ? L('busy') : L('rp_confirm')}</PrimaryButton>
      </div>
    </Sheet>
  )
}

// ── Screen ────────────────────────────────────────────────────────────────
export default function SupplierOrders() {
  const { supplier, locale } = useSupplier()
  const L = useCallback((k: string) => t(locale, k), [locale])
  const [q, setQ] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)
  const [decline, setDecline] = useState<{ order: OrderWithId; error: string } | null>(null)
  const [settle, setSettle] = useState<OrderWithId | null>(null)
  const [record, setRecord] = useState<OrderWithId | null>(null)

  // Cached across visits (stale-while-revalidate); every action calls load() = fresh fetch.
  const supplierId = supplier?.id
  const { data: orders, reload: load } = useSWRLite(supplierId ? `supplier:orders:${supplierId}` : null, async (): Promise<OrderWithId[]> => {
    try {
      const list = await getSupplyOrdersBySupplier(supplierId!)
      const withId = list.filter((o): o is OrderWithId => typeof o.id === 'string')
      withId.sort((a, b) => (toDate(b.createdAt)?.getTime() ?? 0) - (toDate(a.createdAt)?.getTime() ?? 0))
      return withId
    } catch (e) {
      console.error('orders load failed:', e)
      return []
    }
  }, [supplierId])

  useEffect(() => {
    if (!toast) return
    const id = window.setTimeout(() => setToast(null), 4500)
    return () => window.clearTimeout(id)
  }, [toast])

  const errorText = useCallback((res: Extract<ApiResult, { ok: false }>) => {
    if (res.status === 401) return L('err_signed_out')
    if (res.status === 409 && res.error.startsWith('insufficient stock')) return `${L('err_stock')} — ${res.error.replace(/^insufficient stock:?\s*/, '')}`
    return res.error || L('err_generic')
  }, [L])

  /** One-shot actions from the card: busy state → API → toast → reload. */
  const run = async (order: OrderWithId, body: OrderAction, okKey: string) => {
    if (busyId) return
    setBusyId(order.id)
    const res = await postOrderAction(order.id, body)
    if (res.ok) setToast({ tone: 'ok', text: L(okKey) })
    else setToast({ tone: 'err', text: errorText(res) })
    await load()
    setBusyId(null)
    return res
  }

  /** Form-driven actions (settle / record) — the form shows its own errors;
   *  the list reloads on success so the card moves to its new section. */
  const runFromForm = async (order: OrderWithId, body: OrderAction, okKey?: string) => {
    const res = await postOrderAction(order.id, body)
    if (res.ok) { if (okKey) setToast({ tone: 'ok', text: L(okKey) }); await load() }
    return res
  }

  const filtered = useMemo(() => {
    if (!orders) return []
    const needle = q.trim().toLowerCase()
    if (!needle) return orders
    return orders.filter(o => o.companyName.toLowerCase().includes(needle) || o.items.some(i => i.name.toLowerCase().includes(needle)))
  }, [orders, q])

  if (!supplier) return null

  return (
    <>
      <ScreenHeader label={L('ord_label')} title={L('ord_title')} intro={L('ord_intro')} />

      {orders === null ? (
        <div style={{ display: 'grid', gap: '14px' }}>{[0, 1, 2].map(i => <Skeleton key={i} height="9rem" />)}</div>
      ) : orders.length === 0 ? (
        <EmptyState icon={<Inbox size={22} strokeWidth={1.75} />} title={L('ord_empty_title')} body={L('ord_empty_body')} />
      ) : (
        <>
          {orders.length > 5 && <div style={{ marginBottom: '18px' }}><SearchInput value={q} onChange={setQ} placeholder={L('search_orders')} /></div>}
          {SECTIONS.map(sec => {
            const list = filtered.filter(o => sec.statuses.includes(o.status))
            return (
              <section key={sec.key} style={{ marginBottom: '28px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', margin: '0 0 12px' }}>
                  <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--pf-head)', fontSize: '1.0625rem', fontWeight: 400, letterSpacing: '0.03em', margin: 0 }}>{L(`sec_${sec.key}`)}</h2>
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: list.length > 0 && (sec.key === 'review' || sec.key === 'due') ? 'var(--pf-gold)' : 'var(--pf-faint)' }}>{list.length}</span>
                </div>
                {list.length === 0 ? (
                  <p style={{ ...sans, color: 'var(--pf-faint)', margin: 0 }}>{L('sec_empty')}</p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 20rem), 1fr))', gap: '14px' }}>
                    {list.map(o => (
                      <OrderCard key={o.id} order={o} locale={locale} busy={busyId === o.id}
                        onAccept={() => run(o, { action: 'accept' }, 'ok_accepted')}
                        onDecline={() => setDecline({ order: o, error: '' })}
                        onHandOver={() => run(o, { action: 'hand_over' }, 'ok_handed')}
                        onSettle={() => setSettle(o)}
                        onRecord={() => setRecord(o)} />
                    ))}
                  </div>
                )}
              </section>
            )
          })}
        </>
      )}

      {decline && (
        <DeclineDialog order={decline.order} locale={locale} busy={busyId === decline.order.id} error={decline.error}
          onCancel={() => { if (busyId !== decline.order.id) setDecline(null) }}
          onConfirm={async reason => {
            const res = await run(decline.order, { action: 'decline', reason }, 'ok_declined')
            if (res?.ok) setDecline(null)
            else if (res) setDecline(d => d ? { ...d, error: errorText(res) } : d)
          }} />
      )}
      {settle && (
        <SettlementPanel order={settle} locale={locale} onClose={() => setSettle(null)}
          onSubmit={returned => runFromForm(settle, { action: 'settle', returned })} />
      )}
      {record && (
        <RecordPaymentForm order={record} locale={locale} onClose={() => setRecord(null)}
          onSubmit={(method, note) => runFromForm(record, { action: 'record_payment', method, note }, 'ok_recorded')} />
      )}

      {toast && (
        <div role="status" className="pf-in" style={{ position: 'fixed', left: '50%', bottom: '22px', transform: 'translateX(-50%)', zIndex: 90, maxWidth: 'min(28rem, calc(100% - 32px))', padding: '10px 16px', borderRadius: '12px', background: 'var(--pf-sheet)', border: `1px solid ${toast.tone === 'ok' ? 'var(--pf-border-strong)' : 'rgba(196,124,124,0.5)'}`, color: toast.tone === 'ok' ? 'var(--pf-text)' : 'var(--pf-alert)', fontFamily: 'var(--font-sans)', fontSize: '13px', boxShadow: '0 12px 30px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {toast.tone === 'ok' ? <CheckCircle2 size={15} strokeWidth={1.75} style={{ color: 'var(--pf-success)', flexShrink: 0 }} /> : <AlertTriangle size={15} strokeWidth={1.75} style={{ flexShrink: 0 }} />}
          <span>{toast.text}</span>
        </div>
      )}
    </>
  )
}
