'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import LanguageToggle from './LanguageToggle'

export default function Navbar({ messages }: { messages: Record<string, string> }) {
  const [isMobile, setIsMobile] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [isLight, setIsLight] = useState(false)
  const [activeSection, setActiveSection] = useState('')

  const LINKS = [
    { label: messages.learn,      href: '#base',      section: 'base' },
    { label: messages.location,   href: '#makes',     section: 'makes' },
    { label: messages.experience, href: '#skills',    section: 'skills' },
    { label: messages.app,        href: '#story',     section: 'story' },
    { label: messages.signup,     href: '#signal',    section: 'signal' },
    { label: messages.partners,   href: '/dashboard', section: '' },
  ]

  useEffect(() => {
    const checkWidth = () => setIsMobile(window.innerWidth < 768)
    checkWidth()
    window.addEventListener('resize', checkWidth)

    const onScroll = () => {
      const lightIds = ['base', 'skills']
      const footer = document.querySelector('footer')
      let light = false
      for (const id of lightIds) {
        const el = document.getElementById(id)
        if (el) { const r = el.getBoundingClientRect(); if (r.top < 64 && r.bottom > 0) { light = true; break } }
      }
      if (footer) { const r = footer.getBoundingClientRect(); if (r.top < 64) light = true }
      setIsLight(light)

      const sectionIds = ['base', 'makes', 'skills', 'story', 'signal']
      let current = ''
      for (const id of sectionIds) {
        const el = document.getElementById(id)
        if (el) { const r = el.getBoundingClientRect(); if (r.top <= 80 && r.bottom > 80) { current = id; break } }
      }
      setActiveSection(current)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => {
      window.removeEventListener('resize', checkWidth)
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  const tan = 'hsla(36.84, 47.11%, 76.27%, 1)'
  const dark = '#2a2119'

  const isActive = (section: string) => !!(section && activeSection === section)

  // On dark sections: base bg = white@32%, active = white@92%
  // On light sections: base bg = dark@10%, active = dark@18%
  // This ensures the slide-in highlight is always visible
  const navBg = (section: string) => {
    if (isActive(section)) return isLight ? 'rgba(42,33,25,0.18)' : 'rgba(255,255,255,0.92)'
    return isLight ? 'rgba(42,33,25,0.1)' : 'rgba(255,255,255,0.32)'
  }

  // Text: on active pill = always dark (for contrast against white/dark bg)
  // On inactive: tan on dark sections, dark on light sections
  const textCol = (section: string) => {
    if (isActive(section)) return dark
    return isLight ? dark : tan
  }

  // Slide-in highlight color:
  // Dark sections → white slides in
  // Light sections → dark@15% slides in (visible on cream bg)
  const highlightBg = isLight ? 'rgba(42,33,25,0.15)' : 'rgba(255,255,255,1)'

  const pill: React.CSSProperties = {
    padding: '8px 18px',
    borderRadius: '4px',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    textDecoration: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'background 0.35s ease',
    border: 'none',
    position: 'relative',
    overflow: 'hidden',
  }

  const mono: React.CSSProperties = {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.75rem',
    letterSpacing: '0.125rem',
    textTransform: 'uppercase',
    lineHeight: 1.33,
    fontWeight: 400,
    position: 'relative',
    zIndex: 1,
    transition: 'color 0.3s ease',
  }

  const brandBg = 'rgba(42,33,25,0.88)'
  const ctaBg = isLight ? dark : tan
  const ctaText = isLight ? tan : dark

  if (isMobile) {
    return (
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, padding: '1rem 1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
          <Link href="/" style={{ ...pill, background: brandBg, textDecoration: 'none' }}>
            <span style={{ ...mono, color: tan }}>Palmera</span>
          </Link>
          <LanguageToggle light={isLight} />
          <button
            onClick={() => setMenuOpen(o => !o)}
            style={{ ...pill, background: navBg(''), flexDirection: 'column', padding: '10px 14px' } as React.CSSProperties}
          >
            {[0, 1, 2].map(i => (
              <span key={i} style={{
                display: 'block', width: '18px', height: '1.5px',
                background: isLight ? dark : tan,
                margin: '3px 0', transition: 'all 0.25s ease',
                transform: menuOpen && i === 0 ? 'rotate(45deg) translateY(7px)'
                  : menuOpen && i === 2 ? 'rotate(-45deg) translateY(-7px)' : 'none',
                opacity: menuOpen && i === 1 ? 0 : 1,
              }} />
            ))}
          </button>
        </div>
        {menuOpen && (
          <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {LINKS.map(l => (
              <Link key={l.label} href={l.href} onClick={() => setMenuOpen(false)}
                style={{ ...pill, background: navBg(l.section), textDecoration: 'none' }}>
                <span style={{ ...mono, color: textCol(l.section) }}>{l.label}</span>
              </Link>
            ))}
            <a href="https://form.typeform.com/to/xo1Bskym" target="_blank" rel="noopener noreferrer"
              onClick={() => setMenuOpen(false)}
              style={{ ...pill, background: ctaBg, textDecoration: 'none' }}>
              <span style={{ ...mono, color: ctaText }}>{messages.earlyAccess}</span>
            </a>
          </div>
        )}
      </nav>
    )
  }

  return (
    <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, padding: '1rem 24px' }}>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '100%' }}>
        <Link href="/" style={{ ...pill, background: brandBg, flexShrink: 0, textDecoration: 'none', minWidth: '110px' }}>
          <span style={{ ...mono, color: tan }}>Palmera</span>
        </Link>
        {LINKS.map(l => (
          <Link key={l.label} href={l.href}
            style={{ ...pill, background: navBg(l.section), flex: 1, textDecoration: 'none' }}>
            {/* Sliding highlight — white on dark sections, dark tint on light sections */}
            <div style={{
              position: 'absolute', inset: 0,
              background: highlightBg,
              width: isActive(l.section) ? '100%' : '0%',
              transition: 'width 0.4s ease',
              borderRadius: '4px',
            }} />
            <span style={{ ...mono, color: textCol(l.section) }}>{l.label}</span>
          </Link>
        ))}
        <a href="https://form.typeform.com/to/xo1Bskym" target="_blank" rel="noopener noreferrer"
          style={{ ...pill, background: ctaBg, flexShrink: 0, textDecoration: 'none', minWidth: '120px' }}>
          <span style={{ ...mono, color: ctaText }}>{messages.earlyAccess}</span>
        </a>
        <LanguageToggle light={isLight} />
      </div>
    </nav>
  )
}
