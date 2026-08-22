'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthChange } from '@/lib/auth'
import { getPartner, updatePartner, updateSectionStatus } from '@/lib/firestore'
import PhotoUpload from '@/components/dashboard/PhotoUpload'
import GalleryUpload from '@/components/dashboard/GalleryUpload'

export default function PhotosPage() {
  const router = useRouter()
  const [uid, setUid] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [photos, setPhotos] = useState<Record<string, string>>({ heroPhoto: '', providerLogo: '', teamHeadshot: '' })
  const [gallery, setGallery] = useState<string[]>([])
  // Refs hold the latest values so auto-save always writes the current state,
  // even when several uploads land in quick succession.
  const uidRef = useRef('')
  const photosRef = useRef(photos)
  const galleryRef = useRef(gallery)
  photosRef.current = photos
  galleryRef.current = gallery

  useEffect(() => {
    const unsub = onAuthChange(async (user) => {
      if (!user) { router.replace('/dashboard'); return }
      setUid(user.uid); uidRef.current = user.uid
      const partner = await getPartner(user.uid)
      if (partner?.photos) {
        const { gallery: g, galleryPhoto1, galleryPhoto2, galleryPhoto3, ...rest } = partner.photos as Record<string, unknown>
        setPhotos(p => ({ ...p, ...(rest as Record<string, string>) }))
        // Back-compat: migrate the old fixed gallery slots into the array.
        setGallery(Array.isArray(g) ? (g as string[]) : [galleryPhoto1, galleryPhoto2, galleryPhoto3].filter(Boolean) as string[])
      }
    })
    return () => unsub()
  }, [router])

  // Persist immediately on any change so an upload is never lost by forgetting
  // to press Save. The Save button remains for marking the section done.
  const persist = (nextPhotos: Record<string, string>, nextGallery: string[]) => {
    if (!uidRef.current) return
    updatePartner(uidRef.current, { photos: { ...nextPhotos, gallery: nextGallery } }).catch(e => console.error('Photo save failed', e))
  }
  const handleUploaded = (url: string, field: string) => {
    const next = { ...photosRef.current, [field]: url }
    setPhotos(next); persist(next, galleryRef.current)
  }
  const handleGallery = (next: string[]) => {
    setGallery(next); persist(photosRef.current, next)
  }

  const mustHaveDone = !!(photos.heroPhoto && photos.providerLogo)
  const allDone = mustHaveDone && gallery.length >= 2

  const handleSave = async () => {
    setSaving(true)
    await updatePartner(uid, { photos: { ...photos, gallery } })
    await updateSectionStatus(uid, 'photos', allDone ? 'complete' : mustHaveDone ? 'in_progress' : 'incomplete')
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2500)
  }

  const badge = (label: string, gold = false) => (
    <span style={{ fontSize: '0.625rem', color: gold ? '#be9a56' : 'var(--db-text-muted)', border: `1px solid ${gold ? 'rgba(190,154,86,0.4)' : 'var(--db-border-subtle)'}`, padding: '0.125rem 0.5rem', borderRadius: '0.1875rem', fontFamily: 'var(--font-sans)', letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>{label}</span>
  )

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <p style={{ fontFamily: 'var(--font-sans)', color: 'rgba(190,154,86,0.8)', fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 0.5rem' }}>Photos & Media</p>
        <h1 style={{ fontFamily: 'var(--font-display)', color: 'var(--db-text)', fontSize: 'clamp(1.375rem, 3vw, 1.625rem)', fontWeight: 400, letterSpacing: '0.06em', margin: '0 0 0.375rem' }}>Visuals</h1>
        <p style={{ fontFamily: 'var(--font-serif)', color: 'var(--db-text-muted)', fontSize: '0.875rem', margin: 0 }}>Great photos are the single biggest factor in bookings. No filters, natural light, original quality.</p>
      </div>
      <div style={{ background: 'var(--db-bg-banner)', border: '1px solid rgba(158,118,59,0.15)', borderRadius: '0.5rem', padding: '1rem 1.25rem', marginBottom: '2rem' }}>
        <p style={{ fontSize: '0.6875rem', color: 'var(--db-text-muted)', fontFamily: 'var(--font-sans)', margin: '0 0 0.5rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Photo standards</p>
        <ul style={{ margin: 0, padding: '0 0 0 1rem', listStyleType: 'disc' }}>
          {['Shot horizontally on a recent phone — no photographer needed', 'Natural light only, no flash', 'No filters, no Instagram crops', 'Send at ORIGINAL quality — never screenshots'].map(tip => (
            <li key={tip} style={{ fontSize: '0.8125rem', color: 'var(--db-text-muted)', fontFamily: 'var(--font-sans)', marginBottom: '0.1875rem', lineHeight: 1.5 }}>{tip}</li>
          ))}
        </ul>
      </div>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', color: 'var(--db-text)', fontSize: '1.0625rem', fontWeight: 400, margin: '0 0 1.25rem', display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          Hero &amp; logo {badge('Recommended', true)}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 14rem), 1fr))', gap: '1.25rem' }}>
          <PhotoUpload uid={uid} label="Hero photo *" fieldName="heroPhoto" existingUrl={photos.heroPhoto} onUploaded={handleUploaded} hint="Landscape 16:9, min 1600×900px, no watermarks" />
          <PhotoUpload uid={uid} label="Provider logo *" fieldName="providerLogo" existingUrl={photos.providerLogo} onUploaded={handleUploaded} hint="Square, transparent PNG preferred" />
        </div>
      </div>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', color: 'var(--db-text)', fontSize: '1.0625rem', fontWeight: 400, margin: '0 0 0.5rem', display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          Gallery photos {badge('First month')}
        </h2>
        <p style={{ fontSize: '0.8125rem', color: 'var(--db-text-muted)', fontFamily: 'var(--font-sans)', margin: '0 0 1.25rem' }}>Aim for variety — people enjoying, the space, food/equipment, golden-hour shots. You can select several at once.</p>
        <GalleryUpload uid={uid} value={gallery} onChange={handleGallery} />
      </div>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', color: 'var(--db-text)', fontSize: '1.0625rem', fontWeight: 400, margin: '0 0 1.25rem' }}>Optional</h2>
        <div style={{ maxWidth: '18.75rem' }}>
          <PhotoUpload uid={uid} label="Owner / team headshot" fieldName="teamHeadshot" existingUrl={photos.teamHeadshot} onUploaded={handleUploaded} hint="For the provider card" />
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', paddingTop: '0.5rem', borderTop: '1px solid var(--db-border-subtle)' }}>
        <button onClick={handleSave} disabled={saving}
          style={{ padding: '0.75rem 2rem', background: '#9e763b', border: 'none', borderRadius: '0.375rem', color: '#ebe8db', fontSize: '0.875rem', fontFamily: 'var(--font-sans)', letterSpacing: '0.06em', cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Saving...' : 'Save photos'}
        </button>
        {saved && <span style={{ fontSize: '0.8125rem', color: '#be9a56', fontFamily: 'var(--font-sans)' }}>✓ Saved</span>}
      </div>
    </div>
  )
}
