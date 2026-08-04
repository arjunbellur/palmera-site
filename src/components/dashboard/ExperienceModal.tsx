'use client'
// The listing editor, restructured as a guided 4-step flow. Fully bilingual —
// French first (most partners work in French); stored VALUES stay canonical
// (day keys, language names, tier ids) while display labels localize.
//
// CONTEXT THAT SHAPES THIS UI: Palmera's customer app is a GROUP booking app —
// friends book an experience together and split the cost. Two consequences:
//  1. The word "group" is reserved for the guests' party. The optionGroups data
//     structure is presented as "Add-ons & choices", never "groups".
//  2. Pricing is shown with a live example of what a party of friends pays and
//     what each person's split is, so partners see their listing the way guests
//     will experience it.
import { useEffect, useState } from 'react'
import PhotoUpload from './PhotoUpload'
import GalleryUpload from './GalleryUpload'
import { getEnabledCategories, getEnabledCities, getPolicies } from '@/lib/config'
import { useLocale } from '@/lib/use-locale'
import type { Experience, OptionGroup, Option, CancellationTier, ExperienceMode, PriceUnit, ConfirmationType, ScheduleType } from '@/lib/schema'

type Opt = { id: string; name: string }

const CANCELLATION_TIERS: CancellationTier[] = ['flexible', 'moderate', 'strict']

/** Firestore Timestamp (client or admin SDK) -> separate date/time input strings. */
function toDateTimeInputs(ts: unknown): { date: string; time: string } {
  const d = ts && typeof (ts as { toDate?: () => Date }).toDate === 'function' ? (ts as { toDate: () => Date }).toDate() : ts instanceof Date ? ts : null
  if (!d) return { date: '', time: '' }
  const pad = (n: number) => String(n).padStart(2, '0')
  return { date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, time: `${pad(d.getHours())}:${pad(d.getMinutes())}` }
}

