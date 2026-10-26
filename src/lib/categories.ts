// The app's category taxonomy (iOS 1.55 / Android 3.3, co-founder feedback
// part 2) and a faithful port of its classifier, so the dashboard can (a) let
// a partner file a listing under the exact main/subcategory the app shows,
// (b) preview where the app will place a listing that has no explicit pair,
// and (c) backfill existing listings with the SAME result the app computes.
//
// Source of truth for ids, labels, rule order and precedence:
//   palmera-expo  functions/index.js   CC_SUBS / CC_MAINS / CC_RULES / CC_LEGACY / classifyListing
//   palmera-expo  Palmera/Models.swift CategoryClassifier
// Keep this file in step with those; see docs/app-parity-plan-2026-10.md §A.
//
// Storage contract on experiences/{id}:
//   mainCategory  one of MAIN_CATEGORY_IDS           (optional; wins when present)
//   subcategory   one of SUBCATEGORY_IDS             (optional; implies its main)
//   category      one of the 13 legacy config ids    (KEPT — Android 3.3 places by it alone)

export const MAIN_CATEGORY_IDS = ['dining', 'experiences', 'entertainment', 'sports_wellness', 'stay', 'rentals'] as const
export type MainCategoryId = (typeof MAIN_CATEGORY_IDS)[number]

/** Product order. Labels EN / FR. */
export const MAIN_CATEGORIES: { id: MainCategoryId; en: string; fr: string }[] = [
  { id: 'dining', en: 'Dining', fr: 'Restauration' },
  { id: 'experiences', en: 'Experiences', fr: 'Expériences' },
  { id: 'entertainment', en: 'Entertainment', fr: 'Divertissement' },
  { id: 'sports_wellness', en: 'Sports & Wellness', fr: 'Sport & Bien-être' },
  { id: 'stay', en: 'Stay', fr: 'Séjours' },
  { id: 'rentals', en: 'Rentals', fr: 'Locations' },
]

/** Product order within each main. `legacy` = the config/categories id the
 *  dashboard keeps writing on `category` for this sub (inverse of the app's
 *  legacy fallback table, so Android keeps placing the listing sensibly). */
