'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthChange } from '@/lib/auth'
import {
  getCompany, updateCompany, getExperiencesByCompany, addExperience, updateExperience, deleteExperience,
  getOptions, addOption, deleteOption,
} from '@/lib/firestore'
import CompanyForm, { type CompanyFormValues } from '@/components/dashboard/CompanyForm'
import ExperienceModal from '@/components/dashboard/ExperienceModal'
import ConfirmDialog from '@/components/dashboard/ConfirmDialog'
import PhotoUpload from '@/components/dashboard/PhotoUpload'
import GalleryUpload from '@/components/dashboard/GalleryUpload'
import type { Company, Experience, Option, OptionGroup } from '@/lib/schema'

// Company-scoped sections. No Documents tab: KYC/compliance documents are
// deliberately NOT stored live (archive-only) — see docs + migration script.
const TABS = ['Profile', 'Experiences', 'Photos', 'Operations'] as const
type Tab = typeof TABS[number]

// Shape carried over wholesale from the legacy operations{} map.
interface OpsForm extends Record<string, unknown> {
  opsContactName: string
  opsContactWhatsapp: string
  notificationPreference: string
  confirmationSpeed: string
}
const EMPTY_OPS: OpsForm = { opsContactName: '', opsContactWhatsapp: '', notificationPreference: '', confirmationSpeed: '' }
const NOTIFICATION_PREFS = ['WhatsApp message', 'SMS', 'Email', 'Phone call']
const CONFIRMATION_SPEEDS = ['Real-time', 'Within 1 hour', 'Same day', 'Within 24 hours']

const photoLabel: React.CSSProperties = { display: 'block', fontSize: '0.6875rem', color: 'var(--db-text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.5rem', fontFamily: 'var(--font-sans)' }
const opsLabel = photoLabel
const opsInput: React.CSSProperties = { width: '100%', background: 'var(--db-bg-input)', border: '1px solid var(--db-border-gold)', borderRadius: '0.375rem', padding: '0.6875rem 0.875rem', color: 'var(--db-text)', fontSize: '0.875rem', fontFamily: 'var(--font-sans)', outline: 'none', boxSizing: 'border-box' }

