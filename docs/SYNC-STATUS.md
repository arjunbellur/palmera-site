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
| 3 | Point payment writes at the booking's own doc id | **Samson** | rule gap fixed our side; his code change pending |
| 4 | Confirm the 8 orphan payment docs are abandoned → we wipe | **Samson** confirm, us delete | pending |
| 5 | Free-reservation flow (no payment, "Confirm", points) | **Samson** | spec now in contract doc |
| 6 | App-side rules hardening (points self-grant, open chat, favorites delete, notification spam) | **Samson** specs the change → we land it in repo + deploy | pending — flagged ⚠ inline in firestore.rules |
| 7 | Server-side validation of client-authored booking money fields | joint (needs Cloud Function or trusted server) | pre-launch requirement, not blocking testing |
| 8 | Agree rules-through-repo workflow explicitly | **Arjun ↔ Samson** | UPDATED: Samson has NO repo (Xcode → TestFlight directly). Therefore ALL rules changes flow through THIS repo — he requests, we land + deploy. He must not console-edit. |
| 9 | ⚠⚠ App source exists ONLY on Samson's laptop — no version control | **Samson** | URGENT: create private palmera-app repo from Xcode (Source Control → New Git Repository → push). TestFlight stores builds, not source; a dead laptop = lost app. |

## App-impact changelog (⚠ = Samson should read before next build)
Every dashboard change that touches documents/rules/indexes the app consumes
gets a line here, newest first. Pure-UI dashboard changes are never listed.

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
