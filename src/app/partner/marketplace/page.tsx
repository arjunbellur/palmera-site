'use client'
// The partner store — dépôt-vente v4 (lend first, pay after). A business
// builds a cart from ONE supplier, sends the order (no charge), saves a card
// if it has none, receives the stock, declares what it is returning, and is
// charged only once the supplier verifies the count. Every write goes through
// /api/marketplace/* (docs/marketplace-api.md); this screen only READS
// supply_orders + the company's card on file.
import { useEffect, useMemo, useState, useCallback, useRef, type ReactNode, type CSSProperties } from 'react'
import { usePartner } from '../PartnerContext'
import { t } from '../i18n'
import type { SupplyProduct, SupplyOrder, SupplyOrderItem, SupplyLineMode, SupplyFulfilment, CompanyBilling } from '@/lib/schema'
import { getLiveProducts, getSupplyOrdersByPartner, getCompanyBilling } from '@/lib/firestore'
import { auth } from '@/lib/firebase'
import { ScreenHeader, PrimaryButton, GhostButton, Chip, EmptyState, Skeleton, cardShape, eyebrow, SearchInput, fieldStyle, type Tone } from '@/components/partner/ui'
import ConfirmDialog from '@/components/dashboard/ConfirmDialog'
import { ShoppingBasket, ClipboardList, Package, CreditCard, Truck, Store } from 'lucide-react'
import { formatAmount, toDate } from '@/lib/money'

// ── helpers ────────────────────────────────────────────────────────────────

type Str = (k: string) => string
type Locale = 'fr' | 'en'
const fmtXof = formatAmount
const sans = 'var(--font-sans)'

const small: CSSProperties = { fontFamily: sans, fontSize: '12px', color: 'var(--pf-muted)', margin: 0 }
const faint: CSSProperties = { fontFamily: sans, fontSize: '11.5px', color: 'var(--pf-faint)', margin: 0 }
const divider: CSSProperties = { borderTop: '1px solid var(--pf-border)', marginTop: '10px', paddingTop: '10px' }
const linkBtn: CSSProperties = { background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--pf-gold)', fontFamily: sans, fontSize: 'inherit', textDecoration: 'underline' }

const STATUS_TONES: Record<string, Tone> = {
  submitted: 'gold', pending_review: 'gold', accepted: 'gold', handed_over: 'green', reported: 'gold',
  settled: 'gold', payment_due: 'alert', paid: 'green', declined: 'alert', cancelled: 'neutral', refunded: 'neutral',
  // legacy v2 values on old docs
  awaiting_payment: 'neutral', delivered: 'neutral',
}
/** Statuses where the card on file still matters (a charge is still to come). */
const CARD_STATUSES = new Set<string>(['submitted', 'pending_review', 'accepted', 'handed_over', 'reported'])
const CANCELLABLE = new Set<string>(['submitted', 'pending_review', 'accepted'])
const PAYABLE = new Set<string>(['settled', 'payment_due'])

interface CartLine { qty: number; mode: SupplyLineMode }
type Cart = Record<string, CartLine>
interface CartEntry { p: SupplyProduct; line: CartLine }
interface ReturnedLine { productId: string; returnedQty: number }

/** Union of the reply shapes in docs/marketplace-api.md. */
interface ApiReply {
  ok?: boolean
  error?: string
  url?: string          // pay_now / setup_card → Stripe Checkout
  setupUrl?: string     // orders POST without a card on file
  orderId?: string
  order?: SupplyOrder
  cardLabel?: string
  pending?: boolean
}

async function apiPost(path: string, body: unknown): Promise<{ status: number; data: ApiReply }> {
  const token = await auth.currentUser?.getIdToken()
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  let data: ApiReply = {}
  try { data = (await res.json()) as ApiReply } catch { /* non-JSON error body */ }
  return { status: res.status, data }
}

/** v2 docs have no `mode`: those were plain purchases. */
const modeOf = (i: SupplyOrderItem): SupplyLineMode => (i.mode === 'borrow' ? 'borrow' : 'buy')
const lendValue = (o: SupplyOrder) => o.items.reduce((s, i) => s + (i.lineTotal ?? i.unitPrice * i.qty), 0)
const millis = (ts: unknown) => toDate(ts)?.getTime() ?? 0
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

