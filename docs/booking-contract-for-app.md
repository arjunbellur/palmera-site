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

## Open items to confirm with Samson
1. **Same Firebase project?** The dashboard reads `bookings` from *its* Firebase
   (`palmera-platform`). If the app writes to a different project, we need a sync
   or a shared project. (This is the core Phase-4 question.)
2. **Write path & rules.** Today `bookings` is admin-write only (server/CF/Admin
   SDK). If the app creates bookings with the client SDK as an authenticated
   *customer*, we add a customer-create rule — but never open provider writes.
3. **Money rounding.** Confirm `round()` (half-up) for `commissionAmount`, all
   ints, no sub-unit currency (XOF has no minor unit).
