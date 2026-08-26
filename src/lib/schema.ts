// ─────────────────────────────────────────────────────────────────────────
// PALMERA SHARED FIRESTORE SCHEMA — v3.2
// Provider → Company → Experience(Listing) → Option, plus admin config.
//
// The dashboard AUTHORS `experiences`; the customer app (Samson) READS it — one
// shared contract. This file is the single source of truth for the document
// shapes both the data layer (firestore.ts) and the migration script build to.
//
// v3.2 = v3.1 + priceUnit, experiences languages/excludes/dressCode,
//        companies businessType/logo/operations, and migrationArchive.
// Full spec: the ratified plan + memory `schema-v3.1` (now v3.2).
// ─────────────────────────────────────────────────────────────────────────
import type { Timestamp } from 'firebase/firestore'

/** Firestore Timestamp on read; may be a server sentinel on write. */
type TS = Timestamp

export const COLLECTIONS = {
  providers: 'providers',
  companies: 'companies',
  experiences: 'experiences',
  config: 'config',
  countersignatures: 'countersignatures',
  migrationArchive: 'migrationArchive',
  // v3.3 — money & reservations layer. Bookings originate in the customer app
  // (Samson) and are the CANONICAL contract below; the dashboard reads them and
  // derives ledger + payouts. All three are provider/company-anchored for rules.
  bookings: 'bookings',
  ledger: 'ledger',
  payouts: 'payouts',
} as const

// Subcollection / well-known doc ids
export const SUB = {
  privateAdmin: { col: 'private', doc: 'admin' },
  privatePayout: { col: 'private', doc: 'payout' },
  options: 'options',
} as const

export const CONFIG_DOCS = {
  markets: 'markets',
  categories: 'categories',
  policies: 'policies',
} as const

// ══════════════════════════════════════════════════════════════════════════
// providers/{uid} — the person/account. Signs the agreement. App never reads.
// ══════════════════════════════════════════════════════════════════════════
export interface Signoff {
  signedAt: string
  signedBy: string
  typedSignature: string
  signatoryRole: string
  agreementVersion: string
  businessName: string
}

export interface Provider {
  uid: string
  email: string
  fullName: string
  role: string
  primaryPhone: string
  whatsapp: string
  country: string                 // ISO alpha-2
  logo: string | null             // provider-level mark/avatar (distinct from company.logo)
  /** Notification opt-ins (email today; SMS later). Absent = all on. */
  notificationPrefs?: { bookings?: boolean; payouts?: boolean; marketing?: boolean }
  onboardingStage: 'registered' | 'active' | 'complete'
  signoff: Signoff | null         // create-once, immutable; one agreement covers all companies
  createdAt: TS
  updatedAt: TS
}

/** providers/{uid}/private/admin — provider reads, admin writes. */
export interface ProviderPrivateAdmin {
  status: 'active' | 'suspended'
}

// ══════════════════════════════════════════════════════════════════════════
// companies/{companyId} — a business owned by a provider. Own commission window.
// ══════════════════════════════════════════════════════════════════════════
export type CompletenessKey = 'profile' | 'listings' | 'photos' | 'operations' | 'documents' | 'payouts'

export interface Company {
  id?: string
  providerId: string              // FK → providers/{uid}; immutable
  name: string                    // trading/display name → experiences.provider
  legalName: string
  businessType: string            // v3.2 (from old partner doc)
  category: string                // config/categories id; default for its experiences
  city: string                    // config/markets id; must be enabled
  address: string
  mapsLink: string | null
  websiteOrSocial: string | null
  phone: string
  whatsapp: string
  /** Jordan/ChatGPT #28 (2026-08-22, additive): fuller public profile. */
  email?: string | null           // business contact email (not the login)
  instagram?: string | null       // handle or URL
  tiktok?: string | null          // handle or URL
  description?: string | null     // short public blurb, shown on the app's company card
  logo: string | null             // v3.2 (from old photos.providerLogo)
  heroPhoto: string | null        // company hero/banner (old photos.heroPhoto — had no v3.2 home)
  gallery: string[]               // company-level gallery (old photos.gallery — had no v3.2 home)
  operations: Record<string, unknown> | null // v3.2 (old operations{} wholesale; app ignores)
  completeness: Partial<Record<CompletenessKey, boolean>>
  activatedAt: TS | null          // admin-only; starts THIS company's 12-mo 10% window
  active: boolean                 // admin-only kill switch
  createdAt: TS
  updatedAt: TS
}

export interface PayoutVerification {
  verified: boolean
  recipientHash: string
}

