'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navLinks = [
    { label: 'Learn', href: '#base' },
    { label: 'Location', href: '#makes' },
    { label: 'Experience', href: '#skills' },
    { label: 'App', href: '#story' },
    { label: 'Sign Up', href: '#signal' },
    { label: 'Partners', href: '/partners' },
  ]

  const navStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    padding: '0 32px',
    height: '64px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    transition: 'background 0.5s ease',
    background: scrolled ? 'rgba(4,4,4,0.9)' : 'transparent',
    backdropFilter: scrolled ? 'blur(16px)' : 'none',
  }

  const linkStyle: React.CSSProperties = {
    fontFamily: 'Geist Mono Variable, Courier New, monospace',
    fontSize: '11px',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'rgba(235,232,219,0.65)',
    textDecoration: 'none',
    transition: 'color 0.2s ease',
  }

  return (
    <nav style={navStyle}>
      {/* Mobile brand — left */}
      <Link href="/" style={{ textDecoration: 'none' }}>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'rgba(235,232,219,0.8)',
        }}>
          The Palmera Experience
        </span>
      </Link>

      {/* Desktop nav center */}
      <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }} className="hidden md:flex">
        <Link href="/" style={{ ...linkStyle, color: 'rgba(235,232,219,0.8)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#be9a56')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(235,232,219,0.8)')}>
          Palmera
        </Link>
        {navLinks.map(link => (
          <Link key={link.label} href={link.href}
            style={linkStyle}
            onMouseEnter={e => (e.currentTarget.style.color = '#be9a56')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(235,232,219,0.65)')}>
            {link.label}
          </Link>
        ))}
      </div>

      {/* CTA */}
      <a
        href="https://form.typeform.com/to/xo1Bskym"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: '#040404',
          background: '#ebe8db',
          padding: '9px 20px',
          textDecoration: 'none',
          transition: 'background 0.2s ease',
        }}
        className="hidden md:block"
        onMouseEnter={e => (e.currentTarget.style.background = '#be9a56')}
        onMouseLeave={e => (e.currentTarget.style.background = '#ebe8db')}
      >
        Early Access
      </a>

      {/* Mobile hamburger */}
      <button
        className="md:hidden"
        onClick={() => setMenuOpen(!menuOpen)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
        aria-label="Toggle menu"
      >
        {[0,1,2].map(i => (
          <span key={i} style={{
            display: 'block', width: '22px', height: '1px',
            background: '#ebe8db', marginBottom: i < 2 ? '5px' : '0',
            transition: 'all 0.3s ease',
            transform: menuOpen && i===0 ? 'rotate(45deg) translateY(6px)' : menuOpen && i===2 ? 'rotate(-45deg) translateY(-6px)' : 'none',
            opacity: menuOpen && i===1 ? 0 : 1,
          }} />
        ))}
      </button>

      {menuOpen && (
        <div style={{
          position: 'fixed', top: '64px', left: 0, right: 0,
          background: 'rgba(4,4,4,0.97)', backdropFilter: 'blur(20px)',
          padding: '32px', borderBottom: '1px solid rgba(235,232,219,0.08)',
          display: 'flex', flexDirection: 'column', gap: '20px',
        }}>
          {navLinks.map(link => (
            <Link key={link.label} href={link.href}
              onClick={() => setMenuOpen(false)}
              style={{ ...linkStyle, fontSize: '15px', color: 'rgba(235,232,219,0.75)' }}>
              {link.label}
            </Link>
          ))}
          <a href="https://form.typeform.com/to/xo1Bskym" target="_blank" rel="noopener noreferrer"
            style={{ ...linkStyle, color: '#040404', background: '#ebe8db', padding: '12px 20px', textAlign: 'center', marginTop: '8px' }}>
            Early Access
          </a>
        </div>
      )}
    </nav>
  )
}
