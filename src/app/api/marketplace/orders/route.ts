// POST /api/marketplace/orders — a business submits a dépôt-vente order.
// Contract: docs/marketplace-api.md. Prices, the delivery fee, the
// commission rate and the thresholds are read server-side and frozen onto
// the receipt; stock is checked now and taken on `accept`. If the company
// has no card on file the response carries a Stripe setup-mode URL — the
// order exists either way, the supplier sees whether a card is there.
import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import type { SupplyOrder, SupplyOrderItem, SupplyLineMode, SupplyFulfilment } from '@/lib/schema'
import {
  HttpError, ID_RE, DEFAULT_MAX_PER_ORDER, DEFAULT_FIRST_ORDER_MAX,
  requireCaller, stripeClient, customerFor, createSetupSession, emptyPayment, notify, loadOrder,
} from '@/lib/marketplace-server'

export const dynamic = 'force-dynamic'

type RawLine = { productId?: unknown; qty?: unknown; mode?: unknown }

export async function POST(req: NextRequest) {
  try {
    const caller = await requireCaller(req)
    const db = adminDb()
    const body = await req.json().catch(() => null) as { items?: unknown; companyId?: unknown; note?: unknown; fulfilment?: unknown } | null
    const companyId = typeof body?.companyId === 'string' && ID_RE.test(body.companyId) ? body.companyId : ''
    const note = typeof body?.note === 'string' ? body.note.slice(0, 500) : ''
    const fulfilment: SupplyFulfilment = body?.fulfilment === 'delivery' ? 'delivery' : body?.fulfilment === 'pickup' ? 'pickup' : 'pickup'
    if (!['delivery', 'pickup'].includes(String(body?.fulfilment))) throw new HttpError(400, 'fulfilment must be delivery or pickup')
    const rawItems = Array.isArray(body?.items) ? body!.items as RawLine[] : []
    if (!companyId || rawItems.length === 0) throw new HttpError(400, 'empty order')
    if (rawItems.length > 50) throw new HttpError(400, 'too many lines (max 50)')

    // Merge duplicate lines per (product, mode); strict shapes.
    const merged = new Map<string, { productId: string; qty: number; mode: SupplyLineMode }>()
    for (const it of rawItems) {
      const pid = typeof it?.productId === 'string' && ID_RE.test(it.productId) ? it.productId : null
      const qty = typeof it?.qty === 'number' && Number.isInteger(it.qty) ? it.qty : NaN
      const mode: SupplyLineMode = it?.mode === 'buy' ? 'buy' : 'borrow'
      if (!pid || !(qty >= 1 && qty <= 999)) throw new HttpError(400, 'invalid line')
      const key = `${pid}:${mode}`
      merged.set(key, { productId: pid, mode, qty: Math.min(999, (merged.get(key)?.qty || 0) + qty) })
    }
    const wanted = [...merged.values()]

    // The buying company must belong to the caller.
    const companySnap = await db.collection('companies').doc(companyId).get()
    const company = companySnap.data()
    if (!company || company.providerId !== caller.uid) throw new HttpError(403, 'not your company')

    // An unpaid settled order blocks new ones (the whole model rests on it).
    const unpaid = await db.collection('supply_orders').where('companyId', '==', companyId).where('status', '==', 'payment_due').limit(1).get()
    if (!unpaid.empty) throw new HttpError(402, 'unpaid order')

    // Products: live, one supplier, enough stock for the whole order.
    const products = await db.getAll(...wanted.map((w) => db.collection('products').doc(w.productId)))
    const perProduct = new Map<string, number>()
    for (const w of wanted) perProduct.set(w.productId, (perProduct.get(w.productId) || 0) + w.qty)
    let supplierId: string | null = null
    const lines: SupplyOrderItem[] = []
    wanted.forEach((w, i) => {
      const p = products[i].data()
      if (!p || p.status !== 'live') throw new HttpError(409, `unavailable product: ${w.productId}`)
      if (supplierId && p.supplierId !== supplierId) throw new HttpError(400, 'one supplier per order')
      supplierId = p.supplierId
      if (Number(p.stock ?? 0) < (perProduct.get(w.productId) || 0)) throw new HttpError(409, `insufficient stock: ${p.name}`)
      lines.push({
        productId: products[i].id, name: p.name, unit: p.unit, unitSize: p.unitSize || '',
        unitPrice: Number(p.price) || 0, qty: w.qty, mode: w.mode, lineTotal: (Number(p.price) || 0) * w.qty,
        reportedReturnedQty: null, returnedQty: null, usedQty: null, finalLineTotal: null,
      })
    })

    const supplier = (await db.collection('suppliers').doc(supplierId!).get()).data()
    if (!supplier || supplier.status !== 'active') throw new HttpError(409, 'supplier unavailable')

    // Thresholds — the supplier's credibility rules on the BUSINESS.
    const totalUnits = lines.reduce((s, l) => s + l.qty, 0)
    const maxPerOrder = Number(supplier.maxPerOrder) > 0 ? Number(supplier.maxPerOrder) : DEFAULT_MAX_PER_ORDER
    const firstOrderMax = Number(supplier.firstOrderMax) > 0 ? Number(supplier.firstOrderMax) : DEFAULT_FIRST_ORDER_MAX
    const prior = await db.collection('supply_orders').where('companyId', '==', companyId).where('supplierId', '==', supplierId!).limit(20).get()
    const firstOrder = !prior.docs.some((d) => !['declined', 'cancelled'].includes(d.data().status))
    let reviewReason: string | null = null
    if (totalUnits > maxPerOrder) reviewReason = `${totalUnits} unités — au-dessus de votre plafond de ${maxPerOrder} par commande`
    else if (firstOrder && totalUnits > firstOrderMax) reviewReason = `première commande de ${company.name || 'cet établissement'} — ${totalUnits} unités, plafond première commande ${firstOrderMax}`

    const orderTotal = lines.reduce((s, l) => s + l.lineTotal, 0)
    const deliveryFee = fulfilment === 'delivery' ? Math.max(0, Math.round(Number(supplier.deliveryFee) || 0)) : 0
    const commissionRate = typeof supplier.commissionRate === 'number' ? supplier.commissionRate : 0.1
    const commissionAmount = Math.round(orderTotal * commissionRate)
    const now = new Date()

    // Card on file: reuse the company's Stripe customer; a missing card gets a
    // setup session. Stripe being down must not block the order itself.
    const payment = emptyPayment()
    let setupUrl: string | null = null
    const orderRef = db.collection('supply_orders').doc()
    let stripeWarning: string | null = null
    try {
      const stripe = stripeClient()
      const cust = await customerFor(db, stripe, companyId, company.name || 'Palmera partner', caller.email)
      payment.customerId = cust.customerId
      payment.paymentMethodId = cust.paymentMethodId
      payment.cardLabel = cust.cardLabel
      payment.status = cust.paymentMethodId ? 'card_saved' : 'none'
      if (!cust.paymentMethodId) {
        const session = await createSetupSession(stripe, cust.customerId, orderRef.id, companyId)
        payment.setupSessionId = session.id
        setupUrl = session.url
      }
    } catch (e) {
      stripeWarning = e instanceof Error ? e.message : String(e)
      console.error('marketplace/orders stripe step failed:', stripeWarning)
    }

    type Stamps = 'createdAt' | 'updatedAt' | 'submittedAt' | 'acceptedAt' | 'handedOverAt' | 'reportedAt' | 'settledAt' | 'paidAt'
    const order: Omit<SupplyOrder, Stamps> & Record<Stamps, Date | null> = {
      partnerId: caller.uid, companyId, companyName: company.name || '',
      supplierId: supplierId!, supplierName: supplier.name || '',
      items: lines, fulfilment, deliveryFee, orderTotal, totalUnits, reviewReason,
      commissionRate, commissionAmount, supplierNet: orderTotal - commissionAmount,
      finalGoods: null, finalTotal: null, finalCommissionAmount: null, finalSupplierNet: null,
      paymentMethod: null, offPlatform: null,
      status: reviewReason ? 'pending_review' : 'submitted', note, declineReason: null, payment,
      createdAt: now, updatedAt: now, submittedAt: now, acceptedAt: null, handedOverAt: null, reportedAt: null, settledAt: null, paidAt: null,
    }
    await orderRef.set(order)
    const saved = await loadOrder(db, orderRef.id)
    void notify(db, 'supplier_new_order', saved)
    return NextResponse.json({ ok: true, orderId: orderRef.id, order: saved, setupUrl, ...(stripeWarning ? { warning: 'card setup unavailable right now' } : {}) })
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ ok: false, error: e.message }, { status: e.status })
    console.error('marketplace/orders failed:', e)
    return NextResponse.json({ ok: false, error: 'order failed' }, { status: 500 })
  }
}