// Stored values are canonical (English keys) — only the labels localize.
const LANGUAGES = ['French', 'English', 'Wolof', 'Arabic', 'Spanish']
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const M = {
  fr: {
    steps: [
      { title: 'Comment s’appelle votre expérience ?', sub: 'Le nom, la catégorie et la ville' },
      { title: 'Comment les clients paient-ils ?', sub: 'Gratuit ou payant, et le prix' },
      { title: 'Combien de personnes ?', sub: 'La taille de groupe que vous accueillez' },
      { title: 'Où et quand ?', sub: 'Le lieu et les disponibilités' },
      { title: 'Montrez-la', sub: 'Photos et description' },
      { title: 'Choix & extras', sub: 'Ce que les clients peuvent ajouter' },
      { title: 'Derniers détails', sub: 'Confirmation et annulation' },
      { title: 'Aperçu', sub: 'Ce que verront les clients' },
    ],
    summaryTitle: 'Que voulez-vous modifier ?',
    stepOf: (a: number, b: number) => `Étape ${a}/${b}`,
    previewNote: 'Aperçu approximatif — l’app peut différer légèrement.',
    fromLabel: 'À PARTIR DE', bookNow: 'Réserver', guestsWord: 'pers.',
    includedHint: 'Ce que le prix couvre — matériel, boissons, entrées…',
    highlightsHint: 'Vos arguments de vente — ce qui donne envie.',
    editTitle: 'Modifier l’expérience', newTitle: 'Nouvelle expérience',
    migrated: 'Migré depuis votre ancienne annonce — à compléter :',
    nr_cancel: 'politique d’annulation', nr_photos: 'photos', nr_coords: 'lien Google Maps',
    name: 'Nom de l’expérience *', namePh: 'ex. « Tour en jetski au coucher du soleil »',
    category: 'Catégorie *', city: 'Ville *', select: 'Sélectionner',
    howPay: 'Comment les clients paient-ils ?', payApp: 'Paiement dans l’app', payFree: 'Réservation gratuite',
    payAppDesc: 'Le groupe paie à la réservation et partage le total dans l’app.',
    payFreeDesc: 'Réserver une table ou une entrée, sans paiement. Les extras restent possibles.',
    perPersonDesc: 'Le prix × le nombre de personnes.',
    perGroupDesc: 'Un seul prix, quelle que soit la taille du groupe.',
    anytimeDesc: 'Réservable n’importe quel jour.',
    setDaysDesc: 'Des jours et heures fixes chaque semaine.',
    oneOffDesc: 'Une date unique — un événement.',
    instantDesc: 'Le client est confirmé immédiatement.',
    approveDesc: 'Vous acceptez ou refusez chaque demande.',
    cancelDesc: (h: number | undefined) => h != null ? `Annulation gratuite jusqu’à ${h}h avant.` : '',
    changeLater: 'Modifiable à tout moment',
    price: 'Prix (XOF) *', priceIs: 'Ce prix s’applique', perGroup: 'Au groupe entier', perPerson: 'Par personne',
    minGroup: 'Groupe minimum', maxGroup: 'Groupe maximum',
    partyHint: 'Palmera est fait pour réserver entre amis — c’est la taille de groupe que vous pouvez accueillir.',
    preview: 'Ce que les clients verront',
    previewLine: (n: number, total: string, each: string) => <>Un groupe de {n} amis paie <strong style={{ color: 'var(--db-text)' }}>{total} XOF</strong> — soit environ <strong style={{ color: 'var(--db-text)' }}>{each} XOF chacun</strong> une fois partagé dans l’app.</>,
    when: 'Quand peut-on réserver ?', anytime: 'À tout moment', setDays: 'Jours & horaires fixes', oneOff: 'Événement unique',
    daysRun: 'Jours d’ouverture', startTimes: 'Heures de début', slotsPh: 'ex. « 9h, 14h, 17h »',
    dayLabels: { Mon: 'Lun', Tue: 'Mar', Wed: 'Mer', Thu: 'Jeu', Fri: 'Ven', Sat: 'Sam', Sun: 'Dim' } as Record<string, string>,
    eventDate: 'Date de l’événement', startTime: 'Heure de début',
    where: 'Où est-ce ? (nom du lieu)', wherePh: 'ex. « Plage de Ngor »',
    duration: 'Combien de temps ça dure ?', durationPh: 'ex. « 2 heures »',
    maps: 'Lien Google Maps', needPub: '*requis pour publier',
    mapsPh: 'Collez le lien Google Maps de votre lieu',
    mapsHint: 'Dans Google Maps : trouvez votre lieu → Partager → Copier le lien, puis collez-le ici. Les clients l’utilisent pour s’y rendre.',
    pinOk: ' ✓ Position localisée.', pinPending: ' Lien enregistré — la position sera placée à partir du lien.',
    mainPhoto: 'Photo principale', photoHint: 'C’est la première photo que voient les clients — soignez-la.',
    morePhotos: 'Autres photos',
    describe: 'Décrivez-la à un client', describePh: 'Que vont-ils faire ? Qu’est-ce qui la rend spéciale ?',
    included: 'Ce qui est inclus (un par ligne)', includedPh: 'Gilets de sauvetage\nBoissons',
    notIncluded: 'Non inclus (un par ligne)', notIncludedPh: 'Transport\nRepas',
    highlights: 'Points forts (un par ligne)', dress: 'Tenue exigée (si besoin)', dressPh: 'ex. « Chic décontracté »',
    langs: 'Langues parlées par votre équipe',
    langLabels: { French: 'Français', English: 'Anglais', Wolof: 'Wolof', Arabic: 'Arabe', Spanish: 'Espagnol' } as Record<string, string>,
    whenBooks: 'Quand un groupe réserve', instant: 'Confirmé instantanément', approve: 'J’approuve chaque réservation',
    cancelPolicy: 'Politique d’annulation', confirmTier: '— à confirmer',
    tierLabels: { flexible: 'Flexible', moderate: 'Modérée', strict: 'Stricte' } as Record<string, string>,
    notesPh: 'Autre chose à savoir pour les clients (facultatif)',
    addons: 'Choix & extras',
    ao_q: 'Les clients doivent-ils choisir ou ajouter quelque chose en réservant ?',
    ao_optional: 'Facultatif — beaucoup d’expériences se réservent simplement au prix de base.',
    ao_card_choice_t: 'Un choix à faire',
    ao_card_choice_d: 'Le client doit choisir une option pour réserver — type de chambre, durée, placement.',
    ao_card_extras_t: 'Des extras',
    ao_card_extras_d: 'Le client ajoute ce qu’il veut en plus — petit-déjeuner, transfert, GoPro.',
    ao_suggest: 'Ou partez d’un exemple :',
    ao_kind_choice_d: 'Le client doit en choisir une', ao_kind_extras_d: 'Le client ajoute ce qu’il veut',
    ao_prev: 'Aperçu côté client',
    ao_prev_pickone: 'Choisissez-en une · obligatoire',
    ao_prev_optional: 'Facultatif — ajoutez ce que vous voulez',
    ao_prev_empty: 'Vos options apparaîtront ici au fur et à mesure.',
    ao_included: 'Inclus', ao_free: 'Gratuit',
    ao_optName: 'Nom de l’option', ao_optPrice: 'Prix en plus (XOF)',
    addChoiceSet: '+ Choix à faire', addExtrasSet: '+ Extras',
    kindChoice: 'Le client choisit UNE option', kindExtras: 'Extras — le client ajoute ce qu’il veut',
    setNameChoice: 'Titre du choix', setNameChoicePh: 'ex. « Type de chambre », « Placement »',
    setNameExtras: 'Titre', setNameExtrasPh: 'ex. « Extras », « À la carte »',
    remove: 'Retirer',
    optNamePhChoice: 'ex. « Vue mer »', optNamePhExtras: 'ex. « Formule boissons »',
    optPricePh: '+ Prix (XOF)',
    addOptChoice: '+ Ajouter une option', addOptExtras: '+ Ajouter un extra',
    optDescPh: 'Courte description (facultatif)', photo: 'Photo',
    toPublish: 'Pour publier, ajoutez :', blockPhoto: 'une photo', blockMaps: 'un lien Google Maps', blockCancel: 'la politique d’annulation',
    back: '← Retour', next: 'Suivant →', saveDraft: 'Enregistrer le brouillon',
    unpublish: 'Retirer de l’app', toContinue: 'Pour continuer, ajoutez :',
    fName: 'le nom', fCategory: 'la catégorie', fCity: 'la ville', fPrice: 'le prix',
    groupWarn: 'Le groupe maximum doit être supérieur ou égal au minimum.',
    addPhoto: '+ Photo', hidePhoto: 'Masquer les photos', optMax: 'Qté max',
    saving: 'Enregistrement…', keepLive: 'Enregistrer (reste en ligne)', publish: 'Publier',
  },
  en: {
    steps: [
      { title: 'What’s your experience called?', sub: 'Name, category and city' },
      { title: 'How do guests pay?', sub: 'Free or paid, and the price' },
      { title: 'How many people?', sub: 'The group size you can host' },
      { title: 'Where and when?', sub: 'Location and availability' },
      { title: 'Show it off', sub: 'Photos and description' },
      { title: 'Choices & extras', sub: 'What guests can add' },
      { title: 'Final details', sub: 'Confirmation and cancellation' },
      { title: 'Preview', sub: 'What guests will see' },
    ],
    summaryTitle: 'What do you want to edit?',
    stepOf: (a: number, b: number) => `Step ${a}/${b}`,
    previewNote: 'Approximate preview — the app may differ slightly.',
    fromLabel: 'FROM', bookNow: 'Book now', guestsWord: 'guests',
    includedHint: 'What the price covers — gear, drinks, entry…',
    highlightsHint: 'Your selling points — what makes people want it.',
    editTitle: 'Edit experience', newTitle: 'New experience',
    migrated: 'Migrated from your old listing — please finish:',
    nr_cancel: 'cancellation policy', nr_photos: 'photos', nr_coords: 'Google Maps link',
    name: 'Name of the experience *', namePh: 'e.g. "Sunset Jetski Tour"',
    category: 'Category *', city: 'City *', select: 'Select',
    howPay: 'How do guests pay?', payApp: 'Pay in the app', payFree: 'Free to reserve',
    payAppDesc: 'The group pays at booking and splits the total in the app.',
    payFreeDesc: 'Reserve a table or a spot, no payment. Extras still possible.',
    perPersonDesc: 'The price × the number of people.',
    perGroupDesc: 'One price, whatever the group size.',
    anytimeDesc: 'Bookable any day.',
    setDaysDesc: 'Fixed days and times each week.',
    oneOffDesc: 'A single date — an event.',
    instantDesc: 'The guest is confirmed immediately.',
    approveDesc: 'You accept or decline each request.',
    cancelDesc: (h: number | undefined) => h != null ? `Free cancellation up to ${h}h before.` : '',
    changeLater: 'You can change this later',
    price: 'Price (XOF) *', priceIs: 'This price is', perGroup: 'For the whole group', perPerson: 'Per person',
    minGroup: 'Smallest group', maxGroup: 'Largest group',
    partyHint: 'Palmera is built for friends booking together — this is the party size you can host.',
    preview: 'What guests will see',
    previewLine: (n: number, total: string, each: string) => <>A group of {n} friends pays <strong style={{ color: 'var(--db-text)' }}>{total} XOF</strong> — about <strong style={{ color: 'var(--db-text)' }}>{each} XOF each</strong> when they split it in the app.</>,
    when: 'When can guests book this?', anytime: 'Any time', setDays: 'Set days & times', oneOff: 'One-off event',
    daysRun: 'Days it runs', startTimes: 'Start times', slotsPh: 'e.g. "9am, 2pm, 5pm"',
    dayLabels: { Mon: 'Mon', Tue: 'Tue', Wed: 'Wed', Thu: 'Thu', Fri: 'Fri', Sat: 'Sat', Sun: 'Sun' } as Record<string, string>,
    eventDate: 'Event date', startTime: 'Start time',
    where: 'Where is it? (name of the place)', wherePh: 'e.g. "Plage de Ngor"',
    duration: 'How long does it last?', durationPh: 'e.g. "2 hours"',
    maps: 'Google Maps link', needPub: '*needed to publish',
    mapsPh: 'Paste the Google Maps link to your spot',
    mapsHint: 'In Google Maps: find your spot → Share → Copy link, and paste it here. Guests use it to navigate.',
    pinOk: ' ✓ Pin located.', pinPending: ' Link saved — the pin will be placed from it.',
    mainPhoto: 'Main photo', photoHint: 'This is the photo guests see first — make it count.',
    morePhotos: 'More photos',
    describe: 'Describe it to a guest', describePh: 'What will they do? What makes it special?',
    included: "What's included (one per line)", includedPh: 'Life jackets\nDrinks',
    notIncluded: 'Not included (one per line)', notIncludedPh: 'Transport\nMeals',
    highlights: 'Highlights (one per line)', dress: 'Dress code (if any)', dressPh: 'e.g. "Smart casual"',
    langs: 'Languages your team speaks',
    langLabels: { French: 'French', English: 'English', Wolof: 'Wolof', Arabic: 'Arabic', Spanish: 'Spanish' } as Record<string, string>,
    whenBooks: 'When a group books', instant: 'Confirmed instantly', approve: 'I approve each booking',
    cancelPolicy: 'Cancellation policy', confirmTier: '— please confirm',
    tierLabels: { flexible: 'Flexible', moderate: 'Moderate', strict: 'Strict' } as Record<string, string>,
    notesPh: 'Anything else guests should know (optional)',
    addons: 'Choices & extras',
    ao_q: 'Do guests need to choose or add anything when they book?',
    ao_optional: 'Optional — many experiences are simply booked at the base price.',
    ao_card_choice_t: 'A choice to make',
    ao_card_choice_d: 'The guest must pick one option to book — room type, duration, seating.',
    ao_card_extras_t: 'Extras',
    ao_card_extras_d: 'The guest adds whatever they like on top — breakfast, transfer, GoPro.',
    ao_suggest: 'Or start from an example:',
    ao_kind_choice_d: 'Guest must pick one', ao_kind_extras_d: 'Guest adds what they like',
    ao_prev: 'Guest preview',
    ao_prev_pickone: 'Pick one · required',
    ao_prev_optional: 'Optional — add what you like',
    ao_prev_empty: 'Your options will appear here as you type.',
    ao_included: 'Included', ao_free: 'Free',
    ao_optName: 'Option name', ao_optPrice: 'Extra price (XOF)',
    addChoiceSet: '+ A choice to make', addExtrasSet: '+ Extras',
    kindChoice: 'Guest picks ONE option', kindExtras: 'Extras — guest adds what they want',
    setNameChoice: 'What is being chosen?', setNameChoicePh: 'e.g. "Room type", "Seating"',
    setNameExtras: 'Title', setNameExtrasPh: 'e.g. "Extras", "Add-ons"',
    remove: 'Remove',
    optNamePhChoice: 'e.g. "Sea view"', optNamePhExtras: 'e.g. "Drinks package"',
    optPricePh: '+ Price (XOF)',
    addOptChoice: '+ Add an option', addOptExtras: '+ Add an extra',
    optDescPh: 'Short description (optional)', photo: 'Photo',
    toPublish: 'To publish, add:', blockPhoto: 'a photo', blockMaps: 'a Google Maps link', blockCancel: 'cancellation policy',
    back: '← Back', next: 'Next →', saveDraft: 'Save as draft',
    unpublish: 'Unpublish', toContinue: 'To continue, add:',
    fName: 'a name', fCategory: 'a category', fCity: 'a city', fPrice: 'a price',
    groupWarn: 'Largest group must be at least the smallest group.',
    addPhoto: '+ Photo', hidePhoto: 'Hide photos', optMax: 'Max qty',
    saving: 'Saving…', keepLive: 'Save & keep live', publish: 'Publish',
  },
}

