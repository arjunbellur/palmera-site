'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import LanguageToggle from './LanguageToggle'
import { onScrollFrame } from '@/lib/scroll-bus'

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

    // Cache refs once — avoids repeated DOM walks on every scroll tick
    const lightIds = ['base', 'skills']
    const sectionIds = ['base', 'makes', 'skills', 'story', 'signal']
    let els: Record<string, Element | null> = {}
    const cacheEls = () => {
      sectionIds.forEach(id => { els[id] = document.getElementById(id) })
      els._footer = document.querySelector('footer')
    }
    cacheEls()
    window.addEventListener('resize', cacheEls)

    const update = () => {
      let light = false
      for (const id of lightIds) {
        const el = els[id]
        if (el) { const r = el.getBoundingClientRect(); if (r.top < 64 && r.bottom > 0) { light = true; break } }
      }
      if (els._footer) { const r = els._footer.getBoundingClientRect(); if (r.top < 64) light = true }
      setIsLight(light)

      let current = ''
      for (const id of sectionIds) {
        const el = els[id]
        if (el) { const r = el.getBoundingClientRect(); if (r.top <= 80 && r.bottom > 80) { current = id; break } }
      }
      setActiveSection(current)
    }

    const unsub = onScrollFrame(update)
    update()
    return () => {
      window.removeEventListener('resize', checkWidth)
      window.removeEventListener('resize', cacheEls)
      unsub()
    }
  }, [])

  const tan = 'hsla(36.84, 47.11%, 76.27%, 1)'

  const isActive = (section: string) => !!(section && activeSection === section)

  // Single consistent dark-frosted style — readable on any background.
  // Avoids the mid-section invisible state caused by flipping between
  // near-transparent dark and near-transparent light pills.
  const PILL_BASE   = 'rgba(4,4,4,0.58)'
  const PILL_ACTIVE = 'rgba(4,4,4,0.78)'
  const navBg       = (section: string) => isActive(section) ? PILL_ACTIVE : PILL_BASE
  const textCol     = (section: string) => isActive(section) ? '#2a2119' : 'rgba(235,232,219,0.62)'
  const highlightBg = 'rgba(255,255,255,1)'

  const pill: React.CSSProperties = {
    padding: '8px 18px',
    borderRadius: '4px',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    textDecoration: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'background 0.3s ease',
    border: 'none',
    position: 'relative',
    overflow: 'hidden',
  }

  const mono: React.CSSProperties = {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.8125rem',
    letterSpacing: '0.1rem',
    textTransform: 'uppercase',
    lineHeight: 1.33,
    fontWeight: 400,
    position: 'relative',
    zIndex: 1,
    transition: 'color 0.3s ease',
  }

  const brandBg    = 'rgba(42,33,25,0.92)'
  const ctaBg      = tan
  const ctaText    = '#2a2119'
  const partnersBg = 'rgba(44, 96, 58, 0.74)'

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
                background: isLight ? '#2a2119' : tan,
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
            {LINKS.map(l => {
              const isPartners = l.href === '/dashboard'
              return (
                <Link key={l.label} href={l.href} onClick={() => setMenuOpen(false)}
                  style={{ ...pill, background: isPartners ? partnersBg : navBg(l.section), textDecoration: 'none' }}>
                  <span style={{ ...mono, color: isPartners ? tan : textCol(l.section) }}>{l.label}</span>
                </Link>
              )
            })}
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
        {LINKS.map(l => {
          const isPartners = l.href === '/dashboard'
          return (
            <Link key={l.label} href={l.href}
              style={{ ...pill, background: isPartners ? partnersBg : navBg(l.section), flex: 1, textDecoration: 'none' }}>
              {!isPartners && (
                <div style={{
                  position: 'absolute', inset: 0,
                  background: highlightBg,
                  width: isActive(l.section) ? '100%' : '0%',
                  transition: 'width 0.4s ease',
                  borderRadius: '4px',
                }} />
              )}
              <span style={{ ...mono, color: isPartners ? tan : textCol(l.section) }}>{l.label}</span>
            </Link>
          )
        })}
        <a href="https://form.typeform.com/to/xo1Bskym" target="_blank" rel="noopener noreferrer"
          style={{ ...pill, background: ctaBg, flexShrink: 0, textDecoration: 'none', minWidth: '120px' }}>
          <span style={{ ...mono, color: ctaText }}>{messages.earlyAccess}</span>
        </a>
        <LanguageToggle light={isLight} />
      </div>
    </nav>
  )
}
