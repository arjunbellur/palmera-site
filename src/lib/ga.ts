'use client'
// Google Analytics 4 for the site. One property, Palmera's Google account;
// the Measurement ID comes from NEXT_PUBLIC_GA_MEASUREMENT_ID (Vercel →
// Production). Without it nothing loads and `track` is a no-op, so local
// and preview builds send nothing. Page views are automatic (the loader
// re-sends one on every client-side route change); the events below are
// the few site actions worth a number. The admin surface never loads GA —
// team activity would pollute every report.
import { sendGAEvent } from '@next/third-parties/google'

export const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || ''

/** Paths that never load GA (team-only surfaces). */
export const GA_EXCLUDED_PREFIXES = ['/admin', '/api']
export const gaAllowedOn = (pathname: string) => !!GA_ID && !GA_EXCLUDED_PREFIXES.some((p) => pathname.startsWith(p))

type Params = Record<string, string | number | boolean | undefined>

/** Send a GA4 event. Safe to call anywhere: no-op without a Measurement ID or on the server. */
export function track(event: string, params: Params = {}) {
  if (!GA_ID || typeof window === 'undefined') return
  try { sendGAEvent('event', event, params) } catch { /* ad blocker, no dataLayer — never break the page */ }
}

/** A tap on an App Store / Google Play link, with where on the site it was. */
export const trackStoreClick = (store: 'apple' | 'google', placement: string) => track('store_click', { store, placement })