export const SUBCATEGORIES: { id: string; main: MainCategoryId; en: string; fr: string; legacy: string }[] = [
  { id: 'restaurants', main: 'dining', en: 'Restaurants', fr: 'Restaurants', legacy: 'dining' },
  { id: 'cafes', main: 'dining', en: 'Cafés', fr: 'Cafés', legacy: 'dining' },
  { id: 'brunch', main: 'dining', en: 'Brunch', fr: 'Brunch', legacy: 'dining' },
  { id: 'beach_clubs', main: 'dining', en: 'Beach clubs', fr: 'Beach clubs', legacy: 'dining' },
  { id: 'private_dining', main: 'dining', en: 'Private dining', fr: 'Dîner privé', legacy: 'dining' },
  { id: 'culinary', main: 'dining', en: 'Culinary experiences', fr: 'Expériences culinaires', legacy: 'dining' },
  { id: 'activities', main: 'experiences', en: 'Activities', fr: 'Activités', legacy: 'activities' },
  { id: 'island_excursions', main: 'experiences', en: 'Island excursions', fr: 'Excursions en île', legacy: 'islands' },
  { id: 'safaris', main: 'experiences', en: 'Safaris', fr: 'Safaris', legacy: 'safari' },
  { id: 'sightseeing', main: 'experiences', en: 'Sightseeing', fr: 'Visites', legacy: 'activities' },
  { id: 'cultural', main: 'experiences', en: 'Cultural experiences', fr: 'Expériences culturelles', legacy: 'activities' },
  { id: 'beach_day_passes', main: 'experiences', en: 'Beach club day passes', fr: 'Day pass beach club', legacy: 'activities' },
  { id: 'nightclubs', main: 'entertainment', en: 'Nightclubs', fr: 'Boîtes de nuit', legacy: 'nightlife' },
  { id: 'lounges', main: 'entertainment', en: 'Lounges', fr: 'Lounges', legacy: 'nightlife' },
  { id: 'concerts', main: 'entertainment', en: 'Concerts', fr: 'Concerts', legacy: 'entertainment' },
  { id: 'festivals', main: 'entertainment', en: 'Festivals', fr: 'Festivals', legacy: 'entertainment' },
  { id: 'sporting_events', main: 'entertainment', en: 'Sporting events', fr: 'Événements sportifs', legacy: 'entertainment' },
  { id: 'live_performances', main: 'entertainment', en: 'Live performances', fr: 'Spectacles live', legacy: 'entertainment' },
  { id: 'shows', main: 'entertainment', en: 'Shows', fr: 'Shows', legacy: 'entertainment' },
  { id: 'football_pitches', main: 'sports_wellness', en: 'Football pitches', fr: 'Terrains de foot', legacy: 'sports' },
  { id: 'golf', main: 'sports_wellness', en: 'Golf', fr: 'Golf', legacy: 'sports' },
  { id: 'gyms', main: 'sports_wellness', en: 'Gyms', fr: 'Salles de sport', legacy: 'sports' },
  { id: 'tennis', main: 'sports_wellness', en: 'Tennis', fr: 'Tennis', legacy: 'sports' },
  { id: 'padel', main: 'sports_wellness', en: 'Padel', fr: 'Padel', legacy: 'sports' },
  { id: 'fitness_classes', main: 'sports_wellness', en: 'Fitness classes', fr: 'Cours de fitness', legacy: 'sports' },
  { id: 'beauty', main: 'sports_wellness', en: 'Beauty treatments', fr: 'Soins de beauté', legacy: 'wellness' },
  { id: 'massages', main: 'sports_wellness', en: 'Massages', fr: 'Massages', legacy: 'wellness' },
  { id: 'hotels', main: 'stay', en: 'Hotels', fr: 'Hôtels', legacy: 'hotels' },
  { id: 'villas', main: 'stay', en: 'Villas', fr: 'Villas', legacy: 'villas' },
  { id: 'resorts', main: 'stay', en: 'Resorts', fr: 'Resorts', legacy: 'hotels' },
  { id: 'lodges', main: 'stay', en: 'Lodges', fr: 'Lodges', legacy: 'hotels' },
  { id: 'boutique', main: 'stay', en: 'Boutique stays', fr: 'Hébergements de charme', legacy: 'hotels' },
  { id: 'cars', main: 'rentals', en: 'Cars', fr: 'Voitures', legacy: 'rentals' },
  { id: 'yachts', main: 'rentals', en: 'Yachts', fr: 'Yachts', legacy: 'yachts' },
  { id: 'boats', main: 'rentals', en: 'Boats', fr: 'Bateaux', legacy: 'yachts' },
  { id: 'transportation', main: 'rentals', en: 'Transport', fr: 'Transport', legacy: 'rentals' },
  { id: 'equipment', main: 'rentals', en: 'Equipment rentals', fr: 'Location de matériel', legacy: 'rentals' },
]
export const SUBCATEGORY_IDS = SUBCATEGORIES.map((s) => s.id)
export type SubcategoryId = (typeof SUBCATEGORIES)[number]['id']

const SUB_BY_ID = new Map(SUBCATEGORIES.map((s) => [s.id, s]))
const MAIN_BY_ID = new Map(MAIN_CATEGORIES.map((m) => [m.id, m]))

export const isMainCategoryId = (v: unknown): v is MainCategoryId => typeof v === 'string' && MAIN_BY_ID.has(v as MainCategoryId)
export const isSubcategoryId = (v: unknown): v is SubcategoryId => typeof v === 'string' && SUB_BY_ID.has(v)

