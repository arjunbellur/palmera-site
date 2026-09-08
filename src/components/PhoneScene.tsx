'use client'
// The phone scene — the site's centrepiece. One pinned device, five real
// screens captured from the live app, crossfading through the booking story
// as you scroll: discover → the listing → plan together → pay → your ticket.
// The device drifts in perspective between beats (3D, never flat tilt), the
// screens crossfade, the captions swap — all on one GSAP timeline scrubbed
// by ScrollTrigger, which reads Lenis. One clock for everything.
import { useLayoutEffect, useRef } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { AppStoreBadge } from './AppStoreBadge'

// Per beat: the device's resting pose in perspective — yaw (rotateY), pitch
// (rotateX), lateral drift, and scale. Poses alternate sides so the scene
// breathes; the last beat squares up to present the ticket.
const BEATS = [
  { src: '/images/app/real/01-discover.webp', t: 'b1t', d: 'b1d', yaw: -7, pitch: 3,  x: 4,  z: -60, s: 1 },
  { src: '/images/app/real/02-listing.webp',  t: 'b2t', d: 'b2d', yaw: 5,  pitch: -2, x: -3, z: 30,  s: 1 },
  { src: '/images/app/real/03-group.webp',    t: 'b3t', d: 'b3d', yaw: -6, pitch: 2,  x: 3,  z: -20, s: 1 },
  { src: '/images/app/real/04-checkout.webp', t: 'b4t', d: 'b4d', yaw: 6,  pitch: -3, x: -4, z: 40,  s: 1 },
  { src: '/images/app/real/05-ticket.webp',   t: 'b5t', d: 'b5d', yaw: 0,  pitch: 0,  x: 0,  z: 70,  s: 1 },
] as const
const TAN = 'hsla(36.84,47.11%,76.27%,1)'

