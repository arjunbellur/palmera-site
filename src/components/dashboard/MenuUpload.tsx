'use client'
// Menu attachment for restaurant-style listings — accepts a PDF or an image.
// Same Storage path scheme as PhotoUpload; the stored kind tells the app
// whether to open a viewer or render an image.
import { useState, useRef } from 'react'
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { storage } from '@/lib/firebase'
import { useLocale } from '@/lib/use-locale'
import { uploadErrorText } from '@/lib/upload-errors'

const STR = {
  fr: {
    drop: 'Cliquez ou glissez votre menu (PDF ou image)',
    uploading: 'Envoi', replace: 'Cliquez pour remplacer', view: 'Voir le menu',
    remove: 'Retirer le menu', tooBig: 'Fichier trop lourd (10 Mo max).',
    pdfBadge: 'Menu PDF',
  },
  en: {
    drop: 'Click or drag your menu (PDF or image)',
    uploading: 'Uploading', replace: 'Click to replace', view: 'View menu',
    remove: 'Remove menu', tooBig: 'File too large (10 MB max).',
    pdfBadge: 'PDF menu',
  },
}

const MAX_BYTES = 10 * 1024 * 1024

export type MenuKind = 'pdf' | 'image'

interface MenuUploadProps {
  uid: string
  fieldName: string
  existingUrl?: string | null
  existingKind?: MenuKind | null
  onUploaded: (url: string, kind: MenuKind) => void
  onRemove: () => void
}

export default function MenuUpload({ uid, fieldName, existingUrl, existingKind, onUploaded, onRemove }: MenuUploadProps) {
  const locale = useLocale()
  const s = STR[locale]
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [current, setCurrent] = useState<{ url: string; kind: MenuKind } | null>(
    existingUrl ? { url: existingUrl, kind: existingKind || 'image' } : null,
  )
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (file: File) => {
    if (!file) return
    setError('')
    if (file.size > MAX_BYTES) { setError(s.tooBig); return }
    const kind: MenuKind = file.type === 'application/pdf' ? 'pdf' : 'image'
    setUploading(true)
    setProgress(0)
    const storageRef = ref(storage, `partners/${uid}/${fieldName}/${Date.now()}_${file.name}`)
    const task = uploadBytesResumable(storageRef, file)
    task.on('state_changed',
      snap => setProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      err => { console.error('menu upload failed:', err); setError(uploadErrorText(err, locale)); setUploading(false) },
      async () => {
        const url = await getDownloadURL(task.snapshot.ref)
        setCurrent({ url, kind })
        onUploaded(url, kind)
        setUploading(false)
      },
    )
  }

  return (
    <div>
      <div
        onClick={() => inputRef.current?.click()}
        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
        onDragOver={(e) => e.preventDefault()}
        style={{ border: `1px dashed ${current ? 'rgba(158,118,59,0.4)' : 'var(--db-border-subtle)'}`, borderRadius: '0.5rem', padding: '1rem', textAlign: 'center', cursor: 'pointer', background: current ? 'var(--db-bg-card-active)' : 'var(--db-bg-card)', minHeight: '5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '0.5rem' }}
      >
        {uploading ? (
          <>
            <div style={{ width: '100%', height: '0.25rem', background: 'var(--db-border-subtle)', borderRadius: '2px', overflow: 'hidden', maxWidth: '200px' }}>
              <div style={{ height: '100%', width: `${progress}%`, background: 'var(--accent-4)', transition: 'width 0.2s' }} />
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--db-text-faint)', fontFamily: 'var(--font-sans)' }}>{s.uploading} {progress}%</span>
          </>
        ) : current ? (
          <>
            {current.kind === 'image' ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img loading="lazy" decoding="async" src={current.url} alt="Menu" style={{ maxHeight: '7.5rem', maxWidth: '100%', borderRadius: '0.25rem', objectFit: 'cover' }} />
            ) : (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--db-text)', border: '1px solid var(--db-border-gold)', borderRadius: '0.375rem', padding: '0.5rem 0.875rem' }}>
                📄 {s.pdfBadge}
              </span>
            )}
            <span style={{ fontSize: '0.6875rem', color: 'var(--accent-4)', fontFamily: 'var(--font-sans)' }}>{s.replace}</span>
          </>
        ) : (
          <>
            <span style={{ fontSize: '1.25rem', color: 'var(--db-text-ghost)' }}>🍽</span>
            <span style={{ fontSize: '0.8125rem', color: 'var(--db-text-faint)', fontFamily: 'var(--font-sans)' }}>{s.drop}</span>
          </>
        )}
      </div>
      {error && <p style={{ fontSize: '0.75rem', color: '#e07070', fontFamily: 'var(--font-sans)', margin: '0.5rem 0 0' }}>{error}</p>}
      {current && !uploading && (
        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
          <a href={current.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.75rem', color: '#be9a56', fontFamily: 'var(--font-sans)' }}>{s.view} ↗</a>
          <button onClick={() => { setCurrent(null); onRemove() }} style={{ background: 'transparent', border: 'none', color: '#e07070', fontSize: '0.75rem', fontFamily: 'var(--font-sans)', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}>{s.remove}</button>
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
    </div>
  )
}
