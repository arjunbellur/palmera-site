'use client'

import { useEffect, useRef } from 'react'

// Architecture matching live Webflow site:
// - 400vh outer container, bg-1, border-radius top
// - Sticky 100vh inner
// - Center text: label fades, heading cross-fades smoothly between 4 pillars
// - Images float: absolutely positioned, move upward as scroll progresses
// - All transitions use cubic-bezier easing, not linear/clip-path

const PILLARS = [
  { label: 'Discover', text: 'Curated places, moments' },
  { label: 'Gather', text: 'Effortless group planning' },
  { label: 'Reserve', text: 'Seamless bookings, split payments' },
  { label: 'Commit', text: 'Plans without friction' },
]

const PHOTOS = [
  { src: '/images/bas-van-den-eijkhof-w_O7qjB9ZVY-unsplash.jpg',   top: 60,   left: 40,   w: 300, h: 300, speed: 0.35 },
  { src: '/images/priscilla-du-preez-W3SEyZODn8U-unsplash-min.jpg', top: 80,   right: 60,  w: 240, h: 300, speed: 0.5  },
  { src: '/images/upgraded-points-uu5Z7cx2PdA-unsplash.jpg',        top: 380,  left: 320,  w: 180, h: 180, speed: 0.25 },
  { src: '/images/aliunix-NI265AcvQZs-unsplash-1.jpg',              top: 420,  right: 40,  w: 280, h: 280, speed: 0.55 },
  { src: '/images/konrad-bachusz--tpKv0goE94-unsplash.jpg',         top: 650,  left: 60,   w: 260, h: 260, speed: 0.3  },
  { src: '/images/chaz-mcgregor-THXYw7ysYus-unsplash.jpg',          top: 700,  right: 180, w: 200, h: 200, speed: 0.45 },
  { src: '/images/ron-mcclenny-iqUSpwmvnw8-unsplash.jpg',           top: 920,  left: 160,  w: 360, h: 220, speed: 0.4  },
  { src: '/images/gilles-de-muynck-PtJDCD4fTI4-unsplash.jpg',       top: 980,  right: 80,  w: 240, h: 240, speed: 0.5  },
  { src: '/images/redcharlie-nf7W_hn6DKQ-unsplash-min.jpg',         top: 1200, left: 50,   w: 280, h: 280, speed: 0.3  },
  { src: '/images/haven-xie-IoTTc6Z5lTM-unsplash.jpg',              top: 1240, right: 260, w: 220, h: 280, speed: 0.45 },
  { src: '/images/ed-wingate-ZMIdqdsbP2U-unsplash-min.jpg',         top: 1460, left: 380,  w: 200, h: 200, speed: 0.55 },
  { src: '/images/bruno-ngarukiye-2qCs8eel2qI-unsplash.jpg',        top: 320,  left: 80,   w: 260, h: 260, speed: 0.2  },
]

