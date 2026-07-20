'use client'
import { useEffect, useState } from 'react'

/**
 * The graduation moment: shown once, the first time a partner puts a listing
 * live. This is the hand-off from the onboarding portal to the partner
 * dashboard — the one screen where we tell them they've arrived, rather than
 * silently redirecting them somewhere unfamiliar.
 */
export default function GraduationModal({ companyName, onEnter }: { companyName: string; onEnter: () => void }) {
  const [shown, setShown] = useState(false)
  const [leaving, setLeaving] = useState(false)
  useEffect(() => { const t = setTimeout(() => setShown(true), 40); return () => clearTimeout(t) }, [])

  const enter = () => {
    // Fade the modal out before navigating, so the transition into the new
    // surface reads as one motion rather than a hard cut.
    setLeaving(true)
    setTimeout(onEnter, 380)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200, display: 'grid', placeItems: 'center', padding: '1.5rem',
      background: 'rgba(4,4,4,0.86)', backdropFilter: 'blur(6px)',
      opacity: leaving ? 0 : shown ? 1 : 0, transition: 'opacity 0.36s ease',
    }}>
      <div style={{
        maxWidth: '30rem', width: '100%', textAlign: 'center', padding: '2.75rem 2rem',
        background: 'var(--db-bg-modal)', border: '1px solid var(--db-border-gold)', borderRadius: '1rem',
        transform: leaving ? 'scale(0.97)' : shown ? 'none' : 'translateY(14px)',
        opacity: shown && !leaving ? 1 : 0, transition: 'all 0.44s cubic-bezier(0.22,1,0.36,1)',
      }}>
        <div style={{ fontSize: '1.75rem', color: '#be9a56', marginBottom: '1rem' }}>✦</div>

        <p style={{ fontFamily: 'var(--font-sans)', color: 'rgba(190,154,86,0.85)', fontSize: '0.6875rem', letterSpacing: '0.16em', textTransform: 'uppercase', margin: '0 0 0.75rem' }}>
          You&apos;re live on Palmera
        </p>
        <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--db-text)', fontSize: 'clamp(1.375rem, 4vw, 1.75rem)', fontWeight: 400, letterSpacing: '0.04em', margin: '0 0 0.875rem', lineHeight: 1.3 }}>
          {companyName || 'Your company'} is open for bookings
        </h2>
        <p style={{ fontFamily: 'var(--font-serif)', color: 'var(--db-text-muted)', fontSize: '0.9375rem', lineHeight: 1.65, margin: '0 0 1.75rem' }}>
          Your first experience is published and guests can book it in the Palmera app.
          Setup is done — from here you&apos;ll manage everything from your Partner Dashboard:
          reservations, earnings, and payouts.
        </p>

        <button onClick={enter} style={{
          width: '100%', padding: '0.875rem 1.5rem', background: '#9e763b', border: 'none', borderRadius: '0.5rem',
          color: '#ebe8db', fontFamily: 'var(--font-sans)', fontSize: '0.875rem', letterSpacing: '0.06em', cursor: 'pointer',
        }}>
          Enter your dashboard →
        </button>
      </div>
    </div>
  )
}
