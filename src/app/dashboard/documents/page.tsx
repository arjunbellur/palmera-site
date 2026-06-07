'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { storage } from '@/lib/firebase'
import { onAuthChange } from '@/lib/auth'
import { getPartner, updatePartner, updateSectionStatus } from '@/lib/firestore'

const DOCUMENTS = [
  { field: 'businessRegistration', label: 'Business registration certificate', hint: 'NINEA / RCCM', required: true },
  { field: 'taxCertificate', label: 'Tax certificate', hint: 'NINEA fiscal certificate', required: true },
  { field: 'liabilityInsurance', label: 'Liability insurance policy', hint: 'Or written acknowledgment of liability acceptance', required: true },
  { field: 'ownerIdCopy', label: "Owner's national ID", hint: 'Required for KYC / payouts', required: true },
  { field: 'partnershipAgreement', label: 'Signed Palmera partnership agreement', hint: 'Sent by Palmera upon review', required: true },
]

interface DocStatus {
  url: string
  name: string
  uploadedAt: string
}

export default function DocumentsPage() {
  const router = useRouter()
  const [uid, setUid] = useState('')
  const [docs, setDocs] = useState<Record<string, DocStatus>>({})
  const [uploading, setUploading] = useState<Record<string, number>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const unsub = onAuthChange(async (user) => {
      if (!user) { router.replace('/dashboard'); return }
      setUid(user.uid)
      const partner = await getPartner(user.uid)
      if (partner?.documents) setDocs(partner.documents)
    })
    return () => unsub()
  }, [router])

  const handleUpload = (field: string, file: File) => {
    setUploading(prev => ({ ...prev, [field]: 0 }))
    const storageRef = ref(storage, `partners/${uid}/documents/${field}_${Date.now()}_${file.name}`)
    const task = uploadBytesResumable(storageRef, file)

    task.on(
      'state_changed',
      snap => setUploading(prev => ({ ...prev, [field]: Math.round((snap.bytesTransferred / snap.totalBytes) * 100) })),
      err => { console.error(err); setUploading(prev => { const n = { ...prev }; delete n[field]; return n }) },
      async () => {
        const url = await getDownloadURL(task.snapshot.ref)
        const status: DocStatus = { url, name: file.name, uploadedAt: new Date().toISOString() }
        setDocs(prev => ({ ...prev, [field]: status }))
        setUploading(prev => { const n = { ...prev }; delete n[field]; return n })
      }
    )
  }

  const uploadedCount = DOCUMENTS.filter(d => docs[d.field]?.url).length
  const allUploaded = uploadedCount === DOCUMENTS.length

  const handleSave = async () => {
    setSaving(true)
    await updatePartner(uid, { documents: docs })
    await updateSectionStatus(uid, 'documents', allUploaded ? 'complete' : uploadedCount > 0 ? 'in_progress' : 'incomplete')
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <p style={{ fontFamily: 'var(--font-sans)', color: 'rgba(223,201,166,0.4)', fontSize: '12px', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 8px' }}>
          Legal Documents
        </p>
        <h1 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-tan)', fontSize: '26px', fontWeight: 400, letterSpacing: '0.06em', margin: '0 0 6px' }}>
          Verification Documents
        </h1>
        <p style={{ fontFamily: 'var(--font-serif)', color: 'rgba(223,201,166,0.4)', fontSize: '14px', margin: 0, letterSpacing: '0.02em' }}>
          All documents required before payments go live. Accepted formats: PDF, JPG, PNG.
        </p>
      </div>

      {/* Progress */}
      <div style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(223,201,166,0.08)',
        borderRadius: '8px',
        padding: '16px 20px',
        marginBottom: '28px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
      }}>
        <div style={{ flex: 1, height: '4px', background: 'rgba(223,201,166,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${(uploadedCount / DOCUMENTS.length) * 100}%`,
            background: 'var(--accent-3)',
            transition: 'width 0.4s ease',
          }} />
        </div>
        <span style={{ fontSize: '12px', color: 'rgba(223,201,166,0.5)', fontFamily: 'var(--font-sans)', flexShrink: 0 }}>
          {uploadedCount} / {DOCUMENTS.length} uploaded
        </span>
      </div>

      {/* Document list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '28px' }}>
        {DOCUMENTS.map(doc => {
          const uploaded = docs[doc.field]
          const progress = uploading[doc.field]
          const isUploading = progress !== undefined

          return (
            <div
              key={doc.field}
              style={{
                background: uploaded ? 'rgba(158,118,59,0.05)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${uploaded ? 'rgba(158,118,59,0.2)' : 'rgba(223,201,166,0.08)'}`,
                borderRadius: '8px',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
              }}
            >
              {/* Status icon */}
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%',
                background: uploaded ? 'rgba(158,118,59,0.15)' : 'rgba(223,201,166,0.05)',
                border: `1px solid ${uploaded ? 'rgba(158,118,59,0.3)' : 'rgba(223,201,166,0.1)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                fontSize: '14px',
              }}>
                {uploaded ? '✓' : '○'}
              </div>

              {/* Doc info */}
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '14px', color: 'var(--color-tan)', fontFamily: 'var(--font-sans)', margin: '0 0 2px', fontWeight: 400 }}>
                  {doc.label}
                </p>
                <p style={{ fontSize: '12px', color: 'rgba(223,201,166,0.35)', fontFamily: 'var(--font-sans)', margin: 0 }}>
                  {uploaded ? `Uploaded: ${uploaded.name}` : doc.hint}
                </p>
                {isUploading && (
                  <div style={{ marginTop: '6px', height: '3px', background: 'rgba(223,201,166,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${progress}%`, background: 'var(--accent-4)', transition: 'width 0.2s' }} />
                  </div>
                )}
              </div>

              {/* Upload button */}
              <label style={{
                padding: '7px 16px',
                background: 'transparent',
                border: `1px solid ${uploaded ? 'rgba(223,201,166,0.15)' : 'rgba(223,201,166,0.2)'}`,
                borderRadius: '4px',
                color: uploaded ? 'rgba(223,201,166,0.4)' : 'var(--color-tan)',
                fontSize: '12px',
                fontFamily: 'var(--font-sans)',
                cursor: 'pointer',
                letterSpacing: '0.04em',
                flexShrink: 0,
                whiteSpace: 'nowrap',
              }}>
                {isUploading ? `${progress}%` : uploaded ? 'Replace' : 'Upload'}
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  style={{ display: 'none' }}
                  onChange={e => e.target.files?.[0] && handleUpload(doc.field, e.target.files[0])}
                />
              </label>
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', paddingTop: '8px', borderTop: '1px solid rgba(223,201,166,0.08)' }}>
        <button
          onClick={handleSave}
          disabled={saving || uploadedCount === 0}
          style={{
            padding: '12px 32px',
            background: 'var(--accent-3)',
            border: 'none',
            borderRadius: '6px',
            color: '#fff',
            fontSize: '14px',
            fontFamily: 'var(--font-sans)',
            letterSpacing: '0.06em',
            cursor: (saving || uploadedCount === 0) ? 'not-allowed' : 'pointer',
            opacity: (saving || uploadedCount === 0) ? 0.4 : 1,
          }}
        >
          {saving ? 'Saving...' : 'Save documents'}
        </button>
        {saved && <span style={{ fontSize: '13px', color: 'var(--accent-4)', fontFamily: 'var(--font-sans)' }}>✓ Saved</span>}
      </div>
    </div>
  )
}
