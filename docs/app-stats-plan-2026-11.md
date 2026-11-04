# App statistics plan — what the admin dashboard should show, why, and what it decides

Plan, 2026-11-03. Jordan (audio, Nov 3): the dashboard is in good shape;
the next thing to plan is the set of user statistics about the app that are
**clean**, that we actually want to see, and that **fuel decisions on
feature additions**. This document lists every statistic we want for
members and for businesses, with the reasoning and the decision each one
informs. Companion to `docs/dashboard-consolidation-2026-11.md` (where
things live) and `docs/SYNC-STATUS.md` (what the app writes).

## 1. Rules for a statistic to earn a place

1. **One definition, one home.** Every number is computed in one place on
   the dashboard and linked to from everywhere else (consolidation rule).
2. **Clean source.** A statistic is "clean" when it comes from data the
   server or the dashboard wrote, not a client-writable field. Bookings
   count only when `payment.status` is server-set or the booking is a free
   reservation; revenue comes from processor receipts; a delivered booking
   is `completed`, or `confirmed` with the date passed (the rule Money and
   Members already share).
3. **Members, not events.** Headline counts are unique members in a window
   (day, week, month), never raw taps. Raw counts live one level down.
4. **Team accounts excluded.** palmeraexp@, Jordan, Samson, Arjun and any
   `is_test` profile are filtered out of every member statistic. The test
   bookings from QA rounds are the biggest source of dirty data today.
5. **A decision and an owner.** Each statistic names the decision it feeds
   and who looks at it. A number nobody acts on is removed.
6. **Cohorts by signup month.** Retention and activation are read per
   signup cohort, so a launch week never masks a bad month.
7. **Senegal first.** City comes from the profile at signup; Dakar vs. the
   rest is a first-class split on every member statistic.

## 2. Data readiness

| Mark | Meaning |
| --- | --- |
| ✅ | Clean today, from Firestore collections the dashboard already reads (`profiles`, `bookings`, `experiences`, `companies`, `invites`, `friends`, `favorites`, `moments`, `moment_likes`, `moment_comments`, `reviews`, `points_ledger`, `chat_messages`, `support_messages`, `email_log`, `config/featured`). |
| 🟡 | Derivable today but noisy, or only a proxy (a client-writable field, an inferred intent, no timestamp on the fact). Shown with the caveat until the app writes the real thing. |
| 🔴 | Needs app instrumentation (Samson): the app does not record the fact at all today. Section 6 lists the events. |

## 3. North star and guardrails

| Statistic | Definition | Readiness | Why | Decisions |
| --- | --- | --- | --- | --- |
| **Delivered bookings per active member, monthly** (north star) | delivered bookings ÷ members active that month | ✅ | The one number that says the app creates nights out, not just installs. Growth in installs that does not move this is marketing, not product. | Whether the next quarter goes to acquisition (number is healthy, pour fuel) or to activation/retention (number is flat, fix the product first). |
| Delivered GMV, monthly | Σ `bookingTotal` of delivered bookings | ✅ | What the business is worth; what commission is earned on. | Commission rate, partner pricing conversations, payout cadence. |
| Member 30-day retention by cohort | members with ≥1 session or booking 30 days after signup ÷ cohort size | 🔴 session, 🟡 booking-only proxy | The guardrail: features that spike signups but not retention are vanity. | Kill or keep a feature after launch; onboarding changes. |
| Partner median response time to pending | median hours from `createdAt` to `confirmedAt`/`cancelledAt` on provider-confirmed listings | ✅ | A slow partner loses the guest to WhatsApp. | Which listings to switch to instant confirmation; which partners to coach or demote; the 12h reminder's timing. |

## 4. Members (users)

### 4.1 Acquisition

