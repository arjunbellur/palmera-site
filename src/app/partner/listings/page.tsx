'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { usePartner } from '../PartnerContext'
import { t } from '../i18n'
import {
  getExperiencesByCompany, addExperience, deleteExperience, getOptions, addOption, saveExperienceWithOptions,
  getCompanyAdmin,
} from '@/lib/firestore'
import ConfirmDialog from '@/components/dashboard/ConfirmDialog'
import type { Experience, ExperienceStatus, Option, OptionGroup } from '@/lib/schema'
import { formatAmount } from '@/lib/money'
import { ScreenHeader, EmptyState, PrimaryButton, Skeleton, card, cardShape, eyebrow, Chip, type Tone } from '@/components/partner/ui'
import ExperienceModal from '@/components/dashboard/ExperienceModal'
import { LayoutGrid, Eye, Copy, X } from 'lucide-react'
import ListingPreview from '@/components/dashboard/ListingPreview'

const STATUS: Record<ExperienceStatus, { key: string; tone: Tone }> = {
  published: { key: 'st_published', tone: 'green' },
  draft: { key: 'st_draft', tone: 'neutral' },
  pending_review: { key: 'st_pending', tone: 'gold' },
  unpublished: { key: 'st_unpublished', tone: 'neutral' },
  archived: { key: 'st_archived', tone: 'neutral' },
}

