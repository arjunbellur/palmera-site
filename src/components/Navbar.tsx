'use client'

import { useState } from 'react'
import Link from 'next/link'

const NAV_LINKS = [
  { label: 'Palmera', href: '#hero', type: 'brand' },
  { label: 'Learn', href: '#base', type: 'link' },
  { label: 'Location', href: '#makes', type: 'link' },
  { label: 'Experience', href: '#skills', type: 'link' },
  { label: 'App', href: '#story', type: 'link' },
  { label: 'Sign Up', href: '#signal', type: 'link' },
  { label: 'Partners', href: '/partners', type: 'link' },
  { label: 'Early Access', href: 'https://form.typeform.com/to/xo1Bskym', type: 'cta', external: true },
]

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <>
      {/* Desktop nav — full width pill-tab bar */}
      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        padding: '16px 24px',
      }}>
        {/* Desktop */}
        <div
          className="hidden md:flex"
          style={{
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
            width: '100%',
          }}
        >
          {NAV_LINKS.map((link) => {
            const isBrand = link.type === 'brand'
            const isCta = link.type === 'cta'
            const bg = isBrand
              ? 'rgba(42,33,25,0.48)'
              : isCta
              ? '#dfc9a6'
              : 'rgba(255,255,255,0.32)'

            const color = isCta ? '#2a2119' : '#dfc9a6'
            const flex = isBrand || isCta ? '0 0 auto' : '1'

            const el = (
              <div
                key={link.label}
                style={{
                  flex,
                  padding: '8px 12px',
                  borderRadius: '4px',
                  background: bg,
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  color,
                  textAlign: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  textDecoration: 'none',
                  transition: 'background 0.2s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                <span style={{
                  fontFamily: 'Geist Mono Variable, Courier New, monospace',
                  fontSize: '0.7em',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  lineHeight: 1.33,
                }}>
                  {link.label}
                </span>
              </div>
            )

            if (link.external) {
              return (
                <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer"
                  style={{ flex, textDecoration: 'none' }}>
                  {el}
                </a>
              )
            }
            return (
              <Link key={link.label} href={link.href} style={{ flex, textDecoration: 'none' }}>
                {el}
              </Link>
            )
          })}
        </div>

        {/* Mobile — brand + hamburger */}
        <div className="flex md:hidden" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{
            padding: '8px 16px',
            background: 'rgba(42,33,25,0.48)',
            backdropFilter: 'blur(16px)',
            borderRadius: '4px',
          }}>
            <span style={{
              fontFamily: 'Geist Mono Variable, Courier New, monospace',
              fontSize: '0.7em',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#dfc9a6',
            }}>
              The Palmera Experience
            </span>
          </div>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              background: 'rgba(255,255,255,0.32)',
              backdropFilter: 'blur(16px)',
              border: 'none',
              borderRadius: '4px',
              padding: '10px 14px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            {[0,1,2].map(i => (
              <span key={i} style={{
                display: 'block', width: '20px', height: '1px',
                background: '#dfc9a6',
                transition: 'all 0.3s ease',
                transform: menuOpen && i===0 ? 'rotate(45deg) translateY(7px)' :
                           menuOpen && i===2 ? 'rotate(-45deg) translateY(-7px)' : 'none',
                opacity: menuOpen && i===1 ? 0 : 1,
              }} />
            ))}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div style={{
            marginTop: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}>
            {NAV_LINKS.filter(l => l.type !== 'brand').map((link) => (
              link.external ? (
                <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer"
                  onClick={() => setMenuOpen(false)}
                  style={{
                    padding: '12px 16px',
                    background: link.type === 'cta' ? '#dfc9a6' : 'rgba(255,255,255,0.2)',
                    backdropFilter: 'blur(16px)',
                    borderRadius: '4px',
                    textDecoration: 'none',
                    color: link.type === 'cta' ? '#2a2119' : '#dfc9a6',
                    fontFamily: 'Geist Mono Variable, Courier New, monospace',
                    fontSize: '0.7em',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    textAlign: 'center',
                  }}>
                  {link.label}
                </a>
              ) : (
                <Link key={link.label} href={link.href}
                  onClick={() => setMenuOpen(false)}
                  style={{
                    padding: '12px 16px',
                    background: 'rgba(255,255,255,0.2)',
                    backdropFilter: 'blur(16px)',
                    borderRadius: '4px',
                    textDecoration: 'none',
                    color: '#dfc9a6',
                    fontFamily: 'Geist Mono Variable, Courier New, monospace',
                    fontSize: '0.7em',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    textAlign: 'center',
                    display: 'block',
                  }}>
                  {link.label}
                </Link>
              )
            ))}
          </div>
        )}
      </nav>
    </>
  )
}
