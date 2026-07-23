# Partner business-flows table (for Jordan)

Purpose: one row per thing a partner wants to post. Answers map 1:1 to schema
fields, so this doubles as (a) the test matrix for dashboard→app and (b) the
gap list for flows the schema doesn't support yet (e.g. multi-day stays).

---

## Table 1 — Who they are (one row per business)

| # | Business name | Category | City | Contact (name + WhatsApp) | Signed agreement? (Y/N) | On the dashboard yet? (Y/N) |
|---|---|---|---|---|---|---|
| 1 | | | | | | |
| 2 | | | | | | |

Categories: Hotels · Dining · Wellness · Activities · Lifestyle · Rentals ·
Villas · Nightlife · Safari · Islands · Yachts · Entertainment · Sports

---

## Table 2 — What they'll post (one row per listing — the important one)

| # | Business | What they want to post | Paid in app or free to reserve? | Price + how it's charged | How is it booked? | Who confirms? | Group size (min–max) | Choices / add-ons (with prices) | When is it available? | Cancellation | Anything unusual? |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | | | | | | | | | | | |
| 2 | | | | | | | | | | | |

**Allowed answers (pick one per column):**

- **Paid or free:** `Paid in app` (guests pay at booking, group splits it) · `Free to reserve` (no payment — e.g. a table)
- **Price + how charged:** amount in XOF + one of: `per person` · `for the whole group` · `per night` · `per day` ⚠️
- **How is it booked:** `a time slot` (e.g. 2h jetski) · `a whole day` · `multi-day stay (check-in → check-out)` ⚠️ · `entry/spot only`
- **Who confirms:** `instant` (auto-confirmed) · `the business approves each booking`
- **Choices / add-ons:** each = a question the guest answers, e.g. "Room type: Standard +0 / Sea view +15 000" · "Extras: drinks package +8 000"
- **When available:** `anytime` · `set days & times (list them)` · `one-off event (date + time)`
- **Cancellation:** `flexible (24h)` · `moderate (72h)` · `strict (7 days)`

⚠️ = flows the current schema does NOT support yet (`per night` / `per day`
pricing and multi-day date-range booking). Every row that needs one of these
is exactly what we're trying to count — do NOT leave those rows out.

---

## Example row (already live, for reference)

| # | Business | What they want to post | Paid or free? | Price | Booked as | Who confirms | Group size | Add-ons | Available | Cancellation | Unusual |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 0 | Arjun's Fight Nights | Fight Night (beach event) | Paid in app | 12 000 XOF per person | entry/spot only | business approves | 0–10 | none yet (could add: Ringside +15 000) | one-off event, date + 8pm | moderate (72h) | — |

---

## The test matrix this gives us (Jordan's cases → concrete rows)

1. Free reservation, no transaction (restaurant table, beach club entry)
2. Paid booking, transaction completed (per person — e.g. the Fight Night)
3. Paid booking, flat price for the group (private boat)
4. Multi-day stay: hotel / villa / rental car, per-night or per-day ⚠️ gap
5. Add-ons that change the total (room types, drinks packages)
6. Instant-confirm vs business-approves, for each of the above
7. Provider → Company → Experience → Options hierarchy (one owner, multiple businesses)
