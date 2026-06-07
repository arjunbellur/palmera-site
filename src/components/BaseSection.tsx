'use client'

import { useEffect, useRef } from 'react'

// Architecture:
// - Outer div: 500vh tall, overflow:hidden, bg-1
// - Sticky inner: 100vh, holds the centered text + floating images
// - Text: position absolute center, each pillar revealed via clip-path wipe on scroll
// - Images: absolute positioned, move upward via translateY as scroll progresses

const PILLARS = [
  { label: 'Discover', text: 'Curated places, moments' },
  { label: 'Gather', text: 'Effortless group planning' },
  { label: 'Reserve', text: 'Seamless bookings, split payments' },
  { label: 'Commit', text: 'Plans without friction' },
]

const PHOTOS = [
  { src: '/images/bruno-ngarukiye-2qCs8eel2qI-unsplash.jpg', top: 80, left: 60, w: 300, h: 300, speed: 0.4 },
  { src: '/images/priscilla-du-preez-W3SEyZODn8U-unsplash-min.jpg', top: 120, right: 80, w: 220, h: 280, speed: 0.55 },
  { src: '/images/upgraded-points-uu5Z7cx2PdA-unsplash.jpg', top: 350, left: 340, w: 180, h: 180, speed: 0.3 },
  { src: '/images/bas-van-den-eijkhof-w_O7qjB9ZVY-unsplash.jpg', top: 600, left: 80, w: 320, h: 320, speed: 0.45 },
  { src: '/images/aliunix-NI265AcvQZs-unsplash-1.jpg', top: 520, right: 60, w: 300, h: 300, speed: 0.6 },
  { src: '/images/konrad-bachusz--tpKv0goE94-unsplash.jpg', top: 900, left: 100, w: 280, h: 280, speed: 0.35 },
  { src: '/images/chaz-mcgregor-THXYw7ysYus-unsplash.jpg', top: 820, right: 200, w: 200, h: 200, speed: 0.5 },
  { src: '/images/ron-mcclenny-iqUSpwmvnw8-unsplash.jpg', top: 1100, left: 200, w: 380, h: 220, speed: 0.4 },
  { src: '/images/gilles-de-muynck-PtJDCD4fTI4-unsplash.jpg', top: 1200, right: 100, w: 240, h: 240, speed: 0.55 },
  { src: '/images/redcharlie-nf7W_hn6DKQ-unsplash-min.jpg', top: 1400, left: 60, w: 300, h: 300, speed: 0.3 },
  { src: '/images/haven-xie-IoTTc6Z5lTM-unsplash.jpg', top: 1350, right: 300, w: 220, h: 280, speed: 0.45 },
  { src: '/images/ed-wingate-ZMIdqdsbP2U-unsplash-min.jpg', top: 1600, left: 400, w: 200, h: 200, speed: 0.5 },
]

