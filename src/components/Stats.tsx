'use client'
// Section #story — dark background, large serif numbers + app mockup images

export default function Stats() {
  return (
    <section id="story" style={{ background: 'var(--bg-body)', padding: '100px 0', overflow: 'hidden' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 40px' }}>

        {/* Headline row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '48px',
          marginBottom: '80px',
          alignItems: 'start',
        }}>
          <h2 className="text-h2" style={{ color: '#ebe8db' }}>
            It&apos;s almost ready to be shared.
          </h2>
          <p style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '16px',
            lineHeight: 1.75,
            color: 'rgba(235,232,219,0.45)',
            paddingTop: '8px',
          }}>
            We followed the details long enough to see what mattered. The result is something considered, social by nature, and almost ready to be experienced.
          </p>
        </div>

        {/* Stats grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          borderTop: '1px solid rgba(235,232,219,0.1)',
          marginBottom: '100px',
        }}>
          {[
            { value: '∞', label: 'Ways to Gather', sub: 'From sunsets to late nights, and everything in between.' },
            { value: '1', label: 'Shared Flow', sub: 'From planning to arrival, everything happens in one place.' },
            { value: '0', label: 'Group Friction', sub: 'Split reservations seamlessly, without follow-ups.' },
            { value: '100%', label: 'Curated Experiences', sub: 'Every venue and event is intentionally selected.' },
          ].map((stat) => (
            <div key={stat.label} style={{
              padding: '48px 24px',
              borderRight: '1px solid rgba(235,232,219,0.08)',
            }}>
              <p style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 'clamp(48px, 6vw, 80px)',
                fontWeight: 400,
                color: '#ebe8db',
                lineHeight: 1,
                marginBottom: '16px',
                letterSpacing: '-2px',
              }}>
                {stat.value}
              </p>
              <p style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '14px',
                fontWeight: 600,
                color: 'rgba(235,232,219,0.7)',
                marginBottom: '10px',
              }}>
                {stat.label}
              </p>
              <p className="label" style={{ color: 'rgba(235,232,219,0.35)', lineHeight: 1.6 }}>
                {stat.sub}
              </p>
            </div>
          ))}
        </div>

        {/* App mockup images — 3 side by side with 3D perspective */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '24px',
          alignItems: 'flex-end',
        }}>
          {[
            { src: '/images/Unitru.png', alt: 'App mockup 1', rotateY: '-30deg' },
            { src: '/images/Group-1.png', alt: 'App mockup 2', rotateY: '0deg' },
            { src: '/images/Group-2.png', alt: 'App mockup 3', rotateY: '30deg' },
          ].map((mock) => (
            <a
              key={mock.src}
              href="https://form.typeform.com/to/xo1Bskym"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'block',
                perspective: '1000px',
                textDecoration: 'none',
              }}
            >
              <img
                src={mock.src}
                alt={mock.alt}
                style={{
                  width: '100%',
                  display: 'block',
                  transform: `translate3d(0, 50px, 0) rotateY(${mock.rotateY})`,
                  transformStyle: 'preserve-3d',
                  transition: 'transform 0.5s ease',
                }}
                onMouseEnter={e => {
                  ;(e.currentTarget as HTMLImageElement).style.transform = `translate3d(0, 20px, 0) rotateY(${mock.rotateY})`
                }}
                onMouseLeave={e => {
                  ;(e.currentTarget as HTMLImageElement).style.transform = `translate3d(0, 50px, 0) rotateY(${mock.rotateY})`
                }}
              />
            </a>
          ))}
        </div>

      </div>
    </section>
  )
}