export const subcategoriesFor = (main: MainCategoryId) => SUBCATEGORIES.filter((s) => s.main === main)
export const mainOfSub = (sub: string): MainCategoryId | null => SUB_BY_ID.get(sub)?.main ?? null

/** Legacy config id to keep writing on `category` for a main/sub pair. A
 *  main with no sub falls back to the first legacy id of that main. */
export function legacyCategoryFor(main: MainCategoryId | null | undefined, sub: string | null | undefined): string {
  if (sub && SUB_BY_ID.has(sub)) return SUB_BY_ID.get(sub)!.legacy
  switch (main) {
    case 'dining': return 'dining'
    case 'experiences': return 'activities'
    case 'entertainment': return 'entertainment'
    case 'sports_wellness': return 'sports'
    case 'stay': return 'hotels'
    case 'rentals': return 'rentals'
    default: return 'activities'
  }
}

export function categoryLabel(main: MainCategoryId | null | undefined, sub: string | null | undefined, lang: 'en' | 'fr' = 'en'): string {
  const s = sub ? SUB_BY_ID.get(sub) : undefined
  if (s) return s[lang]
  const m = (main && MAIN_BY_ID.get(main)) || MAIN_BY_ID.get('experiences')!
  return m[lang]
}

// ─── Classifier (verbatim port: same rules, same order, same precedence) ───

const SPORT_WORDS = ['football', 'foot', 'soccer', 'basketball', 'basket', 'lutte',
  'wrestling', 'rugby', 'stade', 'stadium', 'sport*', 'game', 'games', 'nba', 'afcon', 'ligue 1']
const BEACH_CLUB = ['beach club*', 'beachclub*']

/** [cross, groups, sub]: every group needs one matching pattern. First match wins. */
const RULES: [boolean, string[][], string][] = [
  // Cross-main rows (product's explicit rules)
  [true, [['concert*']], 'concerts'],
  [true, [['festival*']], 'festivals'],
  [true, [['match', 'matchs']], 'sporting_events'],
  [true, [['ticket*', 'billet*'], SPORT_WORDS], 'sporting_events'],
  [true, [['day pass', 'daypass', 'pass journee', 'pass jour']], 'beach_day_passes'],
  [true, [BEACH_CLUB, ['night*', 'dj', 'djs', 'club night']], 'nightclubs'],
  [true, [BEACH_CLUB, ['party', 'parties', 'event*', 'evenement*', 'soiree*', 'fete']], 'shows'],
  [true, [BEACH_CLUB, ['brunch*']], 'brunch'],
  [true, [BEACH_CLUB, ['lunch', 'dinner', 'diner', 'dejeuner', 'restaurant*', 'reservation*', 'table']], 'beach_clubs'],
  [true, [BEACH_CLUB], 'beach_clubs'],
  [true, [['ticket*', 'billet*', 'gala', 'galas']], 'shows'],
  [true, [['yacht*']], 'yachts'],
  [true, [['island*'], ['boat*', 'excursion*', 'trip*', 'tour*', 'crossing', 'ferry',
    'pirogue*', 'catamaran*', 'chaloupe*']], 'island_excursions'],
  // Keyword rules
  [false, [['ile', 'iles']], 'island_excursions'],
  [false, [['golf*']], 'golf'],
  [false, [['football pitch*', 'pitch', 'terrain*', 'five a side', '5 a side', 'foot a 5', 'foot a cinq', 'futsal']], 'football_pitches'],
  [false, [['gym', 'salle de sport*', 'fitness center', 'fitness centre']], 'gyms'],
  [false, [['tennis']], 'tennis'],
  [false, [['padel']], 'padel'],
  [false, [['yoga', 'pilates', 'fitness', 'bootcamp', 'boot camp', 'crossfit', 'zumba', 'spinning', 'cours de sport']], 'fitness_classes'],
  [false, [['massage*']], 'massages'],
  [false, [['spa', 'beauty', 'beaute', 'facial*', 'nail*', 'manucure', 'pedicure', 'hair', 'coiffure', 'soin*', 'hammam']], 'beauty'],
  [false, [['boutique hotel*', 'guesthouse*', 'guest house*', 'maison d hote*']], 'boutique'],
  [false, [['hotel*']], 'hotels'],
  [false, [['villa']], 'villas'],
  [false, [['resort*']], 'resorts'],
  [false, [['lodge*', 'campement*', 'ecolodge*']], 'lodges'],
  [false, [['transfer*', 'chauffeur*', 'driver*', 'transport*', 'navette*', 'shuttle*']], 'transportation'],
  [false, [['car', 'car rental', 'voiture*', '4x4', 'suv']], 'cars'],
  [false, [['boat*', 'jet ski*', 'jetski*', 'bateau*', 'pirogue*', 'catamaran*']], 'boats'],
  [false, [['equipment*', 'materiel']], 'equipment'],
  [false, [['gear', 'bike*', 'kayak*', 'velo*', 'surfboard*', 'paddle*'], ['rental*', 'rent', 'hire', 'location', 'louer']], 'equipment'],
  [false, [['cafe*', 'coffee*']], 'cafes'],
  [false, [['brunch*']], 'brunch'],
  [false, [['private chef*', 'private dining', 'chef prive*', 'diner prive*', 'chef a domicile']], 'private_dining'],
  [false, [['cooking*', 'cours de cuisine', 'tasting*', 'degustation*', 'wine*', 'vin', 'vins', 'culinary', 'culinaire*']], 'culinary'],
  [false, [['nightclub*', 'night club*', 'club', 'boite*', 'discotheque*']], 'nightclubs'],
  [false, [['lounge*', 'bar', 'rooftop*', 'cocktail*']], 'lounges'],
  [false, [['safari*']], 'safaris'],
  [false, [['tour', 'city tour*', 'visit*', 'visite*', 'museum*', 'musee*', 'sightseeing']], 'sightseeing'],
  [false, [['cultur*', 'heritage*', 'patrimoine*', 'village*', 'art', 'arts']], 'cultural'],
  [false, [['restaurant*']], 'restaurants'],
]

