'use client'
import { useState, useRef } from 'react'
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { storage } from '@/lib/firebase'

interface PhotoUploadProps {
  uid: string
  label: string
  fieldName: string
  existingUrl?: string
  onUploaded: (url: string, field: string) => void
  accept?: string
  hint?: string
}

export default function PhotoUpload({
  uid, label, fieldName, existingUrl, onUploaded, hint,
}: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [preview, setPreview] = useState(existingUrl || '')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (file: File) => {
    if (!file) return
    setUploading(true)
    setProgress(0)

    const storageRef = ref(storage, `partners/${uid}/${fieldName}/${Date.now()}_${file.name}`)
    const task = uploadBytesResumable(storageRef, file)

    task.on(
      'state_changed',
      snap => setProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      err => { console.error(err); setUploading(false) },
      async () => {
        const url = await getDownloadURL(task.snapshot.ref)
        setPreview(url)
        onUploaded(url, fieldName)
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
      <label style={{
        display: 'block',
        fontSize: '0.6875rem',
        color: 'rgba(223,201,166,0.5)',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        marginBottom: '8px',
        fontFamily: 'var(--font-sans)',
      }}>
        {label}
      </label>

      <div
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        style={{
          border: `1px dashed ${preview ? 'rgba(158,118,59,0.4)' : 'rgba(223,201,166,0.15)'}`,
          borderRadius: '0.5rem',
          padding: '1.25rem',
          textAlign: 'center',
          cursor: 'pointer',
          background: preview ? 'rgba(158,118,59,0.05)' : 'rgba(255,255,255,0.02)',
          transition: 'all 0.2s',
          position: 'relative',
          overflow: 'hidden',
          minHeight: '6.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '0.5rem',
        }}
      >
        {preview ? (
          <>
            <img src={preview} alt={label} style={{
              maxHeight: '7.5rem',
              maxWidth: '100%',
              borderRadius: '0.25rem',
              objectFit: 'cover',
            }} />
            <span style={{ fontSize: '0.6875rem', color: 'var(--accent-4)', fontFamily: 'var(--font-sans)' }}>
              Click to replace
            </span>
          </>
        ) : uploading ? (
          <>
            <div style={{
              width: '100%',
              height: '0.25rem',
              background: 'rgba(223,201,166,0.1)',
              borderRadius: '2px',
              overflow: 'hidden',
              maxWidth: '200px',
            }}>
              <div style={{
                height: '100%',
                width: `${progress}%`,
                background: 'var(--accent-4)',
                transition: 'width 0.2s',
              }} />
            </div>
            <span style={{ fontSize: '0.75rem', color: 'rgba(223,201,166,0.5)', fontFamily: 'var(--font-sans)' }}>
              Uploading {progress}%
            </span>
          </>
        ) : (
          <>
            <span style={{ fontSize: '1.5rem', opacity: 0.3 }}>↑</span>
            <span style={{ fontSize: '0.8125rem', color: 'rgba(223,201,166,0.4)', fontFamily: 'var(--font-sans)' }}>
              Click or drag to upload
            </span>
            {hint && (
              <span style={{ fontSize: '0.6875rem', color: 'rgba(223,201,166,0.25)', fontFamily: 'var(--font-sans)' }}>
                {hint}
              </span>
            )}
          </>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
    </div>
  )
}
