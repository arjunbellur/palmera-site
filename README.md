# Palmera — Next.js Site

Migrated from Webflow. Built with Next.js 14 App Router + Tailwind CSS. Deployable on Netlify (free tier).

---

## Project Structure

```
src/
  app/
    page.tsx          ← Homepage (all sections)
    layout.tsx        ← Root layout + metadata
    globals.css       ← Brand tokens, animations, base styles
    partners/
      page.tsx        ← Partner onboarding form (4-step)
      layout.tsx      ← Partners page metadata
  components/
    Navbar.tsx        ← Sticky nav, scroll-aware, mobile hamburger
    Hero.tsx          ← Full-screen video hero
    PhotoMarquee.tsx  ← Dual-row auto-scroll image gallery
    Destinations.tsx  ← Dakar / Marrakesh / Lagos cards
    Services.tsx      ← 6-service grid
    Stats.tsx         ← ∞ / 1 / 0 / 100% stats section
    AppSection.tsx    ← App download + early access CTA
    Footer.tsx        ← Logo marquee + copyright
```

---

## Local Development

```bash
npm install
npm run dev
# → http://localhost:3000
```

---

## Deploy to Netlify

### Step 1 — Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit — Palmera site"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/palmera-site.git
git push -u origin main
```

### Step 2 — Connect to Netlify

1. Go to [netlify.com](https://netlify.com) → **Add new site** → **Import an existing project**
2. Connect your GitHub account and select `palmera-site`
3. Build settings are auto-detected from `netlify.toml`:
   - **Build command:** `npm run build`
   - **Publish directory:** `.next`
4. Click **Deploy site**

Netlify will give you a URL like `https://palmera-site.netlify.app` — you'll replace this with your custom domain next.

### Step 3 — Add custom domain in Netlify

1. In your Netlify site dashboard → **Domain settings** → **Add custom domain**
2. Enter `palmeraexp.com` (or your domain)
3. Netlify will show you two DNS records to add

---

## Connect GoDaddy Domain

After adding your domain in Netlify, go to **GoDaddy DNS Management** for your domain:

### Option A — Point nameservers to Netlify (recommended)

1. In GoDaddy → **My Products** → find your domain → **DNS**
2. Change **Nameservers** to custom:
   - `dns1.p05.nsone.net`
   - `dns2.p05.nsone.net`
   - `dns3.p05.nsone.net`
   - `dns4.p05.nsone.net`
3. Save. Propagation takes up to 24 hours (usually under 2 hours)

### Option B — Keep GoDaddy DNS, add A record (alternative)

1. In GoDaddy DNS → **Add Record** → Type: **A**
   - Name: `@`
   - Value: `75.2.60.5` (Netlify's load balancer IP)
   - TTL: 1 hour
2. Add another A record for `www`:
   - Name: `www`
   - Value: `75.2.60.5`
3. In Netlify domain settings → **Force HTTPS** → enable (free SSL via Let's Encrypt)

---

## Partner Form — Connecting to a Backend

The partner form at `/partners` currently calls `handleSubmit()` which sets a success state. To wire it to a real backend, replace the handler in `src/app/partners/page.tsx`:

### Option A — Netlify Forms (zero config, free)

Add `data-netlify="true"` to a hidden form element and use Netlify's form handling. No backend needed.

### Option B — Send to a Supabase table (recommended for Palmera)

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

const handleSubmit = async () => {
  const { error } = await supabase
    .from('partner_applications')
    .insert([form])
  
  if (!error) setSubmitted(true)
}
```

### Option C — Email via Resend

```typescript
await fetch('/api/partner-apply', {
  method: 'POST',
  body: JSON.stringify(form),
})
```

Then create `src/app/api/partner-apply/route.ts` using Resend to email applications to your team.

---

## Environment Variables

Create `.env.local` for local development:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
RESEND_API_KEY=your_resend_key
```

Add these same variables in **Netlify → Site settings → Environment variables**.

---

## Brand Tokens

Defined in `tailwind.config.ts` and `globals.css`:

| Token | Value | Use |
|---|---|---|
| `--forest-deep` | `#0F2219` | Page background |
| `--forest` | `#1B3A2D` | Card / section backgrounds |
| `--gold` | `#C9A84C` | Primary accent, borders |
| `--gold-light` | `#E4C97E` | Headlines, CTAs |
| `--cream` | `#F5F0E8` | Body text |
| Raveo Display + LT Superior Serif | Google Fonts | Display headings |

---

## Pages

| Route | Description |
|---|---|
| `/` | Homepage — full site migration |
| `/partners` | Partner onboarding — 4-step application form |
