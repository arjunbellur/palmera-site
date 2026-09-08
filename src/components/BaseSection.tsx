'use client'
// The photo field — the site's statement section. Pinned; four beats
// (Discover · Gather · Reserve · Commit) crossfade in the centre while a
// field of REAL listing photos drifts past on parallax, a different set per
// beat. Same GSAP/ScrollTrigger clock as the phone scene.
import { useLayoutEffect, useRef } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

// Three size tiers (L / M / S) and three lanes (edge / mid / inner). Speed is
// the parallax factor — bigger moves slower, the way depth reads.
type Photo = { src: string; beat: number; top: string; left?: string; right?: string; w: string; h: string; speed: number; mTop?: string; mW?: string; mH?: string }
const PHOTOS: Photo[] = [
  // Beat 0 — Discover
  { src: '/images/listings/yacht.webp',  beat: 0, top: '30vh', left: '3vw',   w: 'clamp(140px,26vw,420px)', h: 'clamp(110px,18vw,300px)', speed: 0.10, mTop: '10vh', mW: '40vw', mH: '27vw' },
  { src: '/images/listings/yuma.webp',   beat: 0, top: '24vh', right: '3vw',  w: 'clamp(110px,17vw,270px)', h: 'clamp(120px,19vw,300px)', speed: 0.14, mTop: '68vh', mW: '30vw', mH: '34vw' },
  { src: '/images/listings/ngor.webp',   beat: 0, top: '70vh', left: '18vw',  w: 'clamp(80px,11vw,170px)',  h: 'clamp(60px,8vw,120px)',   speed: 0.06, mTop: '80vh', mW: '24vw', mH: '16vw' },
  // Beat 1 — Gather
  { src: '/images/listings/club.webp',   beat: 1, top: '26vh', left: '2vw',   w: 'clamp(130px,24vw,380px)', h: 'clamp(90px,14vw,230px)',  speed: 0.12, mTop: '12vh', mW: '40vw', mH: '24vw' },
  { src: '/images/listings/gwagon.webp', beat: 1, top: '30vh', right: '3vw',  w: 'clamp(100px,16vw,250px)', h: 'clamp(80px,12vw,190px)',  speed: 0.09, mTop: '70vh', mW: '32vw', mH: '20vw' },
  { src: '/images/listings/beach.webp',  beat: 1, top: '72vh', right: '14vw', w: 'clamp(80px,12vw,180px)',  h: 'clamp(60px,9vw,135px)',   speed: 0.05, mTop: '14vh', mW: '26vw', mH: '18vw' },
  // Beat 2 — Reserve
  { src: '/images/listings/villa.webp',  beat: 2, top: '28vh', left: '4vw',   w: 'clamp(130px,22vw,350px)', h: 'clamp(90px,15vw,235px)',  speed: 0.11, mTop: '11vh', mW: '38vw', mH: '25vw' },
  { src: '/images/listings/spa.webp',    beat: 2, top: '34vh', right: '4vw',  w: 'clamp(110px,18vw,290px)', h: 'clamp(60px,10vw,160px)',  speed: 0.08, mTop: '72vh', mW: '30vw', mH: '17vw' },
  // Beat 3 — Commit
  { src: '/images/listings/padel.webp',  beat: 3, top: '30vh', left: '5vw',   w: 'clamp(110px,18vw,290px)', h: 'clamp(80px,13vw,215px)',  speed: 0.10, mTop: '12vh', mW: '34vw', mH: '25vw' },
  { src: '/images/listings/safari.webp', beat: 3, top: '66vh', right: '5vw',  w: 'clamp(110px,17vw,270px)', h: 'clamp(75px,11vw,180px)',  speed: 0.06, mTop: '70vh', mW: '30vw', mH: '20vw' },
]
const BEATS = 4

