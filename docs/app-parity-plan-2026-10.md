# Dashboard parity with app release 1.55 (iOS) / 3.3 (Android)

Written 2026-10-25 against `palmera-expo` branch `release/ios` at `29b4652` and
`palmera-android` `main` at 3.3 (33). Source reviews: functions delta vs the
2026-09-10 baseline, the category taxonomy in both apps, and an end-to-end
audit of email notifications on both sides. Companion to
`docs/SYNC-STATUS.md` (shared-surface changelog) and
`docs/booking-contract-for-app.md`.

What shipped on the app side and is now live in production:

- Six-category taxonomy with subcategories (co-founder feedback, part 2),
  with a classifier that folds our 13 legacy `category` ids into it.
- pawaPay mobile money (Wave, Orange Money) and native Apple Pay / Google Pay
  through Stripe PaymentIntents, with async refunds.
- AI concierge (server-side, per-member daily cap).
- Invite rosters on bookings, `publicCompanies` for logos, speed pass.
- Build pipeline: `release/ios` → GitHub Actions → TestFlight.

The dashboard needs changes in four areas. None of the app's client-side
Firestore writes changed, so no rule loosening is needed; three new
server-only collections should get explicit deny-all clauses.

---

## A. Category taxonomy

### A1. Data model (shared surface)

Experience documents gain two optional string fields. The legacy `category`
field stays and keeps its 13 config ids; Android 3.3 still places listings by
it alone, and iOS uses it as the fallback.

| Field | Values | Notes |
| --- | --- | --- |
| `mainCategory` | `dining` `experiences` `entertainment` `sports_wellness` `stay` `rentals` | single string; wins over everything else when present |
| `subcategory` | one of the 37 sub ids below | single string; implies its main |
| `category` | existing 13 config ids | keep writing it; derive from the sub (table A4) |

Taxonomy (ids are the exact stored strings; labels EN / FR):

| Main | Subcategories |
| --- | --- |
| `dining` Dining / Restauration | `restaurants`, `cafes`, `brunch`, `beach_clubs`, `private_dining` (Private dining / Dîner privé), `culinary` (Culinary experiences / Expériences culinaires) |
| `experiences` Experiences / Expériences | `activities` (Activités), `island_excursions` (Excursions en île), `safaris`, `sightseeing` (Visites), `cultural` (Expériences culturelles), `beach_day_passes` (Day pass beach club) |
| `entertainment` Entertainment / Divertissement | `nightclubs` (Boîtes de nuit), `lounges`, `concerts`, `festivals`, `sporting_events` (Événements sportifs), `live_performances` (Spectacles live), `shows` |
| `sports_wellness` Sports & Wellness / Sport & Bien-être | `football_pitches` (Terrains de foot), `golf`, `gyms` (Salles de sport), `tennis`, `padel`, `fitness_classes` (Cours de fitness), `beauty` (Soins de beauté), `massages` |
| `stay` Stay / Séjours | `hotels` (Hôtels), `villas`, `resorts`, `lodges`, `boutique` (Boutique stays / Hébergements de charme) |
| `rentals` Rentals / Locations | `cars` (Voitures), `yachts`, `boats` (Bateaux), `transportation` (Transport), `equipment` (Location de matériel) |

Order within each main is the product order and must be preserved in pickers.

### A2. Classifier port

New `src/lib/categories.ts`: a TypeScript port of the app's `classifyListing`
(functions `index.js` ≈ 5509-5676; iOS `Models.swift` ≈ 261-430). Precedence:

1. explicit `mainCategory` (+ `subcategory` if it belongs to that main);
2. `subcategory` alone → its main;
3. cross-main keyword rules on title / subtitle / tag / tags (concert,
   festival, match, day pass, beach club, yacht, island + boat, …);
4. legacy `category` → main, first keyword rule inside that main → sub;
   unknown → `experiences` / `activities`.

Legacy fallback (also the inverse map used in A4):

| legacy `category` | main | sub |
| --- | --- | --- |
| dining | dining | restaurants |
| activities, lifestyle | experiences | activities |
| safari | experiences | safaris |
| islands | experiences | island_excursions |
| nightlife | entertainment | nightclubs |
| entertainment | entertainment | shows |
| sports | sports_wellness | — |
| wellness | sports_wellness | — |
| hotels | stay | hotels |
| villas | stay | villas |
| rentals | rentals | — |
| yachts | rentals | yachts |

The port exists so the editor can show "the app will file this under …"
and so the backfill (A6) produces exactly what the app already computes.

### A3. Listing editor

