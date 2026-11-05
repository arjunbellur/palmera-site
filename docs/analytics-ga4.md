# Google Analytics 4 for the site

The site (`www.palmeraexp.com`) reports to the existing GA4 property owned by
Palmera's Google account (`palmeraexp@gmail.com`, property 540560399), on two
web streams so the numbers stay separate: the **site** stream for the public
pages and the **dashboard** stream for the partner portal (`/partner`,
`/dashboard` onboarding, `/supplier`, `/door`). Every page view goes to
exactly one stream, chosen by path. The code is in place; it stays silent
until the Measurement IDs are set.

## One-time setup (as palmeraexp@gmail.com)

1. Admin (gear, bottom left) → **Data streams** in the existing property.
2. The web stream named "palmera dashboard" is the dashboard stream: copy its
   **Measurement ID** (`G-…`, top right of the stream page).
3. **Add stream** → Web, URL `https://www.palmeraexp.com`, name
   `palmera site`. Leave Enhanced measurement on (scrolls, outbound clicks
   and site search for free). Copy its Measurement ID too.
4. Vercel → palmera-site → Settings → Environment Variables, **Production**
   only: `NEXT_PUBLIC_GA_MEASUREMENT_ID` = the site ID,
   `NEXT_PUBLIC_GA_DASHBOARD_MEASUREMENT_ID` = the dashboard ID. Redeploy (or
   push anything to `main`).
5. Open https://www.palmeraexp.com in a private window, then GA4 → Reports →
   **Realtime**: one user should appear within a minute under the site
   stream. Tap a store badge: `store_click` shows under Event count. Open
   `/dashboard`: the user moves to the dashboard stream.
6. Add Jordan and Arjun under Admin → Property access management (Viewer or
   Analyst), so the property stays owned by the Palmera account.

Data retention: Admin → Data settings → Data retention → **14 months** (the
default is 2 months and loses the cohort reports).

## What is sent

| Signal | How | Where |
| --- | --- | --- |
| `page_view` on every page and client-side route change, to the stream `gaIdFor(path)` picks | `@next/third-parties` `GoogleAnalytics` loader | `src/components/Analytics.tsx`, mounted in the root layout |
| `store_click` `{ store: apple \| google, placement }` | `trackStoreClick()` on every App Store / Google Play link; placements: `badge_dark/light/glass`, `nav`, `nav_menu`, `footer`, `destinations`, `mosaic_<category>` | `src/components/AppStoreBadge.tsx`, `Navbar.tsx`, `Footer.tsx`, `Destinations.tsx`, `Services.tsx` |
| `partner_signup` | after a successful account creation | `src/lib/auth.ts` `signUp` |
| `partner_tour` `{ outcome: completed \| skipped }` | when the portal's guided tour closes | `src/app/partner/layout.tsx` |

Not loaded on `/admin/**` and `/api/**` (team activity would pollute every
report). Local and preview builds have no Measurement IDs, so they send
nothing. A visitor who goes from the public site into the portal counts as a
user in each stream — accepted, the audiences differ (public vs. partners). Add an event with `track('name', { … })` from `src/lib/ga.ts`; mark
it as a key event in GA4 (Admin → Events → toggle) if it should count as a
conversion. The services mosaic (`Services.tsx`) tiles also link to the App
Store but are not instrumented yet (file in flight elsewhere).

## Later (not this pass)

- Consent banner, if the site ever serves EU visitors in volume.
- Link the GA4 property to the Firebase project only if the app's own
  analytics should land in the same property; today the app has none.
