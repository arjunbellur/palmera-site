// Decisions shared by the notify routes (event, bookings backstop,
// dashboard): who may receive a booking mail, what counts as a stub, and
// how a bearer secret is compared. Pure functions over raw Firestore data —
// keep I/O in the routes.
import { timingSafeEqual } from 'node:crypto'

type Doc = FirebaseFirestore.DocumentData

/** Booking transitions the app's `onBookingWritten` reports to
 *  POST /api/notify/event (docs/app-notify-event-contract.md). */
export const NOTIFY_EVENTS = ['created', 'confirmed', 'declined', 'cancelled', 'refunded', 'payment_received'] as const
export type NotifyEvent = typeof NOTIFY_EVENTS[number]

/** Constant-time compare of `Authorization: Bearer …` against a secret.
 *  A missing secret never matches — an unset env var must fail closed. */
export function bearerMatches(header: string | null, secret: string | undefined): boolean {
  if (!secret) return false
  const got = Buffer.from((header || '').replace(/^Bearer /, ''))
  const want = Buffer.from(secret)
  return got.length === want.length && timingSafeEqual(got, want)
}

/** A v3.3 booking, not one of the legacy payment-only orphan docs. */
export const isRealBooking = (b: Doc) => typeof b.providerId === 'string' && typeof b.bookingTotal === 'number'

/** Mirrors the app functions' `isUnpaidCheckoutStub`: a priced booking
 *  nobody has paid for yet is an abandoned (or in-progress) checkout, for
 *  ANY confirmationType. The old dashboard rule (`pending` + `instant`)
 *  missed stubs on provider-confirmed listings, which is why partners got
 *  "action required" for checkouts that were deleted minutes later. */
export const isUnpaidCheckoutStub = (b: Doc) =>
  typeof b.bookingTotal === 'number' && b.bookingTotal > 0
  && (b.paidCount ?? 0) === 0
  && !(b.payment?.status === 'completed')

/** The member's address is client-writable and the app lets any member
 *  create a booking in any status — so we only ever mail it when money
 *  moved through our processors (server-owned `payment.status`) or the
 *  booking is a free reservation (nothing to gain by spoofing one). Same
 *  reasoning that retired the old guest pass. */
export const memberMailAllowed = (b: Doc) => b.payment?.status === 'completed' || b.mode === 'reservation'

export const memberAddress = (b: Doc): string | null => {
  const to = String(b.customerEmail || b.checkout?.customerEmail || '').trim()
  return to.includes('@') ? to : null
}

/** providers/{uid}.email, falling back to the company's contact email. */
export const partnerAddress = (provider: Doc | undefined, company: Doc | undefined): string | null => {
  const to = String(provider?.email || company?.email || '').trim()
  return to.includes('@') ? to : null
}

export const partnerOptedOut = (provider: Doc | undefined) => provider?.notificationPrefs?.bookings === false

/** A log row that settles the slot. `send_failed` and `skipped` are
 *  retryable, so the next call (or the backstop) tries again. */
export const logIsTerminal = (l: Doc | undefined) => !!l && l.kind !== 'send_failed' && l.kind !== 'skipped'