/**
 * companies/{companyId}/private/payout — the PARTNER's own payout details,
 * entered by them in dashboard Settings (Jordan: "biggest omission"). Owner
 * read/write, admin read. Mobile-money numbers / bank references only — never
 * card numbers or credentials. Distinct from private/admin (admin-only).
 */
export interface CompanyPayoutProfile {
  method: 'wave' | 'orange_money' | 'bank_transfer'
  accountName: string             // account holder / registered name
  phone: string | null            // mobile money number (wave / orange_money)
  bankName: string | null         // bank_transfer only
  accountRef: string | null       // IBAN / account number reference
  updatedAt: TS
}

/** companies/{companyId}/private/admin — provider reads own rate, admin writes. */
export interface CompanyPrivateAdmin {
  commissionRate: number          // e.g. 0.10 during this company's window
  payoutMethod: string | null     // OPEN vocab (paydunya|paystack|wave|orange_money|bank_transfer|…)
  payoutConfig: Record<string, unknown> | null   // never raw credentials; deferred
  payoutVerification: PayoutVerification | null   // deferred
}

// ══════════════════════════════════════════════════════════════════════════
// experiences/{id} — the shared listing. Dashboard authors, app reads.
// ══════════════════════════════════════════════════════════════════════════
export type ExperienceMode = 'paid' | 'reservation'
export type PriceUnit = 'flat' | 'per_person'        // v3.2
export type ConfirmationType = 'instant' | 'provider_confirmed'
export type ScheduleType = 'one_time' | 'ongoing' | 'scheduled'
export type ExperienceStatus = 'draft' | 'pending_review' | 'published' | 'unpublished' | 'archived'
// Jordan's final call (2026-08-23): four free-cancellation windows — 24h,
// 48h, 3 days, 5 days. OUTSIDE the window: full refund. INSIDE: no refund
// (the business is paid in full, commission applies). Tier ids are stable
// labels; the hours live in config/policies and are denormalized onto each
// listing as cancelDeadlineHours.
export type CancellationTier = 'flexible' | 'moderate' | 'strict' | 'firm'

export interface CancellationPolicy {
  tier: CancellationTier
  customNotes: string | null
  policyVersion: string
}

/** "HH:MM" 24h strings. */
export interface HoursRange { open: string; close: string }

export interface Schedule {
  /** Days the listing is bookable: 'Mon'…'Sun'. Empty/absent = every day. */
  days?: string[]
  /** Bookable hours (2026-08-23 — replaces duration + free-text start
   *  times). `same` applies to every open day unless `byDay` overrides it.
   *  The guest picks a START time inside these hours; what they get (2h vs
   *  4h, 60 vs 90 min) is a required choice on the listing, never a
   *  listing-level duration. */
  hours?: { same: HoursRange; byDay?: Partial<Record<string, HoursRange | null>> } | null
  /** @deprecated free-text start times — no longer written; older docs only */
  timeSlots?: string[]
  leadTime?: string
  blackoutDates?: string
  advanceBookingDays?: string
}

export interface OptionGroup {
  id: string
  name: string
  required: boolean
  minSelect: number
  maxSelect: number
  allowQuantity: boolean
  sortOrder: number
}

