# Marketplace (dépôt-vente) — API contract, v4

Single source for the three screens (partner store, supplier portal, admin).
Plan and vocabulary: `docs/marketplace-plan.md`. Types: `src/lib/schema.ts`
(`SupplyOrder`, `SupplyOrderItem`, `SupplyOrderPayment`, `Supplier`,
`SupplyProduct`, `CompanyBilling`, `SupplierLedgerEntry`).

Clients only READ `supply_orders` (own as buyer, own as supplier, admin).
Every write is a POST below with `Authorization: Bearer <Firebase ID token>`
and `Content-Type: application/json`. Errors are `{ ok: false, error }` with
a 4xx; success is `{ ok: true, order: SupplyOrder & { id } }` unless noted.
XOF is zero-decimal everywhere (whole francs).

## The loop

```
business                supplier                     Palmera (server)
────────                ────────                     ────────────────
build cart ─ submit ──▶ submitted / pending_review   create order, freeze prices + rate,
   (card saved now,                                  stock + threshold checks,
    or save-card link)                               Stripe setup session if no card
                        accept ───────────────────▶ stock −qty per line
                        decline ──────────────────▶ status declined
cancel (pre-handover) ─────────────────────────────▶ status cancelled
                        hand_over ────────────────▶ handed_over (delivered or picked up)
report leftovers ─────────────────────────────────▶ reported (reportedReturnedQty per borrow line)
                        settle (verified counts) ─▶ final amounts frozen, stock +returned,
                                                     charge card off-session:
                                                       ok    → paid  (+ supplier_ledger order_net)
                                                       fails → payment_due
pay_now (payment_due) ────────────────────────────▶ Stripe Checkout (payment) → webhook → paid
                        record_payment (cash/Wave) ▶ paid, paymentMethod off_platform
                                                     (+ supplier_ledger commission_owed, negative)
```

## POST /api/marketplace/orders — business submits an order

Body:
```json
{ "companyId": "…", "fulfilment": "delivery" | "pickup", "note": "…",
  "items": [ { "productId": "…", "qty": 10, "mode": "borrow" | "buy" } ] }
```
Rules enforced server-side: caller owns the company; 1–50 lines; qty 1–999;
one supplier per order; every product `live`; `qty ≤ stock` per line (409
`insufficient stock: <name>` otherwise); supplier `active`; the company has
no order in `payment_due` (402 `unpaid order` — pay it first).

Threshold: `totalUnits > supplier.maxPerOrder` (default 10), or the
company's first order with this supplier and `totalUnits > firstOrderMax`
(default 10) → status `pending_review` with `reviewReason`; else `submitted`.

Card on file: if `companies/{id}/private/billing` has a `paymentMethodId`
the order is created with `payment.status = 'card_saved'`. Otherwise the
order is still created (`payment.status = 'none'`) and the response carries
`setupUrl`: a Stripe Checkout session in **setup mode** (no charge). The
store redirects there; Stripe returns to
`/partner/marketplace?order=<id>&setup=success|cancelled`. On
`setup=success` the store calls `POST /api/marketplace/billing/sync`.

Response: `{ ok, orderId, order, setupUrl?: string }`.

## POST /api/marketplace/billing/sync — finish saving the card

Body `{ "orderId": "…" }`. Server retrieves the setup session, stores
customer + payment method + card label on `companies/{id}/private/billing`
and on the order (`payment.status = 'card_saved'`). Idempotent. Response
`{ ok, cardLabel }` or `{ ok: true, pending: true }` if Stripe hasn't
completed the setup yet.

## POST /api/marketplace/orders/{id} — transitions

Body `{ "action": "<action>", …args }`. Who may call what:

| action | caller | from → to | args |
| --- | --- | --- | --- |
| `cancel` | business | submitted, pending_review, accepted → cancelled | — (accepted: stock restored) |
| `accept` | supplier | submitted, pending_review → accepted | — (stock −qty per line, re-checked) |
| `decline` | supplier | submitted, pending_review → declined | `reason` (≤300) |
| `hand_over` | supplier | accepted → handed_over | — |
| `report` | business | handed_over → reported | `returned: [{ productId, returnedQty }]` (borrow lines only; 0 ≤ returnedQty ≤ qty) |
| `settle` | supplier | handed_over, reported → paid / payment_due | `returned: [{ productId, returnedQty }]` — the VERIFIED counts (borrow lines; missing = reported value, else 0) |
| `pay_now` | business | settled, payment_due → (Checkout) | — → response `{ ok, url }`; webhook flips to `paid` |
| `record_payment` | supplier, admin | settled, payment_due → paid | `method: 'cash' | 'wave' | 'orange_money' | 'other'`, `note` (≤200) |
| `mark_paid` | admin | settled, payment_due → paid | `note` |

Admins may also call `cancel`, `accept`, `decline`, `hand_over`, `settle`.
Buyer = `order.partnerId == uid`. Supplier = a `suppliers` doc with
`uid == caller` and `id == order.supplierId`.

### settle — what gets written

```
usedQty      = mode === 'buy' ? qty : qty − returnedQty
finalLineTotal = unitPrice × usedQty
finalGoods   = Σ finalLineTotal
finalTotal   = finalGoods + deliveryFee
finalCommissionAmount = round(commissionRate × finalGoods)   // never on the fee
finalSupplierNet      = finalTotal − finalCommissionAmount
stock += returnedQty per line
```
Then the charge: if `payment.paymentMethodId` → off-session PaymentIntent
for `finalTotal` with idempotency key `settle_<orderId>`; success → `paid`
(`paymentMethod 'card'`, `paidAt`, ledger `order_net` = finalSupplierNet);
failure (declined, authentication required, no card) → `payment_due` with
`payment.failureReason`. `finalTotal === 0` (everything returned, pickup)
→ `paid` with nothing charged.

### Stripe webhook (`/api/webhooks/stripe`)

- `checkout.session.completed`, `mode = setup`, metadata `kind = supply_card`
  → same as billing/sync.
- `checkout.session.completed`, `mode = payment`, metadata `kind =
  supply_settlement` → order `paid` (`paymentMethod 'card'`) + ledger.
- `charge.refunded` on a settlement charge → `refunded` (full) or
  `payment.partialRefund` (partial).

## Reads the screens use (client SDK, under the rules)

- Business: `getSupplyOrdersByPartner(uid)`; card on file:
  `getCompanyBilling(companyId)` → `CompanyBilling | null`.
- Supplier: `getSupplyOrdersBySupplier(supplierId)`; profile fields
  `deliveryFee`, `maxPerOrder`, `firstOrderMax` are editable by the supplier
  through `updateSupplier` (rules already allow all but uid/email/rate/status);
  `lowStockAt` on products through `updateSupplyProduct`.
- Admin: `getAllSupplyOrders()`, `getSupplierLedger(supplierId?)`.

## Display vocabulary (FR first)

| status | FR | EN |
| --- | --- | --- |
| submitted | Envoyée | Submitted |
| pending_review | À valider par le fournisseur | Awaiting supplier review |
| accepted | Acceptée | Accepted |
| handed_over | Remise | Handed over |
| reported | Retours déclarés | Leftovers reported |
| settled | Décompte validé | Count verified |
| payment_due | Paiement dû | Payment due |
| paid | Payée | Paid |
| declined | Refusée | Declined |
| cancelled | Annulée | Cancelled |
| refunded | Remboursée | Refunded |

Line modes: `buy` = « Acheter » / "Buy", `borrow` = « Emprunter » / "Borrow"
(explain once: « Vous ne payez que ce que vous utilisez ; le reste est
repris. » / "You only pay for what you use; the rest is collected.").
Fulfilment: « Livraison (+ frais) » / « Retrait sur place ».
