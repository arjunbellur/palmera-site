'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthChange } from '@/lib/auth'
import { getListings, addListing, updateListing, deleteListing, updateSectionStatus } from '@/lib/firestore'
import type { ListingData } from '@/components/dashboard/ListingModal'
import dynamic from 'next/dynamic'
const ListingModal = dynamic(() => import('@/components/dashboard/ListingModal'), { ssr: false })

function ModeBadge({ mode }: { mode?: string }) {
  const isPaid = mode === 'paid'
  const s = isPaid
    ? { bg: 'rgba(190,154,86,0.12)', border: 'rgba(190,154,86,0.35)', color: 'var(--db-gold)', label: 'Paid' }
    : { bg: 'var(--db-bg-card)', border: 'var(--db-border-subtle)', color: 'var(--db-text-muted)', label: 'Reservation' }
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
      border: '1px solid rgba(158,118,59,0.35)', background: 'rgba(158,118,59,0.1)', color: 'var(--db-gold-deep)',
    }}>
      Event
    </span>
  )
}

export default function ListingsPage() {
  const router = useRouter()
  const [uid, setUid] = useState('')
  const [listings, setListings] = useState<ListingData[]>([])
  const [partnerName, setPartnerName] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingListing, setEditingListing] = useState<ListingData | undefined>()
  const [loading, setLoading] = useState(true)
  const [basicsComplete, setBasicsComplete] = useState(true)

  useEffect(() => {
    const unsub = onAuthChange(async (user) => {
      if (!user) { router.replace('/dashboard'); return }
      setUid(user.uid)
      const [data, partner] = await Promise.all([
        getListings(user.uid),
        import('@/lib/firestore').then(m => m.getPartner(user.uid)),
      ])
      setListings(data as ListingData[])
      setBasicsComplete(partner?.sections?.basics === 'complete')
      setPartnerName(((partner?.tradingName || partner?.legalName) as string) || '')
      setLoading(false)
    })
    return () => unsub()
  }, [router])

  const handleSave = async (data: ListingData) => {
    if (data.id) {
      await updateListing(uid, data.id, data as unknown as Record<string, unknown>)
      setListings(prev => prev.map(l => l.id === data.id ? data : l))
    } else {
      const ref = await addListing(uid, data as unknown as Record<string, unknown>)
      const newListing = { ...data, id: ref.id }
      setListings(prev => [...prev, newListing])
    }
    await updateSectionStatus(uid, 'listings', 'complete')
    setShowModal(false)
    setEditingListing(undefined)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this listing?')) return
    await deleteListing(uid, id)
    setListings(prev => prev.filter(l => l.id !== id))
    if (listings.length <= 1) await updateSectionStatus(uid, 'listings', 'incomplete')
  }

  const openEdit = (listing: ListingData) => { setEditingListing(listing); setShowModal(true) }
  const openNew = () => { setEditingListing(undefined); setShowModal(true) }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '20rem' }}>
      <div style={{ width: '1.75rem', height: '1.75rem', border: '2px solid rgba(190,154,86,0.15)', borderTopColor: 'var(--db-gold)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const grouped = listings.reduce<Record<string, ListingData[]>>((acc, l) => {
    const key = l.providerName || partnerName || 'Other'
    if (!acc[key]) acc[key] = []
    acc[key].push(l)
    return acc
  }, {})
  const groupEntries = Object.entries(grouped)

  return (
    <div>
      {!basicsComplete && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--db-bg-banner)', border: '1px solid var(--db-border)', borderRadius: '0.5rem', padding: '0.875rem 1.25rem', marginBottom: '1.75rem' }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="#be9a56" strokeWidth="1.25"/><path d="M8 5v3.5M8 11h.01" stroke="#be9a56" strokeWidth="1.25" strokeLinecap="round"/></svg>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--db-text-muted)', margin: 0, lineHeight: 1.5 }}>
            Complete your <a href="/dashboard/profile" style={{ color: 'var(--db-gold)', textDecoration: 'underline' }}>Business Profile</a> first — listings won&apos;t go live until your profile is approved.
          </p>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
        <div>
          <p style={{ fontFamily: 'var(--font-sans)', color: 'var(--db-text-faint)', fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 8px' }}>
            Experience Listings
          </p>
          <h1 style={{ fontFamily: 'var(--font-display)', color: 'var(--db-text)', fontSize: '1.625rem', fontWeight: 400, letterSpacing: '0.06em', margin: 0 }}>
            Your Listings
          </h1>
        </div>
        <button onClick={openNew} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.625rem 1.25rem', background: 'var(--accent-3)', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '0.8125rem', fontFamily: 'var(--font-sans)', letterSpacing: '0.06em', cursor: 'pointer' }}>
          + Add Listing
        </button>
      </div>

      {listings.length === 0 ? (
        <div style={{ background: 'var(--db-bg-card)', border: '1px dashed var(--db-border-dashed)', borderRadius: '0.625rem', padding: '3.75rem 2.5rem', textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--font-serif)', color: 'var(--db-text-faint)', fontSize: '1.125rem', margin: '0 0 8px', letterSpacing: '0.04em' }}>No listings yet</p>
          <p style={{ fontFamily: 'var(--font-sans)', color: 'var(--db-text-ghost)', fontSize: '0.8125rem', margin: '0 0 24px' }}>Add your first experience to get listed on Palmera.</p>
          <button onClick={openNew} style={{ padding: '10px 24px', background: 'transparent', border: '1px solid var(--db-border-subtle)', borderRadius: '6px', color: 'var(--db-text)', fontSize: '0.8125rem', fontFamily: 'var(--font-sans)', cursor: 'pointer', letterSpacing: '0.04em' }}>
            + Add your first listing
          </button>
        </div>
      ) : (
        <div>
          {groupEntries.map(([provider, items]) => (
            <div key={provider} style={{ marginBottom: '2rem' }}>
              {groupEntries.length > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.875rem' }}>
                  <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--db-text-faint)', margin: 0 }}>{provider}</p>
                  <div style={{ flex: 1, height: '1px', background: 'var(--db-border-subtle)' }} />
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', color: 'var(--db-text-ghost)' }}>{items.length}</span>
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {items.map(listing => (
                  <div key={listing.id} style={{ background: 'var(--db-bg-card)', border: '1px solid var(--db-border-subtle)', borderRadius: '0.5rem', padding: '1.25rem 1.375rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                      <div>
                        <h3 style={{ fontFamily: 'var(--font-serif)', color: 'var(--db-text)', fontSize: '0.9375rem', fontWeight: 400, margin: '0 0 6px', letterSpacing: '0.02em' }}>{listing.title}</h3>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                          <ModeBadge mode={listing.mode} />
                          <EventBadge availabilityType={listing.availabilityType} />
                          {listing.category && <span style={{ fontSize: '0.6875rem', color: 'var(--accent-4)', border: '1px solid var(--db-border)', padding: '2px 8px', borderRadius: '2px', fontFamily: 'var(--font-sans)', letterSpacing: '0.05em' }}>{listing.category}</span>}
                          {listing.city && <span style={{ fontSize: '0.6875rem', color: 'var(--db-text-faint)', fontFamily: 'var(--font-sans)' }}>{listing.city}</span>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexShrink: 0, marginLeft: '10px' }}>
                        <button onClick={() => openEdit(listing)} style={{ background: 'transparent', border: '1px solid var(--db-border-subtle)', borderRadius: '4px', color: 'var(--db-text-faint)', fontSize: '0.6875rem', fontFamily: 'var(--font-sans)', padding: '4px 10px', cursor: 'pointer', letterSpacing: '0.04em' }}>Edit</button>
                        <button onClick={() => listing.id && handleDelete(listing.id)} style={{ background: 'transparent', border: '1px solid rgba(224,112,112,0.2)', borderRadius: '4px', color: 'rgba(224,112,112,0.5)', fontSize: '0.6875rem', fontFamily: 'var(--font-sans)', padding: '4px 10px', cursor: 'pointer', letterSpacing: '0.04em' }}>Delete</button>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '12px' }}>
                      {listing.mode === 'paid' && listing.basePrice && (
                        <div>
                          <span style={{ fontSize: '10px', color: 'var(--db-text-ghost)', fontFamily: 'var(--font-sans)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>From</span>
                          <p style={{ fontSize: '0.8125rem', color: 'var(--accent-4)', fontFamily: 'var(--font-sans)', margin: '2px 0 0' }}>{parseInt(listing.basePrice).toLocaleString()} CFA</p>
                        </div>
                      )}
                      {listing.mode === 'paid' && listing.pricingModel && (
                        <div>
                          <span style={{ fontSize: '10px', color: 'var(--db-text-ghost)', fontFamily: 'var(--font-sans)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Pricing</span>
                          <p style={{ fontSize: '0.8125rem', color: 'var(--db-text-muted)', fontFamily: 'var(--font-sans)', margin: '2px 0 0' }}>{listing.pricingModel}</p>
                        </div>
                      )}
                      {listing.minGuests && listing.maxGuests && (
                        <div>
                          <span style={{ fontSize: '10px', color: 'var(--db-text-ghost)', fontFamily: 'var(--font-sans)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Guests</span>
                          <p style={{ fontSize: '0.8125rem', color: 'var(--db-text-muted)', fontFamily: 'var(--font-sans)', margin: '2px 0 0' }}>{listing.minGuests}–{listing.maxGuests}</p>
                        </div>
                      )}
                      {listing.duration && (
                        <div>
                          <span style={{ fontSize: '10px', color: 'var(--db-text-ghost)', fontFamily: 'var(--font-sans)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Duration</span>
                          <p style={{ fontSize: '0.8125rem', color: 'var(--db-text-muted)', fontFamily: 'var(--font-sans)', margin: '2px 0 0' }}>{listing.duration}</p>
                        </div>
                      )}
                      {(listing.availabilityType === 'scheduled') && listing.scheduledDays?.length > 0 && (
                        <div>
                          <span style={{ fontSize: '10px', color: 'var(--db-text-ghost)', fontFamily: 'var(--font-sans)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Days</span>
                          <p style={{ fontSize: '0.8125rem', color: 'var(--db-text-muted)', fontFamily: 'var(--font-sans)', margin: '2px 0 0' }}>{listing.scheduledDays.join(', ')}</p>
                        </div>
                      )}
                      {(listing.availabilityType === 'one_time' || (listing.availabilityType as string) === 'one_off' || (listing.availabilityType as string) === 'temporary') && listing.eventDate && (
                        <div>
                          <span style={{ fontSize: '10px', color: 'var(--db-text-ghost)', fontFamily: 'var(--font-sans)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Date</span>
                          <p style={{ fontSize: '0.8125rem', color: 'var(--db-text-muted)', fontFamily: 'var(--font-sans)', margin: '2px 0 0' }}>{listing.eventDate}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <ListingModal
          listing={editingListing}
          partnerBusinessName={partnerName}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditingListing(undefined) }}
        />
      )}
    </div>
  )
}
