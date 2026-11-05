# Google Analytics 4 for the site

The site (`www.palmeraexp.com`: public pages + the partner portal) reports to
one GA4 property owned by Palmera's Google account (`palmeraexp@gmail.com`).
The code is in place; it stays silent until the Measurement ID is set.

## One-time setup (as palmeraexp@gmail.com)

1. Sign in to https://analytics.google.com as palmeraexp@gmail.com.
2. Admin (gear, bottom left) → **Create** → **Property**. Name: `Palmera
   website`. Time zone: Senegal (GMT). Currency: XOF (West African CFA franc).
3. Business details: Travel, small. Objectives: whatever is offered; they only
   pick the default reports.
4. **Data stream** → Web. URL `https://www.palmeraexp.com`, stream name
   `palmeraexp.com`. Leave Enhanced measurement on (it adds scrolls, outbound
   clicks and site search for free).
5. Copy the **Measurement ID** (`G-XXXXXXXXXX`) from the stream page.
6. Vercel → palmera-site → Settings → Environment Variables → add
   `NEXT_PUBLIC_GA_MEASUREMENT_ID` = that ID, **Production** only. Redeploy
   (or push anything to `main`).
7. Open https://www.palmeraexp.com in a private window, then GA4 → Reports →
   **Realtime**: one user should appear within a minute. Tap a store badge:
   `store_click` shows under Event count.
8. Add Jordan and Arjun under Admin → Property access management (Viewer or
   Analyst), so the property stays owned by the Palmera account.

Data retention: Admin → Data settings → Data retention → **14 months** (the
default is 2 months and loses the cohort reports).

## What is sent

| Signal | How | Where |
| --- | --- | --- |
| `page_view` on every page and client-side route change | `@next/third-parties` `GoogleAnalytics` loader | `src/components/Analytics.tsx`, mounted in the root layout |
| `store_click` `{ store: apple \| google, placement }` | `trackStoreClick()` on every App Store / Google Play link; placements: `badge_dark/light/glass`, `nav`, `nav_menu`, `footer`, `destinations`, `mosaic_<category>` | `src/components/AppStoreBadge.tsx`, `Navbar.tsx`, `Footer.tsx`, `Destinations.tsx`, `Services.tsx` |
| `partner_signup` | after a successful account creation | `src/lib/auth.ts` `signUp` |
| `partner_tour` `{ outcome: completed \| skipped }` | when the portal's guided tour closes | `src/app/partner/layout.tsx` |

Not loaded on `/admin/**` and `/api/**` (team activity would pollute every
report). Local and preview builds have no Measurement ID, so they send
nothing. Add an event with `track('name', { … })` from `src/lib/ga.ts`; mark
it as a key event in GA4 (Admin → Events → toggle) if it should count as a
conversion. The services mosaic (`Services.tsx`) tiles also link to the App
Store but are not instrumented yet (file in flight elsewhere).

## Later (not this pass)

- Consent banner, if the site ever serves EU visitors in volume.
- Link the GA4 property to the Firebase project only if the app's own
  analytics should land in the same property; today the app has none.
