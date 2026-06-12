'use client'
import { useTranslations } from 'next-intl'
import { useViewport } from '@/lib/use-viewport'

export default function Stats() {
  const t = useTranslations('stats')
  const { isMobile, isTablet } = useViewport()
  const narrow = isMobile || isTablet

  return (
    <section id="story" style={{ background: 'transparent', padding: 'clamp(3.5rem,6vw,6.25rem) 0', overflow: 'hidden' }}>
      <div style={{ maxWidth: '75rem', margin: '0 auto', padding: '0 clamp(1.5rem,4.5vw,2.5rem)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 'clamp(1.25rem,3.5vw,3rem)', marginBottom: 'clamp(2.5rem,4.5vw,5rem)', alignItems: 'start' }}>
          <h2 className="text-h2" style={{ color: '#ebe8db' }}>{t('heading')}</h2>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(0.875rem,1.5vw,1rem)', lineHeight: 1.75, color: 'rgba(235,232,219,0.55)', paddingTop: 'clamp(0rem,0.5vw,0.5rem)' }}>{t('body')}</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: narrow ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', borderTop: '1px solid rgba(235,232,219,0.1)', marginBottom: 'clamp(3rem,6vw,6.25rem)' }}>
          {[
            { value: '∞', labelKey: 'waysLabel', subKey: 'waysSub' },
            { value: '1', labelKey: 'flowLabel', subKey: 'flowSub' },
            { value: '0', labelKey: 'frictionLabel', subKey: 'frictionSub' },
            { value: '100%', labelKey: 'curatedLabel', subKey: 'curatedSub' },
          ].map(stat => (
            <div key={stat.labelKey} style={{ padding: 'clamp(1.5rem,2.5vw,3rem) clamp(0.75rem,1.5vw,1.5rem)', borderRight: '1px solid rgba(235,232,219,0.08)' }}>
              <p style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(2.5rem,6vw,5rem)', fontWeight: 400, color: '#ebe8db', lineHeight: 1, marginBottom: '0.75rem', letterSpacing: '-0.125rem' }}>{stat.value}</p>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', fontWeight: 600, color: 'rgba(235,232,219,0.8)', marginBottom: '0.5rem' }}>{t(stat.labelKey as any)}</p>
              <p className="label" style={{ color: 'rgba(235,232,219,0.45)', lineHeight: 1.6 }}>{t(stat.subKey as any)}</p>
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 'clamp(1rem,2vw,1.5rem)', alignItems: 'flex-end', maxWidth: 'min(48rem,100%)', margin: '0 auto' }}>
          {[
            { src: '/images/Unitru.png', alt: 'App mockup 1', rotateY: '-30deg' },
            { src: '/images/Group-1.png', alt: 'App mockup 2', rotateY: '0deg' },
            { src: '/images/Group-2.png', alt: 'App mockup 3', rotateY: '30deg' },
          ].map((mock, idx) => {
            if (isMobile && idx !== 1) return null
            return (
              <a key={mock.src} href="https://form.typeform.com/to/xo1Bskym" target="_blank" rel="noopener noreferrer"
                style={{ display: 'block', perspective: '62.5rem', textDecoration: 'none' }}>
                <img src={mock.src} alt={mock.alt} loading="lazy"
                  style={{ width: '100%', display: 'block', transform: `translate3d(0, 3.125rem, 0) rotateY(${mock.rotateY})`, transformStyle: 'preserve-3d', transition: 'transform 0.5s ease' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLImageElement).style.transform = `translate3d(0, 1.25rem, 0) rotateY(${mock.rotateY})` }}
                  onMouseLeave={e => { (e.currentTarget as HTMLImageElement).style.transform = `translate3d(0, 3.125rem, 0) rotateY(${mock.rotateY})` }} />
              </a>
            )
          })}
        </div>
      </div>
    </section>
  )
}
