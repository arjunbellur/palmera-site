'use client'

// Webflow CSS: .master-snap-section { position: sticky; top: 48px; height: 80vh; border-radius: 8px; overflow: hidden }
// Outer container stacks them, each is sticky so they layer on top of each other on scroll

const DESTINATIONS = [
  {
    country: 'Senegal',
    city: 'Dakar',
    image: '/images/ton-toan-dxwt8veyBzQ-unsplash.jpg',
    note: null,
  },
  {
    country: 'Morocco',
    city: 'Marakesh',
    image: '/images/paul-macallan-CFKksjYRSQ8-unsplash.jpg',
    note: 'Freezes moments no one else notices.',
  },
  {
    country: 'Nigeria',
    city: 'Lagos',
    image: '/images/gbenga-onalaja-bZC_VAVhoQE-unsplash.jpg',
    note: null,
  },
]

export default function Destinations() {
  return (
    <section
      id="makes"
      style={{
        background: 'var(--bg-body)',
        padding: '0 48px 48px',
        display: 'flex',
        flexDirection: 'column',
        gap: '48px',
      }}
    >
      {DESTINATIONS.map((dest) => (
        <div
          key={dest.city}
          style={{
            position: 'sticky',
            top: '48px',
            height: '80vh',
            minHeight: '500px',
            borderRadius: '8px',
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          {/* Full bleed image */}
          <img
            src={dest.image}
            alt={`${dest.city}, ${dest.country}`}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center',
              display: 'block',
            }}
          />

          {/* Top gradient + text */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to bottom, rgba(4,4,4,0.6) 0%, transparent 45%, rgba(4,4,4,0.5) 100%)',
            zIndex: 1,
          }} />

          {/* Text */}
          <div style={{
            position: 'absolute',
            top: '48px',
            left: '40px',
            right: '40px',
            zIndex: 2,
          }}>
            <p style={{
              fontFamily: 'Geist Mono Variable, Courier New, monospace',
              fontSize: '11px',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'rgba(235,232,219,0.6)',
              marginBottom: '12px',
            }}>
              Explore Premium Destinations<br />{dest.country}
            </p>
            <h2 style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 'clamp(64px, 11vw, 140px)',
              fontWeight: 400,
              letterSpacing: '-3px',
              lineHeight: 0.95,
              color: '#ebe8db',
              margin: 0,
            }}>
              {dest.city}
            </h2>
          </div>

          {/* Bottom note */}
          {dest.note && (
            <div style={{
              position: 'absolute',
              bottom: '40px',
              left: '40px',
              zIndex: 2,
            }}>
              <p style={{
                fontFamily: 'Geist Mono Variable, Courier New, monospace',
                fontSize: '11px',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'rgba(235,232,219,0.5)',
              }}>
                {dest.note}
              </p>
            </div>
          )}
        </div>
      ))}
    </section>
  )
}
