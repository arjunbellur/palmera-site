'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthChange } from '@/lib/auth'
import { getPartner, getListings } from '@/lib/firestore'

const ADMIN_EMAILS = ['palmeraexp@gmail.com']

const SECTIONS_META = [
  { key: 'basics', label: 'Basics' },
  { key: 'payouts', label: 'Payouts' },
  { key: 'listings', label: 'Listings' },
  { key: 'photos', label: 'Photos' },
  { key: 'operations', label: 'Operations' },
  { key: 'documents', label: 'Documents' },
  { key: 'signoff', label: 'Sign-off' },
]

const COUNTRIES: Record<string, string> = {
  SN: 'Senegal', ML: 'Mali', CI: "Côte d'Ivoire", BF: 'Burkina Faso', GN: 'Guinea',
  TG: 'Togo', BJ: 'Benin', NE: 'Niger', MR: 'Mauritania', GW: 'Guinea-Bissau',
  GM: 'Gambia', CV: 'Cape Verde', SL: 'Sierra Leone', LR: 'Liberia', GH: 'Ghana',
  NG: 'Nigeria', MA: 'Morocco', TN: 'Tunisia', DZ: 'Algeria', EG: 'Egypt',
  KE: 'Kenya', ZA: 'South Africa', FR: 'France', BE: 'Belgium', CH: 'Switzerland',
  GB: 'United Kingdom', DE: 'Germany', ES: 'Spain', IT: 'Italy', NL: 'Netherlands',
  PT: 'Portugal', US: 'United States', CA: 'Canada', AU: 'Australia',
}

const DOCUMENTS_META = [
  { field: 'businessRegistration', label: 'Business registration certificate' },
  { field: 'taxCertificate', label: 'Tax certificate' },
  { field: 'ownerIdCopy', label: "Owner's government ID" },
  { field: 'proofOfService', label: 'Proof of service' },
  { field: 'proofOfPayoutAccount', label: 'Proof of payout account' },
  { field: 'liabilityInsurance', label: 'Liability insurance policy' },
  { field: 'partnershipAgreement', label: 'Signed Palmera partnership agreement' },
]

type Status = 'complete' | 'in_progress' | 'incomplete'
type Tab = 'business' | 'kyc' | 'payouts' | 'operations' | 'listings' | 'documents' | 'signoff'

function dotColor(s: Status) {
  if (s === 'complete') return '#9e763b'
  if (s === 'in_progress') return '#be9a56'
  return 'var(--db-text-ghost)'
}

function formatDate(ts: unknown): string {
  if (!ts) return '—'
  const sec = (ts as { seconds?: number }).seconds
  if (sec) return new Date(sec * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  if (typeof ts === 'string') return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  return '—'
}

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return (
    <div style={{ marginBottom: '1rem' }}>
      <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.625rem', color: 'var(--db-text-faint)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 0.25rem' }}>{label}</p>
      <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--db-text-ghost)', margin: 0, fontStyle: 'italic' }}>Not provided</p>
    </div>
  )
  return (
    <div style={{ marginBottom: '1rem' }}>
      <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.625rem', color: 'var(--db-text-faint)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 0.25rem' }}>{label}</p>
      <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--db-text)', margin: 0, lineHeight: 1.5 }}>{value}</p>
    </div>
  )
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(14rem, 1fr))', gap: '0 2rem' }}>{children}</div>
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h3 style={{ fontFamily: 'var(--font-serif)', color: 'var(--db-text)', fontSize: '0.9375rem', fontWeight: 400, margin: '1.75rem 0 1rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--db-border-subtle)' }}>{children}</h3>
}

