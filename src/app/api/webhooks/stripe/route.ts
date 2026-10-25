// Stripe webhook for the marketplace. Signature-verified; runs with the Admin
// SDK (rules keep supply_orders client-read-only). Handles:
//   • checkout.session.completed, mode=setup,   kind=supply_card       → card on file
//   • checkout.session.completed, mode=payment, kind=supply_settlement → order paid
//   • checkout.session.completed, mode=payment, kind=supply_order      → legacy v2 pre-purchase
//   • payment_intent.succeeded / payment_failed, kind=supply_settlement → off-session result
//   • charge.refunded on either kind → refunded / partialRefund
// The app's own Stripe sessions hit this endpoint too and are ignored.
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { adminDb } from '@/lib/firebase-admin'
import { saveCardFromSession, markPaidByCard, notify, loadOrder } from '@/lib/marketplace-server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const key = process.env.STRIPE_SECRET_KEY
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!key || !whSecret) return NextResponse.json({ error: 'not configured' }, { status: 503 })

  const stripe = new Stripe(key)
  let event: Stripe.Event
  try {
    // Raw body required — Next must not have parsed it.
    const raw = await req.text()
    event = stripe.webhooks.constructEvent(raw, req.headers.get('stripe-signature') || '', whSecret)
  } catch (e) {
    console.error('stripe webhook signature failed:', e)
    return NextResponse.json({ error: 'bad signature' }, { status: 400 })
  }

  try {
    const db = adminDb()

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      const kind = session.metadata?.kind, orderId = session.metadata?.orderId
      if (kind === 'supply_card' && session.mode === 'setup') {
        await saveCardFromSession(db, stripe, session)
        return NextResponse.json({ ok: true })
      }
      if (!orderId || (kind !== 'supply_settlement' && kind !== 'supply_order')) return NextResponse.json({ ok: true, ignored: true })
      // Async payment methods complete the session BEFORE money arrives.
      if (session.payment_status !== 'paid') return NextResponse.json({ ok: true, ignored: 'not paid yet' })
      if (kind === 'supply_settlement') {
        const pi = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id ?? null
        await markPaidByCard(db, orderId, pi)
        return NextResponse.json({ ok: true })
      }
      // Legacy v2 pre-purchase receipts (awaiting_payment → paid).
      const ref = db.collection('supply_orders').doc(orderId)
      const doc = await ref.get()
      if (doc.exists && doc.data()!.status === 'awaiting_payment') {
        await ref.update({ status: 'paid', paidAt: new Date(), updatedAt: new Date(), 'payment.status': 'completed' })
      }
    }

    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object
      if (pi.metadata?.kind === 'supply_settlement' && pi.metadata.orderId) await markPaidByCard(db, pi.metadata.orderId, pi.id)
    }

    if (event.type === 'payment_intent.payment_failed') {
      const pi = event.data.object
      if (pi.metadata?.kind === 'supply_settlement' && pi.metadata.orderId) {
        const ref = db.collection('supply_orders').doc(pi.metadata.orderId)
        const cur = (await ref.get()).data()
        if (cur && cur.status === 'settled') {
          const reason = pi.last_payment_error?.decline_code || pi.last_payment_error?.code || 'prélèvement refusé'
          await ref.set({ status: 'payment_due', payment: { status: 'failed', failureReason: String(reason).slice(0, 120) }, updatedAt: new Date() }, { merge: true })
          void notify(db, 'business_payment_due', await loadOrder(db, pi.metadata.orderId))
        }
      }
    }

    if (event.type === 'charge.refunded') {
      const charge = event.data.object
      const orderId = charge.metadata?.orderId
      if ((charge.metadata?.kind === 'supply_settlement' || charge.metadata?.kind === 'supply_order') && orderId) {
        const full = charge.amount_refunded >= charge.amount
        await db.collection('supply_orders').doc(orderId).set(full
          ? { status: 'refunded', updatedAt: new Date(), payment: { status: 'refunded' } }
          : { updatedAt: new Date(), payment: { partialRefund: charge.amount_refunded } }, { merge: true })
      }
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('stripe webhook handling failed:', e)
    return NextResponse.json({ error: 'handler failed' }, { status: 500 })
  }
}
