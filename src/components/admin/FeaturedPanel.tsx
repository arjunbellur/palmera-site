'use client'
// "Featured tonight" curation — Jordan (2026-09-02): "still need a way to
// control what is the 'featured tonight in X location' controls". Writes
// config/featured (⚠ shared contract, SYNC-STATUS 2026-09-03): one hero
// listing per market; the app's Discover screen reads it and falls back to
// its own derived pick for cities with no entry.
import { useEffect, useMemo, useState } from 'react'
import { getFeaturedConfig, setFeaturedCity } from '@/lib/firestore'
import { getMarkets } from '@/lib/config'
import { useAdmin } from '@/app/admin/AdminContext'
import type { Experience, FeaturedConfig, MarketsConfig } from '@/lib/schema'
import { Chip, SectionTitle, fieldStyle } from '@/components/partner/ui'
import { glass } from '@/app/admin/ui'
import { Sparkles } from 'lucide-react'

export default function FeaturedPanel({ experiences }: { experiences: Experience[] }) {
  const { email } = useAdmin()
  const [markets, setMarkets] = useState<MarketsConfig['cities']>([])
  const [featured, setFeatured] = useState<FeaturedConfig['byCity']>({})
  const [loaded, setLoaded] = useState(false)
  const [busyCity, setBusyCity] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([getMarkets(), getFeaturedConfig()]).then(([m, f]) => {
      setMarkets((m?.cities ?? []).filter(c => c.enabled))
      setFeatured(f?.byCity || {})
      setLoaded(true)
    }).catch(() => { setError('Could not load the featured configuration.'); setLoaded(true) })
  }, [])

  const published = useMemo(() => experiences.filter(e => e.status === 'published'), [experiences])
  const byCity = (cityId: string) => published.filter(e => (e.city || '').toLowerCase() === cityId.toLowerCase())

  const pick = async (cityId: string, experienceId: string) => {
    setBusyCity(cityId); setError('')
    const prev = featured
    setFeatured(f => {
      const next = { ...f }
      if (experienceId) next[cityId] = { experienceId }
      else delete next[cityId]
      return next
    })
    try { await setFeaturedCity(cityId, experienceId || null, email) }
    catch { setFeatured(prev); setError('Could not save — try again.') }
    setBusyCity('')
  }

  if (!loaded) return null
  return (
    <div style={{ marginTop: '28px' }}>
      <SectionTitle><Sparkles size={13} strokeWidth={1.75} style={{ verticalAlign: '-2px' }} /> Featured tonight</SectionTitle>
      <div style={{ ...glass, padding: '18px' }}>
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: 'var(--pf-faint)', margin: '0 0 14px', lineHeight: 1.6 }}>
          The hero at the top of the app’s Discover screen, per city. “App decides” keeps the app’s automatic pick.
          Takes effect once Samson’s next build reads <code>config/featured</code>.
        </p>
        {error && <p style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: 'var(--pf-alert)', margin: '0 0 12px' }}>{error}</p>}
        <div style={{ display: 'grid', gap: '12px' }}>
          {markets.map(city => {
            const options = byCity(city.id)
            const chosen = featured[city.id]?.experienceId || ''
            const chosenGone = !!chosen && !options.some(e => e.id === chosen)
            return (
              <div key={city.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: 'var(--pf-text)', minWidth: '7rem' }}>{city.name}</span>
                <select value={chosenGone ? '' : chosen} disabled={busyCity === city.id}
                  onChange={(e) => pick(city.id, e.target.value)}
                  style={{ ...fieldStyle, maxWidth: '22rem', flex: 1 }}>
                  <option value="">App decides (default)</option>
                  {options.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
                </select>
                {busyCity === city.id && <Chip tone="neutral">Saving…</Chip>}
                {chosenGone && <Chip tone="alert">chosen listing is no longer published — cleared on next save</Chip>}
                {options.length === 0 && <Chip tone="neutral">no published listings in this city</Chip>}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
