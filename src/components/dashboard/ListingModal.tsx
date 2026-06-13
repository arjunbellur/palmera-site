'use client'
import { useState } from 'react'
import type { ListingMode, AvailabilityType } from '@/lib/firestore'

const CATEGORIES = [
  'Activities', 'Dining', 'Wellness', 'Lifestyle', 'Rentals',
  'Villas', 'Nightlife', 'Safari', 'Islands', 'Yachts',
  'Entertainment', 'Sports',
]

const CITIES = ['Dakar', 'Saly', 'Lompoul', 'Marrakesh', 'Lagos', 'Other']

const PRICING_MODELS = ['Per person', 'Per group', 'Per hour', 'Per night']

const CANCELLATION_POLICIES = [
  'Free cancellation up to 24h before',
  'Free cancellation up to 48h before',
  'Free cancellation up to 1 week before',
  'Non-refundable',
  'Custom',
]

const LANGUAGES = ['French', 'English', 'Wolof', 'Arabic', 'Spanish']

export interface ListingData {
  id?: string
  mode: ListingMode
  providerName: string
  title: string
  category: string
  city: string
  location: string
  duration: string
  minGuests: string
  maxGuests: string
  basePrice: string
  pricingModel: string
  availabilityType: AvailabilityType
  eventDate: string
  availableDays: string
  timeSlots: string
  leadTime: string
  blackoutDates: string
  cancellationPolicy: string
  requiresReservation: boolean
  minGroupSize: string
  maxGroupSize: string
  advanceBookingDays: string
  isHighlighted: boolean
  includes: string
  excludes: string
  highlights: string
  dressCode: string
  languages: string[]
  description: string
}

const empty: ListingData = {
  mode: 'paid',
  providerName: '',
  title: '', category: '', city: '', location: '', duration: '',
  minGuests: '', maxGuests: '', basePrice: '', pricingModel: '',
  availabilityType: 'indefinite',
  eventDate: '',
  availableDays: '', timeSlots: '', leadTime: '', blackoutDates: '',
  cancellationPolicy: '',
  requiresReservation: false,
  minGroupSize: '', maxGroupSize: '', advanceBookingDays: '',
  isHighlighted: false,
  includes: '', excludes: '', highlights: '', dressCode: '',
  languages: [], description: '',
}

interface ListingModalProps {
  listing?: ListingData
  partnerBusinessName?: string
  onSave: (data: ListingData) => void
  onClose: () => void
}

const inputStyle = {
  width: '100%',
  background: 'var(--db-bg-input)',
  border: '1px solid var(--db-border-subtle)',
  borderRadius: '0.25rem',
  padding: '10px 12px',
  color: 'var(--db-text)',
  fontSize: '0.875rem',
  fontFamily: 'var(--font-sans)',
  outline: 'none',
  boxSizing: 'border-box' as const,
}

const labelStyle = {
  display: 'block',
  fontSize: '0.6875rem',
  color: 'var(--db-text-faint)',
  letterSpacing: '0.08em',
  textTransform: 'uppercase' as const,
  marginBottom: '6px',
  fontFamily: 'var(--font-sans)',
}

const rowStyle = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '1rem',
  marginBottom: '1rem',
}

const dividerStyle = {
  borderTop: '1px solid var(--db-border-subtle)',
  margin: '1.25rem 0',
}

function normalizeMode(m: string): ListingMode {
  return m === 'paid' ? 'paid' : 'reservation'
}

function normalizeAvailability(a: string): AvailabilityType {
  if (a === 'temporary' || a === 'one_off') return 'temporary'
  return 'indefinite'
}