export default function BaseSection() {
  const outerRef = useRef<HTMLDivElement>(null)
  const photoRefs = useRef<(HTMLDivElement | null)[]>([])
  const pillarRefs = useRef<(HTMLDivElement | null)[]>([])
  const labelRefs = useRef<(HTMLDivElement | null)[]>([])
  const introRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onScroll = () => {
      if (!outerRef.current) return
      const rect = outerRef.current.getBoundingClientRect()
      const totalScroll = outerRef.current.offsetHeight - window.innerHeight
      const scrolled = Math.max(0, -rect.top)
      const progress = Math.min(1, scrolled / totalScroll)

      // Parallax photos — each moves up at its own speed
      photoRefs.current.forEach((el, i) => {
        if (!el) return
        const shift = scrolled * PHOTOS[i].speed * -1
        el.style.transform = `translateY(${shift}px)`
      })

      // Fade out intro text quickly
      if (introRef.current) {
        introRef.current.style.opacity = String(Math.max(0, 1 - progress * 12))
      }

      // Determine which pillar is active (0-3)
      // First 10% = before pillars, then 4 equal segments
      const pillarProgress = Math.max(0, (progress - 0.08) / 0.88)
      const activeIndex = Math.min(3, Math.floor(pillarProgress * 4))
      const withinPillar = (pillarProgress * 4) % 1 // 0-1 within current pillar

      // Reveal each pillar with a clip-path wipe from bottom
      pillarRefs.current.forEach((el, i) => {
        if (!el) return
        if (i < activeIndex) {
          // Past pillars — fully revealed but fading
          el.style.clipPath = 'inset(0% 0% 0% 0%)'
          el.style.opacity = i === activeIndex - 1 ? String(Math.max(0, 1 - withinPillar * 3)) : '0'
        } else if (i === activeIndex) {
          // Current pillar — clip wipe from bottom
          const reveal = Math.min(1, withinPillar < 0.3 ? withinPillar / 0.3 : 1)
          const pct = Math.round((1 - reveal) * 100)
          el.style.clipPath = `inset(0% 0% ${pct}% 0%)`
          el.style.opacity = '1'
        } else {
          // Future pillars — hidden
          el.style.clipPath = 'inset(0% 0% 100% 0%)'
          el.style.opacity = '0'
        }
      })

      // Labels follow same logic but just fade
      labelRefs.current.forEach((el, i) => {
        if (!el) return
        el.style.opacity = i === activeIndex ? '1' : '0'
        el.style.transition = 'opacity 0.4s ease'
      })
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <section
      id="base"
      ref={outerRef}
      style={{
        position: 'relative',
        height: '500vh',
        background: 'var(--bg-1)',
        borderTopLeftRadius: '24px',
        borderTopRightRadius: '24px',
        zIndex: 1,
      }}
    >
      {/* Sticky viewport container */}
      <div style={{
        position: 'sticky',
        top: 0,
        height: '100vh',
        overflow: 'hidden',
        width: '100%',
      }}>

        {/* Floating photos layer — behind text */}
        {PHOTOS.map((photo, i) => (
          <div
            key={i}
            ref={el => { photoRefs.current[i] = el }}
            style={{
              position: 'absolute',
              top: photo.top,
              left: (photo as any).left !== undefined ? (photo as any).left : 'auto',
              right: (photo as any).right !== undefined ? (photo as any).right : 'auto',
              width: photo.w,
              height: photo.h,
              borderRadius: '10px',
              overflow: 'hidden',
              willChange: 'transform',
              zIndex: 1,
            }}
          >
            <img src={photo.src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </div>
        ))}

        {/* Intro text — fades as scroll begins */}
        <div
          ref={introRef}
          style={{
            position: 'absolute',
            top: '80px',
            left: '40px',
            right: '40px',
            zIndex: 3,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '48px',
          }}
        >
          <p style={{ fontFamily: 'Geist Mono Variable, Courier New, monospace', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(42,33,25,0.6)', lineHeight: 1.7, margin: 0 }}>
            Ease into a space where plans feel lighter and moments feel shared.
          </p>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(18px, 2.2vw, 26px)', lineHeight: 1.45, color: 'var(--color-dark)', margin: 0, fontWeight: 400 }}>
            Somewhere between plans and presence, we found experiences worth sharing—intentional, effortless, and designed to linger.
          </p>
        </div>

        {/* Center text stage — pillars stack here */}
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 4,
          pointerEvents: 'none',
          padding: '0 40px',
        }}>
          {/* Label above heading */}
          <div style={{ position: 'relative', height: '24px', width: '100%', textAlign: 'center', marginBottom: '16px' }}>
            {PILLARS.map((p, i) => (
              <div
                key={p.label}
                ref={el => { labelRefs.current[i] = el }}
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: 0,
                  transition: 'opacity 0.35s ease',
                }}
              >
                <span style={{
                  fontFamily: 'Geist Mono Variable, Courier New, monospace',
                  fontSize: '11px',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: 'var(--accent-3)',
                }}>
                  {p.label}
                </span>
              </div>
            ))}
          </div>

          {/* Heading — all 4 stack, clip-path reveals them */}
          <div style={{ position: 'relative', width: '100%', textAlign: 'center' }}>
            {PILLARS.map((p, i) => (
              <div
                key={p.text}
                ref={el => { pillarRefs.current[i] = el }}
                style={{
                  position: i === 0 ? 'relative' : 'absolute',
                  inset: 0,
                  clipPath: 'inset(0% 0% 100% 0%)',
                  opacity: 0,
                  transition: 'opacity 0.3s ease',
                }}
              >
                <h2 style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 'clamp(52px, 7.5vw, 100px)',
                  fontWeight: 400,
                  letterSpacing: '-2px',
                  lineHeight: 1.05,
                  color: 'var(--color-dark)',
                  margin: 0,
                }}>
                  {p.text}
                </h2>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  )
}
