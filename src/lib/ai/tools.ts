// The tools the AI connector exposes (server-only). Each has a scope:
//   read    — look things up
//   write   — create and edit listings that are NOT live (drafts, unpublished)
//   publish — anything a member sees at once: publish/unpublish, editing a
//             live listing, Featured tonight
// Listings are written with the Admin SDK in exactly the shape the partner
// editor saves (see ./listing.ts). Members' contact details never leave here:
// bookings come back with a first name only.
import { FieldValue } from 'firebase-admin/firestore'
import { adminDb } from '@/lib/firebase-admin'
import type { CancellationTier, Experience, Option } from '@/lib/schema'
import { MAIN_CATEGORIES, subcategoriesFor } from '@/lib/categories'
import { buildListing, inputFromExisting, publishBlockers, DAYS, LISTING_LANGUAGES, TIERS, type ListingInput, type ListingRefs } from './listing'
import { logAudit, type AiKeyCtx, type AiScope } from './keys'

type Doc = FirebaseFirestore.DocumentData
type Json = Record<string, unknown>
export class ToolError extends Error {}

export interface ToolDef {
  name: string
  title: string
  description: string
  scope: AiScope
  inputSchema: Json
  annotations: { readOnlyHint?: boolean; destructiveHint?: boolean; idempotentHint?: boolean; openWorldHint?: boolean }
  run: (args: Json, key: AiKeyCtx) => Promise<unknown>
}

// ── shared reads ────────────────────────────────────────────────────────────
const iso = (v: unknown): string | null => {
  const t = v as { toDate?: () => Date } | null
  if (t && typeof t.toDate === 'function') return t.toDate().toISOString()
  return v instanceof Date ? v.toISOString() : null
}
const str = (v: unknown, max = 200) => String(v ?? '').trim().slice(0, max)
const idArg = (v: unknown, what: string) => {
  const s = str(v, 128)
  if (!/^[A-Za-z0-9_-]{4,128}$/.test(s)) throw new ToolError(`${what} is required (an id from a list tool)`)
  return s
}

async function refsFor(companyId: string): Promise<ListingRefs> {
  const db = adminDb()
  const [co, markets, policies] = await db.getAll(db.collection('companies').doc(companyId), db.collection('config').doc('markets'), db.collection('config').doc('policies'))
  if (!co.exists) throw new ToolError(`company ${companyId} not found (call list_companies)`)
  const c = co.data() as Doc
  const enabledCities = ((markets.data()?.cities ?? []) as { id: string; enabled?: boolean }[]).filter((x) => x.enabled).map((x) => String(x.id).toLowerCase())
  const tiers = (policies.data()?.tiers ?? {}) as Record<string, { cancelDeadlineHours?: unknown }>
  const tierHours: Partial<Record<CancellationTier, number>> = {}
  for (const t of TIERS) { const n = Number(tiers[t]?.cancelDeadlineHours); if (Number.isFinite(n)) tierHours[t] = n }
  return { company: { id: co.id, name: str(c.name), providerId: str(c.providerId, 128), city: str(c.city, 60) }, enabledCities, tierHours }
}

const listingRow = (id: string, e: Doc) => ({
  id, title: e.title || '', company: e.provider || '', companyId: e.companyId || '', city: e.city || '', status: e.status || 'draft',
  mainCategory: e.mainCategory ?? null, subcategory: e.subcategory ?? null,
  mode: e.mode || null, price: e.price ?? null, priceUnit: e.priceUnit ?? null,
  hasPhoto: !!e.img, missingToPublish: publishBlockers(e as Partial<Experience>),
  dashboardUrl: `https://www.palmeraexp.com/admin/companies/${e.companyId || ''}`,
})

async function loadListing(id: string) {
  const db = adminDb()
  const ref = db.collection('experiences').doc(id)
  const [snap, opts] = await Promise.all([ref.get(), ref.collection('options').get()])
  if (!snap.exists) throw new ToolError(`listing ${id} not found (call list_listings)`)
  return { ref, e: snap.data() as Doc, options: opts.docs.map((d) => ({ id: d.id, ...(d.data() as Option) })) }
}

