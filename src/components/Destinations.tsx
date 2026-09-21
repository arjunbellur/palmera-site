'use client'
// "Follow the coast" — where Palmera is live, from real listings. Same
// grammar as the phone scene: one pinned scene that holds still; only the
// active place, its line and the framed photo change. One GSAP timeline
// scrubbed by ScrollTrigger (reading Lenis). Places with no listings never
// appear — the counts come from Firestore (src/lib/place-counts.ts).
import { useLayoutEffect, useRef } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

const PLACES = [
  { id: 'dakar',    name: 'Dakar',    src: '/images/listings/yacht.webp',     pos: 'center' },
  { id: 'saly',     name: 'Saly',     src: '/images/listings/yumabeach.webp', pos: 'center 60%' },
  { id: 'ngor',     name: 'Ngor',     src: '/images/listings/ngor.webp',      pos: 'center' },
  { id: 'goree',    name: 'Gorée',    src: '/images/listings/goree.webp',     pos: 'center' },
  { id: 'lac-rose', name: 'Lac Rose', src: '/images/listings/lacrose.webp',   pos: 'center' },
] as const
const TAN = 'hsla(36.84,47.11%,76.27%,1)'
const APP_STORE_URL = 'https://apps.apple.com/app/palmera/id6784757513'

export default function Destinations({ counts }: { counts: Record<string, number> }) {
  const t = useTranslations('destinations')
  const sectionRef = useRef<HTMLElement>(null)
  const nameRefs = useRef<(HTMLLIElement | null)[]>([])
  const lineRefs = useRef<(HTMLParagraphElement | null)[]>([])
  const imgRefs = useRef<(HTMLDivElement | null)[]>([])
  const tickRefs = useRef<(HTMLSpanElement | null)[]>([])

  // "28 places · dining, nightlife…" where there's a catalogue; a plain
  // sentence where there's one thing — "1 place" would read thin.
  const line = (id: string) => {
    const n = counts[id] || 0
    return n > 1 ? `${t('places', { n })} · ${t(`${id}.line`)}` : t(`${id}.line`)
  }

  useLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger)
    const section = sectionRef.current
    if (!section) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const ctx = gsap.context(() => {
      const names = nameRefs.current.filter(Boolean) as HTMLLIElement[]
      const lines = lineRefs.current.filter(Boolean) as HTMLParagraphElement[]
      const imgs = imgRefs.current.filter(Boolean) as HTMLDivElement[]
      const ticks = tickRefs.current.filter(Boolean) as HTMLSpanElement[]

      gsap.set(names.slice(1), { opacity: 0.32 })
      gsap.set(lines.slice(1), { opacity: 0, y: 10 })
      gsap.set(imgs.slice(1), { opacity: 0, scale: 1.03 })
      gsap.set(ticks, { scaleX: 0.35, opacity: 0.35 })
      gsap.set(ticks[0], { scaleX: 1, opacity: 1 })

      if (!reduced) gsap.from('.dc-frame', { y: 60, opacity: 0, duration: 1.2, ease: 'power3.out',
        scrollTrigger: { trigger: section, start: 'top 75%', once: true } })

      const tl = gsap.timeline({
        scrollTrigger: { trigger: section, start: 'top top', end: `+=${PLACES.length * 80}%`, pin: true, scrub: reduced ? false : 0.8, anticipatePin: 1 },
      })
      for (let i = 1; i < PLACES.length; i++) {
        tl.to(names[i - 1], { opacity: 0.32, duration: 0.4, ease: 'power1.inOut' }, i - 0.2)
          .to(names[i], { opacity: 1, duration: 0.4, ease: 'power1.inOut' }, i - 0.2)
          .to(lines[i - 1], { opacity: 0, y: -8, duration: 0.3, ease: 'power2.in' }, i - 0.25)
          .to(lines[i], { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' }, i + 0.05)
          .to(imgs[i - 1], { opacity: 0, duration: 0.35, ease: 'power1.in' }, i - 0.18)
          .to(imgs[i], { opacity: 1, scale: 1, duration: 0.5, ease: 'power2.out' }, i - 0.1)
          .to(ticks[i - 1], { scaleX: 0.35, opacity: 0.35, duration: 0.3 }, i)
          .to(ticks[i], { scaleX: 1, opacity: 1, duration: 0.3 }, i)
      }
      tl.to({}, { duration: 0.7 })
    }, section)
    return () => ctx.revert()
  }, [])

  return (
    <section id="makes" ref={sectionRef} style={{ position: 'relative', height: '100svh', minHeight: '40rem', background: '#2a2119', overflow: 'hidden' }}>
      <div className="dc-grid" style={{ height: '100%', maxWidth: '84rem', margin: '0 auto', padding: 'clamp(4.5rem,7vh,6rem) clamp(1.25rem,4.5vw,2.5rem) clamp(1.25rem,3vh,2.5rem)', boxSizing: 'border-box' }}>
        {/* Copy + index */}
        <div className="dc-copy" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 'clamp(1.25rem,3vh,2.25rem)', minWidth: 0 }}>
          <div className="dc-head" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: TAN, margin: 0 }}>{t('label')}</p>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(1.625rem,3vw,2.875rem)', fontWeight: 400, letterSpacing: '-0.03em', lineHeight: 1.04, color: '#ebe8db', margin: 0, textWrap: 'balance' }}>{t('heading')}</h2>
          </div>
          <ol className="dc-names" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 'clamp(0.125rem,0.8vh,0.5rem)' }}>
            {PLACES.map((p, i) => (
              <li key={p.id} ref={(el) => { nameRefs.current[i] = el }} style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(2.25rem,5.2vw,4.75rem)', fontWeight: 400, letterSpacing: '-0.04em', lineHeight: 1.02, color: '#ebe8db', willChange: 'opacity' }}>{p.name}</li>
            ))}
          </ol>
          {/* Lines stack in one cell; the timeline swaps them */}
          <div className="dc-lines" style={{ display: 'grid', minHeight: '3.25rem' }}>
            {PLACES.map((p, i) => (
              <p key={p.id} ref={(el) => { lineRefs.current[i] = el }} style={{ gridArea: '1 / 1', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase', lineHeight: 1.6, color: TAN, margin: 0, maxWidth: '30rem', willChange: 'opacity, transform' }}>
                <span className="dc-mname" style={{ display: 'none' }}>{p.name}</span>{line(p.id)}
              </p>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '0.375rem' }}>
              {PLACES.map((p, i) => <span key={p.id} ref={(el) => { tickRefs.current[i] = el }} style={{ display: 'block', width: '1.5rem', height: '2px', background: TAN, transformOrigin: 'left center' }} />)}
            </div>
            <span className="dc-soon" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(235,232,219,0.45)' }}>{t('soon')}</span>
          </div>
        </div>

        {/* One framed photo — framed, not full-bleed, so every real photo stays sharp */}
        <div className="dc-stage" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 0 }}>
          <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" aria-label="App Store" className="dc-frame"
            style={{ position: 'relative', display: 'block', width: '100%', height: 'min(72svh, 46rem)', borderRadius: '0.75rem', overflow: 'hidden', background: '#1d1711', boxShadow: '0 2.5rem 5rem rgba(0,0,0,0.45)' }}>
            {PLACES.map((p, i) => (
              <div key={p.id} ref={(el) => { imgRefs.current[i] = el }} style={{ position: 'absolute', inset: 0, willChange: 'opacity, transform' }}>
                <Image src={p.src} alt={p.name} fill sizes="(max-width: 760px) 100vw, 55vw" priority={i === 0} style={{ objectFit: 'cover', objectPosition: p.pos }} />
              </div>
            ))}
          </a>
        </div>
      </div>
      <style>{`
        .dc-grid { display: grid; grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr); gap: clamp(2rem, 4vw, 5rem); align-items: center; }
        .dc-frame:focus-visible { outline: 2px solid ${TAN}; outline-offset: 4px; }
        @media (max-width: 760px) {
          /* Photo on top; only the active place shows, pinned to the viewport bottom */
          .dc-grid { grid-template-columns: 1fr; grid-template-rows: minmax(0, 1fr) auto; gap: 1rem; align-items: stretch; padding-bottom: calc(1.25rem + env(safe-area-inset-bottom)) !important; }
          .dc-stage { order: -1; }
          .dc-frame { height: 100% !important; max-height: 58svh; }
          .dc-copy { justify-content: flex-end; gap: 0.75rem; }
          .dc-head h2, .dc-names, .dc-soon { display: none !important; }
          .dc-mname { display: block !important; font-family: var(--font-serif); font-size: 2.5rem; letter-spacing: -0.04em; line-height: 1.05; text-transform: none; color: #ebe8db; margin-bottom: 0.375rem; }
          .dc-lines { min-height: 7rem; align-items: end; }
        }
      `}</style>
    </section>
  )
}
