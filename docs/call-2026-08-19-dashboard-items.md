# Dashboard items from the 2026-08-19 call — implementation plan

Status legend: ✅ shipped · 🔧 planned · ⚠ shared surface (Samson protocol) · ⏸ parked

| # | Item (Jordan unless noted) | Status | Plan |
|---|---|---|---|
| 1 | Needs-action redirect (Home → Reservations lands on Upcoming) | ✅ | `?f=pending` honored; emails deep-link too. |
| 2 | Nav icons too similar | ✅ | lucide-react across all surfaces. |
| 3 | Hide Messages; FR label "Dépôt-vente" | ✅ | |
| 4 | Drag-reorder options + photos in ADMIN editor | ✅ (shared modal) + 🔧 | Admin uses the same ExperienceModal, so it has it. Remaining: **drag handle contrast** ("it's a bit dark, I can't really see it"). |
| 5 | Admin = exact copy of partner listing features | ✅ by construction | Same component; keep it that way (rule). |
| 6 | Calendar switch should open on All | 🔧 | Switching to calendar view resets the status filter to All. |
| 7 | Completed tab empty | 🔧 interim + ⚠ real fix | Nothing marks bookings `completed` (SYNC item 11). Interim: the Done filter also shows confirmed bookings whose date has passed, labeled "Terminée (auto)" — display only. Real fix: auto-complete N hours after `scheduledFor` — joint with Samson. |
| 8 | New reservation not in Needs Action until reload (Arjun) | 🔧 | Home loads bookings once; switch to the live subscription Reservations already uses. |
| 9 | Cancellation window field (24h/48h) the app consumes (Arjun) | 🔧 ⚠ | Denormalize the resolved `cancelDeadlineHours` onto each experience at save (from config/policies tier) so Samson reads one field, no join. Additive; SYNC log. |
| 10 | Dashboard email verification (Arjun) | 🔧 | Firebase `sendEmailVerification` at signup; `/dashboard` + `/partner` gate on `emailVerified` with a "check your inbox / resend" screen. Existing partners grandfathered (already verified or flagged). |
| 11 | Consumer booking-confirmation email (Jordan: "a notification is not enough") | 🔧 (ownership: dashboard/Resend) | Poller emails the **guest** (`customerEmail`) when a booking becomes confirmed — app-agnostic, same Resend domain. |
| 12 | Duplicate booking records (Arjun) | ⏸ needs Samson's repo | Dashboard defences shipped (party dedupe, chip). Root cause is app-side (SYNC item 17). |
| 13 | "Money selector" on listing (Arjun) | ❓ | Unclear — currency selector? Confirm before building. |
| 14 | Booking party members visible | ⏸ app-side | SYNC item 14 (guest names on booking). |
| 15 | Provider approve/reject workflow | ⏸ Q4 | |
| 16 | Concierge | ⏸ future | |

Order of work: 6 → 8 → 7 (interim) → 4 (contrast) → 9 → 11 → 10. Then marketplace M1–M5.
