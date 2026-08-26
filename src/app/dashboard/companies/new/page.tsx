'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthChange } from '@/lib/auth'
import { createCompany } from '@/lib/firestore'
import CompanyForm, { type CompanyFormValues } from '@/components/dashboard/CompanyForm'
import { useLocale } from '@/lib/use-locale'

const STR = {
  fr: {
    back: 'Aperçu', eyebrow: 'Nouvel établissement', title: 'Ajouter un établissement',
    sub: 'Un établissement est une activité que vous gérez. Vous pourrez en ajouter d’autres plus tard — chacun a ses propres annonces et versements.',
    submit: 'Créer l’établissement',
  },
  en: {
    back: 'Overview', eyebrow: 'New Business', title: 'Add a company',
    sub: 'A company is one business you run. You can add more later — each has its own listings and payouts.',
    submit: 'Create company',
  },
}

export default function NewCompanyPage() {
  const router = useRouter()
  const s = STR[useLocale()]
  const [uid, setUid] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const unsub = onAuthChange(user => {
      if (!user) { router.replace('/dashboard'); return }
      setUid(user.uid)
    })
    return () => unsub()
  }, [router])

  const handleSubmit = async (values: CompanyFormValues) => {
    if (!uid) return
    setSaving(true)
    const ref = await createCompany(uid, { ...values, completeness: { profile: true } })
    router.replace(`/dashboard/companies/${ref.id}`)
  }

  return (
    <div>
      <a href="/dashboard/home" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', textDecoration: 'none', color: 'var(--db-text-faint)', fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '1.5rem' }}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M7.5 2L3.5 6L7.5 10" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" /></svg>
        {s.back}
      </a>
      <div style={{ marginBottom: '2rem' }}>
        <p style={{ fontFamily: 'var(--font-sans)', color: 'rgba(190,154,86,0.8)', fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 0.5rem' }}>{s.eyebrow}</p>
        <h1 className="pf-title-sheen" style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.6rem, 3.4vw, 2.1rem)', fontWeight: 600, letterSpacing: '0.03em', margin: '0 0 0.5rem' }}>{s.title}</h1>
        <p style={{ fontFamily: 'var(--font-serif)', color: 'var(--db-text-muted)', fontSize: '0.875rem', margin: 0 }}>{s.sub}</p>
      </div>
      <CompanyForm submitLabel={s.submit} saving={saving} onSubmit={handleSubmit} />
    </div>
  )
}