/**
 * Pull coordinates out of a pasted Google Maps URL when they're present.
 * Handles the common shapes: ".../@14.71,-17.46,15z", "?q=14.71,-17.46",
 * and the place-detail "!3d14.71!4d-17.46". Short links (maps.app.goo.gl)
 * carry no coordinates client-side — those parse as null and the app side
 * resolves the link itself.
 */
function parseMapsLink(url: string): { lat: number; lng: number } | null {
  const patterns = [
    /@(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/,
    /[?&]q=(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/,
    /!3d(-?\d{1,3}\.\d+)!4d(-?\d{1,3}\.\d+)/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m) {
      const lat = parseFloat(m[1]); const lng = parseFloat(m[2])
      if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat, lng }
    }
  }
  return null
}

const inputStyle: React.CSSProperties = { width: '100%', background: 'var(--db-bg-input)', border: '1px solid var(--db-border-subtle)', borderRadius: '0.25rem', padding: '0.625rem 0.75rem', color: 'var(--db-text)', fontSize: '0.875rem', fontFamily: 'var(--font-sans)', outline: 'none', boxSizing: 'border-box' }
const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.6875rem', color: 'var(--db-text-faint)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.375rem', fontFamily: 'var(--font-sans)' }
const hintStyle: React.CSSProperties = { fontSize: '0.6875rem', color: 'var(--db-text-ghost)', fontFamily: 'var(--font-sans)', margin: '0.25rem 0 0', lineHeight: 1.5 }
const rowStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 12rem), 1fr))', gap: '1rem', marginBottom: '1rem' }

export interface ExperienceFormData extends Partial<Experience> {
  optionGroupsDraft?: (OptionGroup & { options: (Option & { _isNew?: boolean })[] })[]
}

interface ExperienceModalProps {
  providerId: string
  companyId: string
  /** Company display name — shown on the guest-card preview. */
  companyName?: string
  defaultCategory?: string
  defaultCity?: string
  experience?: Experience
  existingOptions?: Option[]
  onSave: (data: Partial<Experience>, optionGroups: (OptionGroup & { options: (Option & { _isNew?: boolean })[] })[]) => Promise<void>
  onClose: () => void
}