export default function ListingsScreen() {
  const { uid, company, locale } = usePartner()
  const L = (k: string) => t(locale, k)
  const [items, setItems] = useState<Experience[]>([])
  const [rate, setRate] = useState<number | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Experience | undefined>()
  const [editingOptions, setEditingOptions] = useState<Option[]>([])
  const [loaded, setLoaded] = useState(false)

  const load = async () => {
    if (!uid || !company?.id) return
    const [exps, adm] = await Promise.all([getExperiencesByCompany(uid, company.id), getCompanyAdmin(company.id).catch(() => null)])
    setItems(exps)
    setRate(typeof adm?.commissionRate === 'number' ? adm.commissionRate : null)
    setLoaded(true)
  }
  useEffect(() => { load() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [uid, company?.id])

  const openNew = () => { setEditing(undefined); setEditingOptions([]); setShowModal(true) }
  const openEdit = async (e: Experience) => {
    setEditing(e); setEditingOptions(await getOptions(e.id!)); setShowModal(true)
  }

  const [catFilter, setCatFilter] = useState<string>('all')
  const [preview, setPreview] = useState<Experience | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft' | 'unpublished'>('all')
  const [toDelete, setToDelete] = useState<Experience | null>(null)
  const [deleting, setDeleting] = useState(false)
  const handleDelete = async () => {
    if (!toDelete?.id) return
    setDeleting(true)
    await deleteExperience(toDelete.id)
    setToDelete(null); setDeleting(false)
    await load()
  }

  // Duplicate: a full copy (options included) saved as a DRAFT — never
  // straight to published, so a copy can't silently go live.
  const [dupBusyId, setDupBusyId] = useState('')
  const duplicate = async (e: Experience) => {
    if (!e.id || dupBusyId) return
    setDupBusyId(e.id)
    const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = e as Experience & { createdAt?: unknown; updatedAt?: unknown }
    const ref = await addExperience({
      ...rest,
      title: `${e.title} (${L('dup_copy')})`,
      status: 'draft', active: false, tag: null, rating: 0, reviews: 0,
    })
    const opts = await getOptions(e.id)
    for (const o of opts) {
      const { id: _oid, ...orest } = o
      await addOption(ref.id, orest)
    }
    setDupBusyId('')
    await load()
  }

  const [toast, setToast] = useState('')

  // ONE save path shared with the onboarding editor (saveExperienceWithOptions)
  // — the two surfaces can't drift. Toast tells the partner what happened.
  const handleSave = async (data: Partial<Experience>, groups: (OptionGroup & { options: Option[] })[]) => {
    if (!company?.id) return
    const { status } = await saveExperienceWithOptions({ companyName: company.name || '', existingId: editing?.id, data, groups })
    setShowModal(false); setEditing(undefined)
    await load()
    setToast(status === 'published' ? L('t_live') : status === 'unpublished' ? L('t_unpub') : L('t_saved'))
    setTimeout(() => setToast(''), 3000)
  }

  // Jordan: filter by experience type — "if they just want to look at all
  // their activity experiences". Only categories the partner actually uses.
  const cats = [...new Set(items.map(e => e.category).filter(Boolean))] as string[]
  const byCat = catFilter === 'all' ? items : items.filter(e => e.category === catFilter)
  // Jordan/ChatGPT #11: Live / Draft / Unpublished — matters as listings grow.
  const shown = statusFilter === 'all' ? byCat : byCat.filter(e => e.status === statusFilter)
  const statusCount = (st: string) => byCat.filter(e => e.status === st).length

  return (
    <div className="pf-in">
      <ScreenHeader label={L('list_label')} title={L('list_title')} intro={L('list_intro')} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '14px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
          {items.length > 0 && ([['all', L('cat_all'), byCat.length], ['published', L('st_published'), statusCount('published')], ['draft', L('st_draft'), statusCount('draft')], ['unpublished', L('st_unpublished'), statusCount('unpublished')]] as const)
            .filter(([k, , n]) => k === 'all' || n > 0)
            .map(([k, label, n]) => (
            <button key={`s-${k}`} onClick={() => setStatusFilter(k)}
              style={{ padding: '6px 13px', borderRadius: '999px', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: '11px', letterSpacing: '0.03em',
                border: `1px solid ${statusFilter === k ? 'var(--pf-border-strong)' : 'var(--pf-border)'}`,
                background: statusFilter === k ? 'var(--pf-card)' : 'transparent',
                color: statusFilter === k ? 'var(--pf-text)' : 'var(--pf-faint)' }}>
              {label} <span style={{ opacity: 0.6 }}>{n}</span>
            </button>
          ))}
          {cats.length > 1 && <span style={{ width: '1px', height: '18px', background: 'var(--pf-border)', margin: '0 4px' }} />}
          {cats.length > 1 && [['all', L('cat_all')] as const, ...cats.map(c => [c, c] as const)].map(([k, label]) => (
            <button key={k} onClick={() => setCatFilter(k)}
              style={{ padding: '6px 13px', borderRadius: '999px', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: '11px', letterSpacing: '0.03em', textTransform: 'capitalize',
                border: `1px solid ${catFilter === k ? 'var(--pf-gold)' : 'var(--pf-border)'}`,
                background: catFilter === k ? 'rgba(190,154,86,0.14)' : 'transparent',
                color: catFilter === k ? 'var(--pf-gold)' : 'var(--pf-faint)' }}>
              {label}
            </button>
          ))}
        </div>
        <PrimaryButton onClick={openNew}>+ {L('new_listing')}</PrimaryButton>
      </div>

      {!loaded ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 15rem), 1fr))', gap: '12px' }}>
          <Skeleton height="170px" /><Skeleton height="170px" /><Skeleton height="170px" /><Skeleton height="170px" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon={<LayoutGrid size={22} strokeWidth={1.75} />} title={L('list_empty_t')} body={L('list_empty_b')}
          action={<PrimaryButton onClick={openNew}>+ {L('new_listing')}</PrimaryButton>} />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 12.5rem), 1fr))', gap: '10px' }}>
          {shown.map(e => {
            const s = STATUS[e.status] ?? STATUS.draft
            return (
              <div key={e.id} onClick={() => openEdit(e)} role="button" tabIndex={0} className="pf-glass" style={{ ...cardShape, textAlign: 'left', cursor: 'pointer', padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                <div style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 2, display: 'flex', gap: '6px' }}>
                  {/* Jordan/ChatGPT #12: see exactly what guests see, without entering the editor. */}
                  <button onClick={(ev) => { ev.stopPropagation(); setPreview(e) }} title={L('preview_guest')}
                    style={{ padding: '4px 8px', borderRadius: '7px', border: '1px solid var(--pf-border-strong)', background: 'var(--pf-sheet)', color: 'var(--pf-gold)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
                    <Eye size={12} strokeWidth={1.75} />
                  </button>
                  <button onClick={(ev) => { ev.stopPropagation(); duplicate(e) }} title={L('dup')}
                    style={{ padding: '4px 8px', borderRadius: '7px', border: '1px solid var(--pf-border-strong)', background: 'var(--pf-sheet)', color: 'var(--pf-gold)', fontFamily: 'var(--font-sans)', fontSize: '10px', cursor: 'pointer', opacity: dupBusyId === e.id ? 0.5 : 1, display: 'grid', placeItems: 'center' }}>
                    {dupBusyId === e.id ? '…' : <Copy size={12} strokeWidth={1.75} />}
                  </button>
                  <button onClick={(ev) => { ev.stopPropagation(); setToDelete(e) }} title={L('del')}
                    style={{ padding: '4px 8px', borderRadius: '7px', border: '1px solid rgba(196,124,124,0.4)', background: 'var(--pf-sheet)', color: 'var(--pf-alert)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
                    <X size={12} strokeWidth={1.75} />
                  </button>
                </div>
                {/* Compact cover (Jordan: density over drama — the full
                    app-shaped preview lives in the editor). Landscape 16:9,
                    cover-fit so it still can't stretch. */}
                <div style={{ aspectRatio: '16 / 9', background: e.img ? `center/cover no-repeat url(${e.img})` : 'var(--pf-card-solid)', display: 'grid', placeItems: 'center', position: 'relative' }}>
                  {!e.img && <span style={{ ...eyebrow, opacity: 0.6, fontSize: '9px' }}>{locale === 'fr' ? 'Sans photo' : 'No photo'}</span>}
                  {/* Status reads at a glance: LIVE is solid, everything else quiet. */}
                  <span style={{ position: 'absolute', left: '8px', bottom: '8px', fontFamily: 'var(--font-sans)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '4px 9px', borderRadius: '999px',
                    background: e.status === 'published' ? 'var(--pf-success)' : 'rgba(10,14,24,0.72)',
                    color: e.status === 'published' ? '#0a0e18' : 'var(--pf-muted)',
                    border: e.status === 'published' ? 'none' : '1px solid var(--pf-border-strong)',
                    boxShadow: e.status === 'published' ? '0 0 14px rgba(122,158,107,0.5)' : 'none', fontWeight: e.status === 'published' ? 600 : 400 }}>
                    {e.status === 'published' ? `● ${L(s.key)}` : L(s.key)}
                  </span>
                </div>
                <div style={{ padding: '10px 12px 12px', flex: 1 }}>
                  <div style={{ ...eyebrow, fontSize: '8.5px', letterSpacing: '0.1em', marginBottom: '4px' }}>
                    {[e.category, e.city].filter(Boolean).join(' · ') || '—'}
                  </div>
                  <div style={{ fontFamily: 'var(--font-serif)', color: 'var(--pf-text)', fontSize: '13.5px', lineHeight: 1.25, marginBottom: '4px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{e.title || L('untitled')}</div>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: '10.5px', color: 'var(--pf-muted)' }}>
                    {e.price != null ? `${L('from')} ${formatAmount(e.price)} XOF` : (locale === 'fr' ? 'Sur réservation' : 'Reservation only')}
                  </div>
                  {(e.needsReview?.length ?? 0) > 0 && (
                    <div style={{ marginTop: '6px' }}><Chip tone="alert">{locale === 'fr' ? 'À compléter' : 'Needs'}</Chip></div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {preview && (
        <div onClick={() => setPreview(null)} style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'var(--pf-scrim)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '18px' }}>
          <div onClick={ev => ev.stopPropagation()} className="pf-glass" style={{ width: 'min(30rem, 100%)', maxHeight: '92vh', overflowY: 'auto', borderRadius: '18px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <span style={eyebrow}>{L('preview_guest')}</span>
              <button onClick={() => setPreview(null)} style={{ background: 'transparent', border: 'none', color: 'var(--pf-faint)', cursor: 'pointer' }}><X size={16} strokeWidth={1.75} /></button>
            </div>
            <ListingPreview exp={preview} companyName={company?.name} locale={locale} />
          </div>
        </div>
      )}

      {toDelete && (
        <ConfirmDialog
          title={L('del_title')}
          note={L('del_note')}
          confirmLabel={L('del_confirm')}
          busyLabel={L('del_busy')}
          busy={deleting}
          onConfirm={handleDelete}
          onCancel={() => setToDelete(null)}
        >
          <strong style={{ color: 'var(--pf-text)' }}>{toDelete.title || L('untitled')}</strong>
        </ConfirmDialog>
      )}

      {toast && (
        <div className="pf-in" style={{ position: 'fixed', bottom: '76px', left: '50%', transform: 'translateX(-50%)', zIndex: 90, background: 'var(--pf-sheet)', border: '1px solid var(--pf-border-strong)', borderRadius: '999px', padding: '10px 20px', color: 'var(--pf-gold)', fontFamily: 'var(--font-sans)', fontSize: '12.5px', letterSpacing: '0.03em', boxShadow: '0 8px 24px rgba(0,0,0,0.35)' }}>
          {toast}
        </div>
      )}

      {showModal && company && (
        <ExperienceModal
          commissionRate={rate}
          providerId={uid}
          companyId={company.id!}
          companyName={company.name}
          defaultCategory={company.category}
          defaultCity={company.city}
          experience={editing}
          existingOptions={editingOptions}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditing(undefined) }}
        />
      )}
    </div>
  )
}