/** Client-side estimate of the settlement: buy lines in full, borrow lines
 *  for qty − returned, plus the frozen delivery fee. The server's `settle`
 *  recomputes from the VERIFIED counts — this is a preview only. */
function previewTotal(o: SupplyOrder, returned: Record<string, number>): number {
  const goods = o.items.reduce((s, i) => {
    const used = modeOf(i) === 'buy' ? i.qty : clamp(i.qty - (returned[i.productId] ?? 0), 0, i.qty)
    return s + i.unitPrice * used
  }, 0)
  return goods + (o.deliveryFee || 0)
}

/** The card that will be charged for this order: the one frozen on the order,
 *  else the company's current card when the order points at a method. */
function cardLabelFor(o: SupplyOrder, billing: CompanyBilling | null): string | null {
  if (o.payment?.cardLabel) return o.payment.cardLabel
  if (o.payment?.paymentMethodId && billing?.cardLabel) return billing.cardLabel
  return null
}

function fmtDate(ts: unknown, locale: Locale): string {
  const d = toDate(ts)
  return d ? d.toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''
}

/** 409 bodies read `insufficient stock: <product name>`. */
function parseStockError(msg: string | undefined): string | null {
  const m = /insufficient stock:\s*(.+)$/i.exec(msg || '')
  return m ? m[1].trim() : null
}

function lineLabel(i: SupplyOrderItem, o: SupplyOrder, L: Str): string {
  const mode = modeOf(i)
  let s = `${i.qty}× ${i.name} · ${L(mode === 'borrow' ? 'mk_line_borrow' : 'mk_line_buy')}`
  if (mode === 'borrow') {
    if (i.usedQty != null) s += ` · ${i.usedQty} ${L('mk_used_short')}`
    else if (o.status === 'reported' && i.reportedReturnedQty != null) s += ` · ${i.reportedReturnedQty} ${L('mk_returned_short')}`
  }
  return s
}

// ── small pieces ───────────────────────────────────────────────────────────

function ModeToggle({ mode, onChange, L }: { mode: SupplyLineMode; onChange: (m: SupplyLineMode) => void; L: Str }) {
  const seg = (m: SupplyLineMode, label: string) => (
    <button type="button" onClick={() => onChange(m)} aria-pressed={mode === m} style={{
      flex: 1, padding: '6px 8px', borderRadius: '8px', cursor: 'pointer', fontFamily: sans, fontSize: '11.5px', letterSpacing: '0.03em',
      border: '1px solid transparent',
      background: mode === m ? 'var(--pf-gold-soft)' : 'transparent',
      color: mode === m ? 'var(--pf-gold)' : 'var(--pf-faint)',
    }}>{label}</button>
  )
  return (
    <div role="group" style={{ display: 'flex', gap: '4px', padding: '3px', borderRadius: '10px', border: '1px solid var(--pf-border)' }}>
      {seg('borrow', L('mk_mode_borrow'))}
      {seg('buy', L('mk_mode_buy'))}
    </div>
  )
}

function Row({ label, value, strong }: { label: string; value: ReactNode; strong?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '4px 0' }}>
      <span style={faint}>{label}</span>
      <span style={{ fontFamily: strong ? 'var(--font-display)' : sans, fontSize: strong ? '15px' : '12.5px', color: 'var(--pf-text)', textAlign: 'right' }}>{value}</span>
    </div>
  )
}

function Toast({ text, tone }: { text: string; tone: 'gold' | 'alert' }) {
  return (
    <div className="pf-in" role="status" style={{ position: 'fixed', bottom: '76px', left: '50%', transform: 'translateX(-50%)', zIndex: 90, maxWidth: 'calc(100vw - 32px)', background: 'var(--pf-sheet)', border: '1px solid var(--pf-border-strong)', borderRadius: '999px', padding: '10px 20px', color: tone === 'alert' ? 'var(--pf-alert)' : 'var(--pf-gold)', fontFamily: sans, fontSize: '12.5px', letterSpacing: '0.03em', boxShadow: '0 8px 24px rgba(0,0,0,0.35)', textAlign: 'center' }}>
      {text}
    </div>
  )
}

// ── store ──────────────────────────────────────────────────────────────────