export interface Experience {
  id?: string
  providerId: string              // required, immutable — security anchor
  companyId: string               // required, immutable — commission = this company's window
  mode: ExperienceMode
  price: number | null            // BASE, tax-inclusive int; >0 iff paid; null iff reservation
  priceUnit: PriceUnit            // v3.2 — how BASE price applies
  currency: string | null         // 'XOF' at launch; required if paid or any paid option
  confirmationType: ConfirmationType
  cancellationPolicy: CancellationPolicy
  /** Resolved free-cancellation window in HOURS before `scheduledFor`,
   *  denormalized from config/policies[tier] at save (2026-08-22, additive).
   *  The app reads THIS to decide refund eligibility — no config join. */
  cancelDeadlineHours?: number | null
  /** 'ongoing' = bookable hours (default for every category), 'one_time' =
   *  a dated event. 'scheduled' is legacy (old listings) and reads as
   *  'ongoing' with `schedule.days`. */
  scheduleType: ScheduleType
  eventDate: TS | null            // event START (required iff one_time)
  eventEnd?: TS | null            // event END (2026-08-23, additive)
  /** Stays (hotels, villas): check-in / check-out times + minimum nights.
   *  Replaces any notion of duration for lodging. */
  checkInTime?: string | null     // "15:00"
  checkOutTime?: string | null    // "11:00"
  minNights?: number | null
  schedule: Schedule | null
  optionGroups: OptionGroup[]     // [] = simple experience
  title: string
  location: string
  category: string                // config id; defaults from company; overridable; enabled
  city: string                    // config id; enabled only
  mapsLink: string | null         // Google Maps link — what the PARTNER enters; required at publish
  // Menu attachment for restaurant-style listings (dining/nightlife) —
  // optional; the app shows a "View menu" affordance when present.
  menuUrl?: string | null
  menuType?: 'pdf' | 'image' | null
  lat: number | null              // derived from mapsLink when parseable; app's pin. Partners never type these.
  lng: number | null
  /** REMOVED as a concept (Jordan, 2026-08-23). A listing has no duration —
   *  it has bookable hours / check-in–out / an event window, and the
   *  length of what a guest gets is a required CHOICE on the listing
   *  (2h / 4h, 60 / 90 min). The dashboard no longer writes any of these;
   *  older docs may still carry values. */
  duration?: string
  durationValue?: number | null
  durationUnit?: 'minutes' | 'hours' | 'days' | 'nights' | null
  guests: string                  // derived from min/maxGuests
  minGuests: number
  maxGuests: number
  img: string                     // LISTING hero; required at publish
  gallery: string[]
  provider: string                // display = company.name (derived / fanout)
  description: string
  includes: string[]
  highlights: string[]
  languages: string[]             // v3.2, optional
  excludes: string[]              // v3.2, optional
  dressCode: string | null        // v3.2, optional
  tag: string | null              // admin-only curation badge
  active: boolean                 // always == (status == 'published')
  status: ExperienceStatus        // 'published' admin-only; 'archived' terminal once booked
  rating: number                  // server-only
  reviews: number                 // server-only
  needsReview?: string[]          // transient (migration): e.g. ['cancellationTier','photos','coords']
  createdAt: TS
  updatedAt: TS
}

/** experiences/{id}/options/{optionId} */
export interface Option {
  id?: string
  groupId: string                 // → parent optionGroups.id
  name: string
  description: string
  img: string | null              // v3.2 main/thumbnail
  gallery: string[]               // v3.2
  price: number                   // 0 = free; additive; tax-inclusive
  maxQuantityPerBooking: number   // default 1
  active: boolean
  sortOrder: number
}

// ══════════════════════════════════════════════════════════════════════════
// config/* — admin-owned reference data; all clients read; never hard-coded.
// ══════════════════════════════════════════════════════════════════════════
export interface MarketsConfig {
  cities: { id: string; name: string; country: string; enabled: boolean }[]
}
export interface CategoriesConfig {
  categories: { id: string; name: string; enabled: boolean }[]
}
export interface PolicyTier {
  cancelDeadlineHours: number
  fullRefundBeforeDeadline: boolean
  partialRefundPct: number
  noShowPolicy: string
  reschedulingRules: string
  feesRefundable: boolean
}
export interface PoliciesConfig {
  tiers: Record<CancellationTier, PolicyTier>
  version: string
  /** The refund matrix, stated once for both clients. */
  refundRules?: { outsideWindow: 'full'; insideWindow: 'none'; noShow: 'none'; businessCancelsPaid: 'full' }
}

// ══════════════════════════════════════════════════════════════════════════
// migrationArchive/{uid} — admin-only; clients denied. The migration safety net.
// ══════════════════════════════════════════════════════════════════════════
export interface MigrationArchive {
  migratedAt: TS
  sourcePartner: Record<string, unknown>
  sourceListings: Record<string, unknown>[]
  unmappedFields: Record<string, unknown>
}

// ══════════════════════════════════════════════════════════════════════════
// v3.3 — RESERVATIONS & MONEY  (CANONICAL CONTRACT — Samson's app conforms)
//
// bookings/{id} is written by the customer app at checkout and READ by the
// dashboard. It is fully SNAPSHOTTED: the terms shown to a partner (and used to
// compute what they're owed) are frozen at booking time, immune to later edits
// of the experience, its price, or the company's commission rate. ledger/{id}
// and payouts/{id} are DERIVED from bookings — a partner never writes any of
// these; the dashboard renders them read-only.
// ══════════════════════════════════════════════════════════════════════════

/** A single option the guest picked, snapshotted (name+price frozen). */
export interface BookingSelection {
  optionId: string
  groupId: string
  name: string
  price: number        // per-unit, at booking time
  quantity: number
}

export type BookingStatus =
  | 'pending'          // provider_confirmed listing, awaiting partner action
  | 'confirmed'        // accepted (or instant-confirm)
  | 'declined'         // partner declined
  | 'cancelled'        // cancelled by guest/system (see cancellationPolicy)
  | 'completed'        // experience delivered → eligible for payout
  | 'no_show'          // guest didn't show

