'use client'

import { useState } from 'react'
import Link from 'next/link'

const SERVICE_CATEGORIES = [
  'Luxury Villas & Estates',
  'Yacht & Boat Charters',
  'VIP Nightlife & Events',
  'Safari & Wildlife Experiences',
  'Concierge & Personal Services',
  'Premium Transportation',
  'Fine Dining & Private Chef',
  'Wellness & Spa',
  'Other',
]

const CITIES = [
  'Dakar, Senegal',
  'Marrakesh, Morocco',
  'Lagos, Nigeria',
  'Abidjan, Côte d\'Ivoire',
  'Accra, Ghana',
  'Casablanca, Morocco',
  'Nairobi, Kenya',
  'Johannesburg, South Africa',
  'Cairo, Egypt',
  'Other',
]

type FormData = {
  // Step 1 — Business Identity
  businessName: string
  website: string
  serviceCategory: string
  primaryCity: string
  // Step 2 — Experience Details
  description: string
  capacity: string
  priceRange: string
  yearsOperating: string
  // Step 3 — Contact
  contactName: string
  contactRole: string
  contactEmail: string
  contactPhone: string
  // Step 4 — Fit
  whyPalmera: string
  existingPartnerships: string
  referralSource: string
}

const EMPTY: FormData = {
  businessName: '',
  website: '',
  serviceCategory: '',
  primaryCity: '',
  description: '',
  capacity: '',
  priceRange: '',
  yearsOperating: '',
  contactName: '',
  contactRole: '',
  contactEmail: '',
  contactPhone: '',
  whyPalmera: '',
  existingPartnerships: '',
  referralSource: '',
}

const STEPS = [
  { number: 1, label: 'Your Business' },
  { number: 2, label: 'The Experience' },
  { number: 3, label: 'Contact' },
  { number: 4, label: 'Partnership' },
]

