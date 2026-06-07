'use client'

import { useEffect, useRef } from 'react'

// Scroll image layout mirrors the exact Webflow CSS class positions:
// scroll-image-large: 356x356px
// scroll-image-small: 12.986vw square
// scroll-image-vertical: 269x323px
// scroll-image-horizontall: wide

const PILLARS = [
  { label: 'Discover', text: 'Curated places, moments' },
  { label: 'Gather', text: 'Effortless group planning' },
  { label: 'Reserve', text: 'Seamless bookings, split payments' },
  { label: 'Commit', text: 'Plans without friction' },
]

export default function BaseSection() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const imagesRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleScroll = () => {
      if (!sectionRef.current || !imagesRef.current) return
      const rect = sectionRef.current.getBoundingClientRect()
      const progress = Math.max(0, Math.min(1, -rect.top / (rect.height - window.innerHeight)))
      // Parallax shift on images container
      imagesRef.current.style.transform = `translateY(${progress * -80}px)`
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <section
      id="base"
      ref={sectionRef}
      style={{
        background: 'var(--bg-1)',
        borderTopLeftRadius: '24px',
        borderTopRightRadius: '24px',
        paddingTop: '80px',
        paddingBottom: '120px',
        overflow: 'hidden',
        position: 'relative',
        zIndex: 1,
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px' }}>

        {/* Top two-col text */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '48px',
          marginBottom: '80px',
          alignItems: 'start',
        }}>
          <p className="label" style={{ color: 'rgba(42,33,25,0.7)', lineHeight: 1.7, fontSize: '0.75em', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Ease into a space where plans feel lighter and moments feel shared.
          </p>
          <p style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(20px, 3vw, 32px)',
            lineHeight: 1.3,
            color: 'var(--color-dark)',
            letterSpacing: '-0.5px',
            fontWeight: 400,
          }}>
            Somewhere between plans and presence, we found experiences worth sharing—intentional, effortless, and designed to linger.
          </p>
        </div>

        {/* 4 scroll pillars */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          borderTop: '1px solid rgba(42,33,25,0.1)',
          marginBottom: '80px',
        }}>
          {PILLARS.map((p) => (
            <div key={p.label} style={{
              padding: '32px 24px 32px 0',
              borderRight: '1px solid rgba(42,33,25,0.1)',
            }}>
              <p className="label" style={{
                color: 'var(--accent-3)',
                marginBottom: '16px',
                fontSize: '0.7em',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}>
                {p.label}
              </p>
              <p style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 'clamp(22px, 3vw, 40px)',
                fontWeight: 400,
                letterSpacing: '-0.5px',
                lineHeight: 1.15,
                color: 'var(--color-dark)',
              }}>
                {p.text}
              </p>
            </div>
          ))}
        </div>

        {/* Scattered scroll images — mirrors Webflow layout exactly */}
        <div
          ref={imagesRef}
          style={{
            position: 'relative',
            width: '100%',
            minHeight: '1200px',
            transition: 'transform 0.1s linear',
          }}
        >
          {/* large _1 — top left at 5% */}
          <div style={{
            position: 'absolute',
            top: '0px',
            left: '5%',
            width: '356px',
            height: '356px',
            borderRadius: '8px',
            overflow: 'hidden',
          }}>
            <img src="/images/bruno-ngarukiye-2qCs8eel2qI-unsplash.jpg" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>

          {/* vertical _1 — top right area */}
          <div style={{
            position: 'absolute',
            top: '40px',
            right: '15%',
            width: '269px',
            height: '323px',
            borderRadius: '8px',
            overflow: 'hidden',
          }}>
            <img src="/images/priscilla-du-preez-W3SEyZODn8U-unsplash-min.jpg" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>

          {/* small _1 — center-right at 30% left */}
          <div style={{
            position: 'absolute',
            top: '80px',
            left: '30%',
            width: '13vw',
            height: '13vw',
            borderRadius: '8px',
            overflow: 'hidden',
          }}>
            <img src="/images/upgraded-points-uu5Z7cx2PdA-unsplash.jpg" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>

          {/* large _2 — below, left at 7%, offset by 160px */}
          <div style={{
            position: 'absolute',
            top: '380px',
            left: '7%',
            width: '356px',
            height: '356px',
            borderRadius: '8px',
            overflow: 'hidden',
          }}>
            <img src="/images/bas-van-den-eijkhof-w_O7qjB9ZVY-unsplash.jpg" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>

          {/* large _3 — right side, top 430px */}
          <div style={{
            position: 'absolute',
            top: '430px',
            right: '0',
            width: '356px',
            height: '356px',
            borderRadius: '8px',
            overflow: 'hidden',
          }}>
            <img src="/images/aliunix-NI265AcvQZs-unsplash-1.jpg" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>

          {/* large heading-404 — mid section left at 7%, -80 margin */}
          <div style={{
            position: 'absolute',
            top: '580px',
            left: '7%',
            width: '356px',
            height: '356px',
            borderRadius: '8px',
            overflow: 'hidden',
          }}>
            <img src="/images/konrad-bachusz--tpKv0goE94-unsplash.jpg" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>

          {/* small _2 — right side upper */}
          <div style={{
            position: 'absolute',
            top: '600px',
            right: '15%',
            width: '13vw',
            height: '13vw',
            borderRadius: '8px',
            overflow: 'hidden',
          }}>
            <img src="/images/chaz-mcgregor-THXYw7ysYus-unsplash.jpg" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>

          {/* scroll row _1 — small _5 + horizontal _1 */}
          <div style={{
            position: 'absolute',
            top: '760px',
            left: '5%',
            display: 'flex',
            gap: '16px',
            alignItems: 'flex-end',
          }}>
            <div style={{ width: '13vw', height: '13vw', borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
              <img src="/images/ed-wingate-ZMIdqdsbP2U-unsplash-min.jpg" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div style={{ width: '400px', height: '200px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
              <img src="/images/ron-mcclenny-iqUSpwmvnw8-unsplash.jpg" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          </div>

          {/* scroll row _2 — small _6 + large _4 */}
          <div style={{
            position: 'absolute',
            top: '960px',
            left: '10%',
            display: 'flex',
            gap: '16px',
            alignItems: 'flex-end',
          }}>
            <div style={{ width: '13vw', height: '13vw', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, marginTop: '227px' }}>
              <img src="/images/gilles-de-muynck-PtJDCD4fTI4-unsplash.jpg" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div style={{ width: '356px', height: '356px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
              <img src="/images/redcharlie-nf7W_hn6DKQ-unsplash-min.jpg" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          </div>
        </div>

      </div>
    </section>
  )
}
