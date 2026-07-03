# Palmera — Website & Partner Dashboard

Palmera is an experiences marketplace for African cities (Dakar, Marrakesh, Lagos). This repo is a single **Next.js 16 (App Router)** app that contains two things:

1. **The public marketing site** (`/`) — a scroll-driven, animated landing page (migrated from Webflow).
2. **The partner onboarding dashboard** (`/dashboard`) — a Firebase-auth-gated portal where experience providers onboard, add listings, upload media, and sign off on terms.

Built with Next.js 16, React 18, TypeScript, and Tailwind CSS. Deployable on Vercel or Netlify.

---

## Tech Stack

| Concern | Tool |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript + React 18 |
| Styling | Tailwind CSS 3 + CSS custom properties |
| Auth & database | Firebase Auth + Cloud Firestore |
| Media (video/images) | Cloudinary |
| Animation | GSAP + Lenis (smooth scroll) |
| i18n | next-intl (French default, English secondary) |
| Hosting | Vercel or Netlify |

---

## Project Structure

```
src/
  app/
    page.tsx              ← Homepage (assembles all marketing sections)
    layout.tsx            ← Root layout + metadata
    globals.css           ← Brand tokens, animations, base styles
    partners/
      page.tsx            ← Public 4-step partner application form
    dashboard/
      page.tsx            ← Login / signup (Firebase Auth)
      layout.tsx          ← Auth gate + sidebar nav + theme provider
      home/               ← Onboarding overview + progress
      profile/            ← Business profile + payout details
      listings/           ← Experience listings (CRUD)
      photos/             ← Media upload (Cloudinary)
      operations/         ← Booking / confirmation preferences
      documents/          ← Legal document upload
      settings/           ← Terms & sign-off
      admin/              ← Admin: all partners + per-partner review
  components/
    Navbar.tsx / NavbarWrapper.tsx   ← Sticky, scroll-aware nav
    Hero.tsx              ← Full-screen Cloudinary video hero
    BaseSection.tsx       ← Intro / phrases section
    Destinations.tsx      ← Dakar / Marrakesh / Lagos cards
    Services.tsx          ← Service grid
    Stats.tsx             ← Stats section
    AppSection.tsx        ← App download + early-access CTA
    Footer.tsx            ← Logo marquee + copyright
    dashboard/            ← DashboardNav, SectionCard, ListingModal, PhotoUpload
  lib/
    firebase.ts           ← Firebase app init
    auth.ts               ← signUp / signIn / logOut / onAuthChange
    firestore.ts          ← Partner + listing data access
    theme.tsx             ← Dashboard theme provider
    scroll-bus.ts, use-viewport.ts
messages/
  fr.json, en.json        ← Marketing-site translations
middleware.ts             ← Sets default locale cookie (fr)
firestore.rules           ← Firestore security rules
```

---

## Local Development

```bash
npm install
npm run dev
# → http://localhost:3000
```

Create `.env.local` with your Firebase config (see [Environment Variables](#environment-variables)).

---

## Data Model (Firestore)

- **`partners/{uid}`** — one document per partner account, created on signup. Holds profile fields plus a `sections` status map (`incomplete` / `in_progress` / `complete`) that drives the onboarding progress UI:
  `basics`, `payouts`, `listings`, `photos`, `operations`, `documents`, `signoff`.
- **`partners/{uid}/listings/{listingId}`** — subcollection of experiences the partner offers (pricing, availability, guest limits, inclusions, etc. — see the `Listing` type in `src/lib/firestore.ts`).

Security rules (`firestore.rules`): a partner can read/write only their own document and listings; **admins** (allow-listed by email) can read everyone's.

### Admin access

Admin is gated by a hard-coded email allow-list in **two** places that must stay in sync:
- `firestore.rules` (`isAdmin()`)
- `src/app/dashboard/layout.tsx` (`ADMIN_EMAILS`)

Admin users are redirected to `/dashboard/admin` on login.

---

## Internationalization

- Powered by **next-intl**. French (`fr`) is the default; English (`en`) is secondary.
- `middleware.ts` sets a `locale` cookie (defaulting to `fr`) for visitors without one.
- Marketing-site copy lives in `messages/fr.json` and `messages/en.json`.
- Dashboard strings are currently inline translation maps within each dashboard file (not in `messages/`).

---

## Media (Cloudinary)

The hero video and partner photos are served from Cloudinary (cloud name `dgthehvgs`).

Hero delivery uses Cloudinary transformations for performance and reliable mobile autoplay:
- `f_auto,q_auto,w_1280` — auto-format/quality + width cap (keeps the file small so iOS Safari autoplays it and it starts fast on cellular).
- `so_0,...jpg` — first video frame used as the `poster` image.

See `src/components/Hero.tsx`.

---

## Environment Variables

Create `.env.local` for local development and set the same values in your host's
environment settings (Vercel / Netlify):

```env
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

> Check `src/lib/firebase.ts` for the exact variable names the app reads.

---

## Deployment

The app deploys as a standard Next.js App Router project.

- **Vercel** — import the repo; framework preset auto-detected. Add the environment
  variables above in **Project → Settings → Environment Variables**.
- **Netlify** — build settings are read from `netlify.toml`. Add the same environment
  variables in **Site settings → Environment variables**.

After deploying, remember to:
1. Deploy the Firestore rules (`firestore.rules`) to your Firebase project.
2. Add your production domain to Firebase Auth **Authorized domains**.

---

## Brand Tokens

Defined in `tailwind.config.ts` and `globals.css`. The marketing site uses the
`--forest*` / `--gold*` / `--cream` palette; the dashboard uses a separate set of
`--db-*` variables via the theme provider in `src/lib/theme.tsx`.

| Token | Value | Use |
|---|---|---|
| `--forest-deep` | `#0F2219` | Page background |
| `--forest` | `#1B3A2D` | Card / section backgrounds |
| `--gold` | `#C9A84C` | Primary accent, borders |
| `--gold-light` | `#E4C97E` | Headlines, CTAs |
| `--cream` | `#F5F0E8` | Body text |

---

## Routes

| Route | Description |
|---|---|
| `/` | Homepage — full marketing site |
| `/partners` | Public partner application form (4-step) |
| `/dashboard` | Partner login / signup |
| `/dashboard/home` | Onboarding overview + progress |
| `/dashboard/{profile,listings,photos,operations,documents,settings}` | Onboarding sections |
| `/dashboard/admin` | Admin — partner review (allow-listed emails only) |
