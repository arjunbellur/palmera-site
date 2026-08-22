// Admin: suspend / reinstate an app member's account.
//
// Suspension = Firebase Auth `disabled: true` + refresh tokens revoked: the
// member can't sign in, and their current session dies at its next token
// refresh (≤1h). Nothing app-side changes — no rules, no schema, no Samson.
// Every action is recorded in the dashboard-owned `admin_actions` collection.
//
//   GET  /api/admin/members?uid=…           → { disabled, email, lastSignIn }
//   POST /api/admin/members { action: 'suspend'|'reinstate', uid, reason }
import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from 'firebase-admin/auth'
import { adminDb } from '@/lib/firebase-admin'
import { ADMIN_EMAILS } from '@/lib/admin'

export const dynamic = 'force-dynamic'

async function requireAdmin(req: NextRequest) {
  adminDb() // initializes the admin app
  const token = (req.headers.get('authorization') || '').replace(/^Bearer /, '')
  if (!token) return null
  const decoded = await getAuth().verifyIdToken(token).catch(() => null)
  if (!decoded?.email || !decoded.email_verified || !ADMIN_EMAILS.includes(decoded.email)) return null
  return decoded
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req)
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const uid = req.nextUrl.searchParams.get('uid') || ''
  if (!/^[A-Za-z0-9]{10,128}$/.test(uid)) return NextResponse.json({ error: 'bad uid' }, { status: 400 })
  try {
    const u = await getAuth().getUser(uid)
    return NextResponse.json({ uid, disabled: u.disabled, email: u.email ?? null, emailVerified: u.emailVerified, lastSignIn: u.metadata.lastSignInTime ?? null, created: u.metadata.creationTime ?? null })
  } catch {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req)
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => null) as { action?: unknown; uid?: unknown; reason?: unknown } | null
  const action = body?.action === 'suspend' || body?.action === 'reinstate' ? body.action : null
  const uid = typeof body?.uid === 'string' && /^[A-Za-z0-9]{10,128}$/.test(body.uid) ? body.uid : null
  const reason = typeof body?.reason === 'string' ? body.reason.slice(0, 500) : ''
  if (!action || !uid) return NextResponse.json({ error: 'bad request' }, { status: 400 })
  if (uid === admin.uid) return NextResponse.json({ error: 'cannot act on your own account' }, { status: 400 })
  try {
    const target = await getAuth().getUser(uid)
    if (target.email && ADMIN_EMAILS.includes(target.email)) return NextResponse.json({ error: 'cannot suspend an admin' }, { status: 400 })
    const disabled = action === 'suspend'
    await getAuth().updateUser(uid, { disabled })
    if (disabled) await getAuth().revokeRefreshTokens(uid) // current sessions die at next refresh
    await adminDb().collection('admin_actions').add({
      kind: disabled ? 'member_suspended' : 'member_reinstated', targetUid: uid, targetEmail: target.email ?? null,
      reason, by: admin.email, at: new Date(),
    })
    return NextResponse.json({ ok: true, uid, disabled })
  } catch (e) {
    console.error('admin/members failed:', e)
    return NextResponse.json({ error: 'action failed' }, { status: 500 })
  }
}
