// Marketplace checkout: creates ONE supply_orders receipt + ONE Stripe
// Checkout session per submission (the app's duplicate-booking bug — SYNC
// item 17 — is designed out here, not patched later).
//
// The client sends only { items: [{productId, qty}], companyId, note } plus a
// Firebase ID token. Everything money-related — prices, totals, the
// commission split — is recomputed SERVER-SIDE from Firestore and frozen
// onto the order doc: a receipt, immune to later price/rate edits and to
// client tampering.
//
// XOF is a zero-decimal currency in Stripe: amounts are passed as whole
// francs, no ×100.
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { adminDb } from '@/lib/firebase-admin'
import { getAuth } from 'firebase-admin/auth'

export const dynamic = 'force-dynamic'

const SITE = 'https://www.palmeraexp.com'

export async function POST(req: NextRequest) {
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY
    if (!stripeKey) return NextResponse.json({ error: 'payments not configured' }, { status: 503 })

    const db = adminDb() // also initializes the admin app for getAuth()

    // Who is buying — verified, not claimed.
    const idToken = (req.headers.get('authorization') || '').replace('Bearer ', '')
    if (!idToken) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    const decoded = await getAuth().verifyIdToken(idToken).catch(() => null)
    if (!decoded) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => null) as {
      items?: unknown; companyId?: unknown; note?: unknown
    } | null
    const rawItems = Array.isArray(body?.items) ? body!.items : []
    const companyId = typeof body?.companyId === 'string' ? body.companyId : ''
    const note = typeof body?.note === 'string' ? body.note : ''
    if (rawItems.length === 0 || !companyId) return NextResponse.json({ error: 'empty order' }, { status: 400 })
    if (rawItems.length > 50) return NextResponse.json({ error: 'too many lines (max 50)' }, { status: 400 })
    // Strict shapes: a NaN qty must never reach the receipt or Stripe.
    const merged = new Map<string, number>()
    for (const it of rawItems as { productId?: unknown; qty?: unknown }[]) {
      const pid = typeof it?.productId === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(it.productId) ? it.productId : null
      const qty = typeof it?.qty === 'number' && Number.isInteger(it.qty) ? it.qty : NaN
      if (!pid || !(qty >= 1 && qty <= 999)) return NextResponse.json({ error: 'invalid line' }, { status: 400 })
      merged.set(pid, Math.min(999, (merged.get(pid) || 0) + qty))
    }
    const items = [...merged.entries()].map(([productId, qty]) => ({ productId, qty }))

    // The buying company must belong to the caller.
    const company = (await db.collection('companies').doc(companyId).get()).data()
    if (!company || company.providerId !== decoded.uid) {
      return NextResponse.json({ error: 'not your company' }, { status: 403 })
    }

    // Re-read every product; reject anything hidden or from a second supplier
    // (one order = one supplier, like ordering from one restaurant).
    const products = await Promise.all(items.map(i => db.collection('products').doc(i.productId).get()))
    const lines: { productId: string; name: string; unit: string; unitSize: string; unitPrice: number; qty: number; lineTotal: number }[] = []
    let supplierId: string | null = null
    for (let i = 0; i < items.length; i++) {
      const p = products[i].data()
      const qty = Math.floor(items[i].qty)
      if (!p || p.status !== 'live' || qty < 1 || qty > 999) {
        return NextResponse.json({ error: `unavailable product: ${items[i].productId}` }, { status: 409 })
      }
      if (supplierId && p.supplierId !== supplierId) {
        return NextResponse.json({ error: 'one supplier per order' }, { status: 400 })
      }
      supplierId = p.supplierId
      lines.push({
        productId: products[i].id, name: p.name, unit: p.unit, unitSize: p.unitSize || '',
        unitPrice: p.price, qty, lineTotal: p.price * qty,
      })
    }

    const supplierSnap = await db.collection('suppliers').doc(supplierId!).get()
    const supplier = supplierSnap.data()
    if (!supplier || supplier.status !== 'active') {
      return NextResponse.json({ error: 'supplier unavailable' }, { status: 409 })
    }

    // The receipt: split frozen NOW, from the supplier's current rate.
    const orderTotal = lines.reduce((s, l) => s + l.lineTotal, 0)
    const commissionRate = typeof supplier.commissionRate === 'number' ? supplier.commissionRate : 0.1
    const commissionAmount = Math.round(orderTotal * commissionRate)
    const now = new Date()
    const orderRef = db.collection('supply_orders').doc() // id only — nothing written yet

    // Stripe FIRST: if the session can't be created, no order doc is left
    // behind. Idempotency key = order id, so a double-submit can't double-charge.
    const stripe = new Stripe(stripeKey)
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      currency: 'xof',
      line_items: lines.map(l => ({
        price_data: {
          currency: 'xof',
          product_data: { name: `${l.name}${l.unitSize ? ` (${l.unitSize})` : ''}`.slice(0, 120) },
          unit_amount: l.unitPrice, // XOF is zero-decimal
        },
        quantity: l.qty,
      })),
      metadata: { orderId: orderRef.id, kind: 'supply_order' },
      // Copied onto the PaymentIntent → charge events carry it; the refund
      // webhook needs no sessions.list round trip.
      payment_intent_data: { metadata: { orderId: orderRef.id, kind: 'supply_order' } },
      success_url: `${SITE}/partner/marketplace?order=${orderRef.id}&pay=success`,
      cancel_url: `${SITE}/partner/marketplace?order=${orderRef.id}&pay=cancelled`,
    }, { idempotencyKey: `supply_order_${orderRef.id}` })

    await orderRef.set({
      partnerId: decoded.uid, companyId, companyName: company.name || '',
      supplierId, supplierName: supplier.name || '',
      items: lines, orderTotal, commissionRate, commissionAmount,
      supplierNet: orderTotal - commissionAmount,
      status: 'awaiting_payment', note: note.slice(0, 500),
      payment: { provider: 'stripe', sessionId: session.id, status: 'pending' },
      createdAt: now, updatedAt: now, paidAt: null, acceptedAt: null, deliveredAt: null,
    })
    return NextResponse.json({ orderId: orderRef.id, url: session.url })
  } catch (e) {
    console.error('marketplace/checkout failed:', e)
    return NextResponse.json({ error: 'checkout failed' }, { status: 500 })
  }
}
