'use client'
// Admin member management: find an app user, see their account state, suspend
// or reinstate. Uses /api/admin/members (Firebase Auth disable) — no rules,
// no schema, no app change.
import { useState } from 'react'
import { auth } from '@/lib/firebase'
import type { AppProfile } from '@/lib/schema'
import { PrimaryButton, GhostButton, Chip, SectionTitle, fieldStyle } from '@/components/partner/ui'
import { glass } from '@/app/admin/ui'
import { ShieldBan, ShieldCheck, Search } from 'lucide-react'

type AuthState = { disabled: boolean; email: string | null; emailVerified: boolean; lastSignIn: string | null; created: string | null }

export default function MembersPanel({ profiles }: { profiles: AppProfile[] }) {
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState<AppProfile | null>(null)
  const [state, setState] = useState<AuthState | null>(null)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const needle = q.trim().toLowerCase()
  const matches = needle.length < 2 ? [] : profiles.filter(p =>
    [p.name, p.handle, p.phone, p.city].some(v => String(v || '').toLowerCase().includes(needle))).slice(0, 8)

  const api = async (init?: RequestInit, uid?: string) => {
    const token = await auth.currentUser?.getIdToken()
    const res = await fetch(`/api/admin/members${uid ? `?uid=${encodeURIComponent(uid)}` : ''}`, {
      ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(init?.headers || {}) },
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || 'request failed')
    return data
  }

  const pick = async (p: AppProfile) => {
    setSelected(p); setState(null); setMsg(''); setReason('')
    try { setState(await api(undefined, p.id!)) } catch (e) { setMsg(String((e as Error).message)) }
  }
  const act = async (action: 'suspend' | 'reinstate') => {
    if (!selected?.id || busy) return
    if (action === 'suspend' && !window.confirm(`Suspend ${selected.name || selected.handle || selected.id}? They will be signed out and unable to sign in until reinstated.`)) return
    setBusy(true); setMsg('')
    try {
      await api({ method: 'POST', body: JSON.stringify({ action, uid: selected.id, reason }) })
      setState(await api(undefined, selected.id))
      setMsg(action === 'suspend' ? 'Account suspended — logged in admin_actions.' : 'Account reinstated.')
    } catch (e) { setMsg(String((e as Error).message)) }
    setBusy(false)
  }

  return (
    <>
      <SectionTitle>Members</SectionTitle>
      <div className="pf-glass" style={glass}>
        <div style={{ position: 'relative' }}>
          <Search size={14} strokeWidth={1.75} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--pf-faint)' }} />
          <input style={{ ...fieldStyle, paddingLeft: '34px' }} placeholder="Search by name, handle, phone or city…" value={q} onChange={e => setQ(e.target.value)} />
        </div>
        {matches.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px' }}>
            {matches.map(p => (
              <button key={p.id} onClick={() => pick(p)} style={{ textAlign: 'left', background: selected?.id === p.id ? 'var(--pf-card)' : 'transparent', border: '1px solid var(--pf-border)', borderRadius: '10px', padding: '9px 12px', cursor: 'pointer', color: 'var(--pf-text)', fontFamily: 'var(--font-sans)', fontSize: '12.5px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span style={{ width: '28px', height: '28px', borderRadius: '50%', overflow: 'hidden', background: 'var(--pf-green-soft)', flexShrink: 0 }}>{p.avatar_url && <img loading="lazy" decoding="async" src={p.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}</span>
                <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name || '—'} <span style={{ color: 'var(--pf-faint)' }}>{p.handle ? `@${p.handle}` : ''} · {p.city || '—'}</span></span>
              </button>
            ))}
          </div>
        )}

        {selected && (
          <div style={{ marginTop: '14px', borderTop: '1px solid var(--pf-border)', paddingTop: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
              <span style={{ fontFamily: 'var(--font-serif)', color: 'var(--pf-head)', fontSize: '15px' }}>{selected.name || selected.handle || selected.id}</span>
              {state ? <Chip tone={state.disabled ? 'alert' : 'green'}>{state.disabled ? 'Suspended' : 'Active'}</Chip> : <Chip tone="neutral">…</Chip>}
              {state?.email && <span style={{ fontFamily: 'var(--font-sans)', fontSize: '11.5px', color: 'var(--pf-faint)' }}>{state.email}{state.emailVerified ? ' ✓' : ' (unverified)'}</span>}
            </div>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', color: 'var(--pf-faint)', marginBottom: '10px' }}>
              {state?.created && <>Joined {new Date(state.created).toLocaleDateString('en-GB')} · </>}
              {state?.lastSignIn && <>last sign-in {new Date(state.lastSignIn).toLocaleDateString('en-GB')} · </>}
              {typeof selected.points === 'number' && <>{selected.points} pts</>}
            </div>
            <input style={{ ...fieldStyle, marginBottom: '10px' }} placeholder="Reason (kept in the admin log)" value={reason} onChange={e => setReason(e.target.value)} />
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {state?.disabled ? (
                <PrimaryButton onClick={() => act('reinstate')} disabled={busy}><ShieldCheck size={14} strokeWidth={1.75} /> Reinstate</PrimaryButton>
              ) : (
                <GhostButton tone="alert" onClick={() => act('suspend')} disabled={busy || !state}><span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><ShieldBan size={14} strokeWidth={1.75} /> Suspend account</span></GhostButton>
              )}
            </div>
            {msg && <p style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: 'var(--pf-muted)', margin: '10px 0 0' }}>{msg}</p>}
          </div>
        )}
      </div>
    </>
  )
}