function ModeBadge({ mode }: { mode?: string }) {
  const isPaid = mode === 'paid'
  const s = isPaid
    ? { bg: 'rgba(190,154,86,0.12)', border: 'rgba(190,154,86,0.35)', color: '#be9a56', label: 'Paid' }
    : { bg: 'rgba(223,201,166,0.08)', border: 'rgba(223,201,166,0.25)', color: '#dfc9a6', label: 'Reservation' }
  return (
    <span style={{
      fontSize: '0.625rem', fontFamily: 'var(--font-sans)', letterSpacing: '0.08em',
      textTransform: 'uppercase', padding: '2px 8px', borderRadius: '2px',
      border: `1px solid ${s.border}`, background: s.bg, color: s.color,
    }}>
      {s.label}
    </span>
  )
}

function EventBadge({ availabilityType }: { availabilityType?: string }) {
  const isEvent = availabilityType === 'one_time' || availabilityType === 'one_off' || availabilityType === 'temporary'
  if (!isEvent) return null
  return (
    <span style={{
      fontSize: '0.625rem', fontFamily: 'var(--font-sans)', letterSpacing: '0.08em',
      textTransform: 'uppercase', padding: '2px 8px', borderRadius: '2px',
      border: '1px solid rgba(158,118,59,0.35)', background: 'rgba(158,118,59,0.1)', color: '#9e763b',
    }}>
      Event
    </span>
  )
}

