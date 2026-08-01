# App ↔ Dashboard sync status

Living tracker for the two-sided integration. Update this whenever either
side ships something that touches the shared surface (schema, rules,
indexes, collections). Last updated: 2026-08-01.

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
| 1 | Create 5 composite indexes (console links) | **Arjun** | pending — additive, safe regardless of Samson's concurrent work |
| 2 | Verify dashboard query returns Jordan's booking post-index | us | after #1 |
| 3 | Point payment writes at the booking's own doc id | **Samson** | rule gap fixed our side; his code change pending |
| 4 | Confirm the 8 orphan payment docs are abandoned → we wipe | **Samson** confirm, us delete | pending |
| 5 | Free-reservation flow (no payment, "Confirm", points) | **Samson** | spec now in contract doc |
| 6 | App-side rules hardening (points self-grant, open chat, favorites delete, notification spam) | **Samson**, via repo PR not console | pending — flagged ⚠ inline in firestore.rules |
| 7 | Server-side validation of client-authored booking money fields | joint (needs Cloud Function or trusted server) | pre-launch requirement, not blocking testing |
| 8 | Agree rules-through-repo workflow explicitly | **Arjun ↔ Samson** | this doc is the proposal |

## Standing risk to watch
Both sides can deploy the whole ruleset; whoever deploys last wins. Until
item 8 is agreed, ANY rules change should be announced in the group chat
before deploying, and the deployer must pull `main` first.
