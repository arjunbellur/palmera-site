'use client'
// "What you can book" — the categories that actually exist in the app, as a
// mosaic of real listing photos (replaces the generic icon list). Tiles
// reveal on arrival; the photo eases in on hover.
import { useLayoutEffect, useRef } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

// A true square bento on a 4×4 grid — 16 cells, no gaps:
//   A A B B
//   A A C D
//   E F F G
//   E F F G
const TILES = [
  { key: 'lifestyle', src: '/images/listings/beach.webp',  area: '1 / 1 / 3 / 3', big: true },
  { key: 'yachts',    src: '/images/listings/yacht.webp',  area: '1 / 3 / 2 / 5', big: false },
  { key: 'wellness',  src: '/images/listings/spa.webp',    area: '2 / 3 / 3 / 4', big: false },
  { key: 'stays',     src: '/images/listings/villa.webp',  area: '2 / 4 / 3 / 5', big: false },
  { key: 'islands',   src: '/images/listings/ngor.webp',   area: '3 / 1 / 5 / 2', big: false },
  { key: 'nightlife', src: '/images/listings/club.webp',   area: '3 / 2 / 5 / 4', big: true },
  { key: 'rentals',   src: '/images/listings/gwagon.webp', area: '3 / 4 / 5 / 5', big: false },
] as const

// Hover expansion: the hovered tile's tracks grow and the rest yield, so the
// bento breathes but always stays a square. Pure CSS (:has + animated grid
// tracks); pointer devices only.
const tracks = (area: string) => { const [r1, c1, r2, c2] = area.split('/').map((n) => parseInt(n, 10) - 1); return { r1, c1, r2, c2 } }
const template = (from: number, to: number) => {
  const k = to - from
  const grow = k === 1 ? 1.7 : 1.35
  const rest = (4 - k * grow) / (4 - k)
  return [0, 1, 2, 3].map((i) => `minmax(0, ${(i >= from && i < to ? grow : rest).toFixed(3)}fr)`).join(' ')
}
const HOVER_CSS = TILES.map((tile) => {
  const { r1, c1, r2, c2 } = tracks(tile.area)
  return `.cat-grid:has(.cat-t-${tile.key}:hover) { grid-template-columns: ${template(c1, c2)}; grid-template-rows: ${template(r1, r2)}; }`
}).join('\n')

export default function Services() {
  const t = useTranslations('services')
  const rootRef = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger)
    const root = rootRef.current
    if (!root) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    const ctx = gsap.context(() => {
      gsap.from('.cat-head > *', { y: 24, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.08,
        scrollTrigger: { trigger: root, start: 'top 75%', once: true } })
      gsap.from('.cat-tile', { y: 40, opacity: 0, duration: 1, ease: 'power3.out', stagger: 0.08,
        scrollTrigger: { trigger: '.cat-grid', start: 'top 80%', once: true } })
    }, root)
    return () => ctx.revert()
  }, [])

  return (
    <section id="skills" ref={rootRef} style={{ background: 'transparent', padding: 'clamp(4.5rem,9vw,9rem) 0 clamp(5rem,10vw,11rem)', position: 'relative', zIndex: 1 }}>
      <div style={{ maxWidth: '75rem', margin: '0 auto', padding: '0 clamp(1.5rem,4.5vw,2.5rem)' }}>
        <div className="cat-head" style={{ marginBottom: 'clamp(2rem,4vw,3.5rem)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p className="label" style={{ color: 'var(--accent-3)', margin: 0 }}>{t('label')}</p>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(2rem,5.5vw,4.5rem)', fontWeight: 400, letterSpacing: '-0.125rem', lineHeight: 1, color: 'var(--color-dark)', margin: 0, textWrap: 'balance', maxWidth: '16ch' }}>{t('heading')}</h2>
        </div>
        <div className="cat-grid" style={{ display: 'grid', gap: 'clamp(0.375rem,1vw,0.875rem)', width: 'min(100%, 58rem, 88svh)', aspectRatio: '1 / 1', margin: '0 auto', containerType: 'inline-size' }}>
          {TILES.map((tile) => (
            <a key={tile.key} href="https://apps.apple.com/app/palmera/id6784757513" target="_blank" rel="noopener noreferrer" className={`cat-tile cat-t-${tile.key}`}
              style={{ position: 'relative', gridArea: tile.area, borderRadius: 'clamp(0.5rem,1.4cqw,0.75rem)', overflow: 'hidden', display: 'block', textDecoration: 'none', background: '#2a2119' }}>
              <Image src={tile.src} alt="" fill sizes="(max-width: 760px) 100vw, 40vw" className="cat-img" style={{ objectFit: 'cover', transition: 'transform 1.2s cubic-bezier(0.2,0.8,0.2,1)' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(42,33,25,0.8) 0%, rgba(42,33,25,0.1) 55%, rgba(42,33,25,0) 100%)' }} />
              <div style={{ position: 'absolute', left: 'clamp(0.5rem,2cqw,1.25rem)', right: 'clamp(0.5rem,2cqw,1.25rem)', bottom: 'clamp(0.5rem,1.8cqw,1.125rem)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span style={{ fontFamily: 'var(--font-serif)', fontSize: tile.big ? 'clamp(1rem,3.4cqw,1.875rem)' : 'clamp(0.8125rem,2.3cqw,1.375rem)', letterSpacing: '-0.02em', lineHeight: 1.1, color: '#ebe8db' }}>{t(`${tile.key}`)}</span>
                <span className="cat-sub" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'hsla(36.84,47.11%,76.27%,1)' }}>{t(`${tile.key}Sub`)}</span>
              </div>
            </a>
          ))}
        </div>
      </div>
      <style>{`
        .cat-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); grid-template-rows: repeat(4, minmax(0, 1fr)); transition: grid-template-columns 0.7s cubic-bezier(0.2,0.8,0.2,1), grid-template-rows 0.7s cubic-bezier(0.2,0.8,0.2,1); }
        .cat-sub { opacity: 0.85; transition: opacity 0.4s ease; }
        @media (hover: hover) and (pointer: fine) {
          ${HOVER_CSS}
          .cat-grid:has(.cat-tile:hover) .cat-tile:not(:hover) .cat-img { filter: brightness(0.72); }
          .cat-tile:hover .cat-img { transform: scale(1.04); }
        }
        .cat-img { transition: transform 1.2s cubic-bezier(0.2,0.8,0.2,1), filter 0.6s ease !important; }
        @media (prefers-reduced-motion: reduce) { .cat-grid { transition: none; } }
        .cat-tile:focus-visible { outline: 2px solid var(--accent-3); outline-offset: 3px; }
        @media (max-width: 760px) { .cat-sub { display: none; } }
      `}</style>
    </section>
  )
}
