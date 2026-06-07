export const dynamic = 'force-dynamic'
'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthChange } from '@/lib/auth'
import { getPartner, updatePartner, updateSectionStatus } from '@/lib/firestore'

export default function SettingsPage() {
  const router = useRouter()
  const [uid, setUid] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [partnerName, setPartnerName] = useState('')

  const [checks, setChecks] = useState({
    accuracyConfirm: false,
    termsAgree: false,
    partnerAgreement: false,
  })

  const [signedAt, setSignedAt] = useState<string | null>(null)

  useEffect(() => {
    const unsub = onAuthChange(async (user) => {
      if (!user) { router.replace('/dashboard'); return }
      setUid(user.uid)
      const partner = await getPartner(user.uid)
      if (partner) {
        setPartnerName(partner.tradingName || partner.legalName || partner.email || '')
        if (partner.signoff) {
          setChecks(partner.signoff.checks || checks)
          setSignedAt(partner.signoff.signedAt || null)
        }
      }
    })
    return () => unsub()
  }, [router])

  const allChecked = checks.accuracyConfirm && checks.termsAgree && checks.partnerAgreement
  const alreadySigned = !!signedAt

  const toggle = (field: keyof typeof checks) => {
    if (alreadySigned) return
    setChecks(prev => ({ ...prev, [field]: !prev[field] }))
  }

  const handleSignoff = async () => {
    if (!allChecked) return
    setSaving(true)
    const now = new Date().toISOString()
    await updatePartner(uid, {
      signoff: {
        checks,
        signedAt: now,
        signedBy: partnerName,
      }
    })
    await updateSectionStatus(uid, 'signoff', 'complete')
    setSignedAt(now)
    setSaving(false)
    setSaved(true)
  }

  const CheckItem = ({ field, label, sublabel }: { field: keyof typeof checks; label: string; sublabel?: string }) => (
    <div
      onClick={() => toggle(field)}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '14px',
        padding: '16px 20px',
        background: checks[field] ? 'rgba(158,118,59,0.06)' : 'rgba(255,255,255,0.02)',
        border: `1px solid ${checks[field] ? 'rgba(158,118,59,0.2)' : 'rgba(223,201,166,0.08)'}`,
        borderRadius: '8px',
        cursor: alreadySigned ? 'default' : 'pointer',
        transition: 'all 0.15s',
        marginBottom: '12px',
      }}
    >
      <div style={{
        width: '20px', height: '20px', borderRadius: '4px', flexShrink: 0, marginTop: '1px',
        border: `1.5px solid ${checks[field] ? 'var(--accent-3)' : 'rgba(223,201,166,0.2)'}`,
        background: checks[field] ? 'var(--accent-3)' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.15s',
      }}>
        {checks[field] && <span style={{ color: '#fff', fontSize: '12px', lineHeight: 1 }}>✓</span>}
      </div>
      <div>
        <p style={{ fontSize: '14px', color: 'var(--color-tan)', fontFamily: 'var(--font-sans)', margin: '0 0 3px', lineHeight: 1.4 }}>
          {label}
        </p>
        {sublabel && (
          <p style={{ fontSize: '12px', color: 'rgba(223,201,166,0.4)', fontFamily: 'var(--font-sans)', margin: 0, lineHeight: 1.4 }}>
            {sublabel}
          </p>
        )}
      </div>
    </div>
  )

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <p style={{ fontFamily: 'var(--font-sans)', color: 'rgba(223,201,166,0.4)', fontSize: '12px', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 8px' }}>
          Terms & Sign-off
        </p>
        <h1 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-tan)', fontSize: '26px', fontWeight: 400, letterSpacing: '0.06em', margin: '0 0 6px' }}>
          Partner Agreement
        </h1>
        <p style={{ fontFamily: 'var(--font-serif)', color: 'rgba(223,201,166,0.4)', fontSize: '14px', margin: 0, letterSpacing: '0.02em' }}>
          Review and confirm your agreement to list on Palmera.
        </p>
      </div>

      {alreadySigned && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          background: 'rgba(158,118,59,0.08)',
          border: '1px solid rgba(158,118,59,0.25)',
          borderRadius: '8px',
          padding: '14px 20px',
          marginBottom: '28px',
        }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#9e763b', flexShrink: 0 }} />
          <p style={{ fontSize: '13px', color: 'var(--accent-4)', fontFamily: 'var(--font-sans)', margin: 0 }}>
            Signed off {signedAt ? `on ${new Date(signedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}` : ''}
            {partnerName ? ` by ${partnerName}` : ''}
          </p>
        </div>
      )}

      {/* Terms summary */}
      <div style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(223,201,166,0.08)',
        borderRadius: '8px',
        padding: '20px 24px',
        marginBottom: '28px',
      }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-tan)', fontSize: '16px', fontWeight: 400, margin: '0 0 16px', letterSpacing: '0.04em' }}>
          What you&apos;re agreeing to
        </h2>
        {[
          'Palmera handles bookings and customer payments on your behalf.',
          'You will confirm bookings within your stated response time.',
          'Your Palmera listing price will not be undercut on other booking channels.',
          'You agree to Palmera\'s cancellation and refund policies for guests.',
          'Palmera will pay out your earnings on your agreed schedule via your chosen method.',
          'You may be featured in Palmera curated collections and promotional materials.',
        ].map(term => (
          <div key={term} style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'flex-start' }}>
            <span style={{ color: 'var(--accent-3)', fontSize: '13px', flexShrink: 0, marginTop: '1px' }}>—</span>
            <p style={{ fontSize: '13px', color: 'rgba(223,201,166,0.55)', fontFamily: 'var(--font-sans)', margin: 0, lineHeight: 1.5 }}>
              {term}
            </p>
          </div>
        ))}
        <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid rgba(223,201,166,0.08)' }}>
          <a
            href="/terms"
            target="_blank"
            style={{ fontSize: '12px', color: 'var(--accent-4)', fontFamily: 'var(--font-sans)', letterSpacing: '0.04em', textDecoration: 'underline' }}
          >
            Read full Terms & Conditions →
          </a>
        </div>
      </div>

      {/* Checkboxes */}
      <h2 style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-tan)', fontSize: '17px', fontWeight: 400, margin: '0 0 16px', letterSpacing: '0.04em' }}>
        Confirm and sign
      </h2>

      <CheckItem
        field="accuracyConfirm"
        label="I confirm that all information I have provided is accurate and up to date."
        sublabel="You can update your profile at any time from this dashboard."
      />
      <CheckItem
        field="termsAgree"
        label="I have read and agree to the Palmera Partner Terms & Conditions."
        sublabel="Including commission structure, cancellation policy, and payout terms."
      />
      <CheckItem
        field="partnerAgreement"
        label="I agree to the Palmera Partner Agreement and authorise Palmera to list my experiences."
        sublabel="This is a digital acknowledgment — no physical signature required."
      />

      {!alreadySigned && (
        <button
          onClick={handleSignoff}
          disabled={!allChecked || saving}
          style={{
            marginTop: '8px',
            padding: '13px 36px',
            background: allChecked ? 'var(--accent-3)' : 'rgba(223,201,166,0.08)',
            border: `1px solid ${allChecked ? 'transparent' : 'rgba(223,201,166,0.1)'}`,
            borderRadius: '6px',
            color: allChecked ? '#fff' : 'rgba(223,201,166,0.25)',
            fontSize: '14px',
            fontFamily: 'var(--font-sans)',
            letterSpacing: '0.06em',
            cursor: (!allChecked || saving) ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {saving ? 'Processing...' : 'Confirm & Sign off'}
        </button>
      )}

      {saved && !alreadySigned && (
        <p style={{ fontSize: '13px', color: 'var(--accent-4)', fontFamily: 'var(--font-sans)', marginTop: '12px' }}>
          ✓ Sign-off recorded. Welcome to Palmera.
        </p>
      )}
    </div>
  )
}
