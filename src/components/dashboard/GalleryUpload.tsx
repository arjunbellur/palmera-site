'use client'
import { useRef, useState } from 'react'
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { storage } from '@/lib/firebase'
import { useLocale } from '@/lib/use-locale'
import { uploadErrorText } from '@/lib/upload-errors'

const GSTR = {
  fr: { uploading: 'Envoi de', add: 'Ajouter des photos', multi: 'Sélection multiple possible', reorder: 'Glissez les photos pour changer leur ordre — les premières comptent le plus' },
  en: { uploading: 'Uploading', add: 'Add photos', multi: 'Select multiple at once', reorder: 'Drag photos to reorder — the first ones matter most' },
}

interface GalleryUploadProps {
  uid: string
  value: string[]
  onChange: (urls: string[]) => void
  max?: number
  /** When given, each tile offers "make this the main photo" (Jordan #19). */
  onPromote?: (url: string) => void
  promoteLabel?: string
}

/**
 * Multi-select gallery uploader. Lets a partner pick several photos at once,
 * uploads them to Storage, and stores the result as an array (mirrors the
 * customer app's experiences.gallery). Drag a tile onto another to reorder —
 * the array order IS the order guests see (Jordan: first photos convert).
 */
export default function GalleryUpload({ uid, value, onChange, max = 12, onPromote, promoteLabel }: GalleryUploadProps) {
  const locale = useLocale()
  const gs = GSTR[locale]
  const [error, setError] = useState('')
  const [inFlight, setInFlight] = useState(0)
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [overIdx, setOverIdx] = useState<number | null>(null)
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
    setError('')
    const urls: string[] = []
    let failed = 0; let lastErr: unknown = null
    for (const f of list) {
      try { urls.push(await uploadOne(f)) } catch (e) { failed++; lastErr = e; console.error('Gallery upload failed', e) } finally { setInFlight(n => n - 1) }
    }
    if (urls.length) onChange([...value, ...urls])
    if (failed) setError(`${failed}/${list.length} — ${uploadErrorText(lastErr, locale)}`)
  }

  const removeAt = (i: number) => onChange(value.filter((_, j) => j !== i))
  const moveTo = (from: number, to: number) => {
    if (from === to || to < 0 || to >= value.length) return
    const next = [...value]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    onChange(next)
  }

  const tile: React.CSSProperties = { aspectRatio: '4 / 3', borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid var(--db-border-subtle)', background: 'var(--db-bg-card)' }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 9rem), 1fr))', gap: '0.75rem' }}>
        {value.map((url, i) => (
          <div key={`${url}-${i}`} draggable
            onDragStart={(e) => { setDragIdx(i); e.dataTransfer.effectAllowed = 'move' }}
            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (overIdx !== i) setOverIdx(i) }}
            onDragLeave={() => setOverIdx((o) => (o === i ? null : o))}
            onDrop={(e) => { e.preventDefault(); if (dragIdx !== null) moveTo(dragIdx, i); setDragIdx(null); setOverIdx(null) }}
            onDragEnd={() => { setDragIdx(null); setOverIdx(null) }}
            style={{ ...tile, position: 'relative', cursor: 'grab',
              opacity: dragIdx === i ? 0.4 : 1,
              outline: overIdx === i && dragIdx !== null && dragIdx !== i ? '2px solid var(--db-gold, #be9a56)' : 'none', outlineOffset: '2px',
              transition: 'opacity 0.15s' }}>
            <img loading="lazy" decoding="async" src={url} alt={`Gallery ${i + 1}`} draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' }} />
            {/* Position badge — makes the order (what guests see first) explicit. */}
            <span style={{ position: 'absolute', top: '0.375rem', left: '0.375rem', minWidth: '1.25rem', height: '1.25rem', borderRadius: '0.375rem', background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: '0.6875rem', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 0.25rem', fontFamily: 'var(--font-sans)' }}>{i + 1}</span>
            {onPromote && (
              <button onClick={() => onPromote(url)} title={promoteLabel || 'Main photo'}
                style={{ position: 'absolute', bottom: '0.375rem', left: '0.375rem', padding: '0.2rem 0.5rem', borderRadius: '999px', border: 'none', background: 'rgba(0,0,0,0.6)', color: '#e9bc4f', fontSize: '0.625rem', fontFamily: 'var(--font-sans)', cursor: 'pointer' }}>
                ★ {promoteLabel || 'Main'}
              </button>
            )}
            <button onClick={() => removeAt(i)} aria-label={`Remove photo ${i + 1}`}
              style={{ position: 'absolute', top: '0.375rem', right: '0.375rem', width: '1.5rem', height: '1.5rem', borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: '0.9375rem', lineHeight: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
          </div>
        ))}
        {value.length < max && (
          <button onClick={() => inputRef.current?.click()}
            style={{ ...tile, borderStyle: 'dashed', color: 'var(--db-text-faint)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', fontFamily: 'var(--font-sans)', fontSize: '0.75rem' }}>
            <span style={{ fontSize: '1.375rem', lineHeight: 1 }}>＋</span>
            {inFlight > 0 ? `${gs.uploading} ${inFlight}…` : gs.add}
          </button>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
        onChange={e => { handleFiles(e.target.files); e.target.value = '' }} />
      <p style={{ fontSize: '0.6875rem', color: 'var(--db-text-ghost)', fontFamily: 'var(--font-sans)', margin: '0.625rem 0 0' }}>
        {gs.multi}{value.length > 1 ? ` · ${gs.reorder}` : ''} · {value.length}/{max}
      </p>
      {error && <p role="alert" style={{ fontSize: '0.75rem', color: '#e07070', fontFamily: 'var(--font-sans)', margin: '0.375rem 0 0' }}>{error}</p>}
    </div>
  )
}
