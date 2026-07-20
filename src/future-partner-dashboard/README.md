# Future partner dashboard (PARKED — not routed)

These pages are **not** part of the onboarding portal. They are early builds of
the future operational partner dashboard (reservations, payouts/earnings) that
comes AFTER:

1. the v3.2/v3.3 migration is verified end-to-end with Samson, and
2. the formal partner-dashboard UI redesign (its own "hello" home screen,
   not the onboarding shell).

They already read the canonical v3.3 schema (`src/lib/schema.ts`: Booking /
LedgerEntry / Payout — see `docs/booking-contract-for-app.md`), so when the
dashboard build starts, move them into the new shell and they light up as-is.

Being outside `src/app/`, Next.js does not route them; they only typecheck.
