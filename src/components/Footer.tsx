'use client'
// Footer — email signup form + marquee with actual SVG assets + copyright

'use client'
import { useState } from 'react'
import Link from 'next/link'

export default function Footer() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (email) setSubmitted(true)
  }

  return (
    <footer style={{ background: 'var(--bg-body)', paddingTop: '80px', position: 'relative', zIndex: 2 }}>

      {/* Email signup */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 40px 0' }}>
        {!submitted ? (
          <div>
            <p className="label" style={{ color: 'rgba(235,232,219,0.5)', marginBottom: '24px' }}>
              Get early access to leisure
            </p>
            <form
              onSubmit={handleSubmit}
              style={{ display: 'flex', gap: '0', maxWidth: '520px' }}
            >
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Email address"
                required
                style={{
                  flex: 1,
                  background: 'rgba(235,232,219,0.06)',
                  border: '1px solid rgba(235,232,219,0.15)',
                  borderRight: 'none',
                  color: '#ebe8db',
                  padding: '14px 20px',
                  fontFamily: 'var(--font-serif)',
                  fontSize: '15px',
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                style={{
                  background: '#ebe8db',
                  border: '1px solid #ebe8db',
                  padding: '14px 20px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.2s ease',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#be9a56')}
                onMouseLeave={e => (e.currentTarget.style.background = '#ebe8db')}
                aria-label="Submit"
              >
                <svg width="20" height="20" viewBox="0 0 26 26" fill="none">
                  <path d="M1.33594 12.9987H23.0026M13.0026 1.33203L24.6693 12.9987L13.0026 24.6654" stroke="#2A2119" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </form>
          </div>
        ) : (
          <p style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '18px',
            color: 'rgba(235,232,219,0.6)',
            padding: '20px 0',
          }}>
            Thank you! Your submission has been received!
          </p>
        )}
      </div>

      {/* Marquee — PALMERA logo + THE PALMERA EXPERIENCE */}
      <div style={{ marginTop: '160px', marginBottom: '28px', overflow: 'hidden' }}>
        <div className="marquee-track-footer" style={{ alignItems: 'center', gap: '40px' }}>
          {Array(6).fill(null).map((_, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '40px', flexShrink: 0 }}>
              <img src="/images/PALMERA_cracked.png" alt="" style={{ height: '80px', opacity: 0.6 }} />
              <img src="/images/THE-PALMERA-EXPERIENCE.svg" alt="The Palmera Experience"
                style={{ height: '32px', opacity: 0.35 }}
                onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
              />
              <img src="/images/Light-Eye-SVG.svg" alt="" style={{ height: '80px', opacity: 0.3 }}
                onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
              />
              <img src="/images/Footer-Logo-1.svg" alt="" style={{ height: '40px', opacity: 0.3 }}
                onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{
        maxWidth: '1200px', margin: '0 auto',
        padding: '24px 40px',
        borderTop: '1px solid rgba(235,232,219,0.08)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        <p className="label" style={{ color: 'rgba(235,232,219,0.3)' }}>
          © 2025 Palmera. WHere Leisure Lives.
        </p>
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          <Link href="/partners" className="label"
            style={{ color: 'rgba(235,232,219,0.3)', textDecoration: 'none', transition: 'color 0.2s ease' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#be9a56')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(235,232,219,0.3)')}>
            Partner with us
          </Link>
          <p className="label" style={{ color: 'rgba(235,232,219,0.3)' }}>Palmera®</p>
        </div>
      </div>
    </footer>
  )
}
