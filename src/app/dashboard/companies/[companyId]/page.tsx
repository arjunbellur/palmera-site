'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthChange } from '@/lib/auth'
import {
  getCompany, updateCompany, getExperiencesByCompany, deleteExperience,
  getOptions, getProvider, updateProvider, saveExperienceWithOptions,
} from '@/lib/firestore'
import GraduationModal from '@/components/dashboard/GraduationModal'
import CompanyForm, { type CompanyFormValues } from '@/components/dashboard/CompanyForm'
import ExperienceModal from '@/components/dashboard/ExperienceModal'
import ConfirmDialog from '@/components/dashboard/ConfirmDialog'
import PhotoUpload from '@/components/dashboard/PhotoUpload'
import GalleryUpload from '@/components/dashboard/GalleryUpload'
import { useLocale } from '@/lib/use-locale'
import type { Company, Experience, Option, OptionGroup } from '@/lib/schema'

// Company-scoped sections. No Documents tab: KYC/compliance documents are
// deliberately NOT stored live (archive-only) — see docs + migration script.
// Ordered as the onboarding journey: fill in the company, show it off, tell
// us how bookings reach you, then create the listing whose publish graduates
// you. The Next buttons below walk this order.
const TABS = ['Profile', 'Photos', 'Operations', 'Experiences'] as const
type Tab = typeof TABS[number]

