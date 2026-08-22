'use client'
import { useState, useRef, useEffect } from 'react'
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { storage } from '@/lib/firebase'
import { useLocale } from '@/lib/use-locale'
import { uploadErrorText } from '@/lib/upload-errors'

const STR = {
  fr: { replace: 'Cliquez pour remplacer', uploading: 'Envoi', drop: 'Cliquez ou glissez une photo' },
  en: { replace: 'Click to replace', uploading: 'Uploading', drop: 'Click or drag to upload' },
}

interface PhotoUploadProps {
  uid: string
  label: string
  fieldName: string
  existingUrl?: string
  onUploaded: (url: string, field: string) => void
  accept?: string
  hint?: string
}

export default function PhotoUpload({ uid, label, fieldName, existingUrl, onUploaded, hint }: PhotoUploadProps) {
  const locale = useLocale()
  const s = STR[locale]
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [preview, setPreview] = useState(existingUrl || '')
  const inputRef = useRef<HTMLInputElement>(null)

  // The partner's saved photos load asynchronously (after getPartner resolves),
  // so existingUrl arrives AFTER mount. Without this, the initial empty preview
  // would stick and a saved photo would look like it vanished on refresh.
  useEffect(() => {
    if (!uploading) setPreview(existingUrl || '')
  }, [existingUrl, uploading])

  const handleFile = (file: File) => {
    if (!file) return
    setUploading(true)
    setProgress(0)
    setError('')
    const storageRef = ref(storage, `partners/${uid}/${fieldName}/${Date.now()}_${file.name}`)
    const task = uploadBytesResumable(storageRef, file)
    task.on('state_changed',
      snap => setProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      err => { console.error('photo upload failed:', err); setError(uploadErrorText(err, locale)); setUploading(false) },
      async () => {
        try {
          const url = await getDownloadURL(task.snapshot.ref)
          setPreview(url)
          onUploaded(url, fieldName)
        } catch (e) {
          console.error('photo url failed:', e)
          setError(uploadErrorText(e, locale))
        }
        setUploading(false)
      }
    )
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  return (
    <div style={{ marginBottom: '16px' }}>
      <label style={{ display: 'block', fontSize: '0.6875rem', color: 'var(--db-text-faint)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px', fontFamily: 'var(--font-sans)' }}>
        {label}
      </label>
      <div
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        style={{ border: `1px dashed ${preview ? 'rgba(158,118,59,0.4)' : 'var(--db-border-subtle)'}`, borderRadius: '0.5rem', padding: '1.25rem', textAlign: 'center', cursor: 'pointer', background: preview ? 'var(--db-bg-card-active)' : 'var(--db-bg-card)', transition: 'all 0.2s', position: 'relative', overflow: 'hidden', minHeight: '6.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '0.5rem' }}
      >
        {preview ? (
          <>
            <img loading="lazy" decoding="async" src={preview} alt={label} style={{ maxHeight: '7.5rem', maxWidth: '100%', borderRadius: '0.25rem', objectFit: 'cover' }} />
            <span style={{ fontSize: '0.6875rem', color: 'var(--accent-4)', fontFamily: 'var(--font-sans)' }}>{s.replace}</span>
          </>
        ) : uploading ? (
          <>
            <div style={{ width: '100%', height: '0.25rem', background: 'var(--db-border-subtle)', borderRadius: '2px', overflow: 'hidden', maxWidth: '200px' }}>
              <div style={{ height: '100%', width: `${progress}%`, background: 'var(--accent-4)', transition: 'width 0.2s' }} />
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--db-text-faint)', fontFamily: 'var(--font-sans)' }}>{s.uploading} {progress}%</span>
          </>
        ) : (
          <>
            <span style={{ fontSize: '1.5rem', color: 'var(--db-text-ghost)' }}>↑</span>
            <span style={{ fontSize: '0.8125rem', color: 'var(--db-text-faint)', fontFamily: 'var(--font-sans)' }}>{s.drop}</span>
            {hint && <span style={{ fontSize: '0.6875rem', color: 'var(--db-text-ghost)', fontFamily: 'var(--font-sans)' }}>{hint}</span>}
          </>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); e.target.value = '' }} />
      {error && <p role="alert" style={{ fontSize: '0.75rem', color: 'var(--db-alert)', fontFamily: 'var(--font-sans)', margin: '0.5rem 0 0' }}>{error}</p>}
    </div>
  )
}
