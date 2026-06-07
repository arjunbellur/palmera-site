'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const LINKS = [
  { label: 'Learn', href: '#base' },
  { label: 'Location', href: '#makes' },
  { label: 'Experience', href: '#skills' },
  { label: 'App', href: '#story' },
  { label: 'Sign Up', href: '#signal' },
]

export default function Navbar() {
  const [isMobile, setIsMobile] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [onLight, setOnLight] = useState(false)

  useEffect(() => {
    const checkWidth = () => setIsMobile(window.innerWidth < 768)
    checkWidth()
    window.addEventListener('resize', checkWidth)

    // Detect if we're over a light section
    const checkBg = () => {
      const base = document.getElementById('base')
      const skills = document.getElementById('skills')
      const footer = document.querySelector('footer')
      const scrollY = window.scrollY
      let light = false
      for (const el of [base, skills, footer]) {
        if (!el) continue
        const rect = el.getBoundingClientRect()
        if (rect.top < 80 && rect.bottom > 0) { light = true; break }
      }
      setOnLight(light)
    }
    window.addEventListener('scroll', checkBg, { passive: true })
    checkBg()

    return () => {
      window.removeEventListener('resize', checkWidth)
      window.removeEventListener('scroll', checkBg)
    }
  }, [])

  const textColor = onLight ? '#2a2119' : '#dfc9a6'
  const brandBg = onLight ? 'rgba(42,33,25,0.12)' : 'rgba(42,33,25,0.55)'
  const linkBg = onLight ? 'rgba(42,33,25,0.08)' : 'rgba(255,255,255,0.28)'
  const ctaBg = onLight ? '#2a2119' : '#dfc9a6'
  const ctaText = onLight ? '#ebe8db' : '#2a2119'

  const pill: React.CSSProperties = {
    padding: '9px 16px',
    borderRadius: '4px',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    textDecoration: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
    transition: 'background 0.3s, color 0.3s',
  }

  const label: React.CSSProperties = {
    fontFamily: 'Geist Mono Variable, Courier New, monospace',
    fontSize: '11px',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    lineHeight: 1.33,
  }

  if (isMobile) {
    return (
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href="#hero" style={{ ...pill, background: brandBg, textDecoration: 'none' }}>
            <span style={{ ...label, color: textColor }}>The Palmera Experience</span>
          </Link>
          <button onClick={() => setMenuOpen(!menuOpen)}
            style={{ ...pill, background: linkBg, border: 'none', flexDirection: 'column', gap: '0', padding: '10px 14px' }}>
            {[0,1,2].map(i => (
              <span key={i} style={{
                display: 'block', width: '18px', height: '1px',
                background: textColor, margin: '3px 0',
                transition: 'all 0.25s',
                transform: menuOpen && i===0 ? 'rotate(45deg) translateY(7px)' : menuOpen && i===2 ? 'rotate(-45deg) translateY(-7px)' : 'none',
                opacity: menuOpen && i===1 ? 0 : 1,
              }} />
            ))}
          </button>
        </div>
        {menuOpen && (
          <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[...LINKS, { label: 'Partners', href: '/partners' }].map(l => (
              <Link key={l.label} href={l.href} onClick={() => setMenuOpen(false)}
                style={{ ...pill, background: linkBg, textDecoration: 'none' }}>
                <span style={{ ...label, color: textColor }}>{l.label}</span>
              </Link>
            ))}
            <a href="https://form.typeform.com/to/xo1Bskym" target="_blank" rel="noopener noreferrer"
              style={{ ...pill, background: ctaBg, textDecoration: 'none' }}>
              <span style={{ ...label, color: ctaText }}>Early Access</span>
            </a>
          </div>
        )}
      </nav>
    )
  }

  return (
    <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, padding: '16px 24px' }}>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '100%' }}>
        <Link href="#hero" style={{ ...pill, background: brandBg, flexShrink: 0, textDecoration: 'none' }}>
          <span style={{ ...label, color: textColor }}>Palmera</span>
        </Link>
        {[...LINKS, { label: 'Partners', href: '/partners' }].map(l => (
          <Link key={l.label} href={l.href}
            style={{ ...pill, background: linkBg, flex: 1, textDecoration: 'none' }}>
            <span style={{ ...label, color: textColor }}>{l.label}</span>
          </Link>
        ))}
        <a href="https://form.typeform.com/to/xo1Bskym" target="_blank" rel="noopener noreferrer"
          style={{ ...pill, background: ctaBg, flexShrink: 0, textDecoration: 'none' }}>
          <span style={{ ...label, color: ctaText }}>Early Access</span>
        </a>
      </div>
    </nav>
  )
}
