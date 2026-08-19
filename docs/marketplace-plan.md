# Palmera Marketplace — B2B supply ordering (plan, 2026-08-19)

## The idea (Jordan)
Hotels/restaurants in West Africa routinely buy a few items from a nearby
vendor when they sell more than expected, rather than dipping into their own
stock. Palmera gives partners that as e-commerce: vendors (starting with
alcohol suppliers) manage inventory on their own Palmera surface; partners
browse and order directly from the partner dashboard. Palmera owns the
transaction rails.

## Shape of the system — three surfaces, one repo
Everything lives in palmera-site (same Firebase project, same auth, same pf
design system). "A separate website for vendors" = a new route group
`/vendor`, exactly like `/partner` is for experience partners. A separate
domain can point at it later if wanted — zero extra infra.

- **/vendor** — vendor portal: onboarding, product inventory CRUD, order
  inbox (accept → fulfill/deliver), sales history.
- **/partner/marketplace** — the store: browse catalog, cart, place order,
  order history + status.
- **/admin** — vendor directory, order monitor, marketplace GMV (extends the
  existing Money page).

**App impact: ZERO.** The iOS app never touches these collections. New
collections + rules are additive; the rules deploy still follows the Samson
announce-first protocol, but nothing he reads or writes changes.

## Data model (new collections, all dashboard-owned)
- `vendors/{uid}` — mirror of providers: name, phone, email, city, status
  (pending/active/paused), created by self-signup or admin (concierge, same
  as experiences).
- `vendors/{uid}/private/*` — payout/bank details, admin status.
- `products/{id}` — vendorId, name, category ('alcohol' first; enum grows),
  photo, unit ('bottle'|'case'|'crate'...), unitSize ("75cl", "×24"),
  price (XOF), stock (int), status live/hidden. Flat collection (not a
  subcollection) so the partner store can query the whole catalog with one
  city/category filter.
- `marketplace_orders/{id}` — partnerId + companyId (buyer), vendorId,
  items[{productId, name, unitPrice, qty, lineTotal}] (denormalized — the
  order is a receipt, immune to later price edits), orderTotal, note,
  status: submitted → accepted → delivered → completed | declined |
  cancelled, timestamps per transition, paymentMethod + paymentStatus.
- `config/marketplace` — categories, cities enabled, Palmera fee (if any).

Rules sketch (additive block):
- vendors: own read/write; admin all; partners may read `active` vendors.
- products: vendor writes own; signed-in partners read live products; admin all.
- marketplace_orders: buyer creates (own companyId, status 'submitted') and
  reads own; vendor reads/updates status on orders addressed to them
  (anchors + money frozen via keep(), same pattern as bookings); admin all.

## What we deliberately DON'T build in v1
- **Online payment.** B2B supply here runs on cash/mobile-money on delivery.
  v1 records `paymentMethod: 'on_delivery'` and lets the vendor mark paid.
  Stripe/PayDunya collection can bolt on later — the order doc already
  carries the fields. This removes the single biggest chunk of work AND the
  regulatory question of Palmera holding money for alcohol sales.
- **Delivery logistics.** Vendor delivers or partner picks up; the order has
  a free-text fulfillment note. No courier tracking.
- **Stock reservation/decrement race-safety.** v1 decrements stock on
  accept (vendor-side write); oversell is resolved humanly, like the real-
  world behavior this digitizes.

## Phases
**Phase 1 — Vendor portal (1–2 sessions).** /vendor auth shell (clone of
/partner shell), vendor onboarding (concierge-friendly: admin can create
vendors + products, same as experiences), product CRUD with photo upload,
inventory list with stock/status toggles.

**Phase 2 — Partner store (1–2 sessions).** /partner/marketplace nav entry:
catalog grid (city-filtered, category chips), product page, cart (local
state), order submission, "My orders" with status timeline. Empty-state if
no vendors in the partner's city yet.

**Phase 3 — Order lifecycle + notifications (1 session).** Vendor order
inbox (accept/decline/mark delivered/mark paid), partner status view,
email notifications both directions via the existing Resend poller
(new `kind`s in email_log). Admin: vendor directory + orders table + GMV
tile on Money.

**Phase 4 — later.** Online payment rails, Palmera commission/fee on
orders, statements/CSV, WhatsApp notifications, courier integration,
multi-category expansion beyond alcohol.

## Decisions (Arjun, 2026-08-19)
1. **Vendor onboarding: concierge-only at launch.** Admin creates vendors and
   their products from /admin (same play as experiences); vendors get login
   access to manage inventory once set up. Self-serve signup deferred.
2. **Buyers: all active partners.** No category gating.
3. **Commission from day one.** Each vendor carries a commission rate
   (decimal, same mechanics as company rates). Every order records
   `commissionRate`, `commissionAmount`, and `vendorNet` at submission time
   (frozen on the receipt). Since v1 payment is cash/mobile-money on
   delivery, Palmera doesn't intercept funds — the admin Money view tracks
   **commission owed per vendor** and settlement is recorded manually
   (invoice/collect), until online rails land in Phase 4.
4. Licensing: OPEN — Jordan confirms vendors hold required permits; Palmera
   is the ordering rail, not the seller of record.

Phase deltas from the decisions: Phase 1 adds admin vendor+product creation
(reusing the concierge pattern); Phase 3's admin view adds the
commission-owed-per-vendor table and a "mark settled" action.
