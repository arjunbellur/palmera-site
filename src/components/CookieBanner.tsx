'use client'
// Cookie banner: shows once (or again when the policy version changes),
// records Accept / Essential only, and links to the Cookie Policy. Language
// follows the `locale` cookie the site and the portal both set; French by
// default. Not shown on the admin surface (team only, nothing to consent to:
// no analytics load there).
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CONSENT_EVENT, readConsent, writeConsent } from '@/lib/consent'

const COPY = {
  fr: {
    eyebrow: 'Cookies', title: 'Un cookie pour mieux vous servir',
    body: 'Nous utilisons des cookies essentiels pour que le site fonctionne (connexion, langue) et, si vous l’acceptez, Google Analytics pour comprendre comment le site est utilisé et l’améliorer. Aucune publicité.',
    accept: 'Accepter', essential: 'Essentiels seulement', policy: 'Politique relative aux cookies', aria: 'Choix des cookies',
  },
  en: {
    eyebrow: 'Cookies', title: 'A cookie, to serve you better',
    body: 'We use essential cookies so the site works (sign-in, language) and, if you accept, Google Analytics to understand how the site is used and improve it. No advertising.',
    accept: 'Accept', essential: 'Essential only', policy: 'Cookie policy', aria: 'Cookie choices',
  },
} as const

export default function CookieBanner() {
  const pathname = usePathname() || '/'
  const [open, setOpen] = useState(false)
  const [lang, setLang] = useState<'fr' | 'en'>('fr')
  const [narrow, setNarrow] = useState(false)

  useEffect(() => {
    const m = document.cookie.match(/(?:^|; )locale=(fr|en)/)
    setLang(m ? (m[1] as 'fr' | 'en') : 'fr')
    const check = () => setNarrow(window.innerWidth < 640)
    check(); window.addEventListener('resize', check)
    // A beat after load so it never competes with the preloader.
    const id = setTimeout(() => { if (!readConsent()) setOpen(true) }, 1200)
    const reopen = () => setOpen(true)
    window.addEventListener(`${CONSENT_EVENT}:open`, reopen)
    return () => { clearTimeout(id); window.removeEventListener('resize', check); window.removeEventListener(`${CONSENT_EVENT}:open`, reopen) }
  }, [])

  if (!open || pathname.startsWith('/admin')) return null
  const t = COPY[lang]
  const choose = (c: 'granted' | 'denied') => { writeConsent(c); setOpen(false) }

  return (
    <div role="dialog" aria-label={t.aria} aria-live="polite" style={{
      position: 'fixed', zIndex: 70, left: narrow ? 10 : 20, right: narrow ? 10 : 'auto', bottom: narrow ? 'calc(10px + env(safe-area-inset-bottom, 0px))' : 20,
      width: narrow ? 'auto' : 'min(420px, calc(100vw - 40px))', padding: '18px 20px 16px', borderRadius: 16,
      background: '#2a2119', color: '#ebe8db', border: '1px solid rgba(235,232,219,0.14)', boxShadow: '0 24px 60px rgba(0,0,0,0.35)',
      animation: 'pfCookieIn 0.4s cubic-bezier(0.22,1,0.36,1)',
    }}>
      <style>{`@keyframes pfCookieIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}@media (prefers-reduced-motion: reduce){[aria-label="${t.aria}"]{animation:none}}`}</style>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#dfc9a6', margin: '0 0 8px' }}>{t.eyebrow}</p>
      <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1.0625rem', lineHeight: 1.25, margin: '0 0 8px', color: '#f4ecdb' }}>{t.title}</p>
      <p style={{ fontFamily: 'var(--font-serif)', fontSize: '0.875rem', lineHeight: 1.5, margin: '0 0 14px', color: 'rgba(235,232,219,0.82)' }}>
        {t.body}{' '}
        <Link href="/legal/cookies" style={{ color: '#dfc9a6', textDecoration: 'underline', textUnderlineOffset: 3 }}>{t.policy}</Link>
      </p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" onClick={() => choose('granted')} style={{ flex: '1 1 auto', padding: '10px 16px', borderRadius: 999, border: '1px solid transparent', background: '#ebe8db', color: '#2a2119', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', letterSpacing: '0.06em', cursor: 'pointer' }}>{t.accept}</button>
        <button type="button" onClick={() => choose('denied')} style={{ flex: '1 1 auto', padding: '10px 16px', borderRadius: 999, border: '1px solid rgba(235,232,219,0.4)', background: 'transparent', color: '#ebe8db', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', letterSpacing: '0.06em', cursor: 'pointer' }}>{t.essential}</button>
      </div>
    </div>
  )
}
