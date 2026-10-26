// POST /api/marketplace/orders/{id} { action, …args } — every dépôt-vente
// transition (docs/marketplace-api.md). Roles are re-derived from the token
// on each call; money is recomputed here and never trusted from the client.
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { adminDb } from '@/lib/firebase-admin'
import type { SupplyOrder } from '@/lib/schema'
import {
  HttpError, SITE, type Actor, type OrderDoc,
  requireCaller, stripeClient, loadOrder, actorsFor, parseReturned, computeSettlement,
  takeStock, giveBackStock, writeLedger, markPaidByCard, customerFor, createSetupSession, notify,
} from '@/lib/marketplace-server'

export const dynamic = 'force-dynamic'

const ACTIONS = ['setup_card', 'cancel', 'accept', 'decline', 'hand_over', 'report', 'settle', 'pay_now', 'record_payment', 'mark_paid'] as const
type Action = typeof ACTIONS[number]
const WHO: Record<Action, Actor[]> = {
  setup_card: ['buyer'], cancel: ['buyer', 'admin'], accept: ['supplier', 'admin'], decline: ['supplier', 'admin'],
  hand_over: ['supplier', 'admin'], report: ['buyer', 'admin'], settle: ['supplier', 'admin'], pay_now: ['buyer'],
  record_payment: ['supplier', 'admin'], mark_paid: ['admin'],
}
const FROM: Record<Action, SupplyOrder['status'][]> = {
  setup_card: ['submitted', 'pending_review', 'accepted', 'handed_over', 'reported', 'settled', 'payment_due'],
  cancel: ['submitted', 'pending_review', 'accepted'],
  accept: ['submitted', 'pending_review'], decline: ['submitted', 'pending_review'],
  hand_over: ['accepted'], report: ['handed_over'], settle: ['handed_over', 'reported'],
  pay_now: ['settled', 'payment_due'], record_payment: ['settled', 'payment_due'], mark_paid: ['settled', 'payment_due'],
}
const OFF_METHODS = ['cash', 'wave', 'orange_money', 'other'] as const

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    const caller = await requireCaller(req)
    const db = adminDb()
    const body = await req.json().catch(() => null) as Record<string, unknown> | null
    const action = (ACTIONS as readonly string[]).includes(String(body?.action)) ? body!.action as Action : null
    if (!action) throw new HttpError(400, 'unknown action')
    const str = (k: string, max: number) => (typeof body?.[k] === 'string' ? (body[k] as string).trim().slice(0, max) : '')

    let order = await loadOrder(db, id)
    const roles = await actorsFor(db, order, caller)
    if (!WHO[action].some((r) => roles.has(r))) throw new HttpError(403, 'forbidden')
    if (!FROM[action].includes(order.status)) throw new HttpError(409, `cannot ${action} an order that is ${order.status}`)
    const ref = db.collection('supply_orders').doc(order.id)
    const now = new Date()

    switch (action) {
      case 'setup_card': {
        const stripe = stripeClient()
        const cust = await customerFor(db, stripe, order.companyId, order.companyName, caller.email)
        if (cust.paymentMethodId) {
          await ref.set({ payment: { customerId: cust.customerId, paymentMethodId: cust.paymentMethodId, cardLabel: cust.cardLabel, status: 'card_saved' }, updatedAt: now }, { merge: true })
          return NextResponse.json({ ok: true, url: null, cardLabel: cust.cardLabel, order: await loadOrder(db, order.id) })
        }
        const session = await createSetupSession(stripe, cust.customerId, order.id, order.companyId)
        await ref.set({ payment: { customerId: cust.customerId, setupSessionId: session.id }, updatedAt: now }, { merge: true })
        return NextResponse.json({ ok: true, url: session.url })
      }

      case 'cancel': {
        await db.runTransaction(async (tx) => {
          const cur = (await tx.get(ref)).data() as SupplyOrder
          if (!FROM.cancel.includes(cur.status)) throw new HttpError(409, `order is ${cur.status}`)
          if (cur.status === 'accepted') giveBackStock(tx, db, cur.items.map((i) => ({ productId: i.productId, qty: i.qty })))
          tx.update(ref, { status: 'cancelled', updatedAt: now })
        })
        break
      }

      case 'accept': {
        await db.runTransaction(async (tx) => {
          const cur = (await tx.get(ref)).data() as SupplyOrder
          if (!FROM.accept.includes(cur.status)) throw new HttpError(409, `order is ${cur.status}`)
          await takeStock(tx, db, cur.items)
          tx.update(ref, { status: 'accepted', acceptedAt: now, updatedAt: now })
        })
        break
      }

      case 'decline': {
        const reason = str('reason', 300)
        await ref.update({ status: 'declined', declineReason: reason || null, updatedAt: now })
        order = await loadOrder(db, order.id)
        void notify(db, 'business_declined', order)
        return NextResponse.json({ ok: true, order })
      }

      case 'hand_over': {
        await ref.update({ status: 'handed_over', handedOverAt: now, updatedAt: now })
        break
      }

      case 'report': {
        const returned = parseReturned(order, body?.returned)
        const items = order.items.map((i) => i.mode === 'borrow' ? { ...i, reportedReturnedQty: returned.has(i.productId) ? returned.get(i.productId)! : (i.reportedReturnedQty ?? 0) } : i)
        await ref.update({ items, status: 'reported', reportedAt: now, updatedAt: now })
        order = await loadOrder(db, order.id)
        void notify(db, 'supplier_reported', order)
        return NextResponse.json({ ok: true, order })
      }

      case 'settle': {
        const verified = parseReturned(order, body?.returned)
        const s = computeSettlement(order, verified)
        await db.runTransaction(async (tx) => {
          const cur = (await tx.get(ref)).data() as SupplyOrder
          if (!FROM.settle.includes(cur.status)) throw new HttpError(409, `order is ${cur.status}`)
          giveBackStock(tx, db, s.restock)
          tx.update(ref, {
            items: s.items, finalGoods: s.finalGoods, finalTotal: s.finalTotal,
            finalCommissionAmount: s.finalCommissionAmount, finalSupplierNet: s.finalSupplierNet,
            status: 'settled', settledAt: now, updatedAt: now,
          })
        })
        order = await loadOrder(db, order.id)
        await chargeSettlement(db, order)
        order = await loadOrder(db, order.id)
        return NextResponse.json({ ok: true, order })
      }

      case 'pay_now': {
        const amount = order.finalTotal || 0
        if (amount <= 0) throw new HttpError(409, 'nothing to pay')
        const stripe = stripeClient()
        // Reuse an open session rather than minting one per click.
        if (order.payment?.checkoutSessionId) {
          const prev = await stripe.checkout.sessions.retrieve(order.payment.checkoutSessionId).catch(() => null)
          if (prev && prev.status === 'open' && prev.url) return NextResponse.json({ ok: true, url: prev.url })
        }
        const session = await stripe.checkout.sessions.create({
          mode: 'payment', currency: 'xof',
          ...(order.payment?.customerId ? { customer: order.payment.customerId } : {}),
          line_items: [{ price_data: { currency: 'xof', product_data: { name: `Dépôt-vente ${order.supplierName} — décompte`.slice(0, 120) }, unit_amount: amount }, quantity: 1 }],
          metadata: { kind: 'supply_settlement', orderId: order.id },
          payment_intent_data: { metadata: { kind: 'supply_settlement', orderId: order.id } },
          success_url: `${SITE}/partner/marketplace?order=${order.id}&pay=success`,
          cancel_url: `${SITE}/partner/marketplace?order=${order.id}&pay=cancelled`,
        })
        await ref.set({ payment: { checkoutSessionId: session.id, status: 'pending' }, updatedAt: now }, { merge: true })
        return NextResponse.json({ ok: true, url: session.url })
      }

      case 'record_payment':
      case 'mark_paid': {
        const method = (OFF_METHODS as readonly string[]).includes(String(body?.method)) ? body!.method as typeof OFF_METHODS[number] : 'other'
        const note = str('note', 200)
        await db.runTransaction(async (tx) => {
          const cur = (await tx.get(ref)).data() as SupplyOrder
          if (!FROM.record_payment.includes(cur.status)) throw new HttpError(409, `order is ${cur.status}`)
          tx.update(ref, {
            status: 'paid', paymentMethod: 'off_platform', paidAt: now, updatedAt: now,
            offPlatform: { method, note, recordedBy: caller.uid },
            'payment.status': 'none', 'payment.failureReason': null,
          })
        })
        order = await loadOrder(db, order.id)
        // Paid outside Palmera: the supplier holds the whole amount, so the
        // commission is now OWED to Palmera — a negative ledger line.
        await writeLedger(db, order, 'commission_owed', -(order.finalCommissionAmount || 0))
        void notify(db, 'business_paid', order)
        return NextResponse.json({ ok: true, order })
      }
    }
    return NextResponse.json({ ok: true, order: await loadOrder(db, order.id) })
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ ok: false, error: e.message }, { status: e.status })
    console.error('marketplace/orders/[id] failed:', e)
    return NextResponse.json({ ok: false, error: 'action failed' }, { status: 500 })
  }
}

