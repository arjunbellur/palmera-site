'use client'

import { useEffect, useRef } from 'react'

const DESTINATIONS = [
  { country: 'Senegal',  city: 'Dakar',     image: '/images/ton-toan-dxwt8veyBzQ-unsplash.jpg', note: null },
  { country: 'Morocco',  city: 'Marakesh',  image: '/images/paul-macallan-CFKksjYRSQ8-unsplash.jpg', note: 'Freezes moments no one else notices.' },
  { country: 'Nigeria',  city: 'Lagos',     image: '/images/gbenga-onalaja-bZC_VAVhoQE-unsplash.jpg', note: null },
]

export default function Destinations() {
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const onScroll = () => {
      cardRefs.current.forEach((card, i) => {
        if (!card || i === DESTINATIONS.length - 1) return
        const next = cardRefs.current[i + 1]
        if (!next) return
        const nextRect = next.getBoundingClientRect()
        const overlap = Math.max(0, -nextRect.top + 48)
        const shrink = Math.min(0.06, overlap / window.innerHeight * 0.1)
        const scale = Math.max(0.92, 1 - shrink)
        const blur = Math.min(3, shrink * 60)
        card.style.transform = `scale(${scale})`
        card.style.filter = blur > 0.5 ? `brightness(${1 - shrink * 3})` : 'none'
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <section
      id="makes"
      style={{
        background: 'var(--bg-body)',
        padding: '80px 40px 300px',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {DESTINATIONS.map((dest, i) => (
          <div
            key={dest.city}
            ref={el => { cardRefs.current[i] = el }}
            style={{
              position: 'sticky',
              top: `${48 + i * 12}px`,
              height: '85vh',
              minHeight: '540px',
              borderRadius: '12px',
              overflow: 'hidden',
              zIndex: 10 + i,
              transformOrigin: 'center top',
              transition: 'transform 0.3s cubic-bezier(0.25,0.46,0.45,0.94), filter 0.3s ease',
              willChange: 'transform, filter',
            }}
          >
            <img src={dest.image} alt={`${dest.city}, ${dest.country}`}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }} />

            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(to bottom, rgba(4,4,4,0.5) 0%, rgba(4,4,4,0.05) 35%, rgba(4,4,4,0.4) 100%)',
            }} />

            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column',
              justifyContent: 'center', alignItems: 'center',
              textAlign: 'center', padding: '80px 40px 48px',
            }}>
              <p style={{
                fontFamily: 'Geist Mono Variable, Courier New, monospace',
                fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase',
                color: 'rgba(235,232,219,0.75)', marginBottom: '20px', lineHeight: 1.7,
              }}>
                Explore Premium Destinations<br />{dest.country}
              </p>
              <h2 style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 'clamp(72px, 12vw, 160px)',
                fontWeight: 400, letterSpacing: '-3px', lineHeight: 0.9,
                color: '#ebe8db', margin: 0,
              }}>
                {dest.city}
              </h2>
            </div>

            {dest.note && (
              <div style={{ position: 'absolute', bottom: '40px', left: '40px', right: '40px', textAlign: 'center' }}>
                <p style={{ fontFamily: 'Geist Mono Variable, Courier New, monospace', fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(235,232,219,0.55)' }}>
                  {dest.note.toUpperCase()}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
