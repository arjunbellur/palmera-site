'use client'
// Google Analytics 4 for the site. One property, Palmera's Google account,
// two web streams on the same domain: the site stream
// (NEXT_PUBLIC_GA_MEASUREMENT_ID) for the public pages and the dashboard
// stream (NEXT_PUBLIC_GA_DASHBOARD_MEASUREMENT_ID) for the partner portal.
// Set in Vercel → Production. Without them nothing loads and `track` is a
// no-op, so local and preview builds send nothing. Page views are automatic (the loader
// re-sends one on every client-side route change); the events below are
// the few site actions worth a number. The admin surface never loads GA —
// team activity would pollute every report.
import { sendGAEvent } from '@next/third-parties/google'

/** The site stream (public pages). */
export const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || ''
/** The dashboard stream (partner portal, onboarding, supplier, door). Falls
 *  back to the site stream when unset, so one ID still covers everything. */
export const GA_DASHBOARD_ID = process.env.NEXT_PUBLIC_GA_DASHBOARD_MEASUREMENT_ID || GA_ID

/** Paths that never load GA (team-only surfaces). */
export const GA_EXCLUDED_PREFIXES = ['/admin', '/api']
/** Paths that report to the dashboard stream. */
export const GA_DASHBOARD_PREFIXES = ['/partner', '/dashboard', '/supplier', '/door']

/** Which Measurement ID a path reports to, or '' for none. Two streams on
 *  one domain: every page view goes to exactly one of them. */
export function gaIdFor(pathname: string): string {
  if (GA_EXCLUDED_PREFIXES.some((p) => pathname.startsWith(p))) return ''
  if (GA_DASHBOARD_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'))) return GA_DASHBOARD_ID
  return GA_ID
}
export const gaAllowedOn = (pathname: string) => !!gaIdFor(pathname)

type Params = Record<string, string | number | boolean | undefined>

/** Send a GA4 event. Safe to call anywhere: no-op without a Measurement ID or on the server. */
export function track(event: string, params: Params = {}) {
  if (typeof window === 'undefined' || !gaIdFor(window.location.pathname)) return
  try { sendGAEvent('event', event, params) } catch { /* ad blocker, no dataLayer — never break the page */ }
}

/** A tap on an App Store / Google Play link, with where on the site it was. */
export const trackStoreClick = (store: 'apple' | 'google', placement: string) => track('store_click', { store, placement })
