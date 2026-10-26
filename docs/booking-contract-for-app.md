# Booking contract for the customer app (v3.3)

**Audience:** Samson (customer app). **Owner:** Arjun (dashboard).
**Status:** canonical — the dashboard reads exactly this shape. If the app needs a
change, change it *here* first, then both sides update. Types live in
`src/lib/schema.ts` (`Booking`, `LedgerEntry`, `Payout`).

The dashboard **only reads** these three collections. The app (or a trusted
server / Cloud Function) **writes** `bookings`; `ledger` and `payouts` are
written by Palmera's server/admin, never by the app or the partner.

---

## `bookings/{id}` — written by the app at checkout

Fully **snapshotted**: freeze the terms at booking time so later edits to the
experience, its price, or the company's commission rate never change a booking
already made.

| Field | Type | Notes |
|---|---|---|
| `experienceId` | string | FK → `experiences/{id}` |
| `companyId` | string | FK → `companies/{id}` — **drives commission window** |
| `providerId` | string | FK → `providers/{uid}` — **partner's read anchor; must be exact** |
| `customerId` | string | app user uid |
| `customerName` | string | display only — no other guest PII dashboard-side |
| `customerPhone` | string \| null | OPTIONAL — shown in the partner's reservation detail view |
| `customerEmail` | string \| null | OPTIONAL — same |
| `specialRequests` | string \| null | OPTIONAL — guest note at booking |
| `paymentStatus` | `'paid' \| 'unpaid' \| 'refunded'` \| null | OPTIONAL — reservation-mode bookings are `'unpaid'` |
| `guestCount` | int | |
| `scheduledFor` | Timestamp | reserved date/time of the experience |
| `title` | string | snapshot of experience.title |
| `provider` | string | snapshot of company display name |
| `mode` | `'paid' \| 'reservation'` | snapshot |
| `priceUnit` | `'flat' \| 'per_person'` | snapshot |
| `currency` | string | `'XOF'` at launch |
| `confirmationType` | `'instant' \| 'provider_confirmed'` | snapshot |
| `basePrice` | int \| null | snapshot; null iff reservation |
| `cancellationPolicy` | `{tier, customNotes, policyVersion}` | **resolved** tier terms, frozen |
| `selections` | `[{optionId, groupId, name, price, quantity}]` | option picks, prices frozen |
| `bookingTotal` | int | `(mode=='paid' ? basePrice × (priceUnit=='per_person' ? guestCount : 1) : 0) + Σ(selection.price × quantity)` |
| `commissionRate` | number | company's rate at booking time (e.g. `0.10`), frozen |
| `commissionAmount` | int | `round(bookingTotal × commissionRate)` |
| `payoutAmount` | int | `bookingTotal − commissionAmount` → owed to partner |
| `status` | `pending\|confirmed\|declined\|cancelled\|completed\|no_show` | see lifecycle |
| `createdAt` / `updatedAt` | Timestamp | |
| `confirmedAt` / `cancelledAt` | Timestamp \| null | |

**`providerId` is load-bearing:** the partner's Firestore read rule authorizes
`bookings` only where `providerId == their uid`. If it's missing or wrong, the
partner sees nothing. Copy it from the experience at checkout.

**Status lifecycle:**
- `instant` listing → create as `confirmed`.
- `provider_confirmed` listing → create as `pending`; the partner accepts
  (`confirmed`) or declines (`declined`) from the dashboard.
- After the experience date, mark `completed` (payout-eligible) or `no_show`.
- Guest/system cancellation → `cancelled` (+ `cancelledAt`), honoring
  `cancellationPolicy`.

---

## `ledger/{id}` — Palmera server writes (NOT the app)

One immutable, append-only money event per row. Signed `amount`: positive =
Palmera owes the partner more; negative = less. Partner balance = Σ `amount`
over their company. Corrections are new rows, never edits.

| Field | Type | Notes |
|---|---|---|
| `companyId` / `providerId` | string | anchors |
| `bookingId` | string \| null | null for manual adjustments |
| `payoutId` | string \| null | set once rolled into a payout batch |
| `type` | `commission_earned\|payout\|refund\|clawback\|adjustment` | |
| `amount` | int (signed) | in `currency` |
| `currency` | string | |
| `description` | string | |
| `createdAt` | Timestamp | |

Typical flow: booking `completed` → `+commission_earned` (the `payoutAmount`);
biweekly payout → `−payout` tagged with its `payoutId`; cancellation after credit
→ `−refund`; BPA clawback → `−clawback`.

---

## `payouts/{id}` — Palmera server/admin writes

A biweekly payout batch for one company.

