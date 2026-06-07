'use client'

import { useEffect, useRef, useState } from 'react'

// The live Webflow site uses a sticky scroll section:
// - Outer container: very tall (400vh)
// - Inner text block: position sticky, centered vertically
// - 4 pillars cycle as you scroll through the container
// - Photos float absolutely in the background, parallax on scroll

const PILLARS = [
  { label: 'Discover', text: 'Curated places, moments' },
  { label: 'Gather', text: 'Effortless group planning' },
  { label: 'Reserve', text: 'Seamless bookings, split payments' },
  { label: 'Commit', text: 'Plans without friction' },
]

const PHOTOS = [
  { src: '/images/bruno-ngarukiye-2qCs8eel2qI-unsplash.jpg', top: '8%', left: '5%', w: 280, h: 280, speed: 0.15 },
  { src: '/images/priscilla-du-preez-W3SEyZODn8U-unsplash-min.jpg', top: '5%', right: '8%', w: 220, h: 264, speed: 0.2 },
  { src: '/images/upgraded-points-uu5Z7cx2PdA-unsplash.jpg', top: '30%', left: '25%', w: 180, h: 180, speed: 0.1 },
  { src: '/images/bas-van-den-eijkhof-w_O7qjB9ZVY-unsplash.jpg', top: '45%', left: '6%', w: 300, h: 300, speed: 0.18 },
  { src: '/images/aliunix-NI265AcvQZs-unsplash-1.jpg', top: '40%', right: '5%', w: 290, h: 290, speed: 0.22 },
  { src: '/images/konrad-bachusz--tpKv0goE94-unsplash.jpg', top: '60%', left: '8%', w: 260, h: 260, speed: 0.12 },
  { src: '/images/chaz-mcgregor-THXYw7ysYus-unsplash.jpg', top: '62%', right: '12%', w: 180, h: 180, speed: 0.25 },
  { src: '/images/ed-wingate-ZMIdqdsbP2U-unsplash-min.jpg', top: '75%', left: '18%', w: 160, h: 160, speed: 0.14 },
  { src: '/images/ron-mcclenny-iqUSpwmvnw8-unsplash.jpg', top: '78%', right: '20%', w: 320, h: 190, speed: 0.16 },
  { src: '/images/gilles-de-muynck-PtJDCD4fTI4-unsplash.jpg', top: '85%', left: '10%', w: 160, h: 160, speed: 0.2 },
  { src: '/images/redcharlie-nf7W_hn6DKQ-unsplash-min.jpg', top: '88%', right: '6%', w: 280, h: 280, speed: 0.13 },
  { src: '/images/haven-xie-IoTTc6Z5lTM-unsplash.jpg', top: '20%', right: '30%', w: 200, h: 240, speed: 0.17 },
]

export default function BaseSection() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [scrollProgress, setScrollProgress] = useState(0)
  const photoRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const containerHeight = containerRef.current.offsetHeight - window.innerHeight
      const scrolled = -rect.top
      const progress = Math.max(0, Math.min(1, scrolled / containerHeight))
      setScrollProgress(progress)

      // Which pillar is active based on scroll progress
      const idx = Math.min(3, Math.floor(progress * 4))
      setActiveIndex(idx)

      // Parallax each photo
      photoRefs.current.forEach((el, i) => {
        if (!el) return
        const speed = PHOTOS[i].speed
        el.style.transform = `translateY(${scrolled * speed * -1}px)`
      })
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <section
      id="base"
      ref={containerRef}
      style={{
        position: 'relative',
        height: '450vh', // tall enough to scroll through all 4 pillars
        background: 'var(--bg-1)',
        borderTopLeftRadius: '24px',
        borderTopRightRadius: '24px',
        overflow: 'hidden',
        zIndex: 1,
      }}
    >
      {/* Floating photos — absolutely positioned, parallax via JS */}
      {PHOTOS.map((photo, i) => (
        <div
          key={i}
          ref={el => { photoRefs.current[i] = el }}
          style={{
            position: 'absolute',
            top: photo.top,
            left: (photo as any).left,
            right: (photo as any).right,
            width: photo.w,
            height: photo.h,
            borderRadius: '8px',
            overflow: 'hidden',
            willChange: 'transform',
            zIndex: 1,
          }}
        >
          <img src={photo.src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        </div>
      ))}

      {/* Sticky text block */}
      <div style={{
        position: 'sticky',
        top: 0,
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2,
        pointerEvents: 'none',
      }}>
        {/* Intro text — fades out as scroll begins */}
        <div style={{
          position: 'absolute',
          top: '80px',
          left: '40px',
          right: '40px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '48px',
          opacity: Math.max(0, 1 - scrollProgress * 8),
          transition: 'opacity 0.1s',
        }}>
          <p style={{
            fontFamily: 'Geist Mono Variable, Courier New, monospace',
            fontSize: '11px',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'rgba(42,33,25,0.6)',
            lineHeight: 1.7,
            margin: 0,
          }}>
            Ease into a space where plans feel lighter and moments feel shared.
          </p>
          <p style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(18px, 2.5vw, 28px)',
            lineHeight: 1.4,
            color: 'var(--color-dark)',
            margin: 0,
            fontWeight: 400,
          }}>
            Somewhere between plans and presence, we found experiences worth sharing—intentional, effortless, and designed to linger.
          </p>
        </div>

        {/* Active pillar — centered, large */}
        <div style={{ textAlign: 'center', padding: '0 40px', maxWidth: '900px' }}>
          <p style={{
            fontFamily: 'Geist Mono Variable, Courier New, monospace',
            fontSize: '11px',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: 'var(--accent-3)',
            marginBottom: '16px',
            opacity: scrollProgress > 0.05 ? 1 : 0,
            transition: 'opacity 0.4s ease',
          }}>
            {PILLARS[activeIndex].label}
          </p>
          <h2 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(48px, 7vw, 96px)',
            fontWeight: 400,
            letterSpacing: '-2px',
            lineHeight: 1,
            color: 'var(--color-dark)',
            margin: 0,
            opacity: scrollProgress > 0.05 ? 1 : 0,
            transition: 'opacity 0.4s ease',
          }}>
            {PILLARS[activeIndex].text}
          </h2>
        </div>

        {/* Scroll progress dots */}
        <div style={{
          position: 'absolute',
          bottom: '48px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: '8px',
          opacity: scrollProgress > 0.05 ? 1 : 0,
          transition: 'opacity 0.4s',
        }}>
          {PILLARS.map((_, i) => (
            <div key={i} style={{
              width: i === activeIndex ? '24px' : '8px',
              height: '4px',
              borderRadius: '2px',
              background: i === activeIndex ? 'var(--accent-3)' : 'rgba(42,33,25,0.2)',
              transition: 'all 0.3s ease',
            }} />
          ))}
        </div>
      </div>
    </section>
  )
}