/** After `settle`: charge the card on file off-session, or park the order
 *  in payment_due with a plain reason. Never throws. */
async function chargeSettlement(db: FirebaseFirestore.Firestore, order: OrderDoc) {
  const ref = db.collection('supply_orders').doc(order.id)
  const amount = order.finalTotal || 0
  const now = new Date()
  if (amount <= 0) {
    await ref.update({ status: 'paid', paymentMethod: 'card', paidAt: now, updatedAt: now })
    return
  }
  const due = async (reason: string) => {
    await ref.set({ status: 'payment_due', payment: { status: 'failed', failureReason: reason }, updatedAt: now }, { merge: true })
    void notify(db, 'business_payment_due', await loadOrder(db, order.id))
  }
  const pm = order.payment?.paymentMethodId, customer = order.payment?.customerId
  if (!pm || !customer) { await due('aucune carte enregistrée'); return }
  let stripe: Stripe
  try { stripe = stripeClient() } catch { await due('paiement indisponible'); return }
  try {
    const pi = await stripe.paymentIntents.create({
      amount, currency: 'xof', customer, payment_method: pm, off_session: true, confirm: true,
      description: `Palmera dépôt-vente — ${order.supplierName} → ${order.companyName}`,
      metadata: { kind: 'supply_settlement', orderId: order.id, companyId: order.companyId, supplierId: order.supplierId },
    }, { idempotencyKey: `settle_${order.id}` })
    if (pi.status === 'succeeded') { await markPaidByCard(db, order.id, pi.id); return }
    await ref.set({ payment: { paymentIntentId: pi.id } }, { merge: true })
    if (pi.status === 'processing') return // webhook (payment_intent.succeeded) finishes it
    await due(pi.status === 'requires_action' ? 'authentification bancaire requise' : `statut ${pi.status}`)
  } catch (e) {
    const err = e as Stripe.errors.StripeError & { payment_intent?: Stripe.PaymentIntent }
    const reason = err?.code === 'authentication_required' ? 'authentification bancaire requise'
      : err?.decline_code ? `carte refusée (${err.decline_code})`
      : err?.code === 'card_declined' ? 'carte refusée'
      : (err?.message || 'prélèvement refusé').slice(0, 120)
    if (err?.payment_intent?.id) await ref.set({ payment: { paymentIntentId: err.payment_intent.id } }, { merge: true })
    console.error('settlement charge failed', order.id, reason)
    await due(reason)
  }
}
