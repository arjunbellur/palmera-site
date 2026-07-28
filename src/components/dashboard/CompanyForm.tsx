'use client'
import { useEffect, useState } from 'react'
import { getEnabledCategories, getEnabledCities } from '@/lib/config'
import { useLocale } from '@/lib/use-locale'
import type { Company } from '@/lib/schema'

const STR = {
  fr: {
    name: 'Nom commercial *', namePh: 'ex. Yuma Lodge',
    legal: 'Raison sociale *', legalPh: 'Entité juridique enregistrée',
    type: 'Forme juridique', typePh: 'ex. SARL, entreprise individuelle',
    category: 'Catégorie *', city: 'Ville *', select: 'Sélectionner',
    address: 'Adresse', addressPh: 'Rue, quartier',
    maps: 'Lien Google Maps', web: 'Site web / réseaux', webPh: 'Site web ou Instagram',
    phone: 'Téléphone de l’établissement', phonePh: 'Numéro de contact',
    whatsapp: 'WhatsApp de l’établissement', whatsappPh: 'WhatsApp pour les réservations',
    saving: 'Enregistrement…',
  },
  en: {
    name: 'Business name *', namePh: 'e.g. Yuma Lodge',
    legal: 'Legal name *', legalPh: 'Registered legal entity',
    type: 'Business type', typePh: 'e.g. SARL, sole proprietor',
    category: 'Category *', city: 'City *', select: 'Select',
    address: 'Address', addressPh: 'Street, neighbourhood',
    maps: 'Google Maps link', web: 'Website / social', webPh: 'Website or Instagram',
    phone: 'Business phone', phonePh: 'Business contact number',
    whatsapp: 'Business WhatsApp', whatsappPh: 'WhatsApp for bookings',
    saving: 'Saving…',
  },
}

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
  const s = STR[useLocale()]
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
        <div><label style={lbl}>{s.name}</label><input style={inp} placeholder={s.namePh} value={form.name} onChange={e => set('name', e.target.value)} /></div>
        <div><label style={lbl}>{s.legal}</label><input style={inp} placeholder={s.legalPh} value={form.legalName} onChange={e => set('legalName', e.target.value)} /></div>
      </div>
      <div style={row}>
        <div><label style={lbl}>{s.type}</label><input style={inp} placeholder={s.typePh} value={form.businessType} onChange={e => set('businessType', e.target.value)} /></div>
        <div>
          <label style={lbl}>{s.category}</label>
          <select style={{ ...inp, appearance: 'none' }} value={form.category} onChange={e => set('category', e.target.value)}>
            <option value="">{s.select}</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>
      <div style={row}>
        <div>
          <label style={lbl}>{s.city}</label>
          <select style={{ ...inp, appearance: 'none' }} value={form.city} onChange={e => set('city', e.target.value)}>
            <option value="">{s.select}</option>
            {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div><label style={lbl}>{s.address}</label><input style={inp} placeholder={s.addressPh} value={form.address} onChange={e => set('address', e.target.value)} /></div>
      </div>
      <div style={row}>
        <div><label style={lbl}>{s.maps}</label><input style={inp} placeholder="https://maps.app.goo.gl/…" value={form.mapsLink} onChange={e => set('mapsLink', e.target.value)} /></div>
        <div><label style={lbl}>{s.web}</label><input style={inp} placeholder={s.webPh} value={form.websiteOrSocial} onChange={e => set('websiteOrSocial', e.target.value)} /></div>
      </div>
      <div style={row}>
        <div><label style={lbl}>{s.phone}</label><input style={inp} placeholder={s.phonePh} value={form.phone} onChange={e => set('phone', e.target.value)} /></div>
        <div><label style={lbl}>{s.whatsapp}</label><input style={inp} placeholder={s.whatsappPh} value={form.whatsapp} onChange={e => set('whatsapp', e.target.value)} /></div>
      </div>

      <button onClick={() => canSave && onSubmit(form)} disabled={!canSave}
        style={{ marginTop: '0.75rem', padding: '0.8125rem 2.25rem', background: canSave ? '#9e763b' : 'var(--db-bg-card)', border: `1px solid ${canSave ? 'transparent' : 'var(--db-border-subtle)'}`, borderRadius: '0.375rem', color: canSave ? '#ebe8db' : 'var(--db-text-ghost)', fontSize: '0.875rem', fontFamily: 'var(--font-sans)', letterSpacing: '0.06em', cursor: canSave ? 'pointer' : 'not-allowed' }}>
        {saving ? s.saving : submitLabel}
      </button>
    </div>
  )
}
