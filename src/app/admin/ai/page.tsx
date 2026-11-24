'use client'
// AI access — connect your own Claude or ChatGPT to Palmera from here.
// "Connect Claude" makes a private connector link for the person at the
// keyboard and walks them through pasting it into their assistant; no one
// has to issue or hand over anything. Each connection is its own key, shown
// once, and can be disconnected below. Everything a connection changes is
// listed under Activity. Server side: /api/mcp and src/lib/ai/*.
import { useState, type ReactNode } from 'react'
import { auth } from '@/lib/firebase'
import { useSWRLite } from '@/lib/swr-lite'
import { ScreenHeader, Chip, Skeleton, Disclosure, eyebrow } from '@/components/partner/ui'
import { inputStyle, timeAgo, glass } from '../ui'
import { Copy, Check, ExternalLink } from 'lucide-react'

type Scope = 'read' | 'write' | 'publish'
type Client = 'claude' | 'chatgpt' | 'other'
interface KeyRow { id: string; name: string; client: Client; scopes: Scope[]; hint: string; createdBy: string; createdAt: string | null; lastUsedAt: string | null; uses: number; revokedAt: string | null }
interface AuditRow { id: string; keyName: string; tool: string; ok: boolean; summary: string; at: string | null }
interface Fresh { client: Client; name: string; key: string; url: string; headerUrl: string }

const CLIENTS: Record<'claude' | 'chatgpt', { label: string; blurb: string; openStep: string; openUrl: string; openLabel: string; steps: string[]; note?: string }> = {
  claude: {
    label: 'Claude', blurb: 'Works on every Claude plan, on the web and in the apps.',
    openStep: 'Open the connectors page in Claude.', openUrl: 'https://claude.ai/customize/connectors', openLabel: 'Open Claude connectors',
    steps: ['Click Add, then Add custom connector.', 'Name it Palmera, paste your link as the URL, then Continue and Add.', 'Start a chat and ask: “Give me an overview of Palmera.”'],
  },
  chatgpt: {
    label: 'ChatGPT', blurb: 'On the web. Drafting needs a Business, Enterprise or Edu workspace.',
    openStep: 'Open ChatGPT in a new tab.', openUrl: 'https://chatgpt.com', openLabel: 'Open ChatGPT',
    steps: ['Go to Plugins, press +, then Add custom MCP server.', 'Name it Palmera, paste your link as the URL, tick the acknowledgement, then Create as a plugin.', 'Start a chat and ask: “Give me an overview of Palmera.”'],
    note: 'ChatGPT only lets Business, Enterprise and Edu workspaces make changes through a connector. On other plans it can look things up but not draft listings; use Claude for that.',
  },
}
const small = { fontFamily: 'var(--font-sans)', fontSize: '11px', color: 'var(--pf-faint)', lineHeight: 1.55 } as const
const serif = { fontFamily: 'var(--font-serif)', color: 'var(--pf-text)' } as const
const btn = (primary: boolean) => ({ padding: '9px 16px', border: primary ? 'none' : '1px solid var(--pf-border-strong)', background: primary ? undefined : 'transparent', color: primary ? '#f4ecdb' : 'var(--pf-gold)', fontFamily: 'var(--font-sans)', fontSize: '11.5px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none' } as const)

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
    <div>
      {label && <div style={{ ...eyebrow, marginBottom: '5px' }}>{label}</div>}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
        <code style={{ flex: 1, minWidth: 0, padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--pf-border)', background: 'var(--pf-card)', color: 'var(--pf-text)', fontFamily: 'var(--font-sans)', fontSize: '11.5px', overflowWrap: 'anywhere' }}>{value}</code>
        <button type="button" aria-label={`Copy ${label || 'link'}`} className="pf-cap pf-cap-ghost" style={btn(false)}
          onClick={async () => { try { await navigator.clipboard.writeText(value); setDone(true); setTimeout(() => setDone(false), 1800) } catch { /* select and copy by hand */ } }}>
          {done ? <Check size={13} strokeWidth={1.75} /> : <Copy size={13} strokeWidth={1.75} />} {done ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  )
}

function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '10px 0', borderTop: n > 1 ? '1px solid var(--pf-border)' : 'none' }}>
      <span aria-hidden style={{ flexShrink: 0, width: '22px', height: '22px', borderRadius: '999px', border: '1px solid var(--pf-border-strong)', color: 'var(--pf-gold)', fontFamily: 'var(--font-sans)', fontSize: '11px', lineHeight: '20px', textAlign: 'center' }}>{n}</span>
      <div style={{ flex: 1, minWidth: 0, ...serif, fontSize: '13.5px', lineHeight: 1.5 }}>{children}</div>
    </div>
  )
}

