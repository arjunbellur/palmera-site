// Server-only email via Resend. The API key lives in .env.local
// (RESEND_API_KEY) — NEVER in code and never in a client component: anything
// imported by a 'use client' file ships to the browser. Import this only from
// API routes / server code.
import { Resend } from 'resend'

const key = process.env.RESEND_API_KEY

export const resend = key ? new Resend(key) : null

/** Verified domain sender (palmeraexp.com is verified in Resend) —
 *  authenticated SPF/DKIM, lands in inboxes rather than spam. */
export const EMAIL_FROM = 'Palmera <reservations@palmeraexp.com>'

export async function sendEmail(opts: { to: string; subject: string; html: string }) {
  if (!resend) throw new Error('RESEND_API_KEY is not set (.env.local)')
  return resend.emails.send({ from: EMAIL_FROM, ...opts })
}
