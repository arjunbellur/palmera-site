'use client'
import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useViewport } from '@/lib/use-viewport'

// Cloudinary delivery. f_auto lets Cloudinary serve the lightest codec each
// browser supports and q_auto compresses aggressively; w_1280 caps the size so
// the clip starts fast on cellular — all of which make iOS Safari far more
// willing to autoplay it. so_0 grabs the first frame as a poster.
const CLOUD = 'https://res.cloudinary.com/dgthehvgs/video/upload'
const VIDEO_ID = 'v1781892852/palmera-hero'
const VIDEO_SRC = `${CLOUD}/f_auto,q_auto,w_1280/${VIDEO_ID}.mp4`
const POSTER_SRC = `${CLOUD}/so_0,f_auto,q_auto,w_1280/${VIDEO_ID}.jpg`

export default function Hero() {
  const [loaded, setLoaded] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const t = useTranslations('hero')
  const { isMobile } = useViewport()
  useEffect(() => { const tm = setTimeout(() => setLoaded(true), 100); return () => clearTimeout(tm) }, [])

  // iOS Safari only autoplays a video it sees as muted+inline at the DOM-property
  // level. React's JSX `muted` prop is unreliable, so force it here and kick off play.
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    v.muted = true
    v.defaultMuted = true
    const tryPlay = () => { v.play().catch(() => {}) }
    tryPlay()
    v.addEventListener('canplay', tryPlay, { once: true })

    // Fallback: if iOS still blocks autoplay (e.g. Low Power Mode), start on the
    // first user gesture so the poster/tap-to-play overlay clears itself.
    const onGesture = () => tryPlay()
    window.addEventListener('touchstart', onGesture, { once: true, passive: true })
    window.addEventListener('scroll', onGesture, { once: true, passive: true })
    return () => {
      v.removeEventListener('canplay', tryPlay)
      window.removeEventListener('touchstart', onGesture)
      window.removeEventListener('scroll', onGesture)
    }
  }, [])

  return (
    <section id="hero" style={{ position: 'relative', height: '100vh', minHeight: '37.5rem', overflow: 'hidden' }}>
      <video ref={videoRef} autoPlay muted loop playsInline preload="auto" poster={POSTER_SRC}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }}>
        <source src={VIDEO_SRC} type="video/mp4" />
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
