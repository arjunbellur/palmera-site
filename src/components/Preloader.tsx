'use client'
import { useEffect, useState } from 'react'

export default function Preloader() {
  const [phase, setPhase] = useState<'loading' | 'fadeout' | 'done'>('loading')

  useEffect(() => {
    // Wait for fonts + first paint, then start exit
    const exit = () => {
      setPhase('fadeout')
      setTimeout(() => setPhase('done'), 900)
    }

    // If page already loaded (fast connection), short minimum display
    if (document.readyState === 'complete') {
      const t = setTimeout(exit, 1200)
      return () => clearTimeout(t)
    }

    const onLoad = () => { setTimeout(exit, 600) }
    window.addEventListener('load', onLoad)
    // Hard timeout — never block more than 4s
    const hardTimeout = setTimeout(exit, 4000)
    return () => {
      window.removeEventListener('load', onLoad)
      clearTimeout(hardTimeout)
    }
  }, [])

  if (phase === 'done') return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: '#2a2119',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: '2rem',
      opacity: phase === 'fadeout' ? 0 : 1,
      transition: phase === 'fadeout' ? 'opacity 0.9s cubic-bezier(0.4,0,0.2,1)' : 'none',
      pointerEvents: phase === 'fadeout' ? 'none' : 'all',
    }}>
      {/* Logo wordmark with letter-by-letter reveal */}
      <div style={{ overflow: 'hidden' }}>
        <p style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(3rem, 8vw, 6rem)',
          fontWeight: 500,
          letterSpacing: '-0.02em',
          color: 'hsla(36.84, 47.11%, 76.27%, 1)',
          margin: 0,
          lineHeight: 1,
          animation: 'palmeraReveal 0.9s cubic-bezier(0.16,1,0.3,1) 0.2s both',
        }}>
          Palmera
        </p>
      </div>

      {/* Thin progress line */}
      <div style={{ width: '4rem', height: '1px', background: 'rgba(223,201,166,0.2)', borderRadius: '1px', overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          background: 'hsla(36.84, 47.11%, 76.27%, 0.7)',
          borderRadius: '1px',
          animation: 'palmeraLine 1.4s cubic-bezier(0.4,0,0.2,1) 0.3s both',
        }} />
      </div>

      {/* Subtle tagline */}
      <p style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '0.625rem',
        letterSpacing: '0.25em',
        textTransform: 'uppercase',
        color: 'rgba(223,201,166,0.35)',
        margin: 0,
        animation: 'palmeraFadeIn 0.8s ease 0.7s both',
      }}>
        Where Leisure Lives
      </p>

      <style>{`
        @keyframes palmeraReveal {
          from { transform: translateY(110%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes palmeraLine {
          from { width: 0%; }
          to   { width: 100%; }
        }
        @keyframes palmeraFadeIn {
          from { opacity: 0; transform: translateY(0.5rem); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
