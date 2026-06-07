'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function Footer() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  return (
    <footer style={{ background: 'var(--bg-1)', paddingTop: '80px', overflow: 'hidden' }}>

      {/* Email signup — matches live site: label above, full-width underline input */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 40px 80px' }}>
        <p style={{
          fontFamily: 'Geist Mono Variable, Courier New, monospace',
          fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase',
          color: 'rgba(42,33,25,0.6)', marginBottom: '20px',
        }}>
          Get early access to leisure
        </p>

        {!submitted ? (
          <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px dashed rgba(42,33,25,0.3)', paddingBottom: '16px', maxWidth: '600px' }}>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email address"
              onKeyDown={e => e.key === 'Enter' && email && setSubmitted(true)}
              style={{
                flex: 1, background: 'none', border: 'none',
                fontFamily: 'var(--font-serif)', fontSize: 'clamp(24px, 4vw, 40px)',
                fontWeight: 400, color: 'var(--color-dark)', outline: 'none',
                letterSpacing: '-0.5px',
              }}
            />
            <button onClick={() => email && setSubmitted(true)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', display: 'flex', alignItems: 'center', color: 'var(--color-dark)', flexShrink: 0 }}>
              <svg width="28" height="28" viewBox="0 0 26 26" fill="none">
                <path d="M1.33594 12.9987H23.0026M13.0026 1.33203L24.6693 12.9987L13.0026 24.6654" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        ) : (
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: '28px', color: 'rgba(42,33,25,0.6)', letterSpacing: '-0.5px' }}>
            Thank you! Your submission has been received!
          </p>
        )}
      </div>

      {/* Large marquee text */}
      <div style={{ overflow: 'hidden', borderTop: '1px solid rgba(42,33,25,0.1)', paddingTop: '40px', marginBottom: '0' }}>
        <div style={{ display: 'flex', width: 'max-content', animation: 'marquee 40s linear infinite' }}>
          {Array(4).fill(null).map((_, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '32px', flexShrink: 0, paddingRight: '32px' }}>
              <span style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 'clamp(60px, 10vw, 120px)',
                fontWeight: 400,
                letterSpacing: '-3px',
                color: 'var(--color-dark)',
                lineHeight: 1,
                whiteSpace: 'nowrap',
              }}>
                The Palmera Experience
              </span>
              <img src="/images/PALMERA_cracked.png" alt="" style={{ height: '80px', opacity: 0.5, flexShrink: 0 }}
                onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{
        maxWidth: '1200px', margin: '0 auto',
        padding: '28px 40px',
        borderTop: '1px solid rgba(42,33,25,0.1)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px',
      }}>
        <p style={{ fontFamily: 'Geist Mono Variable, Courier New, monospace', fontSize: '11px', letterSpacing: '0.08em', color: 'rgba(42,33,25,0.5)', textTransform: 'uppercase', margin: 0 }}>
          © 2025 Palmera. Where Leisure Lives.
        </p>
        <div style={{ display: 'flex', gap: '24px' }}>
          <Link href="/partners" style={{ fontFamily: 'Geist Mono Variable, Courier New, monospace', fontSize: '11px', color: 'rgba(42,33,25,0.5)', textDecoration: 'none', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Partner with us
          </Link>
          <span style={{ fontFamily: 'Geist Mono Variable, Courier New, monospace', fontSize: '11px', color: 'rgba(42,33,25,0.5)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Palmera®
          </span>
        </div>
      </div>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </footer>
  )
}
