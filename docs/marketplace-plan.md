# Palmera Marketplace — partner supply ordering (plan v2, 2026-08-19)

> **⚠ PIVOT PENDING (v3, decided on the 2026-08-19 Arjun/Jordan call):**
> the model changes from pre-purchase e-commerce to **lend-first / pay-after**
> (dépôt-vente): the supplier lends stock to the business; the business
> reports what it actually used; the supplier collects leftovers, verifies
> the count, and confirms — payment captures then, for consumption only.
> Payment becomes **authorize-and-hold** (authorize the full reserved amount
> at order time, capture the recalculated amount on supplier confirmation).
> New requirements: per-product order quantities, delivery (paid fee) vs
> pickup, usage reporting step, supplier verification step, supplier
> thresholds for new customers (e.g. >10 bottles → manual review), all
> supplier inventory on-platform with stock-out/low-stock warnings.
> French nav label: "Dépôt-vente" (English stays "Market"). Alcohol only at
> launch. Arjun to wireframe candidate workflows and pick the fastest to
> implement — the phases below describe the v2 build that SHIPPED (store +
> Stripe checkout) and will be restructured, not thrown away: catalog,
> cart, receipts, webhook, and rules all carry over.


## The idea (Jordan)
West African hotels/restaurants routinely top up from a supplier when they
sell more than expected, instead of dipping into their own stock. Palmera
digitizes that: **suppliers** (family-vetted wholesale businesses, alcohol
first) get their own lightweight system to manage and sell their inventory
— likely their first digital tooling, which is itself the pitch to them —
and **partners** get in-dashboard purchasing for real operational tasks
(stocking up for a restaurant event). Strategic goal: the dashboard becomes
the partner's daily operations tool, not just a booking inbox.

Terminology: **supplier** everywhere (code, collections, UI) — never
"vendor" — so it can't blur with partners/providers (experience businesses).

## Money model — partners pay IN platform (Arjun, 2026-08-19)
Palmera is merchant of record, same as experience bookings:
- Partner pays the full order total at checkout (Stripe card; PayDunya
  mobile money later — same dual-rail philosophy as the app).
- Palmera takes its commission; the **supplier accrues the net** in a
  ledger, settled via payouts — the SAME payout model the BPA already
  establishes for partners (biweekly, recorded in the dashboard).
- Every order freezes `commissionRate`, `commissionAmount`, `supplierNet`
  at submission (receipt semantics, immune to later rate/price edits).
- Refund path is defined from day one: an order declined or cancelled
  after payment triggers a Stripe refund — we will NOT repeat the app's
  declined-but-paid gap (SYNC item 16).
- Idempotent checkout: ONE order doc + ONE Stripe session per cart
  submission, session id stored on the order — we will not repeat the
  app's duplicate-booking bug (SYNC item 17).

New build this requires (dashboard repo, first Stripe integration here):
`/api/marketplace/checkout` (creates Stripe Checkout session server-side)
+ `/api/webhooks/stripe` (marks order paid; verified signature). Needs
STRIPE_SECRET_KEY + webhook secret in Vercel (Sensitive), reusing the same
Stripe account the app charges through.

## Three surfaces, one repo
Same Firebase project, same auth, same pf design system. The "separate
website" for suppliers = a new route group `/supplier` (a domain can point
at it later — zero extra infra).
- **/supplier** — inventory CRUD, order inbox (accept → deliver), sales +
  accrued-balance view.
- **/partner/marketplace** — catalog, cart, pay, order history + status.
- **/admin** — supplier directory (concierge creation), order monitor,
  marketplace GMV + commission, supplier payout ledger.

**App impact: ZERO** — the iOS app never touches these collections. Rules
additions are additive; deploy still follows the announce-first protocol.

## Data model (new, dashboard-owned)
- `suppliers/{uid}` — name, phone, email, city, status, commissionRate
  (decimal, same mechanics as company rates).
- `suppliers/{uid}/private/*` — payout details, admin notes.
- `products/{id}` — supplierId, name, category ('alcohol' first), photo,
  unit ('bottle'|'case'|'crate'…), unitSize, price XOF, stock, status.
  Flat collection → one query serves the whole store.
- `supply_orders/{id}` — companyId + partnerId (buyer), supplierId,
  items[] denormalized, orderTotal, commissionRate/commissionAmount/
  supplierNet, payment {provider:'stripe', sessionId, status}, status:
  awaiting_payment → paid → accepted → delivered | declined(→refunded) |
  cancelled(→refunded), per-transition timestamps, note.
- `supplier_ledger/{id}` — credit entries (order net) + payout debits;
  mirrors the partner ledger design from schema v3.3.
- `config/marketplace` — categories, enabled cities.

Rules sketch: suppliers own-read/write + admin; products supplier-write-own,
partner read live; supply_orders buyer-create ('awaiting_payment' only,
money fields validated) + read-own, supplier read/update status on own
orders (anchors + money frozen via keep()), admin all; ledger read-own +
admin (writes via Admin SDK only, like the partner ledger).

## Phases
**Phase 1 — Supplier portal + concierge (1–2 sessions).** /supplier shell,
product/inventory CRUD; /admin supplier creation + product authoring on
their behalf (same concierge pattern as experiences, storageUid lesson
applied from day one).
**Phase 2 — Partner store + payment (2 sessions).** Marketplace tab,
catalog, cart, Stripe Checkout + webhook, order history. This is the
critical phase — payment correctness (idempotency, refunds) gets built
here, not retrofitted.
**Phase 3 — Lifecycle + money ops (1 session).** Supplier order inbox,
email notifications both directions (existing Resend poller, new kinds),
supplier accrued balance, admin GMV/commission + payout recording.
**Phase 4 — later.** PayDunya rail, statements/CSV, WhatsApp notifications,
delivery tracking, self-serve supplier signup, more categories.

## Decisions (Arjun, 2026-08-19)
1. Supplier onboarding: **concierge-only** at launch (admin creates
   suppliers + products; suppliers log in to manage stock).
2. Buyers: **all active partners** — no category gating.
3. **Commission from day one**, and **payment happens in-platform**:
   Palmera collects, keeps its cut, supplier is paid the net via payouts.
4. Licensing: OPEN — Jordan confirms suppliers hold required permits;
   B2B sales to licensed establishments.

## v1 exclusions
Delivery logistics (free-text fulfillment note), race-safe stock
reservation (stock decrements on accept; oversell resolved humanly),
PayDunya (Stripe first), statements.
