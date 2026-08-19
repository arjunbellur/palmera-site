// Stripe webhook for marketplace orders. Signature-verified; marks the order
// paid on checkout.session.completed and refunded on charge.refunded. Runs
// with the Admin SDK (rules keep money fields frozen for every client).
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { adminDb } from '@/lib/firebase-admin'

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
      const orderId = session.metadata?.orderId
      if (session.metadata?.kind !== 'supply_order' || !orderId) {
        // Not ours (the app's own checkout sessions hit this endpoint too).
        return NextResponse.json({ ok: true, ignored: true })
      }
      const ref = db.collection('supply_orders').doc(orderId)
      const doc = await ref.get()
      if (!doc.exists) { console.error('webhook: unknown order', orderId); return NextResponse.json({ ok: true }) }
      // Idempotent: a replayed event can't regress a later status.
      if (doc.data()!.status === 'awaiting_payment') {
        await ref.update({
          status: 'paid', paidAt: new Date(), updatedAt: new Date(),
          'payment.status': 'completed',
        })
      }
    }

    if (event.type === 'charge.refunded') {
      const charge = event.data.object
      // Find our order via the payment intent's session (metadata lives there).
      const piId = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id
      if (piId) {
        const stripe2 = new Stripe(key)
        const sessions = await stripe2.checkout.sessions.list({ payment_intent: piId, limit: 1 })
        const orderId = sessions.data[0]?.metadata?.orderId
        if (orderId && sessions.data[0]?.metadata?.kind === 'supply_order') {
          await db.collection('supply_orders').doc(orderId).update({
            status: 'refunded', updatedAt: new Date(), 'payment.status': 'refunded',
          })
        }
      }
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('stripe webhook handling failed:', e)
    return NextResponse.json({ error: 'handler failed' }, { status: 500 })
  }
}