/** The 13 legacy dashboard ids (+ aliases) → fallback [main, sub]. */
const LEGACY: Record<string, [MainCategoryId, string | null]> = {
  dining: ['dining', 'restaurants'], restaurant: ['dining', 'restaurants'], food: ['dining', 'restaurants'],
  activities: ['experiences', 'activities'], lifestyle: ['experiences', 'activities'],
  safari: ['experiences', 'safaris'],
  islands: ['experiences', 'island_excursions'], island: ['experiences', 'island_excursions'],
  nightlife: ['entertainment', 'nightclubs'],
  entertainment: ['entertainment', 'shows'],
  sports: ['sports_wellness', null],
  wellness: ['sports_wellness', null], spa: ['sports_wellness', null],
  hotels: ['stay', 'hotels'], hotel: ['stay', 'hotels'], stays: ['stay', 'hotels'], stays_hotels: ['stay', 'hotels'],
  villas: ['stay', 'villas'], villa: ['stay', 'villas'],
  rentals: ['rentals', null], rental: ['rentals', null], car: ['rentals', null],
  yachts: ['rentals', 'yachts'], yacht: ['rentals', 'yachts'], boat: ['rentals', 'yachts'],
}
/** Main ids the app recognises when written on the legacy `category` field.
 *  (dining / entertainment / rentals collide with legacy ids and take the
 *  legacy fallback — same main anyway.) */
const MAIN_ALIASES: Record<string, MainCategoryId> = {
  experiences: 'experiences', experience: 'experiences',
  sports_wellness: 'sports_wellness', 'sports-wellness': 'sports_wellness',
  sportswellness: 'sports_wellness', 'sports & wellness': 'sports_wellness',
  stay: 'stay',
}

