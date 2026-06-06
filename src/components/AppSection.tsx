'use client'
// Section #signal — "Step inside early" CTA with circular image arrangement

const CIRCLE_IMAGES = [
  '/images/gbenga-onalaja-bZC_VAVhoQE-unsplash.jpg',
  '/images/paul-macallan-CFKksjYRSQ8-unsplash.jpg',
  '/images/ed-wingate-ZMIdqdsbP2U-unsplash-min.jpg',
  '/images/redcharlie-nf7W_hn6DKQ-unsplash-min.jpg',
  '/images/priscilla-du-preez-W3SEyZODn8U-unsplash-min.jpg',
  '/images/gilles-de-muynck-PtJDCD4fTI4-unsplash.jpg',
  '/images/chaz-mcgregor-THXYw7ysYus-unsplash.jpg',
  '/images/bas-van-den-eijkhof-w_O7qjB9ZVY-unsplash.jpg',
  '/images/aliunix-NI265AcvQZs-unsplash-1.jpg',
  '/images/ton-toan-dxwt8veyBzQ-unsplash.jpg',
  '/images/konrad-bachusz--tpKv0goE94-unsplash.jpg',
  '/images/haven-xie-IoTTc6Z5lTM-unsplash.jpg',
]

export default function AppSection() {
  return (
    <section
      id="signal"
      style={{
        background: 'var(--bg-body)',
        padding: '120px 40px',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '80px',
        alignItems: 'center',
      }}>

        {/* Left — CTA text */}
        <div>
          <p className="label" style={{ color: 'var(--accent-4)', marginBottom: '24px' }}>
            Step inside early
          </p>
          <h2 className="heading-large" style={{
            color: '#ebe8db',
            marginBottom: '32px',
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
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: '#040404',
              background: '#ebe8db',
              padding: '16px 32px',
              textDecoration: 'none',
              transition: 'background 0.25s ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#be9a56')}
            onMouseLeave={e => (e.currentTarget.style.background = '#ebe8db')}
          >
            Be Included
            <svg width="18" height="18" viewBox="0 0 26 26" fill="none">
              <path d="M1.33594 12.9987H23.0026M13.0026 1.33203L24.6693 12.9987L13.0026 24.6654" stroke="#2A2119" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </a>
        </div>

        {/* Right — circular image arrangement (CSS version of the GSAP circle) */}
        <div style={{
          position: 'relative',
          width: '100%',
          paddingBottom: '100%',
        }}>
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            alignContent: 'flex-start',
          }}>
            {/* Masonry-style grid of images as a visual cluster */}
            {[
              { w: '48%', h: '200px' },
              { w: '48%', h: '200px' },
              { w: '30%', h: '160px' },
              { w: '65%', h: '160px' },
              { w: '55%', h: '130px' },
              { w: '40%', h: '130px' },
            ].map((size, i) => (
              <div key={i} style={{
                width: size.w,
                height: size.h,
                overflow: 'hidden',
                flexShrink: 0,
              }}>
                <img
                  src={CIRCLE_IMAGES[i % CIRCLE_IMAGES.length]}
                  alt=""
                  className="image-cover"
                  style={{ filter: 'brightness(0.85)' }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
