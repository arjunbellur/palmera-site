'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthChange } from '@/lib/auth'
import { getListings, addListing, updateListing, deleteListing, updateSectionStatus } from '@/lib/firestore'
import ListingModal, { ListingData } from '@/components/dashboard/ListingModal'

export default function ListingsPage() {
  const router = useRouter()
  const [uid, setUid] = useState('')
  const [listings, setListings] = useState<ListingData[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editingListing, setEditingListing] = useState<ListingData | undefined>()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthChange(async (user) => {
      if (!user) { router.replace('/dashboard'); return }
      setUid(user.uid)
      const data = await getListings(user.uid)
      setListings(data as ListingData[])
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

  const openEdit = (listing: ListingData) => {
    setEditingListing(listing)
    setShowModal(true)
  }

  const openNew = () => {
    setEditingListing(undefined)
    setShowModal(true)
  }

  if (loading) return null

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
        <div>
          <p style={{ fontFamily: 'var(--font-sans)', color: 'rgba(223,201,166,0.4)', fontSize: '12px', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 8px' }}>
            Experience Listings
          </p>
          <h1 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-tan)', fontSize: '26px', fontWeight: 400, letterSpacing: '0.06em', margin: 0 }}>
            Your Listings
          </h1>
        </div>
        <button
          onClick={openNew}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '10px 20px',
            background: 'var(--accent-3)',
            border: 'none',
            borderRadius: '6px',
            color: '#fff',
            fontSize: '13px',
            fontFamily: 'var(--font-sans)',
            letterSpacing: '0.06em',
            cursor: 'pointer',
          }}
        >
          + Add Listing
        </button>
      </div>

      {listings.length === 0 ? (
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px dashed rgba(223,201,166,0.12)',
          borderRadius: '10px',
          padding: '60px 40px',
          textAlign: 'center',
        }}>
          <p style={{ fontFamily: 'var(--font-serif)', color: 'rgba(223,201,166,0.35)', fontSize: '18px', margin: '0 0 8px', letterSpacing: '0.04em' }}>
            No listings yet
          </p>
          <p style={{ fontFamily: 'var(--font-sans)', color: 'rgba(223,201,166,0.25)', fontSize: '13px', margin: '0 0 24px' }}>
            Add your first experience to get listed on Palmera.
          </p>
          <button
            onClick={openNew}
            style={{
              padding: '10px 24px',
              background: 'transparent',
              border: '1px solid rgba(223,201,166,0.2)',
              borderRadius: '6px',
              color: 'var(--color-tan)',
              fontSize: '13px',
              fontFamily: 'var(--font-sans)',
              cursor: 'pointer',
              letterSpacing: '0.04em',
            }}
          >
            + Add your first listing
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {listings.map(listing => (
            <div
              key={listing.id}
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(223,201,166,0.1)',
                borderRadius: '8px',
                padding: '20px 22px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div>
                  <h3 style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-tan)', fontSize: '15px', fontWeight: 400, margin: '0 0 4px', letterSpacing: '0.02em' }}>
                    {listing.title}
                  </h3>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {listing.category && (
                      <span style={{ fontSize: '11px', color: 'var(--accent-4)', border: '1px solid rgba(190,154,86,0.25)', padding: '2px 8px', borderRadius: '2px', fontFamily: 'var(--font-sans)', letterSpacing: '0.05em' }}>
                        {listing.category}
                      </span>
                    )}
                    {listing.city && (
                      <span style={{ fontSize: '11px', color: 'rgba(223,201,166,0.4)', fontFamily: 'var(--font-sans)' }}>
                        {listing.city}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0, marginLeft: '10px' }}>
                  <button
                    onClick={() => openEdit(listing)}
                    style={{ background: 'transparent', border: '1px solid rgba(223,201,166,0.15)', borderRadius: '4px', color: 'rgba(223,201,166,0.5)', fontSize: '11px', fontFamily: 'var(--font-sans)', padding: '4px 10px', cursor: 'pointer', letterSpacing: '0.04em' }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => listing.id && handleDelete(listing.id)}
                    style={{ background: 'transparent', border: '1px solid rgba(224,112,112,0.2)', borderRadius: '4px', color: 'rgba(224,112,112,0.5)', fontSize: '11px', fontFamily: 'var(--font-sans)', padding: '4px 10px', cursor: 'pointer', letterSpacing: '0.04em' }}
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '12px' }}>
                {listing.basePrice && (
                  <div>
                    <span style={{ fontSize: '10px', color: 'rgba(223,201,166,0.35)', fontFamily: 'var(--font-sans)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>From</span>
                    <p style={{ fontSize: '13px', color: 'var(--accent-4)', fontFamily: 'var(--font-sans)', margin: '2px 0 0' }}>
                      {parseInt(listing.basePrice).toLocaleString()} CFA
                    </p>
                  </div>
                )}
                {listing.pricingModel && (
                  <div>
                    <span style={{ fontSize: '10px', color: 'rgba(223,201,166,0.35)', fontFamily: 'var(--font-sans)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Pricing</span>
                    <p style={{ fontSize: '13px', color: 'rgba(223,201,166,0.6)', fontFamily: 'var(--font-sans)', margin: '2px 0 0' }}>
                      {listing.pricingModel}
                    </p>
                  </div>
                )}
                {listing.minGuests && listing.maxGuests && (
                  <div>
                    <span style={{ fontSize: '10px', color: 'rgba(223,201,166,0.35)', fontFamily: 'var(--font-sans)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Guests</span>
                    <p style={{ fontSize: '13px', color: 'rgba(223,201,166,0.6)', fontFamily: 'var(--font-sans)', margin: '2px 0 0' }}>
                      {listing.minGuests}–{listing.maxGuests}
                    </p>
                  </div>
                )}
                {listing.duration && (
                  <div>
                    <span style={{ fontSize: '10px', color: 'rgba(223,201,166,0.35)', fontFamily: 'var(--font-sans)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Duration</span>
                    <p style={{ fontSize: '13px', color: 'rgba(223,201,166,0.6)', fontFamily: 'var(--font-sans)', margin: '2px 0 0' }}>
                      {listing.duration}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Add new card */}
          <div
            onClick={openNew}
            style={{
              background: 'transparent',
              border: '1px dashed rgba(223,201,166,0.1)',
              borderRadius: '8px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer',
              minHeight: '120px',
              transition: 'border-color 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(190,154,86,0.3)'}
            onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(223,201,166,0.1)'}
          >
            <span style={{ fontSize: '24px', color: 'rgba(223,201,166,0.2)' }}>+</span>
            <span style={{ fontSize: '13px', color: 'rgba(223,201,166,0.3)', fontFamily: 'var(--font-sans)' }}>Add another listing</span>
          </div>
        </div>
      )}

      {showModal && (
        <ListingModal
          listing={editingListing}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditingListing(undefined) }}
        />
      )}
    </div>
  )
}
