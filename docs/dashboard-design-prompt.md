# Design prompt — Palmera Partner Dashboard

Paste into a fresh Claude session, attach app UI screenshots as visual reference.

---

I need you to design the **Palmera Partner Dashboard**. I'm attaching screenshots of our customer-facing mobile app — use them as the visual reference so the dashboard reads as the same product family, not a separate admin tool.

## What Palmera is
Palmera is a curated experiences marketplace in West Africa (launching in Dakar and Saly, Senegal). Guests browse and book experiences — safaris, wellness, dining, nightlife, hotels, rentals — through a mobile app. The businesses offering those experiences are our **partners**.

The aesthetic is warm, editorial, and premium — dark backgrounds with muted gold, serif/display type. Not a SaaS dashboard. Think a luxury hospitality brand that happens to have software.

## The two surfaces (important)
1. **Onboarding portal** (already built, not what you're designing) — partners sign up, sign the partnership agreement, create their company profile, and enter their experiences. Purely setup.
2. **Partner Dashboard** (what you're designing) — where a partner lives *after* onboarding. They **graduate** from the portal into this. It's a distinct surface with its own identity and its own home screen, not a tab added to onboarding.

Design surface #2. Assume the partner is already set up and active.

## Who the partner is
Small-to-mid business owners in Senegal — a safari operator, a beach club, a spa, a boutique hotel. Often on a phone, not always technical, often working in French (the dashboard is bilingual FR/EN, French default). They care about three things:
- **Am I getting bookings?**
- **When am I getting paid, and how much?**
- **Are my listings live and correct?**

## Business model (shapes the money UI)
- Palmera takes **10% commission for 12 months** from each company's activation date.
- Partners are paid out **every two weeks**.
- Cancellations/refunds can trigger a **clawback** against a future payout.
- Currency is **XOF** (West African CFA franc) — whole numbers, no cents. Amounts are large-looking (e.g. 45 000 XOF), so number formatting matters.
- One person (a "provider") can own **multiple companies**, each with its own commission window and payouts. The dashboard needs a way to scope to a company.

## What the dashboard needs to cover
Driven by our real data model — design screens for these:

1. **Home / "hello" screen** — the graduation landing. At-a-glance: upcoming reservations, current balance owed, next payout date, anything needing action. This should feel like a welcome, not a control panel.
2. **Reservations** — bookings guests made. Each has: experience title, date/time, guest count, guest name, status (pending / confirmed / declined / cancelled / completed / no-show), total charged, and **what the partner earns** after commission. Some listings are instant-confirm; others require the partner to **accept or decline** — that action needs to be prominent and fast on mobile.
3. **Earnings & payouts** — current balance owed, next payout (amount + date), lifetime paid. Payout history with period, status (scheduled / processing / paid / failed), and net amount. An itemized activity ledger: commissions earned, payouts sent, refunds, clawbacks.
4. **Listings/experiences** — what they've published, what's in draft, what's awaiting Palmera's review. Publishing is admin-approved, so "pending review" is a real state partners see.
5. **Companies** — switching between businesses if they own several.

## Design system already in place
Reuse these — the dashboard must sit in the same visual system. Both dark and light themes are supported (dark is primary).

**Fonts**
- Display: `Raveo Display` — headlines
- Serif: `LT Superior Serif` — body/editorial
- Mono: `Geist Mono` — labels, data, numbers, UI chrome

**Dark theme (primary)**
```
bg            #040404      nav bg        #0a0a08
card          rgba(255,255,255,0.04)
text          #dfc9a6      muted  rgba(223,201,166,0.75)
faint         rgba(223,201,166,0.45)   ghost rgba(223,201,166,0.28)
border        rgba(190,154,86,0.15)
```
**Light theme**
```
bg            #f5f0ea      nav bg        #ffffff
card          rgba(0,0,0,0.03)
text          #2a2119      muted  rgba(42,33,25,0.72)
border        rgba(158,118,59,0.2)
```
**Accents (both themes)**
```
gold          #be9a56      gold deep  #9e763b      cream  #ebe8db
success       #7a9e6b      alert      #c47c7c
```

## Constraints
- Built in **Next.js + React**, styling via inline styles + CSS custom properties (no Tailwind in the dashboard).
- **Mobile-first is non-negotiable** — most partners will use this on a phone. Design mobile and desktop.
- Bilingual FR/EN; French strings run ~20% longer, so layouts can't be tight to English.
- Empty states matter enormously — at launch, partners will have **zero** reservations and **zero** payouts. The empty dashboard must feel intentional and reassuring, not broken. Design these explicitly.

## What I want from you
1. A short **design direction** — how the app's visual language translates to a dashboard, and what you'd carry over vs. change.
2. **Screen designs** for: home, reservations (list + the accept/decline moment), earnings & payouts, listings. Mobile and desktop.
3. **Empty states** for reservations and payouts.
4. A small **component vocabulary** — cards, status treatments, how money is displayed, navigation.

Start by telling me what you read from the screenshots and how you'd translate it, before producing screens.