`ExperienceModal`: replace the single category `<select>` with a required
main picker (six tiles in product order) and a subcategory picker filtered by
main, pre-selected from the classifier when the listing already has text.
On save write `mainCategory`, `subcategory` and the derived legacy
`category`. Re-key the stay and menu gates on `mainCategory`
(`stay`, `dining`) instead of legacy ids. Keep `config/categories` as the
source for the 13 legacy ids; do not add the six main ids there (Android would
collapse them to a single legacy value).

### A4. Legacy `category` derivation (sub → legacy)

restaurants, cafes, brunch, beach_clubs, private_dining, culinary → `dining`;
activities, sightseeing, cultural, island_excursions, beach_day_passes →
`activities` (island_excursions → `islands`); safaris → `safari`;
nightclubs, lounges → `nightlife`; concerts, festivals, sporting_events,
live_performances, shows → `entertainment`; football_pitches, golf, tennis,
padel, fitness_classes, gyms → `sports`; beauty, massages → `wellness`;
hotels, resorts, lodges, boutique → `hotels`; villas → `villas`; cars,
transportation, equipment → `rentals`; yachts, boats → `yachts`.

### A5. "One business, many categories"

The apps read one category pair per listing and derive a business's category
chips from its listings. So multi-category is per business, not per listing:

- `Company.categories?: MainCategoryId[]` (dashboard-only metadata, used for
  the partner profile form and admin filters);
- a "Duplicate as another category" action on a listing, which clones it with
  a different main/sub pair, so a beach club can have its restaurant under
  Dining, its day pass under Experiences and its parties under Entertainment.

### A6. Backfill

Script `scripts/backfill-categories.ts`: for every experience without
`mainCategory`, run the classifier on `category` + title / subtitle / tag /
tags and write `mainCategory` + `subcategory`. Invisible to members (same
result the app computes at read time), idempotent, `--dry` first. Shared
surface: warn the app side and log in `SYNC-STATUS.md` before running on
production. Also write `nameLower` on every company (the app queries it
directly).

### A7. Partner re-filing

After the backfill, an admin view listing every live experience with its
computed pair and a one-click override, so listings that the keyword
classifier gets wrong can be fixed in one pass (the app side explicitly
asked partners to file offerings using the product rules).

---

## B. Booking payment contract

### B1. `schema.ts`

Extend `Booking.payment` to a union of receipts and add `copayPayments`:

```ts
type PaymentReceipt =
  | { provider: 'stripe'; sessionId: string; status: 'pending'|'completed'|'failed'|'cancelled'|'refunded'; amountMinor: number; currency: string; payers?: number }
  | { provider: 'stripe'; method: 'apple_pay'|'google_pay'; paymentIntentId: string; status: ...; amountMinor: number; currency: string; payers?: number }
  | { provider: 'pawapay'; checkoutId: string; status: 'pending'|'completed'|'failed'|'cancelled'|'refunded'; amountXof: number; currency: 'XOF'; mmProvider: 'WAVE_SEN'|'ORANGE_SEN'|'FREE_SEN'; depositId?: string; providerTransactionId?: string; failureCode?: string; payers?: number }
  | { provider: 'paydunya'; ... as today }
Booking.payment?: PaymentReceipt & { updatedAt?: Timestamp; refundedAt?: Timestamp; refundState?: 'none'|'processing'|'refunded'|'manual_review'; pawapayRefundId?: string; refundFailureCode?: string; refundSettledAt?: Timestamp }
Booking.copayPayments?: Record<string, PaymentReceipt>
```

`customerPhone` is now written top-level by the server; the existing fallback
to `checkout.customerPhone` can stay for old docs. `paymentStatus` is still
never written by anyone: derive the label from `payment.status` and
`refundState` and stop reading it.

### B2. Reservations UI

- Method label: Card / Apple Pay / Google Pay / Mobile money (Wave) /
  Mobile money (Orange) / PayDunya, from `provider` + `method` / `mmProvider`.
- Refund state: "Refund in progress" for `processing`; a visible flag for
  `manual_review` (pawaPay refund failed, needs a manual refund).
- Split pay: per-payer status from `copayPayments` where present.
- Admin Money: a list of bookings with `refundState = manual_review`.

### B3. Contract doc

Update `docs/booking-contract-for-app.md` "Payment state" with the shapes in
B1 (today it only describes PayDunya and Stripe Checkout).

---

## C. Rules, indexes, changelog