export default function BaseSection() {
  const t = useTranslations('base')
  const outerRef = useRef<HTMLElement>(null)
  const photoRefs = useRef<(HTMLDivElement | null)[]>([])
  const headingRefs = useRef<(HTMLDivElement | null)[]>([])
  const labelRefs = useRef<(HTMLDivElement | null)[]>([])
  const introRef = useRef<HTMLDivElement>(null)

  const PILLARS = [
    { label: t('discover'), text: t('discoverText') },
    { label: t('gather'),   text: t('gatherText') },
    { label: t('reserve'),  text: t('reserveText') },
    { label: t('commit'),   text: t('commitText') },
  ]

  useLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger)
    const outer = outerRef.current
    if (!outer) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const ctx = gsap.context(() => {
      const photos = photoRefs.current.filter(Boolean) as HTMLDivElement[]
      const heads = headingRefs.current.filter(Boolean) as HTMLDivElement[]
      const labels = labelRefs.current.filter(Boolean) as HTMLDivElement[]

      // Rest: beat 0 visible.
      photos.forEach((el, i) => gsap.set(el, { opacity: PHOTOS[i].beat === 0 ? 1 : 0, y: 0 }))
      gsap.set(heads.slice(1), { opacity: 0, y: 16 })
      gsap.set(labels.slice(1), { opacity: 0 })

      // Parallax: every photo drifts up at its own speed across the whole pin.
      photos.forEach((el, i) => {
        gsap.to(el, { y: () => -window.innerHeight * PHOTOS[i].speed * (window.innerWidth < 760 ? 0.8 : 1.6), ease: 'none',
          scrollTrigger: { trigger: outer, start: 'top top', end: 'bottom bottom', scrub: true } })
      })

      // Beats: intro fades, then statements + photo groups swap.
      const tl = gsap.timeline({ scrollTrigger: { trigger: outer, start: 'top top', end: 'bottom bottom', scrub: reduced ? false : 0.8 } })
      if (introRef.current) tl.to(introRef.current, { opacity: 0, y: -10, duration: 0.35, ease: 'power1.in' }, 0.15)
      for (let b = 1; b < BEATS; b++) {
        const at = b
        tl.to(heads[b - 1], { opacity: 0, y: -16, duration: 0.3, ease: 'power2.in' }, at - 0.15)
          .to(labels[b - 1], { opacity: 0, duration: 0.2 }, at - 0.15)
          .to(heads[b], { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }, at + 0.15)
          .to(labels[b], { opacity: 1, duration: 0.3 }, at + 0.15)
        photos.forEach((el, i) => {
          if (PHOTOS[i].beat === b - 1) tl.to(el, { opacity: 0, duration: 0.35, ease: 'power1.in' }, at - 0.2)
          if (PHOTOS[i].beat === b) tl.to(el, { opacity: 1, duration: 0.45, ease: 'power1.out' }, at + 0.05)
        })
      }
      tl.to({}, { duration: 0.6 })
    }, outer)
    return () => ctx.revert()
  }, [])

  return (
    <section id="base" ref={outerRef} className="pf-field" style={{ position: 'relative', height: '420vh', background: 'transparent', zIndex: 1 }}>
      <div style={{ position: 'sticky', top: 0, height: '100svh', overflow: 'hidden', width: '100%' }}>
        {PHOTOS.map((p, i) => (
          <div key={p.src + i} ref={el => { photoRefs.current[i] = el }} className="pf-photo"
            style={{ position: 'absolute', top: p.top, ...(p.left ? { left: p.left } : {}), ...(p.right ? { right: p.right } : {}), width: p.w, height: p.h, borderRadius: '0.5rem', overflow: 'hidden', willChange: 'transform, opacity', zIndex: 1, boxShadow: '0 1rem 2.5rem rgba(42,33,25,0.18)',
              ['--m-top' as string]: p.mTop, ['--m-w' as string]: p.mW, ['--m-h' as string]: p.mH } as React.CSSProperties}>
            <Image src={p.src} alt="" fill sizes="(max-width: 900px) 40vw, 26vw" style={{ objectFit: 'cover' }} />
          </div>
        ))}

        <div ref={introRef} className="pf-intro" style={{ position: 'absolute', top: 'clamp(4rem,5.5vw,5.5rem)', left: 'clamp(1.5rem,4.5vw,2.5rem)', right: 'clamp(1.5rem,4.5vw,2.5rem)', zIndex: 5, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'clamp(0.75rem,3.8vw,3rem)' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(42,33,25,0.72)', lineHeight: 1.7, margin: 0, maxWidth: '24rem' }}>{t('intro1')}</p>
          <p className="pf-intro2" style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(1rem,1.6vw,1.25rem)', lineHeight: 1.6, color: 'rgba(42,33,25,0.82)', margin: 0, maxWidth: '32rem', justifySelf: 'end' }}>{t('intro2')}</p>
        </div>

        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 4, pointerEvents: 'none', gap: '1rem' }}>
          <div style={{ position: 'relative', height: '1.5rem', width: '100%', textAlign: 'center' }}>
            {PILLARS.map((p, i) => (
              <div key={p.label} ref={el => { labelRefs.current[i] = el }} style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#9e763b' }}>{p.label}</span>
              </div>
            ))}
          </div>
          <div style={{ position: 'relative', width: '100%', textAlign: 'center', minHeight: 'clamp(5.5rem,9vw,7.5rem)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {PILLARS.map((p, i) => (
              <div key={p.text} ref={el => { headingRefs.current[i] = el }} style={{ position: i === 0 ? 'relative' : 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', willChange: 'opacity, transform' }}>
                <h2 className="pf-h" style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(1.875rem,5vw,4.25rem)', fontWeight: 400, letterSpacing: '-0.09375rem', lineHeight: 1.12, color: 'var(--color-dark)', margin: 0, padding: '0 clamp(1.5rem,4.5vw,2.5rem)', textAlign: 'center', textWrap: 'balance', maxWidth: '18ch' }}>{p.text}</h2>
              </div>
            ))}
          </div>
        </div>
      </div>
      <style>{`
        @media (max-width: 760px) {
          .pf-field { height: 360vh !important; }
          .pf-intro { grid-template-columns: 1fr !important; }
          .pf-intro2 { display: none; }
          .pf-photo { top: var(--m-top) !important; width: var(--m-w) !important; height: var(--m-h) !important; }
          .pf-h { text-shadow: 0 0 20px rgba(240,236,226,0.9), 0 0 40px rgba(240,236,226,0.6); }
        }
      `}</style>
    </section>
  )
}