| Statistic | Definition | Readiness | Why | Decisions |
| --- | --- | --- | --- | --- |
| Signups per day / week / month, with 8-week sparkline | `profiles.created_at` | ✅ (shown) | Baseline of growth; the first thing that moves after a campaign or an event. | Marketing spend timing; when to push the next partner batch. |
| Signups by city | `profiles.city` | ✅ (shown) | Says where the next partners should be. | Which city gets supply next (Saly, Saint-Louis, Dakar neighbourhoods). |
| Signups by source | the install attribution: share link, invite, Featured tonight, organic | 🔴 `signup_source` on the profile (deferred link or invite code at first open) | Without it every signup looks organic and the referral loop cannot be judged. | Whether to build a referral reward; which channel to fund. |
| Signup → profile complete | members with name + avatar + city within 24h ÷ signups | ✅ | A half-made profile predicts churn; also the health of the onboarding flow. | Onboarding steps to cut or make mandatory. |

### 4.2 Activation

| Statistic | Definition | Readiness | Why | Decisions |
| --- | --- | --- | --- | --- |
| Time to first booking | median days from signup to first delivered booking; share within 7 / 30 days | ✅ | The activation moment. If most never reach it, the feed and search are the problem, not the partners. | Discover layout, Featured tonight placement, first-booking incentive (points). |
| First-booking category | main category of a member's first delivered booking | ✅ | The categories that convert cold members are the ones to show first. | Default category order; which partners to feature to new members. |
| Members who favourited but never booked | favorites with no booking after 14 days | ✅ | Intent without conversion; the strongest "why did they stop" list. | Price nudges, availability, a "still interested?" push. |
| Members who started checkout and did not pay | `checkout_intents` without a completed payment within 24h, by payment rail | 🟡 (intent docs exist; no failure reason) 🔴 `payment_fail` with reason | Payment friction is the most expensive leak and the easiest to fix per rail. | Which rail to fix or drop (Wave vs. Orange vs. card); whether to allow pay-at-venue for some categories. |

### 4.3 Engagement

| Statistic | Definition | Readiness | Why | Decisions |
| --- | --- | --- | --- | --- |
| DAU / WAU / MAU and stickiness (DAU ÷ MAU) | unique members with a session | 🔴 `app_open` (one write per member per day is enough) | Today "active" can only be inferred from writes (a like, a message, a booking), which undercounts lurkers badly. | Whether the app is a weekly planner or a daily habit; push cadence; whether to invest in the feed. |
| Active members by what they did | members with ≥1 like / comment / message / moment / booking in the week | ✅ (shown as Engagement) | Shows which surface carries the app. | Feed vs. chat vs. bookings investment. |
| Moments per active member; likes and comments per moment | `moments`, `moment_likes`, `moment_comments` | ✅ | Whether the social layer is alive or decorative. | Keep building the feed, or simplify it. |
| Listing views per member; view → booking rate per listing | listing opens | 🔴 `listing_view` (listing id, source: feed / search / category / featured / share) | The core funnel step is invisible today; "Discovery → booking" on Members is bookings-only. | Ranking rules, which listings to re-shoot or re-price, what Featured tonight is worth. |
| Search: top queries, zero-result queries | search box submissions | 🔴 `search` (query, result count, city) | Zero-result queries are a supply shopping list. | Which categories and partners to recruit; synonyms and FR/EN handling. |
| Category taps and share of bookings by category | taps vs. delivered bookings by main category | 🔴 taps; ✅ bookings (shown on Money) | Taps without bookings mean thin supply in that category. | Category order; where to recruit. |
| Featured tonight: taps and bookings attributed | opens of the featured card and bookings on that listing within 24h, per city | 🔴 `featured_tap`; 🟡 bookings on the featured listing as a proxy | Jordan picks it by hand every day; we should know if it moves anything. | Keep it manual, automate it, or drop it. |
| Push: delivered → opened | notifications sent vs. opened, by kind | 🔴 `push_open` | Push is the main re-engagement lever and we are blind to it. | Which notification kinds to keep; quiet hours; language. |

### 4.4 Retention