export default function CompanyPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = use(params)
  const router = useRouter()
  const [uid, setUid] = useState('')
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [tab, setTab] = useState<Tab>('Profile')

  const [experiences, setExperiences] = useState<Experience[]>([])
  const [loadingExp, setLoadingExp] = useState(true)
  const [showExpModal, setShowExpModal] = useState(false)
  const [editingExp, setEditingExp] = useState<Experience | undefined>()
  const [editingOptions, setEditingOptions] = useState<Option[]>([])
  const [toDeleteExp, setToDeleteExp] = useState<Experience | null>(null)
  const [deletingExp, setDeletingExp] = useState(false)

  const [ops, setOps] = useState<OpsForm>(EMPTY_OPS)
  const [savingOps, setSavingOps] = useState(false)
  const [savedOps, setSavedOps] = useState(false)

  const loadExperiences = async (providerId: string) => {
    setLoadingExp(true)
    setExperiences(await getExperiencesByCompany(providerId, companyId))
    setLoadingExp(false)
  }

  useEffect(() => {
    const unsub = onAuthChange(async user => {
      if (!user) { router.replace('/dashboard'); return }
      setUid(user.uid)
      const c = await getCompany(companyId)
      // Ownership guard — a company you don't own isn't yours to view here.
      if (!c || c.providerId !== user.uid) { router.replace('/dashboard/home'); return }
      setCompany(c)
      setOps({ ...EMPTY_OPS, ...((c.operations as Partial<OpsForm>) || {}) })
      setLoading(false)
      await loadExperiences(user.uid)
    })
    return () => unsub()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, companyId])

  const openNewExperience = () => { setEditingExp(undefined); setEditingOptions([]); setShowExpModal(true) }
  const openEditExperience = async (e: Experience) => {
    setEditingExp(e)
    setEditingOptions(await getOptions(e.id!))
    setShowExpModal(true)
  }

  const handleSaveExperience = async (data: Partial<Experience>, groups: (OptionGroup & { options: Option[] })[]) => {
    // Finalize per the schema before writing:
    //  - invariant #2: price>0 iff paid, null iff reservation.
    //  - currency required if paid OR any option is paid (else null).
    //  - guests derived "min–max"; provider = company.name (app display; no CF yet).
    //  - needsReview recomputed so fixing photos/coords in the editor clears the flag.
    const paidOption = groups.some((g) => g.options.some((o) => (o.price || 0) > 0))
    const isPaid = data.mode === 'paid'
    const needsReview = [
      ...(!data.img ? ['photos'] : []),
      ...(data.lat == null || data.lng == null ? ['coords'] : []),
    ]
    const finalData: Partial<Experience> = {
      ...data,
      price: isPaid ? (data.price ?? null) : null,
      currency: isPaid || paidOption ? 'XOF' : null,
      guests: data.minGuests != null && data.maxGuests != null ? `${data.minGuests}–${data.maxGuests}` : '',
      provider: company?.name || '',
      needsReview,
    }
    let id = editingExp?.id
    if (id) await updateExperience(id, finalData)
    else { const ref = await addExperience(finalData); id = ref.id }

    // Options: simplest-correct approach — clear and recreate from the current
    // form state each save. Fine at this scale; revisit with real diffing if
    // option counts grow large enough for this to matter.
    const existing = await getOptions(id)
    await Promise.all(existing.map((o) => deleteOption(id!, o.id!)))
    for (const g of groups) {
      for (const o of g.options) {
        const { id: _oid, ...rest } = o as Option & { _isNew?: boolean }
        delete (rest as { _isNew?: boolean })._isNew
        await addOption(id, rest)
      }
    }
    await loadExperiences(uid)
    setShowExpModal(false); setEditingExp(undefined)
  }

  const handleDeleteExperience = async () => {
    if (!toDeleteExp?.id) return
    setDeletingExp(true)
    await deleteExperience(toDeleteExp.id)
    setToDeleteExp(null); setDeletingExp(false)
    await loadExperiences(uid)
  }

  const handleSubmit = async (values: CompanyFormValues) => {
    setSaving(true)
    await updateCompany(companyId, { ...values, completeness: { ...(company?.completeness || {}), profile: true } })
    setCompany(c => (c ? { ...c, ...values } : c))
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2500)
  }

  // Photos auto-persist on upload (same pattern as the legacy photos page), so a
  // partner never loses an upload by navigating away without hitting save.
  const persistPhotos = async (patch: Partial<Pick<Company, 'heroPhoto' | 'logo' | 'gallery'>>) => {
    const next = { ...company, ...patch } as Company
    setCompany(next)
    const done = !!(next.heroPhoto && next.logo)
    await updateCompany(companyId, { ...patch, completeness: { ...(company?.completeness || {}), photos: done } })
  }

  const handleSaveOps = async () => {
    setSavingOps(true)
    const done = !!(ops.opsContactName && ops.opsContactWhatsapp)
    await updateCompany(companyId, { operations: ops, completeness: { ...(company?.completeness || {}), operations: done } })
    setCompany(c => (c ? { ...c, operations: ops } : c))
    setSavingOps(false); setSavedOps(true); setTimeout(() => setSavedOps(false), 2500)
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh' }}>
      <div style={{ width: '1.75rem', height: '1.75rem', border: '2px solid rgba(190,154,86,0.15)', borderTopColor: '#be9a56', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
  if (!company) return null

  return (
    <div>
      <a href="/dashboard/home" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', textDecoration: 'none', color: 'var(--db-text-faint)', fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '1.5rem' }}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M7.5 2L3.5 6L7.5 10" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" /></svg>
        Overview
      </a>
      <div style={{ marginBottom: '1.75rem' }}>
        <p style={{ fontFamily: 'var(--font-sans)', color: 'rgba(190,154,86,0.8)', fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 0.375rem' }}>Company</p>
        <h1 style={{ fontFamily: 'var(--font-display)', color: 'var(--db-text)', fontSize: 'clamp(1.25rem, 3vw, 1.5rem)', fontWeight: 400, letterSpacing: '0.06em', margin: 0 }}>{company.name || 'Untitled company'}</h1>
      </div>

      <div style={{ display: 'flex', overflowX: 'auto', borderBottom: '1px solid var(--db-border-subtle)', marginBottom: '1.75rem', scrollbarWidth: 'none' }}>
        {TABS.map(tb => (
          <button key={tb} onClick={() => setTab(tb)}
            style={{ flexShrink: 0, padding: '0.625rem 1.25rem', background: 'transparent', border: 'none', borderBottom: tab === tb ? '2px solid #be9a56' : '2px solid transparent', color: tab === tb ? '#be9a56' : 'var(--db-text-muted)', fontSize: '0.8125rem', fontFamily: 'var(--font-sans)', letterSpacing: '0.04em', cursor: 'pointer', marginBottom: '-1px' }}>
            {tb}
          </button>
        ))}
      </div>

      {tab === 'Profile' && (
        <>
          <CompanyForm initial={company} submitLabel="Save changes" saving={saving} onSubmit={handleSubmit} />
          {saved && <p style={{ fontSize: '0.8125rem', color: '#be9a56', fontFamily: 'var(--font-sans)', marginTop: '0.75rem' }}>✓ Saved</p>}
        </>
      )}

      {tab === 'Experiences' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.25rem' }}>
            <button onClick={openNewExperience} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.625rem 1.25rem', background: '#9e763b', border: 'none', borderRadius: '6px', color: '#ebe8db', fontSize: '0.8125rem', fontFamily: 'var(--font-sans)', letterSpacing: '0.06em', cursor: 'pointer' }}>
              + Add experience
            </button>
          </div>
          {loadingExp ? null : experiences.length === 0 ? (
            <div style={{ background: 'var(--db-bg-card)', border: '1px dashed var(--db-border-dashed)', borderRadius: '0.625rem', padding: '3rem 2rem', textAlign: 'center' }}>
              <p style={{ fontFamily: 'var(--font-serif)', color: 'var(--db-text-faint)', fontSize: '1.0625rem', margin: '0 0 0.5rem' }}>No experiences yet</p>
              <p style={{ fontFamily: 'var(--font-sans)', color: 'var(--db-text-ghost)', fontSize: '0.8125rem', margin: '0 0 1.5rem' }}>Add the experiences this company offers.</p>
              <button onClick={openNewExperience} style={{ padding: '10px 24px', background: 'transparent', border: '1px solid var(--db-border-subtle)', borderRadius: '6px', color: 'var(--db-text)', fontSize: '0.8125rem', fontFamily: 'var(--font-sans)', cursor: 'pointer' }}>+ Add your first experience</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 18rem), 1fr))', gap: '1rem' }}>
              {experiences.map((e) => (
                <div key={e.id} style={{ background: 'var(--db-bg-card)', border: '1px solid var(--db-border-subtle)', borderRadius: '0.5rem', padding: '1.25rem 1.375rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.625rem' }}>
                    <h3 style={{ fontFamily: 'var(--font-serif)', color: 'var(--db-text)', fontSize: '0.9375rem', fontWeight: 500, margin: 0 }}>{e.title || 'Untitled'}</h3>
                    <span style={{ flexShrink: 0, fontSize: '0.625rem', fontFamily: 'var(--font-sans)', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: '2px', border: '1px solid var(--db-border-subtle)', color: 'var(--db-text-muted)' }}>{e.status}</span>
                  </div>
                  {(e.needsReview?.length ?? 0) > 0 && (
                    <p style={{ fontSize: '0.6875rem', color: '#e07070', fontFamily: 'var(--font-sans)', margin: '0 0 0.625rem' }}>Needs: {e.needsReview!.join(', ')}</p>
                  )}
                  <p style={{ fontSize: '0.75rem', color: 'var(--db-text-faint)', fontFamily: 'var(--font-sans)', margin: '0 0 1rem', textTransform: 'capitalize' }}>
                    {[e.category, e.city].filter(Boolean).join(' · ') || '—'}{e.price != null ? ` · ${e.price.toLocaleString()} XOF` : ''}
                  </p>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => openEditExperience(e)} style={{ background: 'transparent', border: '1px solid var(--db-border-subtle)', borderRadius: '4px', color: 'var(--db-text-faint)', fontSize: '0.6875rem', fontFamily: 'var(--font-sans)', padding: '4px 10px', cursor: 'pointer' }}>Edit</button>
                    <button onClick={() => setToDeleteExp(e)} style={{ background: 'transparent', border: '1px solid rgba(224,112,112,0.2)', borderRadius: '4px', color: 'rgba(224,112,112,0.7)', fontSize: '0.6875rem', fontFamily: 'var(--font-sans)', padding: '4px 10px', cursor: 'pointer' }}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'Photos' && (
        <div>
          <p style={{ fontFamily: 'var(--font-serif)', color: 'var(--db-text-muted)', fontSize: '0.875rem', margin: '0 0 1.5rem' }}>
            How this company appears on Palmera. Uploads save automatically.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 16rem), 1fr))', gap: '1.25rem', marginBottom: '1.75rem' }}>
            <div>
              <label style={photoLabel}>Hero photo {!company.heroPhoto && <span style={{ color: '#be9a56' }}>*</span>}</label>
              <PhotoUpload uid={uid} label="Hero photo" fieldName={`company_${companyId}_hero`} existingUrl={company.heroPhoto || ''}
                hint="Landscape 16:9, min 1600×900px, no watermarks"
                onUploaded={(url) => persistPhotos({ heroPhoto: url })} />
            </div>
            <div>
              <label style={photoLabel}>Company logo {!company.logo && <span style={{ color: '#be9a56' }}>*</span>}</label>
              <PhotoUpload uid={uid} label="Company logo" fieldName={`company_${companyId}_logo`} existingUrl={company.logo || ''}
                hint="Square, transparent PNG preferred"
                onUploaded={(url) => persistPhotos({ logo: url })} />
            </div>
          </div>
          <label style={photoLabel}>Gallery</label>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', color: 'var(--db-text-ghost)', margin: '0 0 0.625rem' }}>
            Photos of the venue or business overall. Photos of a specific experience belong on that experience.
          </p>
          <GalleryUpload uid={uid} value={company.gallery || []} onChange={(urls) => persistPhotos({ gallery: urls })} />
        </div>
      )}

      {tab === 'Operations' && (
        <div>
          <p style={{ fontFamily: 'var(--font-serif)', color: 'var(--db-text-muted)', fontSize: '0.875rem', margin: '0 0 1.5rem' }}>
            How bookings reach you once a guest reserves. Give us the person who actually runs day-to-day operations.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 14rem), 1fr))', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={opsLabel}>Operations contact name *</label>
              <input style={opsInput} placeholder="Person who runs day-to-day operations" value={ops.opsContactName}
                onChange={(e) => setOps(p => ({ ...p, opsContactName: e.target.value }))} />
            </div>
            <div>
              <label style={opsLabel}>Operations contact WhatsApp *</label>
              <input style={opsInput} placeholder="Direct WhatsApp number" value={ops.opsContactWhatsapp}
                onChange={(e) => setOps(p => ({ ...p, opsContactWhatsapp: e.target.value }))} />
            </div>
            <div>
              <label style={opsLabel}>Notification preference</label>
              <select style={{ ...opsInput, appearance: 'none' }} value={ops.notificationPreference}
                onChange={(e) => setOps(p => ({ ...p, notificationPreference: e.target.value }))}>
                <option value="">How should we notify you?</option>
                {NOTIFICATION_PREFS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label style={opsLabel}>Confirmation speed</label>
              <select style={{ ...opsInput, appearance: 'none' }} value={ops.confirmationSpeed}
                onChange={(e) => setOps(p => ({ ...p, confirmationSpeed: e.target.value }))}>
                <option value="">How quickly do you confirm?</option>
                {CONFIRMATION_SPEEDS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
            <button onClick={handleSaveOps} disabled={savingOps}
              style={{ padding: '0.625rem 1.5rem', background: '#9e763b', border: 'none', borderRadius: '0.375rem', color: '#ebe8db', fontSize: '0.8125rem', fontFamily: 'var(--font-sans)', letterSpacing: '0.06em', cursor: savingOps ? 'default' : 'pointer', opacity: savingOps ? 0.6 : 1 }}>
              {savingOps ? 'Saving…' : 'Save changes'}
            </button>
            {savedOps && <span style={{ fontSize: '0.8125rem', color: '#be9a56', fontFamily: 'var(--font-sans)' }}>✓ Saved</span>}
          </div>
        </div>
      )}

      {showExpModal && (
        <ExperienceModal
          providerId={uid}
          companyId={companyId}
          defaultCategory={company.category}
          defaultCity={company.city}
          experience={editingExp}
          existingOptions={editingOptions}
          onSave={handleSaveExperience}
          onClose={() => { setShowExpModal(false); setEditingExp(undefined) }}
        />
      )}

      {toDeleteExp && (
        <ConfirmDialog
          title="Delete this experience?"
          note="Removes the experience and its options. This cannot be undone."
          confirmLabel="Delete permanently"
          busyLabel="Deleting…"
          busy={deletingExp}
          onConfirm={handleDeleteExperience}
          onCancel={() => setToDeleteExp(null)}
        >
          You&apos;re about to permanently delete <strong style={{ color: 'var(--db-text)' }}>{toDeleteExp.title || 'this experience'}</strong>.
        </ConfirmDialog>
      )}
    </div>
  )
}
