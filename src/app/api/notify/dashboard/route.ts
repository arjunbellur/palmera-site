// Dashboard-originated mails: staff invite, agreement countersigned, payout
// sent. Called from the browser right after the Firestore write that the
// mail announces, authenticated by the caller's Firebase ID token — the
// server re-checks that THIS user may trigger THIS mail (company owner for
// invites, admin for the other two) and reads every address and amount
// from Firestore itself, never from the request body. Best-effort by
// design: callers never block the write on the mail.
//
//   POST /api/notify/dashboard      Authorization: Bearer <Firebase ID token>
//   { kind: 'staff_invite', companyId, email, name? }
//   { kind: 'agreement_countersigned', providerId }
//   { kind: 'payout_sent', payoutId }
import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { sendEmail } from '@/lib/email'
import { ADMIN_EMAILS } from '@/lib/admin'
import { staffInvite, agreementCountersigned, payoutSent, maskEmail, type Rendered } from '@/lib/email-templates'

export const dynamic = 'force-dynamic'

type Doc = FirebaseFirestore.DocumentData
const KINDS = ['staff_invite', 'agreement_countersigned', 'payout_sent'] as const
type Kind = typeof KINDS[number]
const ID = /^[A-Za-z0-9_-]{4,128}$/
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Verify the ID token with a LAZY import: on Vercel `firebase-admin/auth`
 *  has failed to load before, and a module-level import would take the whole
 *  route down. A load failure is a 503 with the reason, never a 500. */
async function caller(req: NextRequest): Promise<{ uid: string; email: string | null; admin: boolean } | { error: string; status: number }> {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer /, '')
  if (!token) return { error: 'unauthorized', status: 401 }
  adminDb() // initializes the admin app
  try {
    const { getAuth } = await import('firebase-admin/auth')
    const decoded = await getAuth().verifyIdToken(token).catch(() => null)
    if (!decoded) return { error: 'unauthorized', status: 401 }
    const email = decoded.email_verified ? (decoded.email ?? null) : null
    return { uid: decoded.uid, email, admin: !!email && ADMIN_EMAILS.includes(email) }
  } catch (e) {
    const reason = `node ${process.version} · ` + (e instanceof Error ? `${e.name}: ${e.message}` : String(e)).slice(0, 180)
    console.error('firebase-admin/auth unavailable:', reason)
    return { error: `auth unavailable: ${reason}`, status: 503 }
  }
}

export async function POST(req: NextRequest) {
  const who = await caller(req)
  if ('error' in who) return NextResponse.json({ ok: false, error: who.error }, { status: who.status })
  const body = await req.json().catch(() => null) as Record<string, unknown> | null
  const kind = (KINDS as readonly string[]).includes(String(body?.kind)) ? body!.kind as Kind : null
  if (!kind) return NextResponse.json({ ok: false, error: 'bad request: unknown kind' }, { status: 400 })
  const str = (k: string) => typeof body?.[k] === 'string' ? (body[k] as string).trim() : ''

  try {
    const db = adminDb()
    let to: string | null = null
    let mail: Rendered | null = null
    const meta: Doc = {}

    if (kind === 'staff_invite') {
      const companyId = ID.test(str('companyId')) ? str('companyId') : null
      const email = str('email').toLowerCase()
      if (!companyId || !EMAIL.test(email)) return NextResponse.json({ ok: false, error: 'bad request: companyId + email' }, { status: 400 })
      const co = await db.collection('companies').doc(companyId).get()
      // Owner only — the same condition the `staff` create rule enforces.
      if (!co.exists || co.data()?.providerId !== who.uid) return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 })
      to = email
      mail = staffInvite({ companyName: co.data()?.name || 'votre établissement', name: str('name').slice(0, 80) || null })
      Object.assign(meta, { companyId, title: co.data()?.name ?? null })
    } else if (kind === 'agreement_countersigned') {
      if (!who.admin) return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 })
      const providerId = ID.test(str('providerId')) ? str('providerId') : null
      if (!providerId) return NextResponse.json({ ok: false, error: 'bad request: providerId' }, { status: 400 })
      const [prov, cs] = await db.getAll(db.collection('providers').doc(providerId), db.collection('countersignatures').doc(providerId))
      if (!prov.exists) return NextResponse.json({ ok: false, error: 'provider not found' }, { status: 404 })
      if (cs.data()?.status !== 'executed') return NextResponse.json({ ok: true, skipped: 'agreement not countersigned yet' })
      const p = prov.data() as Doc
      to = EMAIL.test(String(p.email || '')) ? String(p.email) : null
      mail = agreementCountersigned({ providerName: p.fullName || p.email || 'Partenaire', signatoryName: cs.data()?.signatoryName || 'Palmera', signatoryTitle: cs.data()?.signatoryTitle ?? null, agreementVersion: cs.data()?.agreementVersion ?? null })
      Object.assign(meta, { providerId, title: p.fullName ?? null })
    } else {
      if (!who.admin) return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 })
      const payoutId = ID.test(str('payoutId')) ? str('payoutId') : null
      if (!payoutId) return NextResponse.json({ ok: false, error: 'bad request: payoutId' }, { status: 400 })
      const po = await db.collection('payouts').doc(payoutId).get()
      if (!po.exists) return NextResponse.json({ ok: false, error: 'payout not found' }, { status: 404 })
      const pay = po.data() as Doc
      if (pay.status !== 'paid') return NextResponse.json({ ok: true, skipped: `payout status is ${pay.status}` })
      const [prov, co] = await db.getAll(db.collection('providers').doc(String(pay.providerId)), db.collection('companies').doc(String(pay.companyId || '_')))
      const p = prov.exists ? prov.data() as Doc : undefined
      if (p?.notificationPrefs?.payouts === false) return NextResponse.json({ ok: true, skipped: 'partner opted out of payout mails' })
      const addr = String(p?.email || co.data()?.email || '')
      to = EMAIL.test(addr) ? addr : null
      mail = payoutSent({ companyName: co.data()?.name || 'votre établissement', amount: Number(pay.netAmount) || 0, currency: String(pay.currency || 'XOF'), periodStart: pay.periodStart, periodEnd: pay.periodEnd, reference: pay.reference ?? null, method: pay.method ?? null })
      Object.assign(meta, { payoutId, providerId: pay.providerId, companyId: pay.companyId, title: co.data()?.name ?? null })
    }

    const logRef = db.collection('email_log').doc()
    if (!to) {
      await logRef.set({ kind: 'skipped', reason: `no email for ${kind}`, event: kind, by: who.uid, sentAt: new Date(), ...meta })
      return NextResponse.json({ ok: true, skipped: 'recipient has no email' })
    }
    try {
      await sendEmail({ to, ...mail! })
    } catch (e) {
      const reason = (e instanceof Error ? e.message : String(e)).slice(0, 200)
      console.error('notify/dashboard send failed', kind, reason)
      await logRef.set({ kind: 'send_failed', reason, event: kind, to, by: who.uid, sentAt: new Date(), ...meta })
      return NextResponse.json({ ok: true, failed: reason, to: maskEmail(to) })
    }
    await logRef.set({ kind, event: kind, to, by: who.uid, sentAt: new Date(), ...meta })
    return NextResponse.json({ ok: true, sent: true, to: maskEmail(to) })
  } catch (e) {
    console.error('notify/dashboard failed:', e)
    const reason = (e instanceof Error ? `${e.name}: ${e.message}` : String(e)).slice(0, 200)
    return NextResponse.json({ ok: false, error: 'notify failed', reason }, { status: 500 })
  }
}