export interface Booking {
  id?: string
  // ── Anchors (immutable; drive rules + partner queries) ──
  experienceId: string
  companyId: string
  providerId: string
  // ── Guest (minimal; no sensitive PII stored dashboard-side) ──
  customerId: string          // app user uid
  customerName: string        // display only
  customerPhone?: string | null   // optional — shown in the reservation detail view
  customerEmail?: string | null   // optional
  specialRequests?: string | null // guest note at booking, optional
  paymentStatus?: 'paid' | 'unpaid' | 'refunded' | null // app-set; reservation-mode bookings are 'unpaid'
  /** Processor state (PayDunya etc.), written by the APP onto the booking doc
   * itself — never as a separate doc. Absent for mode='reservation'. */
  // Two rails by design: PayDunya (amountXof/token) or Stripe
  // (currency/amountMinor/sessionId). Booking money fields stay XOF.
  // ── Fields the APP writes that aren't part of our v3.3 contract but are
  // present in live data (observed 2026-08-16). We only ever READ these.
  /** Split payment: how many people owe a share, and how many have paid. */
  payersCount?: number
  paidCount?: number
  /** uids of the co-payers (inconsistently populated — treat as optional). */
  copayUids?: string[]
  /** Raw checkout snapshot the app keeps (contact details, selections…). */
  checkout?: {
    payers?: number; uid?: string
    customerPhone?: string; customerEmail?: string
    nights?: number; selections?: unknown[]
    createdAt?: TS
  }
  nights?: number
  pointsAwarded?: number
  payment?: {
    provider: string; status: string; updatedAt?: TS
    amountXof?: number; token?: string | null            // PayDunya
    currency?: string; amountMinor?: number; sessionId?: string  // Stripe
  } | null
  guestCount: number
  // ── When ──
  scheduledFor: TS            // the reserved date/time of the experience
  // ── Snapshot of the listing terms at booking time ──
  title: string
  provider: string            // company display name, frozen
  mode: ExperienceMode
  priceUnit: PriceUnit
  currency: string
  confirmationType: ConfirmationType
  basePrice: number | null    // frozen base (per priceUnit)
  cancellationPolicy: CancellationPolicy   // RESOLVED tier terms, frozen
  selections: BookingSelection[]
  // ── Money (all ints, tax-inclusive, in `currency`) ──
  bookingTotal: number        // base×unit + Σ(selection.price×qty)
  commissionRate: number      // company's rate at booking time, frozen
  commissionAmount: number    // round(bookingTotal × commissionRate)
  payoutAmount: number        // bookingTotal − commissionAmount → owed to partner
  // ── Lifecycle ──
  status: BookingStatus
  createdAt: TS
  updatedAt: TS
  confirmedAt: TS | null
  cancelledAt: TS | null
  /** Door check-in (ticket QR scanned by the partner) — set with status
   *  'completed' (2026-08-25, additive). */
  checkedInAt?: TS | null
  /** Guest ids from scanned per-guest tickets (palmera://checkin?…&guest=). */
  checkedInGuests?: string[]
}

export type LedgerEntryType =
  | 'commission_earned'   // + credit to partner (a completed booking's payoutAmount)
  | 'payout'              // − debit (funds sent to partner)
  | 'refund'              // − reversal of a cancelled/refunded booking's credit
  | 'clawback'            // − commission reclaim (see BPA clawback terms)
  | 'adjustment'          // ± manual admin correction

/**
 * ledger/{id} — one immutable money event per row. Signed `amount`: positive
 * increases what Palmera owes the partner, negative decreases it. The partner's
 * balance = Σ amount over their company. Append-only; corrections are new rows.
 */
export interface LedgerEntry {
  id?: string
  companyId: string
  providerId: string
  bookingId: string | null    // null for manual adjustments
  payoutId: string | null     // set once rolled into a payout batch
  type: LedgerEntryType
  amount: number              // signed int, in `currency`
  currency: string
  description: string
  createdAt: TS
}

export type PayoutStatus = 'scheduled' | 'processing' | 'paid' | 'failed'

/** A clawed-back booking inside a payout (BPA clawback), snapshotted. */
export interface PayoutClawback {
  bookingId: string
  amount: number              // positive int withheld
  reason: string
}

/**
 * payouts/{id} — a biweekly payout batch for one company. Sums the eligible
 * ledger credits for the period, minus clawbacks. Admin/CF writes; partner reads.
 */
