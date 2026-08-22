# Palmera Marketplace — Dépôt-vente (plan v3, 2026-08-22)

Supersedes v2. Source: the 2026-08-19 Arjun/Jordan call, re-read in full.
Vocabulary: **supplier** (never vendor) in code/UI; FR nav label "Dépôt-vente",
EN "Market". Alcohol only at launch ("a bottle of Jack Daniels is a bottle of
Jack Daniels" — quality disputes don't exist).

## The model — lend first, pay after
A supplier lends bottles to a business for an event. The business uses some,
keeps some, returns the rest. The supplier collects the leftovers, verifies
the count, and ONLY THEN is the business charged — for what it consumed.
Jordan: "That's the beauty of it." Everything below serves that loop.

## Order state machine
```
draft ──submit──▶ submitted ──(qty > threshold or first order > cap)──▶ pending_review ──accept──▶ accepted
                      └──(within threshold)────────────────────────────────────────────────────▶ accepted
accepted ──supplier marks handed over──▶ handed_over        (delivery or pickup)
handed_over ──business reports leftovers──▶ reported
reported ──supplier verifies count, confirms──▶ settled     (final amount fixed here)
settled ──charge succeeds──▶ paid ──▶ closed
settled ──charge fails / paid off-platform──▶ payment_due ──supplier records cash/Wave──▶ paid
any pre-handover state ──▶ declined | cancelled
```
Actors: **business** builds cart + chooses fulfilment + reports leftovers;
**supplier** reviews, hands over, verifies, confirms; **Palmera** charges,
takes commission, pays the supplier net via the supplier ledger.

## Order lines
Each line: `productId, name, unitPrice, qty, mode: 'buy' | 'borrow'`.
- **buy**: charged for `qty` no matter what.
- **borrow**: charged for `qty − returnedQty` (as verified by the supplier).
Checkout shows the full lend value ("20K × 10, 18K × 10, 15K × 10 — you
see the full price of what you'd be paying"). Final amount is recomputed at
settlement; the receipt keeps both numbers.

## Fulfilment
`fulfilment: 'delivery' | 'pickup'`. Delivery carries a fee the supplier
sets on their profile (`deliveryFee`, XOF, flat per order). Pickup: the
supplier marks "ready", business sees pickup window. Return collection is
the supplier's ("usually the next morning") — `returnPickupAt` optional.

## Thresholds (supplier credibility of the BUSINESS — "the opposite way")
Supplier profile: `maxPerOrder` (default 10 units) and `firstOrderMax`
(default 10). Over either → `pending_review`; supplier accepts or declines.
v1 = basic thresholds. Later: auto-raise after N completed orders.

## Inventory
All supplier stock lives on Palmera. `stock` decrements on **accepted**,
increments by `returnedQty` on **settled**. Product shows "not enough
stock" when a cart exceeds it. Supplier sets `lowStockAt`; inventory view
flags products at/below it (email nudge later).

## Money
- Charge happens ONCE, at settlement: Σ buy lines + Σ borrow lines × used +
  delivery fee. Commission = rate × goods subtotal (not the delivery fee —
  the fee is the supplier's cost). Rate = supplier's `commissionRate`
  (decimal; 10% default, same mechanics as partners).
- **Rail decision (resolved by research):** Paystack does NOT operate in
  Senegal (CI/GH/KE/NG/ZA only). Wave/Orange Money = **PayDunya**, which the
  app already uses. So: Stripe for cards (card saved on file at first order
  via Checkout *setup mode*; charged off-session at settlement) + PayDunya
  for mobile money (phase later) + **off-platform fallback** (cash/Wave at
  collection) recorded by the supplier, with Palmera's commission then owed
  by the supplier and tracked in the admin "commission owed" view.
- Why NOT authorize-and-hold: holds expire (7 days), can't capture MORE than
  authorized (keep-extra-bottles breaks it), and it makes the supplier the
  one "authorizing" — Arjun's own objection on the call. Pay-after with a
  saved card gives the same guarantee with none of the edge cases.
- Supplier is paid the net through `supplier_ledger` → payouts, mirroring
  the partner BPA model.

## Phases
**M1 — Schema + rules (½ session, ⚠ SYNC log).** Order lines gain `mode`,
`returnedQty`, `usedQty`; order gains `fulfilment`, `deliveryFee`,
`reportedAt/handedOverAt/settledAt`, `finalTotal`, `paymentMethod`
('card'|'off_platform'), `paymentRecordedBy`; supplier gains `deliveryFee`,
`maxPerOrder`, `firstOrderMax`, `lowStockAt`. Rules: business may update
ONLY the leftover report on own handed_over order; supplier transitions
with money frozen (final numbers written server-side).
**M2 — Partner store v3 (1 session).** Per-line buy/borrow + qty, delivery
vs pickup, full-lend-value checkout, card-on-file (Stripe setup session),
"My orders" timeline, **usage report form** on handed-over orders
("out of these 3 bottles I have 2 left").
**M3 — Supplier portal v2 (1–2 sessions).** Order inbox: review queue,
accept/decline, mark handed over / ready for pickup; **settlement screen**:
enter returned counts per line → live final amount → confirm (this is the
charge trigger); inventory thresholds + low-stock flags; delivery fee +
thresholds in profile.
**M4 — Settlement payments (1 session).** `/api/marketplace/settle` (Admin
SDK: recompute, freeze, create off-session PaymentIntent) + webhook updates;
failure → payment_due with supplier "record off-platform payment" action;
supplier_ledger credit on paid; refund path on disputes = admin action.
**M5 — Admin (½ session).** Orders monitor by state, commission collected
vs owed (off-platform), supplier net owed, settle/mark-paid actions.

## Decisions needed (Arjun/Jordan) — defaults I'll build unless told otherwise
1. Who confirms handover: **supplier** (they physically hand the goods over;
   Jordan said both at different points).
2. Delivery fee: supplier-set flat fee, charged at settlement, **no
   commission on it**.
3. Marketplace commission: **10%** default per supplier (editable, decimals).
4. Purchased ("buy") lines: charged **at settlement** with everything else —
   one charge per order, one receipt.
5. Dispute (supplier count ≠ business report): supplier's verified count
   wins at settlement; business can "get help" → admin can adjust/refund.
6. Usage report semantics: business reports **leftovers returned** per line;
   used = handed − returned. Keeping extra = simply returning fewer.

## Wireframes
Arjun promised Jordan wireframes of the candidate workflows. The flow above
is the recommended one; the wireframe set (business: cart → fulfilment →
report; supplier: inbox → handover → settle) is the first M2/M3 deliverable
so Jordan signs off on screens before code.
