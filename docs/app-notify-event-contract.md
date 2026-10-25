# Notify-event contract for the app's Cloud Functions

How the app tells the dashboard that a booking changed, so the dashboard
sends the email. One sender (Resend, `reservations@palmeraexp.com`),
templates and logs on the dashboard side; the app only reports transitions.
Plan: `docs/app-parity-plan-2026-10.md` §D.

## Endpoint

```
POST {BASE}/api/notify/event
Authorization: Bearer <NOTIFY_SECRET>
Content-Type: application/json

{ "bookingId": "<bookings/{id}>", "event": "<event>" }
```

| Environment | BASE | Secret |
| --- | --- | --- |
| production | `https://www.palmeraexp.com` | Vercel `NOTIFY_SECRET` (production) |
| staging | `https://<staging-deployment>.vercel.app` — placeholder, set once the staging project is attached | Vercel `NOTIFY_SECRET` (staging) — a different value |

`NOTIFY_SECRET` is a functions secret (`firebase functions:secrets:set
NOTIFY_SECRET`), never a config value or a string in source. It is separate
from the dashboard's `CRON_SECRET`. Append `?dry=1` to see what would be sent
without sending or writing anything.

## Events — when `onBookingWritten` fires each

Fire on the transition, not on every write. The route re-checks the booking
as it is now, so a late or replayed call is harmless.

| event | fire when (before → after) | mail(s) |
| --- | --- | --- |
| `created` | stub → real booking: `isUnpaidCheckoutStub(before)` and not `isUnpaidCheckoutStub(after)`, or a reservation-mode booking created directly | partner: action required (pending) or FYI (confirmed) |
| `confirmed` | `status` pending → confirmed | member: confirmed |
| `declined` | `status` pending → declined | member: declined |
| `cancelled` | `status` → cancelled | partner: cancelled by member · member: cancelled (+ refund line when paid) |
| `refunded` | `payment.refundState` → `refunded` (or `payment.status` → `refunded`) | partner: refund issued |
| `payment_received` | `payment.status` → `completed` while `status` is still `pending` | member: payment received, awaiting the partner (replaces the in-app "Confirmation sent" claim) |

Not events (the dashboard handles them on its schedule): the 12h partner
reminder, the member day-before reminder. Do not post for `completed` or
`no_show`.

Member mails are only sent when `payment.status === 'completed'` or
`mode === 'reservation'` — the address on the booking is client-writable, so
an unpaid booking never produces a member email whatever its status. Partner
mails go to `providers/{providerId}.email`, falling back to
`companies/{companyId}.email`, and honour `notificationPrefs.bookings`.

## Idempotency

Each (booking, event, recipient) is one slot: `email_log/{bookingId}_{event}_{recipient}`
plus a `notified.{event}_{recipient}` server timestamp on the booking
(dashboard-written; additive, the app may ignore it). A second call for a
slot that was sent returns `{ ok: true, skipped: 'already sent' }`. A slot
whose send failed is retried on the next call, and by the scheduled
backstop. Retry freely; never loop on a 4xx.

## Response

```
200 { ok: true, dry, bookingId, event, results: [
        { recipient: 'partner'|'member', kind, to: 'j***@domain', sent: true }
      | { recipient, kind, skipped: '<reason>' }
      | { recipient, kind, to, failed: '<reason>' } ] }
200 { ok: true, bookingId, event, skipped: '<reason>' }   // nothing to send for this state
400 { ok: false, error }                                  // bad body — do not retry
401 { error: 'unauthorized' }                             // secret mismatch — do not retry
404 { ok: false, error: 'booking not found' }
500 { ok: false, error, reason }                          // retry with backoff
```

A failed send is a 200 with `failed` on that result, never a 500: the route
has already logged it and the backstop will pick it up.

## Functions snippet (Node 20, v2)

```js
// functions/src/notifyDashboard.js
const { defineSecret } = require('firebase-functions/params')
const NOTIFY_SECRET = defineSecret('NOTIFY_SECRET')
const BASE = process.env.DASHBOARD_BASE_URL || 'https://www.palmeraexp.com'

/** Report one booking transition to the dashboard mailer. Never throws:
 *  a mail problem must not fail the trigger that detected the change. */
async function notifyDashboard(bookingId, event) {
  try {
    const res = await fetch(`${BASE}/api/notify/event`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${NOTIFY_SECRET.value()}` },
      body: JSON.stringify({ bookingId, event }),
      signal: AbortSignal.timeout(10_000),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) console.error('notify/event', event, bookingId, res.status, data.error, data.reason)
    else if (data.results?.some(r => r.failed)) console.warn('notify/event partial', bookingId, data.results)
    return data
  } catch (e) {
    console.error('notify/event unreachable', event, bookingId, e.message)
    return null
  }
}

// In onBookingWritten (add NOTIFY_SECRET to its `secrets: [...]`):
//   if (isUnpaidCheckoutStub(before) && !isUnpaidCheckoutStub(after)) await notifyDashboard(id, 'created')
//   if (before.status === 'pending' && after.status === 'confirmed') await notifyDashboard(id, 'confirmed')
//   if (before.status === 'pending' && after.status === 'declined')  await notifyDashboard(id, 'declined')
//   if (before.status !== 'cancelled' && after.status === 'cancelled') await notifyDashboard(id, 'cancelled')
//   if (before.payment?.refundState !== 'refunded' && after.payment?.refundState === 'refunded') await notifyDashboard(id, 'refunded')
//   if (before.payment?.status !== 'completed' && after.payment?.status === 'completed' && after.status === 'pending') await notifyDashboard(id, 'payment_received')
module.exports = { notifyDashboard, NOTIFY_SECRET }
```

Once `confirmed` is live through this route, retire the Trigger Email
extension's `mail` write for the member confirmation — otherwise members get
two.