function ProductCard({ p, line, onAdd, onSub, onMode, L }: {
  p: SupplyProduct; line: CartLine | undefined
  onAdd: () => void; onSub: () => void; onMode: (m: SupplyLineMode) => void; L: Str
}) {
  const out = p.stock <= 0
  const atMax = !!line && line.qty >= p.stock
  return (
    <div className="pf-glass" style={{ ...cardShape, display: 'flex', flexDirection: 'column', gap: '8px', opacity: out ? 0.6 : 1 }}>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <span style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'var(--pf-green-soft)', flexShrink: 0, overflow: 'hidden', display: 'grid', placeItems: 'center', color: 'var(--pf-gold)' }}>
          {p.photo ? <img loading="lazy" decoding="async" src={p.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Package size={18} strokeWidth={1.75} />}
        </span>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontFamily: 'var(--font-serif)', color: 'var(--pf-head)', fontSize: '13.5px', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
          <p style={{ ...faint, marginTop: '2px' }}>{p.unitSize ? `${p.unitSize} · ` : ''}{p.unit}</p>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginTop: 'auto' }}>
        <span style={{ fontFamily: 'var(--font-display)', color: 'var(--pf-text)', fontSize: '15px' }}>{fmtXof(p.price)} <span style={{ fontSize: '10px', color: 'var(--pf-faint)' }}>XOF</span></span>
        {out ? <Chip tone="alert">{L('mk_out_of_stock')}</Chip> : <span style={faint}>{p.stock} {L('mk_in_stock')}</span>}
      </div>
      {line ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
              <GhostButton onClick={onSub} ariaLabel="−">−</GhostButton>
              <span style={{ fontFamily: sans, color: 'var(--pf-text)', fontSize: '13px', minWidth: '1.25rem', textAlign: 'center' }}>{line.qty}</span>
              <GhostButton onClick={onAdd} disabled={atMax} ariaLabel="+">+</GhostButton>
            </span>
            {atMax && <span style={{ ...faint, color: 'var(--pf-alert)' }}>{L('mk_stock_short')}</span>}
          </div>
          <ModeToggle mode={line.mode} onChange={onMode} L={L} />
        </>
      ) : (
        <div><GhostButton onClick={onAdd} disabled={out}>{L('mk_add')}</GhostButton></div>
      )}
    </div>
  )
}