export default function AdminAiPage() {
  const { data, loaded, error, reload } = useSWRLite('admin:ai-keys', () => api<{ keys: KeyRow[]; audit: AuditRow[] }>('GET', '/api/admin/ai-keys'), [])
  const [label, setLabel] = useState('')
  const [live, setLive] = useState(false)
  const [busy, setBusy] = useState<Client | 'revoke' | null>(null)
  const [formError, setFormError] = useState('')
  const [fresh, setFresh] = useState<Fresh | null>(null)
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null)

  if (!loaded) return <div className="pf-in"><Skeleton height="74px" style={{ maxWidth: '30rem', marginBottom: '22px' }} /><Skeleton height="260px" /></div>

  const keys = data?.keys ?? [], audit = data?.audit ?? []
  const active = keys.filter((k) => !k.revokedAt)
  const connect = async (client: Client) => {
    setBusy(client); setFormError('')
    const product = client === 'other' ? 'Access key' : CLIENTS[client].label
    const name = label.trim() ? `${label.trim()} · ${product}` : `${product} · ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
    try {
      const r = await api<{ key: string; url: string; headerUrl: string }>('POST', '/api/admin/ai-keys', { name, client, scopes: live ? ['read', 'write', 'publish'] : ['read', 'write'] })
      setFresh({ client, name, ...r }); setLabel(''); await reload()
    } catch (e) { setFormError(e instanceof Error ? e.message : 'Could not create the connection.') }
    setBusy(null)
  }
  const revoke = async (id: string) => {
    setBusy('revoke')
    try { await api('DELETE', `/api/admin/ai-keys?id=${id}`); setConfirmRevoke(null); await reload() } catch (e) { setFormError(e instanceof Error ? e.message : 'Could not disconnect.') }
    setBusy(null)
  }
  const guide = fresh && fresh.client !== 'other' ? CLIENTS[fresh.client] : null

  return (
    <div className="pf-in">
      <ScreenHeader label="Palmera HQ" title="AI access" intro="Connect your Claude or ChatGPT to Palmera. It can then look up listings and bookings and draft new listings for you, straight from a chat." />
      {error ? <p style={{ ...small, color: 'var(--pf-alert)' }}>Could not load connections: {error instanceof Error ? error.message : String(error)}</p> : null}

      {fresh ? (
        <div className="pf-glass pf-glass-gold" style={{ ...glass, marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '4px' }}>
            <Chip tone="gold">{guide ? `Connect ${guide.label}` : 'Access key'}</Chip>
            <span style={{ ...serif, fontSize: '14px' }}>{guide ? 'Four short steps, about a minute.' : 'For tools that send a header, such as Claude Code.'}</span>
          </div>
          {guide ? (
            <>
              <Step n={1}>Copy your Palmera link. It is shown only this once.<div style={{ marginTop: '8px' }}><CopyField label="" value={fresh.url} /></div></Step>
              <Step n={2}>{guide.openStep}
                <div style={{ marginTop: '8px' }}><a href={guide.openUrl} target="_blank" rel="noopener noreferrer" className="pf-cap pf-cap-ghost" style={btn(false)}>{guide.openLabel} <ExternalLink size={12} strokeWidth={1.75} /></a></div>
              </Step>
              <Step n={3}>{guide.steps[0]} {guide.steps[1]}</Step>
              <Step n={4}>{guide.steps[2]}</Step>
              {guide.note && <p style={{ ...small, margin: '8px 0 0' }}>{guide.note}</p>}
            </>
          ) : (
            <div style={{ display: 'grid', gap: '10px', marginTop: '10px' }}>
              <CopyField label="Endpoint" value={fresh.headerUrl} />
              <CopyField label="Authorization header" value={`Bearer ${fresh.key}`} />
            </div>
          )}
          <p style={{ ...small, margin: '10px 0 0' }}>This link is yours: keep it to yourself, like a password. If it ever gets shared, disconnect it below and connect again.</p>
          <button type="button" onClick={() => setFresh(null)} className="pf-cap pf-cap-primary" style={{ ...btn(true), marginTop: '12px' }}>Done</button>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 17rem), 1fr))', gap: '12px', marginBottom: '12px' }}>
            {(['claude', 'chatgpt'] as const).map((c) => (
              <div key={c} className="pf-glass" style={{ ...glass, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.125rem', fontWeight: 600, color: 'var(--pf-head)', letterSpacing: '0.02em' }}>{CLIENTS[c].label}</span>
                <span style={{ ...small, flex: 1 }}>{CLIENTS[c].blurb}</span>
                <span><button type="button" disabled={busy !== null} onClick={() => connect(c)} className="pf-cap pf-cap-primary" style={btn(true)}>{busy === c ? 'Setting up…' : `Connect ${CLIENTS[c].label}`}</button></span>
              </div>
            ))}
          </div>
          <div className="pf-glass" style={{ ...glass, marginBottom: '14px', display: 'flex', gap: '14px 22px', flexWrap: 'wrap', alignItems: 'center' }}>
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Your name (optional), so we know whose it is" aria-label="Your name, to label the connection" maxLength={40} style={{ ...inputStyle, flex: '1 1 15rem' }} />
            <label style={{ display: 'flex', gap: '9px', alignItems: 'flex-start', flex: '1 1 18rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={live} onChange={(e) => setLive(e.target.checked)} style={{ marginTop: '2px', accentColor: 'var(--pf-gold)' }} />
              <span>
                <span style={{ ...serif, fontSize: '13px', display: 'block' }}>Also let it publish and change what is live</span>
                <span style={{ ...small, display: 'block' }}>Off: it drafts, you publish from the dashboard. On: it can publish, edit live listings and set Featured tonight.</span>
              </span>
            </label>
          </div>
        </>
      )}
      {formError && <p style={{ ...small, color: 'var(--pf-alert)', margin: '0 0 12px' }}>{formError}</p>}

      <div style={eyebrow}>Connected · {active.length}</div>
      {keys.length === 0 ? (
        <p style={{ ...small, fontStyle: 'italic', margin: '8px 0 16px' }}>Nothing connected yet. Until someone connects, the AI endpoint answers nobody.</p>
      ) : (
        <div className="pf-glass" style={{ ...glass, padding: '6px 16px', margin: '10px 0 14px' }}>
          {keys.map((k, i) => (
            <div key={k.id} style={{ padding: '12px 0', borderTop: i ? '1px solid var(--pf-border)' : 'none', opacity: k.revokedAt ? 0.55 : 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
              <span style={{ minWidth: 0 }}>
                <span style={{ ...serif, fontSize: '14px', display: 'block' }}>{k.name}</span>
                <span style={small}>connected {k.createdAt ? timeAgo(new Date(k.createdAt)) : '—'} · {k.lastUsedAt ? `last used ${timeAgo(new Date(k.lastUsedAt))}` : 'not used yet'}</span>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {k.revokedAt ? <Chip tone="neutral">disconnected</Chip> : <Chip tone={k.scopes.includes('publish') ? 'alert' : 'gold'}>{k.scopes.includes('publish') ? 'can go live' : k.scopes.includes('write') ? 'drafts' : 'read only'}</Chip>}
                {!k.revokedAt && (confirmRevoke === k.id
                  ? <><button type="button" disabled={busy !== null} onClick={() => revoke(k.id)} className="pf-cap" style={{ ...btn(false), color: 'var(--pf-alert)', borderColor: 'var(--pf-alert)' }}>Disconnect now</button><button type="button" onClick={() => setConfirmRevoke(null)} style={{ ...small, background: 'transparent', border: 'none', cursor: 'pointer' }}>Keep</button></>
                  : <button type="button" onClick={() => setConfirmRevoke(k.id)} className="pf-cap pf-cap-ghost" style={{ ...btn(false), color: 'var(--pf-muted)' }}>Disconnect…</button>)}
              </span>
            </div>
          ))}
        </div>
      )}

      <Disclosure id="ai.activity" title="Activity" defaultOpen={audit.length > 0} summary={audit.length ? `${audit.length} recent change(s) · last ${audit[0].at ? timeAgo(new Date(audit[0].at)) : ''}` : 'nothing yet'}>
        {audit.length === 0 ? <p style={{ ...small, fontStyle: 'italic', margin: 0 }}>Every change a connected assistant makes is listed here.</p> : audit.map((a, i) => (
          <div key={a.id} style={{ display: 'flex', gap: '10px', alignItems: 'baseline', padding: '8px 0', borderTop: i ? '1px solid var(--pf-border)' : 'none', flexWrap: 'wrap' }}>
            <Chip tone={a.ok ? 'green' : 'alert'}>{a.tool}</Chip>
            <span style={{ ...serif, fontSize: '13px', flex: '1 1 16rem', minWidth: 0 }}>{a.summary}</span>
            <span style={small}>{a.keyName} · {a.at ? timeAgo(new Date(a.at)) : ''}</span>
          </div>
        ))}
      </Disclosure>

      <Disclosure id="ai.other" title="Other tools" summary="Claude Code, scripts">
        <p style={{ ...small, margin: '0 0 10px' }}>For a tool that sends an Authorization header instead of taking a link. Uses the name and permission chosen above.</p>
        <button type="button" disabled={busy !== null} onClick={() => connect('other')} className="pf-cap pf-cap-ghost" style={btn(false)}>{busy === 'other' ? 'Setting up…' : 'Create an access key'}</button>
      </Disclosure>
    </div>
  )
}
