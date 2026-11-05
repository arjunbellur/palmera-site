'use client'
// "What you can book" — the categories that actually exist in the app, as a
// mosaic of real listing photos (replaces the generic icon list). Tiles
// reveal on arrival (IntersectionObserver + CSS, with a fallback so they can
// never stay hidden); the hovered tile grows on pointer devices.
import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { trackStoreClick } from '@/lib/ga'

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

// Hover: the photo under the cursor eases in a touch and the rest dim. (The
// earlier version grew the hovered tile by animating the grid tracks with
// computed fraction templates; it was clever, fragile, and not worth it.)

export default function Services() {
  const t = useTranslations('services')
  const rootRef = useRef<HTMLElement>(null)
  // Tiles reveal with CSS once the grid is near the viewport. An
  // IntersectionObserver (not a ScrollTrigger tween) decides: the tween
  // used to pin every tile at opacity 0 until its trigger fired, and when
  // the Lenis/ScrollTrigger clock was late — deep link, refresh mid-page,
  // the preloader still up — the mosaic stayed invisible. A 2.5 s fallback
  // guarantees the photos show no matter what.
  const [revealed, setRevealed] = useState(false)

  // The heading and the tiles reveal together; no GSAP here any more — the
  // heading's ScrollTrigger tween had the same failure mode as the tiles'
  // (stuck invisible when the trigger never fired, which is what the phone
  // screenshot showed: label, blank space, mosaic).
  useEffect(() => {
    const root = rootRef.current
    if (!root || revealed) return
    const show = () => setRevealed(true)
    const fallback = window.setTimeout(show, 2500)
    if (!('IntersectionObserver' in window)) { show(); return () => window.clearTimeout(fallback) }
    const io = new IntersectionObserver((entries) => { if (entries.some((e) => e.isIntersecting)) show() }, { rootMargin: '0px 0px -10% 0px' })
    io.observe(root)
    return () => { io.disconnect(); window.clearTimeout(fallback) }
  }, [revealed])

  return (
    <section id="skills" ref={rootRef} data-in={revealed ? '' : undefined} style={{ background: 'transparent', padding: 'var(--section-y) 0', position: 'relative', zIndex: 1 }}>
      <div className="site-container">
        <div className="cat-head" style={{ marginBottom: 'var(--space-lg)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p className="label" style={{ color: 'var(--accent-3)', margin: 0 }}>{t('label')}</p>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-section)', fontWeight: 400, letterSpacing: '-0.125rem', lineHeight: 1, color: 'var(--color-dark)', margin: 0, textWrap: 'balance', maxWidth: '16ch' }}>{t('heading')}</h2>
        </div>
        {/* Full container width (same edge as the heading); 16:10 on desktop,
            square on phones. The old square was capped at 88svh, which left a
            third of a wide screen empty on both sides. */}
        <div className="cat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gridTemplateRows: 'repeat(4, minmax(0, 1fr))', gap: 'clamp(0.375rem, 1vw, 0.875rem)', width: '100%' }}>
          {TILES.map((tile, i) => (
            <a key={tile.key} href="https://apps.apple.com/app/palmera/id6784757513" target="_blank" rel="noopener noreferrer" className="cat-tile" onClick={() => trackStoreClick('apple', `mosaic_${tile.key}`)}
              style={{ ['--i' as string]: i, position: 'relative', gridArea: tile.area, borderRadius: 'var(--radius-tile)', overflow: 'hidden', display: 'block', textDecoration: 'none', background: '#2a2119' }}>
              {/* Sized to the tile, not the viewport: a small tile is a quarter of the
                  grid, a big one half — the old 40vw hint fetched ~2× the pixels. */}
              {/* Eager at low priority: the photos download after the above-the-fold
                  work (~270 KB for all seven at these sizes) so they are already decoded
                  when the mosaic scrolls in. Lazy loading fetched them on arrival, which
                  with smooth scrolling meant dark tiles for a second or two. */}
              <Image src={tile.src} alt="" fill quality={72} loading="eager" fetchPriority="low" sizes={tile.big ? '(max-width: 760px) 50vw, (max-width: 1280px) 46vw, 600px' : '(max-width: 760px) 25vw, (max-width: 1280px) 23vw, 300px'} className="cat-img" style={{ objectFit: 'cover' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(42,33,25,0.8) 0%, rgba(42,33,25,0.1) 55%, rgba(42,33,25,0) 100%)' }} />
              <div style={{ position: 'absolute', left: 'clamp(0.625rem, 1.5vw, 1.25rem)', right: 'clamp(0.625rem, 1.5vw, 1.25rem)', bottom: 'clamp(0.5rem, 1.25vw, 1.125rem)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span style={{ fontFamily: 'var(--font-serif)', fontSize: tile.big ? 'clamp(1rem, 2.4vw, 1.875rem)' : 'clamp(0.8125rem, 1.6vw, 1.375rem)', letterSpacing: '-0.02em', lineHeight: 1.1, color: '#ebe8db' }}>{t(`${tile.key}`)}</span>
                <span className="cat-sub" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'hsla(36.84,47.11%,76.27%,1)' }}>{t(`${tile.key}Sub`)}</span>
              </div>
            </a>
          ))}
        </div>
      </div>
      <style>{`
        .cat-grid { aspect-ratio: 16 / 10; }
        @media (max-width: 760px) { .cat-grid { aspect-ratio: 1 / 1; } .cat-sub { display: none; } }
        /* Reveal: heading and tiles sit in place, slightly low and transparent,
           and settle once the section is near the viewport (data-in). */
        .cat-head > *, .cat-tile { opacity: 0; transform: translate3d(0, 22px, 0); transition: opacity 0.7s cubic-bezier(0.22,1,0.36,1), transform 0.7s cubic-bezier(0.22,1,0.36,1); transition-delay: calc(var(--i, 0) * 60ms); }
        .cat-head > :nth-child(2) { transition-delay: 80ms; }
        #skills[data-in] .cat-head > *, #skills[data-in] .cat-tile { opacity: 1; transform: none; }
        /* Hover, pointer devices only: the photo eases in, the others step back. */
        .cat-img { transition: transform 0.6s cubic-bezier(0.22,1,0.36,1), filter 0.6s ease !important; }
        @media (hover: hover) and (pointer: fine) {
          .cat-grid:hover .cat-img { filter: brightness(0.72); }
          .cat-tile:hover .cat-img { transform: scale(1.045); filter: none; }
        }
        @media (prefers-reduced-motion: reduce) { .cat-tile, .cat-img, .cat-head > * { transition: none !important; } .cat-tile, .cat-head > * { opacity: 1; transform: none; } }
        .cat-tile:focus-visible { outline: 2px solid var(--accent-3); outline-offset: 3px; }
      `}</style>
    </section>
  )
}
