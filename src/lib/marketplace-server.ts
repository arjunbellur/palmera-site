// Server side of the dépôt-vente marketplace (docs/marketplace-api.md).
// Shared by /api/marketplace/orders, /api/marketplace/orders/[id],
// /api/marketplace/billing/sync and the Stripe webhook. Everything that
// touches money — counts, totals, the commission split, the charge — lives
// here and runs with the Admin SDK; clients only read `supply_orders`.
import Stripe from 'stripe'
import { getAuth } from 'firebase-admin/auth'
import { FieldValue, type Firestore, type Transaction } from 'firebase-admin/firestore'
import { adminDb } from '@/lib/firebase-admin'
import { ADMIN_EMAILS } from '@/lib/admin'
import { sendEmail } from '@/lib/email'
import type { SupplyOrder, SupplyOrderItem, SupplyOrderPayment } from '@/lib/schema'
import { marketplaceMail, type MarketplaceMailKind } from '@/lib/email-templates'

export const SITE = 'https://www.palmeraexp.com'
export const DEFAULT_MAX_PER_ORDER = 10
export const DEFAULT_FIRST_ORDER_MAX = 10
export const ID_RE = /^[A-Za-z0-9_-]{1,128}$/

type Doc = FirebaseFirestore.DocumentData
export type OrderDoc = SupplyOrder & { id: string }

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message) }
}

export interface Caller { uid: string; email: string | null; admin: boolean }

/** Verified Firebase ID token → caller. Admin = allow-listed, verified email. */
export async function requireCaller(req: Request): Promise<Caller> {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer /, '')
  if (!token) throw new HttpError(401, 'unauthorized')
  adminDb() // initializes the admin app for getAuth()
  const decoded = await getAuth().verifyIdToken(token).catch(() => null)
  if (!decoded) throw new HttpError(401, 'unauthorized')
  const email = decoded.email_verified ? (decoded.email ?? null) : null
  return { uid: decoded.uid, email, admin: !!email && ADMIN_EMAILS.includes(email) }
}

export function stripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new HttpError(503, 'payments not configured')
  return new Stripe(key)
}

export async function supplierOwnedBy(db: Firestore, uid: string): Promise<(Doc & { id: string }) | null> {
  const snap = await db.collection('suppliers').where('uid', '==', uid).limit(1).get()
  return snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() }
}

export type Actor = 'buyer' | 'supplier' | 'admin'
/** Every role the caller holds on this order (admin may also be the buyer). */
export async function actorsFor(db: Firestore, order: OrderDoc, caller: Caller): Promise<Set<Actor>> {
  const roles = new Set<Actor>()
  if (caller.admin) roles.add('admin')
  if (order.partnerId === caller.uid) roles.add('buyer')
  const sup = await supplierOwnedBy(db, caller.uid)
  if (sup && sup.id === order.supplierId) roles.add('supplier')
  return roles
}

export async function loadOrder(db: Firestore, id: string): Promise<OrderDoc> {
  if (!ID_RE.test(id)) throw new HttpError(400, 'bad order id')
  const snap = await db.collection('supply_orders').doc(id).get()
  if (!snap.exists) throw new HttpError(404, 'order not found')
  return { id: snap.id, ...(snap.data() as SupplyOrder) }
}

export const emptyPayment = (): SupplyOrderPayment => ({
  provider: 'stripe', customerId: null, paymentMethodId: null, cardLabel: null,
  setupSessionId: null, paymentIntentId: null, checkoutSessionId: null, status: 'none', failureReason: null,
})