// Two kinds, matching how partners actually think:
//  'choice' — the guest must pick exactly one (room type, seating).
//  'extras' — optional add-ons, any number, with quantities (drinks, transfer).
// Stored as the same OptionGroup shape; kind is derived from `required`.
type SetKind = 'choice' | 'extras'
const KIND_FLAGS: Record<SetKind, Pick<OptionGroup, 'required' | 'minSelect' | 'maxSelect' | 'allowQuantity'>> = {
  choice: { required: true, minSelect: 1, maxSelect: 1, allowQuantity: false },
  extras: { required: false, minSelect: 0, maxSelect: 99, allowQuantity: true },
}
const kindOf = (g: OptionGroup): SetKind => (g.required ? 'choice' : 'extras')
const emptyGroup = (kind: SetKind): OptionGroup & { options: (Option & { _isNew?: boolean })[] } => ({
  id: `g_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
  name: '', ...KIND_FLAGS[kind], sortOrder: 0, options: [],
})
const emptyOption = (groupId: string): Option & { _isNew?: boolean } => ({
  groupId, name: '', description: '', img: null, gallery: [], price: 0, maxQuantityPerBooking: 1, active: true, sortOrder: 0, _isNew: true,
})

const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(n))

// One-tap starter examples for the Choices & extras step, keyed by category id
// (config/categories). Tapping a chip creates a correctly-kinded, pre-named set
// so partners start from a familiar example instead of a blank form. The
// parenthetical part is chip-display only — it's stripped from the set name.
const SUGGEST: Record<string, { kind: SetKind; fr: string; en: string }[]> = {
  hotels: [
    { kind: 'choice', fr: 'Type de chambre', en: 'Room type' },
    { kind: 'extras', fr: 'Extras (petit-déjeuner, spa…)', en: 'Extras (breakfast, spa…)' },
  ],
  rentals: [
    { kind: 'choice', fr: 'Durée', en: 'Duration' },
    { kind: 'choice', fr: 'Couleur', en: 'Color' },
    { kind: 'extras', fr: 'Extras (GoPro, gilet…)', en: 'Extras (GoPro, vest…)' },
  ],
  dining: [
    { kind: 'choice', fr: 'Placement', en: 'Seating' },
    { kind: 'extras', fr: 'Extras (formule boissons…)', en: 'Extras (drinks package…)' },
  ],
  wellness: [
    { kind: 'choice', fr: 'Type de soin', en: 'Treatment type' },
    { kind: 'extras', fr: 'Extras', en: 'Extras' },
  ],
  nightlife: [
    { kind: 'choice', fr: 'Type de table', en: 'Table type' },
    { kind: 'extras', fr: 'Extras (bouteilles…)', en: 'Extras (bottles…)' },
  ],
  safari: [
    { kind: 'choice', fr: 'Durée', en: 'Duration' },
    { kind: 'extras', fr: 'Extras', en: 'Extras' },
  ],
}
const SUGGEST_DEFAULT: { kind: SetKind; fr: string; en: string }[] = [
  { kind: 'choice', fr: 'Un choix (ex. durée)', en: 'A choice (e.g. duration)' },
  { kind: 'extras', fr: 'Extras', en: 'Extras' },
]

/** Airbnb-style choice cards: big tap targets that EXPLAIN each option in a
 * sentence, replacing skinny segmented pills that only named them. */
function ChoiceCards<T extends string>({ value, onChange, options }: {
  value: T | undefined
  onChange: (v: T) => void
  options: { v: T; icon: string; label: string; desc?: string }[]
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 11rem), 1fr))', gap: '0.625rem' }}>
      {options.map((o) => {
        const active = value === o.v
        return (
          <button key={o.v} onClick={() => onChange(o.v)}
            className={active ? 'pf-glass pf-glass-gold' : 'pf-glass'}
            style={{ textAlign: 'left', padding: '0.875rem 1rem', borderRadius: '0.5rem', cursor: 'pointer' }}>
            <div style={{ fontSize: '1rem', marginBottom: '0.375rem', color: active ? '#be9a56' : 'var(--db-text-faint)' }}>{o.icon}</div>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: active ? '#be9a56' : 'var(--db-text)', marginBottom: o.desc ? '0.25rem' : 0 }}>{o.label}</div>
            {o.desc && <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', color: 'var(--db-text-ghost)', lineHeight: 1.45 }}>{o.desc}</div>}
          </button>
        )
      })}
    </div>
  )
}

/** − n + stepper — counts are tapped, never typed (mobile-first). */
function Stepper({ value, min = 1, onChange }: { value: number; min?: number; onChange: (v: number) => void }) {
  const btn: React.CSSProperties = { width: '2.25rem', height: '2.25rem', borderRadius: '50%', border: '1px solid var(--db-border-gold)', background: 'transparent', color: 'var(--db-text)', fontSize: '1.125rem', cursor: 'pointer', lineHeight: 1 }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
      <button onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} style={{ ...btn, opacity: value <= min ? 0.35 : 1, cursor: value <= min ? 'default' : 'pointer' }}>−</button>
      <span style={{ fontFamily: 'var(--font-display)', color: 'var(--db-text)', fontSize: '1.25rem', minWidth: '2rem', textAlign: 'center' }}>{value}</span>
      <button onClick={() => onChange(value + 1)} style={btn}>+</button>
    </div>
  )
}

export default function ExperienceModal({ providerId, companyId, companyName, defaultCategory, defaultCity, experience, existingOptions, onSave, onClose }: ExperienceModalProps) {
  const locale = useLocale()
  const T = M[locale]
  const [categories, setCategories] = useState<Opt[]>([])
  const [cities, setCities] = useState<Opt[]>([])
  const [tierHours, setTierHours] = useState<Partial<Record<CancellationTier, number>>>({})
  const [saving, setSaving] = useState(false)
  const [step, setStep] = useState(0)
  // Airbnb pattern: the wizard walks NEW listings question by question; EDITS
  // open on a section summary that jumps straight to the right screen.
  const [view, setView] = useState<'summary' | 'steps'>(experience ? 'summary' : 'steps')
  const [photoOpen, setPhotoOpen] = useState<Record<string, boolean>>({})

  const [form, setForm] = useState<Partial<Experience>>(() => ({
    mode: 'paid', priceUnit: 'flat', currency: 'XOF', confirmationType: 'provider_confirmed',
    cancellationPolicy: { tier: 'moderate', customNotes: null, policyVersion: 'v1' },
    scheduleType: 'ongoing', schedule: null, optionGroups: [],
    title: '', location: '', category: defaultCategory || '', city: defaultCity || '',
    mapsLink: null, lat: null, lng: null, duration: '', minGuests: 1, maxGuests: 10,
    img: '', gallery: [], description: '', includes: [], highlights: [],
    languages: [], excludes: [], dressCode: null,
    ...experience,
  }))
  const [groups, setGroups] = useState<(OptionGroup & { options: (Option & { _isNew?: boolean })[] })[]>(() => {
    if (!experience?.optionGroups?.length) return []
    return experience.optionGroups.map((g) => ({ ...g, options: (existingOptions || []).filter((o) => o.groupId === g.id) }))
  })

  const [eventDateStr, setEventDateStr] = useState(() => toDateTimeInputs(experience?.eventDate).date)
  const [eventTimeStr, setEventTimeStr] = useState(() => toDateTimeInputs(experience?.eventDate).time || '19:00')
  const [timeSlotsInput, setTimeSlotsInput] = useState((experience?.schedule?.timeSlots || []).join(', '))

  useEffect(() => {
    getEnabledCategories().then(setCategories)
    getEnabledCities().then(setCities)
    getPolicies().then((p) => {
      if (!p) return
      setTierHours(Object.fromEntries(CANCELLATION_TIERS.map((t) => [t, p.tiers[t]?.cancelDeadlineHours])))
    })
  }, [])

  const set = <K extends keyof Experience>(field: K, value: Experience[K]) => setForm((p) => ({ ...p, [field]: value }))
  const setCancelTier = (tier: CancellationTier) => setForm((p) => ({ ...p, cancellationPolicy: { tier, customNotes: p.cancellationPolicy?.customNotes ?? null, policyVersion: p.cancellationPolicy?.policyVersion || 'v1' } }))
  const setSchedule = (patch: Partial<NonNullable<Experience['schedule']>>) => setForm((p) => ({ ...p, schedule: { ...(p.schedule || {}), ...patch } }))
  const toggleLanguage = (lang: string) => setForm((p) => {
    const langs = p.languages || []
    return { ...p, languages: langs.includes(lang) ? langs.filter((l) => l !== lang) : [...langs, lang] }
  })
  const toggleDay = (day: string) => {
    const days = form.schedule?.days || []
    setSchedule({ days: days.includes(day) ? days.filter((d) => d !== day) : [...days, day] })
  }
  const linesToArray = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean)

  const isPaid = form.mode === 'paid'
  const isScheduled = form.scheduleType === 'scheduled'
  const isOneTime = form.scheduleType === 'one_time'
  const canSave = !!form.title && !!form.category && !!form.city && (!isPaid || !!form.price)

  const addGroupNamed = (kind: SetKind, name: string) => setGroups((g) => {
    const ng = emptyGroup(kind)
    ng.name = name
    ng.options = [emptyOption(ng.id), emptyOption(ng.id)]
    return [...g, ng]
  })
  const setKind = (id: string, kind: SetKind) => updateGroup(id, KIND_FLAGS[kind])
  const removeGroup = (id: string) => setGroups((g) => g.filter((x) => x.id !== id))
  const updateGroup = (id: string, patch: Partial<OptionGroup>) => setGroups((g) => g.map((x) => (x.id === id ? { ...x, ...patch } : x)))
  const addOption = (groupId: string) => setGroups((g) => g.map((x) => (x.id === groupId ? { ...x, options: [...x.options, emptyOption(groupId)] } : x)))
  const removeOption = (groupId: string, idx: number) => setGroups((g) => g.map((x) => (x.id === groupId ? { ...x, options: x.options.filter((_, i) => i !== idx) } : x)))
  const updateOptionAt = (groupId: string, idx: number, patch: Partial<Option>) =>
    setGroups((g) => g.map((x) => (x.id === groupId ? { ...x, options: x.options.map((o, i) => (i === idx ? { ...o, ...patch } : o)) } : x)))

  const publishBlockers = [
    !form.img && T.blockPhoto,
    !form.mapsLink && T.blockMaps,
    !form.cancellationPolicy?.tier && T.blockCancel,
  ].filter(Boolean) as string[]
  const canPublish = canSave && publishBlockers.length === 0

  const handleSave = async (mode: 'draft' | 'publish' | 'unpublish') => {
    if (!canSave || (mode === 'publish' && !canPublish)) return
    setSaving(true)
    const optionGroups: OptionGroup[] = groups.map(({ options: _opts, ...g }) => g)
    const eventDate = isOneTime && eventDateStr
      ? (new Date(`${eventDateStr}T${eventTimeStr || '00:00'}`) as unknown as Experience['eventDate'])
      : null
    const schedule = isScheduled
      ? { ...(form.schedule || {}), timeSlots: timeSlotsInput.split(',').map((s) => s.trim()).filter(Boolean) }
      : form.schedule
    // Group size can never be inverted — clamp max up to min on save.
    const minGuests = Math.max(1, form.minGuests || 1)
    const maxGuests = Math.max(minGuests, form.maxGuests || minGuests)
    const status: Experience['status'] =
      mode === 'publish' ? 'published'
      : mode === 'unpublish' ? 'unpublished'
      : (experience?.status === 'published' ? 'published' : 'draft')
    await onSave(
      { ...form, minGuests, maxGuests, eventDate, schedule, optionGroups, providerId, companyId, status, active: status === 'published' },
      groups,
    )
    setSaving(false)
  }

  // What still blocks leaving THIS step — named, not just a dead button.
  const missingBasics = (
    step === 0 ? [!form.title && T.fName, !form.category && T.fCategory, !form.city && T.fCity]
    : step === 1 ? [isPaid && !form.price && T.fPrice]
    : []
  ).filter(Boolean) as string[]
  const groupInverted = (form.maxGuests ?? 0) < (form.minGuests ?? 1)

  const needsReview = experience?.needsReview || []

  // Live pricing example — the listing seen the way the APP works: a group of
  // friends booking together and splitting the total.
  const exampleParty = Math.min(Math.max(form.minGuests || 1, 4), form.maxGuests || 4)
  // Required choices are part of the real minimum: add each one's cheapest option.
  const requiredMin = groups.filter((g) => g.required)
    .reduce((sum, g) => sum + (g.options.length ? Math.min(...g.options.map((o) => o.price || 0)) : 0), 0)
  const exampleTotal = isPaid && form.price
    ? form.price * (form.priceUnit === 'per_person' ? exampleParty : 1) + requiredMin
    : requiredMin
  const perFriend = exampleParty > 0 ? exampleTotal / exampleParty : 0

  // ─── Step bodies ──────────────────────────────────────────────────────────
  const stepIdentity = (
    <>
      <div style={{ marginBottom: '1rem' }}>
        <label style={labelStyle}>{T.name}</label>
        <input style={inputStyle} placeholder={T.namePh} value={form.title} onChange={(e) => set('title', e.target.value)} />
      </div>

      <div style={rowStyle}>
        <div>
          <label style={labelStyle}>{T.category}</label>
          <select style={{ ...inputStyle, appearance: 'none' }} value={form.category} onChange={(e) => set('category', e.target.value)}>
            <option value="">{T.select}</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>{T.city}</label>
          <select style={{ ...inputStyle, appearance: 'none' }} value={form.city} onChange={(e) => set('city', e.target.value)}>
            <option value="">{T.select}</option>
            {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>
    </>
  )

  const stepPricing = (
    <>
      <div style={{ marginBottom: '1rem' }}>
        <label style={labelStyle}>{T.howPay}</label>
        <ChoiceCards value={form.mode} onChange={(m) => set('mode', m)} options={[
          { v: 'paid' as ExperienceMode, icon: '◆', label: T.payApp, desc: T.payAppDesc },
          { v: 'reservation' as ExperienceMode, icon: '○', label: T.payFree, desc: T.payFreeDesc },
        ]} />
      </div>

      {isPaid && (
        <div style={rowStyle}>
          <div>
            <label style={labelStyle}>{T.price}</label>
            <input style={inputStyle} type="number" value={form.price ?? ''} onChange={(e) => set('price', e.target.value ? parseInt(e.target.value) : null)} />
          </div>
          <div>
            <label style={labelStyle}>{T.priceIs}</label>
            <ChoiceCards value={form.priceUnit} onChange={(u) => set('priceUnit', u)} options={[
              { v: 'per_person' as PriceUnit, icon: '◍', label: T.perPerson, desc: T.perPersonDesc },
              { v: 'flat' as PriceUnit, icon: '◎', label: T.perGroup, desc: T.perGroupDesc },
            ]} />
          </div>
        </div>
      )}

      {/* What a group actually pays — the partner sees their pricing the way guests will. */}
      {isPaid && !!form.price && (
        <div style={{ background: 'var(--db-bg-banner)', border: '1px solid var(--db-border-gold)', borderRadius: '0.5rem', padding: '0.875rem 1rem' }}>
          <p style={{ fontSize: '0.6875rem', color: '#be9a56', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'var(--font-sans)', margin: '0 0 0.375rem' }}>{T.preview}</p>
          <p style={{ fontSize: '0.8125rem', color: 'var(--db-text-muted)', fontFamily: 'var(--font-sans)', margin: 0, lineHeight: 1.6 }}>
            {T.previewLine(exampleParty, fmt(exampleTotal), fmt(perFriend))}
          </p>
        </div>
      )}
    </>
  )

  const stepParty = (
    <>
      <div style={rowStyle}>
        <div><label style={labelStyle}>{T.minGroup}</label><Stepper value={form.minGuests || 1} onChange={(v) => set('minGuests', v)} /></div>
        <div><label style={labelStyle}>{T.maxGroup}</label><Stepper value={form.maxGuests || 1} onChange={(v) => set('maxGuests', v)} /></div>
      </div>
      <p style={{ ...hintStyle, margin: '-0.5rem 0 1rem' }}>{T.partyHint}</p>
      {groupInverted && (
        <p style={{ fontSize: '0.75rem', color: '#e07070', fontFamily: 'var(--font-sans)', margin: '-0.5rem 0 1rem' }}>{T.groupWarn}</p>
      )}
    </>
  )

  const stepWhenWhere = (
    <>
      <div style={{ marginBottom: '1rem' }}>
        <label style={labelStyle}>{T.when}</label>
        <ChoiceCards value={form.scheduleType} onChange={(a) => set('scheduleType', a)} options={[
          { v: 'ongoing' as ScheduleType, icon: '∞', label: T.anytime, desc: T.anytimeDesc },
          { v: 'scheduled' as ScheduleType, icon: '▤', label: T.setDays, desc: T.setDaysDesc },
          { v: 'one_time' as ScheduleType, icon: '✦', label: T.oneOff, desc: T.oneOffDesc },
        ]} />
      </div>

      {isScheduled && (
        <div style={{ marginBottom: '1rem' }}>
          <label style={labelStyle}>{T.daysRun}</label>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
            {DAYS.map((d) => (
              <button key={d} onClick={() => toggleDay(d)} style={{ padding: '5px 10px', borderRadius: '0.25rem', border: `1px solid ${form.schedule?.days?.includes(d) ? '#be9a56' : 'var(--db-border-subtle)'}`, background: form.schedule?.days?.includes(d) ? 'rgba(190,154,86,0.15)' : 'transparent', color: form.schedule?.days?.includes(d) ? '#be9a56' : 'var(--db-text-faint)', fontSize: '0.75rem', fontFamily: 'var(--font-sans)', cursor: 'pointer' }}>{T.dayLabels[d]}</button>
            ))}
          </div>
          <label style={labelStyle}>{T.startTimes}</label>
          <input style={inputStyle} placeholder={T.slotsPh} value={timeSlotsInput} onChange={(e) => setTimeSlotsInput(e.target.value)} />
        </div>
      )}
      {isOneTime && (
        <div style={rowStyle}>
          <div>
            <label style={labelStyle}>{T.eventDate}</label>
            <input type="date" style={inputStyle} value={eventDateStr} onChange={(e) => setEventDateStr(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>{T.startTime}</label>
            <input type="time" style={inputStyle} value={eventTimeStr} onChange={(e) => setEventTimeStr(e.target.value)} />
          </div>
        </div>
      )}

      <div style={rowStyle}>
        <div><label style={labelStyle}>{T.where}</label><input style={inputStyle} placeholder={T.wherePh} value={form.location} onChange={(e) => set('location', e.target.value)} /></div>
        <div><label style={labelStyle}>{T.duration}</label><input style={inputStyle} placeholder={T.durationPh} value={form.duration} onChange={(e) => set('duration', e.target.value)} /></div>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label style={labelStyle}>{T.maps} {!form.mapsLink && <span style={{ color: '#e07070' }}>{T.needPub}</span>}</label>
        <input style={inputStyle} type="url" placeholder={T.mapsPh}
          value={form.mapsLink || ''}
          onChange={(e) => {
            const link = e.target.value.trim() || null
            // Derive the app's map pin from the link when the URL carries
            // coordinates; short links resolve app-side, so lat/lng may stay null.
            const coords = link ? parseMapsLink(link) : null
            setForm((p) => ({ ...p, mapsLink: link, lat: coords?.lat ?? (link ? p.lat : null), lng: coords?.lng ?? (link ? p.lng : null) }))
          }} />
        <p style={hintStyle}>
          {T.mapsHint}
          {form.mapsLink && (form.lat != null ? T.pinOk : T.pinPending)}
        </p>
      </div>
    </>
  )

  const stepPhotos = (
    <>
      <div style={{ marginBottom: '1rem' }}>
        <label style={labelStyle}>{T.mainPhoto} {!form.img && <span style={{ color: '#e07070' }}>{T.needPub}</span>}</label>
        <PhotoUpload uid={providerId} label={T.mainPhoto} fieldName={`experience_${experience?.id || 'new'}_hero`} existingUrl={form.img} onUploaded={(url) => set('img', url)} hint={T.photoHint} />
      </div>
      <div style={{ marginBottom: '1.25rem' }}>
        <label style={labelStyle}>{T.morePhotos}</label>
        <GalleryUpload uid={providerId} value={form.gallery || []} onChange={(urls) => set('gallery', urls)} />
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label style={labelStyle}>{T.describe}</label>
        <textarea style={{ ...inputStyle, height: '90px', resize: 'vertical' }} placeholder={T.describePh} value={form.description} onChange={(e) => set('description', e.target.value)} />
      </div>
      <div style={rowStyle}>
        <div><label style={labelStyle}>{T.included}</label><textarea style={{ ...inputStyle, height: '80px', resize: 'vertical' }} placeholder={T.includedPh} value={(form.includes || []).join('\n')} onChange={(e) => set('includes', linesToArray(e.target.value))} /><p style={hintStyle}>{T.includedHint}</p></div>
        <div><label style={labelStyle}>{T.notIncluded}</label><textarea style={{ ...inputStyle, height: '80px', resize: 'vertical' }} placeholder={T.notIncludedPh} value={(form.excludes || []).join('\n')} onChange={(e) => set('excludes', linesToArray(e.target.value))} /></div>
      </div>
      <div style={rowStyle}>
        <div><label style={labelStyle}>{T.highlights}</label><textarea style={{ ...inputStyle, height: '70px', resize: 'vertical' }} value={(form.highlights || []).join('\n')} onChange={(e) => set('highlights', linesToArray(e.target.value))} /><p style={hintStyle}>{T.highlightsHint}</p></div>
        <div><label style={labelStyle}>{T.dress}</label><input style={inputStyle} placeholder={T.dressPh} value={form.dressCode || ''} onChange={(e) => set('dressCode', e.target.value || null)} /></div>
      </div>
      <div style={{ marginBottom: '0.5rem' }}>
        <label style={labelStyle}>{T.langs}</label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {LANGUAGES.map((lang) => (
            <button key={lang} onClick={() => toggleLanguage(lang)} style={{ padding: '6px 14px', borderRadius: '0.25rem', border: `1px solid ${form.languages?.includes(lang) ? '#be9a56' : 'var(--db-border-subtle)'}`, background: form.languages?.includes(lang) ? 'rgba(190,154,86,0.15)' : 'transparent', color: form.languages?.includes(lang) ? '#be9a56' : 'var(--db-text-faint)', fontSize: '0.8125rem', fontFamily: 'var(--font-sans)', cursor: 'pointer' }}>{T.langLabels[lang]}</button>
          ))}
        </div>
      </div>
    </>
  )

  const stepBooking = (
    <>
      <div style={{ marginBottom: '1rem' }}>
        <label style={labelStyle}>{T.whenBooks}</label>
        <ChoiceCards value={form.confirmationType} onChange={(c) => set('confirmationType', c)} options={[
          { v: 'instant' as ConfirmationType, icon: '⚡', label: T.instant, desc: T.instantDesc },
          { v: 'provider_confirmed' as ConfirmationType, icon: '✓', label: T.approve, desc: T.approveDesc },
        ]} />
      </div>

      <div style={{ marginBottom: '1.25rem' }}>
        <label style={labelStyle}>{T.cancelPolicy} {needsReview.includes('cancellationTier') && <span style={{ color: '#e07070' }}>{T.confirmTier}</span>}</label>
        <div style={{ marginBottom: '0.625rem' }}>
          <ChoiceCards value={form.cancellationPolicy?.tier} onChange={(t) => setCancelTier(t)} options={CANCELLATION_TIERS.map((t) => ({
            v: t, icon: t === 'flexible' ? '◌' : t === 'moderate' ? '◑' : '●',
            label: T.tierLabels[t], desc: T.cancelDesc(tierHours[t]),
          }))} />
        </div>
        <input style={inputStyle} placeholder={T.notesPh} value={form.cancellationPolicy?.customNotes || ''}
          onChange={(e) => setForm((p) => ({ ...p, cancellationPolicy: { tier: p.cancellationPolicy?.tier || 'moderate', customNotes: e.target.value || null, policyVersion: p.cancellationPolicy?.policyVersion || 'v1' } }))} />
      </div>
    </>
  )

  const miniLabel: React.CSSProperties = { ...labelStyle, fontSize: '0.625rem', marginBottom: '0.25rem' }
  const APP_PREV = { sheet: '#0E2233', gold: '#E9BC4F', cream: '#F3EBD8', dim: 'rgba(243,235,216,0.65)', line: 'rgba(243,235,216,0.12)' }
  const suggestions = SUGGEST[form.category || ''] || SUGGEST_DEFAULT
  const chipName = (sg: { fr: string; en: string }) => (locale === 'fr' ? sg.fr : sg.en).replace(/\s*\(.*\)$/, '')

  const addSetBtn: React.CSSProperties = { background: 'transparent', border: '1px solid var(--db-border-gold)', borderRadius: '0.25rem', color: '#be9a56', fontSize: '0.75rem', fontFamily: 'var(--font-sans)', padding: '0.3125rem 0.75rem', cursor: 'pointer' }

  const stepAddons = (
    <>
      {/* The optionGroups data — NEVER called "groups" in the UI; in this
          product, "group" means the guests' party. Question-first (Airbnb
          lens): the partner answers a plain question about their business and
          the data shape falls out of the answer. */}
      <div>
        {groups.length === 0 ? (
          <>
            <label style={{ ...labelStyle, fontSize: '0.8125rem', textTransform: 'none', letterSpacing: 0, color: 'var(--db-text)', marginBottom: '0.75rem' }}>{T.ao_q}</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 13rem), 1fr))', gap: '0.625rem', marginBottom: '1.125rem' }}>
              {([['choice', T.ao_card_choice_t, T.ao_card_choice_d, '◉'], ['extras', T.ao_card_extras_t, T.ao_card_extras_d, '✚']] as [SetKind, string, string, string][]).map(([k, ct, cd, icon]) => (
                <button key={k} onClick={() => addGroupNamed(k, '')}
                  className="pf-glass"
                  style={{ textAlign: 'left', padding: '1rem', borderRadius: '0.5rem', cursor: 'pointer' }}>
                  <div style={{ fontSize: '1.125rem', color: '#be9a56', marginBottom: '0.375rem' }}>{icon}</div>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', color: 'var(--db-text)', marginBottom: '0.25rem' }}>{ct}</div>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', color: 'var(--db-text-ghost)', lineHeight: 1.5 }}>{cd}</div>
                </button>
              ))}
            </div>
            <p style={{ ...hintStyle, margin: '0 0 0.5rem' }}>{T.ao_suggest}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.125rem' }}>
              {suggestions.map((sg) => (
                <button key={sg.fr} onClick={() => addGroupNamed(sg.kind, chipName(sg))}
                  style={{ background: 'transparent', border: '1px solid var(--db-border-gold)', borderRadius: '999px', color: '#be9a56', fontSize: '0.75rem', fontFamily: 'var(--font-sans)', padding: '0.375rem 0.875rem', cursor: 'pointer' }}>
                  {locale === 'fr' ? sg.fr : sg.en}
                </button>
              ))}
            </div>
            <p style={hintStyle}>{T.ao_optional}</p>
          </>
        ) : (
          <>
            <label style={{ ...labelStyle, marginBottom: '0.75rem' }}>{T.addons}</label>
            {groups.map((g) => {
              const kind = kindOf(g)
              return (
              <div key={g.id} className="pf-glass" style={{ borderRadius: '0.5rem', padding: '1rem', marginBottom: '0.875rem' }}>
                {/* The kind stays a visible two-card pick — same cards as the
                    empty state, same idiom as every other wizard step. Tapping
                    the other card switches; the guest preview below flips
                    instantly, so the consequence is shown, not confirmed. */}
                <div style={{ marginBottom: '0.75rem' }}>
                  <ChoiceCards value={kind} onChange={(k) => setKind(g.id, k)} options={[
                    { v: 'choice' as SetKind, icon: '◉', label: T.ao_card_choice_t, desc: T.ao_kind_choice_d },
                    { v: 'extras' as SetKind, icon: '✚', label: T.ao_card_extras_t, desc: T.ao_kind_extras_d },
                  ]} />
                </div>
                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={labelStyle}>{kind === 'choice' ? T.setNameChoice : T.setNameExtras}</label>
                  <input style={inputStyle} placeholder={kind === 'choice' ? T.setNameChoicePh : T.setNameExtrasPh} value={g.name} onChange={(e) => updateGroup(g.id, { name: e.target.value })} />
                </div>

                {g.options.map((o, i) => {
                  const optKey = o.id || `${g.id}_opt${i}`
                  return (
                  <div key={i} style={{ border: '1px solid var(--db-border-subtle)', borderRadius: '0.375rem', padding: '0.625rem', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'flex-end' }}>
                      <div style={{ flex: '2 1 9rem' }}>
                        <label style={miniLabel}>{T.ao_optName}</label>
                        <input style={inputStyle} placeholder={kind === 'choice' ? T.optNamePhChoice : T.optNamePhExtras} value={o.name} onChange={(e) => updateOptionAt(g.id, i, { name: e.target.value })} />
                      </div>
                      <div style={{ flex: '1 1 6rem' }}>
                        <label style={miniLabel}>{T.ao_optPrice}</label>
                        <input style={inputStyle} type="number" placeholder="0" value={o.price} onChange={(e) => updateOptionAt(g.id, i, { price: parseInt(e.target.value) || 0 })} />
                      </div>
                      {kind === 'extras' && (
                        <div style={{ flex: '1 1 5rem' }}>
                          <label style={miniLabel}>{T.optMax}</label>
                          <input style={inputStyle} type="number" min="1" value={o.maxQuantityPerBooking} onChange={(e) => updateOptionAt(g.id, i, { maxQuantityPerBooking: parseInt(e.target.value) || 1 })} />
                        </div>
                      )}
                      <button onClick={() => removeOption(g.id, i)} style={{ background: 'transparent', border: 'none', color: '#e07070', fontSize: '1rem', cursor: 'pointer', padding: '0 0.5rem 0.625rem' }}>×</button>
                    </div>
                    <input style={{ ...inputStyle, marginTop: '0.5rem' }} placeholder={T.optDescPh} value={o.description || ''} onChange={(e) => updateOptionAt(g.id, i, { description: e.target.value })} />
                    {/* Photos are the exception, not the rule (room types yes, drink
                        packages no) — keep them folded until asked for. */}
                    {(o.img || (o.gallery?.length ?? 0) > 0 || photoOpen[optKey]) ? (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 10rem), 1fr))', gap: '0.75rem', marginTop: '0.5rem' }}>
                        <div>
                          <label style={{ ...labelStyle, fontSize: '0.6875rem' }}>{T.photo}</label>
                          <PhotoUpload uid={providerId} label={T.photo} fieldName={`option_${optKey}_hero`} existingUrl={o.img || ''} onUploaded={(url) => updateOptionAt(g.id, i, { img: url })} />
                        </div>
                        <div>
                          <label style={{ ...labelStyle, fontSize: '0.6875rem' }}>{T.morePhotos}</label>
                          <GalleryUpload uid={providerId} value={o.gallery || []} onChange={(urls) => updateOptionAt(g.id, i, { gallery: urls })} />
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setPhotoOpen((prev) => ({ ...prev, [optKey]: true }))}
                        style={{ marginTop: '0.5rem', background: 'transparent', border: 'none', color: 'var(--db-text-faint)', fontSize: '0.75rem', fontFamily: 'var(--font-sans)', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}>
                        {T.addPhoto}
                      </button>
                    )}
                  </div>
                )})}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginTop: '0.25rem' }}>
                  <button onClick={() => addOption(g.id)} style={{ background: 'transparent', border: 'none', color: '#be9a56', fontSize: '0.75rem', fontFamily: 'var(--font-sans)', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}>{kind === 'choice' ? T.addOptChoice : T.addOptExtras}</button>
                  <button onClick={() => removeGroup(g.id)} style={{ background: 'transparent', border: 'none', color: '#e07070', fontSize: '0.6875rem', fontFamily: 'var(--font-sans)', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}>{T.remove}</button>
                </div>

                {/* Live guest mini-preview — shows exactly how the app renders
                    this set, which teaches the choice/extras model wordlessly. */}
                <div style={{ background: APP_PREV.sheet, borderRadius: '0.625rem', padding: '0.875rem 1rem', marginTop: '0.875rem' }}>
                  <div style={{ color: APP_PREV.gold, fontFamily: 'var(--font-sans)', fontSize: '0.5625rem', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>{T.ao_prev}</div>
                  <div style={{ color: APP_PREV.cream, fontFamily: 'var(--font-serif)', fontSize: '0.9375rem', fontWeight: 600 }}>{g.name || '…'}</div>
                  <div style={{ color: APP_PREV.dim, fontFamily: 'var(--font-sans)', fontSize: '0.625rem', margin: '0.125rem 0 0.5rem' }}>{kind === 'choice' ? T.ao_prev_pickone : T.ao_prev_optional}</div>
                  {g.options.every((o) => !o.name) ? (
                    <div style={{ color: APP_PREV.dim, fontSize: '0.6875rem', fontFamily: 'var(--font-sans)', fontStyle: 'italic' }}>{T.ao_prev_empty}</div>
                  ) : g.options.filter((o) => o.name).map((o, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', padding: '0.4375rem 0', borderTop: i > 0 ? `1px solid ${APP_PREV.line}` : 'none' }}>
                      <span style={{ color: APP_PREV.cream, fontFamily: 'var(--font-sans)', fontSize: '0.75rem' }}>
                        <span style={{ color: APP_PREV.gold, marginRight: '0.5rem' }}>{kind === 'choice' ? (i === 0 ? '●' : '○') : '＋'}</span>
                        {o.name}
                      </span>
                      <span style={{ color: APP_PREV.gold, fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', whiteSpace: 'nowrap' }}>
                        {o.price ? `+ ${fmt(o.price)} XOF` : (kind === 'choice' ? T.ao_included : T.ao_free)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )})}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button onClick={() => addGroupNamed('choice', '')} style={addSetBtn}>{T.addChoiceSet}</button>
              <button onClick={() => addGroupNamed('extras', '')} style={addSetBtn}>{T.addExtrasSet}</button>
            </div>
          </>
        )}
      </div>
    </>
  )

  // ─── Guest-card preview — matched to the real app listing screen (navy
  // sheet, gold pin eyebrow, serif cream title, provider chip, FROM bar). ───
  const stepPreview = (() => {
    const APP = { sheet: '#0E2233', chip: '#16324a', gold: '#E9BC4F', goldDeep: '#D9A62E', cream: '#F3EBD8', dim: 'rgba(243,235,216,0.65)' }
    return (
      <div>
        <div style={{ maxWidth: '23rem', margin: '0 auto', borderRadius: '1.25rem', overflow: 'hidden', border: '1px solid var(--db-border-subtle)', background: APP.sheet }}>
          <div style={{ height: '11rem', background: form.img ? `center/cover url(${form.img})` : '#1a2f44', display: 'grid', placeItems: 'center' }}>
            {!form.img && <span style={{ color: APP.dim, fontFamily: 'var(--font-sans)', fontSize: '0.75rem' }}>{T.mainPhoto}</span>}
          </div>
          <div style={{ padding: '1.125rem 1.25rem 0' }}>
            {form.location && (
              <div style={{ color: APP.gold, fontFamily: 'var(--font-sans)', fontSize: '0.625rem', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>⚲ {form.location} ↗</div>
            )}
            <div style={{ color: APP.cream, fontFamily: 'var(--font-serif)', fontSize: '1.5rem', fontWeight: 600, lineHeight: 1.15, marginBottom: '0.5rem' }}>{form.title || '…'}</div>
            <div style={{ color: APP.dim, fontFamily: 'var(--font-sans)', fontSize: '0.75rem', marginBottom: '0.875rem' }}>
              <span style={{ color: APP.gold }}>★</span> 0.00 (0) · ◍ {form.minGuests}–{form.maxGuests} {T.guestsWord}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', background: APP.chip, borderRadius: '0.875rem', padding: '0.75rem 0.875rem', marginBottom: '0.875rem' }}>
              <span style={{ width: '2rem', height: '2rem', borderRadius: '50%', background: APP.gold, color: '#132638', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-serif)', fontWeight: 700 }}>{(companyName || 'P').charAt(0).toUpperCase()}</span>
              <span style={{ color: APP.cream, fontFamily: 'var(--font-sans)', fontSize: '0.8125rem' }}>{companyName || '—'} <span style={{ color: APP.gold }}>✓</span></span>
            </div>
            {form.description && (
              <>
                <div style={{ color: APP.gold, fontFamily: 'var(--font-sans)', fontSize: '0.625rem', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '0.375rem' }}>The Experience</div>
                <p style={{ color: APP.dim, fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', lineHeight: 1.6, margin: 0, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{form.description}</p>
              </>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', margin: '1rem', padding: '0.75rem 1rem', background: APP.chip, borderRadius: '1rem' }}>
            <div>
              <div style={{ color: APP.dim, fontFamily: 'var(--font-sans)', fontSize: '0.5625rem', letterSpacing: '0.12em' }}>{T.fromLabel}</div>
              <div style={{ color: APP.cream, fontFamily: 'var(--font-serif)', fontSize: '1.25rem', fontWeight: 600 }}>{fmt(isPaid ? (form.price || 0) : 0)} XOF</div>
            </div>
            <div style={{ background: APP.gold, color: '#132638', borderRadius: '999px', padding: '0.625rem 1.375rem', fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', fontWeight: 600 }}>{T.bookNow}</div>
          </div>
        </div>
        <p style={{ ...hintStyle, textAlign: 'center', marginTop: '0.875rem' }}>{T.previewNote}</p>
      </div>
    )
  })()

  const stepBodies = [stepIdentity, stepPricing, stepParty, stepWhenWhere, stepPhotos, stepAddons, stepBooking, stepPreview]
  const isLast = step === T.steps.length - 1
  // Each step gates only on ITS OWN required fields.
  const stepValid = (i: number) =>
    i === 0 ? !!form.title && !!form.category && !!form.city
    : i === 1 ? (!isPaid || !!form.price)
    : true
  const canNext = stepValid(step)

  return (
    <div data-lenis-prevent style={{ position: 'fixed', inset: 0, background: 'var(--db-overlay)', zIndex: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: 'var(--db-bg-modal)', border: '1px solid var(--db-border-subtle)', borderRadius: '0.75rem', width: '100%', maxWidth: '46rem', maxHeight: 'calc(100vh - 40px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div data-lenis-prevent style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 'clamp(1.25rem, 4vw, 2rem)', paddingBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--db-text)', fontSize: '1.25rem', fontWeight: 400, margin: '0 0 0.25rem', letterSpacing: '0.06em' }}>
              {experience ? T.editTitle : T.newTitle}
            </h2>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--db-text-faint)', margin: 0 }}>
              {view === 'summary' ? T.summaryTitle : <>{T.stepOf(step + 1, T.steps.length)} · {T.steps[step].title} — {T.steps[step].sub}</>}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--db-text-faint)', fontSize: '1.375rem', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        {/* Step indicator — labeled and tappable once the basics are valid. */}
        {view === 'steps' && (
          <div style={{ display: 'flex', gap: '6px', marginBottom: '1.5rem' }}>
            {T.steps.map((st, i) => (
              <button key={st.title} onClick={() => (i === 0 || canSave) && setStep(i)} title={st.title}
                style={{ flex: 1, height: '3px', borderRadius: '2px', border: 'none', padding: 0, cursor: 'pointer', background: i === step ? '#be9a56' : i < step ? 'rgba(190,154,86,0.45)' : 'var(--db-border-subtle)' }} />
            ))}
          </div>
        )}

        {needsReview.length > 0 && step === 0 && (
          <div style={{ background: 'rgba(224,112,112,0.08)', border: '1px solid rgba(224,112,112,0.3)', borderRadius: '0.375rem', padding: '0.75rem 1rem', marginBottom: '1.25rem' }}>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: '#e07070', margin: 0 }}>
              {T.migrated} {needsReview.map((n) => n === 'cancellationTier' ? T.nr_cancel : n === 'photos' ? T.nr_photos : n === 'coords' ? T.nr_coords : n).join(', ')}.
            </p>
          </div>
        )}

        {view === 'summary' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {T.steps.map((st, i) => {
              const summary =
                i === 0 ? [form.title, form.category, form.city].filter(Boolean).join(' · ')
                : i === 1 ? (isPaid ? `${fmt(form.price || 0)} XOF` : T.payFree)
                : i === 2 ? `${form.minGuests}–${form.maxGuests}`
                : i === 3 ? [form.location, form.scheduleType === 'ongoing' ? T.anytime : form.scheduleType === 'scheduled' ? T.setDays : T.oneOff].filter(Boolean).join(' · ')
                : i === 4 ? `${form.img ? '📷 ' : ''}${(form.gallery?.length || 0) + (form.img ? 1 : 0)} photo(s)`
                : i === 5 ? `${groups.length} ${T.addons.toLowerCase()}`
                : i === 6 ? `${form.confirmationType === 'instant' ? T.instant : T.approve} · ${T.tierLabels[form.cancellationPolicy?.tier || 'moderate']}`
                : T.steps[7].sub
              return (
                <button key={st.title} onClick={() => { setStep(i); setView('steps') }}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.875rem', textAlign: 'left', padding: '0.875rem 1rem', borderRadius: '0.5rem', border: '1px solid var(--db-border-subtle)', background: 'var(--db-bg-card)', cursor: 'pointer' }}>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--db-text)' }}>{st.title}</span>
                    <span style={{ display: 'block', fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', color: 'var(--db-text-ghost)', marginTop: '0.125rem', textTransform: 'capitalize', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{summary || '—'}</span>
                  </span>
                  <span style={{ color: '#be9a56', flexShrink: 0 }}>›</span>
                </button>
              )
            })}
          </div>
        ) : stepBodies[step]}
      </div>

      {/* Footer: ALWAYS visible (Airbnb-style fixed band) — navigation must
          never scroll away on a long step. */}
      <div style={{ flexShrink: 0, borderTop: '1px solid var(--db-border-subtle)', padding: '0.875rem clamp(1.25rem, 4vw, 2rem)', background: 'var(--db-bg-modal)' }}>
        {isLast && !canPublish && canSave && (
          <p style={{ fontSize: '0.75rem', color: 'var(--db-text-faint)', fontFamily: 'var(--font-sans)', margin: '0 0 0.625rem', textAlign: 'right' }}>
            {T.toPublish} {publishBlockers.join(', ')}
          </p>
        )}
        {view === 'steps' && missingBasics.length > 0 && (
          <p style={{ fontSize: '0.75rem', color: 'var(--db-text-faint)', fontFamily: 'var(--font-sans)', margin: '0 0 0.625rem', textAlign: 'right' }}>
            {T.toContinue} {missingBasics.join(', ')}
          </p>
        )}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
            {view === 'steps' && experience && (
              <button onClick={() => setView('summary')} style={{ padding: '10px 20px', background: 'transparent', border: '1px solid var(--db-border-subtle)', borderRadius: '0.25rem', color: 'var(--db-text-muted)', fontSize: '0.875rem', fontFamily: 'var(--font-sans)', cursor: 'pointer' }}>{T.back}</button>
            )}
            {view === 'steps' && !experience && step > 0 && (
              <button onClick={() => setStep(step - 1)} style={{ padding: '10px 20px', background: 'transparent', border: '1px solid var(--db-border-subtle)', borderRadius: '0.25rem', color: 'var(--db-text-muted)', fontSize: '0.875rem', fontFamily: 'var(--font-sans)', cursor: 'pointer' }}>{T.back}</button>
            )}
            {/* Airbnb-style reassurance: nothing here is a commitment. */}
            <span style={{ fontSize: '0.6875rem', color: 'var(--db-text-ghost)', fontFamily: 'var(--font-sans)' }}>{T.changeLater}</span>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {experience?.status === 'published' && (
              <button onClick={() => handleSave('unpublish')} disabled={saving}
                style={{ padding: '10px 16px', background: 'transparent', border: '1px solid rgba(224,112,112,0.4)', borderRadius: '0.25rem', color: '#e07070', fontSize: '0.875rem', fontFamily: 'var(--font-sans)', cursor: 'pointer' }}>
                {T.unpublish}
              </button>
            )}
            <button onClick={() => handleSave('draft')} disabled={!canSave || saving} style={{ padding: '10px 20px', background: 'transparent', border: '1px solid var(--db-border-gold)', borderRadius: '0.25rem', color: canSave ? 'var(--db-text)' : 'var(--db-text-ghost)', fontSize: '0.875rem', fontFamily: 'var(--font-sans)', cursor: canSave ? 'pointer' : 'not-allowed' }}>
              {saving ? T.saving : T.saveDraft}
            </button>
            {/* Wizard walks Next→…→Publish; edit/summary saves directly. */}
            {!experience && view === 'steps' && !isLast ? (
              <button onClick={() => canNext && setStep(step + 1)} disabled={!canNext} style={{ padding: '10px 24px', background: canNext ? '#9e763b' : 'var(--db-bg-card)', border: 'none', borderRadius: '0.25rem', color: canNext ? '#ebe8db' : 'var(--db-text-ghost)', fontSize: '0.875rem', fontFamily: 'var(--font-sans)', cursor: canNext ? 'pointer' : 'not-allowed' }}>
                {T.next}
              </button>
            ) : (
              <button onClick={() => handleSave('publish')} disabled={!canPublish || saving} title={canPublish ? '' : publishBlockers.join(', ')} style={{ padding: '10px 24px', background: canPublish ? '#9e763b' : 'var(--db-bg-card)', border: 'none', borderRadius: '0.25rem', color: canPublish ? '#ebe8db' : 'var(--db-text-ghost)', fontSize: '0.875rem', fontFamily: 'var(--font-sans)', cursor: canPublish ? 'pointer' : 'not-allowed' }}>
                {saving ? T.saving : experience?.status === 'published' ? T.keepLive : T.publish}
              </button>
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}