export default function PartnerDetailPage({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = use(params)
  const router = useRouter()
  const [partner, setPartner] = useState<Record<string, unknown> | null>(null)
  const [listings, setListings] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('business')

  useEffect(() => {
    const unsub = onAuthChange(async (user) => {
      if (!user || !ADMIN_EMAILS.includes(user.email || '')) {
        router.replace('/dashboard/home')
        return
      }
      const [p, l] = await Promise.all([getPartner(uid), getListings(uid)])
      setPartner(p)
      setListings(l as Record<string, unknown>[])
      setLoading(false)
    })
    return () => unsub()
  }, [router, uid])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh' }}>
      <div style={{ width: '1.75rem', height: '1.75rem', border: '2px solid rgba(190,154,86,0.15)', borderTopColor: '#be9a56', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (!partner) return (
    <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--db-text-faint)', fontFamily: 'var(--font-sans)', fontSize: '0.875rem' }}>Partner not found.</div>
  )

  const sec = (partner.sections as Record<string, Status>) || {}
  const ops = (partner.operations as Record<string, string>) || {}
  const docs = (partner.documents as Record<string, { url: string; name: string; uploadedAt: string }>) || {}
  const signoff = (partner.signoff as Record<string, unknown>) || {}
  const signoffChecks = (signoff.checks as Record<string, boolean>) || {}
  const bos = Array.isArray(partner.beneficialOwners) ? partner.beneficialOwners as Array<Record<string, string>> : []

  const displayName = (partner.tradingName || partner.legalName || partner.email) as string

  const TABS: { key: Tab; label: string }[] = [
    { key: 'business', label: 'Business' },
    { key: 'kyc', label: 'KYC & Contact' },
    { key: 'payouts', label: 'Payouts' },
    { key: 'operations', label: 'Operations' },
    { key: 'listings', label: `Listings (${listings.length})` },
    { key: 'documents', label: 'Documents' },
    { key: 'signoff', label: 'Sign-off' },
  ]

  return (
    <div>
      {/* Back */}
      <a href="/dashboard/admin" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', textDecoration: 'none', color: 'var(--db-text-faint)', fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '1.5rem', transition: 'color 0.15s' }}
        onMouseEnter={e => (e.currentTarget.style.color = '#be9a56')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--db-text-faint)')}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M7.5 2L3.5 6L7.5 10" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/></svg>
        All partners
      </a>

      {/* Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <p style={{ fontFamily: 'var(--font-sans)', color: 'rgba(190,154,86,0.8)', fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 0.375rem' }}>Partner Profile</p>
        <h1 style={{ fontFamily: 'var(--font-display)', color: 'var(--db-text)', fontSize: 'clamp(1.25rem, 3vw, 1.5rem)', fontWeight: 400, letterSpacing: '0.06em', margin: '0 0 0.25rem' }}>{displayName}</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--db-text-faint)' }}>{partner.email as string}</span>
          <span style={{ color: 'var(--db-border)', fontSize: '0.75rem' }}>·</span>
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--db-text-faint)' }}>Joined {formatDate(partner.createdAt)}</span>
        </div>
      </div>

      {/* Section status chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.75rem' }}>
        {SECTIONS_META.map(({ key, label }) => {
          const s = (sec[key] || 'incomplete') as Status
          return (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.3125rem 0.75rem', borderRadius: '2rem', border: '1px solid var(--db-border-subtle)', background: s === 'complete' ? 'rgba(158,118,59,0.08)' : 'var(--db-bg-card)' }}>
              <div style={{ width: '0.375rem', height: '0.375rem', borderRadius: '50%', background: dotColor(s), flexShrink: 0, border: s === 'incomplete' ? '1px solid var(--db-text-ghost)' : 'none' }} />
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', color: s === 'complete' ? '#be9a56' : 'var(--db-text-faint)', letterSpacing: '0.04em' }}>{label}</span>
            </div>
          )
        })}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', overflowX: 'auto', borderBottom: '1px solid var(--db-border-subtle)', marginBottom: '1.75rem', scrollbarWidth: 'none', gap: 0 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ flexShrink: 0, padding: '0.625rem 1.25rem', background: 'transparent', border: 'none', borderBottom: tab === t.key ? '2px solid #be9a56' : '2px solid transparent', color: tab === t.key ? '#be9a56' : 'var(--db-text-muted)', fontSize: '0.8125rem', fontFamily: 'var(--font-sans)', letterSpacing: '0.04em', cursor: 'pointer', transition: 'color 0.15s', marginBottom: '-1px' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Business tab ── */}
      {tab === 'business' && (
        <div>
          <SectionHeading>Business details</SectionHeading>
          <Grid>
            <Field label="Legal name" value={partner.legalName as string} />
            <Field label="Trading / brand name" value={partner.tradingName as string} />
            <Field label="Business type" value={partner.businessType as string} />
            <Field label="Country" value={partner.country ? COUNTRIES[partner.country as string] || partner.country as string : null} />
            <Field label="NINEA (tax ID)" value={partner.taxId as string} />
            <Field label="RCCM registration" value={partner.registrationNumber as string} />
            <Field label="Industry category" value={partner.industryCategory as string} />
            <Field label="Years in operation" value={partner.yearsInOperation as string} />
          </Grid>
          <Grid>
            <Field label="Business address" value={partner.address as string} />
            <Field label="Website / social" value={partner.websiteOrSocial as string} />
            <Field label="Google Maps link" value={partner.mapsLink as string} />
          </Grid>
          {bos.length > 0 && (
            <>
              <SectionHeading>Beneficial owners</SectionHeading>
              {bos.map((bo, i) => (
                <div key={i} style={{ background: 'var(--db-bg-card)', border: '1px solid var(--db-border-subtle)', borderRadius: '0.5rem', padding: '0.875rem 1.25rem', marginBottom: '0.625rem' }}>
                  <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.625rem', color: 'var(--db-text-faint)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 0.625rem' }}>Owner {i + 1}</p>
                  <Grid>
                    <Field label="Full name" value={bo.name} />
                    <Field label="Date of birth" value={bo.dob} />
                    <Field label="Ownership %" value={bo.ownershipPct ? `${bo.ownershipPct}%` : null} />
                  </Grid>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* ── KYC & Contact tab ── */}
      {tab === 'kyc' && (
        <div>
          <SectionHeading>Personal identity</SectionHeading>
          <Grid>
            <Field label="Full legal name" value={partner.ownerName as string} />
            <Field label="Date of birth" value={partner.ownerDob as string} />
            <Field label="Nationality" value={partner.ownerNationality ? COUNTRIES[partner.ownerNationality as string] || partner.ownerNationality as string : null} />
            <Field label="Role in business" value={partner.ownerRole as string} />
            <Field label="Residential address" value={partner.ownerResidentialAddress as string} />
            <Field label="Personal tax ID" value={partner.ownerPersonalTaxId as string} />
          </Grid>
          <SectionHeading>Contact details</SectionHeading>
          <Grid>
            <Field label="Email" value={partner.email as string} />
            <Field label="Primary phone" value={partner.primaryPhone as string} />
            <Field label="WhatsApp" value={partner.whatsapp as string} />
          </Grid>
        </div>
      )}

      {/* ── Payouts tab ── */}
      {tab === 'payouts' && (
        <div>
          <SectionHeading>Payout details</SectionHeading>
          <Grid>
            <Field label="Payout method" value={partner.payoutMethod as string} />
            <Field label="Account holder name" value={partner.accountName as string} />
            <Field label="Payout currency" value={partner.payoutCurrency as string} />
            <Field label="Payout frequency" value={partner.payoutFrequency as string} />
          </Grid>
          {!!(partner.mobileMoneyProvider || partner.mobileMoneyNumber) && (
            <>
              <SectionHeading>Mobile Money</SectionHeading>
              <Grid>
                <Field label="Provider" value={partner.mobileMoneyProvider as string} />
                <Field label="Number" value={partner.mobileMoneyNumber as string} />
              </Grid>
            </>
          )}
          {!!(partner.bankName || partner.accountNumber) && (
            <>
              <SectionHeading>Bank Transfer</SectionHeading>
              <Grid>
                <Field label="Bank name" value={partner.bankName as string} />
                <Field label="Account number" value={partner.accountNumber as string} />
                <Field label="IBAN" value={partner.iban as string} />
              </Grid>
            </>
          )}
          {!!(partner.stripeAccountHolderName || partner.stripeIban) && (
            <>
              <SectionHeading>Stripe (international)</SectionHeading>
              <Grid>
                <Field label="Account holder" value={partner.stripeAccountHolderName as string} />
                <Field label="Bank name" value={partner.stripeBankName as string} />
                <Field label="IBAN / account" value={partner.stripeIban as string} />
                <Field label="Routing / SWIFT" value={partner.stripeRouting as string} />
                <Field label="Currency" value={partner.stripeCurrency as string} />
              </Grid>
            </>
          )}
          {!partner.payoutMethod && !partner.stripeAccountHolderName ? (
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--db-text-ghost)', fontStyle: 'italic', marginTop: '0.5rem' }}>No payout info submitted yet.</p>
          ) : null}
        </div>
      )}

      {/* ── Operations tab ── */}
      {tab === 'operations' && (
        <div>
          <SectionHeading>Booking contacts</SectionHeading>
          <Grid>
            <Field label="Operations contact name" value={ops.opsContactName} />
            <Field label="Operations WhatsApp" value={ops.opsContactWhatsapp} />
            <Field label="Backup contact name" value={ops.backupContactName} />
            <Field label="Backup WhatsApp" value={ops.backupContactWhatsapp} />
          </Grid>
          <SectionHeading>Booking flow</SectionHeading>
          <Grid>
            <Field label="Notification preference" value={ops.notificationPreference} />
            <Field label="Confirmation speed" value={ops.confirmationSpeed} />
            <Field label="No-show policy" value={ops.noShowPolicy} />
            <Field label="Cancellation rate" value={ops.cancellationRate} />
            <Field label="Special request handling" value={ops.specialRequestHandling} />
          </Grid>
          {!ops.opsContactName ? <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--db-text-ghost)', fontStyle: 'italic', marginTop: '0.5rem' }}>No operations info submitted yet.</p> : null}
        </div>
      )}

      {/* ── Listings tab ── */}
      {tab === 'listings' && (
        <div>
          {listings.length === 0 ? (
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--db-text-ghost)', fontStyle: 'italic', marginTop: '0.5rem' }}>No listings created yet.</p>
          ) : (() => {
            const grouped = listings.reduce<Record<string, Record<string, unknown>[]>>((acc, l) => {
              const key = (l.providerName as string) || (displayName as string) || 'Uncategorized'
              if (!acc[key]) acc[key] = []
              acc[key].push(l)
              return acc
            }, {})
            const groupEntries = Object.entries(grouped)
            return groupEntries.map(([provider, items]) => (
              <div key={provider} style={{ marginBottom: '2rem' }}>
                {groupEntries.length > 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.875rem' }}>
                    <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--db-text-faint)', margin: 0 }}>{provider}</p>
                    <div style={{ flex: 1, height: '1px', background: 'var(--db-border-subtle)' }} />
                    <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', color: 'var(--db-text-ghost)' }}>{items.length}</span>
                  </div>
                )}
                {items.map((l, i) => {
                  const mode = (l.mode as string) || 'paid'
                  const isPaid = mode === 'paid'
                  return (
                    <div key={i} style={{ background: 'var(--db-bg-card)', border: '1px solid var(--db-border-subtle)', borderRadius: '0.5rem', padding: '1rem 1.25rem', marginBottom: '0.875rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.875rem' }}>
                        <ModeBadge mode={mode} />
                        <p style={{ fontFamily: 'var(--font-serif)', color: 'var(--db-text)', fontSize: '0.9375rem', fontWeight: 400, margin: 0, letterSpacing: '0.02em' }}>{(l.title as string) || `Listing ${i + 1}`}</p>
                      </div>
                      <Grid>
                        <Field label="Category" value={l.category as string} />
                        <Field label="City" value={l.city as string} />
                        <Field label="Location" value={l.location as string} />
                        <Field label="Duration" value={l.duration as string} />
                        <Field label="Min guests" value={l.minGuests as string} />
                        <Field label="Max guests" value={l.maxGuests as string} />
                        {isPaid && <Field label="Base price (CFA)" value={l.basePrice ? `${parseInt(l.basePrice as string).toLocaleString()} CFA` : null} />}
                        {isPaid && <Field label="Pricing model" value={l.pricingModel as string} />}
                        <Field label="Availability" value={
                          l.availabilityType === 'scheduled'
                            ? (Array.isArray(l.scheduledDays) ? (l.scheduledDays as string[]).join(', ') : 'Scheduled')
                            : l.availabilityType === 'one_time' || l.availabilityType === 'one_off' || l.availabilityType === 'temporary'
                            ? (l.eventDate as string) || 'One-time'
                            : 'Always'
                        } />
                        {!!l.timeSlots && <Field label="Time slots" value={l.timeSlots as string} />}
                        {!!l.leadTime && <Field label="Lead time" value={l.leadTime as string} />}
                        <Field label="Cancellation policy" value={l.cancellationPolicy as string} />
                        {!!(l.requiresReservation) && <Field label="Reservation required" value="Yes" />}
                        {!!(l.requiresReservation) && !!(l.advanceBookingDays) && <Field label="Advance booking" value={l.advanceBookingDays as string} />}
                        <Field label="Languages" value={Array.isArray(l.languages) ? (l.languages as string[]).join(', ') : l.languages as string} />
                        <Field label="Dress code" value={l.dressCode as string} />
                      </Grid>
                      {!!l.description && (
                        <div style={{ marginTop: '0.5rem' }}>
                          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.625rem', color: 'var(--db-text-faint)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 0.375rem' }}>Description</p>
                          <p style={{ fontFamily: 'var(--font-serif)', fontSize: '0.875rem', color: 'var(--db-text-muted)', margin: 0, lineHeight: 1.6 }}>{l.description as string}</p>
                        </div>
                      )}
                      {!!(l.includes || l.excludes || l.highlights) && (
                        <Grid>
                          <Field label="What's included" value={l.includes as string} />
                          <Field label="What's excluded" value={l.excludes as string} />
                          <Field label="Highlights" value={l.highlights as string} />
                        </Grid>
                      )}
                    </div>
                  )
                })}
              </div>
            ))
          })()}
        </div>
      )}

      {/* ── Documents tab ── */}
      {tab === 'documents' && (
        <div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', marginTop: '0.25rem' }}>
            {DOCUMENTS_META.map(({ field, label }) => {
              const d = docs[field]
              return (
                <div key={field} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.875rem 1.25rem', background: d ? 'var(--db-bg-card-active)' : 'var(--db-bg-card)', border: `1px solid ${d ? 'rgba(158,118,59,0.2)' : 'var(--db-border-subtle)'}`, borderRadius: '0.5rem' }}>
                  <div style={{ width: '1.625rem', height: '1.625rem', borderRadius: '50%', background: d ? 'rgba(158,118,59,0.15)' : 'var(--db-bg-card)', border: `1px solid ${d ? 'rgba(158,118,59,0.3)' : 'var(--db-border-subtle)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.75rem', color: d ? '#9e763b' : 'var(--db-text-faint)' }}>
                    {d ? '✓' : '○'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--db-text)', margin: '0 0 0.125rem' }}>{label}</p>
                    {d ? (
                      <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', color: 'var(--db-text-faint)', margin: 0 }}>{d.name} · {formatDate(d.uploadedAt)}</p>
                    ) : (
                      <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', color: 'var(--db-text-ghost)', margin: 0, fontStyle: 'italic' }}>Not uploaded</p>
                    )}
                  </div>
                  {d?.url && (
                    <a href={d.url} target="_blank" rel="noopener noreferrer"
                      style={{ flexShrink: 0, padding: '0.375rem 0.875rem', background: 'transparent', border: '1px solid var(--db-border-gold)', borderRadius: '0.25rem', color: 'var(--db-text-muted)', fontSize: '0.6875rem', fontFamily: 'var(--font-sans)', textDecoration: 'none', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                      View
                    </a>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Sign-off tab ── */}
      {tab === 'signoff' && (
        <div>
          {!!signoff.signedAt ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', background: 'rgba(158,118,59,0.08)', border: '1px solid rgba(158,118,59,0.25)', borderRadius: '0.5rem', padding: '0.875rem 1.25rem', marginBottom: '1.5rem' }}>
              <div style={{ width: '0.5rem', height: '0.5rem', borderRadius: '50%', background: '#9e763b', flexShrink: 0 }} />
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: '#be9a56', margin: 0 }}>
                Signed on {formatDate(signoff.signedAt as string)}{signoff.signedBy ? ` by ${signoff.signedBy as string}` : ''}
              </p>
            </div>
          ) : (
            <div style={{ background: 'var(--db-bg-card)', border: '1px solid var(--db-border-subtle)', borderRadius: '0.5rem', padding: '0.875rem 1.25rem', marginBottom: '1.5rem' }}>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--db-text-ghost)', margin: 0, fontStyle: 'italic' }}>Partner has not signed off yet.</p>
            </div>
          )}
          <SectionHeading>Agreement checkboxes</SectionHeading>
          {[
            { key: 'accuracyConfirm', label: 'Information accuracy confirmed' },
            { key: 'termsAgree', label: 'Palmera Terms & Conditions agreed' },
            { key: 'processorTerms', label: 'Payment processor Terms of Service accepted' },
            { key: 'partnerAgreement', label: 'Palmera Partner Agreement signed' },
          ].map(({ key, label }) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem 0', borderBottom: '1px solid var(--db-border-subtle)' }}>
              <div style={{ width: '1rem', height: '1rem', borderRadius: '0.1875rem', background: signoffChecks[key] ? '#9e763b' : 'transparent', border: `1.5px solid ${signoffChecks[key] ? '#9e763b' : 'var(--db-text-ghost)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {signoffChecks[key] && <span style={{ color: '#fff', fontSize: '0.625rem', lineHeight: 1 }}>✓</span>}
              </div>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: signoffChecks[key] ? 'var(--db-text)' : 'var(--db-text-faint)' }}>{label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
