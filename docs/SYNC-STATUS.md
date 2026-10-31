# App ↔ Dashboard sync status

Living tracker for the two-sided integration. Update this whenever either
side ships something that touches the shared surface (schema, rules,
indexes, collections). Last updated: 2026-08-01 (indexes live, sync verified; NOTE: the app has no repo — see items 8–9).

## Ground rules (agreed direction — confirm with Samson)
1. **`firestore.rules` in this repo is the single source of truth.** Rule
   changes land here and deploy via `npm run rules:deploy`. Console edits
   WILL be overwritten by the next deploy. Samson's 2026-07-27 additions were
   merged in verbatim (commit dc14aa8) — nothing of his was lost.
2. **`src/lib/schema.ts` + `docs/booking-contract-for-app.md`** define shared
   document shapes. Changes go through the repo, both sides pull.
3. **`firestore.indexes.json`** is the canonical index list. Any new
   composite query gets its index added here FIRST.

## Samson's observed work (from live data + his ruleset, not assumptions)
- ✅ Deployed app-side rules (2026-07-27): profiles, favorites, moments,
  friends, notifications, reviews, points_ledger, chat_* + customer
  bookings read/create. He preserved all dashboard rules — good hygiene.
- ✅ App writes CONTRACT-CONFORMANT bookings — verified live: one booking
  (Palmera Run Club) matches v3.3 field-for-field with valid
  provider/company/experience references. The contract-first approach works.
- 🔄 PayDunya integration in progress (test tokens observed). His payment
  writes were being DENIED by rules (no customer-update rule existed) →
  8 orphan `{payment}`-only docs in `bookings`. Rule gap fixed on our side
  (2026-08-01); he should now write `payment` onto the booking doc itself.
- 🔄 He is actively working through the security-review feedback (his words).

