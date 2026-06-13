'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { storage } from '@/lib/firebase'
import { onAuthChange } from '@/lib/auth'
import { getPartner, updatePartner, updateSectionStatus } from '@/lib/firestore'

const DOCUMENTS = [
  { field: 'businessRegistration', label: 'Business registration certificate', hint: 'NINEA / RCCM document' },
  { field: 'taxCertificate', label: 'Tax certificate', hint: 'NINEA fiscal certificate' },
  { field: 'ownerIdCopy', label: "Owner's government ID", hint: 'Passport or national ID card (CNI) — required for KYC' },
  { field: 'proofOfService', label: 'Proof of service', hint: 'Photos, certifications, or portfolio showing your experience offer' },
  { field: 'proofOfPayoutAccount', label: 'Proof of payout account', hint: 'Bank statement or mobile money screenshot — speeds KYC verification' },
  { field: 'liabilityInsurance', label: 'Liability insurance policy', hint: 'Or written acknowledgment of liability acceptance' },
  { field: 'partnershipAgreement', label: 'Signed Palmera partnership agreement', hint: 'Sent by Palmera upon review' },
]

interface DocStatus { url: string; name: string; uploadedAt: string }

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
    setUploading(p => ({ ...p, [field]: 0 }))
    const storageRef = ref(storage, `partners/${uid}/documents/${field}_${Date.now()}_${file.name}`)
    const task = uploadBytesResumable(storageRef, file)
    task.on('state_changed',
      snap => setUploading(p => ({ ...p, [field]: Math.round((snap.bytesTransferred / snap.totalBytes) * 100) })),
      err => { console.error(err); setUploading(p => { const n = { ...p }; delete n[field]; return n }) },
      async () => {
        const url = await getDownloadURL(task.snapshot.ref)
        setDocs(p => ({ ...p, [field]: { url, name: file.name, uploadedAt: new Date().toISOString() } }))
        setUploading(p => { const n = { ...p }; delete n[field]; return n })
      }
    )
  }

  const uploadedCount = DOCUMENTS.filter(d => docs[d.field]?.url).length
  const allUploaded = uploadedCount === DOCUMENTS.length

  const handleSave = async () => {
    setSaving(true)
    await updatePartner(uid, { documents: docs })
    await updateSectionStatus(uid, 'documents', allUploaded ? 'complete' : uploadedCount > 0 ? 'in_progress' : 'incomplete')
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <p style={{ fontFamily: 'var(--font-sans)', color: 'rgba(190,154,86,0.8)', fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 0.5rem' }}>Legal Documents</p>
        <h1 style={{ fontFamily: 'var(--font-display)', color: 'var(--db-text)', fontSize: 'clamp(1.375rem, 3vw, 1.625rem)', fontWeight: 400, letterSpacing: '0.06em', margin: '0 0 0.375rem' }}>Verification Documents</h1>
        <p style={{ fontFamily: 'var(--font-serif)', color: 'var(--db-text-muted)', fontSize: '0.875rem', margin: 0 }}>All documents required before payments go live. PDF, JPG, or PNG accepted.</p>
      </div>
      <div style={{ background: 'var(--db-bg-card)', border: '1px solid var(--db-border-subtle)', borderRadius: '0.5rem', padding: '1rem 1.25rem', marginBottom: '1.75rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ flex: 1, height: '0.25rem', background: 'var(--db-border-subtle)', borderRadius: '0.125rem', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${(uploadedCount / DOCUMENTS.length) * 100}%`, background: '#9e763b', transition: 'width 0.4s ease' }} />
        </div>
        <span style={{ fontSize: '0.75rem', color: 'var(--db-text-muted)', fontFamily: 'var(--font-sans)', flexShrink: 0 }}>{uploadedCount} / {DOCUMENTS.length} uploaded</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.75rem' }}>
        {DOCUMENTS.map(doc => {
          const uploaded = docs[doc.field]
          const progress = uploading[doc.field]
          const isUploading = progress !== undefined
          return (
            <div key={doc.field} style={{ background: uploaded ? 'var(--db-bg-card-active)' : 'var(--db-bg-card)', border: `1px solid ${uploaded ? 'rgba(158,118,59,0.2)' : 'var(--db-border-subtle)'}`, borderRadius: '0.5rem', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '2rem', height: '2rem', borderRadius: '50%', background: uploaded ? 'rgba(158,118,59,0.15)' : 'var(--db-bg-card)', border: `1px solid ${uploaded ? 'rgba(158,118,59,0.3)' : 'var(--db-border-subtle)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.875rem', color: uploaded ? '#9e763b' : 'var(--db-text-faint)' }}>
                {uploaded ? '✓' : '○'}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '0.875rem', color: 'var(--db-text)', fontFamily: 'var(--font-sans)', margin: '0 0 0.125rem' }}>{doc.label}</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--db-text-muted)', fontFamily: 'var(--font-sans)', margin: 0 }}>{uploaded ? `Uploaded: ${uploaded.name}` : doc.hint}</p>
                {isUploading && <div style={{ marginTop: '0.375rem', height: '0.1875rem', background: 'var(--db-border-subtle)', borderRadius: '0.125rem', overflow: 'hidden' }}><div style={{ height: '100%', width: `${progress}%`, background: '#be9a56', transition: 'width 0.2s' }} /></div>}
              </div>
              <label style={{ padding: '0.4375rem 1rem', background: 'transparent', border: `1px solid ${uploaded ? 'var(--db-border-subtle)' : 'var(--db-border-gold)'}`, borderRadius: '0.25rem', color: uploaded ? 'var(--db-text-muted)' : 'var(--db-text)', fontSize: '0.75rem', fontFamily: 'var(--font-sans)', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}>
                {isUploading ? `${progress}%` : uploaded ? 'Replace' : 'Upload'}
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleUpload(doc.field, e.target.files[0])} />
              </label>
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', paddingTop: '0.5rem', borderTop: '1px solid var(--db-border-subtle)' }}>
        <button onClick={handleSave} disabled={saving || uploadedCount === 0}
          style={{ padding: '0.75rem 2rem', background: '#9e763b', border: 'none', borderRadius: '0.375rem', color: '#ebe8db', fontSize: '0.875rem', fontFamily: 'var(--font-sans)', letterSpacing: '0.06em', cursor: (saving || uploadedCount === 0) ? 'not-allowed' : 'pointer', opacity: (saving || uploadedCount === 0) ? 0.4 : 1 }}>
          {saving ? 'Saving...' : 'Save documents'}
        </button>
        {saved && <span style={{ fontSize: '0.8125rem', color: '#be9a56', fontFamily: 'var(--font-sans)' }}>✓ Saved</span>}
      </div>
    </div>
  )
}
