# Jordan's dashboard ideas (via ChatGPT) — triaged

Source: Google Doc "GPT's Palmera Dashboard Feedback" (2026-08-18),
docs.google.com/document/d/1hk5mzNAiho2iTVZc_6UihGRj4iwA_hYDrLBSRJJ0Fm4
Numbering follows the doc. Effort: 🟢 quick (hours) · 🟡 medium (a session)
· 🔴 large (multi-session) · ⚠ = touches the shared surface (Samson protocol).

## Home
| # | Idea | Effort | Notes |
|---|---|---|---|
| 1 | ✅ Performance overview tiles (month reservations/revenue, completed, cancel rate, avg booking value, top experience) | 🟢 | All derivable from bookings we already subscribe to. |
| 1b | ✅ Money vocabulary: Upcoming Earnings / Available for Payout / Paid to Date | 🟢 | Pure copy — matches the derived-earnings model we already built. |

## Reservations
| 2 | ✅ Full detail drawer (ID, contact, options selected, commission split, policy, created date, instant vs manual) | 🟡 | Drawer exists; add commission math (company rate), selections from `checkout.selections`, policy, timestamps. |
| 3 | ✅ Status-dependent actions (pending accept/decline exists; confirmed → message customer / report issue; completed → view payout) | 🟡 | Accept/decline/no-show shipped. "Message customer" is app-side chat (⚠ ask Samson) — WhatsApp deep link via customerPhone is the zero-impact version. "Report issue" → #33. |

## Availability — the big operational gap
| 5 | Block dates/times/weekdays per listing or business | 🔴⚠ | Needs schema (`blockedDates`/availability doc) AND the app must respect it at booking time — joint design with Samson. Dashboard UI is the easy half. |
| 6 | "Any time" needs operating hours | 🟡⚠ | Additive schema (`hours` per weekday); app must enforce at checkout. Can ship dashboard-side first (informational), enforcement follows. |
| 17 | Per-day hours, booking lead time, min notice, same-day toggle | 🔴⚠ | Same family as 5/6 — design once as one "Availability" model, not three patches. |

## Earnings & payouts
| 7 | ✅ Transaction table (date, booking, customer, total, commission, net, status) | 🟢 | Derived from bookings + company rate. |
| 8 | ✅ Money lifecycle strip (paid → upcoming → completed → eligible → paid out) | 🟢 | Copy + a small stepper component. |
| 9 | Payout statements w/ CSV/PDF | 🟡 | Blocked on real payouts existing (SYNC item: ledger empty). CSV easy; build when first payout runs. |
| 10 | ✅ "Commission Window" → "Palmera Commission, 10% per eligible booking" | 🟢 | Copy. |

## Listings
| 11 | ✅ Status filters All/Live/Draft/Unpublished | 🟢 | Category chips exist; add status chips. |
| 12 | ✅ "Preview as guest" on every listing card | 🟡 | Step-8 preview exists — extract into a reusable modal. |
| 14 | ✅ Pricing step shows commission + "you earn" net | 🟢 | Company rate is loaded; pure display. |
| 15 | ✅ Group-price example uses real max group + price | 🟢 | |
| 16 | ✅ Category-aware group-size language (occupancy/party size/passengers…) | 🟢 | i18n label map keyed on category. |
| 18 | ✅ Structured duration ([2][hours]) | 🟡⚠ | Additive schema field alongside the free-text one; app can ignore. |
| 19 | ✅ Drag-reorder photos | 🟡 | We shipped drag for option sets — same pattern on the photo grid. |
| 20 | ✅ Description guidance + later ✨ AI improve | 🟢 / 🟡 | Placeholder copy now; AI rewrite is a small API route later. |
| 23 | ✅ Category-based extras suggestions + track extras revenue | 🟡 | Suggestion chips per category (pure dashboard). Extras revenue needs `checkout.selections` totals — derivable. |
| 24 | ✅ "Required Choice" / "Optional Add-ons" wording | 🟢 | Aligns with the question-first editor we shipped. |

## Confirmation & cancellation
| 25 | ✅ Policies must state financial outcomes | 🟡 | Copy once the refund rules are DECIDED (business decision first — ties to SYNC item 16, money on declined bookings). |
| 26 | ✅ Manual-approval response deadline + reminder emails | 🟡 | Reminder = second pass in the existing notify poller (pending >N hrs → nudge). Auto-expiry after deadline would be ⚠ joint. |

