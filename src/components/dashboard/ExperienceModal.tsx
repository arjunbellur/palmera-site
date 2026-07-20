'use client'
import { useEffect, useState } from 'react'
import PhotoUpload from './PhotoUpload'
import GalleryUpload from './GalleryUpload'
import { getEnabledCategories, getEnabledCities, getPolicies } from '@/lib/config'
import type { Experience, OptionGroup, Option, CancellationTier, ExperienceMode, PriceUnit, ConfirmationType, ScheduleType } from '@/lib/schema'

type Opt = { id: string; name: string }

const CANCELLATION_TIERS: CancellationTier[] = ['flexible', 'moderate', 'strict']

/** Firestore Timestamp (client or admin SDK) -> separate date/time input strings. */
function toDateTimeInputs(ts: unknown): { date: string; time: string } {
  const d = ts && typeof (ts as { toDate?: () => Date }).toDate === 'function' ? (ts as { toDate: () => Date }).toDate() : ts instanceof Date ? ts : null
  if (!d) return { date: '', time: '' }
  const pad = (n: number) => String(n).padStart(2, '0')
  return { date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, time: `${pad(d.getHours())}:${pad(d.getMinutes())}` }
}
const LANGUAGES = ['French', 'English', 'Wolof', 'Arabic', 'Spanish']
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const inputStyle: React.CSSProperties = { width: '100%', background: 'var(--db-bg-input)', border: '1px solid var(--db-border-subtle)', borderRadius: '0.25rem', padding: '0.625rem 0.75rem', color: 'var(--db-text)', fontSize: '0.875rem', fontFamily: 'var(--font-sans)', outline: 'none', boxSizing: 'border-box' }
const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.6875rem', color: 'var(--db-text-faint)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.375rem', fontFamily: 'var(--font-sans)' }
const rowStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }
const dividerStyle: React.CSSProperties = { borderTop: '1px solid var(--db-border-subtle)', margin: '1.25rem 0' }

export interface ExperienceFormData extends Partial<Experience> {
  optionGroupsDraft?: (OptionGroup & { options: (Option & { _isNew?: boolean })[] })[]
}

interface ExperienceModalProps {
  providerId: string
  companyId: string
  defaultCategory?: string
  defaultCity?: string
  experience?: Experience
  existingOptions?: Option[]
  onSave: (data: Partial<Experience>, optionGroups: (OptionGroup & { options: (Option & { _isNew?: boolean })[] })[]) => Promise<void>
  onClose: () => void
}

