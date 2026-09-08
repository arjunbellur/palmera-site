'use client'
// "What you can book" — the categories that actually exist in the app, as a
// mosaic of real listing photos (replaces the generic icon list). Tiles
// reveal on arrival; the photo eases in on hover.
import { useLayoutEffect, useRef } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

const TILES = [
  { key: 'lifestyle', src: '/images/listings/beach.webp',  span: 2 },
  { key: 'wellness',  src: '/images/listings/spa.webp',    span: 1 },
  { key: 'stays',     src: '/images/listings/villa.webp',  span: 1 },
  { key: 'islands',   src: '/images/listings/ngor.webp',   span: 1 },
  { key: 'nightlife', src: '/images/listings/club.webp',   span: 1 },
  { key: 'yachts',    src: '/images/listings/yacht.webp',  span: 2 },
  { key: 'rentals',   src: '/images/listings/gwagon.webp', span: 1 },
] as const

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
        <div className="cat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 'clamp(0.75rem,1.4vw,1.125rem)' }}>
          {TILES.map((tile) => (
            <a key={tile.key} href="https://apps.apple.com/app/palmera/id6784757513" target="_blank" rel="noopener noreferrer" className="cat-tile"
              style={{ position: 'relative', gridColumn: `span ${tile.span}`, height: 'clamp(12rem,22vw,21rem)', borderRadius: '0.75rem', overflow: 'hidden', display: 'block', textDecoration: 'none', background: '#2a2119' }}>
              <Image src={tile.src} alt="" fill sizes="(max-width: 760px) 100vw, 40vw" className="cat-img" style={{ objectFit: 'cover', transition: 'transform 1.2s cubic-bezier(0.2,0.8,0.2,1)' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(42,33,25,0.8) 0%, rgba(42,33,25,0.1) 55%, rgba(42,33,25,0) 100%)' }} />
              <div style={{ position: 'absolute', left: 'clamp(1rem,1.6vw,1.5rem)', right: 'clamp(1rem,1.6vw,1.5rem)', bottom: 'clamp(0.875rem,1.4vw,1.25rem)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(1.25rem,2vw,1.875rem)', letterSpacing: '-0.02em', lineHeight: 1.1, color: '#ebe8db' }}>{t(`${tile.key}`)}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'hsla(36.84,47.11%,76.27%,1)' }}>{t(`${tile.key}Sub`)}</span>
              </div>
            </a>
          ))}
        </div>
      </div>
      <style>{`
        .cat-tile:hover .cat-img { transform: scale(1.05); }
        .cat-tile:focus-visible { outline: 2px solid var(--accent-3); outline-offset: 3px; }
        @media (max-width: 760px) {
          .cat-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
          .cat-tile { grid-column: span 1 !important; height: 11rem !important; }
          .cat-tile:first-child, .cat-tile:nth-child(6) { grid-column: span 2 !important; height: 13rem !important; }
        }
      `}</style>
    </section>
  )
}
