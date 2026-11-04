'use client'
// Support inbox — the dashboard's "Messages" tab talks to the app's four admin
// endpoints (functions/SUPPORT_INBOX_CONTRACT.md in palmera-expo, Part 5,
// 2026-11-03) with the signed-in admin's Firebase ID token. The data lives in
// `support_messages` (member and team lines) and `support_threads` (Admin SDK
// only); the dashboard never reads those collections directly, so the shared
// Firestore rules stay untouched. Replies reach the member in the app with a
// push, from `supportReply`.
import { useEffect, useState } from 'react'
import { auth } from '@/lib/firebase'

export type ThreadStatus = 'open' | 'answered' | 'closed'

export interface InboxThread {
  userId: string
  name: string | null
  avatar: string | null
  email: string | null
  lastBody: string
  lastAt: string           // ISO
  lastFrom: 'member' | 'team'
  unread: number
  status: ThreadStatus
}

export interface ThreadMessage { id: string; body: string; from: 'member' | 'team'; at: string }

export interface Thread {
  userId: string
  name: string | null
  avatar: string | null
  email: string | null
  status: ThreadStatus
  messages: ThreadMessage[]
}

/** The app's functions origin — staging and production differ by project. */
export const functionsBase = () =>
  process.env.NEXT_PUBLIC_FUNCTIONS_BASE
  || `https://us-central1-${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'palmera-platform'}.cloudfunctions.net`

async function call<T>(name: string, body?: Record<string, unknown>): Promise<T> {
  const token = await auth.currentUser?.getIdToken()
  if (!token) throw new Error('Not signed in')
  const res = await fetch(`${functionsBase()}/${name}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify(body ?? {}),
  })
  const data = await res.json().catch(() => null) as ({ ok?: boolean; error?: string } & T) | null
  if (!res.ok || !data?.ok) throw new Error(data?.error || `HTTP ${res.status}`)
  return data
}

export const supportInbox = (status?: ThreadStatus) =>
  call<{ threads: InboxThread[] }>('supportInbox', { limit: 200, ...(status ? { status } : {}) }).then((d) => d.threads ?? [])

/** Opening a thread marks it read for the whole team. */
export const supportThread = (userId: string) => call<Thread>('supportThread', { userId })

export const supportReply = (userId: string, body: string) =>
  call<{ id: string }>('supportReply', { userId, body }).then((d) => d.id)

export const supportStatus = (userId: string, status: 'open' | 'closed') =>
  call<{ status: ThreadStatus }>('supportStatus', { userId, status }).then((d) => d.status)

/** Total unread member messages, refreshed every `everyMs` while the tab is
 *  visible — the badge on the Messages nav item and the Overview line. */
export function useSupportUnread(everyMs = 60_000) {
  const [unread, setUnread] = useState(0)
  useEffect(() => {
    let alive = true
    let timer: ReturnType<typeof setTimeout> | null = null
    const tick = async () => {
      if (document.visibilityState === 'visible' && auth.currentUser) {
        try { const t = await supportInbox('open'); if (alive) setUnread(t.reduce((n, x) => n + (x.unread || 0), 0)) } catch { /* offline or not deployed — badge stays */ }
      }
      if (alive) timer = setTimeout(tick, everyMs)
    }
    tick()
    const onVis = () => { if (document.visibilityState === 'visible') { if (timer) clearTimeout(timer); tick() } }
    document.addEventListener('visibilitychange', onVis)
    return () => { alive = false; if (timer) clearTimeout(timer); document.removeEventListener('visibilitychange', onVis) }
  }, [everyMs])
  return unread
}