// ── Settlement maths (the contract's `settle` section) ───────────────────
export interface Settlement {
  items: SupplyOrderItem[]
  finalGoods: number
  finalTotal: number
  finalCommissionAmount: number
  finalSupplierNet: number
  restock: { productId: string; qty: number }[]
}
export function computeSettlement(order: SupplyOrder, verified: Map<string, number>): Settlement {
  const items = order.items.map((it) => {
    const returned = it.mode === 'borrow'
      ? clampInt(verified.has(it.productId) ? verified.get(it.productId)! : (it.reportedReturnedQty ?? 0), 0, it.qty)
      : 0
    const usedQty = it.qty - returned
    return { ...it, returnedQty: returned, usedQty, finalLineTotal: it.unitPrice * usedQty }
  })
  const finalGoods = items.reduce((s, i) => s + (i.finalLineTotal ?? 0), 0)
  const deliveryFee = order.deliveryFee || 0
  const finalTotal = finalGoods + deliveryFee
  const finalCommissionAmount = Math.round(finalGoods * (order.commissionRate || 0))
  return {
    items, finalGoods, finalTotal, finalCommissionAmount,
    finalSupplierNet: finalTotal - finalCommissionAmount,
    restock: items.filter((i) => (i.returnedQty ?? 0) > 0).map((i) => ({ productId: i.productId, qty: i.returnedQty! })),
  }
}

export const clampInt = (v: unknown, lo: number, hi: number) => {
  const n = typeof v === 'number' ? Math.floor(v) : NaN
  if (!Number.isFinite(n)) throw new HttpError(400, 'invalid quantity')
  return Math.min(hi, Math.max(lo, n))
}

/** Parse `returned: [{ productId, returnedQty }]` against the order's borrow lines. */
export function parseReturned(order: SupplyOrder, raw: unknown): Map<string, number> {
  const out = new Map<string, number>()
  if (!Array.isArray(raw)) return out
  const byId = new Map(order.items.map((i) => [i.productId, i]))
  for (const r of raw as { productId?: unknown; returnedQty?: unknown }[]) {
    const pid = typeof r?.productId === 'string' ? r.productId : ''
    const line = byId.get(pid)
    if (!line) throw new HttpError(400, `unknown line ${pid}`)
    if (line.mode !== 'borrow') continue
    out.set(pid, clampInt(r.returnedQty, 0, line.qty))
  }
  return out
}

// ── Stock moves inside a transaction ──────────────────────────────────────
export async function takeStock(tx: Transaction, db: Firestore, items: SupplyOrderItem[]) {
  const refs = items.map((i) => db.collection('products').doc(i.productId))
  const snaps = await Promise.all(refs.map((r) => tx.get(r)))
  snaps.forEach((s, i) => {
    const stock = Number(s.data()?.stock ?? 0)
    if (!s.exists || stock < items[i].qty) throw new HttpError(409, `insufficient stock: ${items[i].name}`)
  })
  snaps.forEach((s, i) => tx.update(s.ref, { stock: FieldValue.increment(-items[i].qty), updatedAt: new Date() }))
}
export function giveBackStock(tx: Transaction, db: Firestore, moves: { productId: string; qty: number }[]) {
  for (const m of moves) if (m.qty > 0) tx.set(db.collection('products').doc(m.productId), { stock: FieldValue.increment(m.qty), updatedAt: new Date() }, { merge: true })
}

// ── Ledger + paid ─────────────────────────────────────────────────────────
export async function writeLedger(db: Firestore, order: OrderDoc, kind: 'order_net' | 'commission_owed', amount: number) {
  if (!amount) return
  const sup = await db.collection('suppliers').doc(order.supplierId).get()
  // Deterministic id → a replayed webhook can't double-credit.
  await db.collection('supplier_ledger').doc(`${order.id}_${kind}`).set({
    supplierId: order.supplierId, supplierUid: sup.data()?.uid ?? null, orderId: order.id,
    companyName: order.companyName, kind, amount, currency: 'XOF', createdAt: new Date(),
  }, { merge: true })
}

/** Card settlement landed (off-session PI or Pay-now Checkout). Idempotent. */
export async function markPaidByCard(db: Firestore, orderId: string, paymentIntentId: string | null) {
  const ref = db.collection('supply_orders').doc(orderId)
  const paid = await db.runTransaction(async (tx) => {
    const s = await tx.get(ref)
    if (!s.exists) return false
    const o = s.data() as SupplyOrder
    if (!['settled', 'payment_due'].includes(o.status)) return false
    tx.update(ref, {
      status: 'paid', paymentMethod: 'card', paidAt: new Date(), updatedAt: new Date(),
      'payment.status': 'completed', 'payment.failureReason': null,
      ...(paymentIntentId ? { 'payment.paymentIntentId': paymentIntentId } : {}),
    })
    return true
  })
  if (!paid) return false
  const order = await loadOrder(db, orderId)
  await writeLedger(db, order, 'order_net', order.finalSupplierNet || 0)
  void notify(db, 'business_paid', order)
  return true
}

