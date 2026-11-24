// Turns a connector request into the SAME listing document the partner
// editor saves (ExperienceModal.handleSave → saveExperienceWithOptions →
// addExperience). Pure: no I/O, so it is testable and a dry run costs
// nothing. Anything the editor derives is derived here the same way —
// legacy `category`, `availability`/`closedDays`, `cancelDeadlineHours`,
// `guests`, `currency`, `needsReview`. Photos are never set here: a listing
// made through the connector stays a draft until a person adds them.
import type { CancellationTier, Experience, Option, OptionGroup } from '@/lib/schema'
import { availabilityFromSchedule } from '@/lib/availability'
import { classifyListing, isMainCategoryId, isSubcategoryId, legacyCategoryFor, mainOfSub, type MainCategoryId } from '@/lib/categories'

export const LISTING_LANGUAGES = ['French', 'English', 'Wolof', 'Arabic', 'Spanish'] as const
export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const
export const TIERS: CancellationTier[] = ['flexible', 'moderate', 'strict', 'firm']

export interface OptionGroupInput {
  name: string
  /** choice = the guest must pick exactly one · extras = optional add-ons, several allowed */
  kind: 'choice' | 'extras'
  options: { name: string; price?: number; description?: string; maxQuantity?: number }[]
}

export interface ListingInput {
  title?: string
  description?: string
  mainCategory?: string
  subcategory?: string | null
  city?: string
  location?: string
  mapsLink?: string | null
  mode?: 'paid' | 'reservation'
  price?: number | null
  priceUnit?: 'flat' | 'per_person'
  confirmationType?: 'instant' | 'provider_confirmed'
  cancellationTier?: CancellationTier
  minGuests?: number
  maxGuests?: number
  /** A dated one-time event (Dakar time). Mutually exclusive with `hours`. */
  event?: { date: string; start?: string; end?: string } | null
  /** Weekly bookable hours. `days` empty = every day; `byDay[Mon] = null` closes that day. */
  hours?: { open: string; close: string; days?: string[]; byDay?: Record<string, { open: string; close: string } | null> } | null
  /** Stays only. */
  checkInTime?: string | null
  checkOutTime?: string | null
  minNights?: number | null
  includes?: string[]
  highlights?: string[]
  excludes?: string[]
  languages?: string[]
  dressCode?: string | null
  optionGroups?: OptionGroupInput[]
}

export interface ListingRefs {
  company: { id: string; name: string; providerId: string; city?: string }
  enabledCities: string[]
  tierHours: Partial<Record<CancellationTier, number>>
}

type GroupWithOptions = OptionGroup & { options: Option[] }
export type BuiltListing =
  | { ok: true; data: Partial<Experience>; groups: GroupWithOptions[] | null }
  | { ok: false; problems: string[] }

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/
const DATE = /^\d{4}-\d{2}-\d{2}$/
const clean = (v: unknown, max: number) => String(v ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, max)
const list = (v: unknown, maxItems: number, maxLen: number) => (Array.isArray(v) ? v.map((x) => clean(x, maxLen)).filter(Boolean).slice(0, maxItems) : [])
/** A whole number, or NaN — 12.5 is rejected, never rounded (money and head counts). */
const int = (v: unknown) => (typeof v === 'number' && Number.isInteger(v) ? v : NaN)
const DEFAULT_TIER_HOURS: Record<CancellationTier, number> = { flexible: 24, moderate: 48, strict: 72, firm: 120 }

/** Build the full document from a complete input. `existingGroups` keeps the
 *  current option groups (and their ids) when an update does not touch them;
 *  `existingHasPaidOption` then decides the currency the same way. */
