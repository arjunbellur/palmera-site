'use client'

import { useEffect, useState } from 'react'

export default function Hero() {
  const [loaded, setLoaded] = useState(false)
  useEffect(() => { const t = setTimeout(() => setLoaded(true), 100); return () => clearTimeout(t) }, [])

  return (
    <section id="hero" style={{ position: 'relative', height: '100vh', minHeight: '600px', overflow: 'hidden' }}>
      <video autoPlay muted loop playsInline
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }}>
        <source src="/videos/4440816-hd_1920_1080_25fps_mp4.mp4" type="video/mp4" />
      </video>
      <div style={{ position: 'absolute', inset: 0, zIndex: 1, background: 'linear-gradient(to bottom, rgba(4,4,4,0.15) 0%, rgba(4,4,4,0.45) 70%, rgba(4,4,4,0.82) 100%)' }} />

      <div style={{ position: 'relative', zIndex: 2, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '80px 40px 48px' }}>
        {/* Top-left: big Palmera heading */}
        <div>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(72px, 11vw, 160px)',
            fontWeight: 500,
            lineHeight: 0.95,
            letterSpacing: '-0.02em',
            color: '#ebe8db',
            margin: 0,
            opacity: loaded ? 1 : 0,
            transition: 'opacity 1s ease 0.2s',
          }}>
            Palmera
          </h1>
        </div>

        {/* Bottom bar: PALMERA | tagline | 2025 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', alignItems: 'flex-end', gap: '24px' }}>
          <p style={{ fontFamily: 'Geist Mono Variable, Courier New, monospace', fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(235,232,219,0.7)', margin: 0 }}>
            PALMERA
          </p>
          <p style={{ fontFamily: 'Geist Mono Variable, Courier New, monospace', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(235,232,219,0.6)', margin: 0, textAlign: 'center', lineHeight: 1.6 }}>
            WHERE LEISURE LIVES.<br />BUILT FOR CONVENIENCE. ENJOYED WITH FRIENDS.
          </p>
          <p style={{ fontFamily: 'Geist Mono Variable, Courier New, monospace', fontSize: '11px', letterSpacing: '0.18em', color: 'rgba(235,232,219,0.4)', margin: 0, textAlign: 'right' }}>
            2025
          </p>
        </div>
      </div>
    </section>
  )
}
