'use client'
import { useEffect, useState } from 'react'
import { getEnabledCategories, getEnabledCities } from '@/lib/config'
import type { Company } from '@/lib/schema'

type Opt = { id: string; name: string }

const inp: React.CSSProperties = { width: '100%', background: 'var(--db-bg-input)', border: '1px solid var(--db-border-gold)', borderRadius: '0.375rem', padding: '0.6875rem 0.875rem', color: 'var(--db-text)', fontSize: '0.875rem', fontFamily: 'var(--font-sans)', outline: 'none', boxSizing: 'border-box' }
const lbl: React.CSSProperties = { display: 'block', fontSize: '0.6875rem', color: 'var(--db-text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.375rem', fontFamily: 'var(--font-sans)' }
const row: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 12rem), 1fr))', gap: '1rem', marginBottom: '1rem' }

const EMPTY = {
  name: '', legalName: '', businessType: '', category: '', city: '',
  address: '', mapsLink: '', websiteOrSocial: '', phone: '', whatsapp: '',
}

export type CompanyFormValues = typeof EMPTY

interface CompanyFormProps {
  initial?: Partial<Company>
  saving?: boolean
  submitLabel: string
  onSubmit: (values: CompanyFormValues) => void
}

export default function CompanyForm({ initial, saving, submitLabel, onSubmit }: CompanyFormProps) {
  const [form, setForm] = useState<CompanyFormValues>(() => ({
    ...EMPTY,
    ...(initial ? {
      name: initial.name ?? '', legalName: initial.legalName ?? '', businessType: initial.businessType ?? '',
      category: initial.category ?? '', city: initial.city ?? '', address: initial.address ?? '',
      mapsLink: initial.mapsLink ?? '', websiteOrSocial: initial.websiteOrSocial ?? '',
      phone: initial.phone ?? '', whatsapp: initial.whatsapp ?? '',
    } : {}),
  }))
  const [categories, setCategories] = useState<Opt[]>([])
  const [cities, setCities] = useState<Opt[]>([])
  const set = (f: keyof CompanyFormValues, v: string) => setForm(p => ({ ...p, [f]: v }))

  useEffect(() => {
    getEnabledCategories().then(setCategories)
    getEnabledCities().then(setCities)
  }, [])

  const canSave = !!form.name.trim() && !!form.legalName.trim() && !!form.category && !!form.city && !saving

  return (
    <div>
      <div style={row}>
        <div><label style={lbl}>Business name *</label><input style={inp} placeholder="e.g. Yuma Lodge" value={form.name} onChange={e => set('name', e.target.value)} /></div>
        <div><label style={lbl}>Legal name *</label><input style={inp} placeholder="Registered legal entity" value={form.legalName} onChange={e => set('legalName', e.target.value)} /></div>
      </div>
      <div style={row}>
        <div><label style={lbl}>Business type</label><input style={inp} placeholder="e.g. SARL, sole proprietor" value={form.businessType} onChange={e => set('businessType', e.target.value)} /></div>
        <div>
          <label style={lbl}>Category *</label>
          <select style={{ ...inp, appearance: 'none' }} value={form.category} onChange={e => set('category', e.target.value)}>
            <option value="">Select category</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>
      <div style={row}>
        <div>
          <label style={lbl}>City *</label>
          <select style={{ ...inp, appearance: 'none' }} value={form.city} onChange={e => set('city', e.target.value)}>
            <option value="">Select city</option>
            {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div><label style={lbl}>Address</label><input style={inp} placeholder="Street, neighbourhood" value={form.address} onChange={e => set('address', e.target.value)} /></div>
      </div>
      <div style={row}>
        <div><label style={lbl}>Google Maps link</label><input style={inp} placeholder="https://maps.app.goo.gl/…" value={form.mapsLink} onChange={e => set('mapsLink', e.target.value)} /></div>
        <div><label style={lbl}>Website / social</label><input style={inp} placeholder="Website or Instagram" value={form.websiteOrSocial} onChange={e => set('websiteOrSocial', e.target.value)} /></div>
      </div>
      <div style={row}>
        <div><label style={lbl}>Business phone</label><input style={inp} placeholder="Business contact number" value={form.phone} onChange={e => set('phone', e.target.value)} /></div>
        <div><label style={lbl}>Business WhatsApp</label><input style={inp} placeholder="WhatsApp for bookings" value={form.whatsapp} onChange={e => set('whatsapp', e.target.value)} /></div>
      </div>

      <button onClick={() => canSave && onSubmit(form)} disabled={!canSave}
        style={{ marginTop: '0.75rem', padding: '0.8125rem 2.25rem', background: canSave ? '#9e763b' : 'var(--db-bg-card)', border: `1px solid ${canSave ? 'transparent' : 'var(--db-border-subtle)'}`, borderRadius: '0.375rem', color: canSave ? '#ebe8db' : 'var(--db-text-ghost)', fontSize: '0.875rem', fontFamily: 'var(--font-sans)', letterSpacing: '0.06em', cursor: canSave ? 'pointer' : 'not-allowed' }}>
        {saving ? 'Saving…' : submitLabel}
      </button>
    </div>
  )
}