## Our side — shipped 2026-08-01 (commit 678d0dc)
- `firestore.indexes.json` + deploy script (creation blocked on IAM; console
  links pending Arjun's click).
- Money-layer readers now log query failures loudly.
- Customer-update rule on own bookings (anchors + money frozen) — unblocks
  his payment writes. `Booking.payment` map added to schema + contract.
- Contract doc: reservation-mode spec (no payment step, "Confirm",
  paymentStatus 'unpaid', no 1/1-collected for solo), index requirements.

## Open items by owner
| # | Item | Owner | Status |
|---|---|---|---|
| 1 | Create 5 composite indexes (console links) | **Arjun** | ✅ done 2026-08-01 — all 5 Enabled |
| 2 | Verify dashboard query returns Jordan's booking post-index | us | ✅ verified — 7 reservations return (provider + company-scoped), customer my-bookings works |
| 3 | Point payment writes at the booking's own doc id | **Samson** | 🔴 ESCALATED 2026-08-04: still writing to self-generated `bk-XXXXXXXX` ids that match NO real booking — the paid flow creates a payment-only doc and NEVER creates the booking itself. This is why Jordan's paid reservations don't appear on the partner dashboard. Correct flow per contract: create the booking doc first (all v3.3 fields), then update THAT doc's `payment` map. **✅ FIXED & VERIFIED 2026-08-13: paid bookings are full docs with the payment map on the same doc (stripe pending/completed observed); all 4 spot-checked paid bookings appear in the partner dashboard query; orphan count frozen at 25 (latest 2026-08-10 — none since the fix). Freeze lifted.** |
| 4 | Confirm the orphan payment docs are abandoned → we wipe | **Samson** confirm, us delete | orphans FROZEN at 25 since the fix (latest 2026-08-10) — now confirmed legacy; ready to wipe on Samson's nod (refund the completed $0.89 Stripe session first — Jordan decides) |
| 4b | Payment provider: RESOLVED — dual rails are by design (Arjun 2026-08-04): PayDunya (mobile money, XOF) + Stripe (cards). Contract + schema now document both shapes. Booking money fields stay XOF regardless of charge currency. Item 3 (booking doc never created on the paid path) is unchanged and still the blocker. | — | ✅ documented |
| 5 | Free-reservation flow (no payment, "Confirm", points) | **Samson** | spec now in contract doc |
| 6 | App-side rules hardening (points self-grant, open chat, favorites delete, notification spam) | **Samson** specs the change → we land it in repo + deploy | pending — flagged ⚠ inline in firestore.rules |
| 7 | Server-side validation of client-authored booking money fields | joint (needs Cloud Function or trusted server) | pre-launch requirement, not blocking testing |
| 8 | Agree rules-through-repo workflow explicitly | **Arjun ↔ Samson** | UPDATED: Samson has NO repo (Xcode → TestFlight directly). Therefore ALL rules changes flow through THIS repo — he requests, we land + deploy. He must not console-edit. |
| 10 | Company logo mislink (Jordan, feedback 15): logos ARE set on `companies/{id}.logo` (verified live — Palmera Services, Dikoum Tower, Love_auto221 all set) but the app doesn't display them. App should read `companies/{companyId}.logo` (and `heroPhoto`). | **Samson** | flagged 2026-08-12 |
| 11 | Nothing ever marks bookings `completed` — 0 of 70+ bookings platform-wide. Breaks: app profile "Completed" counts (Jordan, feedback 15), dashboard completion-rate/revenue/payout-readiness (all keyed on completed). Need a completion mechanism: auto-complete N hours after `scheduledFor` (server), partner action, or app action. | **joint — decide design** | flagged 2026-08-12 |
| 12 | External share links point at `palmera.app/e/{id}` + `palmera.app/invite` (feedback 15 sharing scenarios). Those URLs need real landing pages (experience preview → App Store / deep link). Decide domain (palmera.app vs palmeraexp.com); dashboard repo can host the landing routes. | **Arjun + Samson** | flagged 2026-08-12 |
| 13 | Abandoned checkouts on INSTANT listings sit at `status: 'pending'` forever (payment map stuck `stripe/pending`). Verified 2026-08-13: 6 such bookings — 3 were manually declined by the partner, 3 manually confirmed hours/days later, even though the listings are instant-confirm. Dashboard side now treats these as "awaiting payment" (not partner action, no email). App side: consider expiring an unpaid checkout after N minutes, or a distinct status, so they don't linger. | **Samson** | flagged 2026-08-13 |
| 14 | **Guest names for a party (the ask).** Dashboard now shows partners a guest panel (spend/visits with them) + group payment progress from `payersCount`/`paidCount` — all zero-impact. What we CAN'T show is WHO else is in the party: that lives in `invites`, whose read rule is participant-only (a partner is neither). Preferred fix: denormalize onto the booking the app already writes — `guests: [{ uid, name, paid }]` (or populate the existing `copayUids` consistently plus names). Alternative: add an isAdmin/partner read clause to `invites`, but rules can't join cheaply. | **Samson** | asked 2026-08-16 |
| 15 | **Undocumented booking fields, now read by the dashboard.** The app writes `checkout{payers,uid,customerPhone,customerEmail,nights,selections}`, `payersCount`, `paidCount`, `copayUids`, `nights`, `pointsAwarded` — none were in the v3.3 contract. Additive so nothing broke; typed as optional in schema.ts and used for guest/payment display. Please keep `payersCount`/`paidCount` accurate — the partner UI shows "N of M paid" from them. `copayUids` is currently empty on most docs. | **Samson** FYI | documented 2026-08-16 |
| 16 | **Money collected on a declined booking.** bk-09CDD842 is `declined` with `paidCount: 1, payersCount: 2` — a guest paid a share and the partner then declined. Nothing on either side surfaces or refunds it. Need a rule: declining/cancelling a partially-paid booking must trigger a refund path. | **joint** | flagged 2026-08-16 |
| 17 | 🔴 **Every checkout attempt creates a NEW booking + a NEW live Stripe session.** Confirmed 2026-08-16 — not split-pay (all duplicate sets have ONE distinct customerId). Evidence: Sunday Brunch ×3 in 34s, sessions cs_live_a1KwyFlmCW / a1Ix6KR49M / a10XDt6HcT; Palmera Paddle ×2 in 30s (first abandoned `paid:0`, retry `paid:2` — BOTH ended up `confirmed`, so the partner holds a phantom booking); Palmera Hotel ×2 at 00:30, **both with `paidCount: 1` and separate live sessions → the same stay was charged twice**, and both were then declined (see item 16). Fix: idempotency on the create path — reuse the existing pending booking + its Stripe session for the same (uid, experienceId, scheduledFor) instead of creating another. Dashboard mitigations shipped: one email per party, "Doublon possible" chip on later copies. | **Samson** | 🔴 URGENT — real double charges |
| 9 | ⚠⚠ App source exists ONLY on Samson's laptop — no version control | **Samson** | URGENT: create private palmera-app repo from Xcode (Source Control → New Git Repository → push). TestFlight stores builds, not source; a dead laptop = lost app. |

## Notification emails (ours)
Resend, from `reservations@palmeraexp.com`; templates in
`src/lib/email-templates.ts`, every send/skip/failure in `email_log`
(`/admin/emails`). Primary path since 2026-10-25: the app's
`onBookingWritten` posts `{ bookingId, event }` to `POST /api/notify/event`
(`docs/app-notify-event-contract.md`, shared `NOTIFY_SECRET`). The GitHub
poll (`.github/workflows/notify-bookings.yml`, throttled to a few runs a
day) is the backstop keyed on missing `notified.*` stamps, and sends the
time-based mails (12h partner reminder, member day-before reminder).

## Rules sync log
- 2026-10-25: **Production rules deployed from main (ruleset a5d8c669…)** — supply_orders client writes removed (server-side marketplace), explicit deny-all on pawapay_payments / pawapay_refunds / concierge_usage. No change to anything the app reads or writes. Samson: pull main before your next deploy.
- 2026-08-21: **Samson's 2026-08-12 Storage ruleset adopted verbatim** into
  `storage.rules` + partner block appended (see changelog). Storage rules
  are repo-managed from now on — `npm run storage:deploy`.
- 2026-08-13: **Samson's 2026-08-12 ruleset adopted into the repo verbatim**
  (his console deploy of 23:47 UTC — group-chat membership gating via
  chat_threads.memberIds, new invites/legal/support_messages/moment_likes/
  moment_comments rules, notifications+favorites+points hardening, invite
  spam-guard requiring a friend edge). All dashboard sections verified
  intact (bookings/ledger/payouts/countersignatures/keep()/no_show).
  NOTE: `invites` read is participant-only — the admin group-booking
  funnel (item in hub Phase 4) still needs an isAdmin read clause when
  we build it (⚠ coordinate).

## App-impact changelog (⚠ = Samson should read before next build)
Every dashboard change that touches documents/rules/indexes the app consumes
gets a line here, newest first. Pure-UI dashboard changes are never listed.

- 2026-10-25 ⚠ **Category backfill ready — NOT yet run on production
  (phase 2 of `docs/app-parity-plan-2026-10.md`).** Heads-up for the app
  side before it runs:
  - `npm run backfill:categories -- --dry` (staging:
    `FIREBASE_PROJECT=palmera-staging FIREBASE_ACCESS_TOKEN=$(gcloud auth
    print-access-token)`; production: `GOOGLE_APPLICATION_CREDENTIALS`).
    For every `experiences` doc without a valid `mainCategory` it writes
    `mainCategory` + `subcategory` = exactly what the app's classifier
    already derives for that doc (`src/lib/categories.ts` is a verbatim
    port; `scripts/check-categories.ts` guards it). `category` and every
    other field untouched. Also writes `companies.nameLower`. Idempotent.
    Members see no change; the pair simply becomes explicit and editable.
  - Staging dry run 2026-10-25: 36 listings would be filed, 4 companies
    would get `nameLower`, 0 conflicts.
  - **Production written 2026-10-25**: 38 listings filed, 4 companies got
    `nameLower`, 0 conflicts; Samson warned in the group beforehand. Values
    identical to what the app derived, so nothing moved for members.
  - `/admin/categories` lets an admin move a listing to another main/sub;
    moving the MAIN also rewrites legacy `category` via the sub→legacy map
    (Android 3.3 still places by it). Sub-only moves leave `category`.
  - `companies.categories?: MainCategoryId[]` (new, additive, dashboard-only):
    the business's app mains, from the partner profile. The app does not
    read it — it derives business chips from listings; ignore it.
- 2026-10-31 **Cancellation & refund views (dashboard reads; one additive
  admin write).** Partner reservations and the admin Money page now derive
  what happened to the money on a cancelled/declined booking from the
  receipt the app's `refundBooking` writes (`payment.status`,
  `payment.refundState`, `refundedAt`, `refundSettledAt`, `copayPayments`).
  New admin action "Refunded by hand" for `refundState: 'manual_review'`
  (the pawaPay/PayDunya refunds the processor could not do): sets
  `payment.status` + `payment.refundState` to `refunded`, `refundedAt`,
  `refundSettledAt`, and an additive `payment.refundManual { by, note, at }`
  the app never reads. No rules change (admin already writes bookings).
