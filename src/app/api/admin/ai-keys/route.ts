// Admin: issue, list and revoke AI connector access keys, and read the
// connector's audit trail. `ai_keys` / `ai_audit` have no client rule, so
// /admin/ai goes through here with the admin's ID token.
//
//   GET    /api/admin/ai-keys            → { keys, audit }
//   POST   /api/admin/ai-keys            { name, scopes } → { key, url } (the key is shown ONCE)
//   DELETE /api/admin/ai-keys?id=<id>    → revoke
import { NextRequest, NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { adminDb } from '@/lib/firebase-admin'
import { ADMIN_EMAILS } from '@/lib/admin'
import { AI_SCOPES, mintKey, type AiScope } from '@/lib/ai/keys'

export const dynamic = 'force-dynamic'

async function adminEmail(req: NextRequest): Promise<string | null> {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer /, '')
  if (!token) return null
  adminDb()
  const { getAuth } = await import('firebase-admin/auth')
  const decoded = await getAuth().verifyIdToken(token).catch(() => null)
  return decoded?.email && decoded.email_verified && ADMIN_EMAILS.includes(decoded.email) ? decoded.email : null
}
const iso = (v: unknown) => { const t = v as { toDate?: () => Date } | undefined; return typeof t?.toDate === 'function' ? t.toDate().toISOString() : null }
const fail = (status: number, error: string) => NextResponse.json({ ok: false, error }, { status })

export async function GET(req: NextRequest) {
  try {
    if (!(await adminEmail(req))) return fail(401, 'unauthorized')
    const db = adminDb()
    const [keys, audit] = await Promise.all([db.collection('ai_keys').get(), db.collection('ai_audit').orderBy('at', 'desc').limit(40).get()])
    return NextResponse.json({
      ok: true,
      keys: keys.docs.map((d) => { const x = d.data(); return { id: d.id, name: x.name || '', scopes: x.scopes || [], hint: x.hint || '', createdBy: x.createdBy || '', createdAt: iso(x.createdAt), lastUsedAt: iso(x.lastUsedAt), uses: x.uses || 0, revokedAt: iso(x.revokedAt) } })
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))),
      audit: audit.docs.map((d) => { const x = d.data(); return { id: d.id, keyName: x.keyName || '', tool: x.tool || '', ok: !!x.ok, summary: x.summary || '', targetId: x.targetId ?? null, at: iso(x.at) } }),
    })
  } catch (e) { console.error('ai-keys GET failed', e); return fail(500, 'read failed') }
}

export async function POST(req: NextRequest) {
  try {
    const email = await adminEmail(req)
    if (!email) return fail(401, 'unauthorized')
    const body = await req.json().catch(() => null) as { name?: unknown; scopes?: unknown } | null
    const name = String(body?.name ?? '').trim().slice(0, 60)
    const scopes = (Array.isArray(body?.scopes) ? body!.scopes : []).filter((s): s is AiScope => (AI_SCOPES as readonly string[]).includes(String(s)))
    if (!name) return fail(400, 'name is required (who is this key for?)')
    if (!scopes.includes('read')) scopes.unshift('read')   // every key can look things up
    const { raw, id } = mintKey()
    await adminDb().collection('ai_keys').doc(id).set({ name, scopes: [...new Set(scopes)], hint: `${raw.slice(0, 8)}…${raw.slice(-4)}`, createdBy: email, createdAt: FieldValue.serverTimestamp(), uses: 0, revokedAt: null })
    const origin = req.nextUrl.origin
    return NextResponse.json({ ok: true, id, key: raw, url: `${origin}/api/mcp/${raw}`, headerUrl: `${origin}/api/mcp` })
  } catch (e) { console.error('ai-keys POST failed', e); return fail(500, 'could not create the key') }
}

export async function DELETE(req: NextRequest) {
  try {
    const email = await adminEmail(req)
    if (!email) return fail(401, 'unauthorized')
    const id = req.nextUrl.searchParams.get('id') || ''
    if (!/^[a-f0-9]{64}$/.test(id)) return fail(400, 'bad id')
    const ref = adminDb().collection('ai_keys').doc(id)
    if (!(await ref.get()).exists) return fail(404, 'not found')
    await ref.set({ revokedAt: FieldValue.serverTimestamp(), revokedBy: email }, { merge: true })
    return NextResponse.json({ ok: true })
  } catch (e) { console.error('ai-keys DELETE failed', e); return fail(500, 'could not revoke') }
}