| Statistic | Definition | Readiness | Why | Decisions |
| --- | --- | --- | --- | --- |
| Retention curve by signup cohort (D1, D7, D30, D90) | share of the cohort active on that day | 🔴 `app_open` | The shape tells whether the problem is the first day or the first month. | Onboarding vs. re-engagement investment. |
| Repeat booking rate | members with ≥2 delivered bookings ÷ members with ≥1 | ✅ | The cleanest retention number we have today; booking is the thing that matters. | Loyalty program design (points, Plus); whether repeat is category-specific. |
| Days between bookings | median gap for repeat bookers | ✅ | Sets the push and email cadence. | When to send "what's on this weekend". |
| Churned members | no activity 60 days, by cohort and city | 🟡 (writes only) 🔴 (sessions) | Size of the win-back list. | Win-back campaign, or accept and focus on new. |

### 4.5 Social and virality

| Statistic | Definition | Readiness | Why | Decisions |
| --- | --- | --- | --- | --- |
| Friends per member; share with ≥1 friend | `friends` | ✅ (shown) | Group booking needs a graph; a member with no friends cannot split a bill. | Contact import, friend suggestions, invite links. |
| Invites sent → accepted → paid | `invites` by status, and whether the invitee paid their share | ✅ | The group-booking loop in three numbers. | Where the group flow leaks: the invite copy, the accept screen, or the pay step. |
| Share of bookings that are group bookings; average party size and payers | `payersCount`, `copayUids`, invites per booking | ✅ | The app IS group booking; this is whether members use it that way. | Whether to make solo booking secondary; the split-pay design. |
| Shares of experiences sent; share → view → booking | `invites` with `type: share` | ✅ (shown as sent/viewed) 🔴 booking attribution to a share | Sharing is the free acquisition loop. | Referral reward, share card design. |
| Members brought in by invites (invited before signup) | invitee had no profile at invite time | 🔴 `signup_source` | The viral coefficient. | Referral program yes/no and its size. |

### 4.6 Monetisation and group payments

| Statistic | Definition | Readiness | Why | Decisions |
| --- | --- | --- | --- | --- |
| Payment rail mix and success rate | receipts by provider (Wave, Orange, card, Apple/Google Pay) and failures | ✅ success; 🔴 failures | Each rail costs differently and fails differently. | Which rails to promote per city; fee pass-through. |
| Average booking value by category and city | delivered `bookingTotal` | ✅ | Where the money is, per experience type. | Commission tiers; which partners to recruit. |
| Split payments: share of bookings with ≥2 payers; shares paid in time; shortfalls | `paidCount` / `payersCount`, `payoutAdjustmentNeeded` | ✅ | Whether split pay works or creates unpaid groups. | Deadline for co-payers; whether the host must cover shortfalls. |
| Refunds: rate, amount, by reason and rail; manual-review rate | `payment.refundState`, `copayRefunds` | ✅ (shown on Money) | Refund volume is a quality signal and a cost. | Cancellation windows per category; which rail needs a better refund path. |
| Plus members and conversion | `profiles.is_plus`, plus signups per month | ✅ count; 🔴 when they upgraded (no timestamp) | Plus is the recurring revenue line. | Plus price and perks; where to prompt the upgrade. |

### 4.7 Rewards and points

