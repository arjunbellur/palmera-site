'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthChange } from '@/lib/auth'
import { getProvider, createProvider, getCompanies } from '@/lib/firestore'
import { useLocale } from '@/lib/use-locale'
import type { Provider, Company } from '@/lib/schema'

const COMPLETENESS_KEYS = ['profile', 'listings', 'photos', 'operations', 'documents', 'payouts'] as const

const STR = {
  fr: {
    eyebrow: 'Tableau de bord partenaire', welcome: 'Bienvenue',
    sub: 'Gérez les établissements que vous exploitez sur Palmera. Chacun a ses propres annonces et versements.',
    signBanner: 'Signez la Convention de Partenariat Palmera pour activer votre compte. Une seule signature couvre tous vos établissements.',
    signCta: 'Consulter & signer →',
    yourCompanies: 'Vos établissements', addCompany: '+ Ajouter un établissement',
    noneTitle: 'Aucun établissement pour l’instant',
    noneBody: 'Ajoutez votre première activité pour proposer des expériences sur Palmera.',
    addFirst: '+ Ajouter votre premier établissement',
    untitled: 'Établissement sans nom', active: 'Actif', setup: 'Complétez votre profil',
  },
  en: {
    eyebrow: 'Partner Dashboard', welcome: 'Welcome',
    sub: 'Manage the businesses you run on Palmera. Each company has its own listings and payouts.',
    signBanner: 'Sign the Palmera Partner Agreement to activate your account. One signature covers all your companies.',
    signCta: 'Review & sign →',
    yourCompanies: 'Your companies', addCompany: '+ Add company',
    noneTitle: 'No companies yet',
    noneBody: 'Add your first business to start listing experiences on Palmera.',
    addFirst: '+ Add your first company',
    untitled: 'Untitled company', active: 'Active', setup: 'Set up your profile',
  },
}

export default function DashboardHome() {
  const router = useRouter()
  const s = STR[useLocale()]
  const [provider, setProvider] = useState<Provider | null>(null)
  const [companies, setCompanies] = useState<Company[]>([])
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthChange(async user => {
      if (!user) { router.replace('/dashboard'); return }
      setDisplayName(user.email || '')
      let [p, c] = await Promise.all([getProvider(user.uid), getCompanies(user.uid)])
      // Self-heal: an account whose provider doc was never created (e.g. signed up
      // before the rules were deployed) gets one now, so the agreement + companies work.
      if (!p) {
        await createProvider(user.uid, user.email || '')
        p = await getProvider(user.uid)
      }
      setProvider(p)
      setCompanies(c)
      if (p?.fullName) setDisplayName(p.fullName)
      setLoading(false)
    })
    return () => unsub()
  }, [router])

  if (loading) return null
  const signed = !!provider?.signoff?.signedAt

  const eyebrow: React.CSSProperties = { fontFamily: 'var(--font-sans)', color: 'rgba(190,154,86,0.8)', fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 0.5rem' }
  const addBtn: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.25rem', background: '#9e763b', border: 'none', borderRadius: '0.375rem', color: '#ebe8db', fontSize: '0.8125rem', fontFamily: 'var(--font-sans)', letterSpacing: '0.04em', cursor: 'pointer', textDecoration: 'none' }

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <p style={eyebrow}>{s.eyebrow}</p>
        <h1 style={{ fontFamily: 'var(--font-display)', color: 'var(--db-text)', fontSize: 'clamp(1.5rem, 3vw, 1.875rem)', fontWeight: 400, letterSpacing: '0.06em', margin: '0 0 0.5rem' }}>
          {s.welcome}, {displayName}
        </h1>
        <p style={{ fontFamily: 'var(--font-serif)', color: 'var(--db-text-muted)', fontSize: '0.9375rem', margin: 0 }}>
          {s.sub}
        </p>
      </div>

      {/* Agreement gate */}
      {!signed && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', background: 'var(--db-bg-banner)', border: '1px solid rgba(158,118,59,0.25)', borderRadius: '0.5rem', padding: '1rem 1.25rem', marginBottom: '1.75rem' }}>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--db-text-muted)', margin: 0, lineHeight: 1.5 }}>
            {s.signBanner}
          </p>
          <a href="/dashboard/settings" style={{ ...addBtn, flexShrink: 0 }}>{s.signCta}</a>
        </div>
      )}

      {/* Companies */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem' }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', color: 'var(--db-text)', fontSize: '1.0625rem', fontWeight: 400, margin: 0 }}>{s.yourCompanies}</h2>
        {companies.length > 0 && <a href="/dashboard/companies/new" style={addBtn}>{s.addCompany}</a>}
      </div>

      {companies.length === 0 ? (
        <div className="pf-glass" style={{ borderRadius: '0.625rem', padding: '3rem 2rem', textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--font-serif)', color: 'var(--db-text-faint)', fontSize: '1.0625rem', margin: '0 0 0.5rem' }}>{s.noneTitle}</p>
          <p style={{ fontFamily: 'var(--font-sans)', color: 'var(--db-text-ghost)', fontSize: '0.8125rem', margin: '0 0 1.5rem' }}>{s.noneBody}</p>
          <a href="/dashboard/companies/new" style={addBtn}>{s.addFirst}</a>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 18rem), 1fr))', gap: '1rem' }}>
          {companies.map(c => {
            const done = COMPLETENESS_KEYS.filter(k => c.completeness?.[k]).length
            const pct = Math.round((done / COMPLETENESS_KEYS.length) * 100)
            return (
              <a key={c.id} href={`/dashboard/companies/${c.id}`}
                className="pf-glass"
                style={{ display: 'block', textDecoration: 'none', borderRadius: '0.5rem', padding: '1.25rem 1.375rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <h3 style={{ fontFamily: 'var(--font-serif)', color: 'var(--db-text)', fontSize: '1rem', fontWeight: 500, margin: 0, letterSpacing: '0.02em' }}>{c.name || s.untitled}</h3>
                  {c.active && <span style={{ fontSize: '0.5625rem', color: '#9e763b', border: '1px solid rgba(158,118,59,0.4)', padding: '0.125rem 0.4375rem', borderRadius: '2rem', fontFamily: 'var(--font-sans)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{s.active}</span>}
                </div>
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--db-text-faint)', margin: '0 0 1rem', textTransform: 'capitalize' }}>
                  {[c.category, c.city].filter(Boolean).join(' · ') || s.setup}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ flex: 1, height: '4px', background: 'var(--db-border-subtle)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#9e763b' : '#be9a56', borderRadius: '2px' }} />
                  </div>
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', color: 'var(--db-text-muted)' }}>{done}/{COMPLETENESS_KEYS.length}</span>
                </div>
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}
