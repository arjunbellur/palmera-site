'use client'
// Section #skills — Light cream, services grid with dashed vertical dividers + inline SVG icons

const SERVICE_ICONS: Record<string, string> = {
  villa: `<path d="M13 11H17.8C18.9201 11 19.4802 11 19.908 11.218C20.2843 11.4097 20.5903 11.7157 20.782 12.092C21 12.5198 21 13.0799 21 14.2V21M13 21V6.2C13 5.0799 13 4.51984 12.782 4.09202C12.5903 3.71569 12.2843 3.40973 11.908 3.21799C11.4802 3 10.9201 3 9.8 3H6.2C5.0799 3 4.51984 3 4.09202 3.21799C3.71569 3.40973 3.40973 3.71569 3.21799 4.09202C3 4.51984 3 5.0799 3 6.2V21M22 21H2M6.5 7H9.5M6.5 11H9.5M6.5 15H9.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`,
  yacht: `<path d="M16 18.4135C17.6329 16.1891 18.9721 13.4501 19.0139 10.6484C19.0198 10.2539 18.7623 9.91012 18.3933 9.77054L16 8.86542M8 18.375C6.36996 16.1546 5.02884 13.4426 4.9862 10.6484C4.98017 10.2539 5.23766 9.91012 5.60672 9.77054L8 8.86542M3 20C4 20 5.5 21 7 21C8.5 21 10 20 12 20C14 20 15 21 17 21C19 21 20 20 21 20M3 17.5C4 17.5 5.5 18.5 7 18.5C8.5 18.5 10 17.5 12 17.5C14 17.5 15 18.5 17 18.5C19 18.5 20 17.5 21 17.5M16 8.86542L12.7075 7.62021C12.2516 7.44779 11.7484 7.44779 11.2925 7.62021L8 8.86542M16 8.86542V7C16 5.89543 15.1046 5 14 5H12M8 8.86542L8 7C8 5.89543 8.89543 5 10 5H12M12 5V2" stroke="currentColor" stroke-width="1.5"/>`,
  nightlife: `<path d="M12 20L3.16925 9.4031C2.50704 8.60845 2.56004 7.43996 3.29148 6.70852L5.41421 4.58579C5.78929 4.21071 6.29799 4 6.82843 4H10M12 20L20.8307 9.4031C21.493 8.60845 21.44 7.43996 20.7085 6.70852L18.5858 4.58579C18.2107 4.21071 17.702 4 17.1716 4H14M12 20L8.26089 9.71745C8.09288 9.25541 8.10093 8.74767 8.28353 8.29119L10 4M12 20L15.7391 9.71745C15.9071 9.25541 15.8991 8.74767 15.7165 8.29119L14 4M14 4H10" stroke="currentColor" stroke-width="1.5" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/>`,
  safari: `<path d="M8 12L4 6H20L16 12M8 12H16M8 12L6 22H18L16 12M12 6V2M9 2H15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`,
  concierge: `<path d="M17 20L19.0597 19.4851C20.1313 19.2172 20.7828 18.1313 20.5149 17.0597L19.5681 13.2724C19.2342 11.9369 18.0343 11 16.6577 11H7.34233C5.96573 11 4.76578 11.9369 4.4319 13.2724L3.48507 17.0597C3.21717 18.1313 3.86869 19.2172 4.94028 19.4851L7 20M5 22H19M17 22V16C17 15.4477 16.5523 15 16 15H8C7.44772 15 7 15.4477 7 16V22H17ZM12.5 19.5C12.5 19.7761 12.2761 20 12 20C11.7239 20 11.5 19.7761 11.5 19.5C11.5 19.2239 11.7239 19 12 19C12.2761 19 12.5 19.2239 12.5 19.5ZM15 6C15 7.65685 13.6569 9 12 9C10.3431 9 9 7.65685 9 6C9 4.34315 10.3431 3 12 3C13.6569 3 15 4.34315 15 6Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,
  transport: `<path d="M19 20H5V21C5 21.5523 4.55228 22 4 22H3C2.44772 22 2 21.5523 2 21V11L4.4805 5.21216C4.79566 4.47679 5.51874 4 6.31879 4H17.6812C18.4813 4 19.2043 4.47679 19.5195 5.21216L22 11V21C22 21.5523 21.5523 22 21 22H20C19.4477 22 19 21.5523 19 21V20ZM20 13H4V18H20V13ZM4.17594 11H19.8241L17.6812 6H6.31879L4.17594 11ZM6.5 17C5.67157 17 5 16.3284 5 15.5C5 14.6716 5.67157 14 6.5 14C7.32843 14 8 14.6716 8 15.5C8 16.3284 7.32843 17 6.5 17ZM17.5 17C16.6716 17 16 16.3284 16 15.5C16 14.6716 16.6716 14 17.5 14C18.3284 14 19 14.6716 19 15.5C19 16.3284 18.3284 17 17.5 17Z" fill="currentColor"/>`,
}

const SERVICES = [
  { key: 'villa', title: 'Luxury Villas', desc: 'Private estates with curated amenities', fill: false },
  { key: 'yacht', title: 'Yacht & Boats', desc: 'Private charters and coastal leisure', fill: false },
  { key: 'nightlife', title: 'VIP Nightlife', desc: 'Access to exclusive venues and tables', fill: false },
  { key: 'safari', title: 'Safari Adventures', desc: 'Immersive, luxury-led wildlife journeys', fill: false },
  { key: 'concierge', title: 'Concierge Services', desc: 'Personal assistance and bespoke planning', fill: false },
  { key: 'transport', title: 'Transportation', desc: 'Chauffeured travel and premium rentals', fill: true },
]

const DashedDivider = () => (
  <svg width="2" height="100%" style={{ position: 'absolute', top: 0, left: 0 }}>
    <defs>
      <pattern id="dash" width="2" height="10" patternUnits="userSpaceOnUse">
        <path d="M1 0 L1 5" stroke="#E3E3E3" strokeWidth="1.5" />
      </pattern>
    </defs>
    <rect width="2" height="100%" fill="url(#dash)" />
  </svg>
)

export default function Services() {
  return (
    <section
      id="skills"
      style={{
        background: 'var(--bg-1)',
        padding: '100px 0',
        overflow: 'hidden',
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 40px' }}>
        {/* Header */}
        <div style={{ marginBottom: '64px' }}>
          <p className="label" style={{ color: 'var(--accent-3)', marginBottom: '16px' }}>Services</p>
          <h2 className="heading-large" style={{ color: 'var(--color-dark)' }}>
            Intentional Experiences
          </h2>
        </div>

        {/* Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '0',
        }}>
          {SERVICES.map((s) => (
            <div
              key={s.key}
              style={{
                position: 'relative',
                padding: '40px 24px 40px 40px',
                borderBottom: '1px solid rgba(42,33,25,0.1)',
                borderRight: '1px solid rgba(42,33,25,0.1)',
              }}
            >
              {/* Dashed left border accent */}
              <div style={{ position: 'relative', height: '100%' }}>
                <div style={{ position: 'absolute', left: '-24px', top: 0, bottom: 0 }}>
                  <DashedDivider />
                </div>
                <div style={{
                  width: '3px',
                  height: '32px',
                  background: 'var(--accent-3)',
                  position: 'absolute',
                  left: '-24px',
                  top: '0',
                }} />
              </div>

              {/* Icon */}
              <div style={{ marginBottom: '20px' }}>
                <svg viewBox="0 0 24 24" fill={s.fill ? 'currentColor' : 'none'}
                  style={{ width: '24px', height: '24px', color: 'var(--color-dark)' }}
                  dangerouslySetInnerHTML={{ __html: SERVICE_ICONS[s.key] }}
                />
              </div>

              <div className="subheading-regular" style={{ marginBottom: '8px' }}>{s.title}</div>
              <p className="paragraph-regular">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
