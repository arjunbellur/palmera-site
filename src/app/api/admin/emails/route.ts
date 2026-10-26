// Admin: the last 200 rows of `email_log`, newest first, addresses masked.
//
// `email_log` has no client read rule (dashboard-owned, server-written), so
// /admin/emails reads it through here with the admin's ID token rather than
// widening firestore.rules — which are shared with the app.
//
//   GET /api/admin/emails     Authorization: Bearer <Firebase ID token>
import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { ADMIN_EMAILS } from '@/lib/admin'
import { maskEmail } from '@/lib/email-templates'

export const dynamic = 'force-dynamic'

const LIMIT = 200

export async function GET(req: NextRequest) {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer /, '')
  if (!token) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  adminDb()
  // Lazy + defensive import: see /api/notify/dashboard for why.
  try {
    const { getAuth } = await import('firebase-admin/auth')
    const decoded = await getAuth().verifyIdToken(token).catch(() => null)
    if (!decoded?.email || !decoded.email_verified || !ADMIN_EMAILS.includes(decoded.email)) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
    }
  } catch (e) {
    const reason = (e instanceof Error ? `${e.name}: ${e.message}` : String(e)).slice(0, 180)
    return NextResponse.json({ ok: false, error: `auth unavailable: ${reason}` }, { status: 503 })
  }

  try {
    const snap = await adminDb().collection('email_log').orderBy('sentAt', 'desc').limit(LIMIT).get()
    const toIso = (v: unknown) => {
      const t = v as { toDate?: () => Date } | undefined
      return typeof t?.toDate === 'function' ? t.toDate().toISOString() : null
    }
    const rows = snap.docs.map(d => {
      const x = d.data()
      return {
        id: d.id,
        kind: String(x.kind || ''),
        event: x.event ?? null,
        to: maskEmail(x.to),
        sentAt: toIso(x.sentAt),
        title: x.title ?? null,
        bookingId: x.bookingId ?? (x.party ? d.id.split('_')[0] : null),
        reason: x.reason ?? null,
        via: x.via ?? null,
      }
    })
    return NextResponse.json({ ok: true, rows })
  } catch (e) {
    console.error('admin/emails failed:', e)
    const reason = (e instanceof Error ? `${e.name}: ${e.message}` : String(e)).slice(0, 200)
    return NextResponse.json({ ok: false, error: 'read failed', reason }, { status: 500 })
  }
}
