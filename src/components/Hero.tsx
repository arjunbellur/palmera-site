'use client'
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useViewport } from '@/lib/use-viewport'

export default function Hero() {
  const [loaded, setLoaded] = useState(false)
  const t = useTranslations('hero')
  const { isMobile } = useViewport()
  useEffect(() => { const tm = setTimeout(() => setLoaded(true), 100); return () => clearTimeout(tm) }, [])

  return (
    <section id="hero" style={{ position: 'relative', height: '100vh', minHeight: '37.5rem', overflow: 'hidden' }}>
      <video autoPlay muted loop playsInline preload="none"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }}>
        <source src="https://www.dropbox.com/scl/fi/2b60wytagikvetyvwsn50/Palmera-hero-1.mp4?rlkey=a1id033b3y1q6rb3615o94ywx&st=4yisasf9&dl=1" type="video/mp4" />
      </video>
      <div style={{ position: 'absolute', inset: 0, zIndex: 1, background: 'linear-gradient(to bottom, rgba(4,4,4,0.15) 0%, rgba(4,4,4,0.45) 70%, rgba(4,4,4,0.82) 100%)' }} />
      <div style={{ position: 'relative', zIndex: 2, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 'clamp(4rem,5.5vw,5rem) clamp(1.25rem,4.5vw,2.5rem) clamp(2rem,3.5vw,3rem)' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(3.75rem,12vw,10rem)', fontWeight: 500, lineHeight: 0.95, letterSpacing: '-0.02em', color: '#ebe8db', margin: 0, opacity: loaded ? 1 : 0, transition: 'opacity 1s ease 0.2s' }}>
            Palmera
          </h1>
        </div>
        {isMobile ? (
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'clamp(0.7rem,2vw,0.875rem)', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#ebe8db', margin: 0, lineHeight: 1.7, fontWeight: 500 }}>
              {t('tagline')}<br />{t('subtitle')}
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', alignItems: 'flex-end', gap: 'clamp(1rem,2vw,1.5rem)' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'clamp(0.75rem,1.5vw,0.875rem)', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#ebe8db', margin: 0, fontWeight: 500 }}>PALMERA</p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'clamp(0.75rem,1.5vw,0.875rem)', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#ebe8db', margin: 0, textAlign: 'center', lineHeight: 1.6, fontWeight: 500 }}>
              {t('tagline')}<br />{t('subtitle')}
            </p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'clamp(0.75rem,1.5vw,0.875rem)', letterSpacing: '0.15em', color: 'rgba(235,232,219,0.88)', margin: 0, textAlign: 'right', fontWeight: 500 }}>{t('year')}</p>
          </div>
        )}
      </div>
    </section>
  )
}
