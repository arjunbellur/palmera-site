'use client'
import { useState } from 'react'

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
  title: string
  category: string
  city: string
  location: string
  duration: string
  minGuests: string
  maxGuests: string
  basePrice: string
  pricingModel: string
  availableDays: string
  timeSlots: string
  leadTime: string
  blackoutDates: string
  cancellationPolicy: string
  includes: string
  excludes: string
  highlights: string
  dressCode: string
  languages: string[]
  description: string
}

const empty: ListingData = {
  title: '', category: '', city: '', location: '', duration: '',
  minGuests: '', maxGuests: '', basePrice: '', pricingModel: '',
  availableDays: '', timeSlots: '', leadTime: '', blackoutDates: '',
  cancellationPolicy: '', includes: '', excludes: '', highlights: '',
  dressCode: '', languages: [], description: '',
}

interface ListingModalProps {
  listing?: ListingData
  onSave: (data: ListingData) => void
  onClose: () => void
}

const inputStyle = {
  width: '100%',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(223,201,166,0.15)',
  borderRadius: '4px',
  padding: '10px 12px',
  color: 'var(--color-tan)',
  fontSize: '14px',
  fontFamily: 'var(--font-sans)',
  outline: 'none',
  boxSizing: 'border-box' as const,
}

const labelStyle = {
  display: 'block',
  fontSize: '11px',
  color: 'rgba(223,201,166,0.5)',
  letterSpacing: '0.08em',
  textTransform: 'uppercase' as const,
  marginBottom: '6px',
  fontFamily: 'var(--font-sans)',
}

const rowStyle = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '16px',
  marginBottom: '16px',
}

export default function ListingModal({ listing, onSave, onClose }: ListingModalProps) {
  const [form, setForm] = useState<ListingData>(listing || empty)
  const [saving, setSaving] = useState(false)

  const set = (field: keyof ListingData, value: string | string[]) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const toggleLanguage = (lang: string) => {
    const langs = form.languages.includes(lang)
      ? form.languages.filter(l => l !== lang)
      : [...form.languages, lang]
    set('languages', langs)
  }

  const handleSave = async () => {
    if (!form.title || !form.category || !form.city || !form.basePrice) return
    setSaving(true)
    await onSave(form)
    setSaving(false)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(4,4,4,0.85)',
      zIndex: 200,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      <div style={{
        background: '#0d0d0b',
        border: '1px solid rgba(223,201,166,0.15)',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '720px',
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: '32px',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            color: 'var(--color-tan)',
            fontSize: '20px',
            fontWeight: 400,
            margin: 0,
            letterSpacing: '0.06em',
          }}>
            {listing?.id ? 'Edit Listing' : 'New Listing'}
          </h2>
          <button onClick={onClose} style={{
            background: 'transparent', border: 'none',
            color: 'rgba(223,201,166,0.4)', fontSize: '22px', cursor: 'pointer',
          }}>×</button>
        </div>

        {/* Title */}
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Listing title *</label>
          <input style={inputStyle} placeholder='e.g. "Sunset Yacht on Gorée Bay"'
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

        {/* Guests */}
        <div style={rowStyle}>
          <div>
            <label style={labelStyle}>Min guests *</label>
            <input style={inputStyle} type="number" min="1" placeholder="1"
              value={form.minGuests} onChange={e => set('minGuests', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Max guests *</label>
            <input style={inputStyle} type="number" min="1" placeholder="20"
              value={form.maxGuests} onChange={e => set('maxGuests', e.target.value)} />
          </div>
        </div>

        {/* Pricing */}
        <div style={rowStyle}>
          <div>
            <label style={labelStyle}>Base price (CFA) *</label>
            <input style={inputStyle} type="number" placeholder="150000"
              value={form.basePrice} onChange={e => set('basePrice', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Pricing model *</label>
            <select style={{ ...inputStyle, appearance: 'none' }}
              value={form.pricingModel} onChange={e => set('pricingModel', e.target.value)}>
              <option value="">Select model</option>
              {PRICING_MODELS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>

        {/* Availability */}
        <div style={rowStyle}>
          <div>
            <label style={labelStyle}>Available days</label>
            <input style={inputStyle} placeholder='e.g. "Daily" / "Tue–Sat"'
              value={form.availableDays} onChange={e => set('availableDays', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Time slots</label>
            <input style={inputStyle} placeholder='e.g. "9am, 2pm, 5pm"'
              value={form.timeSlots} onChange={e => set('timeSlots', e.target.value)} />
          </div>
        </div>

        {/* Lead time + Blackout */}
        <div style={rowStyle}>
          <div>
            <label style={labelStyle}>Lead time required</label>
            <input style={inputStyle} placeholder='e.g. "48h" / "1 week"'
              value={form.leadTime} onChange={e => set('leadTime', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Blackout dates</label>
            <input style={inputStyle} placeholder="Holidays, off-season, private events"
              value={form.blackoutDates} onChange={e => set('blackoutDates', e.target.value)} />
          </div>
        </div>

        {/* Cancellation */}
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Cancellation policy</label>
          <select style={{ ...inputStyle, appearance: 'none' }}
            value={form.cancellationPolicy} onChange={e => set('cancellationPolicy', e.target.value)}>
            <option value="">Select policy</option>
            {CANCELLATION_POLICIES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        {/* Includes / Excludes */}
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
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Languages spoken</label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {LANGUAGES.map(lang => (
              <button
                key={lang}
                onClick={() => toggleLanguage(lang)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '4px',
                  border: `1px solid ${form.languages.includes(lang) ? 'var(--accent-4)' : 'rgba(223,201,166,0.15)'}`,
                  background: form.languages.includes(lang) ? 'rgba(190,154,86,0.15)' : 'transparent',
                  color: form.languages.includes(lang) ? 'var(--accent-4)' : 'rgba(223,201,166,0.5)',
                  fontSize: '13px',
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
        <div style={{ marginBottom: '24px' }}>
          <label style={labelStyle}>Description (60–100 words)</label>
          <textarea style={{ ...inputStyle, height: '110px', resize: 'vertical' }}
            placeholder="Write the marketing pitch in your own voice. Include sensory detail — what guests see, smell, feel. What makes this experience unmissable?"
            value={form.description} onChange={e => set('description', e.target.value)} />
          <span style={{ fontSize: '11px', color: 'rgba(223,201,166,0.3)', fontFamily: 'var(--font-sans)' }}>
            {form.description.trim().split(/\s+/).filter(Boolean).length} / 100 words
          </span>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{
            padding: '10px 24px',
            background: 'transparent',
            border: '1px solid rgba(223,201,166,0.2)',
            borderRadius: '4px',
            color: 'rgba(223,201,166,0.6)',
            fontSize: '14px',
            fontFamily: 'var(--font-sans)',
            cursor: 'pointer',
            letterSpacing: '0.04em',
          }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving || !form.title || !form.category || !form.city || !form.basePrice}
            style={{
              padding: '10px 28px',
              background: 'var(--accent-3)',
              border: 'none',
              borderRadius: '4px',
              color: '#fff',
              fontSize: '14px',
              fontFamily: 'var(--font-sans)',
              cursor: saving ? 'wait' : 'pointer',
              letterSpacing: '0.06em',
              opacity: (!form.title || !form.category || !form.city || !form.basePrice) ? 0.4 : 1,
            }}>
            {saving ? 'Saving...' : listing?.id ? 'Update Listing' : 'Save Listing'}
          </button>
        </div>
      </div>
    </div>
  )
}
