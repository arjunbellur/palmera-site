// AI connector access keys (server-only). An admin mints a key in /admin/ai
// and gives the connector URL to one person; their Claude or ChatGPT then
// calls /api/mcp with it. Only a SHA-256 of the key is stored — the doc id —
// so a leaked database cannot be replayed. Collections `ai_keys` and
// `ai_audit` have no client rule: only the Admin SDK reads or writes them.
import { createHash, randomBytes } from 'node:crypto'
import { FieldValue } from 'firebase-admin/firestore'
import { adminDb } from '@/lib/firebase-admin'

/** read = look things up · write = create and edit DRAFT listings ·
 *  publish = anything a member sees at once (publish/unpublish, edit a live
 *  listing, Featured tonight). */
export const AI_SCOPES = ['read', 'write', 'publish'] as const
export type AiScope = (typeof AI_SCOPES)[number]

export interface AiKeyCtx { id: string; name: string; scopes: AiScope[] }

const KEY_RE = /^pal_[A-Za-z0-9_-]{43}$/
const hashKey = (raw: string) => createHash('sha256').update(raw).digest('hex')

export function mintKey(): { raw: string; id: string } {
  const raw = `pal_${randomBytes(32).toString('base64url')}`
  return { raw, id: hashKey(raw) }
}

/** The key's owner and scopes, or null when it is unknown, malformed or revoked. */
export async function verifyKey(raw: string | null | undefined): Promise<AiKeyCtx | null> {
  if (!raw || !KEY_RE.test(raw)) return null
  const ref = adminDb().collection('ai_keys').doc(hashKey(raw))
  const snap = await ref.get()
  if (!snap.exists) return null
  const d = snap.data() || {}
  if (d.revokedAt) return null
  // Last-used stamp, at most once a minute so a burst of tool calls is one write.
  const last = typeof d.lastUsedAt?.toMillis === 'function' ? d.lastUsedAt.toMillis() : 0
  if (Date.now() - last > 60_000) await ref.set({ lastUsedAt: FieldValue.serverTimestamp(), uses: FieldValue.increment(1) }, { merge: true }).catch(() => {})
  const scopes = (Array.isArray(d.scopes) ? d.scopes : []).filter((s: unknown): s is AiScope => (AI_SCOPES as readonly string[]).includes(String(s)))
  return { id: snap.id, name: String(d.name || 'key'), scopes }
}

/** One row per tool call that changed something (and per refused call). */
export async function logAudit(key: AiKeyCtx, tool: string, args: unknown, outcome: { ok: boolean; summary: string; targetId?: string | null }) {
  let argText = ''
  try { argText = JSON.stringify(args).slice(0, 4000) } catch { argText = '[unserializable]' }
  await adminDb().collection('ai_audit').add({
    keyId: key.id, keyName: key.name, tool, args: argText,
    ok: outcome.ok, summary: outcome.summary.slice(0, 500), targetId: outcome.targetId ?? null,
    at: FieldValue.serverTimestamp(),
  }).catch((e) => console.error('ai_audit write failed', e))
}
