'use client'
import { useTranslations } from 'next-intl'

export default function Services() {
  const t = useTranslations('services')

  const SERVICES = [
    { titleKey: 'villas', descKey: 'villasDesc', icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="24" height="24"><path d="M3 21h18M9 21V11l3-3 3 3v10M3 21V7l9-4 9 4v14"/></svg>` },
    { titleKey: 'yachts', descKey: 'yachtsDesc', icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="24" height="24"><path d="M3 17l2.5-8h13L21 17M3 17c3 2 6-1 9-1s6 3 9 1M12 3v6"/></svg>` },
    { titleKey: 'nightlife', descKey: 'nightlifeDesc', icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="24" height="24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>` },
    { titleKey: 'safari', descKey: 'safariDesc', icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="24" height="24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>` },
    { titleKey: 'concierge', descKey: 'conciergeDesc', icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="24" height="24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>` },
    { titleKey: 'transport', descKey: 'transportDesc', icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="24" height="24"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 5v3h-7V8zM5.5 18.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM18.5 18.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"/></svg>` },
  ]

  return (
    <section id="skills" style={{ background: 'transparent', padding: '9rem 0 11rem', position: 'relative', zIndex: 1 }}>
      <div style={{ maxWidth: '75rem', margin: '0 auto', padding: '0 1.5rem' }}>
        <div style={{ marginBottom: '4rem' }}>
          <p className="label" style={{ color: 'var(--accent-3)', marginBottom: '1rem' }}>{t('label')}</p>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(3rem, 6vw, 5rem)', fontWeight: 400, letterSpacing: '-0.125rem', lineHeight: 1, color: 'var(--color-dark)', margin: 0 }}>{t('heading')}</h2>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', rowGap: '2rem' }}>
          {SERVICES.map((s) => (
            <div key={s.titleKey} style={{ width: '33.333%', padding: '0 2rem 0 1.5rem', borderLeft: '1px dashed rgba(42,33,25,0.25)', position: 'relative', boxSizing: 'border-box' }}>
              <div style={{ position: 'absolute', left: '-1px', top: 0, width: '2px', height: '2.5rem', background: 'var(--accent-3)' }} />
              <div style={{ color: 'var(--color-dark)', marginBottom: '1rem' }} dangerouslySetInnerHTML={{ __html: s.icon }} />
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '1rem', fontWeight: 600, color: 'var(--color-dark)', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>{t(s.titleKey as any)}</p>
              <p style={{ fontFamily: 'var(--font-serif)', fontSize: '0.875rem', lineHeight: 1.7, color: 'rgba(42,33,25,0.65)', margin: 0 }}>{t(s.descKey as any)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