export default function PhoneScene() {
  const t = useTranslations('how')
  const sectionRef = useRef<HTMLElement>(null)
  const phoneRef = useRef<HTMLDivElement>(null)
  const glowRef = useRef<HTMLDivElement>(null)
  const shadowRef = useRef<HTMLDivElement>(null)
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
      const pose = (b: (typeof BEATS)[number]) => ({ rotateY: b.yaw, rotateX: b.pitch, xPercent: b.x, z: b.z, scale: b.s })

      gsap.set(screens.slice(1), { opacity: 0 })
      gsap.set(caps.slice(1), { opacity: 0, y: 18 })
      gsap.set(dots, { scaleX: 0.35, opacity: 0.35 })
      gsap.set(dots[0], { scaleX: 1, opacity: 1 })
      gsap.set(phone, pose(BEATS[0]))

      // Entrance: the device rises and settles into its first pose.
      gsap.from(phone, { y: 100, opacity: 0, rotateY: -22, z: -220, duration: 1.5, ease: 'power3.out',
        scrollTrigger: { trigger: section, start: 'top 75%', once: true } })

      // The scrubbed story: one unit per beat, each a viewport of scroll.
      const tl = gsap.timeline({
        scrollTrigger: { trigger: section, start: 'top top', end: `+=${BEATS.length * 100}%`, pin: true, scrub: reduced ? false : 0.9, anticipatePin: 1 },
      })
      for (let i = 1; i < BEATS.length; i++) {
        tl.to(phone, { ...pose(BEATS[i]), duration: 1, ease: 'power2.inOut' }, i - 0.5)
          .to(screens[i - 1], { opacity: 0, duration: 0.5, ease: 'none' }, i - 0.1)
          .to(screens[i], { opacity: 1, duration: 0.5, ease: 'none' }, i - 0.1)
          .to(caps[i - 1], { opacity: 0, y: -14, duration: 0.35, ease: 'power2.in' }, i - 0.2)
          .to(caps[i], { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' }, i + 0.15)
          .to(dots[i - 1], { scaleX: 0.35, opacity: 0.35, duration: 0.3 }, i)
          .to(dots[i], { scaleX: 1, opacity: 1, duration: 0.3 }, i)
        if (glowRef.current) tl.to(glowRef.current, { xPercent: -BEATS[i].x * 3, scale: 1 + BEATS[i].z / 400, duration: 1, ease: 'power2.inOut' }, i - 0.5)
        if (shadowRef.current) tl.to(shadowRef.current, { xPercent: BEATS[i].yaw * 1.4, scaleX: 1 - Math.abs(BEATS[i].yaw) / 60, opacity: 0.55 - BEATS[i].z / 600, duration: 1, ease: 'power2.inOut' }, i - 0.5)
      }
      tl.to({}, { duration: 0.7 }) // hold the ticket before the pin releases

      // Idle life: a slow float on top of the scrubbed pose, so the device is
      // never perfectly still even when the reader stops scrolling.
      if (!reduced && window.innerWidth >= 760) gsap.to(phone, { y: '+=8', duration: 3.4, ease: 'sine.inOut', yoyo: true, repeat: -1 })
    }, section)
    return () => ctx.revert()
  }, [])

  return (
    <section id="story" ref={sectionRef} style={{ position: 'relative', height: '100svh', minHeight: '40rem', background: 'transparent', overflow: 'hidden' }}>
      <div className="ps-grid" style={{ height: '100%', maxWidth: '84rem', margin: '0 auto', padding: 'clamp(4.5rem,7vh,6rem) clamp(1.25rem,4.5vw,2.5rem) clamp(1.25rem,3vh,2.5rem)', boxSizing: 'border-box' }}>
        {/* Copy column */}
        <div className="ps-copy" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 'clamp(1.25rem,3vh,2.5rem)', minWidth: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
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
        {/* Stage — perspective lives here so the device rotates in real 3D */}
        <div className="ps-stage" style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 0, perspective: '1000px', transformStyle: 'preserve-3d' }}>
          <div ref={glowRef} aria-hidden style={{ position: 'absolute', width: '70%', aspectRatio: '1', borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(223,201,166,0.22), rgba(223,201,166,0) 70%)', filter: 'blur(10px)', pointerEvents: 'none' }} />
          <div ref={shadowRef} aria-hidden style={{ position: 'absolute', bottom: '4%', width: '46%', height: '6%', borderRadius: '50%', background: 'rgba(0,0,0,0.6)', filter: 'blur(18px)', opacity: 0.55, pointerEvents: 'none' }} />
          <div ref={phoneRef} className="ps-phone" style={{ position: 'relative', height: 'min(85svh, 56rem)', aspectRatio: '650 / 1444', borderRadius: 'clamp(2rem,4.6vw,3.5rem)', padding: 'clamp(0.4rem,0.6vw,0.6rem)', background: 'linear-gradient(160deg, #1a2430, #0b1119 55%, #141c26)', boxShadow: '0 0 0 1px rgba(235,232,219,0.2), 0 3.5rem 7rem rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,255,255,0.06)', transformStyle: 'preserve-3d', willChange: 'transform' }}>
            {/* Back plate — the device's thickness; only visible as it turns */}
            <div aria-hidden style={{ position: 'absolute', inset: '-1px', borderRadius: 'inherit', background: 'linear-gradient(160deg, #0e141c, #05080c)', transform: 'translateZ(-14px)', boxShadow: '0 0 0 1px rgba(0,0,0,0.6)' }} />
            <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: 'clamp(1.6rem,4vw,2.95rem)', overflow: 'hidden', background: '#0D2136', transform: 'translateZ(1px)' }}>
              {BEATS.map((b, i) => (
                <div key={b.src} ref={(el) => { screenRefs.current[i] = el }} style={{ position: 'absolute', inset: 0, willChange: 'opacity' }}>
                  <Image src={b.src} alt="" fill sizes="(max-width: 760px) 70vw, 30rem" priority={i < 2} style={{ objectFit: 'cover' }} />
                </div>
              ))}
              {/* Glass sheen that slides as the device turns */}
              <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(115deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 32%, rgba(255,255,255,0) 68%, rgba(255,255,255,0.05) 100%)', pointerEvents: 'none' }} />
            </div>
          </div>
        </div>
      </div>
      <style>{`
        .ps-grid { display: grid; grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr); gap: clamp(2rem, 4vw, 5rem); align-items: center; }
        @media (max-width: 760px) {
          .ps-grid { grid-template-columns: 1fr; grid-template-rows: auto minmax(0, 1fr); gap: 1.25rem; align-items: start; }
          .ps-stage { order: -1; align-items: center; height: 52svh; perspective: 800px; }
          .ps-phone { height: 46svh !important; }
          .ps-copy { justify-content: flex-start; }
          .ps-copy { gap: 0.875rem; }
          .ps-copy h2 { display: none; }
          .ps-caps { min-height: 6rem; }
          .ps-cta { display: none; }
        }
      `}</style>
    </section>
  )
}
