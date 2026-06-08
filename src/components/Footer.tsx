'use client'
import { useState } from 'react'
import Link from 'next/link'

export default function Footer() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  return (
    <footer style={{ background: 'var(--bg-1)', paddingTop: '5rem', overflow: 'hidden' }}>
      <div style={{ maxWidth: '75rem', margin: '0 auto', padding: '0 2.5rem 5rem' }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(42,33,25,0.6)', marginBottom: '1.25rem' }}>
          Get early access to leisure
        </p>
        {!submitted ? (
          <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px dashed rgba(42,33,25,0.3)', paddingBottom: '1rem', maxWidth: '37.5rem' }}>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="Email address"
              onKeyDown={e => e.key === 'Enter' && email && setSubmitted(true)}
              style={{ flex: 1, background: 'none', border: 'none', fontFamily: 'var(--font-serif)', fontSize: 'clamp(1.5rem, 4vw, 2.5rem)', fontWeight: 400, color: 'var(--color-dark)', outline: 'none', letterSpacing: '-0.03125rem' }}
            />
            <button onClick={() => email && setSubmitted(true)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem', display: 'flex', alignItems: 'center', color: 'var(--color-dark)', flexShrink: 0 }}>
              <svg width="28" height="28" viewBox="0 0 26 26" fill="none">
                <path d="M1.33594 12.9987H23.0026M13.0026 1.33203L24.6693 12.9987L13.0026 24.6654" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        ) : (
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', color: 'rgba(42,33,25,0.6)', letterSpacing: '-0.03125rem' }}>
            Thank you! Your submission has been received!
          </p>
        )}
      </div>

      <div style={{ overflow: 'hidden', borderTop: '1px solid rgba(42,33,25,0.1)', paddingTop: '2.5rem' }}>
        <div className="marquee-track-footer" style={{ display: 'flex', width: 'max-content' }}>
          {Array(4).fill(null).map((_, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexShrink: 0, paddingRight: '2rem' }}>
              <span style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(3.75rem, 10vw, 7.5rem)', fontWeight: 400, letterSpacing: '-0.1875rem', color: 'var(--color-dark)', lineHeight: 1, whiteSpace: 'nowrap' }}>
                The Palmera Experience
              </span>
              <img src="/images/PALMERA_cracked.png" alt="" loading="lazy"
                style={{ height: '5rem', opacity: 0.45, flexShrink: 0 }}
                onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
            </div>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: '75rem', margin: '0 auto', padding: '1.75rem 2.5rem', borderTop: '1px solid rgba(42,33,25,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', letterSpacing: '0.08em', color: 'rgba(42,33,25,0.5)', textTransform: 'uppercase', margin: 0 }}>
          © 2025 Palmera. Where Leisure Lives.
        </p>
        <div style={{ display: 'flex', gap: '1.5rem' }}>
          <Link href="/partners" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'rgba(42,33,25,0.5)', textDecoration: 'none', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Partner with us
          </Link>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'rgba(42,33,25,0.5)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Palmera®
          </span>
        </div>
      </div>
    </footer>
  )
}
