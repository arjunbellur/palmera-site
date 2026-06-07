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
      if (partner) {
        setSections(partner.sections || {})
        setBusinessName(partner.businessName || partner.tradingName || '')
      }
      setLoading(false)
    })
    return () => unsub()
  }, [router])

  const completedCount = SECTIONS.filter(s => sections[s.key] === 'complete').length
  const totalCount = SECTIONS.length
  const progressPct = Math.round((completedCount / totalCount) * 100)
  const mustHaveDone = ['basics', 'listings', 'photos', 'operations'].every(k => sections[k] === 'complete')

  if (loading) return null

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <p style={{ fontFamily: 'var(--font-sans)', color: 'rgba(190,154,86,0.8)', fontSize: '12px', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 8px' }}>
          Partner Dashboard
        </p>
        <h1 style={{ fontFamily: 'var(--font-display)', color: '#dfc9a6', fontSize: '30px', fontWeight: 400, letterSpacing: '0.06em', margin: '0 0 8px' }}>
          {businessName ? `Welcome, ${businessName}` : 'Complete your profile'}
        </h1>
        <p style={{ fontFamily: 'var(--font-serif)', color: 'rgba(223,201,166,0.75)', fontSize: '15px', margin: 0, letterSpacing: '0.02em' }}>
          {mustHaveDone
            ? 'Your listing is live. Complete the remaining sections to unlock payouts.'
            : 'Complete the required sections to get your first listing live on Palmera.'}
        </p>
      </div>

      {/* Progress bar */}
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(190,154,86,0.15)',
        borderRadius: '8px',
        padding: '20px 24px',
        marginBottom: '32px',
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', color: 'rgba(223,201,166,0.75)', fontFamily: 'var(--font-sans)', letterSpacing: '0.04em' }}>
              Onboarding progress
            </span>
            <span style={{ fontSize: '13px', color: '#be9a56', fontFamily: 'var(--font-sans)' }}>
              {completedCount} / {totalCount} sections complete
            </span>
          </div>
          <div style={{ height: '5px', background: 'rgba(223,201,166,0.12)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${progressPct}%`,
              background: 'linear-gradient(90deg, #9e763b, #be9a56)',
              borderRadius: '3px',
              transition: 'width 0.6s ease',
            }} />
          </div>
        </div>
        <div style={{ fontFamily: 'var(--font-display)', color: progressPct === 100 ? '#be9a56' : 'rgba(223,201,166,0.6)', fontSize: '26px', flexShrink: 0 }}>
          {progressPct}%
        </div>
      </div>

      {mustHaveDone && (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          background: 'rgba(158,118,59,0.12)', border: '1px solid rgba(158,118,59,0.4)',
          borderRadius: '4px', padding: '8px 16px', marginBottom: '28px',
        }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#9e763b' }} />
          <span style={{ fontSize: '13px', color: '#be9a56', fontFamily: 'var(--font-sans)', letterSpacing: '0.04em' }}>
            Listing active — visible on Palmera
          </span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {SECTIONS.map(section => (
          <SectionCard
            key={section.key}
            title={section.title}
            description={section.description}
            status={(sections[section.key] as 'incomplete' | 'in_progress' | 'complete') || 'incomplete'}
            priority={section.priority}
            href={section.href}
          />
        ))}
      </div>
    </div>
  )
}
