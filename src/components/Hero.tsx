'use client'
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'

export default function Hero() {
  const [loaded, setLoaded] = useState(false)
  const t = useTranslations('hero')
  useEffect(() => { const tm = setTimeout(() => setLoaded(true), 100); return () => clearTimeout(tm) }, [])

  return (
    <section id="hero" style={{ position: 'relative', height: '100vh', minHeight: '37.5rem', overflow: 'hidden' }}>
      <video autoPlay muted loop playsInline preload="none"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }}>
        <source src="/videos/4440816-hd_1920_1080_25fps_mp4.mp4" type="video/mp4" />
      </video>
      <div style={{ position: 'absolute', inset: 0, zIndex: 1, background: 'linear-gradient(to bottom, rgba(4,4,4,0.15) 0%, rgba(4,4,4,0.45) 70%, rgba(4,4,4,0.82) 100%)' }} />
      <div style={{ position: 'relative', zIndex: 2, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '5rem 2.5rem 3rem' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(4.5rem, 11vw, 10rem)', fontWeight: 500, lineHeight: 0.95, letterSpacing: '-0.02em', color: '#ebe8db', margin: 0, opacity: loaded ? 1 : 0, transition: 'opacity 1s ease 0.2s' }}>
            Palmera
          </h1>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', alignItems: 'flex-end', gap: '1.5rem' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#ebe8db', margin: 0, fontWeight: 500 }}>PALMERA</p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#ebe8db', margin: 0, textAlign: 'center', lineHeight: 1.6, fontWeight: 500 }}>
            {t('tagline')}<br />{t('subtitle')}
          </p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem', letterSpacing: '0.15em', color: 'rgba(235,232,219,0.88)', margin: 0, textAlign: 'right', fontWeight: 500 }}>{t('year')}</p>
        </div>
      </div>
    </section>
  )
}