const needScope = (key: AiKeyCtx, scope: AiScope, why: string) => {
  if (!key.scopes.includes(scope)) throw new ToolError(`this access key lacks the "${scope}" permission, which is needed to ${why}. An admin can issue a key with it at /admin/ai.`)
}

// ── listing input schema, shared by create and update ───────────────────────
const TIME = { type: 'string', pattern: '^([01]\\d|2[0-3]):[0-5]\\d$', description: '24h HH:MM, Dakar time' }
const LISTING_PROPS: Json = {
  title: { type: 'string', maxLength: 120, description: 'Name of the experience as members see it.' },
  description: { type: 'string', maxLength: 4000 },
  mainCategory: { type: 'string', enum: MAIN_CATEGORIES.map((m) => m.id), description: 'The app\'s six main categories.' },
  subcategory: { type: ['string', 'null'], description: 'A subcategory id under mainCategory (see listing_options). Omit to let the app classifier pick from the title.' },
  city: { type: 'string', description: 'Enabled market id, lowercase (see listing_options). Defaults to the company\'s city.' },
  location: { type: 'string', maxLength: 200, description: 'Neighbourhood or address line shown on the listing.' },
  mapsLink: { type: ['string', 'null'], description: 'Google Maps https link. Required before publishing.' },
  mode: { type: 'string', enum: ['paid', 'reservation'], description: 'paid = members pay in the app; reservation = free booking. Defaults from price.' },
  price: { type: ['integer', 'null'], minimum: 0, description: 'Base price in XOF, tax included. Required when paid.' },
  priceUnit: { type: 'string', enum: ['flat', 'per_person'], description: 'flat = for the whole group; per_person = multiplied by guests. Default flat.' },
  confirmationType: { type: 'string', enum: ['instant', 'provider_confirmed'], description: 'instant = confirmed on booking; provider_confirmed = the business accepts each request (default).' },
  cancellationTier: { type: 'string', enum: TIERS, description: 'Free-cancellation window: flexible 24h, moderate 48h (default), strict 3 days, firm 5 days.' },
  minGuests: { type: 'integer', minimum: 1 },
  maxGuests: { type: 'integer', minimum: 0, description: '0 = no limit. Default 10.' },
  event: { type: ['object', 'null'], description: 'For a one-time dated event. Do not combine with hours.', additionalProperties: false, required: ['date'],
    properties: { date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' }, start: TIME, end: TIME } },
  hours: { type: ['object', 'null'], description: 'Weekly bookable hours for an ongoing listing. Defaults to 09:00–18:00 every day. Not used for stays.', additionalProperties: false, required: ['open', 'close'],
    properties: { open: TIME, close: TIME,
      days: { type: 'array', items: { type: 'string', enum: [...DAYS] }, description: 'Open days. Empty or omitted = every day.' },
      byDay: { type: 'object', description: 'Per-day overrides keyed by Mon..Sun: {open, close}, or null for closed.', additionalProperties: { type: ['object', 'null'], properties: { open: TIME, close: TIME } } } } },
  checkInTime: { ...TIME, description: 'Stays only. Default 15:00.' },
  checkOutTime: { ...TIME, description: 'Stays only. Default 11:00.' },
  minNights: { type: ['integer', 'null'], minimum: 1, description: 'Stays only. Default 1.' },
  includes: { type: 'array', items: { type: 'string', maxLength: 160 }, description: 'What is included.' },
  highlights: { type: 'array', items: { type: 'string', maxLength: 160 }, description: 'Selling points, a few short lines.' },
  excludes: { type: 'array', items: { type: 'string', maxLength: 160 } },
  languages: { type: 'array', items: { type: 'string', enum: [...LISTING_LANGUAGES] } },
  dressCode: { type: ['string', 'null'], maxLength: 160 },
  optionGroups: { type: 'array', maxItems: 12, description: 'Choices and extras. A "choice" is a question the guest must answer by picking exactly one option (duration, room type), and each option can carry a price. "extras" are optional add-ons the guest may add several of. Giving this on an update REPLACES all groups and options.',
    items: { type: 'object', additionalProperties: false, required: ['name', 'kind', 'options'], properties: {
      name: { type: 'string', maxLength: 80 }, kind: { type: 'string', enum: ['choice', 'extras'] },
      options: { type: 'array', minItems: 1, maxItems: 40, items: { type: 'object', additionalProperties: false, required: ['name'], properties: {
        name: { type: 'string', maxLength: 80 }, price: { type: 'integer', minimum: 0, description: 'XOF added to the total. 0 = free.' },
        description: { type: 'string', maxLength: 300 }, maxQuantity: { type: 'integer', minimum: 1, maximum: 99 } } } } } } },
}
const pickListing = (a: Json): ListingInput => Object.fromEntries(Object.keys(LISTING_PROPS).filter((k) => k in a).map((k) => [k, a[k]])) as ListingInput

async function writeOptions(ref: FirebaseFirestore.DocumentReference, groups: { options: Option[] }[]) {
  const db = adminDb()
  const existing = await ref.collection('options').get()
  const batch = db.batch()
  existing.docs.forEach((d) => batch.delete(d.ref))
  for (const g of groups) for (const o of g.options) batch.set(ref.collection('options').doc(), o)
  await batch.commit()
}

// ── the tools ───────────────────────────────────────────────────────────────
export const TOOLS: ToolDef[] = [
  {
    name: 'overview', title: 'Palmera overview', scope: 'read',
    description: 'Headline numbers for Palmera right now: live listings by city, businesses, bookings by status, and delivered revenue this month (XOF).',
    inputSchema: { type: 'object', additionalProperties: false, properties: {} },
    annotations: { readOnlyHint: true },
    run: async () => {
      const db = adminDb()
      const [exps, cos, bks] = await Promise.all([db.collection('experiences').get(), db.collection('companies').get(), db.collection('bookings').get()])
      const live = exps.docs.filter((d) => d.data().status === 'published')
      const byCity: Record<string, number> = {}
      live.forEach((d) => { const c = String(d.data().city || 'unknown'); byCity[c] = (byCity[c] || 0) + 1 })
      const real = bks.docs.map((d) => d.data()).filter((b) => typeof b.providerId === 'string' && typeof b.bookingTotal === 'number')
      const byStatus: Record<string, number> = {}
      real.forEach((b) => { byStatus[b.status || 'unknown'] = (byStatus[b.status || 'unknown'] || 0) + 1 })
      const now = new Date(); const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
      const delivered = real.filter((b) => { const when = b.scheduledFor?.toDate?.() as Date | undefined; return when && when >= monthStart && (b.status === 'completed' || (b.status === 'confirmed' && when < now)) })
      return {
        listings: { live: live.length, drafts: exps.docs.filter((d) => d.data().status === 'draft').length, total: exps.size, liveByCity: byCity },
        businesses: cos.size,
        bookings: { total: real.length, byStatus },
        thisMonth: { deliveredBookings: delivered.length, deliveredRevenueXof: delivered.reduce((t, b) => t + (b.bookingTotal || 0), 0) },
      }
    },
  },
  {
    name: 'listing_options', title: 'Valid values for a listing', scope: 'read',
    description: 'The values a listing may use: enabled cities, the six main categories with their subcategories, cancellation tiers with their hours, languages and weekdays. Call this before create_listing if unsure of an id.',
    inputSchema: { type: 'object', additionalProperties: false, properties: {} },
    annotations: { readOnlyHint: true },
    run: async () => {
      const db = adminDb()
      const [markets, policies] = await db.getAll(db.collection('config').doc('markets'), db.collection('config').doc('policies'))
      const tiers = (policies.data()?.tiers ?? {}) as Record<string, { cancelDeadlineHours?: unknown }>
      return {
        cities: ((markets.data()?.cities ?? []) as { id: string; name: string; enabled?: boolean }[]).filter((c) => c.enabled).map((c) => ({ id: String(c.id).toLowerCase(), name: c.name })),
        categories: MAIN_CATEGORIES.map((m) => ({ id: m.id, name: m.en, subcategories: subcategoriesFor(m.id).map((s) => ({ id: s.id, name: s.en })) })),
        cancellationTiers: TIERS.map((t) => ({ id: t, freeCancellationHoursBefore: Number(tiers[t]?.cancelDeadlineHours) || null })),
        languages: LISTING_LANGUAGES, weekdays: DAYS, currency: 'XOF', timezone: 'Africa/Dakar (UTC)',
      }
    },
  },
  {
    name: 'list_companies', title: 'List businesses', scope: 'read',
    description: 'Businesses on Palmera with their id, city and how many listings they have. Use the id as companyId when creating a listing. Entries marked profileIncomplete are unfinished signups with no name; they cannot hold listings yet.',
    inputSchema: { type: 'object', additionalProperties: false, properties: { query: { type: 'string', description: 'Filter by name (contains).' }, city: { type: 'string' } } },
    annotations: { readOnlyHint: true },
    run: async (a) => {
      const db = adminDb()
      const [cos, exps] = await Promise.all([db.collection('companies').get(), db.collection('experiences').get()])
      const count: Record<string, { live: number; total: number }> = {}
      exps.docs.forEach((d) => { const e = d.data(); const k = String(e.companyId || ''); count[k] ||= { live: 0, total: 0 }; count[k].total++; if (e.status === 'published') count[k].live++ })
      const q = str(a.query).toLowerCase(), city = str(a.city).toLowerCase()
      return cos.docs.map((d) => ({ id: d.id, c: d.data() }))
        .filter(({ c }) => (!q || String(c.name || '').toLowerCase().includes(q)) && (!city || String(c.city || '').toLowerCase() === city))
        .map(({ id, c }) => ({ id, name: String(c.name || '').trim(), city: c.city || '', categories: c.categories ?? (c.category ? [c.category] : []), listings: count[id] ?? { live: 0, total: 0 }, hasLogo: !!c.logo,
          // A signup that never filled in its profile: no name, cannot hold listings yet.
          ...(String(c.name || '').trim() ? {} : { profileIncomplete: true }) }))
        .sort((x, y) => Number(!x.name) - Number(!y.name) || x.name.localeCompare(y.name))
    },
  },
  {
    name: 'list_listings', title: 'List listings', scope: 'read',
    description: 'Listings with status, price and what each still needs before it can be published. Filter by business, status, city or title.',
    inputSchema: { type: 'object', additionalProperties: false, properties: {
      companyId: { type: 'string' }, status: { type: 'string', enum: ['draft', 'published', 'unpublished', 'archived', 'pending_review'] },
      city: { type: 'string' }, query: { type: 'string', description: 'Filter by title (contains).' }, limit: { type: 'integer', minimum: 1, maximum: 200, default: 100 } } },
    annotations: { readOnlyHint: true },
    run: async (a) => {
      const snap = await adminDb().collection('experiences').get()
      const q = str(a.query).toLowerCase(), city = str(a.city).toLowerCase(), co = str(a.companyId, 128), st = str(a.status)
      const lim = Math.min(200, Math.max(1, Number(a.limit) || 100))
      const rows = snap.docs.map((d) => ({ id: d.id, e: d.data() }))
        .filter(({ e }) => (!co || e.companyId === co) && (!st || e.status === st) && (!city || String(e.city || '').toLowerCase() === city) && (!q || String(e.title || '').toLowerCase().includes(q)))
        .map(({ id, e }) => listingRow(id, e)).sort((x, y) => x.title.localeCompare(y.title))
      return { count: rows.length, listings: rows.slice(0, lim) }
    },
  },
  {
    name: 'get_listing', title: 'Get a listing', scope: 'read',
    description: 'One listing in full, in the same field names create_listing and update_listing take, plus its status and what it still needs before publishing.',
    inputSchema: { type: 'object', additionalProperties: false, required: ['listingId'], properties: { listingId: { type: 'string' } } },
    annotations: { readOnlyHint: true },
    run: async (a) => {
      const id = idArg(a.listingId, 'listingId')
      const { e, options } = await loadListing(id)
      return { ...listingRow(id, e), fields: inputFromExisting(e as Partial<Experience>, options), photos: { main: e.img || null, gallery: (e.gallery || []).length }, updatedAt: iso(e.updatedAt), createdVia: e.createdVia ?? 'dashboard' }
    },
  },
  {
    name: 'create_listing', title: 'Create a draft listing', scope: 'write',
    description: 'Create a new listing for a business. It is always saved as a DRAFT: members do not see it until someone adds photos in the dashboard and it is published. Set dryRun to true to validate and preview without saving. Prices are whole XOF. Times are Dakar time.',
    inputSchema: { type: 'object', additionalProperties: false, required: ['companyId', 'title', 'mainCategory'],
      properties: { companyId: { type: 'string', description: 'From list_companies.' }, ...LISTING_PROPS, dryRun: { type: 'boolean', description: 'Validate and return the listing that would be created, without saving.' } } },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    run: async (a, key) => {
      const companyId = idArg(a.companyId, 'companyId')
      const refs = await refsFor(companyId)
      if (!refs.company.providerId) throw new ToolError('this business has no owner account yet, so it cannot hold listings')
      if (!refs.company.name.trim()) throw new ToolError('this business has not finished its profile (it has no name yet), so it cannot hold listings. Pick another business from list_companies, or finish its profile in the dashboard first.')
      const built = buildListing(pickListing(a), refs)
      if (!built.ok) throw new ToolError(`The listing was not saved. Fix these and call again:\n- ${built.problems.join('\n- ')}`)
      const preview = { ...built.data, status: 'draft', eventDate: iso(built.data.eventDate), eventEnd: iso(built.data.eventEnd), options: (built.groups ?? []).flatMap((g) => g.options.map((o) => ({ group: g.name, name: o.name, price: o.price }))) }
      if (a.dryRun === true) return { saved: false, dryRun: true, wouldCreate: preview, stillNeededToPublish: publishBlockers({ ...built.data, img: '' }) }
      const db = adminDb()
      const ref = db.collection('experiences').doc()
      await ref.set({
        ...built.data, img: '', gallery: [], menuUrl: null, menuType: null, tag: null,
        status: 'draft', active: false, rating: 0, reviews: 0,
        needsReview: ['photos', ...(!built.data.mapsLink ? ['coords'] : [])],
        createdVia: 'ai_connector', createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
      })
      if (built.groups?.length) await writeOptions(ref, built.groups)
      await logAudit(key, 'create_listing', a, { ok: true, summary: `Created draft "${built.data.title}" for ${refs.company.name}`, targetId: ref.id })
      return { saved: true, listingId: ref.id, status: 'draft', title: built.data.title, company: refs.company.name,
        stillNeededToPublish: publishBlockers({ ...built.data, img: '' }),
        next: `Add photos and review it in the dashboard: https://www.palmeraexp.com/admin/companies/${companyId}` }
    },
  },
  {
    name: 'update_listing', title: 'Edit a listing', scope: 'write',
    description: 'Change fields on an existing listing. Send only the fields to change; everything else is kept. Sending optionGroups replaces all choices and extras. Editing a listing that is LIVE changes what members see at once and needs the publish permission. Photos cannot be changed here.',
    inputSchema: { type: 'object', additionalProperties: false, required: ['listingId'],
      properties: { listingId: { type: 'string' }, ...LISTING_PROPS, dryRun: { type: 'boolean' } } },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
    run: async (a, key) => {
      const id = idArg(a.listingId, 'listingId')
      const { ref, e, options } = await loadListing(id)
      if (e.status === 'published') needScope(key, 'publish', 'edit a listing that is live')
      if (e.status === 'archived') throw new ToolError('archived listings cannot be edited')
      const patch = pickListing(a)
      if (Object.keys(patch).length === 0) throw new ToolError('nothing to change: send at least one listing field')
      const merged: ListingInput = { ...inputFromExisting(e as Partial<Experience>, options), ...patch }
      // Switching between a dated event and weekly hours: the one given wins.
      if ('event' in patch && patch.event) merged.hours = null
      if ('hours' in patch && patch.hours) merged.event = null
      const touchesOptions = 'optionGroups' in patch
      if (!touchesOptions) delete merged.optionGroups
      const refs = await refsFor(String(e.companyId))
      const built = buildListing(merged, refs, { optionGroups: e.optionGroups ?? [], hasPaidOption: options.some((o) => (o.price || 0) > 0) })
      if (!built.ok) throw new ToolError(`Nothing was changed. Fix these and call again:\n- ${built.problems.join('\n- ')}`)
      const changed = Object.keys(patch)
      if (a.dryRun === true) return { saved: false, dryRun: true, wouldChange: changed, result: { ...built.data, eventDate: iso(built.data.eventDate), eventEnd: iso(built.data.eventEnd) } }
      // providerId / companyId are immutable anchors; status and photos are not touched here.
      const { providerId: _p, companyId: _c, ...data } = built.data; void _p; void _c
      await ref.set({ ...data, needsReview: [...(!e.img ? ['photos'] : []), ...(!data.mapsLink ? ['coords'] : [])], updatedAt: FieldValue.serverTimestamp() }, { merge: true })
      // merge:true keeps stale weekly hours when the listing became a dated event or a stay — clear them.
      if (!('availability' in data)) await ref.update({ availability: FieldValue.delete(), closedDays: FieldValue.delete() })
      if (touchesOptions) await writeOptions(ref, built.groups ?? [])
      await logAudit(key, 'update_listing', a, { ok: true, summary: `Edited ${changed.join(', ')} on "${data.title}" (${e.status})`, targetId: id })
      return { saved: true, listingId: id, status: e.status, changed, stillNeededToPublish: publishBlockers({ ...e, ...data } as Partial<Experience>) }
    },
  },
  {
    name: 'set_listing_status', title: 'Publish or unpublish a listing', scope: 'publish',
    description: 'Publish a listing (members see it in the app at once), unpublish it, or move it back to draft. Publishing is refused until the listing has a main photo, a Google Maps link, a cancellation policy and, when paid, a price. Confirm with the user before publishing.',
    inputSchema: { type: 'object', additionalProperties: false, required: ['listingId', 'status'], properties: { listingId: { type: 'string' }, status: { type: 'string', enum: ['published', 'unpublished', 'draft'] } } },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
    run: async (a, key) => {
      const id = idArg(a.listingId, 'listingId')
      const status = str(a.status)
      if (!['published', 'unpublished', 'draft'].includes(status)) throw new ToolError('status must be published, unpublished or draft')
      const { ref, e } = await loadListing(id)
      if (e.status === 'archived') throw new ToolError('archived listings cannot change status')
      if (status === 'published') {
        const missing = publishBlockers(e as Partial<Experience>)
        if (missing.length) throw new ToolError(`"${e.title}" cannot be published yet. Missing: ${missing.join(', ')}.`)
      }
      await ref.update({ status, active: status === 'published', updatedAt: FieldValue.serverTimestamp() })
      await logAudit(key, 'set_listing_status', a, { ok: true, summary: `"${e.title}": ${e.status} → ${status}`, targetId: id })
      return { saved: true, listingId: id, title: e.title, from: e.status, status }
    },
  },
  {
    name: 'get_featured', title: 'Featured tonight', scope: 'read',
    description: 'The listing featured at the top of the app in each city ("Featured tonight").',
    inputSchema: { type: 'object', additionalProperties: false, properties: {} },
    annotations: { readOnlyHint: true },
    run: async () => {
      const db = adminDb()
      const snap = await db.collection('config').doc('featured').get()
      const byCity = (snap.data()?.byCity ?? {}) as Record<string, { experienceId?: string }>
      const ids = [...new Set(Object.values(byCity).map((v) => v?.experienceId).filter(Boolean))] as string[]
      const docs = ids.length ? await db.getAll(...ids.map((i) => db.collection('experiences').doc(i))) : []
      const title = new Map(docs.map((d) => [d.id, d.exists ? `${d.data()?.title} (${d.data()?.status})` : 'deleted listing']))
      return Object.entries(byCity).map(([city, v]) => ({ city, listingId: v?.experienceId ?? null, listing: v?.experienceId ? title.get(v.experienceId) : null }))
    },
  },
  {
    name: 'set_featured', title: 'Set Featured tonight', scope: 'publish',
    description: 'Choose the listing featured at the top of the app for a city, or clear it (listingId null) so the app falls back to its own pick. The listing must be published and in that city. Members see the change at once.',
    inputSchema: { type: 'object', additionalProperties: false, required: ['city', 'listingId'], properties: { city: { type: 'string', description: 'Enabled market id, lowercase.' }, listingId: { type: ['string', 'null'] } } },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
    run: async (a, key) => {
      const db = adminDb()
      const city = str(a.city, 60).toLowerCase()
      const markets = await db.collection('config').doc('markets').get()
      const enabled = ((markets.data()?.cities ?? []) as { id: string; enabled?: boolean }[]).filter((c) => c.enabled).map((c) => String(c.id).toLowerCase())
      if (!enabled.includes(city)) throw new ToolError(`city "${city}" is not an enabled market: ${enabled.join(', ')}`)
      const ref = db.collection('config').doc('featured')
      if (a.listingId === null) {
        await ref.set({ byCity: { [city]: FieldValue.delete() }, updatedAt: FieldValue.serverTimestamp(), updatedByEmail: `ai-connector:${key.name}` }, { merge: true })
        await logAudit(key, 'set_featured', a, { ok: true, summary: `Cleared Featured tonight for ${city}` })
        return { saved: true, city, listingId: null }
      }
      const id = idArg(a.listingId, 'listingId')
      const { e } = await loadListing(id)
      if (e.status !== 'published') throw new ToolError(`"${e.title}" is ${e.status}; only a published listing can be featured`)
      if (String(e.city || '').toLowerCase() !== city) throw new ToolError(`"${e.title}" is in ${e.city}, not ${city}`)
      await ref.set({ byCity: { [city]: { experienceId: id } }, updatedAt: FieldValue.serverTimestamp(), updatedByEmail: `ai-connector:${key.name}` }, { merge: true })
      await logAudit(key, 'set_featured', a, { ok: true, summary: `Featured tonight in ${city}: "${e.title}"`, targetId: id })
      return { saved: true, city, listingId: id, title: e.title }
    },
  },
  {
    name: 'list_bookings', title: 'List bookings', scope: 'read',
    description: 'Recent bookings, newest first, with status, date, party size and total (XOF). Guests are shown by first name only.',
    inputSchema: { type: 'object', additionalProperties: false, properties: {
      status: { type: 'string', enum: ['pending', 'confirmed', 'completed', 'declined', 'cancelled', 'no_show'] }, companyId: { type: 'string' },
      limit: { type: 'integer', minimum: 1, maximum: 100, default: 25 } } },
    annotations: { readOnlyHint: true },
    run: async (a) => {
      const snap = await adminDb().collection('bookings').orderBy('createdAt', 'desc').limit(400).get()
      const st = str(a.status), co = str(a.companyId, 128)
      const lim = Math.min(100, Math.max(1, Number(a.limit) || 25))
      const rows = snap.docs.map((d) => ({ id: d.id, b: d.data() }))
        .filter(({ b }) => typeof b.providerId === 'string' && typeof b.bookingTotal === 'number' && (!st || b.status === st) && (!co || b.companyId === co))
        .slice(0, lim)
        .map(({ id, b }) => ({ id, title: b.title || '', company: b.provider || '', status: b.status, when: iso(b.scheduledFor), guests: b.guestCount ?? null,
          totalXof: b.bookingTotal, type: b.mode, paid: b.payment?.status === 'completed', guest: String(b.customerName || '').trim().split(/\s+/)[0] || null, createdAt: iso(b.createdAt) }))
      return { count: rows.length, bookings: rows }
    },
  },
]

export const toolsFor = (key: AiKeyCtx) => TOOLS.filter((t) => key.scopes.includes(t.scope))