export function buildListing(input: ListingInput, refs: ListingRefs, existing?: { optionGroups: OptionGroup[]; hasPaidOption: boolean }): BuiltListing {
  const problems: string[] = []
  const title = clean(input.title, 120)
  if (!title) problems.push('title is required')

  // ── Category: main is required; sub is validated against it, else classified from the title.
  let main: MainCategoryId | null = isMainCategoryId(input.mainCategory) ? input.mainCategory : null
  let sub: string | null = input.subcategory ? String(input.subcategory) : null
  if (sub && !isSubcategoryId(sub)) { problems.push(`subcategory "${sub}" is not a known id (call listing_options)`); sub = null }
  if (!main && sub) main = mainOfSub(sub)
  if (!main) problems.push('mainCategory is required: dining, experiences, entertainment, sports_wellness, stay or rentals')
  if (main && sub && mainOfSub(sub) !== main) { problems.push(`subcategory "${sub}" does not belong to ${main}`); sub = null }
  if (main && !sub) sub = classifyListing({ mainCategory: main, title, tag: null }).sub

  // ── City: defaults to the company's; must be an enabled market.
  const city = clean(input.city || refs.company.city, 60).toLowerCase()
  if (!city) problems.push('city is required (call listing_options for the enabled cities)')
  else if (!refs.enabledCities.includes(city)) problems.push(`city "${city}" is not an enabled market: ${refs.enabledCities.join(', ')}`)

  // ── Price
  const priceIn = input.price == null ? null : int(input.price)
  if (priceIn !== null && (Number.isNaN(priceIn) || priceIn < 0 || priceIn > 100_000_000)) problems.push('price must be a whole number of XOF')
  const mode = input.mode ?? (priceIn && priceIn > 0 ? 'paid' : 'reservation')
  if (mode !== 'paid' && mode !== 'reservation') problems.push('mode must be paid or reservation')
  const isPaid = mode === 'paid'
  if (isPaid && !(priceIn && priceIn > 0)) problems.push('a paid listing needs a price above 0 (XOF); use mode "reservation" for free bookings')
  const priceUnit = input.priceUnit ?? 'flat'
  if (priceUnit !== 'flat' && priceUnit !== 'per_person') problems.push('priceUnit must be flat or per_person')
  const confirmationType = input.confirmationType ?? 'provider_confirmed'
  if (confirmationType !== 'instant' && confirmationType !== 'provider_confirmed') problems.push('confirmationType must be instant or provider_confirmed')
  const tier = input.cancellationTier ?? 'moderate'
  if (!TIERS.includes(tier)) problems.push(`cancellationTier must be one of ${TIERS.join(', ')}`)

  // ── Group size (0 max = no limit, as in the editor)
  const minGuests = Math.max(1, Number.isNaN(int(input.minGuests ?? 1)) ? 1 : int(input.minGuests ?? 1))
  const maxRaw = int(input.maxGuests ?? 10)
  const maxGuests = maxRaw === 0 ? 0 : Math.max(minGuests, Number.isNaN(maxRaw) ? minGuests : maxRaw)

  // ── When: a dated event, weekly hours, or (stays) check-in/out.
  const isStay = main === 'stay'
  const isOneTime = !!input.event
  if (input.event && input.hours) problems.push('give either event (one-time) or hours (ongoing), not both')
  let eventDate: Date | null = null, eventEnd: Date | null = null
  if (input.event) {
    const { date, start = '19:00', end = '23:00' } = input.event
    if (!DATE.test(String(date))) problems.push('event.date must be YYYY-MM-DD')
    if (!TIME.test(start) || !TIME.test(end)) problems.push('event.start and event.end must be HH:MM (24h)')
    if (DATE.test(String(date)) && TIME.test(start) && TIME.test(end)) {
      // Dakar is UTC all year, so the wall-clock time IS the UTC time.
      eventDate = new Date(`${date}T${start}:00Z`); eventEnd = new Date(`${date}T${end}:00Z`)
      if (Number.isNaN(eventDate.getTime())) { problems.push('event.date is not a real date'); eventDate = null; eventEnd = null }
    }
  }
  let schedule: Experience['schedule'] = null
  if (!isOneTime) {
    const h = input.hours
    if (h) {
      if (!TIME.test(String(h.open)) || !TIME.test(String(h.close))) problems.push('hours.open and hours.close must be HH:MM (24h)')
      const days = (h.days ?? []).map((d) => clean(d, 3)).map((d) => d.charAt(0).toUpperCase() + d.slice(1).toLowerCase())
      const badDay = days.find((d) => !(DAYS as readonly string[]).includes(d))
      if (badDay) problems.push(`hours.days: "${badDay}" is not one of ${DAYS.join(', ')}`)
      const byDay: Record<string, { open: string; close: string } | null> = {}
      for (const [k, v] of Object.entries(h.byDay ?? {})) {
        const key = k.slice(0, 3).toLowerCase()
        if (!['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].includes(key)) { problems.push(`hours.byDay: "${k}" is not a weekday`); continue }
        if (v === null) byDay[key] = null
        else if (TIME.test(String(v?.open)) && TIME.test(String(v?.close))) byDay[key] = { open: v.open, close: v.close }
        else problems.push(`hours.byDay.${k} must be {open, close} in HH:MM, or null for closed`)
      }
      schedule = { ...(days.length ? { days } : {}), hours: isStay ? null : { same: { open: h.open, close: h.close }, ...(Object.keys(byDay).length ? { byDay } : {}) } }
    } else {
      schedule = { hours: isStay ? null : { same: { open: '09:00', close: '18:00' } } }
    }
  }
  for (const [k, v] of [['checkInTime', input.checkInTime], ['checkOutTime', input.checkOutTime]] as const) {
    if (v != null && !TIME.test(String(v))) problems.push(`${k} must be HH:MM (24h)`)
  }
  const minNights = input.minNights == null ? null : int(input.minNights)
  if (minNights !== null && (Number.isNaN(minNights) || minNights < 1 || minNights > 365)) problems.push('minNights must be between 1 and 365')

  // ── Lists and free text
  const languages = list(input.languages, 5, 20)
  const badLang = languages.find((l) => !(LISTING_LANGUAGES as readonly string[]).includes(l))
  if (badLang) problems.push(`languages: "${badLang}" is not one of ${LISTING_LANGUAGES.join(', ')}`)
  const mapsLink = input.mapsLink ? clean(input.mapsLink, 500) : null
  if (mapsLink && !/^https:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps|(www\.)?google\.[a-z.]+\/maps|maps\.google\.[a-z.]+)\//i.test(mapsLink)) problems.push('mapsLink must be a Google Maps https link')

  // ── Option groups (only when given — an update that omits them keeps what is there)
  let groups: GroupWithOptions[] | null = null
  if (input.optionGroups) {
    if (input.optionGroups.length > 12) problems.push('at most 12 option groups')
    groups = input.optionGroups.slice(0, 12).map((g, gi) => {
      const name = clean(g?.name, 80)
      if (!name) problems.push(`optionGroups[${gi}].name is required`)
      const kind = g?.kind === 'extras' ? 'extras' : g?.kind === 'choice' ? 'choice' : null
      if (!kind) problems.push(`optionGroups[${gi}].kind must be "choice" (pick one, required) or "extras" (optional add-ons)`)
      const opts = Array.isArray(g?.options) ? g.options.slice(0, 40) : []
      if (kind === 'choice' && opts.length < 2) problems.push(`optionGroups[${gi}] is a choice and needs at least 2 options`)
      if (opts.length < 1) problems.push(`optionGroups[${gi}] needs at least 1 option`)
      const id = `g_${Date.now()}_${gi}${Math.random().toString(36).slice(2, 6)}`
      return {
        id, name, sortOrder: gi,
        ...(kind === 'extras' ? { required: false, minSelect: 0, maxSelect: 99, allowQuantity: true } : { required: true, minSelect: 1, maxSelect: 1, allowQuantity: false }),
        options: opts.map((o, oi) => {
          const oname = clean(o?.name, 80)
          if (!oname) problems.push(`optionGroups[${gi}].options[${oi}].name is required`)
          const p = o?.price == null ? 0 : int(o.price)
          if (Number.isNaN(p) || p < 0 || p > 100_000_000) problems.push(`optionGroups[${gi}].options[${oi}].price must be a whole number of XOF (0 = free)`)
          const mq = o?.maxQuantity == null ? 1 : int(o.maxQuantity)
          return { groupId: id, name: oname, description: clean(o?.description, 300), img: null, gallery: [], price: Number.isNaN(p) ? 0 : p,
            maxQuantityPerBooking: Number.isNaN(mq) || mq < 1 ? 1 : Math.min(mq, 99), active: true, sortOrder: oi }
        }),
      }
    })
  }
  if (problems.length) return { ok: false, problems }

  const paidOption = groups ? groups.some((g) => g.options.some((o) => (o.price || 0) > 0)) : !!existing?.hasPaidOption
  const optionGroups: OptionGroup[] = groups ? groups.map(({ options: _o, ...g }) => { void _o; return g }) : (existing?.optionGroups ?? [])
  const scheduleType: Experience['scheduleType'] = isOneTime ? 'one_time' : 'ongoing'
  const appHours = availabilityFromSchedule(scheduleType, schedule)
  const data: Partial<Experience> = {
    providerId: refs.company.providerId, companyId: refs.company.id, provider: refs.company.name || '',
    title, description: clean(input.description, 4000), location: clean(input.location, 200),
    mainCategory: main, subcategory: sub as Experience['subcategory'], category: legacyCategoryFor(main, sub), city,
    mapsLink, lat: null, lng: null,
    mode, price: isPaid ? priceIn : null, priceUnit, currency: isPaid || paidOption ? 'XOF' : null,
    confirmationType,
    cancellationPolicy: { tier, customNotes: null, policyVersion: 'v1' },
    cancelDeadlineHours: refs.tierHours[tier] ?? DEFAULT_TIER_HOURS[tier],
    scheduleType, eventDate: eventDate as unknown as Experience['eventDate'], eventEnd: eventEnd as unknown as Experience['eventEnd'], schedule,
    ...(appHours ?? {}),
    ...(isStay ? { checkInTime: input.checkInTime ?? '15:00', checkOutTime: input.checkOutTime ?? '11:00', minNights: minNights ?? 1 } : {}),
    optionGroups,
    minGuests, maxGuests, guests: `${minGuests}–${maxGuests}`,
    includes: list(input.includes, 30, 160), highlights: list(input.highlights, 12, 160), excludes: list(input.excludes, 30, 160),
    languages, dressCode: input.dressCode ? clean(input.dressCode, 160) : null,
    duration: '', durationValue: null, durationUnit: null,
  }
  return { ok: true, data, groups }
}

/** What stops a listing from going live — the editor's own publish blockers, plus the basics. */
export function publishBlockers(e: Partial<Experience>): string[] {
  return [
    !e.title && 'title',
    !e.mainCategory && !e.category && 'category',
    !e.city && 'city',
    e.mode === 'paid' && !(e.price && e.price > 0) && 'price',
    !e.img && 'main photo (add it in the dashboard)',
    !e.mapsLink && 'Google Maps link',
    !e.cancellationPolicy?.tier && 'cancellation policy',
  ].filter(Boolean) as string[]
}

/** The connector-shaped view of a stored listing: what `get_listing` returns
 *  and what an update starts from. */
export function inputFromExisting(e: Partial<Experience>, options: Option[]): ListingInput {
  const toDate = (v: unknown): Date | null => {
    const t = v as { toDate?: () => Date } | null
    if (t && typeof t.toDate === 'function') return t.toDate()
    return v instanceof Date ? v : null
  }
  const hhmm = (d: Date | null) => (d ? d.toISOString().slice(11, 16) : undefined)
  const ev = toDate(e.eventDate), evEnd = toDate(e.eventEnd)
  const cls = isMainCategoryId(e.mainCategory) ? { main: e.mainCategory, sub: e.subcategory ?? null } : classifyListing({ category: e.category, title: e.title, tag: e.tag })
  const h = e.schedule?.hours
  return {
    title: e.title, description: e.description, mainCategory: cls.main, subcategory: cls.sub, city: e.city, location: e.location, mapsLink: e.mapsLink ?? null,
    mode: e.mode, price: e.price ?? null, priceUnit: e.priceUnit, confirmationType: e.confirmationType,
    cancellationTier: e.cancellationPolicy?.tier, minGuests: e.minGuests, maxGuests: e.maxGuests,
    event: e.scheduleType === 'one_time' && ev ? { date: ev.toISOString().slice(0, 10), start: hhmm(ev), end: hhmm(evEnd) } : null,
    hours: e.scheduleType !== 'one_time' && h?.same ? { open: h.same.open, close: h.same.close, ...(e.schedule?.days?.length ? { days: e.schedule.days } : {}), ...(h.byDay && Object.keys(h.byDay).length ? { byDay: h.byDay as Record<string, { open: string; close: string } | null> } : {}) }
      : null,
    checkInTime: e.checkInTime ?? null, checkOutTime: e.checkOutTime ?? null, minNights: e.minNights ?? null,
    includes: e.includes ?? [], highlights: e.highlights ?? [], excludes: e.excludes ?? [], languages: e.languages ?? [], dressCode: e.dressCode ?? null,
    optionGroups: (e.optionGroups ?? []).map((g) => ({
      name: g.name, kind: g.required ? 'choice' as const : 'extras' as const,
      options: options.filter((o) => o.groupId === g.id).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .map((o) => ({ name: o.name, price: o.price, ...(o.description ? { description: o.description } : {}), ...(o.maxQuantityPerBooking > 1 ? { maxQuantity: o.maxQuantityPerBooking } : {}) })),
    })),
  }
}