export default function BaseSection() {
  const outerRef = useRef<HTMLDivElement>(null)
  const photoRefs = useRef<(HTMLDivElement | null)[]>([])
  const headingRefs = useRef<(HTMLDivElement | null)[]>([])
  const labelRefs = useRef<(HTMLDivElement | null)[]>([])
  const introRef = useRef<HTMLDivElement>(null)
  const lastIndex = useRef(-1)

  useEffect(() => {
    let rafId: number
    let lastScrollY = -1

    const update = () => {
      if (!outerRef.current) return
      const scrollY = window.scrollY
      if (scrollY === lastScrollY) return
      lastScrollY = scrollY

      const rect = outerRef.current.getBoundingClientRect()
      const totalScroll = outerRef.current.offsetHeight - window.innerHeight
      const scrolled = Math.max(0, -rect.top)
      const progress = Math.min(1, scrolled / totalScroll)

      // Parallax photos — smooth upward float
      photoRefs.current.forEach((el, i) => {
        if (!el) return
        const shift = scrolled * PHOTOS[i].speed * -1
        el.style.transform = `translateY(${shift}px)`
      })

      // Fade intro text
      if (introRef.current) {
        const opacity = Math.max(0, 1 - progress * 15)
        introRef.current.style.opacity = String(opacity)
      }

      // Which pillar: starts after 8% scroll, ends at 95%
      const pillarProgress = Math.max(0, Math.min(1, (progress - 0.08) / 0.87))
      const rawIndex = pillarProgress * 4
      const activeIndex = Math.min(3, Math.floor(rawIndex))
      const withinPillar = rawIndex - Math.floor(rawIndex)

      // Smooth cross-fade between pillars
      headingRefs.current.forEach((el, i) => {
        if (!el) return
        let opacity = 0
        if (i === activeIndex) {
          // Fade in on entry, fade out on exit
          if (i < 3) {
            opacity = withinPillar < 0.75 ? Math.min(1, withinPillar / 0.2) : Math.max(0, 1 - (withinPillar - 0.75) / 0.2)
          } else {
            opacity = Math.min(1, withinPillar / 0.2 + (activeIndex === 3 ? 1 : 0))
          }
        }
        el.style.opacity = String(opacity)
        el.style.transform = `translateY(${(1 - opacity) * 16}px)`
      })

      labelRefs.current.forEach((el, i) => {
        if (!el) return
        el.style.opacity = i === activeIndex ? '1' : '0'
      })
    }

    const onScroll = () => {
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(update)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    update()
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(rafId)
    }
  }, [])

  return (
    <section
      id="base"
      ref={outerRef}
      style={{
        position: 'relative',
        height: '400vh',
        background: 'var(--bg-1)',
        borderTopLeftRadius: '24px',
        borderTopRightRadius: '24px',
        zIndex: 1,
      }}
    >
      <div style={{
        position: 'sticky',
        top: 0,
        height: '100vh',
        overflow: 'hidden',
        width: '100%',
      }}>

        {/* Floating photos */}
        {PHOTOS.map((photo, i) => (
          <div
            key={i}
            ref={el => { photoRefs.current[i] = el }}
            style={{
              position: 'absolute',
              top: photo.top,
              ...((photo as any).left !== undefined ? { left: (photo as any).left } : {}),
              ...((photo as any).right !== undefined ? { right: (photo as any).right } : {}),
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

        {/* Intro text — fades out on scroll start */}
        <div ref={introRef} style={{
          position: 'absolute',
          top: '80px',
          left: '40px',
          right: '40px',
          zIndex: 3,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '48px',
          transition: 'opacity 0.1s',
        }}>
          <p style={{ fontFamily: 'Geist Mono Variable, Courier New, monospace', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(42,33,25,0.7)', lineHeight: 1.7, margin: 0 }}>
            Ease into a space where plans feel lighter and moments feel shared.
          </p>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(16px, 2vw, 22px)', lineHeight: 1.5, color: 'rgba(42,33,25,0.8)', margin: 0, fontWeight: 400 }}>
            Somewhere between plans and presence, we found experiences worth sharing—intentional, effortless, and designed to linger.
          </p>
        </div>

        {/* Center pillar text */}
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 4,
          pointerEvents: 'none',
        }}>
          {/* Label */}
          <div style={{ position: 'relative', height: '20px', width: '100%', textAlign: 'center', marginBottom: '12px' }}>
            {PILLARS.map((p, i) => (
              <div key={p.label} ref={el => { labelRefs.current[i] = el }}
                style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.5s cubic-bezier(0.25,0.46,0.45,0.94)' }}>
                <span style={{ fontFamily: 'Geist Mono Variable, Courier New, monospace', fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#9e763b' }}>
                  {p.label}
                </span>
              </div>
            ))}
          </div>

          {/* Heading — cross-fades */}
          <div style={{ position: 'relative', width: '100%', textAlign: 'center', minHeight: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {PILLARS.map((p, i) => (
              <div key={p.text} ref={el => { headingRefs.current[i] = el }}
                style={{
                  position: i === 0 ? 'relative' : 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: 0,
                  transform: 'translateY(16px)',
                  transition: 'opacity 0.6s cubic-bezier(0.25,0.46,0.45,0.94), transform 0.6s cubic-bezier(0.25,0.46,0.45,0.94)',
                  willChange: 'opacity, transform',
                }}
              >
                <h2 style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 'clamp(36px, 5vw, 64px)',
                  fontWeight: 400,
                  letterSpacing: '-1.5px',
                  lineHeight: 1.1,
                  color: 'var(--color-dark)',
                  margin: 0,
                  padding: '0 40px',
                  textAlign: 'center',
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