/** Lowercase, strip accents, collapse every non letter/digit run to one space, pad. */
function fold(s: unknown): string {
  const f = String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
  return ` ${f} `
}
function matches(text: string, p: string): boolean {
  if (p.endsWith('*')) return text.includes(' ' + p.slice(0, -1))
  return text.includes(` ${p} `) || text.includes(` ${p}s `) || text.includes(` ${p}es `)
}
function firstRule(text: string, within: MainCategoryId | null, cross?: boolean): string | null {
  for (const [isCross, groups, sub] of RULES) {
    if (within && SUB_BY_ID.get(sub)!.main !== within) continue
    if (cross !== undefined && isCross !== cross) continue
    if (groups.every((g) => g.some((p) => matches(text, p)))) return sub
  }
  return null
}

export interface ClassifyInput {
  /** legacy `category` (config id) */
  category?: string | null
  mainCategory?: string | null
  subcategory?: string | null
  title?: string | null
  subtitle?: string | null
  tag?: string | null
  tags?: string[] | null
}

/** → { main, sub } with the apps' exact precedence: explicit pair, explicit
 *  sub, cross-main keyword rows, legacy type + keywords, keywords, fallback. */
export function classifyListing(input: ClassifyInput): { main: MainCategoryId; sub: string | null } {
  const norm = (v: unknown) => (typeof v === 'string' ? v.trim().toLowerCase() : '')
  const m = norm(input.mainCategory)
  const s = norm(input.subcategory)
  const explicitMain = isMainCategoryId(m) ? m : null
  const explicitSub = SUB_BY_ID.has(s) ? s : null
  const text = fold([input.title, input.subtitle, input.tag, ...(input.tags ?? [])].filter(Boolean).join(' '))
  const t = norm(input.category)
  const legacy = LEGACY[t] ?? null
  const mainId = MAIN_ALIASES[t] ?? null
  const fallback = (): [MainCategoryId, string | null] => (mainId ? [mainId, null] : legacy ?? ['experiences', 'activities'])

  if (explicitMain) {
    if (explicitSub && SUB_BY_ID.get(explicitSub)!.main === explicitMain) return { main: explicitMain, sub: explicitSub }
    const r = firstRule(text, explicitMain)
    if (r) return { main: explicitMain, sub: r }
    const fb = fallback()
    return { main: explicitMain, sub: fb[0] === explicitMain ? fb[1] : null }
  }
  if (explicitSub) return { main: SUB_BY_ID.get(explicitSub)!.main, sub: explicitSub }
  const cross = firstRule(text, null, true)
  if (cross) return { main: SUB_BY_ID.get(cross)!.main, sub: cross }
  if (!mainId && legacy) {
    const r = firstRule(text, legacy[0], false)
    return r ? { main: legacy[0], sub: r } : { main: legacy[0], sub: legacy[1] }
  }
  const r = firstRule(text, null, false)
  if (r) return { main: SUB_BY_ID.get(r)!.main, sub: r }
  return mainId ? { main: mainId, sub: null } : { main: 'experiences', sub: 'activities' }
}

// Examples the apps and functions agree on (kept as documentation; see
// scripts/check-categories.ts for the executable version):
//   { category: 'dining',    title: 'Brunch at Pullman Hotel' }        → dining / brunch
//   { category: 'nightlife', title: 'Galaxy Lounge' }                  → entertainment / lounges
//   { title: 'Beach club day pass tickets' }                           → experiences / beach_day_passes
//   { category: 'islands',   title: 'Ngor island pirogue' }            → experiences / island_excursions
//   { category: 'sports',    title: 'Match tickets Lions' }            → entertainment / sporting_events
//   { category: 'sports',    title: 'Golf tee time' }                  → sports_wellness / golf
//   { category: 'yachts',    title: 'Sunset cruise' }                  → rentals / yachts
