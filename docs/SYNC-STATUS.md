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

## Partner notification emails (ours)
Resend, from `reservations@palmeraexp.com`. Pending → "action required";
instant-confirmed → FYI; awaiting-payment → silent. Driven by a GitHub
Actions poll every 5 min (`.github/workflows/notify-bookings.yml`), with
Vercel's daily cron as backstop. For true instant delivery later: a
Firestore onCreate Cloud Function, or the app POSTing our endpoint after
it writes a booking (⚠ would need Samson).

## Rules sync log
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
