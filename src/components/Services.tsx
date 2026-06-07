'use client'

// Services grid — 3 columns, exact Webflow structure
// Dashed left border per item, gold accent bar, SVG icons

const SERVICES = [
  {
    title: 'Luxury Villas',
    desc: 'Private estates with curated amenities',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="24" height="24"><path d="M3 21h18M9 21V11l3-3 3 3v10M3 21V7l9-4 9 4v14"/></svg>`,
  },
  {
    title: 'Yacht & Boats',
    desc: 'Private charters and coastal leisure',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="24" height="24"><path d="M3 17l2.5-8h13L21 17M3 17c3 2 6-1 9-1s6 3 9 1M12 3v6"/></svg>`,
  },
  {
    title: 'VIP Nightlife',
    desc: 'Access to exclusive venues and tables',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="24" height="24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`,
  },
  {
    title: 'Safari Adventures',
    desc: 'Immersive, luxury-led wildlife journeys',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="24" height="24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>`,
  },
  {
    title: 'Concierge Services',
    desc: 'Personal assistance and bespoke planning',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="24" height="24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  },
  {
    title: 'Transportation',
    desc: 'Chauffeured travel and premium rentals',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="24" height="24"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 5v3h-7V8zM5.5 18.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM18.5 18.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"/></svg>`,
  },
]

export default function Services() {
  return (
    <section
      id="skills"
      style={{
        background: 'var(--bg-1)',
        paddingTop: '80px',
        paddingBottom: '80px',
        position: 'relative',
        zIndex: 1,
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px' }}>

        {/* Header */}
        <div style={{ marginBottom: '64px' }}>
          <p className="label" style={{
            color: 'var(--accent-3)',
            marginBottom: '16px',
            fontSize: '0.7em',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}>
            Services
          </p>
          <h2 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(48px, 6vw, 80px)',
            fontWeight: 400,
            letterSpacing: '-2px',
            lineHeight: 1,
            color: 'var(--color-dark)',
            margin: 0,
          }}>
            Intentional Experiences
          </h2>
        </div>

        {/* 3-column grid — flex wrap matches Webflow's display:flex + flex-flow:wrap */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          rowGap: '32px',
        }}>
          {SERVICES.map((s, i) => (
            <div
              key={s.title}
              style={{
                width: '33.333%',
                padding: '0 32px 0 24px',
                borderLeft: '1px dashed rgba(42,33,25,0.25)',
                position: 'relative',
                boxSizing: 'border-box',
              }}
            >
              {/* Gold accent bar */}
              <div style={{
                position: 'absolute',
                left: '-1px',
                top: '0',
                width: '2px',
                height: '40px',
                background: 'var(--accent-3)',
              }} />

              {/* Icon */}
              <div
                style={{ color: 'var(--color-dark)', marginBottom: '16px' }}
                dangerouslySetInnerHTML={{ __html: s.icon }}
              />

              <p style={{
                fontFamily: 'Instrument Sans, sans-serif',
                fontSize: '16px',
                fontWeight: 600,
                color: 'var(--color-dark)',
                marginBottom: '8px',
                letterSpacing: '-0.02em',
              }}>
                {s.title}
              </p>
              <p style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '14px',
                lineHeight: '24px',
                color: 'rgba(42,33,25,0.6)',
                margin: 0,
              }}>
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
