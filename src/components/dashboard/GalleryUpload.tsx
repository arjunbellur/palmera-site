'use client'
import { useRef, useState } from 'react'
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { storage } from '@/lib/firebase'

interface GalleryUploadProps {
  uid: string
  value: string[]
  onChange: (urls: string[]) => void
  max?: number
}

/**
 * Multi-select gallery uploader. Lets a partner pick several photos at once,
 * uploads them to Storage, and stores the result as an array (mirrors the
 * customer app's experiences.gallery). Reorder-free for now; remove per item.
 */
export default function GalleryUpload({ uid, value, onChange, max = 12 }: GalleryUploadProps) {
  const [inFlight, setInFlight] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const uploadOne = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const storageRef = ref(storage, `partners/${uid}/gallery/${Date.now()}_${Math.random().toString(36).slice(2)}_${file.name}`)
      const task = uploadBytesResumable(storageRef, file)
      task.on('state_changed', undefined, reject, async () => resolve(await getDownloadURL(task.snapshot.ref)))
    })

  const handleFiles = async (files: FileList | null) => {
    if (!files || !files.length || !uid) return
    const room = Math.max(0, max - value.length)
    const list = Array.from(files).slice(0, room)
    if (!list.length) return
    setInFlight(n => n + list.length)
    const urls: string[] = []
    for (const f of list) {
      try { urls.push(await uploadOne(f)) } catch (e) { console.error('Gallery upload failed', e) } finally { setInFlight(n => n - 1) }
    }
    if (urls.length) onChange([...value, ...urls])
  }

  const removeAt = (i: number) => onChange(value.filter((_, j) => j !== i))

  const tile: React.CSSProperties = { aspectRatio: '4 / 3', borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid var(--db-border-subtle)', background: 'var(--db-bg-card)' }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 9rem), 1fr))', gap: '0.75rem' }}>
        {value.map((url, i) => (
          <div key={`${url}-${i}`} style={{ ...tile, position: 'relative' }}>
            <img src={url} alt={`Gallery ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            <button onClick={() => removeAt(i)} aria-label={`Remove photo ${i + 1}`}
              style={{ position: 'absolute', top: '0.375rem', right: '0.375rem', width: '1.5rem', height: '1.5rem', borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: '0.9375rem', lineHeight: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
          </div>
        ))}
        {value.length < max && (
          <button onClick={() => inputRef.current?.click()}
            style={{ ...tile, borderStyle: 'dashed', color: 'var(--db-text-faint)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', fontFamily: 'var(--font-sans)', fontSize: '0.75rem' }}>
            <span style={{ fontSize: '1.375rem', lineHeight: 1 }}>＋</span>
            {inFlight > 0 ? `Uploading ${inFlight}…` : 'Add photos'}
          </button>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
        onChange={e => { handleFiles(e.target.files); e.target.value = '' }} />
      <p style={{ fontSize: '0.6875rem', color: 'var(--db-text-ghost)', fontFamily: 'var(--font-sans)', margin: '0.625rem 0 0' }}>
        Select multiple at once · {value.length}/{max}
      </p>
    </div>
  )
}