## Settings & support
| 28 | ✅ Fuller company profile (WhatsApp, socials, hours, photos) | 🟡 | Additive fields; app already reads company docs (⚠ FYI only). |
| 30 | Granular notification prefs (channel × event; WhatsApp!) | 🔴 | Email prefs 🟡; WhatsApp needs a Business API provider — separate project. |
| 33 | ✅ "Get help with this booking" pre-filled support | 🟢 | `support_messages` collection + rules already exist — attach booking context. |

## Status (2026-08-21)
✅ = shipped. Batch 1 complete (1, 1b, 7, 8, 10, 11, 14, 15, 16, 20, 24, 33) + 19 (photo drag). Batch 2 complete (2, 3 via WhatsApp, 26). Batch 3 complete (12, 18, 23).

## Not built yet — and why (as of 2026-08-22)

| # | Idea | Why it's parked | What unblocks it |
|---|---|---|---|
| 5 | Block dates / times / weekdays per listing or business | Dashboard UI is the easy half; the app must ENFORCE availability at booking time or partners get bookings they can't honour. Needs a shared availability model (⚠ schema + Samson). | Design session with Samson: one `availability` shape covering 5/6/17, app reads it at checkout. |
| 6 | "Any time" needs operating hours | Same model as #5 — hours are fiction unless the app respects them. Could ship as informational-only, but that misleads partners. | Part of the availability design above. |
| 17 | Per-day hours, booking lead time, min notice, same-day toggle | Same family; designed once as ONE availability model, not three patches. | Same. |
| 9 | Payout statements / downloadable CSV-PDF per payout | No payouts exist yet (ledger + payouts collections empty; completion mechanism — SYNC item 11 — not built). Nothing to itemise. CSV export of the ledger already exists for when entries appear. | First real payout batch; then build "open a payout → see its bookings → download". |
| 25 | ✅ Cancellation policies must state financial outcomes | Copy is easy; the RULES aren't decided (what happens inside the window — refund %, does the business still get paid, does Palmera keep commission). Also ties to SYNC item 16 (money collected on declined bookings) and the app's refund trigger. | Arjun + Jordan decide the refund matrix per tier → write it into the tier cards + listing policy field (the 24h/48h field from the Dashboard Time call). |
| 30 | Granular notification preferences (event × channel; WhatsApp) | Email preferences alone are a session; WhatsApp needs a WhatsApp Business API provider (Twilio/360dialog), template approval, and a phone-number strategy — separate infrastructure project. | Decide on a WhatsApp provider; then build prefs with email first, WhatsApp second. |
| 20b | ✨ "Improve description" AI rewrite | Nice-to-have; guidance line shipped instead. Small API route + a button. | One session whenever wanted — no blockers. |
| 3b | "Message customer" via in-app chat (vs WhatsApp) | In-app chat is Samson's surface (chat_threads/messages are membership-gated; a partner isn't a member). WhatsApp deep link shipped as the zero-impact version. | Samson adds partner↔guest threads; then the dashboard can embed them. |
| 3c | Partners cancelling CONFIRMED reservations themselves | Deliberately not added — Jordan's doc says "think carefully". Consequences (refund, guest notification, reliability score) aren't defined. Decline (pending) and no-show (past) exist. | Decide policy: allowed? reason required? penalty? Then it's a small drawer action. |
| 28 | ✅ Fuller company profile (WhatsApp, socials, hours, photos) | Partially exists (logo, photos, website/business page). Hours belong to the availability model; WhatsApp/socials are easy additive fields. | Fold into the availability session (hours) + a short fields pass. |

## Suggested batches
1. **Copy + display batch (all 🟢):** 1, 1b, 7, 8, 10, 11, 14, 15, 16, 20, 24, 33 — one to two sessions, zero shared-surface impact.
2. **Reservation depth:** 2, 3 (WhatsApp variant), 26 reminders.
3. **Listing polish:** 12, 19, 23, 18.
4. **Availability project (🔴⚠):** 5+6+17 designed as ONE model with Samson — the app must enforce it or it's fiction.
5. **Later:** 9 (needs payouts), 25 (needs policy decision), 30 (WhatsApp infra), 20-AI.
