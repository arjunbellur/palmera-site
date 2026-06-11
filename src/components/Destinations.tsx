'use client'
import { useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { onScrollFrame } from '@/lib/scroll-bus'

const DESTINATIONS = [
  { countryFr: 'Sénégal', countryEn: 'Senegal', city: 'Dakar', image: '/images/ton-toan-dxwt8veyBzQ-unsplash.jpg' },
  { countryFr: 'Maroc', countryEn: 'Morocco', city: 'Marrakech', image: '/images/paul-macallan-CFKksjYRSQ8-unsplash.jpg' },
  { countryFr: 'Nigeria', countryEn: 'Nigeria', city: 'Lagos', image: '/images/gbenga-onalaja-bZC_VAVhoQE-unsplash.jpg' },
]

// Tan color from Webflow: hsla(36.84, 47.11%, 76.27%, 1)
const TAN = 'hsla(36.84, 47.11%, 76.27%, 1)'

export default function Destinations({ locale }: { locale: string }) {
  const t = useTranslations('destinations')
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const update = () => {
      cardRefs.current.forEach((card, i) => {
        if (!card || i === DESTINATIONS.length - 1) return
        const next = cardRefs.current[i + 1]
        if (!next) return
        const nextRect = next.getBoundingClientRect()
        const overlap = Math.max(0, -nextRect.top + 48)
        const shrink = Math.min(0.06, overlap / window.innerHeight * 0.1)
        const scale = Math.max(0.92, 1 - shrink)
        card.style.transform = `scale(${scale})`
        card.style.filter = shrink > 0 ? `brightness(${1 - shrink * 3})` : ''
      })
    }
    const unsub = onScrollFrame(update)
    update()
    return () => { unsub() }
  }, [])

  return (
    <section id="makes" style={{ background: 'transparent', padding: '5rem 2.5rem 18.75rem' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {DESTINATIONS.map((dest, i) => {
          const countryName = locale === 'fr' ? dest.countryFr : dest.countryEn
          return (
            <div key={dest.city} ref={el => { cardRefs.current[i] = el }}
              style={{
                position: 'sticky',
                top: `${3 + i * 0.75}rem`,
                height: '85vh',
                minHeight: '33.75rem',
                borderRadius: '0.75rem',
                overflow: 'hidden',
                zIndex: 10 + i,
                transformOrigin: 'center top',
                willChange: 'transform, filter',
              }}>

              {/* Background image */}
              <img src={dest.image} alt={`${dest.city}, ${countryName}`} loading="lazy"
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />

              {/* Dark overlay — matches original Webflow site ~48% opacity */}
              <div style={{
                position: 'absolute', inset: 0,
                background: 'rgba(4,4,4,0.48)',
              }} />

              {/* Gradient overlay — stronger at top and bottom for text contrast */}
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(to bottom, rgba(4,4,4,0.35) 0%, rgba(4,4,4,0.0) 30%, rgba(4,4,4,0.0) 55%, rgba(4,4,4,0.55) 100%)',
              }} />

              {/* Text content */}
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column',
                justifyContent: 'center', alignItems: 'center',
                textAlign: 'center', padding: '5rem 2.5rem 3rem',
              }}>
                {/* Subtitle — tan color matching Webflow */}
                <p style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.8125rem',
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  color: TAN,
                  marginBottom: '1.25rem',
                  lineHeight: 1.7,
                  textShadow: '0 1px 12px rgba(0,0,0,0.6)',
                  opacity: 0.9,
                }}>
                  {t('explore')}<br />{countryName}
                </p>

                {/* City name — tan color matching Webflow */}
                <h2 style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 'clamp(4.5rem, 12vw, 10rem)',
                  fontWeight: 400,
                  letterSpacing: '-0.1875rem',
                  lineHeight: 0.9,
                  color: TAN,
                  margin: 0,
                  textShadow: '0 2px 24px rgba(0,0,0,0.4)',
                }}>
                  {dest.city}
                </h2>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