| Statistic | Definition | Readiness | Why | Decisions |
| --- | --- | --- | --- | --- |
| Points issued vs. redeemed, monthly | `points_ledger` by type | ✅ (shown as Points economy) | An economy that only issues is a liability; one that is never redeemed is ignored. | Earn rates, reward catalogue, expiry. |
| Redemptions by reward and by business | redeemed rows with reward id and the listing | ✅ when the ledger carries the reward id; 🟡 otherwise | Which rewards members want and which businesses honour them. | The `redeemableRewards` list per listing (Samson's ask), partner reward terms. |
| Points balance distribution | members by balance band | ✅ | Whether balances are reachable for the catalogue. | Reward price points. |

### 4.8 Support and quality

| Statistic | Definition | Readiness | Why | Decisions |
| --- | --- | --- | --- | --- |
| Support threads opened per week; first-reply time; reopen rate | `support_messages` / inbox | ✅ (Messages tab) | Volume and speed of support; what breaks. | Staffing the inbox; which flows generate the most questions. |
| Support topics | tagged by the admin when closing (refund, payment, partner no-show, bug, other) | 🔴 a `topic` on `support_threads` set from the dashboard | Turns the inbox into a product backlog. | Which fix removes the most tickets. |
| Reviews: rate per delivered booking; average rating by category and partner | `reviews` | ✅ | Quality per partner and whether members review at all. | Partner ranking in Discover; review prompt timing. |
| Email health | sent / failed / skipped by kind | ✅ (Overview) | The notification pipeline's heartbeat. | Template fixes, language defaults. |

## 5. Businesses (partners)

### 5.1 Supply

| Statistic | Definition | Readiness | Why | Decisions |
| --- | --- | --- | --- | --- |
| Live listings by city and category; change week over week | `experiences.status` | ✅ (Catalogue) | Supply is the product on the member side; the 38 → 15 drop in October went unnoticed for a week. | Recruitment targets per city/category; alerts when supply drops. |
| Listings with zero bookings in 60 days | delivered bookings per listing | ✅ | Dead supply hurts Discover. | Re-shoot, re-price, re-file, or unpublish. |
| Listing completeness | photos ≥3, description, options, policy, schedule | ✅ | Incomplete listings do not convert; the pair with no bookings is usually incomplete. | Which partners to call; onboarding checklist. |
| Instant vs. provider-confirmed share | `confirmationType` | ✅ | Instant converts better; provider-confirmed is where response time bites. | Push partners to instant; default for new listings. |

### 5.2 Responsiveness and reliability

| Statistic | Definition | Readiness | Why | Decisions |
| --- | --- | --- | --- | --- |
| Response time distribution per partner; share answered within 24h | pending → confirmed/declined | ✅ | The single biggest partner-side leak. | Coaching, demotion in ranking, switch to instant. |
| Decline rate and reasons | declined ÷ (confirmed + declined), reason if given | ✅ rate; 🔴 reason (no field) | Declines are supply that pretends to exist. | Availability model (blocked dates/hours — Jordan's idea #5/#17) priority. |
| Partner-side cancellations and no-shows | `no_show`, cancellations after confirm | ✅ | Reliability; the refund cost lands on Palmera. | Partner agreement enforcement; clawback. |
| Check-in rate | `checkedInAt` / `checkedInGuests` ÷ delivered | ✅ | Whether the door scan is used; proof of delivery for payouts. | Pay partners on scan vs. on date; scanner UX. |

### 5.3 Conversion and revenue

| Statistic | Definition | Readiness | Why | Decisions |
| --- | --- | --- | --- | --- |
| Bookings and delivered revenue per partner, monthly; concentration (top 5 share) | bookings by `companyId` | ✅ (Money) | Who carries the platform, and how exposed we are to one partner. | Partner success effort; diversification targets. |
| View → booking per listing | listing views vs. delivered bookings | 🔴 `listing_view` | The listing-level conversion number partners will ask about. | Which listings to feature; partner-facing advice. |
| Average booking value and options attach rate per partner | `selections` on bookings | ✅ | Options are margin for the partner and for us. | Option design guidance; upsell prompts in checkout. |
| Commission earned per partner; effective rate | `commissionAmount` | ✅ (Money) | The revenue line per relationship. | Rate negotiations; the 10% consumer-fee question. |

### 5.4 Money operations

| Statistic | Definition | Readiness | Why | Decisions |
| --- | --- | --- | --- | --- |
| Owed to partners, payout readiness, days since last payout | ledger / payout profiles | ✅ (Money) | Late payouts end partnerships. | Payout batch timing; who still lacks payout details. |
| Split shortfalls and manual refunds per partner | `payoutAdjustmentNeeded`, `copayRefunds` | ✅ (Money › Split payments) | Operational load per partner. | Whether to restrict group booking on some listings. |
| Marketplace: orders, GMV, commission, due | supply orders | ✅ (Money › Marketplace) | Whether the supplier side earns its keep. | Expand suppliers or park the marketplace. |

### 5.5 Partner engagement with the dashboard

| Statistic | Definition | Readiness | Why | Decisions |
| --- | --- | --- | --- | --- |
| Partners who opened the dashboard in the last 7 / 30 days | last sign-in | 🔴 `providers.lastSeenAt` written by the partner shell on load (dashboard-only, trivial) | A partner who never opens the dashboard runs on email alone. | Which partners need the WhatsApp/SMS channel; dashboard onboarding. |
| Agreement status funnel | registered → signed → countersigned → active | ✅ (Directory) | Legal readiness before money moves. | Countersign backlog; activation calls. |
| Notification language and opt-outs | `notificationPrefs` | ✅ | Whether partners read what we send. | Default language per city; channel strategy. |

## 6. Instrumentation ask for the app (Samson)

Everything marked 🔴 needs one small, append-only collection the app
writes and the dashboard rolls up. Proposal, to agree with Samson before any
code:

- **`app_events/{id}`**: `{ uid, type, at, city?, listingId?, source?, query?, resultCount?, rail?, reason?, kind? }`. Client-written, create-only, own uid only (one rule). Types, in priority order:
  1. `app_open` — once per member per day (the app dedupes locally). Unlocks DAU/WAU/MAU, retention curves, churn.
  2. `listing_view` with `source` ∈ feed | search | category | featured | share | invite. Unlocks the funnel and Featured attribution.
  3. `search` with `query`, `resultCount`.
  4. `checkout_start` and `payment_fail` with `rail`, `reason`.
  5. `featured_tap`.
  6. `push_open` with `kind`.
  7. `signup_source` — written once onto the profile, not an event.
- **Rollups, not raw reads.** A scheduled function (or the dashboard's own cron) writes `stats_daily/{YYYY-MM-DD}` with the counts, so the admin pages read 90 small docs instead of millions of events. Raw events expire after 180 days (TTL policy).
- **Team filter.** A `config/team` doc listing team uids, read by both sides, so test activity never enters a statistic.
- Nothing above changes a shared schema or rule beyond the one new collection; it goes through the SYNC-STATUS protocol like every other shared change.

## 7. Where each statistic lives

| Page | Holds |
| --- | --- |
| Overview | north star + guardrails as the four headline tiles; "needs attention" lines when a guardrail crosses a threshold (response time > 24h median, supply drop > 20% week over week, refund rate > 5%). |
| Members | acquisition, activation, engagement, retention, social, rewards, support — each a collapsed section with a one-line digest (overview-first rule). |
| Money | monetisation, split payments, refunds, marketplace, payout operations. |
| Partners | responsiveness, reliability, conversion per partner, dashboard engagement; the same numbers on each company's page. |
| Catalogue | supply health, dead listings, completeness. |
| Partner dashboard (Earnings) | the partner's own slice of 5.2 and 5.3, in their language. |

## 8. Delivery order

1. **Now, no app change (✅ rows not yet shown):** time to first booking, repeat rate and gap, favourited-not-booked, invites sent → accepted → paid, group share and party size, rail mix, response-time distribution per partner, decline rate, dead listings, listing completeness, check-in rate, team-account filter. One session on Members, one on Partners.
2. **Thresholds on Overview** for the four guardrails.
3. **Agree the `app_events` shape with Samson**, ship `app_open` and `listing_view` first (two events unlock DAU, retention and the funnel), then the rest.
4. **Daily rollups** and the 90-day views once events flow.
5. **Support topics** on close in the Messages tab, and `lastSeenAt` on the partner shell (dashboard-only, an hour each).

Open questions for Jordan: which guardrail thresholds, whether Plus is a
priority line this quarter, and whether partners should see their own
conversion numbers before we are confident in the view event.
