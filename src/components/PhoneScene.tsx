'use client'
// The phone scene — the site's centrepiece. One pinned device, five real
// screens captured from the live app, crossfading through the booking story
// as you scroll: discover → the listing → plan together → pay → your ticket.
// The device enters once and then holds still; only the screen and the
// caption change. One GSAP timeline scrubbed by ScrollTrigger (reading Lenis).
import { useLayoutEffect, useRef } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { AppStoreBadge } from './AppStoreBadge'

const BEATS = [
  { src: '/images/app/real/01-discover.webp', t: 'b1t', d: 'b1d' },
  { src: '/images/app/real/02-listing.webp',  t: 'b2t', d: 'b2d' },
  { src: '/images/app/real/03-group.webp',    t: 'b3t', d: 'b3d' },
  { src: '/images/app/real/04-checkout.webp', t: 'b4t', d: 'b4d' },
  { src: '/images/app/real/05-ticket.webp',   t: 'b5t', d: 'b5d' },
] as const
const TAN = 'hsla(36.84,47.11%,76.27%,1)'

export default function PhoneScene() {
  const t = useTranslations('how')
  const sectionRef = useRef<HTMLElement>(null)
  const phoneRef = useRef<HTMLDivElement>(null)
  const screenRefs = useRef<(HTMLDivElement | null)[]>([])
  const capRefs = useRef<(HTMLLIElement | null)[]>([])
  const dotRefs = useRef<(HTMLSpanElement | null)[]>([])

  useLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger)
    const section = sectionRef.current
    const phone = phoneRef.current
    if (!section || !phone) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const ctx = gsap.context(() => {
      const screens = screenRefs.current.filter(Boolean) as HTMLDivElement[]
      const caps = capRefs.current.filter(Boolean) as HTMLLIElement[]
      const dots = dotRefs.current.filter(Boolean) as HTMLSpanElement[]

      gsap.set(screens.slice(1), { opacity: 0, scale: 1.03 })
      gsap.set(caps.slice(1), { opacity: 0, y: 14 })
      gsap.set(dots, { scaleX: 0.35, opacity: 0.35 })
      gsap.set(dots[0], { scaleX: 1, opacity: 1 })

      // The device enters once — a rise and settle — then never moves again.
      if (!reduced) gsap.from(phone, { y: 70, opacity: 0, duration: 1.3, ease: 'power3.out',
        scrollTrigger: { trigger: section, start: 'top 75%', once: true } })

      // The scrubbed story: one unit per beat, each a viewport of scroll. The
      // outgoing screen fades; the incoming one settles from a hair larger.
      const tl = gsap.timeline({
        scrollTrigger: { trigger: section, start: 'top top', end: `+=${BEATS.length * 100}%`, pin: true, scrub: reduced ? false : 0.8, anticipatePin: 1 },
      })
      for (let i = 1; i < BEATS.length; i++) {
        tl.to(screens[i - 1], { opacity: 0, duration: 0.35, ease: 'power1.in' }, i - 0.18)
          .to(screens[i], { opacity: 1, scale: 1, duration: 0.5, ease: 'power2.out' }, i - 0.1)
          .to(caps[i - 1], { opacity: 0, y: -10, duration: 0.3, ease: 'power2.in' }, i - 0.25)
          .to(caps[i], { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' }, i + 0.05)
          .to(dots[i - 1], { scaleX: 0.35, opacity: 0.35, duration: 0.3 }, i)
          .to(dots[i], { scaleX: 1, opacity: 1, duration: 0.3 }, i)
      }
      tl.to({}, { duration: 0.7 }) // hold the ticket before the pin releases
    }, section)
    return () => ctx.revert()
  }, [])

  return (
    <section id="story" ref={sectionRef} style={{ position: 'relative', height: '100svh', minHeight: '40rem', background: '#2a2119', overflow: 'hidden' }}>
      <div className="ps-grid" style={{ height: '100%', maxWidth: '84rem', margin: '0 auto', padding: 'clamp(4.5rem,7vh,6rem) clamp(1.25rem,4.5vw,2.5rem) clamp(1.25rem,3vh,2.5rem)', boxSizing: 'border-box' }}>
        {/* Copy column */}
        <div className="ps-copy" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 'clamp(1.25rem,3vh,2.5rem)', minWidth: 0 }}>
          <div className="ps-head" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: TAN, margin: 0 }}>{t('label')}</p>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(1.625rem,3vw,2.875rem)', fontWeight: 400, letterSpacing: '-0.03em', lineHeight: 1.04, color: '#ebe8db', margin: 0, textWrap: 'balance' }}>{t('heading')}</h2>
          </div>
          <ol className="ps-caps" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', minHeight: '7.5rem' }}>
            {BEATS.map((b, i) => (
              <li key={b.t} ref={(el) => { capRefs.current[i] = el }} style={{ gridArea: '1 / 1', display: 'flex', flexDirection: 'column', gap: '0.5rem', willChange: 'opacity, transform' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', letterSpacing: '0.14em', color: TAN }}>0{i + 1} / 0{BEATS.length}</span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.25rem,1.8vw,1.625rem)', fontWeight: 500, color: '#ebe8db', letterSpacing: '-0.01em' }}>{t(b.t)}</span>
                <span style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(1rem,1.2vw,1.125rem)', lineHeight: 1.5, color: 'rgba(235,232,219,0.7)', maxWidth: '28rem' }}>{t(b.d)}</span>
              </li>
            ))}
          </ol>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '0.375rem' }}>
              {BEATS.map((b, i) => <span key={b.t} ref={(el) => { dotRefs.current[i] = el }} style={{ display: 'block', width: '1.5rem', height: '2px', background: TAN, transformOrigin: 'left center' }} />)}
            </div>
            <div className="ps-cta"><AppStoreBadge variant="light" /></div>
          </div>
        </div>

        {/* Device — drawn like the real thing: titanium band, thin even bezel,
            matched corner radii, side buttons. Sized from height; every part
            is a percentage of the device so it holds at any scale. */}
        <div className="ps-stage" style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 0 }}>
          <div aria-hidden style={{ position: 'absolute', width: '72%', aspectRatio: '1', borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(223,201,166,0.16), rgba(223,201,166,0) 70%)', filter: 'blur(12px)', pointerEvents: 'none' }} />
          <div ref={phoneRef} className="ps-phone" style={{ position: 'relative', height: 'min(84svh, 56rem)', aspectRatio: '650 / 1444', willChange: 'transform' }}>
            {/* side buttons */}
            <div aria-hidden style={{ position: 'absolute', left: '-1.1%', top: '17%', width: '1.1%', height: '3.2%', borderRadius: '2px 0 0 2px', background: 'linear-gradient(90deg, #3a3b3f, #1c1d20)' }} />
            <div aria-hidden style={{ position: 'absolute', left: '-1.1%', top: '23.5%', width: '1.1%', height: '6.2%', borderRadius: '2px 0 0 2px', background: 'linear-gradient(90deg, #3a3b3f, #1c1d20)' }} />
            <div aria-hidden style={{ position: 'absolute', left: '-1.1%', top: '31%', width: '1.1%', height: '6.2%', borderRadius: '2px 0 0 2px', background: 'linear-gradient(90deg, #3a3b3f, #1c1d20)' }} />
            <div aria-hidden style={{ position: 'absolute', right: '-1.1%', top: '26%', width: '1.1%', height: '9.5%', borderRadius: '0 2px 2px 0', background: 'linear-gradient(270deg, #3a3b3f, #1c1d20)' }} />
            {/* band */}
            <div style={{ position: 'absolute', inset: 0, borderRadius: '15.4% / 6.95%', background: 'linear-gradient(160deg, #2b2d31 0%, #141518 40%, #0b0c0e 100%)', boxShadow: '0 0 0 1px rgba(255,255,255,0.10), inset 0 0 0 1px rgba(0,0,0,0.7), 0 3rem 6rem rgba(0,0,0,0.55), 0 0.75rem 1.5rem rgba(0,0,0,0.35)' }} />
            {/* bezel + screen */}
            <div style={{ position: 'absolute', inset: '1.55% 2.9%', borderRadius: '13.4% / 6.15%', background: '#000', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06)' }}>
              <div style={{ position: 'absolute', inset: '1.9% 2.6%', borderRadius: '11.6% / 5.35%', overflow: 'hidden', background: '#0D2136' }}>
                {BEATS.map((b, i) => (
                  <div key={b.src} ref={(el) => { screenRefs.current[i] = el }} style={{ position: 'absolute', inset: 0, willChange: 'opacity, transform' }}>
                    <Image src={b.src} alt="" fill sizes="(max-width: 760px) 70vw, 30rem" priority={i < 2} style={{ objectFit: 'cover' }} />
                  </div>
                ))}
                <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(118deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0) 28%)', pointerEvents: 'none' }} />
              </div>
            </div>
          </div>
        </div>
      </div>
      <style>{`
        .ps-grid { display: grid; grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr); gap: clamp(2rem, 4vw, 5rem); align-items: center; }
        @media (max-width: 760px) {
          /* Phone in the top row, copy pinned to the bottom of the viewport */
          .ps-grid { grid-template-columns: 1fr; grid-template-rows: minmax(0, 1fr) auto; gap: 1rem; align-items: stretch; padding-bottom: calc(1.25rem + env(safe-area-inset-bottom)) !important; }
          .ps-stage { order: -1; align-items: center; }
          .ps-phone { height: min(100%, 50svh) !important; }
          .ps-copy { justify-content: flex-end; gap: 0.875rem; }
          .ps-head { display: none; }
          .ps-caps { min-height: 5.5rem; }
          .ps-cta { display: none; }
        }
      `}</style>
    </section>
  )
}
