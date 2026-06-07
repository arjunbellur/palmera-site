'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function Footer() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  return (
    <footer style={{ background: 'var(--bg-1)', paddingTop: '80px', borderTop: '1px solid rgba(42,33,25,0.1)' }}>

      {/* Email signup */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 40px 80px' }}>
        <p style={{
          fontFamily: 'Geist Mono Variable, Courier New, monospace',
          fontSize: '11px',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          color: 'rgba(42,33,25,0.5)',
          marginBottom: '24px',
        }}>
          Get early access to leisure
        </p>
        {!submitted ? (
          <div style={{ display: 'flex', gap: '0', maxWidth: '480px' }}>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email address"
              style={{
                flex: 1,
                background: 'rgba(42,33,25,0.06)',
                border: '1px solid rgba(42,33,25,0.2)',
                borderRight: 'none',
                color: 'var(--color-dark)',
                padding: '13px 18px',
                fontFamily: 'var(--font-serif)',
                fontSize: '15px',
                outline: 'none',
              }}
            />
            <button
              onClick={() => email && setSubmitted(true)}
              style={{
                background: 'var(--color-dark)',
                border: '1px solid var(--color-dark)',
                padding: '13px 20px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 26 26" fill="none">
                <path d="M1.33594 12.9987H23.0026M13.0026 1.33203L24.6693 12.9987L13.0026 24.6654" stroke="#ebe8db" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        ) : (
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: '16px', color: 'rgba(42,33,25,0.6)' }}>
            Thank you! You&apos;re on the list.
          </p>
        )}
      </div>

      {/* Marquee */}
      <div style={{ overflow: 'hidden', marginBottom: '24px', borderTop: '1px solid rgba(42,33,25,0.08)', paddingTop: '32px' }}>
        <div className="marquee-track-footer" style={{ alignItems: 'center', gap: '48px' }}>
          {Array(8).fill(null).map((_, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '48px', flexShrink: 0 }}>
              <img src="/images/PALMERA_cracked.png" alt="" style={{ height: '64px', opacity: 0.25 }}
                onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
              <img src="/images/THE-PALMERA-EXPERIENCE.svg" alt="The Palmera Experience"
                style={{ height: '24px', opacity: 0.2 }}
                onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 500, color: 'rgba(42,33,25,0.15)', letterSpacing: '0.12em', whiteSpace: 'nowrap' }}>
                ◈
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '24px 40px',
        borderTop: '1px solid rgba(42,33,25,0.08)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        <p style={{ fontFamily: 'Geist Mono Variable, Courier New, monospace', fontSize: '11px', letterSpacing: '0.08em', color: 'rgba(42,33,25,0.4)', textTransform: 'uppercase', margin: 0 }}>
          © 2025 Palmera. Where Leisure Lives.
        </p>
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          <Link href="/partners" style={{ fontFamily: 'Geist Mono Variable, Courier New, monospace', fontSize: '11px', color: 'rgba(42,33,25,0.4)', textDecoration: 'none', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Partner with us
          </Link>
          <p style={{ fontFamily: 'Geist Mono Variable, Courier New, monospace', fontSize: '11px', color: 'rgba(42,33,25,0.4)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>
            Palmera®
          </p>
        </div>
      </div>
    </footer>
  )
}
