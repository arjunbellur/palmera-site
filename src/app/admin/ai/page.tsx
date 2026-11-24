'use client'
// AI access — issue the personal connector URL a teammate adds to Claude or
// ChatGPT so their assistant can look things up and draft listings in
// Palmera. One key per person; the secret is shown once; revoking it cuts
// that assistant off at once. Everything the connector changes is listed
// under Activity. Server side: /api/mcp and src/lib/ai/*.
import { useState } from 'react'
import { auth } from '@/lib/firebase'
import { useSWRLite } from '@/lib/swr-lite'
import { ScreenHeader, Chip, Skeleton, EmptyState, Disclosure, eyebrow } from '@/components/partner/ui'
import { inputStyle, timeAgo, glass } from '../ui'
import { Bot, Copy, Check } from 'lucide-react'

type Scope = 'read' | 'write' | 'publish'
interface KeyRow { id: string; name: string; scopes: Scope[]; hint: string; createdBy: string; createdAt: string | null; lastUsedAt: string | null; uses: number; revokedAt: string | null }
interface AuditRow { id: string; keyName: string; tool: string; ok: boolean; summary: string; at: string | null }
const SCOPE_INFO: Record<Scope, { label: string; hint: string }> = {
  read: { label: 'Look things up', hint: 'Businesses, listings, bookings (first names only), Featured tonight, headline numbers.' },
  write: { label: 'Create and edit drafts', hint: 'New listings are saved as drafts. Listings that are not live can be edited.' },
  publish: { label: 'Go live', hint: 'Publish and unpublish, edit live listings, change Featured tonight. Members see these at once.' },
}
const small = { fontFamily: 'var(--font-sans)', fontSize: '11px', color: 'var(--pf-faint)' } as const
const btn = (primary: boolean) => ({ padding: '9px 16px', border: primary ? 'none' : '1px solid var(--pf-border-strong)', background: primary ? undefined : 'transparent', color: primary ? '#f4ecdb' : 'var(--pf-gold)', fontFamily: 'var(--font-sans)', fontSize: '11.5px', cursor: 'pointer' } as const)

async function api<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = await auth.currentUser?.getIdToken()
  const res = await fetch(path, { method, headers: { authorization: `Bearer ${token ?? ''}`, ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined })
  const data = await res.json().catch(() => null) as ({ ok?: boolean; error?: string } & T) | null
  if (!res.ok || !data?.ok) throw new Error(data?.error || `HTTP ${res.status}`)
  return data
}

