/**
 * Seeds the admin-owned config docs the dashboard + app read from.
 * Run: GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json npx tsx scripts/seed-config.ts
 * Requires a Firebase service-account key (Admin SDK bypasses security rules).
 *
 * ⚠️ Cancellation tier VALUES below are placeholders — confirm the real terms
 *    with Jordan/legal before go-live. The shape is final; the numbers are not.
 */
import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

initializeApp({ credential: applicationDefault() })
const db = getFirestore()

const markets = {
  cities: [
    { id: 'dakar', name: 'Dakar', country: 'SN', enabled: true },
    { id: 'saly', name: 'Saly', country: 'SN', enabled: true },
    // Added later by flipping enabled — no code change:
    { id: 'marrakesh', name: 'Marrakesh', country: 'MA', enabled: false },
    { id: 'lagos', name: 'Lagos', country: 'NG', enabled: false },
  ],
}

// Full taxonomy; enabled = the subset with signed partners at launch.
const ENABLED = new Set(['wellness', 'hotels', 'safari', 'rentals', 'nightlife', 'dining'])
const categories = {
  categories: [
    ['hotels', 'Hotels'], ['dining', 'Dining'], ['wellness', 'Wellness'],
    ['activities', 'Activities'], ['lifestyle', 'Lifestyle'], ['rentals', 'Rentals'],
    ['villas', 'Villas'], ['nightlife', 'Nightlife'], ['safari', 'Safari'],
    ['islands', 'Islands'], ['yachts', 'Yachts'], ['entertainment', 'Entertainment'],
    ['sports', 'Sports'],
  ].map(([id, name]) => ({ id, name, enabled: ENABLED.has(id) })),
}

const policies = {
  version: 'v1',
  tiers: {
    flexible: { cancelDeadlineHours: 24, fullRefundBeforeDeadline: true, partialRefundPct: 0, noShowPolicy: 'No refund for no-shows.', reschedulingRules: 'Free rescheduling up to 24h before.', feesRefundable: true },
    moderate: { cancelDeadlineHours: 72, fullRefundBeforeDeadline: true, partialRefundPct: 50, noShowPolicy: 'No refund for no-shows.', reschedulingRules: 'Free rescheduling up to 72h before.', feesRefundable: false },
    strict: { cancelDeadlineHours: 168, fullRefundBeforeDeadline: true, partialRefundPct: 0, noShowPolicy: 'No refund for no-shows.', reschedulingRules: 'Rescheduling at provider discretion.', feesRefundable: false },
  },
}

async function main() {
  await db.doc('config/markets').set(markets)
  await db.doc('config/categories').set(categories)
  await db.doc('config/policies').set(policies)
  console.log('✓ Seeded config/markets (dakar, saly enabled), config/categories, config/policies')
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