export interface Payout {
  id?: string
  companyId: string
  providerId: string
  periodStart: TS
  periodEnd: TS
  status: PayoutStatus
  currency: string
  grossAmount: number         // Σ eligible credits in period
  clawbacks: PayoutClawback[]
  clawbackTotal: number       // Σ clawbacks.amount
  netAmount: number           // grossAmount − clawbackTotal → actually sent
  method: string | null       // snapshot of company payout method
  ledgerEntryIds: string[]    // the credits settled by this batch
  reference: string | null    // processor transaction id, once paid
  scheduledFor: TS
  paidAt: TS | null
  createdAt: TS
  updatedAt: TS
}

// ── App-side (Samson's collections) — display-only types for /admin ──────
// snake_case matches what the app writes; the dashboard never writes these.
export interface AppProfile {
  id?: string // uid
  name?: string
  handle?: string
  city?: string
  phone?: string
  instagram?: string
  avatar_url?: string
  points?: number
  annual_points?: number
  is_plus?: boolean
  created_at?: unknown
}

/** Loose shape for the rest of the app collections (moments, favorites,
 *  friends, points_ledger…) — read via lib/analytics normalizers. */
export interface AppDoc {
  id?: string
  user_id?: string
  created_at?: unknown
  [key: string]: unknown
}

// ── Marketplace (dashboard-owned; the iOS app never touches these) ───────
// Suppliers are wholesale businesses (alcohol first) selling to partners.
// Vocabulary rule: "supplier", never "vendor" — vendor blurs with
// partner/provider. Doc id is auto-generated; `uid` stays null until the
// supplier first signs in with the invited email and claims the record
// (concierge onboarding: admins author suppliers + products first).
export type SupplierStatus = 'active' | 'paused'

export interface Supplier {
  id?: string
  uid: string | null          // auth uid once claimed; null = invited only
  name: string
  email: string               // claim key — must match the auth account
  phone: string
  city: string
  status: SupplierStatus
  commissionRate: number      // decimal, e.g. 0.118 — same mechanics as companies
  notes?: string              // admin-only context (who vetted them, terms)
  createdAt?: TS
  updatedAt?: TS
}

export type SupplyProductStatus = 'live' | 'hidden'

export interface SupplyProduct {
  id?: string
  supplierId: string
  supplierName: string        // denormalized for the store grid
  city: string                // denormalized from the supplier for filtering
  name: string
  category: string            // 'alcohol' first; enum grows via config/marketplace
  photo: string | null
  unit: string                // 'bottle' | 'case' | 'crate' | 'unit'…
  unitSize: string            // "75cl", "×24"…
  price: number               // XOF per unit
  stock: number               // decremented on order accept (phase 3)
  status: SupplyProductStatus
  createdAt?: TS
  updatedAt?: TS
}

// supply_orders — a RECEIPT: items + the commission split are frozen at
// submission and never recomputed from later price/rate edits.
export type SupplyOrderStatus =
  | 'awaiting_payment' | 'paid' | 'accepted' | 'delivered'
  | 'declined' | 'cancelled' | 'refunded'

export interface SupplyOrderItem {
  productId: string
  name: string
  unit: string
  unitSize: string
  unitPrice: number
  qty: number
  lineTotal: number
}

export interface SupplyOrder {
  id?: string
  partnerId: string           // buyer's auth uid
  companyId: string           // buying business
  companyName: string
  supplierId: string
  supplierName: string
  items: SupplyOrderItem[]
  orderTotal: number
  commissionRate: number      // frozen from the supplier at submission
  commissionAmount: number
  supplierNet: number
  status: SupplyOrderStatus
  note: string
  payment: { provider: 'stripe'; sessionId: string | null; status: 'pending' | 'completed' | 'refunded' } | null
  createdAt?: TS
  updatedAt?: TS
  paidAt?: TS | null
  acceptedAt?: TS | null
  deliveredAt?: TS | null
}

// ── Company staff (dashboard-owned; the iOS app never touches this) ────────
// A partner invites staff by email with a ROLE. 'door' = the check-in
// scanner only (bouncer at the venue), via the dedicated /door surface.
// Doc id = `${companyId}_${uid-or-invite}`; uid stays null until the staff
// member first signs in with the invited (verified) email and claims it.
export type StaffRole = 'door'

export interface StaffMember {
  id?: string
  companyId: string
  providerId: string          // the owning partner — invite issuer
  uid: string | null          // auth uid once claimed
  email: string               // claim key
  name: string                // display, set by the partner
  role: StaffRole
  status: 'active' | 'revoked'
  createdAt?: TS
  updatedAt?: TS
}