export default function PartnersPage() {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<FormData>(EMPTY)
  const [submitted, setSubmitted] = useState(false)

  const update = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const next = () => setStep((s) => Math.min(s + 1, 4))
  const back = () => setStep((s) => Math.max(s - 1, 1))

  const handleSubmit = () => {
    // Here you'd POST to your backend/API
    setSubmitted(true)
  }

  const inputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(201,168,76,0.22)',
    color: 'var(--bg-2)',
    padding: '14px 18px',
    width: '100%',
    fontSize: '15px',
    fontFamily: 'var(--font-serif)',
    transition: 'border-color 0.2s ease',
    outline: 'none',
    borderRadius: '0',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: '11px',
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: 'var(--accent-4)',
    display: 'block',
    marginBottom: '8px',
  }

  const fieldWrap: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
  }

  if (submitted) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#040404',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px',
        }}
      >
        <div style={{ textAlign: 'center', maxWidth: '560px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px',
              marginBottom: '40px',
            }}
          >
            <div style={{ width: '40px', height: '1px', background: 'var(--accent-4)' }} />
            <span style={{ color: 'var(--accent-4)', fontSize: '24px' }}>◈</span>
            <div style={{ width: '40px', height: '1px', background: 'var(--accent-4)' }} />
          </div>
          <h1
            className="font-display"
            style={{
              fontSize: 'clamp(40px, 6vw, 72px)',
              fontWeight: 300,
              color: 'var(--bg-2)',
              lineHeight: 1.1,
              marginBottom: '24px',
            }}
          >
            Application{' '}
            <em style={{ fontStyle: 'italic', color: 'var(--accent-4)' }}>
              received.
            </em>
          </h1>
          <p
            style={{
              fontSize: '16px',
              color: 'rgba(245,240,232,0.55)',
              lineHeight: 1.75,
              marginBottom: '48px',
            }}
          >
            Thank you, {form.contactName.split(' ')[0]}. Our partnerships team will
            review your application and reach out within 3–5 business days. We look
            forward to welcoming {form.businessName} to the Palmera network.
          </p>
          <Link
            href="/"
            style={{
              display: 'inline-block',
              padding: '16px 48px',
              border: '1px solid var(--accent-4)',
              color: 'var(--accent-4)',
              textDecoration: 'none',
              fontSize: '12px',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
            }}
          >
            Return to Palmera
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#040404',
      }}
    >
      {/* Top nav bar */}
      <div
        style={{
          padding: '24px 60px',
          borderBottom: '1px solid rgba(201,168,76,0.12)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Link href="/" style={{ textDecoration: 'none' }}>
          <span
            className="font-display"
            style={{
              fontSize: '20px',
              fontWeight: 400,
              color: 'var(--accent-4)',
              letterSpacing: '0.12em',
            }}
          >
            Palmera
          </span>
        </Link>
        <p
          style={{
            fontSize: '11px',
            letterSpacing: '0.2em',
            color: 'rgba(201,168,76,0.5)',
            textTransform: 'uppercase',
          }}
        >
          Partner Application
        </p>
      </div>

      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '80px 60px',
          display: 'grid',
          gridTemplateColumns: '1fr 2fr',
          gap: '80px',
          alignItems: 'start',
        }}
        className="partner-grid"
      >
        {/* LEFT — Hero copy + step tracker */}
        <div style={{ position: 'sticky', top: '40px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              marginBottom: '32px',
            }}
          >
            <div className="gold-line" />
            <p
              style={{
                fontSize: '11px',
                letterSpacing: '0.22em',
                color: 'var(--accent-4)',
                textTransform: 'uppercase',
              }}
            >
              For Providers
            </p>
          </div>

          <h1
            className="font-display"
            style={{
              fontSize: 'clamp(32px, 4vw, 56px)',
              fontWeight: 300,
              color: 'var(--bg-2)',
              lineHeight: 1.1,
              marginBottom: '24px',
            }}
          >
            List your experience on{' '}
            <em style={{ fontStyle: 'italic', color: 'var(--accent-4)' }}>
              Palmera.
            </em>
          </h1>

          <p
            style={{
              fontSize: '15px',
              color: 'rgba(245,240,232,0.5)',
              lineHeight: 1.75,
              marginBottom: '56px',
            }}
          >
            We partner with the finest experience providers across West Africa and
            beyond. Join a curated network of luxury operators trusted by
            high-intent travellers.
          </p>

          {/* What you get */}
          <div style={{ marginBottom: '56px' }}>
            <p
              style={{
                fontSize: '11px',
                letterSpacing: '0.15em',
                color: 'var(--accent-4)',
                textTransform: 'uppercase',
                marginBottom: '20px',
              }}
            >
              What you get
            </p>
            {[
              'Visibility to high-net-worth travellers',
              'Seamless group booking infrastructure',
              'Split payment management built-in',
              'Dedicated partner support',
              'Verified listing & quality badge',
            ].map((item) => (
              <div
                key={item}
                style={{
                  display: 'flex',
                  gap: '14px',
                  alignItems: 'flex-start',
                  marginBottom: '14px',
                }}
              >
                <span style={{ color: 'var(--accent-4)', fontSize: '14px', flexShrink: 0, marginTop: '1px' }}>
                  ✦
                </span>
                <p
                  style={{
                    fontSize: '14px',
                    color: 'rgba(245,240,232,0.6)',
                    lineHeight: 1.55,
                  }}
                >
                  {item}
                </p>
              </div>
            ))}
          </div>

          {/* Step tracker */}
          <div>
            <p
              style={{
                fontSize: '11px',
                letterSpacing: '0.15em',
                color: 'rgba(245,240,232,0.3)',
                textTransform: 'uppercase',
                marginBottom: '20px',
              }}
            >
              Progress
            </p>
            {STEPS.map((s) => (
              <div
                key={s.number}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  marginBottom: '16px',
                  opacity: s.number <= step ? 1 : 0.3,
                  transition: 'opacity 0.3s ease',
                }}
              >
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    border: `1px solid ${s.number === step ? 'var(--accent-4)' : s.number < step ? 'rgba(201,168,76,0.5)' : 'rgba(245,240,232,0.15)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    background: s.number < step ? 'rgba(201,168,76,0.12)' : 'transparent',
                  }}
                >
                  {s.number < step ? (
                    <span style={{ color: 'var(--accent-4)', fontSize: '12px' }}>✓</span>
                  ) : (
                    <span
                      style={{
                        fontSize: '12px',
                        color: s.number === step ? 'var(--accent-4)' : 'rgba(245,240,232,0.4)',
                      }}
                    >
                      {s.number}
                    </span>
                  )}
                </div>
                <span
                  style={{
                    fontSize: '13px',
                    color: s.number === step ? 'var(--bg-2)' : 'rgba(245,240,232,0.4)',
                    letterSpacing: '0.06em',
                  }}
                >
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — Form */}
        <div>
          <div
            style={{
              border: '1px solid rgba(201,168,76,0.15)',
              padding: '56px 52px',
              background: 'rgba(27,58,45,0.15)',
            }}
          >
            {/* Step header */}
            <div style={{ marginBottom: '40px' }}>
              <p
                style={{
                  fontSize: '11px',
                  letterSpacing: '0.2em',
                  color: 'var(--accent-4)',
                  textTransform: 'uppercase',
                  marginBottom: '8px',
                }}
              >
                Step {step} of 4
              </p>
              <h2
                className="font-display"
                style={{
                  fontSize: '32px',
                  fontWeight: 300,
                  color: 'var(--bg-2)',
                  lineHeight: 1.2,
                }}
              >
                {step === 1 && 'Tell us about your business'}
                {step === 2 && 'Describe the experience'}
                {step === 3 && 'Contact information'}
                {step === 4 && 'The partnership'}
              </h2>
            </div>

            {/* Step 1 — Business Identity */}
            {step === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={fieldWrap}>
                  <label style={labelStyle}>Business Name *</label>
                  <input
                    style={inputStyle}
                    value={form.businessName}
                    onChange={(e) => update('businessName', e.target.value)}
                    placeholder="e.g. Horizon Villas Dakar"
                    onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = 'var(--accent-4)' }}
                    onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = 'rgba(201,168,76,0.22)' }}
                  />
                </div>
                <div style={fieldWrap}>
                  <label style={labelStyle}>Website or Social Handle</label>
                  <input
                    style={inputStyle}
                    value={form.website}
                    onChange={(e) => update('website', e.target.value)}
                    placeholder="https:// or @handle"
                    onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = 'var(--accent-4)' }}
                    onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = 'rgba(201,168,76,0.22)' }}
                  />
                </div>
                <div style={fieldWrap}>
                  <label style={labelStyle}>Service Category *</label>
                  <select
                    style={{ ...inputStyle, cursor: 'pointer' }}
                    value={form.serviceCategory}
                    onChange={(e) => update('serviceCategory', e.target.value)}
                    onFocus={(e) => { (e.target as HTMLSelectElement).style.borderColor = 'var(--accent-4)' }}
                    onBlur={(e) => { (e.target as HTMLSelectElement).style.borderColor = 'rgba(201,168,76,0.22)' }}
                  >
                    <option value="" disabled>Select a category</option>
                    {SERVICE_CATEGORIES.map((c) => (
                      <option key={c} value={c} style={{ background: '#0F2219' }}>{c}</option>
                    ))}
                  </select>
                </div>
                <div style={fieldWrap}>
                  <label style={labelStyle}>Primary City *</label>
                  <select
                    style={{ ...inputStyle, cursor: 'pointer' }}
                    value={form.primaryCity}
                    onChange={(e) => update('primaryCity', e.target.value)}
                    onFocus={(e) => { (e.target as HTMLSelectElement).style.borderColor = 'var(--accent-4)' }}
                    onBlur={(e) => { (e.target as HTMLSelectElement).style.borderColor = 'rgba(201,168,76,0.22)' }}
                  >
                    <option value="" disabled>Select your city</option>
                    {CITIES.map((c) => (
                      <option key={c} value={c} style={{ background: '#0F2219' }}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Step 2 — Experience Details */}
            {step === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={fieldWrap}>
                  <label style={labelStyle}>Describe your experience *</label>
                  <textarea
                    style={{
                      ...inputStyle,
                      minHeight: '140px',
                      resize: 'vertical',
                    }}
                    value={form.description}
                    onChange={(e) => update('description', e.target.value)}
                    placeholder="Tell us what makes your experience exceptional — setting, amenities, what guests can expect..."
                    onFocus={(e) => { (e.target as HTMLTextAreaElement).style.borderColor = 'var(--accent-4)' }}
                    onBlur={(e) => { (e.target as HTMLTextAreaElement).style.borderColor = 'rgba(201,168,76,0.22)' }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div style={fieldWrap}>
                    <label style={labelStyle}>Group Capacity</label>
                    <input
                      style={inputStyle}
                      value={form.capacity}
                      onChange={(e) => update('capacity', e.target.value)}
                      placeholder="e.g. 2–20 guests"
                      onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = 'var(--accent-4)' }}
                      onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = 'rgba(201,168,76,0.22)' }}
                    />
                  </div>
                  <div style={fieldWrap}>
                    <label style={labelStyle}>Years Operating</label>
                    <input
                      style={inputStyle}
                      value={form.yearsOperating}
                      onChange={(e) => update('yearsOperating', e.target.value)}
                      placeholder="e.g. 3 years"
                      onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = 'var(--accent-4)' }}
                      onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = 'rgba(201,168,76,0.22)' }}
                    />
                  </div>
                </div>
                <div style={fieldWrap}>
                  <label style={labelStyle}>Typical Price Range (per person or per booking)</label>
                  <select
                    style={{ ...inputStyle, cursor: 'pointer' }}
                    value={form.priceRange}
                    onChange={(e) => update('priceRange', e.target.value)}
                    onFocus={(e) => { (e.target as HTMLSelectElement).style.borderColor = 'var(--accent-4)' }}
                    onBlur={(e) => { (e.target as HTMLSelectElement).style.borderColor = 'rgba(201,168,76,0.22)' }}
                  >
                    <option value="" disabled>Select range</option>
                    <option style={{ background: '#0F2219' }} value="$100–$500">$100–$500</option>
                    <option style={{ background: '#0F2219' }} value="$500–$1,500">$500–$1,500</option>
                    <option style={{ background: '#0F2219' }} value="$1,500–$5,000">$1,500–$5,000</option>
                    <option style={{ background: '#0F2219' }} value="$5,000+">$5,000+</option>
                    <option style={{ background: '#0F2219' }} value="Custom / varies">Custom / varies</option>
                  </select>
                </div>
              </div>
            )}

            {/* Step 3 — Contact */}
            {step === 3 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div style={fieldWrap}>
                    <label style={labelStyle}>Full Name *</label>
                    <input
                      style={inputStyle}
                      value={form.contactName}
                      onChange={(e) => update('contactName', e.target.value)}
                      placeholder="Your full name"
                      onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = 'var(--accent-4)' }}
                      onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = 'rgba(201,168,76,0.22)' }}
                    />
                  </div>
                  <div style={fieldWrap}>
                    <label style={labelStyle}>Role / Title</label>
                    <input
                      style={inputStyle}
                      value={form.contactRole}
                      onChange={(e) => update('contactRole', e.target.value)}
                      placeholder="e.g. Owner, Director"
                      onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = 'var(--accent-4)' }}
                      onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = 'rgba(201,168,76,0.22)' }}
                    />
                  </div>
                </div>
                <div style={fieldWrap}>
                  <label style={labelStyle}>Email Address *</label>
                  <input
                    style={inputStyle}
                    type="email"
                    value={form.contactEmail}
                    onChange={(e) => update('contactEmail', e.target.value)}
                    placeholder="your@email.com"
                    onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = 'var(--accent-4)' }}
                    onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = 'rgba(201,168,76,0.22)' }}
                  />
                </div>
                <div style={fieldWrap}>
                  <label style={labelStyle}>WhatsApp / Phone</label>
                  <input
                    style={inputStyle}
                    type="tel"
                    value={form.contactPhone}
                    onChange={(e) => update('contactPhone', e.target.value)}
                    placeholder="+221 77 000 0000"
                    onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = 'var(--accent-4)' }}
                    onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = 'rgba(201,168,76,0.22)' }}
                  />
                </div>
              </div>
            )}

            {/* Step 4 — Partnership fit */}
            {step === 4 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={fieldWrap}>
                  <label style={labelStyle}>Why do you want to partner with Palmera? *</label>
                  <textarea
                    style={{
                      ...inputStyle,
                      minHeight: '120px',
                      resize: 'vertical',
                    }}
                    value={form.whyPalmera}
                    onChange={(e) => update('whyPalmera', e.target.value)}
                    placeholder="Tell us about your goals and what you're looking for in a booking partner..."
                    onFocus={(e) => { (e.target as HTMLTextAreaElement).style.borderColor = 'var(--accent-4)' }}
                    onBlur={(e) => { (e.target as HTMLTextAreaElement).style.borderColor = 'rgba(201,168,76,0.22)' }}
                  />
                </div>
                <div style={fieldWrap}>
                  <label style={labelStyle}>Any existing booking platforms or partnerships?</label>
                  <input
                    style={inputStyle}
                    value={form.existingPartnerships}
                    onChange={(e) => update('existingPartnerships', e.target.value)}
                    placeholder="e.g. Airbnb, Viator, or none"
                    onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = 'var(--accent-4)' }}
                    onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = 'rgba(201,168,76,0.22)' }}
                  />
                </div>
                <div style={fieldWrap}>
                  <label style={labelStyle}>How did you hear about Palmera?</label>
                  <select
                    style={{ ...inputStyle, cursor: 'pointer' }}
                    value={form.referralSource}
                    onChange={(e) => update('referralSource', e.target.value)}
                    onFocus={(e) => { (e.target as HTMLSelectElement).style.borderColor = 'var(--accent-4)' }}
                    onBlur={(e) => { (e.target as HTMLSelectElement).style.borderColor = 'rgba(201,168,76,0.22)' }}
                  >
                    <option value="" disabled>Select one</option>
                    <option style={{ background: '#0F2219' }} value="Word of mouth">Word of mouth</option>
                    <option style={{ background: '#0F2219' }} value="Instagram">Instagram</option>
                    <option style={{ background: '#0F2219' }} value="LinkedIn">LinkedIn</option>
                    <option style={{ background: '#0F2219' }} value="Referred by a partner">Referred by a partner</option>
                    <option style={{ background: '#0F2219' }} value="Press / article">Press / article</option>
                    <option style={{ background: '#0F2219' }} value="Other">Other</option>
                  </select>
                </div>

                {/* Summary preview */}
                <div
                  style={{
                    padding: '24px 28px',
                    border: '1px solid rgba(201,168,76,0.15)',
                    background: 'rgba(201,168,76,0.04)',
                    marginTop: '8px',
                  }}
                >
                  <p
                    style={{
                      fontSize: '11px',
                      letterSpacing: '0.15em',
                      color: 'var(--accent-4)',
                      textTransform: 'uppercase',
                      marginBottom: '16px',
                    }}
                  >
                    Application Summary
                  </p>
                  {[
                    ['Business', form.businessName],
                    ['Category', form.serviceCategory],
                    ['City', form.primaryCity],
                    ['Contact', form.contactName ? `${form.contactName} · ${form.contactEmail}` : '—'],
                  ].map(([key, val]) => (
                    <div
                      key={key}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '8px 0',
                        borderBottom: '1px solid rgba(245,240,232,0.06)',
                        fontSize: '13px',
                      }}
                    >
                      <span style={{ color: 'rgba(245,240,232,0.4)', letterSpacing: '0.04em' }}>{key}</span>
                      <span style={{ color: 'var(--bg-2)' }}>{val || '—'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Navigation buttons */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '48px',
                paddingTop: '32px',
                borderTop: '1px solid rgba(245,240,232,0.07)',
              }}
            >
              {step > 1 ? (
                <button
                  onClick={back}
                  style={{
                    background: 'none',
                    border: '1px solid rgba(245,240,232,0.2)',
                    color: 'rgba(245,240,232,0.5)',
                    padding: '14px 28px',
                    fontSize: '12px',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    transition: 'border-color 0.2s, color 0.2s',
                    fontFamily: 'var(--font-serif)',
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget
                    el.style.borderColor = 'rgba(245,240,232,0.45)'
                    el.style.color = 'var(--bg-2)'
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget
                    el.style.borderColor = 'rgba(245,240,232,0.2)'
                    el.style.color = 'rgba(245,240,232,0.5)'
                  }}
                >
                  ← Back
                </button>
              ) : (
                <span />
              )}

              {step < 4 ? (
                <button
                  onClick={next}
                  style={{
                    background: 'var(--accent-4)',
                    border: 'none',
                    color: '#040404',
                    padding: '16px 40px',
                    fontSize: '12px',
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'opacity 0.2s ease',
                    fontFamily: 'var(--font-serif)',
                  }}
                  onMouseEnter={(e) => {
                    ;(e.currentTarget as HTMLButtonElement).style.opacity = '0.85'
                  }}
                  onMouseLeave={(e) => {
                    ;(e.currentTarget as HTMLButtonElement).style.opacity = '1'
                  }}
                >
                  Continue →
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  style={{
                    background: 'var(--accent-4)',
                    border: 'none',
                    color: '#040404',
                    padding: '16px 40px',
                    fontSize: '12px',
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'opacity 0.2s ease',
                    fontFamily: 'var(--font-serif)',
                  }}
                  onMouseEnter={(e) => {
                    ;(e.currentTarget as HTMLButtonElement).style.opacity = '0.85'
                  }}
                  onMouseLeave={(e) => {
                    ;(e.currentTarget as HTMLButtonElement).style.opacity = '1'
                  }}
                >
                  Submit Application ✦
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .partner-grid {
            grid-template-columns: 1fr !important;
            padding: 40px 24px !important;
            gap: 40px !important;
          }
        }
      `}</style>
    </div>
  )
}