function CartRail({ entries, total, fulfilment, setFulfilment, note, setNote, billing, busy, error, onSubmit, onClear, L }: {
  entries: CartEntry[]; total: number
  fulfilment: SupplyFulfilment; setFulfilment: (f: SupplyFulfilment) => void
  note: string; setNote: (s: string) => void
  billing: CompanyBilling | null; busy: boolean; error: ReactNode
  onSubmit: () => void; onClear: () => void; L: Str
}) {
  const radio = (f: SupplyFulfilment, icon: ReactNode, label: string) => (
    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', borderRadius: '10px', cursor: 'pointer', border: `1px solid ${fulfilment === f ? 'var(--pf-border-strong)' : 'var(--pf-border)'}`, background: fulfilment === f ? 'var(--pf-card)' : 'transparent' }}>
      <input type="radio" name="fulfilment" value={f} checked={fulfilment === f} onChange={() => setFulfilment(f)} style={{ accentColor: 'var(--pf-gold)' }} />
      <span style={{ color: 'var(--pf-gold)', display: 'inline-flex' }}>{icon}</span>
      <span style={{ fontFamily: sans, fontSize: '12.5px', color: 'var(--pf-text)' }}>{label}</span>
    </label>
  )
  return (
    <aside className="pf-rail">
      <div className="pf-glass-gold" style={cardShape}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '10px' }}>
          <p style={{ ...eyebrow, margin: 0 }}>{L('mk_cart')}</p>
          {entries.length > 0 && <button type="button" onClick={onClear} style={{ ...linkBtn, fontSize: '11px', color: 'var(--pf-faint)' }}>{L('mk_clear_cart')}</button>}
        </div>
        {entries.length === 0 ? (
          <p style={{ ...small, color: 'var(--pf-faint)' }}>{L('mk_cart_empty')}</p>
        ) : (
          <>
            {entries.map(({ p, line }) => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontFamily: sans, fontSize: '12.5px', color: 'var(--pf-text)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{line.qty}× {p.name}</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  <Chip tone={line.mode === 'borrow' ? 'gold' : 'neutral'}>{L(line.mode === 'borrow' ? 'mk_mode_borrow' : 'mk_mode_buy')}</Chip>
                  <span style={{ fontFamily: sans, fontSize: '12.5px', color: 'var(--pf-muted)' }}>{fmtXof(p.price * line.qty)}</span>
                </span>
              </div>
            ))}
            <div style={{ ...divider, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '10px' }}>
              <span style={faint}>{L('mk_lend_value')}</span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '17px', color: 'var(--pf-text)' }}>{fmtXof(total)} XOF</span>
            </div>
            <p style={{ ...faint, margin: '6px 0 12px' }}>{L('mk_borrow_hint')}</p>

            <p style={{ ...eyebrow, margin: '0 0 6px' }}>{L('mk_fulfilment')}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {radio('delivery', <Truck size={14} strokeWidth={1.75} />, L('mk_f_delivery'))}
              {radio('pickup', <Store size={14} strokeWidth={1.75} />, L('mk_f_pickup'))}
            </div>
            {fulfilment === 'delivery' && <p style={{ ...faint, margin: '6px 0 0' }}>{L('mk_fee_note')}</p>}

            <textarea value={note} onChange={e => setNote(e.target.value)} placeholder={L('mk_note_ph')} rows={2}
              style={{ ...fieldStyle, fontSize: '12.5px', resize: 'vertical', margin: '12px 0 10px' }} />

            <p style={{ ...faint, display: 'flex', alignItems: 'center', gap: '6px', margin: '0 0 10px' }}>
              <CreditCard size={13} strokeWidth={1.75} style={{ flexShrink: 0 }} />
              <span>{billing?.paymentMethodId ? `✓ ${L('mk_card_on_file')}${billing.cardLabel ? ` · ${billing.cardLabel}` : ''} — ${L('mk_card_charge_note')}` : L('mk_card_after')}</span>
            </p>
            <PrimaryButton onClick={onSubmit} disabled={busy} fullWidth>{busy ? L('mk_sending') : L('mk_send')}</PrimaryButton>
          </>
        )}
        {error && <p style={{ ...small, color: 'var(--pf-alert)', marginTop: '10px' }}>{error}</p>}
      </div>
    </aside>
  )
}

// ── orders ─────────────────────────────────────────────────────────────────

function ReportForm({ o, busy, onSubmit, onCancel, L }: {
  o: SupplyOrder; busy: boolean; onSubmit: (returned: ReturnedLine[]) => void; onCancel: () => void; L: Str
}) {
  const borrow = o.items.filter(i => modeOf(i) === 'borrow')
  const [raw, setRaw] = useState<Record<string, string>>({})
  const parsed: Record<string, number> = {}
  let invalid = false
  for (const i of borrow) {
    const n = raw[i.productId] === undefined || raw[i.productId] === '' ? 0 : Number(raw[i.productId])
    if (!Number.isInteger(n) || n < 0 || n > i.qty) invalid = true
    parsed[i.productId] = clamp(Number.isFinite(n) ? n : 0, 0, i.qty)
  }
  const preview = previewTotal(o, parsed)
  return (
    <div style={{ ...divider, borderTop: '1px solid var(--pf-border-strong)' }}>
      <p style={{ ...eyebrow, margin: '0 0 6px' }}>{L('mk_report')}</p>
      <p style={{ ...small, marginBottom: '10px' }}>{L('mk_report_intro')}</p>
      {borrow.length === 0 && <p style={{ ...faint, marginBottom: '10px' }}>{L('mk_report_no_borrow')}</p>}
      {borrow.map(i => (
        <div key={i.productId} style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '8px' }}>
          <span style={{ fontFamily: sans, fontSize: '12.5px', color: 'var(--pf-text)', flex: '1 1 10rem', minWidth: 0 }}>{i.qty}× {i.name}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <input type="number" inputMode="numeric" min={0} max={i.qty} step={1} value={raw[i.productId] ?? ''} placeholder={L('mk_returned_ph')}
              onChange={e => setRaw(r => ({ ...r, [i.productId]: e.target.value }))}
              style={{ ...fieldStyle, width: '9.5rem', fontSize: '12.5px' }} />
            <span style={faint}>{L('mk_of')} {i.qty}</span>
          </span>
        </div>
      ))}
      {invalid && <p style={{ ...faint, color: 'var(--pf-alert)', marginBottom: '8px' }}>{L('mk_returned_range')}</p>}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '10px', margin: '8px 0 12px' }}>
        <span style={faint}>{L('mk_preview')}</span>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '17px', color: 'var(--pf-text)' }}>{fmtXof(preview)} XOF</span>
      </div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <PrimaryButton onClick={() => onSubmit(borrow.map(i => ({ productId: i.productId, returnedQty: parsed[i.productId] })))} disabled={busy || invalid}>
          {busy ? '…' : L('mk_report_send')}
        </PrimaryButton>
        <GhostButton onClick={onCancel} disabled={busy}>{L('cancel')}</GhostButton>
      </div>
    </div>
  )
}

