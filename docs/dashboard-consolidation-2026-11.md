# Dashboard consolidation — admin, then partner (plan, 2026-10-31)

Jordan (Oct 29): "get the dashboard as cracked as the app, including
consolidation". Both shells grew page by page since August; the same numbers
now live in two or three places, and the admin nav has seven tabs. This plan
reduces each surface to the screens a person actually opens, with one home
for every fact. UI and information architecture only — no schema, rules or
app-side change.

## What overlaps today

| Fact | Admin pages showing it | Partner pages showing it |
| --- | --- | --- |
| Signups / users / Plus | Overview, App growth | — |
| Bookings by status this week | Overview, Money (explorer) | Home, Reservations |
| GMV / commission this month | Overview, Money | Earnings (own side) |
| Revenue by company / category | Money (category = legacy `company.category` ids: "nightlife") | — |
| Marketplace money | Suppliers › Orders & money | — |
| Featured tonight | App growth (top) | — |
| Month revenue / avg booking / top experience | — | Home "How you are doing", Earnings |
| Pending / upcoming counts | — | Home tiles, Home performance block, Reservations filters |

## Admin — target: five tabs

| Tab | Holds | Comes from |
| --- | --- | --- |
| **Overview** | today & this week: signups, bookings by status, GMV + commission month, needs attention, activity feed, **mail health** (last 24h sent/failed → Emails) | Overview as is, minus nothing; Emails demoted from the nav to a link here |
| **Money** | the four money tiles, commission by month, revenue by **app category** and **by city**, completion, payout readiness, cancellations & refunds, **marketplace money** (collected / commission / owed / due → Suppliers), all bookings explorer | Money + the five tiles from Suppliers › Orders & money |
| **Partners** | Businesses (directory) and Suppliers as two sub-tabs | Directory + Suppliers |
| **Catalogue** | Featured tonight, categories re-filing, every live listing in one table (status, city, company, pair) | Categories + Featured panel moved out of App growth |
| **Members** | signups, engagement, points economy, funnel, users by city, social graph, top earners, members list | App growth renamed; no Featured panel |

Rules: a number is computed in one place and linked to from the others;
"Revenue by category" uses the app taxonomy (`mainCategory` of the booked
listing, legacy id classified when missing); every tile that opens a list
links to that list with the filter preset.

## Partner — target: four tabs plus Market and Settings

| Tab | Holds | Change |
| --- | --- | --- |
| **Home** | greeting, needs-attention, today / next reservation, quick actions, next payout, upcoming list | the "How you are doing" block (8 tiles) moves to Earnings; Home is today and actions only |
| **Reservations** | list / calendar, filters (incl. cancelled with refund state), detail drawer, scanner | unchanged |
| **Earnings** | hero with period picker, gross → commission → net flow, **performance** (month reservations, avg booking, completed, cancellation rate, top experience, upcoming), breakdown, extras, top clients, ledger, payouts | absorbs Home's performance block |
| **Listings** | grid, editor, duplicate | unchanged |
| Market, Settings | unchanged | — |

## Principle added 2026-10-31: overview first, expand in place

Arjun: "everything is an overview page with more information that can be
expanded … we don't want information-dense areas on a single page that are
practically unreachable because of other dense information."

So every page is: its headline tiles (always visible) followed by a list of
**sections collapsed by default**, each a single row with the title and a
one-line digest (the two or three numbers you would otherwise scroll for).
A row expands in place; open/closed is remembered per section per browser.
A section opens by default only when it needs action (a refund to send by
hand, partners owed money). Component: `Disclosure` in
`src/components/partner/ui.tsx`. Applied to Money first, then Members,
Overview and partner Earnings.

## Delivery order

1. Admin: revenue by app category + by city on Money (today).
2. Admin: marketplace money block on Money; Emails demoted to Overview mail health.
3. Admin: Catalogue tab (Featured + Categories + listings table); Members = App growth without Featured; nav to five.
4. Admin: Partners tab with Businesses | Suppliers.
5. Partner: performance block moves Home → Earnings; Home trimmed.
6. Partner: tile → list links with preset filters.

Each step ships on its own commit so nothing waits on the next.
