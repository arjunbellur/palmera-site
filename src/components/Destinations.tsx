'use client'

// Sticky stacked destination cards — each is position:sticky top:48px
// City name is large, centered, fills the card like the live Webflow site

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
        padding: '0 40px 200px',
      }}
    >
      {/* Stack of sticky cards — each layers on top of previous */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '48px',
      }}>
        {DESTINATIONS.map((dest, i) => (
          <div
            key={dest.city}
            style={{
              position: 'sticky',
              top: `${48 + i * 8}px`, // slight offset so cards peek behind each other
              height: '82vh',
              minHeight: '520px',
              borderRadius: '12px',
              overflow: 'hidden',
              zIndex: 10 + i,
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
              }}
            />

            {/* Overlay gradient */}
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to bottom, rgba(4,4,4,0.55) 0%, rgba(4,4,4,0.1) 40%, rgba(4,4,4,0.45) 100%)',
            }} />

            {/* Content */}
            <div style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              textAlign: 'center',
              padding: '48px 40px',
            }}>
              <p style={{
                fontFamily: 'Geist Mono Variable, Courier New, monospace',
                fontSize: '11px',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: 'rgba(235,232,219,0.65)',
                marginBottom: '16px',
                lineHeight: 1.6,
              }}>
                Explore Premium Destinations<br />{dest.country}
              </p>
              <h2 style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 'clamp(80px, 13vw, 180px)',
                fontWeight: 400,
                letterSpacing: '-3px',
                lineHeight: 0.9,
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
                right: '40px',
                textAlign: 'center',
              }}>
                <p style={{
                  fontFamily: 'Geist Mono Variable, Courier New, monospace',
                  fontSize: '11px',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'rgba(235,232,219,0.5)',
                }}>
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
