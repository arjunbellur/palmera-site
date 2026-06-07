'use client'

import { useEffect, useRef } from 'react'

// 20 images arranged in a full circle arc, center text + CTA
// Images are positioned using polar coordinates, rotated to face center
const CIRCLE_IMAGES = [
  '/images/gbenga-onalaja-bZC_VAVhoQE-unsplash.jpg',
  '/images/paul-macallan-CFKksjYRSQ8-unsplash.jpg',
  '/images/ed-wingate-ZMIdqdsbP2U-unsplash-min.jpg',
  '/images/redcharlie-nf7W_hn6DKQ-unsplash-min.jpg',
  '/images/priscilla-du-preez-W3SEyZODn8U-unsplash-min.jpg',
  '/images/gilles-de-muynck-PtJDCD4fTI4-unsplash.jpg',
  '/images/Rotation-Image_1Rotation-Image.webp',
  '/images/chaz-mcgregor-THXYw7ysYus-unsplash.jpg',
  '/images/bas-van-den-eijkhof-w_O7qjB9ZVY-unsplash.jpg',
  '/images/aliunix-NI265AcvQZs-unsplash-1.jpg',
  '/images/ton-toan-dxwt8veyBzQ-unsplash.jpg',
  '/images/konrad-bachusz--tpKv0goE94-unsplash.jpg',
  '/images/haven-xie-IoTTc6Z5lTM-unsplash.jpg',
  '/images/mike-swigunski-H9mQC5pNzP0-unsplash.jpg',
  '/images/marek-okon-v2nO45qoGU0-unsplash.jpg',
  '/images/bruno-ngarukiye-2qCs8eel2qI-unsplash.jpg',
  '/images/bruno-ngarukiye-P7K8gBPNMUc-unsplash.jpg',
  '/images/thomas-ashlock-RAjND0B3HDw-unsplash.jpg',
  '/images/manuel-moreno-DGa0LQ0yDPc-unsplash.jpg',
  '/images/tobias-tullius-XZOO6QHub60-unsplash.jpg',
]

export default function AppSection() {
  const circleRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!circleRef.current) return
    const items = circleRef.current.querySelectorAll('.circle-img-item')
    const total = items.length
    const radius = Math.min(window.innerWidth * 0.42, 420)
    
    items.forEach((el, i) => {
      const angleDeg = (i / total) * 360 - 90 // start from top
      const angleRad = (angleDeg * Math.PI) / 180
      const x = Math.cos(angleRad) * radius
      const y = Math.sin(angleRad) * radius
      const item = el as HTMLElement
      item.style.left = `calc(50% + ${x}px - 60px)`
      item.style.top = `calc(50% + ${y}px - 60px)`
      item.style.transform = `rotate(${angleDeg + 90}deg)`
    })

    // Slow rotation animation
    let angle = 0
    let rafId: number
    const rotate = () => {
      angle += 0.05
      if (circleRef.current) {
        circleRef.current.style.transform = `rotate(${angle}deg)`
      }
      rafId = requestAnimationFrame(rotate)
    }
    rafId = requestAnimationFrame(rotate)
    return () => cancelAnimationFrame(rafId)
  }, [])

  return (
    <section
      id="signal"
      style={{
        background: 'var(--bg-1)',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        padding: '80px 40px',
      }}
    >
      {/* Rotating circle of images */}
      <div
        ref={circleRef}
        style={{
          position: 'absolute',
          inset: 0,
          margin: 'auto',
          width: '100%',
          height: '100%',
          transformOrigin: 'center center',
        }}
      >
        {CIRCLE_IMAGES.map((src, i) => (
          <div
            key={i}
            className="circle-img-item"
            style={{
              position: 'absolute',
              width: '120px',
              height: '120px',
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: '0 4px 24px rgba(42,33,25,0.15)',
            }}
          >
            <img
              src={src}
              alt=""
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
                // Counter-rotate so images stay upright
                transform: 'rotate(0deg)',
              }}
            />
          </div>
        ))}
      </div>

      {/* Center content */}
      <div style={{
        position: 'relative',
        zIndex: 2,
        textAlign: 'center',
        maxWidth: '500px',
      }}>
        <p style={{
          fontFamily: 'Geist Mono Variable, Courier New, monospace',
          fontSize: '11px',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'rgba(42,33,25,0.6)',
          marginBottom: '20px',
        }}>
          Step inside early
        </p>
        <h2 style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 'clamp(40px, 6vw, 72px)',
          fontWeight: 400,
          letterSpacing: '-2px',
          lineHeight: 1.05,
          color: 'var(--color-dark)',
          marginBottom: '40px',
        }}>
          We&apos;ll invite you when it&apos;s ready
        </h2>
        <a
          href="https://form.typeform.com/to/xo1Bskym"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '12px',
            padding: '14px 32px',
            background: 'var(--color-dark)',
            color: '#ebe8db',
            textDecoration: 'none',
            borderRadius: '4px',
            fontFamily: 'Geist Mono Variable, Courier New, monospace',
            fontSize: '11px',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
          }}
        >
          Be Included
          <svg width="18" height="18" viewBox="0 0 26 26" fill="none">
            <path d="M1.33594 12.9987H23.0026M13.0026 1.33203L24.6693 12.9987L13.0026 24.6654" stroke="#ebe8db" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </a>
      </div>
    </section>
  )
}