function OrderCard({ o, billing, locale, busy, reporting, onCancel, onOpenReport, onCloseReport, onReport, onPayNow, onSetupCard, L }: {
  o: SupplyOrder; billing: CompanyBilling | null; locale: Locale; busy: boolean; reporting: boolean
  onCancel: () => void; onOpenReport: () => void; onCloseReport: () => void
  onReport: (returned: ReturnedLine[]) => void; onPayNow: () => void; onSetupCard: () => void; L: Str
}) {
  const cardLabel = cardLabelFor(o, billing)
  const settled = o.finalTotal != null
  const paidLabel = o.paymentMethod === 'card'
    ? `${L('mk_pay_card')}${o.payment?.cardLabel ? ` · ${o.payment.cardLabel}` : ''}`
    : o.paymentMethod === 'off_platform'
      ? `${L('mk_pay_off_platform')}${o.offPlatform ? ` (${o.offPlatform.method})` : ''}`
      : null
  const when = fmtDate(o.createdAt, locale)
  const fulfilment = L(o.fulfilment === 'pickup' ? 'mk_f_pickup' : 'mk_f_delivery')

  return (
    <div className="pf-glass" style={cardShape}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 12rem', minWidth: 0 }}>
          <p style={{ fontFamily: 'var(--font-serif)', color: 'var(--pf-head)', fontSize: '14px', margin: 0 }}>{o.supplierName}</p>
          <p style={{ ...faint, marginTop: '3px' }}>{when ? `${L('mk_ordered_on')} ${when} · ` : ''}{fulfilment}</p>
        </div>
        <Chip tone={STATUS_TONES[o.status] || 'neutral'}>{L(`mk_st_${o.status}`)}</Chip>
      </div>

      <div style={{ marginTop: '10px' }}>
        {o.items.map(i => (
          <p key={i.productId} style={{ ...small, color: 'var(--pf-text)', lineHeight: 1.5 }}>{lineLabel(i, o, L)}</p>
        ))}
      </div>

      <div style={divider}>
        <Row label={L('mk_lend_value')} value={`${fmtXof(lendValue(o))} XOF`} strong={!settled} />
        {settled && (
          <>
            <Row label={L('mk_goods_label')} value={fmtXof(o.finalGoods ?? 0)} />
            {o.deliveryFee > 0 && <Row label={L('mk_fee_label')} value={fmtXof(o.deliveryFee)} />}
            <Row label={o.status === 'paid' || o.status === 'refunded' ? L('mk_final_total') : L('mk_amount_due')} value={`${fmtXof(o.finalTotal ?? 0)} XOF`} strong />
            {paidLabel && <Row label={L('mk_paid_with')} value={paidLabel} />}
          </>
        )}
        {!settled && o.fulfilment === 'delivery' && o.deliveryFee > 0 && <Row label={L('mk_fee_label')} value={fmtXof(o.deliveryFee)} />}
      </div>

      {CARD_STATUSES.has(o.status) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginTop: '8px' }}>
          {cardLabel ? (
            <Chip tone="green">✓ {cardLabel}</Chip>
          ) : (
            <>
              <Chip tone="alert">{L('mk_no_card')}</Chip>
              <GhostButton onClick={onSetupCard} disabled={busy}>{L('mk_save_card')}</GhostButton>
            </>
          )}
        </div>
      )}

      {o.status === 'reported' && <p style={{ ...faint, marginTop: '8px' }}>{L('mk_awaiting_verify')}</p>}
      {o.status === 'declined' && o.declineReason && <p style={{ ...small, marginTop: '8px' }}>{L('mk_decline_reason')} : {o.declineReason}</p>}

      {PAYABLE.has(o.status) && (
        <div style={{ marginTop: '12px' }}>
          {o.payment?.failureReason && <p style={{ ...faint, color: 'var(--pf-alert)', marginBottom: '8px' }}>{L('mk_card_failed')} — {o.payment.failureReason}</p>}
          <PrimaryButton onClick={onPayNow} disabled={busy}>{busy ? '…' : `${L('mk_pay_now')} · ${fmtXof(o.finalTotal ?? 0)} XOF`}</PrimaryButton>
          <p style={{ ...faint, marginTop: '8px' }}>{L('mk_pay_offline')}</p>
        </div>
      )}

      {CANCELLABLE.has(o.status) && (
        <div style={{ marginTop: '12px' }}>
          <GhostButton onClick={onCancel} tone="alert" disabled={busy}>{L('mk_cancel_order')}</GhostButton>
        </div>
      )}

      {o.status === 'handed_over' && !reporting && (
        <div style={{ marginTop: '12px' }}>
          <PrimaryButton onClick={onOpenReport}>{L('mk_report')}</PrimaryButton>
        </div>
      )}
      {o.status === 'handed_over' && reporting && (
        <ReportForm o={o} busy={busy} onSubmit={onReport} onCancel={onCloseReport} L={L} />
      )}
    </div>
  )
}