- 2026-10-25 ⚠ **Marketplace dépôt-vente v4 — rules change, dashboard-only
  collections, zero app impact but it IS a rules deploy.** `supply_orders`
  client writes removed (buyer create / supplier update / buyer cancel):
  every transition now goes through `/api/marketplace/orders` with the
  Admin SDK; reads unchanged; admin keeps create/update/delete for manual
  fixes. No change to any collection the app reads. New server-written doc
  `companies/{id}/private/billing` (Stripe customer + card label) under the
  existing `private/{doc}` rule (owner read, admin write). Plan v4 in
  `docs/marketplace-plan.md`, API in `docs/marketplace-api.md`. Deploy with
  `npm run rules:deploy` after Samson is told to pull main before his next
  deploy (his repo cannot deploy rules, but the habit stands).
- 2026-10-25 ⚠ **Email notifications, phases 3–4 of
  `docs/app-parity-plan-2026-10.md` §D — needs one app-side change.**
  - **New `POST /api/notify/event`** (`Authorization: Bearer NOTIFY_SECRET`,
    body `{ bookingId, event }`, events `created | confirmed | declined |
    cancelled | refunded | payment_received`). Samson's `onBookingWritten`
    should call it on real transitions — contract, when-to-fire table and a
    paste-ready functions snippet in **`docs/app-notify-event-contract.md`**.
    Idempotent per (booking, event, recipient); a failed send is a 200 with
    the failure listed, never a 500.
  - **Booking docs gain `notified.{event}_{recipient}` timestamps**
    (dashboard-written via Admin SDK, additive; the app may ignore them).
    Rules unchanged — `notified` sits outside the frozen money/anchor fields.
  - Member mails (confirmed, declined, cancelled + refund line, day-before
    reminder, payment received) are sent only when `payment.status ===
    'completed'` or `mode === 'reservation'` — the address is
    client-writable. **Once `confirmed` flows through the route, retire the
    Trigger Email extension's member confirmation** or members get two.
  - Partner set: new pending / new confirmed (unchanged wording), 12h
    reminder, cancelled by member, refund issued. Recipient
    `providers.email` → fallback `companies.email`; `notificationPrefs`
    honoured. Dashboard-originated: staff invite, agreement countersigned,
    payout sent (`POST /api/notify/dashboard`, caller's ID token).
  - **Stub rule aligned with the functions' `isUnpaidCheckoutStub`**
    (`bookingTotal > 0 && paidCount == 0 && payment.status != 'completed'`,
    any `confirmationType`) — abandoned checkouts on provider-confirmed
    listings no longer trigger "action required".
  - `/api/notify/bookings` is now the **backstop**: whole 7-day lookback
    keyed on missing stamps/logs (an outage never drops a booking), plus the
    member 24h reminder (second single-field query on `scheduledFor`, no
    composite index). Guest pass removed.
  - `/admin/emails` over `email_log` (sent / skipped: reason / failed:
    reason), read through `GET /api/admin/emails` — no rules change.
  - Env (`.env.example`): `RESEND_API_KEY`, `CRON_SECRET`, **`NOTIFY_SECRET`
    (new, set in Vercel + as a functions secret; staging gets its own)**,
    `FIREBASE_SERVICE_ACCOUNT_B64`.
- 2026-10-25 **Dashboard aligned with app release 1.55 / 3.3 (phase 1 of
  `docs/app-parity-plan-2026-10.md`).** Additive only; nothing the app
  reads changes meaning.
  - `experiences`: the dashboard now writes `mainCategory` + `subcategory`
    (the app's six-main / 37-sub taxonomy) alongside the legacy `category`,
    which is derived from the pair so Android 3.3 (places by `category`
    alone) and the app's fallback agree. Existing listings are untouched
    until the phase-2 backfill, which writes exactly what the app's
    classifier already computes (port in `src/lib/categories.ts`).
  - `companies.nameLower` written on every create/update (the app's
    `publicCompanies` and its own queries match on it).
  - `schema.ts`: `Booking.payment` is now the `PaymentReceipt` union (Stripe
    Checkout, Stripe PaymentIntent for Apple/Google Pay, pawaPay, PayDunya)
    with refund fields and `refundState`; `copayPayments` typed. Partner
    reservation detail derives the label from the receipt (`paymentStatus`
    is never written). Contract doc §"Payment state" rewritten.
  - `firestore.rules`: explicit deny-all for `pawapay_payments`,
    `pawapay_refunds`, `concierge_usage` (server-only; were already
    unmatched). No permission widened.
  - Verified before this change: production and staging Firestore/Storage
    rules are byte-identical to this repo; production indexes unchanged
    since August; the app repo cannot deploy rules (no `firestore` block in
    its `firebase.json`).
- 2026-10-16 ⚠ **Three composite indexes added for the Android app**
  (`firestore.indexes.json`): `chat_messages(thread_id ↑, created_at ↓)`,
  `notifications(user_id ↑, created_at ↓)`, `points_ledger(user_id ↑,
  created_at ↓)`. Found during QA of Palmera STG build 32: the Android app
  orders these three queries server-side (`fetchChatMessages`,
  `fetchNotifications`, `fetchPoints` in `net/Firebase.kt`), which needs a
  composite index; iOS filters then sorts client-side and needs none. No
  such index existed on staging OR production, so on Android every chat
  thread, the notification bell and the points history have always loaded
  empty (the errors are swallowed) — root cause of WhatBytes UAT bugs 6 and
  7. Deployed to palmera-staging 2026-10-16 (chat and notifications verified
  on device). **Deployed to production 2026-10-25** (`npm run indexes:deploy`,
  together with `bookings(providerId, companyId, scheduledFor)` which was in
  the file but missing in prod) — additive, no rules change, no data
  change. Longer-term either keep the indexes or align Android with the iOS
  query shape; both are fine, do not do neither.
- 2026-09-27 ⚠ **RULES DRIFT FOUND AND RECONCILED.** Production had been
  running Samson's 2026-09-08 ruleset deployed from `palmera-expo`, not this
  repo's. Effects until the merged file below is deployed: every dashboard
  feature added since Aug 25 was permission-denied in prod (staff invites +
  `staff_access`, the `/door` scanner clauses, marketplace `suppliers` /
  `products` / `supply_orders` / `supplier_ledger`), the Aug-30 member
  booking-update lock was reverted (members could again write any status or
  a fake `payment` map), the Sep-3 admin reads on favorites/chat_messages
  were missing, and `options` were world-readable again. This repo's
  `firestore.rules` now carries BOTH sides: all of ours + his nine new
  collections (`blocks`, `content_reports`, `referrals`, `checkout_intents`,
  `contact_hashes`, `contact_join_notified`, `mail`, `reward_vouchers`,
  `usernames`) and his in-block changes (moments/reviews `hidden` is
  server-owned, one review per booking at `rv_<bookingId>_<uid>`,
  chat_threads update whitelist, chat_messages reactions-only update).
  **Samson: please stop deploying `firestore.rules` from `palmera-expo`** —
  ground rule #1 still stands; send rule changes here and we deploy.
- 2026-09-27 ⚠ **Check-in field contract.** The app + `checkInBooking`
  function read `checkedInUids` (array of QR keys), `checkedIn.<key>` (ISO
  time) and `checkedInCount`; the dashboard scanner wrote only
  `checkedInGuests`/`checkedInAt`. The scanner now writes BOTH shapes and the
  rules admit them. Open: a door-staff scan does not award reservation
  points the way `checkInBooking` does — decide whether the dashboard should
  call that function (it currently authorizes providerId/admin only) or the
  function should accept `staff_access`.
- 2026-09-27 **Guest confirmation email — ours retired.** Samson's
  `onBookingWritten` emails the guest instantly on confirmation via the
  Trigger Email extension (`mail`). The dashboard's daily-cron guest pass sent
  a second, French one (Jordan got both). Partner notifications + pending
  reminders stay on our side; guest confirmations are the app's.
- 2026-09-27 ⚠ **Hours contract.** The app reads listing hours from
  `availability` (or `hours`/`schedule`) as a `{ mon..sun: { open, close } |
  { closed: true } }` map and `closedDays: [..]`. The dashboard writes
  `schedule.hours.{same,byDay}` + `schedule.days`, which his decoder does not
  understand, so app-side hours were blank for dashboard-made listings. The
  editor now ALSO writes `availability` + `closedDays` in his shape on save
  (schedule stays the dashboard's source); existing listings backfilled via
  `npm run backfill:availability`. FR fields he added (`titleFr`, `tagFr`,
  `locationFr`, `cancelNotesFr`, option `nameFr`) are optional — not written
  by the dashboard yet.
- 2026-09-27 **Hosting / deep links (item 12):** Samson's `firebase.json`
  now serves `/e/**`, `/b/**`, `/invite/**`, `/u/**` … from Hosting site
  `palmera` (palmera.web.app) with an AASA. The custom domain `palmera.app`
  shows `DOMAIN_VERIFICATION_LOST` and does not resolve to Firebase — links
  minted as palmera.app/… are dead until DNS is fixed or the app mints
  palmera.web.app links.
- 2026-09-27 **Staging environment `palmera-staging` is live (WhatBytes' Android
  work).** Separate Firebase project, outside the org, same billing account,
  Firestore `europe-west1` + Storage `us-east1` to match production. Rules,
  indexes and Storage rules are deployed to it FROM THIS REPO (single source
  of truth unchanged): `npm run staging:deploy-rules` (uses the operator's
  gcloud login, no service-account key). Public catalogue copied once via
  `npm run catalogue:copy:staging`: 36 published experiences + 54 options, the
  4 companies that own them with phone/whatsapp/email blanked, and
  config/{categories,markets,policies,featured}. Nothing private crossed
  (no providers, bookings, profiles, chats, payouts, email_log,
  countersignatory). Listing images still point at the PRODUCTION bucket
  (public-read paths) — fine for staging, but a staging upload flow writes
  to the staging bucket. App impact: none in production; staging is where
  WhatBytes test before anything reaches `palmera-platform`.
- 2026-09-03 **Additive: `isAdmin()` read on /favorites and /chat_messages.**
  Our earlier privacy tightening (owner-only favorites, thread-member chats)
  had cut off the admin Growth analytics that count them. App behavior
  unchanged — member-facing rules are exactly as before.
- 2026-09-03 ⚠ **NEW `config/featured` — admin-curated "Featured tonight" hero
  (needs a small app change to take effect).** *2026-10-28: still unread by
  iOS 1.55 / Android 3.3 (Jordan's picks saved and ignored); readers opened as
  samsonjiya002/palmera-expo#28 and samsonjiya002/palmera-android#26.* Jordan wants to control the
  Discover hero per city; today the app shows `filtered.first`. The dashboard
  now writes:
  ```
  config/featured  { byCity: { <marketId>: { experienceId } }, updatedAt, updatedByEmail }
  ```
  Keys are `config/markets` city ids (lowercase — `dakar`, `saly`, …).
  **App change requested (Samson):** when picking the Discover hero, first
  look up `config/featured.byCity[currentCity]` (match your city to the
  market id case-insensitively) and use that experience if it exists and is
  published; otherwise keep the current `filtered.first` fallback exactly as
  is. No rules/index changes needed — `config/*` is already world-readable
  and admin-writable. An absent doc, absent city key, or stale experienceId
  must all fall through to today's behavior.
- 2026-08-30 ⚠ **Member booking updates locked to the cancel patch.** The
  customer-update clause on `/bookings` previously froze anchors + money but
  left `status` and `payment` writable — a member could flip their own booking
  to `completed` with a fabricated `payment.status: "completed"`, minting
  points and fake delivered revenue. Verified against the app source: the only
  client-side booking update is `AppState.cancelBooking` (REST patch of
  `status`/`cancelledAt`/`updatedAt`), and `payment` is written solely by the
  Cloud Functions via the Admin SDK (rules-exempt). The clause now allows only
  `pending|confirmed → cancelled` touching exactly those three fields.
  **App impact: none** — cancel keeps working, functions keep working. If a
  future app feature needs members to patch anything else on a booking, the
  clause must be widened first.
- 2026-08-26 ⚠ **Legacy `partners/{uid}` collection FROZEN (writes denied).**
  The v1 onboarding pages that wrote to it are deleted; the collection
  stays readable by its owner + admin as the migration archive. The app
  never touched it (verified against the Swift source). Deploys with the
  next `npm run rules:deploy`. The top-level `/listings` public-read
  fallback the iOS catalog loader probes is UNTOUCHED.

- 2026-08-25 ⚠ **Staff roles: partners invite door staff (scanner-only).**
  New dashboard-owned collections `staff` (invites: companyId, providerId,
  email, name, role 'door', status) and `staff_access/{companyId}_{uid}`
  (the O(1) membership doc booking rules key on — created at claim,
  deleted on revoke). Bookings gain two clauses: active door staff of a
  company may READ its bookings and record CHECK-INS (same
  confirmed→completed transition + arrivals-only follow-ups, same money
  freeze, same 12h window as partners). New surface `/door`: staff sign in
  with the invited email (verified), land straight in the ticket scanner.
  App impact: none — the app never reads these collections; the bookings
  clauses are additive read/transition grants for dashboard accounts.
  Deploys with the next `npm run rules:deploy`.

- 2026-08-25 ⚠ **Ticket QR scanner + check-in = the completion mechanism.**
  The dashboard now scans the app's per-guest ticket QR
  (`palmera://checkin?booking=…&exp=…&guest=…` — read from
  BookingDetailsView.swift in the shared repo) from Reservations →
  "Scanner un billet". First valid scan of a CONFIRMED booking sets
  `status: 'completed'` + `checkedInAt`; every scan appends the guest id to
  `checkedInGuests: string[]` (NEW, additive) so the rest of a party's
  tickets stay valid ("2/4"). Rules: partners may set confirmed→completed
  from 12h before `scheduledFor` (never earlier — no pulling payouts
  forward), and may append ONLY the arrival fields afterwards. This starts
  resolving SYNC item 11: scanned bookings complete for real; date-passed
  auto-completion remains the fallback for unscanned ones. App side:
  nothing required; nice-to-have = show "checked in" state on the guest's
  ticket from `checkedInGuests`.

- 2026-08-23 ⚠ **Listing time model: NO DURATION. Bookable hours / check-in–out / event window instead.** (Jordan's call.)

  **Why.** A listing-level "duration" contradicted opening hours and
  check-in/out, and it was redundant: how long a guest gets (2 h vs 4 h on a
  yacht, 60 vs 90 min at a spa, standard vs suite) is already a **required
  choice** (`optionGroups` with `required: true`) on the listing. So the
  listing now only says WHEN it's bookable.

  **What the dashboard writes now (all additive; see `src/lib/schema.ts`):**
  | Shape | Categories | Fields |
  |---|---|---|
  | Regular (default) | everything except hotels/villas, when `scheduleType: 'ongoing'` | `schedule.days: ['Mon'…]` (empty = every day) · `schedule.hours: { same: { open: 'HH:MM', close: 'HH:MM' }, byDay?: { Mon: {open,close} | null … } }` — `byDay[d] === null` means closed that day; a missing key means "same" applies |
  | Stay | hotels, villas (`scheduleType: 'ongoing'`) | `schedule.days` · `checkInTime: 'HH:MM'` · `checkOutTime: 'HH:MM'` · `minNights: number` · `schedule.hours: null` |
  | Event | any category, `scheduleType: 'one_time'` | `eventDate` (START, as before) · **`eventEnd`** (NEW, Timestamp) · `schedule: null` |

  **What the dashboard no longer writes:** `duration` (now `''`),
  `durationValue`, `durationUnit`, `schedule.timeSlots` (the free-text
  "9h, 14h" list). `scheduleType: 'scheduled'` is no longer produced —
  legacy docs with it should be read as `'ongoing'` + `schedule.days`.
  Older docs keep whatever they had; nothing was bulk-rewritten.

  **What the app should do:**
  1. Booking picker for regular listings: offer START times inside
     `schedule.hours` for the chosen day (`byDay[day] ?? same`; `null` =
     closed; day not in `schedule.days` = closed). No end time is chosen by
     the guest — the selected required option defines what they get.
  2. Stays: date range picker; nights ≥ `minNights`; show check-in/out times.
  3. Events: show `eventDate` → `eventEnd`.
  4. Stop rendering `duration` on cards/details — it will be empty on every
     listing saved from now on. If a card needs a "length" label, take it
     from the required choice's option names.
  This is the precise shape for the "availability" item already on your
  list; enforcing it at checkout is the app's half.

- 2026-08-23 ⚠ **Experiences: `duration` is no longer collected.** Jordan:
  a start time + a duration contradicts operating hours / check-in–out.
  The editor field is gone; new listings write `duration: ''` and never
  write `durationValue`/`durationUnit`. Older listings keep their strings.
  If the app renders "2 hours" on a card, expect it empty on new listings
  — timing will come from the schedule model (start times / opening hours
  / check-in–out) once the availability design lands (joint).

- 2026-08-23 ⚠ **Cancellation & refund policy — DECIDED (Jordan).** Four
  free-cancellation windows: **24 h / 48 h / 3 days / 5 days**. Outside the
  window → full refund. Inside → no refund (business paid in full,
  commission applies). No-show → no refund. Business cancels/declines a
  PAID booking → full refund, no commission.
  Data: `config/policies` rewritten (version 2026-08-23) — tiers
  `flexible: 24h, moderate: 48h (was 72), strict: 72h (was 168), firm: 120h
  (NEW)`, `partialRefundPct: 0` everywhere, plus an explicit `refundRules`
  map. `cancelDeadlineHours` BACKFILLED on all 35 experiences from the new
  windows — read that field; it's authoritative. Existing bookings keep the
  tier they were created with; the window for refund decisions is the
  listing's `cancelDeadlineHours` at cancel time.
  **App work (Samson):** execute the refund in Stripe/PayDunya per these
  rules on guest cancel; refund in full on partner decline of a paid
  booking (closes items 16/17's money leg).

- 2026-08-22 ⚠ FYI **Companies gain optional `email`, `instagram`, `tiktok`,
  `description`** (Jordan/ChatGPT #28 — fuller public profile). Additive,
  null/absent on existing docs. If the app renders a company card, it can
  show `description` (≤400 chars) and link the socials; `email` is the
  business contact, not the login.

- 2026-08-22 ⚠ **Rules hardening (security audit):** (1) `isAdmin()` now also
  requires `email_verified == true` — Firestore AND Storage; (2) supplier
  claim/lookup requires a verified email; (3) experience CREATE by a
  partner must carry `rating: 0` / `reviews: 0` (the client always did);
  (4) `experiences/{id}/options` are readable only when the parent is
  published/active, or by owner/admin — the app only reads options of
  published listings, so no behaviour change, but NOTE the rule now does a
  `get()` on the parent per options read. No other rule changed.

- 2026-08-22 ⚠ **Experiences gain `cancelDeadlineHours: number|null`** — the
  resolved free-cancellation window (hours before `scheduledFor`) for the
  listing's policy tier, denormalized from `config/policies` at every save.
  This is the "cancel within 24h / 48h" field from the Aug 19 call: the
  app should read it to decide refund eligibility instead of joining
  config. Additive; null on listings not re-saved yet (fall back to the
  tier lookup until then).

- 2026-08-21 ⚠ **Experiences gain optional `durationValue` (number) +
  `durationUnit` ('minutes'|'hours'|'days'|'nights')** — structured duration
  from the editor. Purely additive: the legacy `duration` string is STILL
  written (synthesized, e.g. "2 heures"), so nothing the app renders
  changes. Null on older listings until edited.

- 2026-08-21 ⚠ FYI **Partners can now write to `support_messages`** ("Get help
  with this booking" in the reservation drawer). Docs use the app's
  snake_case convention under the existing create rule (`user_id` = caller)
  and carry `source: 'partner_dashboard'` plus a `booking{}` context map —
  filter on `source` if the app's support inbox should only show member
  messages. No rule change.

- 2026-08-21 🔴 **Storage rules: partner uploads were DENIED since 2026-08-12.**
  Samson's Storage ruleset (console deploy, Aug 12 23:47 UTC) scoped the
  bucket to avatars/moments/chat with a catch-all deny — the dashboard
  uploads to `partners/{uid}/…`, so every listing photo, gallery, logo,
  menu and product photo upload failed silently for nine days (existing
  tokenized URLs kept working, masking it). Fixed by adopting his rules
  VERBATIM into `storage.rules` (now repo-managed, `npm run storage:deploy`)
  plus a `partners/{uid}/**` block: public read, owner write, images or PDF
  up to 20 MB. His three app folders are untouched. Same rule as Firestore
  from here on: Storage rules live in this repo; console edits get
  overwritten. Dashboard side also now SHOWS upload failures instead of
  swallowing them.

- 2026-08-19 ⚠ **Rules: marketplace block amended** — supply_orders gains a
  buyer-cancel clause (a partner may flip their OWN awaiting_payment order
  to cancelled, money fields frozen). Still additive, app untouched.
- 2026-08-19 ⚠ **Rules: marketplace block added (suppliers / products /
  supply_orders / supplier_ledger)** — phase 1 of the supply marketplace
  (docs/marketplace-plan.md). ALL new collections, dashboard-owned; the app
  reads/writes NONE of them, and no existing rule was touched. Additive
  only. NOTE for Samson: `products` is a new top-level collection name —
  if the app ever adds a collection, avoid that name. Deploys with the
  next `npm run rules:deploy`; pull main before any rules deploy.

- 2026-08-18 ⚠ **Rules: admins may CREATE experiences on a partner's behalf**
  — the experiences create rule gains an `|| isAdmin()` branch (Jordan needs
  to author listings for businesses from /admin this week). The partner path
  is byte-for-byte unchanged: providerId must equal auth.uid, ownsCompany,
  tag null. Admin-created docs still carry the PARTNER's providerId and the
  same active↔status consistency check. App impact: none — the app never
  creates experiences. Deployed from repo (`npm run rules:deploy`); pull
  main before your next rules deploy.

- 2026-08-04 ⚠ **Experiences gain optional `menuUrl` + `menuType`** —
  restaurant-style listings (dining/nightlife categories) can now attach a
  menu from the dashboard editor: `menuUrl: string|null` (Firebase Storage
  download URL under partners/{uid}/experience_*_menu/), `menuType:
  'pdf'|'image'|null`. Purely additive — absent/null on every existing doc;
  app can ignore until it renders a "View menu" affordance (PDF opens in a
  viewer/browser, image renders inline).
- 2026-08-02 ⚠ **All 13 categories enabled in `config/categories`** (Jordan's
  partner-pipeline list): activities, lifestyle, villas, islands, yachts,
  entertainment, sports flipped on (hotels, dining, wellness, rentals,
  nightlife, safari already were). No ids or names changed. If the app
  renders category pickers/filters from this doc, it now shows 13 instead
  of 6.
- 2026-08-01 ⚠ **8 new Senegal cities enabled in `config/markets`** (from
  Jordan): sine-saloum, lampoul, saint-louis, lac-rose, pointe-sarene, goree,
  ngor, ngaparou (names: Sine Saloum, Lampoul, Saint-Louis, Lac Rose, Pointe
  Sarène, Gorée, Ngor, Ngaparou). Additive only — no existing ids or names
  changed. If the app renders city pickers/filters from this doc, they now
  show 10 enabled cities instead of 2.
- 2026-08-01 ⚠ **optionGroups: extras sets now write `maxSelect: 99`** (was 1).
  Same shape; semantic: guests may select multiple different extras in one
  group. If the app enforces maxSelect at checkout, multi-select now applies.
- 2026-08-01 ⚠ **Partners can self-unpublish** (`status: 'unpublished'`).
  Status existed in the schema; app read rules already hide it — but listings
  can now vanish from the app by partner action.
- 2026-08-01 Booking optional fields (`customerPhone/Email`, `specialRequests`,
  `paymentStatus`, `payment` map), customer-update rule, composite indexes —
  all in booking-contract-for-app.md.

## Standing risk to watch
Both sides can deploy the whole ruleset; whoever deploys last wins. Until
item 8 is agreed, ANY rules change should be announced in the group chat
before deploying, and the deployer must pull `main` first.