| Field | Type | Notes |
|---|---|---|
| `companyId` / `providerId` | string | anchors |
| `periodStart` / `periodEnd` | Timestamp | the biweekly window |
| `status` | `scheduled\|processing\|paid\|failed` | |
| `currency` | string | |
| `grossAmount` | int | Σ eligible credits in period |
| `clawbacks` | `[{bookingId, amount, reason}]` | |
| `clawbackTotal` | int | Σ clawbacks.amount |
| `netAmount` | int | `grossAmount − clawbackTotal` → actually sent |
| `method` | string \| null | snapshot of company payout method |
| `ledgerEntryIds` | string[] | credits settled by this batch |
| `reference` | string \| null | processor transaction id, once paid |
| `scheduledFor` / `paidAt` | Timestamp / null | |
| `createdAt` / `updatedAt` | Timestamp | |

---

## Payment state — ON the booking doc, never separate

Processor state lives in `bookings/{id}.payment` (a map on the SAME doc the
booking lives in — create the booking FIRST with the full shape above, then
update that doc), never in a separate self-generated document. Four rails
as of app release 1.55 (2026-10-25); all written by the app's Cloud
Functions, never by a client or the partner. Typed as `PaymentReceipt` in
`src/lib/schema.ts`.

```
// Stripe Checkout (card; minor units in the charged currency)
payment: { provider: 'stripe', sessionId: 'cs_…', currency: 'usd', amountMinor: 8900, status, payers? }

// Stripe PaymentIntent (Apple Pay / Google Pay one-tap, 1.55) — no sessionId
payment: { provider: 'stripe', method: 'apple_pay'|'google_pay', paymentIntentId: 'pi_…', currency: 'usd', amountMinor: 8900, status, payers? }

// pawaPay mobile money (1.55; XOF, zero-decimal)
payment: { provider: 'pawapay', checkoutId, currency: 'XOF', amountXof: 12000,
           mmProvider: 'WAVE_SEN'|'ORANGE_SEN'|'FREE_SEN', depositId?, providerTransactionId?, failureCode?, status, payers? }

// PayDunya (legacy)
payment: { provider: 'paydunya', amountXof: 12000, token: '…', status }

status: 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded'
refund fields (any rail): refundedAt?, refundState?: 'none'|'processing'|'refunded'|'manual_review',
                          pawapayRefundId?, refundFailureCode?, refundSettledAt?
```

Split payments: `copayPayments: { [uid]: <same receipt shapes> }`, with
`payersCount` / `paidCount` / `copayUids` alongside. Stripe refunds settle
synchronously; pawaPay refunds are asynchronous — `refundState` goes
`processing` → `refunded`, or `manual_review` when pawaPay rejected the
refund and it has to be done by hand (the dashboard flags these).

`paymentStatus` is NOT written by anyone — readers derive the label from
`payment.status` and `refundState` (see `src/lib/payments.ts`).

Booking money fields (`bookingTotal`, `commissionAmount`, `payoutAmount`)
stay XOF regardless of the charge currency — `payment` records the charge,
the booking records the ledger truth.

The security rules now allow the customer to UPDATE their own booking
(anchors + money fields stay frozen) — the earlier permission gap that forced
payment writes into orphan docs is fixed. The partner can never modify
`payment`.

## Reservation mode (`mode: 'reservation'`) — the free flow

- **No payment step at all.** Do not create PayDunya sessions, do not write a
  `payment` map. `bookingTotal` is 0 (plus any paid add-ons — if add-ons are
  selected the booking IS paid and follows the paid flow).
- Button copy: **"Confirm"**, never "Confirm & Pay".
- Set `paymentStatus: 'unpaid'`.
- Award Palmera Points app-side on confirmation as designed.
- Solo paid bookings: don't render split-payment progress ("1/1 payments
  collected") when there is exactly one payer.

## ⚠ Required Firestore indexes (why bookings were invisible)

The dashboard reads bookings with composite queries; without these indexes
Firestore throws FAILED_PRECONDITION and the partner sees an empty list.
The canonical list lives in `firestore.indexes.json` (repo root):

- `bookings(providerId ↑, scheduledFor ↓)` — partner reservations list
- `bookings(providerId ↑, companyId ↑, scheduledFor ↓)` — company-scoped
- `bookings(customerId ↑, createdAt ↓)` — the app's own "my bookings"
- `ledger(providerId ↑, createdAt ↓)` · `payouts(providerId ↑, scheduledFor ↓)`

If the app adds a new composite query, add its index here FIRST.

## Open items to confirm with Samson
1. **Same Firebase project?** The dashboard reads `bookings` from *its* Firebase
   (`palmera-platform`). If the app writes to a different project, we need a sync
   or a shared project. (This is the core Phase-4 question.)
2. **Write path & rules.** Today `bookings` is admin-write only (server/CF/Admin
   SDK). If the app creates bookings with the client SDK as an authenticated
   *customer*, we add a customer-create rule — but never open provider writes.
3. **Money rounding.** Confirm `round()` (half-up) for `commissionAmount`, all
   ints, no sub-unit currency (XOF has no minor unit).
