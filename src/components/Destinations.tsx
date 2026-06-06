'use client'
// Section #makes — Full-screen destination snap sections: Dakar, Marrakesh, Lagos

const DESTINATIONS = [
  {
    country: 'Senegal',
    city: 'Dakar',
    image: '/images/ton-toan-dxwt8veyBzQ-unsplash.jpg',
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
  },
]

export default function Destinations() {
  return (
    <section id="makes" style={{ background: 'var(--bg-body)' }}>
      {DESTINATIONS.map((dest) => (
        <div
          key={dest.city}
          style={{
            position: 'relative',
            height: '100vh',
            minHeight: '600px',
            overflow: 'hidden',
          }}
          className="dest-snap"
        >
          <img
            src={dest.image}
            alt={`${dest.city}, ${dest.country}`}
            className="image-cover"
            style={{ transition: 'transform 0.8s cubic-bezier(0.16,1,0.3,1)' }}
          />

          {/* Top gradient + text */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0,
            background: 'linear-gradient(to bottom, rgba(4,4,4,0.7) 0%, transparent 50%)',
            padding: '48px 40px',
          }}>
            <p className="label" style={{ color: 'rgba(235,232,219,0.6)', marginBottom: '16px' }}>
              Explore Premium Destinations<br />{dest.country}
            </p>
            <h2 style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 'clamp(56px, 10vw, 140px)',
              fontWeight: 400,
              letterSpacing: '-3px',
              lineHeight: 1,
              color: '#ebe8db',
            }}>
              {dest.city}
            </h2>
          </div>

          {/* Bottom gradient */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            background: 'linear-gradient(to top, rgba(4,4,4,0.8) 0%, transparent 40%)',
            height: '240px',
          }} />

          {/* Optional note */}
          {dest.note && (
            <div style={{
              position: 'absolute',
              bottom: '48px',
              left: '40px',
            }}>
              <p className="label" style={{ color: 'rgba(235,232,219,0.5)' }}>{dest.note}</p>
            </div>
          )}
        </div>
      ))}

      <style>{`
        .dest-snap:hover img {
          transform: scale(1.04);
        }
      `}</style>
    </section>
  )
}
