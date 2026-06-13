'use client'
import { useTranslations } from 'next-intl'
import { useViewport } from '@/lib/use-viewport'
import { useState, useEffect, useRef } from 'react'

const MOCKS = [
  { src: '/images/app-screen-2.png', alt: 'Splash screen',    rotateY: '-24deg' },
  { src: '/images/app-screen-3.png', alt: 'Onboarding',       rotateY: '-8deg'  },
  { src: '/images/app-screen-1.png', alt: 'Discover screen',  rotateY: '8deg'   },
  { src: '/images/app-screen-4.png', alt: 'Journey screen',   rotateY: '24deg'  },
]

function MobileCarousel() {
  const [active, setActive] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setActive(i => (i + 1) % MOCKS.length)
    }, 2800)
  }

  useEffect(() => {
    startTimer()
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  const goTo = (i: number) => { setActive(i); startTimer() }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}>
      {/* Phone frame with crossfade */}
      <a href="https://form.typeform.com/to/xo1Bskym" target="_blank" rel="noopener noreferrer"
        style={{ display: 'block', textDecoration: 'none', width: 'min(72vw, 260px)', position: 'relative' }}>
        {MOCKS.map((m, i) => (
          <img key={m.src} src={m.src} alt={m.alt} loading="lazy"
            style={{
              width: '100%', display: 'block',
              position: i === 0 ? 'relative' : 'absolute',
              top: 0, left: 0,
              opacity: active === i ? 1 : 0,
              transition: 'opacity 0.55s ease',
              pointerEvents: active === i ? 'auto' : 'none',
            }} />
        ))}
      </a>

      {/* Dot indicators */}
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        {MOCKS.map((_, i) => (
          <button key={i} onClick={() => goTo(i)}
            style={{
              width: active === i ? '1.5rem' : '0.375rem',
              height: '0.375rem',
              borderRadius: '0.1875rem',
              background: active === i ? '#be9a56' : 'rgba(235,232,219,0.25)',
              border: 'none', padding: 0, cursor: 'pointer',
              transition: 'all 0.3s ease',
            }} />
        ))}
      </div>
    </div>
  )
}

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

        {/* Mockups — desktop: 4-up with perspective, mobile: auto carousel */}
        {isMobile ? (
          <MobileCarousel />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'clamp(0.5rem,1.5vw,1.25rem)', alignItems: 'flex-end', maxWidth: 'min(60rem,100%)', margin: '0 auto' }}>
            {MOCKS.map(mock => (
              <a key={mock.src} href="https://form.typeform.com/to/xo1Bskym" target="_blank" rel="noopener noreferrer"
                style={{ display: 'block', perspective: '62.5rem', textDecoration: 'none' }}>
                <img src={mock.src} alt={mock.alt} loading="lazy"
                  style={{ width: '100%', display: 'block', transform: `translate3d(0, 3.125rem, 0) rotateY(${mock.rotateY})`, transformStyle: 'preserve-3d', transition: 'transform 0.5s ease' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLImageElement).style.transform = `translate3d(0, 1.25rem, 0) rotateY(${mock.rotateY})` }}
                  onMouseLeave={e => { (e.currentTarget as HTMLImageElement).style.transform = `translate3d(0, 3.125rem, 0) rotateY(${mock.rotateY})` }} />
              </a>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
