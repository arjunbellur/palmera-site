'use client'
import { useEffect, useRef } from 'react'

const DESTINATIONS = [
  { country: 'Senegal', city: 'Dakar', image: '/images/ton-toan-dxwt8veyBzQ-unsplash.jpg' },
  { country: 'Morocco', city: 'Marrakesh', image: '/images/paul-macallan-CFKksjYRSQ8-unsplash.jpg' },
  { country: 'Nigeria', city: 'Lagos', image: '/images/gbenga-onalaja-bZC_VAVhoQE-unsplash.jpg' },
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
        card.style.transform = `scale(${scale})`
        card.style.filter = shrink > 0 ? `brightness(${1 - shrink * 3})` : 'none'
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <section id="makes" style={{ background: 'var(--bg-body)', padding: '5rem 2.5rem 18.75rem' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {DESTINATIONS.map((dest, i) => (
          <div key={dest.city} ref={el => { cardRefs.current[i] = el }}
            style={{
              position: 'sticky', top: `${3 + i * 0.75}rem`,
              height: '85vh', minHeight: '33.75rem',
              borderRadius: '0.75rem', overflow: 'hidden',
              zIndex: 10 + i, transformOrigin: 'center top',
              transition: 'transform 0.3s ease, filter 0.3s ease',
              willChange: 'transform, filter',
            }}>
            <img src={dest.image} alt={`${dest.city}, ${dest.country}`} loading="lazy"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(4,4,4,0.5) 0%, rgba(4,4,4,0.05) 35%, rgba(4,4,4,0.4) 100%)' }} />
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '5rem 2.5rem 3rem' }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(235,232,219,0.75)', marginBottom: '1.25rem', lineHeight: 1.7 }}>
                Explore Premium Destinations<br />{dest.country}
              </p>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(4.5rem, 12vw, 10rem)', fontWeight: 400, letterSpacing: '-0.1875rem', lineHeight: 0.9, color: '#ebe8db', margin: 0 }}>
                {dest.city}
              </h2>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