// ── screen ─────────────────────────────────────────────────────────────────

export default function Marketplace() {
  const { uid, company, locale } = usePartner()
  const L = useCallback<Str>(k => t(locale, k), [locale])
  const [products, setProducts] = useState<SupplyProduct[] | null>(null)
  const [orders, setOrders] = useState<SupplyOrder[] | null>(null)
  const [billing, setBilling] = useState<CompanyBilling | null>(null)
  const [cart, setCart] = useState<Cart>({})
  const [fulfilment, setFulfilment] = useState<SupplyFulfilment>('delivery')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<ReactNode>(null)
  const [tab, setTab] = useState<'store' | 'orders'>('store')
  const [q, setQ] = useState('')
  const [toast, setToast] = useState<{ text: string; tone: 'gold' | 'alert' } | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [toCancel, setToCancel] = useState<SupplyOrder | null>(null)
  const [reportingId, setReportingId] = useState<string | null>(null)

  const showToast = useCallback((text: string, tone: 'gold' | 'alert' = 'gold') => {
    setToast({ text, tone })
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 4500)
  }, [])

  const loadOrders = useCallback(async () => {
    if (!uid) return
    const os = await getSupplyOrdersByPartner(uid)
    setOrders(os.sort((a, b) => millis(b.createdAt) - millis(a.createdAt)))
  }, [uid])
  const loadBilling = useCallback(async () => {
    if (!company?.id) { setBilling(null); return }
    setBilling(await getCompanyBilling(company.id).catch(() => null))
  }, [company?.id])
  const loadProducts = useCallback(async () => { setProducts(await getLiveProducts()) }, [])

  useEffect(() => { loadProducts(); loadOrders() }, [loadProducts, loadOrders])
  useEffect(() => { loadBilling() }, [loadBilling])
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current) }, [])

  // Return from Stripe. setup=… is the card-save session opened right after
  // submit; pay=… is the "Pay now" Checkout for a payment_due order. The URL
  // is cleaned straight away so a refresh never replays the toast.
  useEffect(() => {
    if (!uid) return
    const params = new URLSearchParams(window.location.search)
    const orderId = params.get('order'); const setup = params.get('setup'); const pay = params.get('pay')
    if (!orderId || (!setup && !pay)) return
    window.history.replaceState({}, '', '/partner/marketplace')
    setTab('orders')
    const run = async () => {
      if (setup === 'success') {
        try {
          const { data } = await apiPost('/api/marketplace/billing/sync', { orderId })
          if (data.ok && data.pending) showToast(L('mk_t_card_pending'), 'alert')
          else if (data.ok) showToast(L('mk_t_card_saved'))
          else showToast(L('mk_action_err'), 'alert')
        } catch { showToast(L('mk_action_err'), 'alert') }
        await loadBilling()
      } else if (setup === 'cancelled') showToast(L('mk_t_card_needed'), 'alert')
      else if (pay === 'success') showToast(L('mk_t_paid'))
      else if (pay === 'cancelled') showToast(L('mk_t_pay_cancelled'), 'alert')
      await loadOrders()
    }
    run()
  }, [uid, L, loadOrders, loadBilling, showToast])

  const byId = useMemo(() => new Map((products || []).map(p => [p.id!, p])), [products])
  const entries = useMemo<CartEntry[]>(() =>
    Object.entries(cart).filter(([, l]) => l.qty > 0).flatMap(([id, line]) => { const p = byId.get(id); return p ? [{ p, line }] : [] }),
  [cart, byId])
  const cartSupplier = entries[0]?.p.supplierId ?? null
  const cartTotal = entries.reduce((s, { p, line }) => s + p.price * line.qty, 0)

  const add = (p: SupplyProduct) => {
    setError(null)
    if (cartSupplier && p.supplierId !== cartSupplier) { setError(L('mk_one_supplier')); return }
    setCart(c => {
      const cur = c[p.id!]
      const qty = (cur?.qty || 0) + 1
      if (qty > p.stock) return c
      return { ...c, [p.id!]: { qty, mode: cur?.mode || 'borrow' } }
    })
  }
  const sub = (id: string) => setCart(c => {
    const cur = c[id]; if (!cur) return c
    const qty = cur.qty - 1
    if (qty <= 0) { const { [id]: _drop, ...rest } = c; void _drop; return rest }
    return { ...c, [id]: { ...cur, qty } }
  })
  const setMode = (id: string, mode: SupplyLineMode) => setCart(c => (c[id] ? { ...c, [id]: { ...c[id], mode } } : c))

  const submit = async () => {
    if (!company?.id || entries.length === 0 || busy) return
    setBusy(true); setError(null)
    let redirecting = false
    try {
      const { status, data } = await apiPost('/api/marketplace/orders', {
        companyId: company.id, fulfilment, note,
        items: entries.map(({ p, line }) => ({ productId: p.id, qty: line.qty, mode: line.mode })),
      })
      if (!data.ok) {
        if (status === 402) {
          setError(<>{L('mk_err_unpaid')} <button type="button" onClick={() => setTab('orders')} style={linkBtn}>{L('mk_go_orders')}</button></>)
        } else if (status === 409) {
          const name = parseStockError(data.error)
          setError(name ? `${L('mk_err_stock')} ${name}.` : L('mk_err_stock_generic'))
          loadProducts()
        } else setError(L('mk_submit_err'))
        return
      }
      if (data.setupUrl) { redirecting = true; window.location.href = data.setupUrl; return }
      setCart({}); setNote('')
      await loadOrders()
      setTab('orders'); showToast(L('mk_t_sent'))
    } catch (e) {
      console.error('order submit failed:', e)
      setError(L('mk_submit_err'))
    } finally {
      if (!redirecting) setBusy(false)
    }
  }

  /** One transition on one order; resolves to the reply on success, null otherwise. */
  const act = async (o: SupplyOrder, body: Record<string, unknown>, keepBusy = false): Promise<ApiReply | null> => {
    if (!o.id || busyId) return null
    setBusyId(o.id)
    let ok = false
    try {
      const { data } = await apiPost(`/api/marketplace/orders/${o.id}`, body)
      if (!data.ok) { showToast(L('mk_action_err'), 'alert'); return null }
      ok = true
      return data
    } catch (e) {
      console.error('order action failed:', e)
      showToast(L('mk_action_err'), 'alert')
      return null
    } finally {
      if (!(ok && keepBusy)) setBusyId(null)
    }
  }
  const cancelOrder = async () => {
    if (!toCancel) return
    const r = await act(toCancel, { action: 'cancel' })
    if (!r) return
    setToCancel(null); await loadOrders(); showToast(L('mk_t_cancelled'))
  }
  const reportOrder = async (o: SupplyOrder, returned: ReturnedLine[]) => {
    const r = await act(o, { action: 'report', returned })
    if (!r) return
    setReportingId(null); await loadOrders(); showToast(L('mk_t_reported'))
  }
  const redirectTo = async (o: SupplyOrder, action: 'pay_now' | 'setup_card') => {
    const r = await act(o, { action }, true)
    if (r?.url) window.location.href = r.url
    else if (r) { setBusyId(null); showToast(L('mk_action_err'), 'alert') }
  }

  const groupedBySupplier = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const list = needle ? (products || []).filter(p => [p.name, p.supplierName, p.category].some(v => String(v || '').toLowerCase().includes(needle))) : (products || [])
    const m = new Map<string, SupplyProduct[]>()
    for (const p of list) {
      if (!m.has(p.supplierName)) m.set(p.supplierName, [])
      m.get(p.supplierName)!.push(p)
    }
    return [...m.entries()]
  }, [products, q])

  return (
    <>
      <ScreenHeader label={L('mk_label')} title={L('mk_title')} intro={L('mk_intro')} />

      <div style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
        {(['store', 'orders'] as const).map(k => (
          <button key={k} type="button" onClick={() => setTab(k)} style={{
            padding: '7px 16px', borderRadius: '999px', cursor: 'pointer', fontFamily: sans, fontSize: '12.5px',
            border: '1px solid var(--pf-border)',
            background: tab === k ? 'var(--pf-card)' : 'transparent',
            color: tab === k ? 'var(--pf-gold)' : 'var(--pf-faint)',
          }}>{L(k === 'store' ? 'mk_tab_store' : 'mk_tab_orders')}{k === 'orders' && orders?.length ? ` (${orders.length})` : ''}</button>
        ))}
      </div>

      {tab === 'store' && (products?.length ?? 0) > 0 && (
        <div style={{ marginBottom: '14px' }}><SearchInput value={q} onChange={setQ} placeholder={L('mk_search')} /></div>
      )}
      {tab === 'store' && (
        <div className="pf-cols" style={{ alignItems: 'flex-start' }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            {products === null ? <Skeleton height="12rem" /> :
             products.length === 0 ? <EmptyState icon={<ShoppingBasket size={22} strokeWidth={1.75} />} title={L('mk_empty_t')} body={L('mk_empty_b')} /> :
             groupedBySupplier.map(([supplierName, ps]) => (
              <div key={supplierName} style={{ marginBottom: '22px' }}>
                <p style={{ ...eyebrow, margin: '0 0 10px' }}>{supplierName} · {ps[0].city}</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(13.5rem, 1fr))', gap: '12px' }}>
                  {[...ps].sort((a, b) => a.name.localeCompare(b.name)).map(p => (
                    <ProductCard key={p.id} p={p} line={cart[p.id!]} L={L}
                      onAdd={() => add(p)} onSub={() => sub(p.id!)} onMode={m => setMode(p.id!, m)} />
                  ))}
                </div>
              </div>
            ))}
          </div>

          <CartRail entries={entries} total={cartTotal} fulfilment={fulfilment} setFulfilment={setFulfilment}
            note={note} setNote={setNote} billing={billing} busy={busy} error={error}
            onSubmit={submit} onClear={() => { setCart({}); setError(null) }} L={L} />
        </div>
      )}

      {tab === 'orders' && (
        orders === null ? <Skeleton height="8rem" /> :
        orders.length === 0 ? <EmptyState icon={<ClipboardList size={22} strokeWidth={1.75} />} title={L('mk_orders_empty_t')} body={L('mk_orders_empty_b')} /> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {orders.map(o => (
              <OrderCard key={o.id} o={o} billing={billing} locale={locale} L={L}
                busy={busyId === o.id} reporting={reportingId === o.id}
                onCancel={() => setToCancel(o)}
                onOpenReport={() => setReportingId(o.id ?? null)} onCloseReport={() => setReportingId(null)}
                onReport={returned => reportOrder(o, returned)}
                onPayNow={() => redirectTo(o, 'pay_now')} onSetupCard={() => redirectTo(o, 'setup_card')} />
            ))}
          </div>
        )
      )}

      {toCancel && (
        <ConfirmDialog
          title={L('mk_cancel_title')}
          note={L('mk_cancel_note')}
          confirmLabel={L('mk_cancel_confirm')}
          busyLabel={L('mk_cancel_busy')}
          busy={busyId === toCancel.id}
          locale={locale}
          onConfirm={cancelOrder}
          onCancel={() => setToCancel(null)}
        >
          <strong style={{ color: 'var(--pf-text)' }}>{toCancel.supplierName}</strong> · {fmtXof(lendValue(toCancel))} XOF
        </ConfirmDialog>
      )}

      {toast && <Toast text={toast.text} tone={toast.tone} />}
    </>
  )
}