export default function ListingModal({ listing, partnerBusinessName, onSave, onClose }: ListingModalProps) {
  const [form, setForm] = useState<ListingData>(() => {
    const base = listing
      ? { ...empty, ...listing }
      : { ...empty, providerName: partnerBusinessName || '' }
    base.mode = normalizeMode(base.mode as string)
    base.availabilityType = normalizeAvailability(base.availabilityType as string)
    if (!base.providerName) base.providerName = partnerBusinessName || ''
    return base
  })
  const [saving, setSaving] = useState(false)

  const set = (field: keyof ListingData, value: ListingData[keyof ListingData]) =>
    setForm(prev => ({ ...prev, [field]: value } as ListingData))

  const toggleLanguage = (lang: string) => {
    const langs = form.languages.includes(lang)
      ? form.languages.filter(l => l !== lang)
      : [...form.languages, lang]
    set('languages', langs)
  }

  const canSave = !!form.title && !!form.category && !!form.city && (form.mode !== 'paid' || !!form.basePrice)

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    await onSave(form)
    setSaving(false)
  }

  const isPaid = form.mode === 'paid'
  const isTemporary = form.availabilityType === 'temporary'

  const pillBase = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: '9px 0',
    background: active ? 'rgba(190,154,86,0.15)' : 'transparent',
    border: 'none',
    color: active ? '#be9a56' : 'var(--db-text-faint)',
    fontSize: '0.8125rem', fontFamily: 'var(--font-sans)', letterSpacing: '0.04em', cursor: 'pointer',
    transition: 'all 0.15s',
  })

  return (
    <div
      data-lenis-prevent
      style={{
        position: 'fixed', inset: 0,
        background: 'var(--db-overlay)',
        zIndex: 200,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '20px',
      }}
    >
      <div style={{
        background: 'var(--db-bg-modal)',
        border: '1px solid var(--db-border-subtle)',
        borderRadius: '0.75rem',
        width: '100%',
        maxWidth: '45rem',
        margin: 'auto',
        padding: '2rem',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            color: 'var(--db-text)',
            fontSize: '1.25rem',
            fontWeight: 400,
            margin: 0,
            letterSpacing: '0.06em',
          }}>
            {listing?.id ? 'Edit Listing' : 'New Listing'}
          </h2>
          <button onClick={onClose} style={{
            background: 'transparent', border: 'none',
            color: 'var(--db-text-faint)', fontSize: '1.375rem', cursor: 'pointer',
          }}>×</button>
        </div>

        {/* Mode selector */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={labelStyle}>Listing type *</label>
          <div style={{ display: 'flex', borderRadius: '0.375rem', border: '1px solid var(--db-border-subtle)', overflow: 'hidden' }}>
            {(['paid', 'reservation'] as ListingMode[]).map((m, i, arr) => (
              <button key={m} onClick={() => set('mode', m)} style={{
                ...pillBase(form.mode === m),
                borderRight: i < arr.length - 1 ? '1px solid var(--db-border-subtle)' : 'none',
              }}>
                {m === 'paid' ? 'Paid' : 'Reservation'}
              </button>
            ))}
          </div>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', color: 'var(--db-text-ghost)', margin: '6px 0 0', lineHeight: 1.5 }}>
            {isPaid ? 'Guest pays through Palmera at time of booking.' : 'Guest holds a spot — no upfront charge through Palmera.'}
          </p>
        </div>

        {/* Provider name */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={labelStyle}>Provider / brand name</label>
          <input style={inputStyle} placeholder='e.g. "Sunset Terrace" or "La Villa Dakar"'
            value={form.providerName} onChange={e => set('providerName', e.target.value)} />
        </div>

        <div style={dividerStyle} />

        {/* Title */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={labelStyle}>Listing title *</label>
          <input style={inputStyle} placeholder='e.g. "Valentine&apos;s Dinner at the Terrace"'
            value={form.title} onChange={e => set('title', e.target.value)} />
        </div>

        {/* Category + City */}
        <div style={rowStyle}>
          <div>
            <label style={labelStyle}>Category *</label>
            <select style={{ ...inputStyle, appearance: 'none' }}
              value={form.category} onChange={e => set('category', e.target.value)}>
              <option value="">Select category</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>City *</label>
            <select style={{ ...inputStyle, appearance: 'none' }}
              value={form.city} onChange={e => set('city', e.target.value)}>
              <option value="">Select city</option>
              {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Location + Duration */}
        <div style={rowStyle}>
          <div>
            <label style={labelStyle}>Specific location</label>
            <input style={inputStyle} placeholder='e.g. "Almadies" or "Port de Hann"'
              value={form.location} onChange={e => set('location', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Duration</label>
            <input style={inputStyle} placeholder='e.g. "4 hours" / "Full day"'
              value={form.duration} onChange={e => set('duration', e.target.value)} />
          </div>
        </div>

        {/* Pricing — paid mode only */}
        {isPaid && (
          <>
            <div style={dividerStyle} />
            <div style={rowStyle}>
              <div>
                <label style={labelStyle}>Base price (CFA) *</label>
                <input style={inputStyle} type="number" placeholder="150000"
                  value={form.basePrice} onChange={e => set('basePrice', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Pricing model</label>
                <select style={{ ...inputStyle, appearance: 'none' }}
                  value={form.pricingModel} onChange={e => set('pricingModel', e.target.value)}>
                  <option value="">Select model</option>
                  {PRICING_MODELS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
          </>
        )}

        {/* Guests */}
        <div style={rowStyle}>
          <div>
            <label style={labelStyle}>Min guests</label>
            <input style={inputStyle} type="number" min="1" placeholder="1"
              value={form.minGuests} onChange={e => set('minGuests', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Max guests</label>
            <input style={inputStyle} type="number" min="1" placeholder="20"
              value={form.maxGuests} onChange={e => set('maxGuests', e.target.value)} />
          </div>
        </div>

        <div style={dividerStyle} />

        {/* Availability type */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={labelStyle}>Availability</label>
          <div style={{ display: 'flex', borderRadius: '0.25rem', border: '1px solid var(--db-border-subtle)', overflow: 'hidden' }}>
            {(['indefinite', 'temporary'] as AvailabilityType[]).map((a, i, arr) => (
              <button key={a} onClick={() => set('availabilityType', a)} style={{
                ...pillBase(form.availabilityType === a),
                fontSize: '0.75rem',
                borderRight: i < arr.length - 1 ? '1px solid var(--db-border-subtle)' : 'none',
              }}>
                {a === 'indefinite' ? 'Indefinite' : 'Temporary'}
              </button>
            ))}
          </div>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', color: 'var(--db-text-ghost)', margin: '6px 0 0', lineHeight: 1.5 }}>
            {isTemporary ? "Tied to a specific event or date window (e.g. Valentine’s dinner, NYE party)." : "Always available — no end date (e.g. villa bookings, ongoing restaurant reservations)."}
          </p>
        </div>

        {/* Event date — temporary only */}
        {isTemporary && (
          <div style={{ ...rowStyle }}>
            <div>
              <label style={labelStyle}>Event date</label>
              <input type="date" style={inputStyle}
                value={form.eventDate} onChange={e => set('eventDate', e.target.value)} />
            </div>
            <div />
          </div>
        )}

        {/* Time slots + Lead time */}
        <div style={rowStyle}>
          <div>
            <label style={labelStyle}>Time slots</label>
            <input style={inputStyle} placeholder='e.g. "9am, 2pm, 5pm"'
              value={form.timeSlots} onChange={e => set('timeSlots', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Lead time required</label>
            <input style={inputStyle} placeholder='e.g. "48h" / "1 week"'
              value={form.leadTime} onChange={e => set('leadTime', e.target.value)} />
          </div>
        </div>

        {/* Blackout + Cancellation */}
        <div style={rowStyle}>
          <div>
            <label style={labelStyle}>Blackout dates</label>
            <input style={inputStyle} placeholder="Holidays, off-season, private events"
              value={form.blackoutDates} onChange={e => set('blackoutDates', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Cancellation policy</label>
            <select style={{ ...inputStyle, appearance: 'none' }}
              value={form.cancellationPolicy} onChange={e => set('cancellationPolicy', e.target.value)}>
              <option value="">Select policy</option>
              {CANCELLATION_POLICIES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>

        {/* Reservation config */}
        <>
          <div style={dividerStyle} />
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', cursor: 'pointer', marginBottom: '1rem' }}>
            <input type="checkbox" checked={form.requiresReservation}
              onChange={e => set('requiresReservation', e.target.checked)}
              style={{ width: '1rem', height: '1rem', accentColor: '#be9a56', cursor: 'pointer' }} />
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--db-text-muted)' }}>Requires advance reservation</span>
          </label>
          {form.requiresReservation && (
            <>
              <div style={rowStyle}>
                <div>
                  <label style={labelStyle}>Min group size</label>
                  <input style={inputStyle} type="number" min="1" placeholder="2"
                    value={form.minGroupSize} onChange={e => set('minGroupSize', e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Max group size</label>
                  <input style={inputStyle} type="number" min="1" placeholder="12"
                    value={form.maxGroupSize} onChange={e => set('maxGroupSize', e.target.value)} />
                </div>
              </div>
              <div style={{ ...rowStyle }}>
                <div>
                  <label style={labelStyle}>Advance booking window</label>
                  <input style={inputStyle} placeholder='e.g. "72h" / "7 days"'
                    value={form.advanceBookingDays} onChange={e => set('advanceBookingDays', e.target.value)} />
                </div>
                <div />
              </div>
            </>
          )}
        </>

        <div style={dividerStyle} />

        {/* Includes / Excludes — paid only */}
        {isPaid && (
          <div style={rowStyle}>
            <div>
              <label style={labelStyle}>What&apos;s included (one per line)</label>
              <textarea style={{ ...inputStyle, height: '90px', resize: 'vertical' }}
                placeholder={"Food & drinks\nTransport\nGuide\nSnorkeling gear"}
                value={form.includes} onChange={e => set('includes', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Not included (one per line)</label>
              <textarea style={{ ...inputStyle, height: '90px', resize: 'vertical' }}
                placeholder={"Gratuity\nAlcohol\nPersonal expenses"}
                value={form.excludes} onChange={e => set('excludes', e.target.value)} />
            </div>
          </div>
        )}

        {/* Highlights + Dress code */}
        <div style={rowStyle}>
          <div>
            <label style={labelStyle}>Highlights (awards, featured in)</label>
            <input style={inputStyle} placeholder="e.g. Featured in CNN Travel"
              value={form.highlights} onChange={e => set('highlights', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Dress code / age limit</label>
            <input style={inputStyle} placeholder="e.g. Smart casual, 18+"
              value={form.dressCode} onChange={e => set('dressCode', e.target.value)} />
          </div>
        </div>

        {/* Languages */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={labelStyle}>Languages spoken</label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {LANGUAGES.map(lang => (
              <button
                key={lang}
                onClick={() => toggleLanguage(lang)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '0.25rem',
                  border: `1px solid ${form.languages.includes(lang) ? 'var(--accent-4)' : 'var(--db-border-subtle)'}`,
                  background: form.languages.includes(lang) ? 'rgba(190,154,86,0.15)' : 'transparent',
                  color: form.languages.includes(lang) ? 'var(--accent-4)' : 'var(--db-text-faint)',
                  fontSize: '0.8125rem',
                  fontFamily: 'var(--font-sans)',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {lang}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={labelStyle}>Description (60–100 words)</label>
          <textarea style={{ ...inputStyle, height: '110px', resize: 'vertical' }}
            placeholder="Write the marketing pitch in your own voice. Include sensory detail — what guests see, smell, feel. What makes this experience unmissable?"
            value={form.description} onChange={e => set('description', e.target.value)} />
          <span style={{ fontSize: '0.6875rem', color: 'var(--db-text-ghost)', fontFamily: 'var(--font-sans)' }}>
            {form.description.trim().split(/\s+/).filter(Boolean).length} / 100 words
          </span>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{
            padding: '10px 24px',
            background: 'transparent',
            border: '1px solid var(--db-border-subtle)',
            borderRadius: '0.25rem',
            color: 'var(--db-text-muted)',
            fontSize: '0.875rem',
            fontFamily: 'var(--font-sans)',
            cursor: 'pointer',
            letterSpacing: '0.04em',
          }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving || !canSave}
            style={{
              padding: '10px 28px',
              background: 'var(--accent-3)',
              border: 'none',
              borderRadius: '0.25rem',
              color: '#fff',
              fontSize: '0.875rem',
              fontFamily: 'var(--font-sans)',
              cursor: saving ? 'wait' : 'pointer',
              letterSpacing: '0.06em',
              opacity: !canSave ? 0.4 : 1,
            }}>
            {saving ? 'Saving...' : listing?.id ? 'Update Listing' : 'Save Listing'}
          </button>
        </div>
      </div>
    </div>
  )
}
