'use client'
// Admin — how the app FILES every listing. One row per experience with the
// pair the app shows it under (stored `mainCategory`/`subcategory`, or the
// classifier's suggestion when the partner hasn't chosen yet), editable
// inline. Admin-only; the same six mains + 37 subs as iOS 1.55 / Android 3.3.
import { useMemo, useState } from 'react'
import { getAllExperiencesAdmin, getAllCompanies, updateExperience } from '@/lib/firestore'
import { useSWRLite } from '@/lib/swr-lite'
import ConfirmDialog from '@/components/dashboard/ConfirmDialog'
import { ScreenHeader, Chip, EmptyState, Skeleton, GhostButton, PrimaryButton, eyebrow } from '@/components/partner/ui'
import { CountTile, FilterChip, inputStyle, glass } from '../ui'
import {
  MAIN_CATEGORIES, SUBCATEGORIES, classifyListing, isMainCategoryId, isSubcategoryId, mainOfSub,
  subcategoriesFor, legacyCategoryFor, categoryLabel, type MainCategoryId,
} from '@/lib/categories'
import type { Experience } from '@/lib/schema'
import { Tags } from 'lucide-react'

type Pair = { main: MainCategoryId; sub: string | null }
type MainFilter = 'all' | 'unfiled' | MainCategoryId
type StatusFilter = 'live' | 'all'

const SUB_LABEL = new Map(SUBCATEGORIES.map((s) => [s.id, s.en]))

/** What the app shows this listing under today. */
function effectivePair(e: Experience): { pair: Pair; stored: boolean } {
  const main = e.mainCategory, sub = e.subcategory
  if (isMainCategoryId(main)) {
    const okSub = isSubcategoryId(sub) && mainOfSub(sub) === main ? sub : null
    return { pair: { main, sub: okSub }, stored: true }
  }
  return { pair: suggestionFor(e), stored: false }
}
function suggestionFor(e: Experience): Pair {
  const x = e as Experience & { subtitle?: string; tagline?: string; tags?: string[] }
  return classifyListing({ category: e.category, title: e.title, subtitle: x.subtitle ?? x.tagline, tag: e.tag, tags: Array.isArray(x.tags) ? x.tags : null })
}

function CategoriesSkeleton() {
  return (
    <div className="pf-in">
      <Skeleton height="74px" style={{ maxWidth: '30rem', marginBottom: '22px' }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        <Skeleton height="86px" /><Skeleton height="86px" /><Skeleton height="86px" />
      </div>
      <div style={{ display: 'grid', gap: '10px' }}>{[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} height="64px" />)}</div>
    </div>
  )
}

