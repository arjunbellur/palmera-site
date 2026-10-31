'use client'
// "Featured tonight" curation — Jordan (2026-09-02): "still need a way to
// control what is the 'featured tonight in X location' controls". Writes
// config/featured (⚠ shared contract, SYNC-STATUS 2026-09-03): one hero
// listing per market; the app's Discover screen reads it (iOS 1.61+ /
// Android PR) and falls back to its own derived pick for cities with no entry.
//
// Layout (Arjun, 2026-10-30): this is the admin's main lever on what the app
// shows, so it sits at the TOP of the App page as a full-width gold card, one
// visual tile per market with the live pick's photo — not a row of selects
// buried under the leaderboard.
import { useEffect, useMemo, useState } from 'react'
import { getFeaturedConfig, setFeaturedCity } from '@/lib/firestore'
import { getMarkets } from '@/lib/config'
import { useAdmin } from '@/app/admin/AdminContext'
import type { Experience, FeaturedConfig, MarketsConfig } from '@/lib/schema'
import { Chip, eyebrow, fieldStyle } from '@/components/partner/ui'
import { Sparkles, ImageOff } from 'lucide-react'

export default function FeaturedPanel({ experiences }: { experiences: Experience[] }) {
  const { email } = useAdmin()
  const [markets, setMarkets] = useState<MarketsConfig['cities']>([])
  const [featured, setFeatured] = useState<FeaturedConfig['byCity']>({})
  const [loaded, setLoaded] = useState(false)
  const [busyCity, setBusyCity] = useState('')
  const [error, setError] = useState('')
  const [justSaved, setJustSaved] = useState('')

  useEffect(() => {
    Promise.all([getMarkets(), getFeaturedConfig()]).then(([m, f]) => {
      setMarkets((m?.cities ?? []).filter(c => c.enabled))
      setFeatured(f?.byCity || {})
      setLoaded(true)
    }).catch(() => { setError('Could not load the featured configuration.'); setLoaded(true) })
  }, [])

  const published = useMemo(() => experiences.filter(e => e.status === 'published'), [experiences])
  const byCity = (cityId: string) => published.filter(e => (e.city || '').toLowerCase() === cityId.toLowerCase())
  const byId = useMemo(() => new Map(published.map(e => [e.id!, e])), [published])

  const pick = async (cityId: string, experienceId: string) => {
    setBusyCity(cityId); setError('')
    const prev = featured
    setFeatured(f => {
      const next = { ...f }
      if (experienceId) next[cityId] = { experienceId }
      else delete next[cityId]
      return next
    })
    try {
      await setFeaturedCity(cityId, experienceId || null, email)
      setJustSaved(cityId); setTimeout(() => setJustSaved(''), 2500)
    } catch { setFeatured(prev); setError('Could not save — try again.') }
    setBusyCity('')
  }

  if (!loaded) return null
  const activeCount = markets.filter(c => featured[c.id]?.experienceId && byId.has(featured[c.id].experienceId)).length
  // Markets with listings first, so the ones an admin can act on are in view.
  const ordered = [...markets].sort((a, b) => Number(byCity(b.id).length > 0) - Number(byCity(a.id).length > 0))

  return (
    <section className="pf-glass-gold" style={{ borderRadius: '18px', padding: '20px 22px 18px', marginBottom: '26px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap', marginBottom: '14px' }}>
        <div>
          <p style={{ ...eyebrow, margin: '0 0 6px' }}>Curation · changes the app for every member</p>
          <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--pf-head)', fontSize: '1.375rem', fontWeight: 400, letterSpacing: '0.03em', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Sparkles size={18} strokeWidth={1.75} style={{ color: 'var(--pf-gold)' }} /> Featured tonight
          </h2>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '12.5px', color: 'var(--pf-muted)', margin: '8px 0 0', lineHeight: 1.6, maxWidth: '44rem' }}>
            The hero at the top of the app’s Discover screen, one per city. Pick a listing and it is live on the next refresh, about half a minute. “App decides” hands the choice back to the app.
          </p>
        </div>
        <Chip tone={activeCount ? 'green' : 'neutral'}>{activeCount ? `● ${activeCount} ${activeCount === 1 ? 'city' : 'cities'} curated` : 'App decides everywhere'}</Chip>
      </div>

      {error && <p style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: 'var(--pf-alert)', margin: '0 0 12px' }}>{error}</p>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 15.5rem), 1fr))', gap: '12px' }}>
        {ordered.map(city => {
          const options = byCity(city.id)
          const chosenId = featured[city.id]?.experienceId || ''
          const chosen = chosenId ? byId.get(chosenId) : undefined
          const chosenGone = !!chosenId && !chosen
          const busy = busyCity === city.id
          const none = options.length === 0
          return (
            <div key={city.id} style={{ borderRadius: '14px', border: `1px solid ${chosen ? 'var(--pf-gold)' : 'var(--pf-border)'}`, background: 'var(--pf-card-solid)', overflow: 'hidden', opacity: none ? 0.55 : 1, display: 'flex', flexDirection: 'column' }}>
              {/* The live pick, as the member sees it: photo + title. */}
              <div style={{ position: 'relative', aspectRatio: '16 / 7', background: chosen?.img ? `center/cover no-repeat url(${chosen.img})` : 'var(--pf-card)', display: 'grid', placeItems: 'center' }}>
                {!chosen && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-sans)', fontSize: '11px', color: 'var(--pf-faint)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    <ImageOff size={13} strokeWidth={1.75} /> {none ? 'No live listings' : chosenGone ? 'Pick unpublished' : 'App decides'}
                  </span>
                )}
                {chosen && <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,14,24,0.85), rgba(10,14,24,0) 60%)' }} />}
                <div style={{ position: 'absolute', left: '10px', right: '10px', bottom: '8px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '8px' }}>
                  <span style={{ fontFamily: 'var(--font-serif)', fontSize: '13.5px', color: chosen ? '#fff' : 'var(--pf-text)', textShadow: chosen ? '0 1px 6px rgba(0,0,0,0.6)' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {chosen ? chosen.title : ''}
                  </span>
                  {chosen && !busy && <Chip tone="green">● Live</Chip>}
                  {busy && <Chip tone="neutral">Saving…</Chip>}
                  {!busy && justSaved === city.id && <Chip tone="gold">Saved ✓</Chip>}
                </div>
              </div>
              <div style={{ padding: '10px 12px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: '12.5px', color: 'var(--pf-text)', letterSpacing: '0.02em' }}>{city.name}</span>
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: '10.5px', color: 'var(--pf-faint)' }}>{options.length} live</span>
                </div>
                <select value={chosenGone ? '' : chosenId} disabled={busy || none} aria-label={`Featured tonight in ${city.name}`}
                  onChange={(e) => pick(city.id, e.target.value)}
                  style={{ ...fieldStyle, width: '100%', padding: '8px 10px', fontSize: '12.5px', cursor: none ? 'not-allowed' : 'pointer' }}>
                  <option value="">App decides (default)</option>
                  {options.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
                </select>
                {chosenGone && <p style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', color: 'var(--pf-alert)', margin: '6px 0 0' }}>The chosen listing is no longer published — pick another.</p>}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
