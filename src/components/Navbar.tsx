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
  const [isLight, setIsLight] = useState(false)

  useEffect(() => {
    const checkWidth = () => setIsMobile(window.innerWidth < 768)
    checkWidth()
    window.addEventListener('resize', checkWidth)

    const checkSection = () => {
      const lightIds = ['base', 'skills']
      const footer = document.querySelector('footer')
      let light = false
      for (const id of lightIds) {
        const el = document.getElementById(id)
        if (el) {
          const r = el.getBoundingClientRect()
          if (r.top < 64 && r.bottom > 0) { light = true; break }
        }
      }
      if (footer) {
        const r = footer.getBoundingClientRect()
        if (r.top < 64 && r.bottom > 0) light = true
      }
      setIsLight(light)
    }
    window.addEventListener('scroll', checkSection, { passive: true })
    checkSection()
    return () => {
      window.removeEventListener('resize', checkWidth)
      window.removeEventListener('scroll', checkSection)
    }
  }, [])

  const dark = '#2a2119'
  const tan = '#dfc9a6'
  const textColor = isLight ? dark : tan
  const brandBg = isLight ? 'rgba(42,33,25,0.9)' : 'rgba(42,33,25,0.85)'
  const brandText = tan
  const linkBg = isLight ? 'rgba(235,228,215,0.85)' : 'rgba(42,33,25,0.55)'
  const linkText = isLight ? dark : tan
  const ctaBg = isLight ? dark : tan
  const ctaText = isLight ? tan : dark

  const pill: React.CSSProperties = {
    padding: '9px 16px',
    borderRadius: '4px',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    textDecoration: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
    transition: 'background 0.4s ease, color 0.4s ease',
  }

  const mono: React.CSSProperties = {
    fontFamily: 'Geist Mono Variable, Courier New, monospace',
    fontSize: '11px',
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    lineHeight: 1.33,
  }

  const allLinks = [...LINKS, { label: 'Partners', href: '/partners' }]

  if (isMobile) {
    return (
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href="/" style={{ ...pill, background: brandBg, textDecoration: 'none' }}>
            <span style={{ ...mono, color: brandText }}>The Palmera Experience</span>
          </Link>
          <button onClick={() => setMenuOpen(o => !o)}
            style={{ ...pill, background: linkBg, border: 'none', flexDirection: 'column', padding: '10px 14px' }}>
            {[0,1,2].map(i => (
              <span key={i} style={{ display: 'block', width: '18px', height: '1.5px', background: linkText, margin: '3px 0',
                transition: 'all 0.25s ease',
                transform: menuOpen && i===0 ? 'rotate(45deg) translateY(7px)' : menuOpen && i===2 ? 'rotate(-45deg) translateY(-7px)' : 'none',
                opacity: menuOpen && i===1 ? 0 : 1 }} />
            ))}
          </button>
        </div>
        {menuOpen && (
          <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {allLinks.map(l => (
              <Link key={l.label} href={l.href} onClick={() => setMenuOpen(false)}
                style={{ ...pill, background: linkBg, textDecoration: 'none' }}>
                <span style={{ ...mono, color: linkText }}>{l.label}</span>
              </Link>
            ))}
            <a href="https://form.typeform.com/to/xo1Bskym" target="_blank" rel="noopener noreferrer" onClick={() => setMenuOpen(false)}
              style={{ ...pill, background: ctaBg, textDecoration: 'none' }}>
              <span style={{ ...mono, color: ctaText }}>Early Access</span>
            </a>
          </div>
        )}
      </nav>
    )
  }

  return (
    <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, padding: '16px 24px' }}>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '100%' }}>
        <Link href="/" style={{ ...pill, background: brandBg, flexShrink: 0, textDecoration: 'none', minWidth: '100px' }}>
          <span style={{ ...mono, color: brandText }}>Palmera</span>
        </Link>
        {allLinks.map(l => (
          <Link key={l.label} href={l.href}
            style={{ ...pill, background: linkBg, flex: 1, textDecoration: 'none' }}>
            <span style={{ ...mono, color: linkText }}>{l.label}</span>
          </Link>
        ))}
        <a href="https://form.typeform.com/to/xo1Bskym" target="_blank" rel="noopener noreferrer"
          style={{ ...pill, background: ctaBg, flexShrink: 0, textDecoration: 'none', minWidth: '100px' }}>
          <span style={{ ...mono, color: ctaText }}>Early Access</span>
        </a>
      </div>
    </nav>
  )
}
