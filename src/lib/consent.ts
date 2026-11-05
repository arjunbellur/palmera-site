'use client'
// Cookie consent — one choice, remembered for 180 days, that gates every
// non-essential script (today: GA4). Essential cookies (sign-in session,
// language, theme) need no consent and are never gated. The choice records
// which version of the Cookie Policy it accepted: bump POLICY_VERSION when
// the policy changes materially and everyone is asked again.
import { useEffect, useState } from 'react'

export type Consent = 'granted' | 'denied'
export const POLICY_VERSION = '2026-11-05'
const COOKIE = 'palmera_consent'
const KEY = 'palmera.consent'
const MAX_AGE = 180 * 24 * 3600
const EVENT = 'palmera:consent'

export interface ConsentRecord { choice: Consent; at: string; policy: string }

export function readConsent(): ConsentRecord | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const r = JSON.parse(raw) as ConsentRecord
      if (r.policy === POLICY_VERSION && (r.choice === 'granted' || r.choice === 'denied')) return r
      return null
    }
  } catch { /* private mode: fall back to the cookie */ }
  const m = document.cookie.match(new RegExp(`(?:^|; )${COOKIE}=([^;]+)`))
  if (!m) return null
  const [choice, policy] = decodeURIComponent(m[1]).split('|')
  return policy === POLICY_VERSION && (choice === 'granted' || choice === 'denied') ? { choice: choice as Consent, at: '', policy } : null
}

export function writeConsent(choice: Consent) {
  const rec: ConsentRecord = { choice, at: new Date().toISOString(), policy: POLICY_VERSION }
  try { localStorage.setItem(KEY, JSON.stringify(rec)) } catch { /* ignore */ }
  document.cookie = `${COOKIE}=${encodeURIComponent(`${choice}|${POLICY_VERSION}`)}; path=/; max-age=${MAX_AGE}; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`
  window.dispatchEvent(new CustomEvent(EVENT, { detail: rec }))
}

/** Re-open the banner (Footer → "Cookie preferences"). */
export function openCookieBanner() {
  window.dispatchEvent(new CustomEvent(`${EVENT}:open`))
}

/** The current choice, live: null until decided or when the policy changed. */
export function useConsent(): Consent | null {
  const [c, setC] = useState<Consent | null>(null)
  useEffect(() => {
    setC(readConsent()?.choice ?? null)
    const on = (e: Event) => setC((e as CustomEvent<ConsentRecord>).detail.choice)
    window.addEventListener(EVENT, on)
    return () => window.removeEventListener(EVENT, on)
  }, [])
  return c
}

export const CONSENT_EVENT = EVENT
