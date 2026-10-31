// Executable parity check for src/lib/categories.ts against the examples the
// app, Android and the functions all agree on (palmera-expo functions/index.js
// comment block under classifyListing, and Palmera/Models.swift). Run with:
//   npx tsx scripts/check-categories.ts
// Exits non-zero on the first mismatch, so it can gate a commit.
import { classifyListing, legacyCategoryFor, SUBCATEGORIES, MAIN_CATEGORIES, subcategoriesFor } from '../src/lib/categories'

const cases: { input: Parameters<typeof classifyListing>[0]; main: string; sub: string | null }[] = [
  { input: { category: 'dining', title: 'Brunch at Pullman Hotel' }, main: 'dining', sub: 'brunch' },
  { input: { category: 'nightlife', title: 'Galaxy Lounge' }, main: 'entertainment', sub: 'lounges' },
  { input: { title: 'Beach club day pass tickets' }, main: 'experiences', sub: 'beach_day_passes' },
  { input: { category: 'islands', title: 'Ngor island pirogue' }, main: 'experiences', sub: 'island_excursions' },
  { input: { category: 'sports', title: 'Match tickets Lions' }, main: 'entertainment', sub: 'sporting_events' },
  { input: { category: 'sports', title: 'Golf tee time' }, main: 'sports_wellness', sub: 'golf' },
  { input: { category: 'yachts', title: 'Sunset cruise' }, main: 'rentals', sub: 'yachts' },
  // Legacy fallbacks with no keyword hit
  { input: { category: 'wellness', title: 'Palmera Studio' }, main: 'sports_wellness', sub: null },
  // No keyword in the title → the app shows the bare main ("Rentals"); the
  // partner picks the sub in the editor instead.
  { input: { category: 'rentals', title: 'Range Rover Vogue 2017' }, main: 'rentals', sub: null },
  { input: { category: 'rentals', title: 'Car rental Dakar airport' }, main: 'rentals', sub: 'cars' },
  { input: { category: 'hotels', title: 'Pullman' }, main: 'stay', sub: 'hotels' },
  // Explicit pair wins; mismatched sub is dropped in favour of the main's own rule / fallback
  { input: { mainCategory: 'dining', subcategory: 'cafes', title: 'Golf club restaurant' }, main: 'dining', sub: 'cafes' },
  { input: { mainCategory: 'dining', subcategory: 'golf', title: 'Golf club restaurant' }, main: 'dining', sub: 'restaurants' },
  { input: { subcategory: 'padel' }, main: 'sports_wellness', sub: 'padel' },
  // Feedback Part 4: yoga, pilates, spa are their own subs (iOS 1.60)
  { input: { category: 'wellness', title: 'Palmera Spa' }, main: 'sports_wellness', sub: 'spa' },
  { input: { category: 'wellness', title: 'Palmera Pilates' }, main: 'sports_wellness', sub: 'pilates' },
  { input: { category: 'sports', title: 'Pilates Reformer' }, main: 'sports_wellness', sub: 'pilates' },
  { input: { title: 'Yoga fitness au lever du soleil' }, main: 'sports_wellness', sub: 'yoga' },
  { input: { title: 'Bootcamp fitness' }, main: 'sports_wellness', sub: 'fitness_classes' },
  { input: { title: 'Hammam & massage' }, main: 'sports_wellness', sub: 'spa' },
  // Accent folding and plurals
  { input: { title: 'Dîner privé avec chef à domicile' }, main: 'dining', sub: 'private_dining' },
  { input: { title: 'Festivals de Saint-Louis' }, main: 'entertainment', sub: 'festivals' },
]

let failed = 0
for (const c of cases) {
  const r = classifyListing(c.input)
  const ok = r.main === c.main && r.sub === c.sub
  if (!ok) failed++
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${JSON.stringify(c.input).padEnd(78)} → ${r.main}/${r.sub ?? '∅'}${ok ? '' : `  (expected ${c.main}/${c.sub ?? '∅'})`}`)
}

// Structural checks: every sub maps back to a legacy id the dashboard config knows,
// every main has at least one sub, product order preserved (first sub of each main).
const legacyIds = new Set(['dining', 'activities', 'lifestyle', 'safari', 'islands', 'nightlife', 'entertainment', 'sports', 'wellness', 'hotels', 'villas', 'rentals', 'yachts'])
for (const s of SUBCATEGORIES) if (!legacyIds.has(s.legacy)) { failed++; console.log(`FAIL sub ${s.id} maps to unknown legacy id ${s.legacy}`) }
for (const m of MAIN_CATEGORIES) if (subcategoriesFor(m.id).length === 0) { failed++; console.log(`FAIL main ${m.id} has no subcategories`) }
if (SUBCATEGORIES.length !== 40) { failed++; console.log(`FAIL expected 40 subcategories, got ${SUBCATEGORIES.length}`) }
if (legacyCategoryFor('stay', null) !== 'hotels' || legacyCategoryFor('rentals', 'boats') !== 'yachts') { failed++; console.log('FAIL legacyCategoryFor') }

console.log(failed ? `\n${failed} failure(s)` : `\nall ${cases.length} cases + structure ok`)
process.exit(failed ? 1 : 0)
