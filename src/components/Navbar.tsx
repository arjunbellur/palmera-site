'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

const LINKS = [
  { label: 'Learn', href: '#base' },
  { label: 'Location', href: '#makes' },
  { label: 'Experience', href: '#skills' },
  { label: 'App', href: '#story' },
  { label: 'Sign Up', href: '#signal' },
  { label: 'Partners', href: '/partners' },
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

  const tan = '#dfc9a6'
  const dark = '#2a2119'
  const linkBg = isLight ? 'rgba(42,33,25,0.1)' : 'rgba(42,33,25,0.65)'
  const linkText = isLight ? dark : tan
  const brandBg = 'rgba(42,33,25,0.88)'
  const ctaBg = isLight ? dark : tan
  const ctaText = isLight ? tan : dark

  const pill: React.CSSProperties = {
    padding: '0.625rem 1.125rem',
    borderRadius: '0.25rem',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    textDecoration: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'background 0.35s ease, color 0.35s ease',
    border: 'none',
  }

  const mono: React.CSSProperties = {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.75rem',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    lineHeight: 1.33,
    fontWeight: 400,
  }

  if (isMobile) {
    return (
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href="/" style={{ ...pill, background: brandBg, textDecoration: 'none' }}>
            <span style={{ ...mono, color: tan }}>Palmera</span>
          </Link>
          <button onClick={() => setMenuOpen(o => !o)}
            style={{ ...pill, background: linkBg, flexDirection: 'column', padding: '0.625rem 0.875rem' }}>
            {[0,1,2].map(i => (
              <span key={i} style={{
                display: 'block', width: '1.125rem', height: '1.5px', background: linkText, margin: '0.1875rem 0',
                transition: 'all 0.25s ease',
                transform: menuOpen && i===0 ? 'rotate(45deg) translateY(0.4375rem)' : menuOpen && i===2 ? 'rotate(-45deg) translateY(-0.4375rem)' : 'none',
                opacity: menuOpen && i===1 ? 0 : 1,
              }} />
            ))}
          </button>
        </div>
        {menuOpen && (
          <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {LINKS.map(l => (
              <Link key={l.label} href={l.href} onClick={() => setMenuOpen(false)}
                style={{ ...pill, background: linkBg, textDecoration: 'none' }}>
                <span style={{ ...mono, color: linkText }}>{l.label}</span>
              </Link>
            ))}
            <a href="https://form.typeform.com/to/xo1Bskym" target="_blank" rel="noopener noreferrer"
              onClick={() => setMenuOpen(false)}
              style={{ ...pill, background: ctaBg, textDecoration: 'none' }}>
              <span style={{ ...mono, color: ctaText }}>Early Access</span>
            </a>
          </div>
        )}
      </nav>
    )
  }

  return (
    <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, padding: '1rem 1.5rem' }}>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', width: '100%' }}>
        <Link href="/" style={{ ...pill, background: brandBg, flexShrink: 0, textDecoration: 'none', minWidth: '6.875rem' }}>
          <span style={{ ...mono, color: tan }}>Palmera</span>
        </Link>
        {LINKS.map(l => (
          <Link key={l.label} href={l.href}
            style={{ ...pill, background: linkBg, flex: 1, textDecoration: 'none' }}>
            <span style={{ ...mono, color: linkText }}>{l.label}</span>
          </Link>
        ))}
        <a href="https://form.typeform.com/to/xo1Bskym" target="_blank" rel="noopener noreferrer"
          style={{ ...pill, background: ctaBg, flexShrink: 0, textDecoration: 'none', minWidth: '7.5rem' }}>
          <span style={{ ...mono, color: ctaText }}>Early Access</span>
        </a>
      </div>
    </nav>
  )
}