- Add deny-all clauses for `pawapay_payments`, `pawapay_refunds` and
  `concierge_usage` (server-only; unmatched paths are already denied, the
  clauses are for explicitness and parity with the app repo's copy).
- No new composite indexes are needed for pawaPay: its queries are
  equality-only. The three indexes added on 2026-10-16 for the Android
  chat / notifications / points queries are still only on staging; deploy to
  production with `npm run indexes:deploy`.
- Log A, B and C in `docs/SYNC-STATUS.md`; deploy rules to staging, then
  production.

---

## D. Email notifications

### D1. What happens today

| Event | Partner email | Member email |
| --- | --- | --- |
| New booking (pending or instant) | Dashboard Resend route, but only when the GitHub-scheduled poll runs: 4-9 runs a day in practice, not every 5 minutes, so the email lands hours late | none |
| Partner confirms | none (fine) | Functions → `mail` collection → Firebase Trigger Email extension (Gmail SMTP). Installed on production only; not on staging |
| Partner declines | none | none (in-app only) |
| Member cancels / refund | none | none |
| Abandoned checkout on a provider-confirmed listing | spurious "action required" email, then the stub is deleted | — |
| Reminder, review request, payout, staff invite, agreement, admin alerts | none | none |

Root causes of "emails not being sent": the poll cadence; a 3.5-day outage in
September that skipped every booking older than 24 h at recovery; two
different definitions of an unpaid stub; member mail on a Gmail SMTP
extension with no visibility; and whole event classes with no owner.

### D2. Target design

1. One sender: Resend from the verified `palmeraexp.com` domain, FR + EN
   templates owned by this repo. Retire the Trigger Email extension once the
   member set below is live.
2. One decision point: the app's existing `onBookingWritten` function posts
   `{ bookingId, event }` to a new `POST /api/notify/event` on the dashboard
   with a shared `NOTIFY_SECRET`, on real transitions only (stub → real,
   → confirmed, → declined, → cancelled, refund settled). Idempotent through
   per-event stamps on the booking (`notified.partner_new`,
   `notified.guest_confirmed`, …). This is a small addition on the app side;
   templates, keys and logs stay here.
3. The route renders, sends through Resend, writes `email_log`.
4. Keep the scheduled poll as an hourly backstop keyed on missing `notified`
   stamps rather than `createdAt` windows, so an outage never drops a booking.
5. Partner set: new booking (action required / FYI), 12 h reminder while
   pending, member cancellation, refund issued. Recipient `providers.email`
   with a fallback to `companies.email`; honour `notificationPrefs`.
6. Member set: confirmed, declined, cancelled / refund receipt, 24 h-before
   reminder (daily scheduled function on the app side), optional review
   request after the visit.
7. Dashboard-originated mails call the same route from server code: staff
   invite, agreement countersigned, payout sent.
8. Align the stub definition with the app's `isUnpaidCheckoutStub` so
   abandoned checkouts are silent for every listing type.
9. Staging parity: staging functions post to a staging deployment with its
   own `NOTIFY_SECRET` and `RESEND_API_KEY`.
10. Observability: an admin page over `email_log` (sends, skips with reason,
    failures) and an alert on consecutive non-200 responses from the poll.

Environment needed (Vercel): `RESEND_API_KEY`, `CRON_SECRET`, `NOTIFY_SECRET`,
`FIREBASE_SERVICE_ACCOUNT_B64`. Add a `.env.example` documenting them.

---

## E. Deploy-time items from the app release notes still open on our side

1. Stripe production webhook: add the event `payment_intent.succeeded` to the
   existing `stripeWebhook` endpoint (Apple Pay / Google Pay safety).
2. Run `backfillInviteRosters` once on production (needs the functions
   `AUDIT_KEY`).
3. Production index deploy (C above).

---

## Sequence

| Phase | Scope | Depends on |
| --- | --- | --- |
| 1 | A1-A4 (schema, classifier, editor), B1-B3, C, E1-E3 | nothing |
| 2 | A6 backfill (dry run, then staging, then production) and A7 re-filing view — **built 2026-10-25**: `scripts/backfill-categories.ts` (staging dry run clean), `/admin/categories`; A5 pulled forward (`Company.categories` tiles on both company forms, duplicate opens the editor on the copy, editor outlines the business's mains). Production write still to run. | phase 1, app-side notice in SYNC-STATUS |
| 3 | D2 items 1-4, 8 (route, stamps, backstop, stub fix) | the `onBookingWritten` POST on the app side; `NOTIFY_SECRET` in Vercel |
| 4 | D2 items 5-7, 9-10 (full event set, staging, observability); A5 | phase 3 |

## Open decisions

- 10% consumer fee: the apps display it, the backend does not charge it.
  Unrelated to parity but must be settled before the pricing tickets move.
- Multi-category: per-business metadata plus duplicate-listing (A5) is the
  minimum; a per-listing `categories[]` array would need app changes on both
  platforms to mean anything.
- Email ownership: the design above makes the dashboard the sender for every
  email. The alternative, keeping member mail on the app side, leaves two
  senders and two template sets.
