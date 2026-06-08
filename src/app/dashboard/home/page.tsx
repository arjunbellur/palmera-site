'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthChange } from '@/lib/auth'
import { getPartner } from '@/lib/firestore'
import SectionCard from '@/components/dashboard/SectionCard'

const SECTIONS = [
  { key: 'basics', title: 'Business Profile', description: 'Legal name, brand name, contacts, address, and payout details.', priority: 'must_have' as const, href: '/dashboard/profile' },
  { key: 'listings', title: 'Experience Listings', description: "Add the experiences you offer — pricing, availability, what's included.", priority: 'must_have' as const, href: '/dashboard/listings' },
  { key: 'photos', title: 'Photos & Media', description: 'Hero photo, gallery images, and your provider logo.', priority: 'must_have' as const, href: '/dashboard/photos' },
  { key: 'operations', title: 'Operations', description: 'Booking contacts, confirmation speed, notification preferences.', priority: 'must_have' as const, href: '/dashboard/operations' },
  { key: 'payouts', title: 'Payout Details', description: 'Wave, Orange Money, or bank transfer — how Palmera pays you.', priority: 'first_month' as const, href: '/dashboard/profile' },
  { key: 'documents', title: 'Legal Documents', description: 'Business registration, tax certificate, insurance, owner ID.', priority: 'before_payments' as const, href: '/dashboard/documents' },
  { key: 'signoff', title: 'Terms & Sign-off', description: 'Review and agree to the Palmera Partner Terms & Conditions.', priority: 'before_payments' as const, href: '/dashboard/settings' },
]

export default function DashboardHome() {
  const router = useRouter()
  const [sections, setSections] = useState<Record<string, string>>({})
  const [businessName, setBusinessName] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthChange(async (user) => {
      if (!user) { router.replace('/dashboard'); return }
      const partner = await getPartner(user.uid)
      if (partner) { setSections(partner.sections || {}); setBusinessName(partner.tradingName || partner.businessName || '') }
      setLoading(false)
    })
    return () => unsub()
  }, [router])

  const completedCount = SECTIONS.filter(s => sections[s.key] === 'complete').length
  const progressPct = Math.round((completedCount / SECTIONS.length) * 100)
  const mustHaveDone = ['basics', 'listings', 'photos', 'operations'].every(k => sections[k] === 'complete')

  if (loading) return null

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <p style={{ fontFamily: 'var(--font-sans)', color: 'rgba(190,154,86,0.8)', fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 0.5rem' }}>Partner Dashboard</p>
        <h1 style={{ fontFamily: 'var(--font-display)', color: '#dfc9a6', fontSize: 'clamp(1.5rem, 3vw, 1.875rem)', fontWeight: 400, letterSpacing: '0.06em', margin: '0 0 0.5rem' }}>
          {businessName ? `Welcome, ${businessName}` : 'Complete your profile'}
        </h1>
        <p style={{ fontFamily: 'var(--font-serif)', color: 'rgba(223,201,166,0.75)', fontSize: '0.9375rem', margin: 0, letterSpacing: '0.02em' }}>
          {mustHaveDone ? 'Your listing is live. Complete remaining sections to unlock payouts.' : 'Complete the required sections to get your first listing live on Palmera.'}
        </p>
      </div>

      <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(190,154,86,0.12)', borderRadius: '0.5rem', padding: '1.25rem 1.5rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.625rem' }}>
            <span style={{ fontSize: '0.8125rem', color: 'rgba(223,201,166,0.75)', fontFamily: 'var(--font-sans)' }}>Onboarding progress</span>
            <span style={{ fontSize: '0.8125rem', color: '#be9a56', fontFamily: 'var(--font-sans)' }}>{completedCount} / {SECTIONS.length} complete</span>
          </div>
          <div style={{ height: '0.3125rem', background: 'rgba(223,201,166,0.12)', borderRadius: '0.1875rem', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progressPct}%`, background: 'linear-gradient(90deg, #9e763b, #be9a56)', borderRadius: '0.1875rem', transition: 'width 0.6s ease' }} />
          </div>
        </div>
        <div style={{ fontFamily: 'var(--font-display)', color: progressPct === 100 ? '#be9a56' : 'rgba(223,201,166,0.6)', fontSize: '1.625rem', flexShrink: 0 }}>{progressPct}%</div>
      </div>

      {mustHaveDone && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(158,118,59,0.1)', border: '1px solid rgba(158,118,59,0.35)', borderRadius: '0.25rem', padding: '0.5rem 1rem', marginBottom: '1.75rem' }}>
          <div style={{ width: '0.5rem', height: '0.5rem', borderRadius: '50%', background: '#9e763b' }} />
          <span style={{ fontSize: '0.8125rem', color: '#be9a56', fontFamily: 'var(--font-sans)', letterSpacing: '0.04em' }}>Listing active — visible on Palmera</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 18rem), 1fr))', gap: '1rem' }}>
        {SECTIONS.map(section => (
          <SectionCard key={section.key} title={section.title} description={section.description}
            status={(sections[section.key] as 'incomplete' | 'in_progress' | 'complete') || 'incomplete'}
            priority={section.priority} href={section.href} />
        ))}
      </div>
    </div>
  )
}
