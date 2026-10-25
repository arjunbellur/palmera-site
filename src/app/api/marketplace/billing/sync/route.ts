// POST /api/marketplace/billing/sync { orderId } — the business is back from
// the Stripe setup session: pull the saved card onto the company + order
// without waiting for the webhook. Idempotent; the webhook does the same.
import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { HttpError, requireCaller, stripeClient, loadOrder, saveCardFromSession } from '@/lib/marketplace-server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const caller = await requireCaller(req)
    const db = adminDb()
    const body = await req.json().catch(() => null) as { orderId?: unknown } | null
    const order = await loadOrder(db, typeof body?.orderId === 'string' ? body.orderId : '')
    if (order.partnerId !== caller.uid && !caller.admin) throw new HttpError(403, 'forbidden')
    if (order.payment?.paymentMethodId) return NextResponse.json({ ok: true, cardLabel: order.payment.cardLabel })
    const sessionId = order.payment?.setupSessionId
    if (!sessionId) throw new HttpError(409, 'no card setup in progress for this order')
    const stripe = stripeClient()
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    if (session.status !== 'complete') return NextResponse.json({ ok: true, pending: true })
    const saved = await saveCardFromSession(db, stripe, session)
    if (!saved) return NextResponse.json({ ok: true, pending: true })
    return NextResponse.json({ ok: true, cardLabel: saved.cardLabel })
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ ok: false, error: e.message }, { status: e.status })
    console.error('billing/sync failed:', e)
    return NextResponse.json({ ok: false, error: 'sync failed' }, { status: 500 })
  }
}