function CopyField({ label, value }: { label: string; value: string }) {
  const [done, setDone] = useState(false)
  return (
    <div style={{ marginTop: '10px' }}>
      <div style={{ ...eyebrow, marginBottom: '5px' }}>{label}</div>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
        <code style={{ flex: 1, minWidth: 0, padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--pf-border)', background: 'var(--pf-card)', color: 'var(--pf-text)', fontFamily: 'var(--font-sans)', fontSize: '11.5px', overflowWrap: 'anywhere' }}>{value}</code>
        <button type="button" aria-label={`Copy ${label}`} className="pf-cap pf-cap-ghost" style={{ ...btn(false), display: 'flex', alignItems: 'center', gap: '6px' }}
          onClick={async () => { try { await navigator.clipboard.writeText(value); setDone(true); setTimeout(() => setDone(false), 1800) } catch { /* select and copy by hand */ } }}>
          {done ? <Check size={13} strokeWidth={1.75} /> : <Copy size={13} strokeWidth={1.75} />} {done ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  )
}

export default function AdminAiPage() {
  const { data, loaded, error, reload } = useSWRLite('admin:ai-keys', () => api<{ keys: KeyRow[]; audit: AuditRow[] }>('GET', '/api/admin/ai-keys'), [])
  const [name, setName] = useState('')
  const [scopes, setScopes] = useState<Scope[]>(['read', 'write'])
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')
  const [fresh, setFresh] = useState<{ name: string; key: string; url: string; headerUrl: string } | null>(null)
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null)

  if (!loaded) return <div className="pf-in"><Skeleton height="74px" style={{ maxWidth: '30rem', marginBottom: '22px' }} /><Skeleton height="260px" /></div>

  const keys = data?.keys ?? [], audit = data?.audit ?? []
  const active = keys.filter((k) => !k.revokedAt)
  const toggle = (s: Scope) => setScopes((cur) => (s === 'read' ? cur : cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]))
  const create = async () => {
    if (!name.trim()) { setFormError('Say who this key is for.'); return }
    setBusy(true); setFormError('')
    try {
      const r = await api<{ key: string; url: string; headerUrl: string }>('POST', '/api/admin/ai-keys', { name, scopes })
      setFresh({ name: name.trim(), ...r }); setName(''); await reload()
    } catch (e) { setFormError(e instanceof Error ? e.message : 'Could not create the key.') }
    setBusy(false)
  }
  const revoke = async (id: string) => {
    setBusy(true)
    try { await api('DELETE', `/api/admin/ai-keys?id=${id}`); setConfirmRevoke(null); await reload() } catch (e) { setFormError(e instanceof Error ? e.message : 'Could not revoke.') }
    setBusy(false)
  }

  return (
    <div className="pf-in">
      <ScreenHeader label="Palmera HQ" title="AI access" intro="Connect Claude or ChatGPT to Palmera. Each person gets their own connector link; their assistant can then look things up and draft listings for them." />
      {error ? <p style={{ ...small, color: 'var(--pf-alert)' }}>Could not load keys: {error instanceof Error ? error.message : String(error)}</p> : null}

      {fresh && (
        <div className="pf-glass pf-glass-gold" style={{ ...glass, marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <Chip tone="gold">Shown once</Chip>
            <span style={{ fontFamily: 'var(--font-serif)', color: 'var(--pf-text)', fontSize: '14px' }}>Connector for {fresh.name}. Copy it now; it cannot be shown again.</span>
          </div>
          <CopyField label="Connector URL (Claude and ChatGPT)" value={fresh.url} />
          <p style={{ ...small, margin: '10px 0 0' }}>
            <strong>Claude</strong> (any plan): open claude.ai/customize/connectors → Add → Add custom connector → name it Palmera, paste the URL → Continue → Add.
            {' '}<strong>ChatGPT</strong> (web): Plugins → + → Add custom MCP server → name it Palmera, paste the URL → Create as a plugin. ChatGPT only lets Business, Enterprise and Edu workspaces make changes; on Pro it can look things up but not draft.
          </p>
          <p style={{ ...small, margin: '6px 0 0' }}>
            Treat the link like a password: anyone who has it can act with this key&apos;s permissions until it is revoked here.
          </p>
          <Disclosure id="ai.header" title="For tools that send a header" summary="Claude Code, API clients">
            <CopyField label="Endpoint" value={fresh.headerUrl} />
            <CopyField label="Authorization header" value={`Bearer ${fresh.key}`} />
          </Disclosure>
          <button type="button" onClick={() => setFresh(null)} style={{ ...small, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--pf-gold)', padding: 0, marginTop: '6px' }}>I have copied it</button>
        </div>
      )}

      <div className="pf-glass" style={{ ...glass, marginBottom: '14px' }}>
        <div style={eyebrow}>New connector</div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', marginTop: '10px' }}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Who is it for — e.g. Jordan · ChatGPT" aria-label="Who the connector is for" maxLength={60} style={{ ...inputStyle, flex: '1 1 16rem' }} />
          <button type="button" disabled={busy} onClick={create} className="pf-cap pf-cap-primary" style={btn(true)}>{busy ? 'Working…' : 'Create connector link'}</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 15rem), 1fr))', gap: '10px', marginTop: '12px' }}>
          {(Object.keys(SCOPE_INFO) as Scope[]).map((s) => {
            const on = scopes.includes(s)
            return (
              <label key={s} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '11px 12px', borderRadius: '12px', border: `1px solid ${on ? 'var(--pf-border-strong)' : 'var(--pf-border)'}`, background: on ? 'var(--pf-card)' : 'transparent', cursor: s === 'read' ? 'default' : 'pointer' }}>
                <input type="checkbox" checked={on} disabled={s === 'read'} onChange={() => toggle(s)} style={{ marginTop: '2px', accentColor: 'var(--pf-gold)' }} />
                <span>
                  <span style={{ display: 'block', fontFamily: 'var(--font-serif)', color: 'var(--pf-text)', fontSize: '13.5px' }}>{SCOPE_INFO[s].label}{s === 'publish' ? ' ' : ''}{s === 'publish' && <Chip tone="alert">live</Chip>}</span>
                  <span style={{ ...small, display: 'block', marginTop: '3px' }}>{SCOPE_INFO[s].hint}</span>
                </span>
              </label>
            )
          })}
        </div>
        {formError && <p style={{ ...small, color: 'var(--pf-alert)', margin: '10px 0 0' }}>{formError}</p>}
      </div>

      <div style={eyebrow}>Connectors · {active.length} active</div>
      {keys.length === 0 ? (
        <div style={{ marginTop: '10px' }}><EmptyState icon={<Bot size={22} strokeWidth={1.75} />} title="No connectors yet" body="Create one above and paste its link into Claude or ChatGPT. Until a key exists, the endpoint answers nobody." /></div>
      ) : (
        <div className="pf-glass" style={{ ...glass, padding: '6px 16px', marginTop: '10px' }}>
          {keys.map((k, i) => (
            <div key={k.id} style={{ padding: '12px 0', borderTop: i ? '1px solid var(--pf-border)' : 'none', opacity: k.revokedAt ? 0.55 : 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                <span style={{ minWidth: 0 }}>
                  <span style={{ fontFamily: 'var(--font-serif)', color: 'var(--pf-text)', fontSize: '14px', display: 'block' }}>{k.name}</span>
                  <span style={small}>{k.hint} · created {k.createdAt ? timeAgo(new Date(k.createdAt)) : '—'} by {k.createdBy} · {k.lastUsedAt ? `last used ${timeAgo(new Date(k.lastUsedAt))}` : 'never used'}</span>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  {k.scopes.map((s) => <Chip key={s} tone={s === 'publish' ? 'alert' : s === 'write' ? 'gold' : 'neutral'}>{s}</Chip>)}
                  {k.revokedAt ? <Chip tone="neutral">revoked</Chip>
                    : confirmRevoke === k.id
                      ? <><button type="button" disabled={busy} onClick={() => revoke(k.id)} className="pf-cap" style={{ ...btn(false), color: 'var(--pf-alert)', borderColor: 'var(--pf-alert)' }}>Revoke now</button><button type="button" onClick={() => setConfirmRevoke(null)} style={{ ...small, background: 'transparent', border: 'none', cursor: 'pointer' }}>Keep</button></>
                      : <button type="button" onClick={() => setConfirmRevoke(k.id)} className="pf-cap pf-cap-ghost" style={{ ...btn(false), color: 'var(--pf-muted)' }}>Revoke…</button>}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Disclosure id="ai.activity" title="Activity" defaultOpen={audit.length > 0} summary={audit.length ? `${audit.length} recent change(s) · last ${audit[0].at ? timeAgo(new Date(audit[0].at)) : ''}` : 'nothing yet'}>
        {audit.length === 0 ? <p style={{ ...small, fontStyle: 'italic', margin: 0 }}>Every change a connector makes is listed here, with who made it.</p> : audit.map((a, i) => (
          <div key={a.id} style={{ display: 'flex', gap: '10px', alignItems: 'baseline', padding: '8px 0', borderTop: i ? '1px solid var(--pf-border)' : 'none', flexWrap: 'wrap' }}>
            <Chip tone={a.ok ? 'green' : 'alert'}>{a.tool}</Chip>
            <span style={{ fontFamily: 'var(--font-serif)', color: 'var(--pf-text)', fontSize: '13px', flex: '1 1 16rem', minWidth: 0 }}>{a.summary}</span>
            <span style={small}>{a.keyName} · {a.at ? timeAgo(new Date(a.at)) : ''}</span>
          </div>
        ))}
      </Disclosure>
    </div>
  )
}
