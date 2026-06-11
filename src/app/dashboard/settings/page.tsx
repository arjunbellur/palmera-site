'use client'
export const dynamic = 'force-dynamic'
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
  const [checks, setChecks] = useState({ accuracyConfirm: false, termsAgree: false, processorTerms: false, partnerAgreement: false })
  const [signedAt, setSignedAt] = useState<string | null>(null)

  useEffect(() => {
    const unsub = onAuthChange(async (user) => {
      if (!user) { router.replace('/dashboard'); return }
      setUid(user.uid)
      const partner = await getPartner(user.uid)
      if (partner) {
        setPartnerName(partner.tradingName || partner.legalName || partner.email || '')
        if (partner.signoff) { setChecks(partner.signoff.checks || checks); setSignedAt(partner.signoff.signedAt || null) }
      }
    })
    return () => unsub()
  }, [router])

  const allChecked = checks.accuracyConfirm && checks.termsAgree && checks.processorTerms && checks.partnerAgreement
  const alreadySigned = !!signedAt
  const toggle = (f: keyof typeof checks) => { if (!alreadySigned) setChecks(p => ({ ...p, [f]: !p[f] })) }

  const handleSignoff = async () => {
    if (!allChecked) return
    setSaving(true)
    const now = new Date().toISOString()
    await updatePartner(uid, { signoff: { checks, signedAt: now, signedBy: partnerName } })
    await updateSectionStatus(uid, 'signoff', 'complete')
    setSignedAt(now); setSaving(false); setSaved(true)
  }

  const CheckItem = ({ field, label, sublabel }: { field: keyof typeof checks; label: string; sublabel?: string }) => (
    <div onClick={() => toggle(field)}
      style={{ display: 'flex', alignItems: 'flex-start', gap: '0.875rem', padding: '1rem 1.25rem', background: checks[field] ? 'rgba(158,118,59,0.06)' : 'rgba(255,255,255,0.02)', border: `1px solid ${checks[field] ? 'rgba(158,118,59,0.2)' : 'rgba(223,201,166,0.08)'}`, borderRadius: '0.5rem', cursor: alreadySigned ? 'default' : 'pointer', transition: 'all 0.15s', marginBottom: '0.75rem' }}>
      <div style={{ width: '1.25rem', height: '1.25rem', borderRadius: '0.25rem', flexShrink: 0, marginTop: '0.0625rem', border: `1.5px solid ${checks[field] ? '#9e763b' : 'rgba(223,201,166,0.25)'}`, background: checks[field] ? '#9e763b' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
        {checks[field] && <span style={{ color: '#fff', fontSize: '0.75rem', lineHeight: 1 }}>✓</span>}
      </div>
      <div>
        <p style={{ fontSize: '0.875rem', color: '#dfc9a6', fontFamily: 'var(--font-sans)', margin: '0 0 0.1875rem', lineHeight: 1.4 }}>{label}</p>
        {sublabel && <p style={{ fontSize: '0.75rem', color: 'rgba(223,201,166,0.65)', fontFamily: 'var(--font-sans)', margin: 0, lineHeight: 1.4 }}>{sublabel}</p>}
      </div>
    </div>
  )

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <p style={{ fontFamily: 'var(--font-sans)', color: 'rgba(190,154,86,0.8)', fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 0.5rem' }}>Terms & Sign-off</p>
        <h1 style={{ fontFamily: 'var(--font-display)', color: '#dfc9a6', fontSize: 'clamp(1.375rem, 3vw, 1.625rem)', fontWeight: 400, letterSpacing: '0.06em', margin: '0 0 0.375rem' }}>Partner Agreement</h1>
        <p style={{ fontFamily: 'var(--font-serif)', color: 'rgba(223,201,166,0.72)', fontSize: '0.875rem', margin: 0 }}>Review and confirm your agreement to list on Palmera.</p>
      </div>

      {alreadySigned && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', background: 'rgba(158,118,59,0.08)', border: '1px solid rgba(158,118,59,0.25)', borderRadius: '0.5rem', padding: '0.875rem 1.25rem', marginBottom: '1.75rem' }}>
          <div style={{ width: '0.5rem', height: '0.5rem', borderRadius: '50%', background: '#9e763b', flexShrink: 0 }} />
          <p style={{ fontSize: '0.8125rem', color: '#be9a56', fontFamily: 'var(--font-sans)', margin: 0 }}>
            Signed off {signedAt ? `on ${new Date(signedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}` : ''}{partnerName ? ` by ${partnerName}` : ''}
          </p>
        </div>
      )}

      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(223,201,166,0.08)', borderRadius: '0.5rem', padding: '1.25rem 1.5rem', marginBottom: '1.75rem' }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', color: '#dfc9a6', fontSize: '1rem', fontWeight: 400, margin: '0 0 1rem', letterSpacing: '0.04em' }}>What you&apos;re agreeing to</h2>
        {['Palmera handles bookings and customer payments on your behalf.', 'You will confirm bookings within your stated response time.', 'Your Palmera listing price will not be undercut on other booking channels.', 'You agree to Palmera\'s cancellation and refund policies for guests.', 'Palmera will pay out your earnings on your agreed schedule via your chosen method.', 'You may be featured in Palmera curated collections and promotional materials.'].map(term => (
          <div key={term} style={{ display: 'flex', gap: '0.625rem', marginBottom: '0.625rem', alignItems: 'flex-start' }}>
            <span style={{ color: '#9e763b', fontSize: '0.8125rem', flexShrink: 0, marginTop: '0.0625rem' }}>—</span>
            <p style={{ fontSize: '0.8125rem', color: 'rgba(223,201,166,0.72)', fontFamily: 'var(--font-sans)', margin: 0, lineHeight: 1.5 }}>{term}</p>
          </div>
        ))}
        <div style={{ marginTop: '0.875rem', paddingTop: '0.875rem', borderTop: '1px solid rgba(223,201,166,0.08)' }}>
          <a href="/terms" target="_blank" style={{ fontSize: '0.75rem', color: '#be9a56', fontFamily: 'var(--font-sans)', letterSpacing: '0.04em', textDecoration: 'underline' }}>Read full Terms & Conditions →</a>
        </div>
      </div>

      <h2 style={{ fontFamily: 'var(--font-serif)', color: '#dfc9a6', fontSize: '1.0625rem', fontWeight: 400, margin: '0 0 1rem' }}>Confirm and sign</h2>
      <CheckItem field="accuracyConfirm" label="I confirm that all information I have provided is accurate and up to date." sublabel="You can update your profile at any time from this dashboard." />
      <CheckItem field="termsAgree" label="I have read and agree to the Palmera Partner Terms & Conditions." sublabel="Including commission structure, cancellation policy, and payout terms." />
      <CheckItem field="processorTerms" label="I accept the payment processor Terms of Service." sublabel="Required by Stripe for processing customer payments on your behalf." />
      <CheckItem field="partnerAgreement" label="I agree to the Palmera Partner Agreement and authorise Palmera to list my experiences." sublabel="This is a digital acknowledgment — no physical signature required." />

      {!alreadySigned && (
        <button onClick={handleSignoff} disabled={!allChecked || saving}
          style={{ marginTop: '0.5rem', padding: '0.8125rem 2.25rem', background: allChecked ? '#9e763b' : 'rgba(223,201,166,0.08)', border: `1px solid ${allChecked ? 'transparent' : 'rgba(223,201,166,0.1)'}`, borderRadius: '0.375rem', color: allChecked ? '#ebe8db' : 'rgba(223,201,166,0.3)', fontSize: '0.875rem', fontFamily: 'var(--font-sans)', letterSpacing: '0.06em', cursor: (!allChecked || saving) ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}>
          {saving ? 'Processing...' : 'Confirm & Sign off'}
        </button>
      )}
      {saved && !alreadySigned && <p style={{ fontSize: '0.8125rem', color: '#be9a56', fontFamily: 'var(--font-sans)', marginTop: '0.75rem' }}>✓ Sign-off recorded. Welcome to Palmera.</p>}
    </div>
  )
}