// ── Card on file ──────────────────────────────────────────────────────────
export const cardLabelOf = (pm: Stripe.PaymentMethod | null | undefined) =>
  pm?.card ? `${pm.card.brand} •••• ${pm.card.last4}` : null

/** Stripe Customer for a company — reused across orders. */
export async function customerFor(db: Firestore, stripe: Stripe, companyId: string, companyName: string, email: string | null) {
  const billRef = db.collection('companies').doc(companyId).collection('private').doc('billing')
  const bill = (await billRef.get()).data()
  if (bill?.stripeCustomerId) return { customerId: String(bill.stripeCustomerId), paymentMethodId: (bill.paymentMethodId as string | null) ?? null, cardLabel: (bill.cardLabel as string | null) ?? null }
  const customer = await stripe.customers.create({ name: companyName, ...(email ? { email } : {}), metadata: { companyId, kind: 'palmera_company' } })
  await billRef.set({ stripeCustomerId: customer.id, paymentMethodId: null, cardLabel: null, updatedAt: new Date() }, { merge: true })
  return { customerId: customer.id, paymentMethodId: null, cardLabel: null }
}

export async function createSetupSession(stripe: Stripe, customerId: string, orderId: string, companyId: string) {
  return stripe.checkout.sessions.create({
    mode: 'setup', customer: customerId, payment_method_types: ['card'],
    metadata: { kind: 'supply_card', orderId, companyId },
    success_url: `${SITE}/partner/marketplace?order=${orderId}&setup=success`,
    cancel_url: `${SITE}/partner/marketplace?order=${orderId}&setup=cancelled`,
  })
}

/** A completed setup session → card on the company + on the order. */
export async function saveCardFromSession(db: Firestore, stripe: Stripe, session: Stripe.Checkout.Session) {
  const companyId = session.metadata?.companyId, orderId = session.metadata?.orderId
  if (!companyId) return null
  const siId = typeof session.setup_intent === 'string' ? session.setup_intent : session.setup_intent?.id
  if (!siId) return null
  const si = await stripe.setupIntents.retrieve(siId, { expand: ['payment_method'] })
  if (si.status !== 'succeeded') return null
  const pm = typeof si.payment_method === 'string' ? await stripe.paymentMethods.retrieve(si.payment_method) : si.payment_method
  const paymentMethodId = pm?.id ?? null
  const cardLabel = cardLabelOf(pm)
  const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null
  await db.collection('companies').doc(companyId).collection('private').doc('billing')
    .set({ stripeCustomerId: customerId, paymentMethodId, cardLabel, updatedAt: new Date() }, { merge: true })
  if (orderId) {
    await db.collection('supply_orders').doc(orderId).set({
      payment: { customerId, paymentMethodId, cardLabel, setupSessionId: session.id, status: 'card_saved' }, updatedAt: new Date(),
    }, { merge: true }).catch(() => {})
  }
  return { paymentMethodId, cardLabel }
}

// ── Notifications (best-effort; never fail the write) ─────────────────────
export async function notify(db: Firestore, kind: MarketplaceMailKind, order: OrderDoc) {
  try {
    let to: string | null = null
    if (kind === 'supplier_new_order' || kind === 'supplier_reported') {
      to = String((await db.collection('suppliers').doc(order.supplierId).get()).data()?.email || '')
    } else {
      const [prov, co] = await Promise.all([db.collection('providers').doc(order.partnerId).get(), db.collection('companies').doc(order.companyId).get()])
      to = String(prov.data()?.email || co.data()?.email || '')
    }
    if (!to.includes('@')) return
    const { subject, html } = marketplaceMail(kind, order)
    await sendEmail({ to, subject, html })
    await db.collection('email_log').add({ kind: `market_${kind}`, event: kind, to, orderId: order.id, title: order.supplierName, sentAt: new Date() })
  } catch (e) {
    console.error('marketplace mail failed', kind, order.id, e instanceof Error ? e.message : e)
  }
}

export const nowFields = () => ({ updatedAt: new Date() })
