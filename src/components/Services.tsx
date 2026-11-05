'use client'
// "What you can book" — the categories that actually exist in the app, as a
// mosaic of real listing photos (replaces the generic icon list). Tiles
// reveal on arrival (IntersectionObserver + CSS, with a fallback so they can
// never stay hidden); the hovered tile grows on pointer devices.
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
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

// Hover expansion: the active tile's tracks grow and the rest yield, so the
// bento breathes but always stays a square. The active tile is STICKY — it
// only changes when the cursor enters another tile and only clears when the
// cursor leaves the whole bento — so crossing the gaps never snaps the grid
// back (that was the flicker). Pointer devices only.
const template = (from: number, to: number) => {
  const k = to - from
  const grow = k === 1 ? 1.5 : 1.28
  const rest = (4 - k * grow) / (4 - k)
  return [0, 1, 2, 3].map((i) => `minmax(0, ${(i >= from && i < to ? grow : rest).toFixed(3)}fr)`).join(' ')
}
const EXPANDED: Record<string, { cols: string; rows: string }> = Object.fromEntries(TILES.map((tile) => {
  const [r1, c1, r2, c2] = tile.area.split('/').map((n) => parseInt(n, 10) - 1)
  return [tile.key, { cols: template(c1, c2), rows: template(r1, r2) }]
}))
// Same explicit 4-track form as the expanded templates — browsers only
// interpolate grid tracks when both ends have the same shape (repeat() vs a
// list falls back to a hard jump).
const REST = 'minmax(0, 1.000fr) minmax(0, 1.000fr) minmax(0, 1.000fr) minmax(0, 1.000fr)'

export default function Services() {
  const t = useTranslations('services')
  const rootRef = useRef<HTMLElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState<string | null>(null)
  // Tiles reveal with CSS once the grid is near the viewport. An
  // IntersectionObserver (not a ScrollTrigger tween) decides: the tween
  // used to pin every tile at opacity 0 until its trigger fired, and when
  // the Lenis/ScrollTrigger clock was late — deep link, refresh mid-page,
  // the preloader still up — the mosaic stayed invisible. A 2.5 s fallback
  // guarantees the photos show no matter what.
  const [revealed, setRevealed] = useState(false)
  const canHover = () => typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches

  useLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger)
    const root = rootRef.current
    if (!root) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    const ctx = gsap.context(() => {
      gsap.from('.cat-head > *', { y: 24, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.08,
        scrollTrigger: { trigger: root, start: 'top 75%', once: true } })
    }, root)
    return () => ctx.revert()
  }, [])

  useEffect(() => {
    const grid = gridRef.current
    if (!grid || revealed) return
    const show = () => setRevealed(true)
    const fallback = window.setTimeout(show, 2500)
    if (!('IntersectionObserver' in window)) { show(); return () => window.clearTimeout(fallback) }
    const io = new IntersectionObserver((entries) => { if (entries.some((e) => e.isIntersecting)) show() }, { rootMargin: '0px 0px -12% 0px' })
    io.observe(grid)
    return () => { io.disconnect(); window.clearTimeout(fallback) }
  }, [revealed])

  return (
    <section id="skills" ref={rootRef} style={{ background: 'transparent', padding: 'clamp(4.5rem,9vw,9rem) 0 clamp(5rem,10vw,11rem)', position: 'relative', zIndex: 1 }}>
      <div style={{ maxWidth: '75rem', margin: '0 auto', padding: '0 clamp(1.5rem,4.5vw,2.5rem)' }}>
        <div className="cat-head" style={{ marginBottom: 'clamp(2rem,4vw,3.5rem)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p className="label" style={{ color: 'var(--accent-3)', margin: 0 }}>{t('label')}</p>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(2rem,5.5vw,4.5rem)', fontWeight: 400, letterSpacing: '-0.125rem', lineHeight: 1, color: 'var(--color-dark)', margin: 0, textWrap: 'balance', maxWidth: '16ch' }}>{t('heading')}</h2>
        </div>
        {/* Full container width (same edge as the heading); 16:10 on desktop,
            square on phones. The old square was capped at 88svh, which left a
            third of a wide screen empty on both sides. */}
        <div ref={gridRef} className="cat-grid" data-active={active ? '' : undefined} data-in={revealed ? '' : undefined} onMouseLeave={() => setActive(null)}
          style={{ display: 'grid', gridTemplateColumns: active ? EXPANDED[active].cols : REST, gridTemplateRows: active ? EXPANDED[active].rows : REST, gap: 'clamp(0.375rem,1vw,0.875rem)', width: '100%', containerType: 'inline-size' }}>
          {TILES.map((tile, i) => (
            <a key={tile.key} href="https://apps.apple.com/app/palmera/id6784757513" target="_blank" rel="noopener noreferrer" className="cat-tile" data-on={active === tile.key ? '' : undefined} onMouseEnter={() => { if (canHover()) setActive(tile.key) }}
              style={{ ['--i' as string]: i, position: 'relative', gridArea: tile.area, borderRadius: 'clamp(0.5rem,1.4cqw,0.75rem)', overflow: 'hidden', display: 'block', textDecoration: 'none', background: '#2a2119' }}>
              {/* Sized to the tile, not the viewport: a small tile is a quarter of the
                  grid, a big one half — the old 40vw hint fetched ~2× the pixels. */}
              <Image src={tile.src} alt="" fill quality={72} sizes={tile.big ? '(max-width: 760px) 50vw, (max-width: 1280px) 46vw, 600px' : '(max-width: 760px) 25vw, (max-width: 1280px) 23vw, 300px'} className="cat-img" style={{ objectFit: 'cover' }} />
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
        .cat-grid { aspect-ratio: 16 / 10; }
        @media (max-width: 760px) { .cat-grid { aspect-ratio: 1 / 1; } .cat-sub { display: none; } }
        /* Reveal: the tiles sit in place, slightly low and transparent, and
           settle once the grid is near the viewport (data-in). */
        .cat-tile { opacity: 0; transform: translate3d(0, 22px, 0); transition: opacity 0.7s cubic-bezier(0.22,1,0.36,1), transform 0.7s cubic-bezier(0.22,1,0.36,1); transition-delay: calc(var(--i, 0) * 60ms); will-change: opacity, transform; }
        .cat-grid[data-in] .cat-tile { opacity: 1; transform: none; }
        /* Hover expansion — pointer devices only; a finger never half-hovers a grid. */
        @media (hover: hover) and (pointer: fine) {
          .cat-grid { transition: grid-template-columns 0.6s cubic-bezier(0.45,0,0.15,1), grid-template-rows 0.6s cubic-bezier(0.45,0,0.15,1); }
          .cat-img { transition: filter 0.6s cubic-bezier(0.45,0,0.15,1) !important; }
          .cat-grid[data-active] .cat-tile:not([data-on]) .cat-img { filter: brightness(0.7); }
        }
        @media (prefers-reduced-motion: reduce) { .cat-grid, .cat-tile, .cat-img { transition: none !important; } .cat-tile { opacity: 1; transform: none; } }
        .cat-tile:focus-visible { outline: 2px solid var(--accent-3); outline-offset: 3px; }
      `}</style>
    </section>
  )
}