const STR = {
  fr: {
    back: 'Aperçu', eyebrow: 'Établissement', untitled: 'Établissement sans nom',
    tabs: { Profile: 'Profil', Experiences: 'Expériences', Photos: 'Photos', Operations: 'Opérations' } as Record<Tab, string>,
    save: 'Enregistrer', saved: '✓ Enregistré', saving: 'Enregistrement…',
    next: 'Suivant', lastStep: 'Publiez une expérience pour terminer votre onboarding.',
    addExp: '+ Ajouter une expérience', noExpTitle: 'Aucune expérience pour l’instant',
    noExpBody: 'Ajoutez les expériences que propose cet établissement.',
    addFirstExp: '+ Ajouter votre première expérience',
    needs: 'À compléter', edit: 'Modifier', del: 'Supprimer',
    stLabels: { draft: 'Brouillon', pending_review: 'En révision', published: 'En ligne', unpublished: 'Retirée', archived: 'Archivée' } as Record<string, string>,
    delTitle: 'Supprimer cette expérience ?',
    delNote: 'L’expérience et ses options seront supprimées. Cette action est irréversible.',
    delConfirm: 'Supprimer définitivement', delBusy: 'Suppression…',
    delBody: 'Vous êtes sur le point de supprimer définitivement',
    tSaved: '✓ Enregistré', tLive: '✓ En ligne dans l’app', tUnpub: 'Retirée de l’app',
    delThis: 'cette expérience',
    photosIntro: 'L’image de cet établissement sur Palmera. Les envois sont enregistrés automatiquement.',
    hero: 'Photo de couverture', logo: 'Logo de l’établissement',
    heroHint: 'Paysage 16:9, min 1600×900px, sans filigrane', logoHint: 'Carré, PNG transparent de préférence',
    gallery: 'Galerie',
    galleryHint: 'Des photos du lieu ou de l’activité en général. Les photos d’une expérience précise vont sur cette expérience.',
    opsIntro: 'Comment les réservations vous parviennent. Indiquez la personne qui gère les opérations au quotidien.',
    opsName: 'Contact opérations *', opsNamePh: 'Personne qui gère le quotidien',
    opsWa: 'WhatsApp opérations *', opsWaPh: 'Numéro WhatsApp direct',
    notifPref: 'Préférence de notification', notifPh: 'Comment vous prévenir ?',
    confSpeed: 'Rapidité de confirmation', confPh: 'En combien de temps confirmez-vous ?',
    prefLabels: { 'WhatsApp message': 'Message WhatsApp', 'SMS': 'SMS', 'Email': 'Email', 'Phone call': 'Appel téléphonique' } as Record<string, string>,
    speedLabels: { 'Real-time': 'En temps réel', 'Within 1 hour': 'Sous 1 heure', 'Same day': 'Le jour même', 'Within 24 hours': 'Sous 24 heures' } as Record<string, string>,
  },
  en: {
    back: 'Overview', eyebrow: 'Company', untitled: 'Untitled company',
    tabs: { Profile: 'Profile', Experiences: 'Experiences', Photos: 'Photos', Operations: 'Operations' } as Record<Tab, string>,
    save: 'Save changes', saved: '✓ Saved', saving: 'Saving…',
    next: 'Next', lastStep: 'Publish an experience to finish your onboarding.',
    addExp: '+ Add experience', noExpTitle: 'No experiences yet',
    noExpBody: 'Add the experiences this company offers.',
    addFirstExp: '+ Add your first experience',
    needs: 'Needs', edit: 'Edit', del: 'Delete',
    stLabels: { draft: 'Draft', pending_review: 'In review', published: 'Live', unpublished: 'Unpublished', archived: 'Archived' } as Record<string, string>,
    delTitle: 'Delete this experience?',
    delNote: 'Removes the experience and its options. This cannot be undone.',
    delConfirm: 'Delete permanently', delBusy: 'Deleting…',
    delBody: "You're about to permanently delete",
    tSaved: '✓ Saved', tLive: '✓ Live in the app', tUnpub: 'Removed from the app',
    delThis: 'this experience',
    photosIntro: 'How this company appears on Palmera. Uploads save automatically.',
    hero: 'Hero photo', logo: 'Company logo',
    heroHint: 'Landscape 16:9, min 1600×900px, no watermarks', logoHint: 'Square, transparent PNG preferred',
    gallery: 'Gallery',
    galleryHint: 'Photos of the venue or business overall. Photos of a specific experience belong on that experience.',
    opsIntro: 'How bookings reach you once a guest reserves. Give us the person who actually runs day-to-day operations.',
    opsName: 'Operations contact name *', opsNamePh: 'Person who runs day-to-day operations',
    opsWa: 'Operations contact WhatsApp *', opsWaPh: 'Direct WhatsApp number',
    notifPref: 'Notification preference', notifPh: 'How should we notify you?',
    confSpeed: 'Confirmation speed', confPh: 'How quickly do you confirm?',
    prefLabels: { 'WhatsApp message': 'WhatsApp message', 'SMS': 'SMS', 'Email': 'Email', 'Phone call': 'Phone call' } as Record<string, string>,
    speedLabels: { 'Real-time': 'Real-time', 'Within 1 hour': 'Within 1 hour', 'Same day': 'Same day', 'Within 24 hours': 'Within 24 hours' } as Record<string, string>,
  },
}

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
  const s = STR[useLocale()]
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

  const [graduating, setGraduating] = useState(false)
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

  const [toast, setToast] = useState('')

  // ONE save path shared with /partner Listings (saveExperienceWithOptions) —
  // the two surfaces can't drift.
  const handleSaveExperience = async (data: Partial<Experience>, groups: (OptionGroup & { options: Option[] })[]) => {
    const { status } = await saveExperienceWithOptions({ companyName: company?.name || '', existingId: editingExp?.id, data, groups })
    await loadExperiences(uid)
    setShowExpModal(false); setEditingExp(undefined)
    setToast(status === 'published' ? s.tLive : status === 'unpublished' ? s.tUnpub : s.tSaved)
    setTimeout(() => setToast(''), 3000)

    // GRADUATION: the first time a partner puts a listing live, onboarding is
    // over. We record it on the provider (rather than deriving it from live
    // listings) so unpublishing later can't demote them back into onboarding.
    if (status === 'published') {
      const p = await getProvider(uid)
      if (p && p.onboardingStage !== 'complete') {
        await updateProvider(uid, { onboardingStage: 'complete' })
        setGraduating(true)
      }
    }
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

  // Step completion — drives the Next buttons. Persistent (derived from data,
  // not from having just clicked save) so it's still there after a reload.
  const profileDone = !!(company?.name && company?.legalName && company?.category && company?.city)
  const photosDone = !!(company?.heroPhoto && company?.logo)
  // From SAVED data, not the inputs — typing then tapping Next mustn't skip the save.
  const savedOpsData = (company?.operations || {}) as Partial<OpsForm>
  const opsDone = !!(savedOpsData.opsContactName && savedOpsData.opsContactWhatsapp)
  const nextTab: Partial<Record<Tab, Tab>> = { Profile: 'Photos', Photos: 'Operations', Operations: 'Experiences' }
  const NextButton = ({ from }: { from: Tab }) => {
    const to = nextTab[from]
    if (!to) return null
    return (
      <button onClick={() => { setTab(to); window.scrollTo({ top: 0 }) }}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '0.625rem 1.5rem', background: 'transparent', border: '1px solid var(--db-border-gold)', borderRadius: '0.375rem', color: '#be9a56', fontSize: '0.8125rem', fontFamily: 'var(--font-sans)', letterSpacing: '0.06em', cursor: 'pointer' }}>
        {s.next} : {s.tabs[to]} →
      </button>
    )
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
        {s.back}
      </a>
      <div style={{ marginBottom: '1.75rem' }}>
        <p style={{ fontFamily: 'var(--font-sans)', color: 'rgba(190,154,86,0.8)', fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 0.375rem' }}>{s.eyebrow}</p>
        <h1 style={{ fontFamily: 'var(--font-display)', color: 'var(--db-text)', fontSize: 'clamp(1.25rem, 3vw, 1.5rem)', fontWeight: 400, letterSpacing: '0.06em', margin: 0 }}>{company.name || s.untitled}</h1>
      </div>

      <div style={{ display: 'flex', overflowX: 'auto', borderBottom: '1px solid var(--db-border-subtle)', marginBottom: '1.75rem', scrollbarWidth: 'none' }}>
        {TABS.map(tb => (
          <button key={tb} onClick={() => setTab(tb)}
            style={{ flexShrink: 0, padding: '0.625rem 1.25rem', background: 'transparent', border: 'none', borderBottom: tab === tb ? '2px solid #be9a56' : '2px solid transparent', color: tab === tb ? '#be9a56' : 'var(--db-text-muted)', fontSize: '0.8125rem', fontFamily: 'var(--font-sans)', letterSpacing: '0.04em', cursor: 'pointer', marginBottom: '-1px' }}>
            {s.tabs[tb]}
          </button>
        ))}
      </div>

      {tab === 'Profile' && (
        <>
          <CompanyForm initial={company} submitLabel={s.save} saving={saving} onSubmit={handleSubmit} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
            {saved && <span style={{ fontSize: '0.8125rem', color: '#be9a56', fontFamily: 'var(--font-sans)' }}>{s.saved}</span>}
            {profileDone && <NextButton from="Profile" />}
          </div>
        </>
      )}

      {tab === 'Experiences' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.25rem' }}>
            <button onClick={openNewExperience} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.625rem 1.25rem', background: '#9e763b', border: 'none', borderRadius: '6px', color: '#ebe8db', fontSize: '0.8125rem', fontFamily: 'var(--font-sans)', letterSpacing: '0.06em', cursor: 'pointer' }}>
              {s.addExp}
            </button>
          </div>
          {loadingExp ? null : experiences.length === 0 ? (
            <div className="pf-glass" style={{ borderRadius: '0.625rem', padding: '3rem 2rem', textAlign: 'center' }}>
              <p style={{ fontFamily: 'var(--font-serif)', color: 'var(--db-text-faint)', fontSize: '1.0625rem', margin: '0 0 0.5rem' }}>{s.noExpTitle}</p>
              <p style={{ fontFamily: 'var(--font-sans)', color: 'var(--db-text-ghost)', fontSize: '0.8125rem', margin: '0 0 1.5rem' }}>{s.noExpBody}</p>
              <button onClick={openNewExperience} style={{ padding: '10px 24px', background: 'transparent', border: '1px solid var(--db-border-subtle)', borderRadius: '6px', color: 'var(--db-text)', fontSize: '0.8125rem', fontFamily: 'var(--font-sans)', cursor: 'pointer' }}>{s.addFirstExp}</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 18rem), 1fr))', gap: '1rem' }}>
              {experiences.map((e) => (
                <div key={e.id} className="pf-glass" style={{ borderRadius: '0.5rem', padding: '1.25rem 1.375rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.625rem' }}>
                    <h3 style={{ fontFamily: 'var(--font-serif)', color: 'var(--db-text)', fontSize: '0.9375rem', fontWeight: 500, margin: 0 }}>{e.title || 'Untitled'}</h3>
                    <span style={{ flexShrink: 0, fontSize: '0.625rem', fontFamily: 'var(--font-sans)', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: '2px', border: '1px solid var(--db-border-subtle)', color: 'var(--db-text-muted)' }}>{s.stLabels[e.status] || e.status}</span>
                  </div>
                  {(e.needsReview?.length ?? 0) > 0 && (
                    <p style={{ fontSize: '0.6875rem', color: '#e07070', fontFamily: 'var(--font-sans)', margin: '0 0 0.625rem' }}>{s.needs}: {e.needsReview!.join(', ')}</p>
                  )}
                  <p style={{ fontSize: '0.75rem', color: 'var(--db-text-faint)', fontFamily: 'var(--font-sans)', margin: '0 0 1rem', textTransform: 'capitalize' }}>
                    {[e.category, e.city].filter(Boolean).join(' · ') || '—'}{e.price != null ? ` · ${e.price.toLocaleString()} XOF` : ''}
                  </p>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => openEditExperience(e)} style={{ background: 'transparent', border: '1px solid var(--db-border-subtle)', borderRadius: '4px', color: 'var(--db-text-faint)', fontSize: '0.6875rem', fontFamily: 'var(--font-sans)', padding: '4px 10px', cursor: 'pointer' }}>{s.edit}</button>
                    <button onClick={() => setToDeleteExp(e)} style={{ background: 'transparent', border: '1px solid rgba(224,112,112,0.2)', borderRadius: '4px', color: 'rgba(224,112,112,0.7)', fontSize: '0.6875rem', fontFamily: 'var(--font-sans)', padding: '4px 10px', cursor: 'pointer' }}>{s.del}</button>
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
            {s.photosIntro}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 16rem), 1fr))', gap: '1.25rem', marginBottom: '1.75rem' }}>
            <div>
              <label style={photoLabel}>{s.hero} {!company.heroPhoto && <span style={{ color: '#be9a56' }}>*</span>}</label>
              <PhotoUpload uid={uid} label={s.hero} fieldName={`company_${companyId}_hero`} existingUrl={company.heroPhoto || ''}
                hint={s.heroHint}
                onUploaded={(url) => persistPhotos({ heroPhoto: url })} />
            </div>
            <div>
              <label style={photoLabel}>{s.logo} {!company.logo && <span style={{ color: '#be9a56' }}>*</span>}</label>
              <PhotoUpload uid={uid} label={s.logo} fieldName={`company_${companyId}_logo`} existingUrl={company.logo || ''}
                hint={s.logoHint}
                onUploaded={(url) => persistPhotos({ logo: url })} />
            </div>
          </div>
          <label style={photoLabel}>{s.gallery}</label>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', color: 'var(--db-text-ghost)', margin: '0 0 0.625rem' }}>
            {s.galleryHint}
          </p>
          <GalleryUpload uid={uid} value={company.gallery || []} onChange={(urls) => persistPhotos({ gallery: urls })} />
          {photosDone && <div style={{ marginTop: '1.5rem' }}><NextButton from="Photos" /></div>}
        </div>
      )}

      {tab === 'Operations' && (
        <div>
          <p style={{ fontFamily: 'var(--font-serif)', color: 'var(--db-text-muted)', fontSize: '0.875rem', margin: '0 0 1.5rem' }}>
            {s.opsIntro}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 14rem), 1fr))', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={opsLabel}>{s.opsName}</label>
              <input style={opsInput} placeholder={s.opsNamePh} value={ops.opsContactName}
                onChange={(e) => setOps(p => ({ ...p, opsContactName: e.target.value }))} />
            </div>
            <div>
              <label style={opsLabel}>{s.opsWa}</label>
              <input style={opsInput} placeholder={s.opsWaPh} value={ops.opsContactWhatsapp}
                onChange={(e) => setOps(p => ({ ...p, opsContactWhatsapp: e.target.value }))} />
            </div>
            <div>
              <label style={opsLabel}>{s.notifPref}</label>
              <select style={{ ...opsInput, appearance: 'none' }} value={ops.notificationPreference}
                onChange={(e) => setOps(p => ({ ...p, notificationPreference: e.target.value }))}>
                <option value="">{s.notifPh}</option>
                {NOTIFICATION_PREFS.map(p => <option key={p} value={p}>{s.prefLabels[p]}</option>)}
              </select>
            </div>
            <div>
              <label style={opsLabel}>{s.confSpeed}</label>
              <select style={{ ...opsInput, appearance: 'none' }} value={ops.confirmationSpeed}
                onChange={(e) => setOps(p => ({ ...p, confirmationSpeed: e.target.value }))}>
                <option value="">{s.confPh}</option>
                {CONFIRMATION_SPEEDS.map(sp => <option key={sp} value={sp}>{s.speedLabels[sp]}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
            <button onClick={handleSaveOps} disabled={savingOps}
              style={{ padding: '0.625rem 1.5rem', background: '#9e763b', border: 'none', borderRadius: '0.375rem', color: '#ebe8db', fontSize: '0.8125rem', fontFamily: 'var(--font-sans)', letterSpacing: '0.06em', cursor: savingOps ? 'default' : 'pointer', opacity: savingOps ? 0.6 : 1 }}>
              {savingOps ? s.saving : s.save}
            </button>
            {savedOps && <span style={{ fontSize: '0.8125rem', color: '#be9a56', fontFamily: 'var(--font-sans)' }}>{s.saved}</span>}
            {opsDone && <NextButton from="Operations" />}
          </div>
        </div>
      )}

      {showExpModal && (
        <ExperienceModal
          providerId={uid}
          companyId={companyId}
          companyName={company.name}
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
          title={s.delTitle}
          note={s.delNote}
          confirmLabel={s.delConfirm}
          busyLabel={s.delBusy}
          busy={deletingExp}
          onConfirm={handleDeleteExperience}
          onCancel={() => setToDeleteExp(null)}
        >
          {s.delBody} <strong style={{ color: 'var(--db-text)' }}>{toDeleteExp.title || s.delThis}</strong>.
        </ConfirmDialog>
      )}

      {toast && (
        <div style={{ position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)', zIndex: 90, background: 'var(--db-bg-modal)', border: '1px solid var(--db-border-gold)', borderRadius: '2rem', padding: '0.625rem 1.25rem', color: '#be9a56', fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', letterSpacing: '0.03em', boxShadow: '0 8px 24px rgba(0,0,0,0.35)' }}>
          {toast}
        </div>
      )}

      {graduating && (
        <GraduationModal companyName={company.name} onEnter={() => router.push('/partner')} />
      )}
    </div>
  )
}