export default function AdminCategories() {
  // Cached across visits (stale-while-revalidate); saves patch `data` in place.
  const { data, loaded, error: loadError, setData } = useSWRLite('admin:categories', async () => {
    const [es, cs] = await Promise.all([getAllExperiencesAdmin(), getAllCompanies()])
    return { exps: es, companyName: Object.fromEntries(cs.map((c) => [c.id!, c.name || 'Untitled company'])) as Record<string, string> }
  }, [])
  const exps: Experience[] = data?.exps ?? []
  const companyName: Record<string, string> = data?.companyName ?? {}
  const patchExp = (id: string, patch: Partial<Experience>) =>
    setData((d) => d && { ...d, exps: d.exps.map((x) => (x.id === id ? { ...x, ...patch } : x)) })
  const [error, setError] = useState('')

  const [mainFilter, setMainFilter] = useState<MainFilter>('all')
  const [status, setStatus] = useState<StatusFilter>('live')
  const [q, setQ] = useState('')

  // Unsaved inline edits, per listing.
  const [drafts, setDrafts] = useState<Record<string, Pair>>({})
  const [savingId, setSavingId] = useState('')
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkBusy, setBulkBusy] = useState(false)
  const [bulkDone, setBulkDone] = useState(0)

  const rows = useMemo(() => exps.map((e) => ({ e, ...effectivePair(e), suggestion: suggestionFor(e) })), [exps])
  const inScope = status === 'live' ? rows.filter((r) => r.e.status === 'published') : rows
  const unfiled = inScope.filter((r) => !r.stored)
  const needle = q.trim().toLowerCase()
  const shown = inScope.filter((r) => {
    if (mainFilter === 'unfiled' && r.stored) return false
    if (mainFilter !== 'all' && mainFilter !== 'unfiled' && r.pair.main !== mainFilter) return false
    if (needle) {
      const hay = `${r.e.title} ${companyName[r.e.companyId] ?? ''} ${r.e.category} ${r.e.city}`.toLowerCase()
      if (!hay.includes(needle)) return false
    }
    return true
  }).sort((a, b) => Number(a.stored) - Number(b.stored) || a.e.title.localeCompare(b.e.title))
  const countFor = (m: MainCategoryId) => inScope.filter((r) => r.pair.main === m).length

  const draftOf = (id: string, fallback: Pair): Pair => drafts[id] ?? fallback
  const setDraft = (id: string, pair: Pair) => setDrafts((d) => ({ ...d, [id]: pair }))
  const dirty = (id: string, stored: boolean, current: Pair) => {
    const d = drafts[id]
    if (!d) return !stored          // an unfiled listing can always be saved as-is (= store the suggestion)
    return d.main !== current.main || (d.sub ?? null) !== (current.sub ?? null) || !stored
  }

  const save = async (e: Experience, pair: Pair) => {
    if (!e.id || savingId) return
    setSavingId(e.id); setError('')
    try {
      // The legacy `category` only moves when the MAIN moved (Android 3.3
      // still places by it); otherwise the partner's original stays.
      const legacyMain = classifyListing({ category: e.category }).main
      const patch: Partial<Experience> = { mainCategory: pair.main, subcategory: pair.sub as Experience['subcategory'] }
      if (legacyMain !== pair.main) patch.category = legacyCategoryFor(pair.main, pair.sub)
      await updateExperience(e.id, patch)
      patchExp(e.id, patch)
      setDrafts((d) => { const { [e.id!]: _gone, ...rest } = d; return rest })
    } catch { setError(`Could not save “${e.title}”. Try again.`) }
    setSavingId('')
  }

  // Bulk: persist the classifier's suggestion on every unfiled listing in
  // scope. Writes exactly what the app already derives → invisible to members.
  const runBulk = async () => {
    setBulkBusy(true); setBulkDone(0); setError('')
    let n = 0
    for (const r of unfiled) {
      if (!r.e.id) continue
      try {
        const patch: Partial<Experience> = { mainCategory: r.suggestion.main, subcategory: r.suggestion.sub as Experience['subcategory'] }
        await updateExperience(r.e.id, patch)
        patchExp(r.e.id, patch)
        setBulkDone(++n)
      } catch { setError(`Stopped at “${r.e.title}” — ${n} saved. Reload and run again for the rest.`); break }
    }
    setBulkBusy(false); setBulkOpen(false)
  }

  if (!loaded) return <CategoriesSkeleton />

  return (
    <div className="pf-in">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap' }}>
        <ScreenHeader label="Catalogue" title="Listings & categories" intro="Every live listing and where it appears in the app. Unfiled listings show the app's own guess — save it, or pick the right place." />
        {unfiled.length > 0 && (
          <span style={{ marginTop: '4px' }}>
            <PrimaryButton onClick={() => setBulkOpen(true)}>File {unfiled.length} unfiled as suggested</PrimaryButton>
          </span>
        )}
      </div>

      <div className="pf-cols">
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '18px' }}>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search listing, business, city…" style={{ ...inputStyle, maxWidth: '24rem' }} />
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{ ...eyebrow, marginRight: '2px' }}>Show</span>
                <FilterChip active={status === 'live'} onClick={() => setStatus('live')}>Live only</FilterChip>
                <FilterChip active={status === 'all'} onClick={() => setStatus('all')}>All statuses</FilterChip>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{ ...eyebrow, marginRight: '2px' }}>Filed under</span>
                <FilterChip active={mainFilter === 'unfiled'} onClick={() => setMainFilter(mainFilter === 'unfiled' ? 'all' : 'unfiled')}>Unfiled · {unfiled.length}</FilterChip>
                {MAIN_CATEGORIES.map((m) => (
                  <FilterChip key={m.id} active={mainFilter === m.id} onClick={() => setMainFilter(mainFilter === m.id ? 'all' : m.id)}>{m.en} · {countFor(m.id)}</FilterChip>
                ))}
              </div>
            </div>
          </div>

          {(error || !!loadError) && <p style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: 'var(--pf-alert)', margin: '0 0 12px' }}>{error || 'Could not load listings.'}</p>}

          {shown.length === 0 ? (
            <EmptyState icon={<Tags size={22} strokeWidth={1.75} />} title="No listings match" body="Try clearing a filter or changing the search."
              action={<GhostButton onClick={() => { setQ(''); setMainFilter('all'); setStatus('all') }}>Clear filters</GhostButton>} />
          ) : (
            <div className="pf-glass" style={{ ...glass, padding: 0, overflow: 'hidden' }}>
              {shown.map((r, i) => {
                const id = r.e.id!
                const d = draftOf(id, r.pair)
                const subs = subcategoriesFor(d.main)
                const canSave = dirty(id, r.stored, r.pair) && savingId !== id
                return (
                  <div key={id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap', padding: '13px 20px', borderBottom: i < shown.length - 1 ? '1px solid var(--pf-border)' : 'none' }}>
                    <div style={{ minWidth: 0, flex: '1 1 16rem' }}>
                      <div style={{ fontFamily: 'var(--font-serif)', fontSize: '14px', color: 'var(--pf-text)', marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        {r.e.title || 'Untitled'}
                        {r.e.status !== 'published' && <Chip tone="neutral">{r.e.status}</Chip>}
                        {r.stored ? <Chip tone="green">Filed</Chip> : <Chip tone="gold">App's guess</Chip>}
                      </div>
                      <div style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', color: 'var(--pf-faint)' }}>
                        {companyName[r.e.companyId] ?? '—'} · {r.e.city || '—'} · legacy <span style={{ textTransform: 'capitalize' }}>{r.e.category || '—'}</span>
                        {r.stored && (r.suggestion.main !== r.pair.main || (r.suggestion.sub ?? null) !== (r.pair.sub ?? null)) && (
                          <> · app would guess {categoryLabel(r.suggestion.main, r.suggestion.sub, 'en')}</>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <select value={d.main} aria-label="Main category"
                        onChange={(ev) => {
                          const main = ev.target.value as MainCategoryId
                          const keep = d.sub && mainOfSub(d.sub) === main ? d.sub : null
                          setDraft(id, { main, sub: keep ?? (main === r.suggestion.main ? r.suggestion.sub : null) })
                        }}
                        style={{ ...inputStyle, width: 'auto', minWidth: '10rem', padding: '7px 10px' }}>
                        {MAIN_CATEGORIES.map((m) => <option key={m.id} value={m.id}>{m.en}</option>)}
                      </select>
                      <select value={d.sub ?? ''} aria-label="Subcategory" onChange={(ev) => setDraft(id, { main: d.main, sub: ev.target.value || null })}
                        style={{ ...inputStyle, width: 'auto', minWidth: '11rem', padding: '7px 10px' }}>
                        <option value="">— no subcategory —</option>
                        {subs.map((s) => <option key={s.id} value={s.id}>{SUB_LABEL.get(s.id)}</option>)}
                      </select>
                      <GhostButton tone={canSave ? 'gold' : 'neutral'} disabled={!canSave} onClick={() => save(r.e, d)}>
                        {savingId === id ? 'Saving…' : r.stored ? 'Save' : 'File here'}
                      </GhostButton>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="pf-rail" style={{ minWidth: 0 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', gap: '12px' }}>
            <CountTile label={status === 'live' ? 'Live listings' : 'Listings'} value={inScope.length} />
            <CountTile label="Filed" value={inScope.length - unfiled.length} tone="gold" />
            <CountTile label="Unfiled" value={unfiled.length} tone={unfiled.length ? 'alert' : undefined} />
          </div>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', color: 'var(--pf-faint)', lineHeight: 1.5, marginTop: '14px' }}>
            “Filed” = the listing carries its own main + subcategory, so the app no longer has to guess from the title. Filing an unfiled listing as suggested changes nothing members see. Moving a listing to another main also updates its legacy category, which the Android 3.3 build still reads.
          </p>
        </div>
      </div>

      {bulkOpen && (
        <ConfirmDialog locale="en" title={`File ${unfiled.length} listings as the app suggests?`}
          confirmLabel="File them" busyLabel={`Filing… ${bulkDone}/${unfiled.length}`} busy={bulkBusy}
          onConfirm={runBulk} onCancel={() => !bulkBusy && setBulkOpen(false)}
          note="Writes mainCategory + subcategory only. Legacy categories and everything else stay as they are.">
          Each listing gets exactly the pair the app already derives for it today, so nothing moves for members — the pair just becomes editable here and in the partner's editor.
        </ConfirmDialog>
      )}
    </div>
  )
}
