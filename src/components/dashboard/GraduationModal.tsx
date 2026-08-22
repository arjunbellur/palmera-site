'use client'
import { useEffect, useState } from 'react'
import { useLocale } from '@/lib/use-locale'

const STR = {
  fr: {
    eyebrow: 'Vous êtes en ligne sur Palmera',
    title: (name: string) => `${name} est ouvert aux réservations`,
    fallback: 'Votre établissement',
    body: 'Votre première expérience est publiée — les clients peuvent la réserver dans l’app Palmera. La configuration est terminée : vous gérez désormais tout depuis votre Tableau de bord partenaire — réservations, revenus et versements.',
    cta: 'Accéder à mon tableau de bord →',
  },
  en: {
    eyebrow: 'You’re live on Palmera',
    title: (name: string) => `${name} is open for bookings`,
    fallback: 'Your company',
    body: 'Your first experience is published and guests can book it in the Palmera app. Setup is done — from here you’ll manage everything from your Partner Dashboard: reservations, earnings, and payouts.',
    cta: 'Enter your dashboard →',
  },
}

/**
 * The graduation moment: shown once, the first time a partner puts a listing
 * live. This is the hand-off from the onboarding portal to the partner
 * dashboard — the one screen where we tell them they've arrived, rather than
 * silently redirecting them somewhere unfamiliar.
 */
export default function GraduationModal({ companyName, onEnter }: { companyName: string; onEnter: () => void }) {
  const s = STR[useLocale()]
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
      background: 'var(--db-overlay)', backdropFilter: 'blur(6px)',
      opacity: leaving ? 0 : shown ? 1 : 0, transition: 'opacity 0.36s ease',
    }}>
      <div style={{
        maxWidth: '30rem', width: '100%', textAlign: 'center', padding: '2.75rem 2rem',
        background: 'var(--db-bg-modal)', border: '1px solid var(--db-border-gold)', borderRadius: '1rem',
        transform: leaving ? 'scale(0.97)' : shown ? 'none' : 'translateY(14px)',
        opacity: shown && !leaving ? 1 : 0, transition: 'all 0.44s cubic-bezier(0.22,1,0.36,1)',
      }}>
        <div style={{ fontSize: '1.75rem', color: 'var(--db-gold)', marginBottom: '1rem' }}>✦</div>

        <p style={{ fontFamily: 'var(--font-sans)', color: 'rgba(190,154,86,0.85)', fontSize: '0.6875rem', letterSpacing: '0.16em', textTransform: 'uppercase', margin: '0 0 0.75rem' }}>
          {s.eyebrow}
        </p>
        <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--db-text)', fontSize: 'clamp(1.375rem, 4vw, 1.75rem)', fontWeight: 400, letterSpacing: '0.04em', margin: '0 0 0.875rem', lineHeight: 1.3 }}>
          {s.title(companyName || s.fallback)}
        </h2>
        <p style={{ fontFamily: 'var(--font-serif)', color: 'var(--db-text-muted)', fontSize: '0.9375rem', lineHeight: 1.65, margin: '0 0 1.75rem' }}>
          {s.body}
        </p>

        <button onClick={enter} style={{
          width: '100%', padding: '0.875rem 1.5rem', background: 'var(--db-gold-deep)', border: 'none', borderRadius: '0.5rem',
          color: '#ebe8db', fontFamily: 'var(--font-sans)', fontSize: '0.875rem', letterSpacing: '0.06em', cursor: 'pointer',
        }}>
          {s.cta}
        </button>
      </div>
    </div>
  )
}
