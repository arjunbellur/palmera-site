'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthChange } from '@/lib/auth'
import { getPartner, updatePartner, updateSectionStatus } from '@/lib/firestore'
import PhotoUpload from '@/components/dashboard/PhotoUpload'

export default function PhotosPage() {
  const router = useRouter()
  const [uid, setUid] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [photos, setPhotos] = useState<Record<string, string>>({
    heroPhoto: '',
    galleryPhoto1: '',
    galleryPhoto2: '',
    galleryPhoto3: '',
    providerLogo: '',
    teamHeadshot: '',
  })

  useEffect(() => {
    const unsub = onAuthChange(async (user) => {
      if (!user) { router.replace('/dashboard'); return }
      setUid(user.uid)
      const partner = await getPartner(user.uid)
      if (partner?.photos) setPhotos(prev => ({ ...prev, ...partner.photos }))
    })
    return () => unsub()
  }, [router])

  const handleUploaded = (url: string, field: string) => {
    setPhotos(prev => ({ ...prev, [field]: url }))
  }

  const mustHaveDone = !!(photos.heroPhoto && photos.providerLogo)
  const allDone = Object.values(photos).filter(Boolean).length >= 4

  const handleSave = async () => {
    setSaving(true)
    await updatePartner(uid, { photos })
    await updateSectionStatus(uid, 'photos', allDone ? 'complete' : mustHaveDone ? 'in_progress' : 'incomplete')
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <p style={{ fontFamily: 'var(--font-sans)', color: 'rgba(223,201,166,0.4)', fontSize: '12px', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 8px' }}>
          Photos & Media
        </p>
        <h1 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-tan)', fontSize: '26px', fontWeight: 400, letterSpacing: '0.06em', margin: '0 0 8px' }}>
          Visuals
        </h1>
        <p style={{ fontFamily: 'var(--font-serif)', color: 'rgba(223,201,166,0.4)', fontSize: '14px', margin: 0, letterSpacing: '0.02em' }}>
          Great photos are the single biggest factor in bookings. No filters, natural light, original quality.
        </p>
      </div>

      {/* Photo standards callout */}
      <div style={{
        background: 'rgba(158,118,59,0.06)',
        border: '1px solid rgba(158,118,59,0.15)',
        borderRadius: '8px',
        padding: '16px 20px',
        marginBottom: '32px',
      }}>
        <p style={{ fontSize: '12px', color: 'rgba(223,201,166,0.5)', fontFamily: 'var(--font-sans)', margin: '0 0 6px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Photo standards
        </p>
        <ul style={{ margin: 0, padding: '0 0 0 16px', listStyleType: 'disc' }}>
          {[
            'Shot horizontally on a recent phone — no photographer needed',
            'Natural light only, no flash',
            'No filters, no Instagram crops',
            'People should look candid and aspirational',
            'Send at ORIGINAL quality — never screenshots',
          ].map(tip => (
            <li key={tip} style={{ fontSize: '13px', color: 'rgba(223,201,166,0.45)', fontFamily: 'var(--font-sans)', marginBottom: '3px', lineHeight: 1.5 }}>
              {tip}
            </li>
          ))}
        </ul>
      </div>

      {/* Required */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-tan)', fontSize: '17px', fontWeight: 400, margin: '0 0 20px', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '10px' }}>
          Required to list
          <span style={{ fontSize: '10px', color: 'var(--accent-4)', border: '1px solid rgba(190,154,86,0.3)', padding: '2px 8px', borderRadius: '2px', fontFamily: 'var(--font-sans)', letterSpacing: '0.06em' }}>
            Must-have
          </span>
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <PhotoUpload
            uid={uid}
            label="Hero photo *"
            fieldName="heroPhoto"
            existingUrl={photos.heroPhoto}
            onUploaded={handleUploaded}
            hint="Landscape 16:9, minimum 1600×900px, no watermarks"
          />
          <PhotoUpload
            uid={uid}
            label="Provider logo *"
            fieldName="providerLogo"
            existingUrl={photos.providerLogo}
            onUploaded={handleUploaded}
            hint="Square, transparent PNG preferred"
          />
        </div>
      </div>

      {/* Gallery */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-tan)', fontSize: '17px', fontWeight: 400, margin: '0 0 8px', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '10px' }}>
          Gallery photos
          <span style={{ fontSize: '10px', color: 'rgba(223,201,166,0.4)', border: '1px solid rgba(223,201,166,0.15)', padding: '2px 8px', borderRadius: '2px', fontFamily: 'var(--font-sans)', letterSpacing: '0.06em' }}>
            First month
          </span>
        </h2>
        <p style={{ fontSize: '13px', color: 'rgba(223,201,166,0.35)', fontFamily: 'var(--font-sans)', margin: '0 0 20px' }}>
          Aim for variety — people enjoying, the space, food/equipment, golden-hour shots.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
          {(['galleryPhoto1', 'galleryPhoto2', 'galleryPhoto3'] as const).map((field, i) => (
            <PhotoUpload
              key={field}
              uid={uid}
              label={`Gallery photo ${i + 1}`}
              fieldName={field}
              existingUrl={photos[field]}
              onUploaded={handleUploaded}
            />
          ))}
        </div>
      </div>

      {/* Optional */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-tan)', fontSize: '17px', fontWeight: 400, margin: '0 0 20px', letterSpacing: '0.04em' }}>
          Optional
        </h2>
        <div style={{ maxWidth: '300px' }}>
          <PhotoUpload
            uid={uid}
            label="Owner / team headshot"
            fieldName="teamHeadshot"
            existingUrl={photos.teamHeadshot}
            onUploaded={handleUploaded}
            hint="For the provider card"
          />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', paddingTop: '8px', borderTop: '1px solid rgba(223,201,166,0.08)' }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '12px 32px',
            background: 'var(--accent-3)',
            border: 'none',
            borderRadius: '6px',
            color: '#fff',
            fontSize: '14px',
            fontFamily: 'var(--font-sans)',
            letterSpacing: '0.06em',
            cursor: saving ? 'wait' : 'pointer',
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? 'Saving...' : 'Save photos'}
        </button>
        {saved && <span style={{ fontSize: '13px', color: 'var(--accent-4)', fontFamily: 'var(--font-sans)' }}>✓ Saved</span>}
      </div>
    </div>
  )
}
