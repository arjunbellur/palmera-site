'use client'

// Section #base — Discover/Gather/Reserve/Commit scroll section
// Light cream background with scroll-animated text and image grid

const SCROLL_ITEMS = [
  { label: 'Discover', text: 'Curated places, moments' },
  { label: 'Gather', text: 'Effortless group planning' },
  { label: 'Reserve', text: 'Seamless bookings, split payments' },
  { label: 'Commit', text: 'Plans without friction' },
]

const IMAGES = [
  { src: '/images/bruno-ngarukiye-2qCs8eel2qI-unsplash.jpg', cls: 'large' },
  { src: '/images/priscilla-du-preez-W3SEyZODn8U-unsplash-min.jpg', cls: 'vertical' },
  { src: '/images/upgraded-points-uu5Z7cx2PdA-unsplash.jpg', cls: 'small' },
  { src: '/images/bas-van-den-eijkhof-w_O7qjB9ZVY-unsplash.jpg', cls: 'large' },
  { src: '/images/aliunix-NI265AcvQZs-unsplash-1.jpg', cls: 'large' },
  { src: '/images/konrad-bachusz--tpKv0goE94-unsplash.jpg', cls: 'large' },
  { src: '/images/chaz-mcgregor-THXYw7ysYus-unsplash.jpg', cls: 'small' },
  { src: '/images/ed-wingate-ZMIdqdsbP2U-unsplash-min.jpg', cls: 'small' },
  { src: '/images/ron-mcclenny-iqUSpwmvnw8-unsplash.jpg', cls: 'wide' },
  { src: '/images/gilles-de-muynck-PtJDCD4fTI4-unsplash.jpg', cls: 'small' },
  { src: '/images/redcharlie-nf7W_hn6DKQ-unsplash-min.jpg', cls: 'large' },
]

export default function BaseSection() {
  return (
    <section
      id="base"
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
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 40px' }}>
        {/* Top text row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '48px',
          marginBottom: '72px',
          alignItems: 'start',
        }}>
          <p className="label" style={{ color: 'rgba(42,33,25,0.7)', lineHeight: 1.7 }}>
            Ease into a space where plans feel lighter and moments feel shared.
          </p>
          <p style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '18px',
            lineHeight: 1.7,
            color: 'rgba(42,33,25,0.55)',
          }}>
            Somewhere between plans and presence, we found experiences worth sharing—intentional, effortless, and designed to linger.
          </p>
        </div>

        {/* Feature pillars */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '1px',
          background: 'rgba(42,33,25,0.12)',
          marginBottom: '80px',
        }}>
          {SCROLL_ITEMS.map((item) => (
            <div key={item.label} style={{
              background: 'var(--bg-1)',
              padding: '40px 32px',
            }}>
              <p className="label" style={{ color: 'var(--accent-3)', marginBottom: '12px' }}>
                {item.label}
              </p>
              <p style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 'clamp(20px, 3vw, 36px)',
                lineHeight: 1.2,
                letterSpacing: '-0.5px',
                color: 'var(--color-dark)',
              }}>
                {item.text}
              </p>
            </div>
          ))}
        </div>

        {/* Image masonry grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(12, 1fr)',
          gridAutoRows: '180px',
          gap: '8px',
        }}>
          <div style={{ gridColumn: 'span 5', gridRow: 'span 2', overflow: 'hidden' }}>
            <img src="/images/bruno-ngarukiye-2qCs8eel2qI-unsplash.jpg" alt="" className="image-cover" style={{ transition: 'transform 0.6s ease' }} />
          </div>
          <div style={{ gridColumn: 'span 3', gridRow: 'span 3', overflow: 'hidden' }}>
            <img src="/images/priscilla-du-preez-W3SEyZODn8U-unsplash-min.jpg" alt="" className="image-cover" />
          </div>
          <div style={{ gridColumn: 'span 4', gridRow: 'span 1', overflow: 'hidden' }}>
            <img src="/images/upgraded-points-uu5Z7cx2PdA-unsplash.jpg" alt="" className="image-cover" />
          </div>
          <div style={{ gridColumn: 'span 4', gridRow: 'span 2', overflow: 'hidden' }}>
            <img src="/images/bas-van-den-eijkhof-w_O7qjB9ZVY-unsplash.jpg" alt="" className="image-cover" />
          </div>
          <div style={{ gridColumn: 'span 5', gridRow: 'span 2', overflow: 'hidden' }}>
            <img src="/images/aliunix-NI265AcvQZs-unsplash-1.jpg" alt="" className="image-cover" />
          </div>
          <div style={{ gridColumn: 'span 4', gridRow: 'span 2', overflow: 'hidden' }}>
            <img src="/images/konrad-bachusz--tpKv0goE94-unsplash.jpg" alt="" className="image-cover" />
          </div>
          <div style={{ gridColumn: 'span 3', gridRow: 'span 1', overflow: 'hidden' }}>
            <img src="/images/chaz-mcgregor-THXYw7ysYus-unsplash.jpg" alt="" className="image-cover" />
          </div>
          <div style={{ gridColumn: 'span 8', gridRow: 'span 1', overflow: 'hidden' }}>
            <img src="/images/ron-mcclenny-iqUSpwmvnw8-unsplash.jpg" alt="" className="image-cover" />
          </div>
          <div style={{ gridColumn: 'span 4', gridRow: 'span 1', overflow: 'hidden' }}>
            <img src="/images/redcharlie-nf7W_hn6DKQ-unsplash-min.jpg" alt="" className="image-cover" />
          </div>
        </div>
      </div>
    </section>
  )
}