const emptyGroup = (): OptionGroup & { options: (Option & { _isNew?: boolean })[] } => ({
  id: `g_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
  name: '', required: false, minSelect: 0, maxSelect: 1, allowQuantity: false, sortOrder: 0, options: [],
})
const emptyOption = (groupId: string): Option & { _isNew?: boolean } => ({
  groupId, name: '', description: '', img: null, gallery: [], price: 0, maxQuantityPerBooking: 1, active: true, sortOrder: 0, _isNew: true,
})

export default function ExperienceModal({ providerId, companyId, defaultCategory, defaultCity, experience, existingOptions, onSave, onClose }: ExperienceModalProps) {
  const [categories, setCategories] = useState<Opt[]>([])
  const [cities, setCities] = useState<Opt[]>([])
  const [tierHours, setTierHours] = useState<Partial<Record<CancellationTier, number>>>({})
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState<Partial<Experience>>(() => ({
    mode: 'paid', priceUnit: 'flat', currency: 'XOF', confirmationType: 'provider_confirmed',
    cancellationPolicy: { tier: 'moderate', customNotes: null, policyVersion: 'v1' },
    scheduleType: 'ongoing', schedule: null, optionGroups: [],
    title: '', location: '', category: defaultCategory || '', city: defaultCity || '',
    lat: null, lng: null, duration: '', minGuests: 1, maxGuests: 1,
    img: '', gallery: [], description: '', includes: [], highlights: [],
    languages: [], excludes: [], dressCode: null,
    ...experience,
  }))
  const [groups, setGroups] = useState<(OptionGroup & { options: (Option & { _isNew?: boolean })[] })[]>(() => {
    if (!experience?.optionGroups?.length) return []
    return experience.optionGroups.map((g) => ({ ...g, options: (existingOptions || []).filter((o) => o.groupId === g.id) }))
  })

  // One-time events need a date AND a time (e.g. "Fight Night" at 8pm on a
  // specific date) — captured separately since <input type="date"> alone
  // drops the time entirely.
  const [eventDateStr, setEventDateStr] = useState(() => toDateTimeInputs(experience?.eventDate).date)
  const [eventTimeStr, setEventTimeStr] = useState(() => toDateTimeInputs(experience?.eventDate).time || '19:00')
  // Scheduled (recurring) experiences need specific time slots, e.g. "9am, 2pm, 5pm".
  const [timeSlotsInput, setTimeSlotsInput] = useState((experience?.schedule?.timeSlots || []).join(', '))

  useEffect(() => {
    getEnabledCategories().then(setCategories)
    getEnabledCities().then(setCities)
    getPolicies().then((p) => {
      if (!p) return
      setTierHours(Object.fromEntries(CANCELLATION_TIERS.map((t) => [t, p.tiers[t]?.cancelDeadlineHours])))
    })
  }, [])

  const set = <K extends keyof Experience>(field: K, value: Experience[K]) => setForm((p) => ({ ...p, [field]: value }))
  const setCancelTier = (tier: CancellationTier) => setForm((p) => ({ ...p, cancellationPolicy: { tier, customNotes: p.cancellationPolicy?.customNotes ?? null, policyVersion: p.cancellationPolicy?.policyVersion || 'v1' } }))
  const setSchedule = (patch: Partial<NonNullable<Experience['schedule']>>) => setForm((p) => ({ ...p, schedule: { ...(p.schedule || {}), ...patch } }))
  const toggleLanguage = (lang: string) => setForm((p) => {
    const langs = p.languages || []
    return { ...p, languages: langs.includes(lang) ? langs.filter((l) => l !== lang) : [...langs, lang] }
  })
  const toggleDay = (day: string) => {
    const days = form.schedule?.days || []
    setSchedule({ days: days.includes(day) ? days.filter((d) => d !== day) : [...days, day] })
  }
  const linesToArray = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean)

  const isPaid = form.mode === 'paid'
  const isScheduled = form.scheduleType === 'scheduled'
  const isOneTime = form.scheduleType === 'one_time'
  const canSave = !!form.title && !!form.category && !!form.city && (!isPaid || !!form.price)

  const addGroup = () => setGroups((g) => [...g, emptyGroup()])
  const removeGroup = (id: string) => setGroups((g) => g.filter((x) => x.id !== id))
  const updateGroup = (id: string, patch: Partial<OptionGroup>) => setGroups((g) => g.map((x) => (x.id === id ? { ...x, ...patch } : x)))
  const addOption = (groupId: string) => setGroups((g) => g.map((x) => (x.id === groupId ? { ...x, options: [...x.options, emptyOption(groupId)] } : x)))
  const removeOption = (groupId: string, idx: number) => setGroups((g) => g.map((x) => (x.id === groupId ? { ...x, options: x.options.filter((_, i) => i !== idx) } : x)))
  const updateOptionAt = (groupId: string, idx: number, patch: Partial<Option>) =>
    setGroups((g) => g.map((x) => (x.id === groupId ? { ...x, options: x.options.map((o, i) => (i === idx ? { ...o, ...patch } : o)) } : x)))

  // What's still missing before this listing can go live in the customer app.
  // Guests need to see it and find it, and know the cancellation terms.
  const publishBlockers = [
    !form.img && 'a photo',
    (form.lat == null || form.lng == null) && 'map location',
    !form.cancellationPolicy?.tier && 'cancellation policy',
  ].filter(Boolean) as string[]
  const canPublish = canSave && publishBlockers.length === 0

  const handleSave = async (publish: boolean) => {
    if (!canSave || (publish && !canPublish)) return
    setSaving(true)
    const optionGroups: OptionGroup[] = groups.map(({ options: _opts, ...g }) => g)
    const eventDate = isOneTime && eventDateStr
      ? (new Date(`${eventDateStr}T${eventTimeStr || '00:00'}`) as unknown as Experience['eventDate'])
      : null
    const schedule = isScheduled
      ? { ...(form.schedule || {}), timeSlots: timeSlotsInput.split(',').map((s) => s.trim()).filter(Boolean) }
      : form.schedule
    // `active` must always mirror `status` — the security rule enforces it too.
    const status: Experience['status'] = publish ? 'published' : (experience?.status === 'published' ? 'published' : 'draft')
    await onSave(
      { ...form, eventDate, schedule, optionGroups, providerId, companyId, status, active: status === 'published' },
      groups,
    )
    setSaving(false)
  }

  const pillBase = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: '9px 0', background: active ? 'rgba(190,154,86,0.15)' : 'transparent', border: 'none',
    color: active ? '#be9a56' : 'var(--db-text-faint)', fontSize: '0.8125rem', fontFamily: 'var(--font-sans)', letterSpacing: '0.04em', cursor: 'pointer',
  })

  const needsReview = experience?.needsReview || []

  return (
    <div data-lenis-prevent style={{ position: 'fixed', inset: 0, background: 'var(--db-overlay)', zIndex: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px' }}>
      <div style={{ background: 'var(--db-bg-modal)', border: '1px solid var(--db-border-subtle)', borderRadius: '0.75rem', width: '100%', maxWidth: '48rem', margin: 'auto', padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--db-text)', fontSize: '1.25rem', fontWeight: 400, margin: 0, letterSpacing: '0.06em' }}>{experience ? 'Edit Experience' : 'New Experience'}</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--db-text-faint)', fontSize: '1.375rem', cursor: 'pointer' }}>×</button>
        </div>

        {needsReview.length > 0 && (
          <div style={{ background: 'rgba(224,112,112,0.08)', border: '1px solid rgba(224,112,112,0.3)', borderRadius: '0.375rem', padding: '0.75rem 1rem', marginBottom: '1.25rem' }}>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: '#e07070', margin: 0 }}>
              Migrated from your old listing — please finish: {needsReview.map((n) => n === 'cancellationTier' ? 'cancellation policy' : n === 'photos' ? 'photos' : n === 'coords' ? 'map location' : n).join(', ')}.
            </p>
          </div>
        )}

        {/* Mode + title */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={labelStyle}>Listing type *</label>
          <div style={{ display: 'flex', borderRadius: '0.375rem', border: '1px solid var(--db-border-subtle)', overflow: 'hidden' }}>
            {(['paid', 'reservation'] as ExperienceMode[]).map((m, i, arr) => (
              <button key={m} onClick={() => set('mode', m)} style={{ ...pillBase(form.mode === m), borderRight: i < arr.length - 1 ? '1px solid var(--db-border-subtle)' : 'none' }}>
                {m === 'paid' ? 'Paid' : 'Reservation'}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={labelStyle}>Title *</label>
          <input style={inputStyle} placeholder='e.g. "Sunset Jetski Tour"' value={form.title} onChange={(e) => set('title', e.target.value)} />
        </div>

        <div style={rowStyle}>
          <div>
            <label style={labelStyle}>Category *</label>
            <select style={{ ...inputStyle, appearance: 'none' }} value={form.category} onChange={(e) => set('category', e.target.value)}>
              <option value="">Select category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>City *</label>
            <select style={{ ...inputStyle, appearance: 'none' }} value={form.city} onChange={(e) => set('city', e.target.value)}>
              <option value="">Select city</option>
              {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        <div style={rowStyle}>
          <div><label style={labelStyle}>Specific location</label><input style={inputStyle} value={form.location} onChange={(e) => set('location', e.target.value)} /></div>
          <div><label style={labelStyle}>Duration</label><input style={inputStyle} placeholder='e.g. "2 hours"' value={form.duration} onChange={(e) => set('duration', e.target.value)} /></div>
        </div>

        <div style={rowStyle}>
          <div>
            <label style={labelStyle}>Map coordinates {!form.lat && <span style={{ color: '#e07070' }}>*required to publish</span>}</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <input style={inputStyle} type="number" step="any" placeholder="Latitude" value={form.lat ?? ''} onChange={(e) => set('lat', e.target.value ? parseFloat(e.target.value) : null)} />
              <input style={inputStyle} type="number" step="any" placeholder="Longitude" value={form.lng ?? ''} onChange={(e) => set('lng', e.target.value ? parseFloat(e.target.value) : null)} />
            </div>
          </div>
          <div style={rowStyle}>
            <div><label style={labelStyle}>Min guests</label><input style={inputStyle} type="number" min="1" value={form.minGuests} onChange={(e) => set('minGuests', parseInt(e.target.value) || 1)} /></div>
            <div><label style={labelStyle}>Max guests</label><input style={inputStyle} type="number" min="1" value={form.maxGuests} onChange={(e) => set('maxGuests', parseInt(e.target.value) || 1)} /></div>
          </div>
        </div>

        <div style={dividerStyle} />

        {isPaid && (
          <div style={rowStyle}>
            <div>
              <label style={labelStyle}>Base price (XOF) *</label>
              <input style={inputStyle} type="number" value={form.price ?? ''} onChange={(e) => set('price', e.target.value ? parseInt(e.target.value) : null)} />
            </div>
            <div>
              <label style={labelStyle}>Price applies</label>
              <div style={{ display: 'flex', borderRadius: '0.25rem', border: '1px solid var(--db-border-subtle)', overflow: 'hidden' }}>
                {(['flat', 'per_person'] as PriceUnit[]).map((u, i, arr) => (
                  <button key={u} onClick={() => set('priceUnit', u)} style={{ ...pillBase(form.priceUnit === u), fontSize: '0.75rem', borderRight: i < arr.length - 1 ? '1px solid var(--db-border-subtle)' : 'none' }}>
                    {u === 'flat' ? 'Flat total' : 'Per person'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <div style={{ marginBottom: '1rem' }}>
          <label style={labelStyle}>Booking confirmation</label>
          <div style={{ display: 'flex', borderRadius: '0.25rem', border: '1px solid var(--db-border-subtle)', overflow: 'hidden' }}>
            {(['instant', 'provider_confirmed'] as ConfirmationType[]).map((c, i, arr) => (
              <button key={c} onClick={() => set('confirmationType', c)} style={{ ...pillBase(form.confirmationType === c), fontSize: '0.75rem', borderRight: i < arr.length - 1 ? '1px solid var(--db-border-subtle)' : 'none' }}>
                {c === 'instant' ? 'Instant' : 'I confirm each booking'}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={labelStyle}>Cancellation policy {!needsReview.includes('cancellationTier') ? '' : <span style={{ color: '#e07070' }}>— please confirm</span>}</label>
          <div style={{ display: 'flex', borderRadius: '0.25rem', border: '1px solid var(--db-border-subtle)', overflow: 'hidden', marginBottom: '0.625rem' }}>
            {CANCELLATION_TIERS.map((t, i, arr) => (
              <button key={t} onClick={() => setCancelTier(t)} style={{ ...pillBase(form.cancellationPolicy?.tier === t), fontSize: '0.75rem', textTransform: 'capitalize', borderRight: i < arr.length - 1 ? '1px solid var(--db-border-subtle)' : 'none' }}>
                {t}{tierHours[t] != null ? ` (${tierHours[t]}h)` : ''}
              </button>
            ))}
          </div>
          <input style={inputStyle} placeholder="Custom notes (optional)" value={form.cancellationPolicy?.customNotes || ''}
            onChange={(e) => setForm((p) => ({ ...p, cancellationPolicy: { tier: p.cancellationPolicy?.tier || 'moderate', customNotes: e.target.value || null, policyVersion: p.cancellationPolicy?.policyVersion || 'v1' } }))} />
        </div>

        <div style={dividerStyle} />

        <div style={{ marginBottom: '1rem' }}>
          <label style={labelStyle}>Availability</label>
          <div style={{ display: 'flex', borderRadius: '0.25rem', border: '1px solid var(--db-border-subtle)', overflow: 'hidden' }}>
            {(['ongoing', 'scheduled', 'one_time'] as ScheduleType[]).map((a, i, arr) => (
              <button key={a} onClick={() => set('scheduleType', a)} style={{ ...pillBase(form.scheduleType === a), fontSize: '0.75rem', borderRight: i < arr.length - 1 ? '1px solid var(--db-border-subtle)' : 'none' }}>
                {a === 'ongoing' ? 'Always' : a === 'scheduled' ? 'Scheduled' : 'One-time'}
              </button>
            ))}
          </div>
        </div>

        {isScheduled && (
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Days available</label>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
              {DAYS.map((d) => (
                <button key={d} onClick={() => toggleDay(d)} style={{ padding: '5px 10px', borderRadius: '0.25rem', border: `1px solid ${form.schedule?.days?.includes(d) ? '#be9a56' : 'var(--db-border-subtle)'}`, background: form.schedule?.days?.includes(d) ? 'rgba(190,154,86,0.15)' : 'transparent', color: form.schedule?.days?.includes(d) ? '#be9a56' : 'var(--db-text-faint)', fontSize: '0.75rem', fontFamily: 'var(--font-sans)', cursor: 'pointer' }}>{d}</button>
              ))}
            </div>
            <label style={labelStyle}>Time slots</label>
            <input style={inputStyle} placeholder='e.g. "9am, 2pm, 5pm"' value={timeSlotsInput} onChange={(e) => setTimeSlotsInput(e.target.value)} />
          </div>
        )}
        {isOneTime && (
          <div style={rowStyle}>
            <div>
              <label style={labelStyle}>Event date</label>
              <input type="date" style={inputStyle} value={eventDateStr} onChange={(e) => setEventDateStr(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Event time</label>
              <input type="time" style={inputStyle} value={eventTimeStr} onChange={(e) => setEventTimeStr(e.target.value)} />
            </div>
          </div>
        )}

        <div style={dividerStyle} />

        {/* Photos */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={labelStyle}>Hero photo {!form.img && <span style={{ color: '#e07070' }}>*required to publish</span>}</label>
          <PhotoUpload uid={providerId} label="Hero photo" fieldName={`experience_${experience?.id || 'new'}_hero`} existingUrl={form.img} onUploaded={(url) => set('img', url)} />
        </div>
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={labelStyle}>Gallery</label>
          <GalleryUpload uid={providerId} value={form.gallery || []} onChange={(urls) => set('gallery', urls)} />
        </div>

        <div style={dividerStyle} />

        {/* Content */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={labelStyle}>Description</label>
          <textarea style={{ ...inputStyle, height: '90px', resize: 'vertical' }} value={form.description} onChange={(e) => set('description', e.target.value)} />
        </div>
        <div style={rowStyle}>
          <div><label style={labelStyle}>What&apos;s included (one per line)</label><textarea style={{ ...inputStyle, height: '80px', resize: 'vertical' }} value={(form.includes || []).join('\n')} onChange={(e) => set('includes', linesToArray(e.target.value))} /></div>
          <div><label style={labelStyle}>What&apos;s excluded (one per line)</label><textarea style={{ ...inputStyle, height: '80px', resize: 'vertical' }} value={(form.excludes || []).join('\n')} onChange={(e) => set('excludes', linesToArray(e.target.value))} /></div>
        </div>
        <div style={rowStyle}>
          <div><label style={labelStyle}>Highlights (one per line)</label><textarea style={{ ...inputStyle, height: '70px', resize: 'vertical' }} value={(form.highlights || []).join('\n')} onChange={(e) => set('highlights', linesToArray(e.target.value))} /></div>
          <div><label style={labelStyle}>Dress code</label><input style={inputStyle} value={form.dressCode || ''} onChange={(e) => set('dressCode', e.target.value || null)} /></div>
        </div>
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={labelStyle}>Languages spoken</label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {LANGUAGES.map((lang) => (
              <button key={lang} onClick={() => toggleLanguage(lang)} style={{ padding: '6px 14px', borderRadius: '0.25rem', border: `1px solid ${form.languages?.includes(lang) ? 'var(--accent-4)' : 'var(--db-border-subtle)'}`, background: form.languages?.includes(lang) ? 'rgba(190,154,86,0.15)' : 'transparent', color: form.languages?.includes(lang) ? 'var(--accent-4)' : 'var(--db-text-faint)', fontSize: '0.8125rem', fontFamily: 'var(--font-sans)', cursor: 'pointer' }}>{lang}</button>
            ))}
          </div>
        </div>

        <div style={dividerStyle} />

        {/* Option groups */}
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>Option groups</label>
            <button onClick={addGroup} style={{ background: 'transparent', border: '1px solid var(--db-border-gold)', borderRadius: '0.25rem', color: '#be9a56', fontSize: '0.75rem', fontFamily: 'var(--font-sans)', padding: '0.3125rem 0.75rem', cursor: 'pointer' }}>+ Add group</button>
          </div>
          {groups.length === 0 && <p style={{ fontSize: '0.75rem', color: 'var(--db-text-ghost)', fontStyle: 'italic', fontFamily: 'var(--font-sans)' }}>No options — this is a simple experience with just the base price.</p>}
          {groups.map((g) => (
            <div key={g.id} style={{ background: 'var(--db-bg-card)', border: '1px solid var(--db-border-subtle)', borderRadius: '0.5rem', padding: '1rem', marginBottom: '0.875rem' }}>
              <div style={{ display: 'flex', gap: '0.625rem', marginBottom: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '10rem' }}>
                  <label style={labelStyle}>Group name</label>
                  <input style={inputStyle} placeholder='e.g. "Room type"' value={g.name} onChange={(e) => updateGroup(g.id, { name: e.target.value })} />
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: 'var(--db-text-muted)', fontFamily: 'var(--font-sans)', paddingBottom: '0.6875rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={g.required} onChange={(e) => updateGroup(g.id, { required: e.target.checked, minSelect: e.target.checked ? 1 : 0 })} style={{ accentColor: '#be9a56' }} /> Required
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: 'var(--db-text-muted)', fontFamily: 'var(--font-sans)', paddingBottom: '0.6875rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={g.allowQuantity} onChange={(e) => updateGroup(g.id, { allowQuantity: e.target.checked })} style={{ accentColor: '#be9a56' }} /> Allow quantity
                </label>
                <button onClick={() => removeGroup(g.id)} style={{ background: 'transparent', border: '1px solid rgba(224,112,112,0.35)', color: '#e07070', borderRadius: '0.25rem', padding: '0.375rem 0.625rem', fontSize: '0.6875rem', fontFamily: 'var(--font-sans)', cursor: 'pointer' }}>Remove group</button>
              </div>

              {g.options.map((o, i) => {
                const optKey = o.id || `${g.id}_opt${i}`
                return (
                <div key={i} style={{ border: '1px solid var(--db-border-subtle)', borderRadius: '0.375rem', padding: '0.625rem', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '0.5rem', alignItems: 'center' }}>
                    <input style={inputStyle} placeholder="Option name" value={o.name} onChange={(e) => updateOptionAt(g.id, i, { name: e.target.value })} />
                    <input style={inputStyle} type="number" placeholder="Price (XOF)" value={o.price} onChange={(e) => updateOptionAt(g.id, i, { price: parseInt(e.target.value) || 0 })} />
                    <input style={inputStyle} type="number" min="1" placeholder="Max qty" value={o.maxQuantityPerBooking} onChange={(e) => updateOptionAt(g.id, i, { maxQuantityPerBooking: parseInt(e.target.value) || 1 })} />
                    <button onClick={() => removeOption(g.id, i)} style={{ background: 'transparent', border: 'none', color: '#e07070', fontSize: '1rem', cursor: 'pointer', padding: '0 0.5rem' }}>×</button>
                  </div>
                  <input style={{ ...inputStyle, marginTop: '0.5rem' }} placeholder="Short description (optional)" value={o.description || ''} onChange={(e) => updateOptionAt(g.id, i, { description: e.target.value })} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.5rem' }}>
                    <div>
                      <label style={{ ...labelStyle, fontSize: '0.6875rem' }}>Option photo</label>
                      <PhotoUpload uid={providerId} label="Option photo" fieldName={`option_${optKey}_hero`} existingUrl={o.img || ''} onUploaded={(url) => updateOptionAt(g.id, i, { img: url })} />
                    </div>
                    <div>
                      <label style={{ ...labelStyle, fontSize: '0.6875rem' }}>More photos</label>
                      <GalleryUpload uid={providerId} value={o.gallery || []} onChange={(urls) => updateOptionAt(g.id, i, { gallery: urls })} />
                    </div>
                  </div>
                </div>
              )})}
              <button onClick={() => addOption(g.id)} style={{ background: 'transparent', border: 'none', color: '#be9a56', fontSize: '0.75rem', fontFamily: 'var(--font-sans)', textDecoration: 'underline', cursor: 'pointer', padding: 0, marginTop: '0.25rem' }}>+ Add option</button>
            </div>
          ))}
        </div>

        {/* Publishing is the partner's own call — draft keeps it private, publish
            puts it in the Palmera app. We say exactly what's missing rather than
            just greying the button out. */}
        {!canPublish && canSave && (
          <p style={{ fontSize: '0.75rem', color: 'var(--db-text-faint)', fontFamily: 'var(--font-sans)', margin: '0 0 0.75rem', textAlign: 'right' }}>
            To publish, add: {publishBlockers.join(', ')}
          </p>
        )}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button onClick={onClose} style={{ padding: '10px 24px', background: 'transparent', border: '1px solid var(--db-border-subtle)', borderRadius: '0.25rem', color: 'var(--db-text-muted)', fontSize: '0.875rem', fontFamily: 'var(--font-sans)', cursor: 'pointer' }}>Cancel</button>
          <button onClick={() => handleSave(false)} disabled={!canSave || saving} style={{ padding: '10px 24px', background: 'transparent', border: '1px solid var(--db-border-gold)', borderRadius: '0.25rem', color: canSave ? 'var(--db-text)' : 'var(--db-text-ghost)', fontSize: '0.875rem', fontFamily: 'var(--font-sans)', cursor: canSave ? 'pointer' : 'not-allowed' }}>
            {saving ? 'Saving…' : 'Save as draft'}
          </button>
          <button onClick={() => handleSave(true)} disabled={!canPublish || saving} title={canPublish ? '' : publishBlockers.join(', ')} style={{ padding: '10px 24px', background: canPublish ? '#9e763b' : 'var(--db-bg-card)', border: 'none', borderRadius: '0.25rem', color: canPublish ? '#ebe8db' : 'var(--db-text-ghost)', fontSize: '0.875rem', fontFamily: 'var(--font-sans)', cursor: canPublish ? 'pointer' : 'not-allowed' }}>
            {saving ? 'Saving…' : experience?.status === 'published' ? 'Save & keep live' : 'Publish'}
          </button>
        </div>
      </div>
    </div>
  )
}
