'use client'

import { useEffect, useState } from 'react'

export default function Hero() {
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 200)
    return () => clearTimeout(t)
  }, [])

  return (
    <section id="hero" style={{ position: 'relative', height: '100vh', minHeight: '600px', overflow: 'hidden' }}>
      {/* Video background */}
      <video
        autoPlay muted loop playsInline
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }}
        poster="/videos/4440816-hd_1920_1080_25fps_poster.0000000.jpg"
      >
        <source src="/videos/4440816-hd_1920_1080_25fps_mp4.mp4" type="video/mp4" />
        <source src="/videos/4440816-hd_1920_1080_25fps.mp4" type="video/mp4" />
      </video>

      {/* Dark overlay */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1,
        background: 'linear-gradient(to bottom, rgba(4,4,4,0.2) 0%, rgba(4,4,4,0.55) 70%, rgba(4,4,4,0.88) 100%)',
      }} />

      {/* Main content */}
      <div style={{
        position: 'relative', zIndex: 2,
        height: '100%', display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '0',
        maxWidth: '1400px', margin: '0 auto',
      }}>
        {/* Center — giant PALMERA heading */}
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '0 40px',
        }}>
          <div style={{ position: 'relative' }}>
            {/* Logo image behind heading */}
            <img
              src="/images/PALMERA_cracked.png"
              alt=""
              style={{
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 'clamp(200px, 30vw, 400px)',
                opacity: 0.15,
                pointerEvents: 'none',
              }}
            />
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(80px, 16vw, 220px)',
                lineHeight: 1,
                fontWeight: 500,
                letterSpacing: '-0.02em',
                color: '#ebe8db',
                textAlign: 'center',
                position: 'relative',
                opacity: loaded ? 1 : 0,
                transition: 'opacity 1.2s ease 0.3s',
              }}
            >
              Palmera
            </h1>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'flex-end',
          padding: '0 40px 48px',
          gap: '24px',
        }}>
          {/* Left — PALMERA label */}
          <div>
            <p className="label" style={{ color: 'var(--color-tan)' }}>PALMERA</p>
          </div>

          {/* Center — tagline */}
          <div style={{ textAlign: 'center' }}>
            <p className="label" style={{
              color: 'rgba(235,232,219,0.75)',
              lineHeight: 1.6,
              maxWidth: '360px',
            }}>
              Where Leisure Lives.<br />
              Built for convenience. Enjoyed with Friends.
            </p>
          </div>

          {/* Right — year */}
          <div style={{ textAlign: 'right' }}>
            <p className="label" style={{ color: 'rgba(235,232,219,0.4)' }}>2025</p>
          </div>
        </div>
      </div>
    </section>
  )
}
