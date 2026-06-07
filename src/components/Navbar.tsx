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

const labelStyle: React.CSSProperties = {
  fontFamily: 'Geist Mono Variable, Courier New, monospace',
  fontSize: '11px',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  lineHeight: 1.33,
}

const pillBase: React.CSSProperties = {
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
}

export default function Navbar() {
  const [isMobile, setIsMobile] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  if (isMobile) {
    return (
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href="#hero" style={{ ...pillBase, background: 'rgba(42,33,25,0.55)', textDecoration: 'none' }}>
            <span style={{ ...labelStyle, color: '#dfc9a6' }}>The Palmera Experience</span>
          </Link>
          <button onClick={() => setMenuOpen(!menuOpen)}
            style={{ ...pillBase, background: 'rgba(255,255,255,0.28)', border: 'none', gap: '0', flexDirection: 'column', padding: '10px 14px' }}>
            {[0,1,2].map(i => (
              <span key={i} style={{ display: 'block', width: '18px', height: '1px', background: '#dfc9a6', margin: '3px 0',
                transition: 'all 0.25s',
                transform: menuOpen && i===0 ? 'rotate(45deg) translateY(7px)' : menuOpen && i===2 ? 'rotate(-45deg) translateY(-7px)' : 'none',
                opacity: menuOpen && i===1 ? 0 : 1 }} />
            ))}
          </button>
        </div>
        {menuOpen && (
          <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {LINKS.map(l => (
              <Link key={l.label} href={l.href} onClick={() => setMenuOpen(false)}
                style={{ ...pillBase, background: 'rgba(255,255,255,0.22)', textDecoration: 'none' }}>
                <span style={{ ...labelStyle, color: '#dfc9a6' }}>{l.label}</span>
              </Link>
            ))}
            <Link href="/partners" onClick={() => setMenuOpen(false)}
              style={{ ...pillBase, background: 'rgba(255,255,255,0.22)', textDecoration: 'none' }}>
              <span style={{ ...labelStyle, color: '#dfc9a6' }}>Partners</span>
            </Link>
            <a href="https://form.typeform.com/to/xo1Bskym" target="_blank" rel="noopener noreferrer"
              style={{ ...pillBase, background: '#dfc9a6', textDecoration: 'none' }}>
              <span style={{ ...labelStyle, color: '#2a2119' }}>Early Access</span>
            </a>
          </div>
        )}
      </nav>
    )
  }

  // Desktop — single row pill bar
  return (
    <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, padding: '16px 24px' }}>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '100%' }}>
        {/* Brand pill — fixed width */}
        <Link href="#hero" style={{ ...pillBase, background: 'rgba(42,33,25,0.55)', flexShrink: 0, textDecoration: 'none' }}>
          <span style={{ ...labelStyle, color: '#dfc9a6' }}>Palmera</span>
        </Link>

        {/* Nav links — each flex:1 to fill row */}
        {LINKS.map(l => (
          <Link key={l.label} href={l.href}
            style={{ ...pillBase, background: 'rgba(255,255,255,0.28)', flex: 1, textDecoration: 'none' }}>
            <span style={{ ...labelStyle, color: '#dfc9a6' }}>{l.label}</span>
          </Link>
        ))}
        <Link href="/partners"
          style={{ ...pillBase, background: 'rgba(255,255,255,0.28)', flex: 1, textDecoration: 'none' }}>
          <span style={{ ...labelStyle, color: '#dfc9a6' }}>Partners</span>
        </Link>

        {/* CTA — fixed width */}
        <a href="https://form.typeform.com/to/xo1Bskym" target="_blank" rel="noopener noreferrer"
          style={{ ...pillBase, background: '#dfc9a6', flexShrink: 0, textDecoration: 'none' }}>
          <span style={{ ...labelStyle, color: '#2a2119' }}>Early Access</span>
        </a>
      </div>
    </nav>
  )
}
