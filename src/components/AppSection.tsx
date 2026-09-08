'use client'
// The app showcase — the phone section (Jordan, 2026-09-07: competitor's
// "phone part of the site" + production App Store link now that v1.0 is live).
// Three real App Store screenshots in device frames fan out as you scroll:
// CSS sticky does the pinning (plays perfectly with Lenis), a rAF loop maps
// scroll progress to transforms — no animation library, no re-renders.
import { useEffect, useRef } from 'react'
import Image from 'next/image'
import { useLocale, useTranslations } from 'next-intl'

export const APP_STORE_URL = 'https://apps.apple.com/app/palmera/id6784757513'

const SCREENS = [
  '/images/app/screen-2.png', // left  — Experience Africa differently
  '/images/app/screen-1.png', // center — Places worth your time
  '/images/app/screen-3.png', // right — Discover, book, live
]

const clamp = (v: number) => Math.min(1, Math.max(0, v))
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)

export function AppStoreBadge({ dark = true }: { dark?: boolean }) {
  const locale = useLocale()
  const fg = dark ? '#ebe8db' : 'var(--color-dark)'
  const bg = dark ? 'var(--color-dark)' : 'transparent'
  return (
    <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" aria-label="App Store"
      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.625rem', padding: '0.75rem 1.375rem', background: bg, border: `1px solid ${dark ? 'var(--color-dark)' : 'rgba(42,33,25,0.35)'}`, borderRadius: '0.625rem', textDecoration: 'none', color: fg }}>
      <svg width="20" height="24" viewBox="0 0 384 512" fill="currentColor" aria-hidden>
        <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
      </svg>
      <span style={{ display: 'grid', lineHeight: 1.15, textAlign: 'left' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.75 }}>
          {locale === 'fr' ? 'Télécharger dans' : 'Download on the'}
        </span>
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: '1.0625rem', fontWeight: 600, letterSpacing: '-0.01em' }}>{locale === 'fr' ? 'l’App Store' : 'App Store'}</span>
      </span>
    </a>
  )
}

export default function AppSection() {
  const t = useTranslations('app')
  const outerRef = useRef<HTMLElement>(null)
  const phoneRefs = useRef<(HTMLDivElement | null)[]>([])
  const textRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const outer = outerRef.current
    if (!outer) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // Final resting pose per phone: [x% of own width, rotation, scale, extra y%]
    const pose = (narrow: boolean) => narrow
      ? [[-56, -9, 0.82, 7], [0, 0, 1, 0], [56, 9, 0.82, 7]]
      : [[-84, -8, 0.86, 5], [0, 0, 1, 0], [84, 8, 0.86, 5]]

    let raf = 0
    const frame = () => {
      raf = 0
      const rect = outer.getBoundingClientRect()
      const vh = window.innerHeight
      const total = rect.height - vh
      const p = reduced ? 1 : clamp(-rect.top / (total * 0.62)) // fully posed ~2/3 through
      const fan = easeOut(p)
      const narrow = window.innerWidth < 760
      const poses = pose(narrow)
      phoneRefs.current.forEach((el, i) => {
        if (!el) return
        const [x, r, s, y] = poses[i]
        const rise = (1 - fan) * 14 // all phones drift up into place
        if (i === 1) {
          el.style.transform = `translateY(${rise + y}%) scale(${0.94 + 0.06 * fan})`
          el.style.opacity = '1'
        } else {
          el.style.transform = `translateX(${x * fan}%) translateY(${rise + y * fan}%) rotate(${r * fan}deg) scale(${0.94 + (s - 0.94) * fan})`
          el.style.opacity = String(0.25 + 0.75 * fan)
        }
        el.style.zIndex = i === 1 ? '2' : '1'
      })
      if (textRef.current) {
        const tp = reduced ? 1 : clamp((p - 0.45) / 0.4)
        textRef.current.style.opacity = String(tp)
        textRef.current.style.transform = `translateY(${(1 - easeOut(tp)) * 1.5}rem)`
      }
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(frame) }
    frame()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <section id="signal" ref={outerRef} style={{ height: '240vh', position: 'relative', background: 'transparent' }}>
      <div style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 'clamp(1.5rem, 3vh, 2.5rem)', padding: '4.5rem 1rem 2rem' }}>
        {/* Phones */}
        {/* Height-driven sizing: the aspect box derives its width from the
            height so the card can never outgrow the viewport under the nav. */}
        <div style={{ position: 'relative', height: 'min(52vh, 34rem)', width: 'auto', aspectRatio: '642 / 1389', flex: '0 0 auto' }}>
          {SCREENS.map((src, i) => (
            <div key={src} ref={(el) => { phoneRefs.current[i] = el }}
              style={{ position: 'absolute', inset: 0, willChange: 'transform', transition: 'none' }}>
              <div style={{ position: 'absolute', inset: 0, borderRadius: 'clamp(1.5rem, 4vw, 2.25rem)', overflow: 'hidden', border: '1px solid rgba(42,33,25,0.28)', boxShadow: '0 1.5rem 3.5rem rgba(42,33,25,0.28)', background: '#0D2136' }}>
                <Image src={src} alt="" fill sizes="(max-width: 760px) 60vw, 17rem" style={{ objectFit: 'cover' }} priority />
              </div>
            </div>
          ))}
        </div>
        {/* Copy + store badge */}
        <div ref={textRef} style={{ textAlign: 'center', maxWidth: '34rem', opacity: 0 }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(42,33,25,0.6)', marginBottom: '0.875rem' }}>{t('stepInside')}</p>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(1.875rem, 4.5vw, 3.25rem)', fontWeight: 400, letterSpacing: '-0.06rem', lineHeight: 1.08, color: 'var(--color-dark)', marginBottom: '1.5rem' }}>{t('heading')}</h2>
          <AppStoreBadge />
        </div>
      </div>
    </section>
  )
}
