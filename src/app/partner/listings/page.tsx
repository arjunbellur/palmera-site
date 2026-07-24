'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { usePartner } from '../PartnerContext'
import { t } from '../i18n'
import {
  getExperiencesByCompany, addExperience, updateExperience, getOptions, addOption, deleteOption,
} from '@/lib/firestore'
import type { Experience, ExperienceStatus, Option, OptionGroup } from '@/lib/schema'
import { formatAmount } from '@/lib/money'
import { ScreenHeader, EmptyState, PrimaryButton, card, eyebrow, Chip, type Tone } from '@/components/partner/ui'
import ExperienceModal from '@/components/dashboard/ExperienceModal'

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
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Experience | undefined>()
  const [editingOptions, setEditingOptions] = useState<Option[]>([])

  const load = async () => {
    if (!uid || !company?.id) return
    setItems(await getExperiencesByCompany(uid, company.id))
  }
  useEffect(() => { load() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [uid, company?.id])

  const openNew = () => { setEditing(undefined); setEditingOptions([]); setShowModal(true) }
  const openEdit = async (e: Experience) => {
    setEditing(e); setEditingOptions(await getOptions(e.id!)); setShowModal(true)
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

  // Mirrors the onboarding save path so both surfaces write identical documents.
  const handleSave = async (data: Partial<Experience>, groups: (OptionGroup & { options: Option[] })[]) => {
    if (!company?.id) return
    const paidOption = groups.some(g => g.options.some(o => (o.price || 0) > 0))
    const isPaid = data.mode === 'paid'
    const needsReview = [
      ...(!data.img ? ['photos'] : []),
      ...(!data.mapsLink ? ['coords'] : []),
    ]
    const finalData: Partial<Experience> = {
      ...data,
      price: isPaid ? (data.price ?? null) : null,
      currency: isPaid || paidOption ? 'XOF' : null,
      guests: data.minGuests != null && data.maxGuests != null ? `${data.minGuests}–${data.maxGuests}` : '',
      provider: company.name || '',
      needsReview,
    }
    let id = editing?.id
    if (id) await updateExperience(id, finalData)
    else { const ref = await addExperience(finalData); id = ref.id }

    const existing = await getOptions(id!)
    await Promise.all(existing.map(o => deleteOption(id!, o.id!)))
    for (const g of groups) {
      for (const o of g.options) {
        const { id: _oid, ...rest } = o as Option & { _isNew?: boolean }
        delete (rest as { _isNew?: boolean })._isNew
        await addOption(id!, rest)
      }
    }
    setShowModal(false); setEditing(undefined)
    await load()
  }

  return (
    <div className="pf-in">
      <ScreenHeader label={L('list_label')} title={L('list_title')} intro={L('list_intro')} />

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '14px' }}>
        <PrimaryButton onClick={openNew}>+ {L('new_listing')}</PrimaryButton>
      </div>

      {items.length === 0 ? (
        <EmptyState icon="▦" title={L('list_empty_t')} body={L('list_empty_b')}
          action={<PrimaryButton onClick={openNew}>+ {L('new_listing')}</PrimaryButton>} />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 17rem), 1fr))', gap: '12px' }}>
          {items.map(e => {
            const s = STATUS[e.status] ?? STATUS.draft
            return (
              <div key={e.id} onClick={() => openEdit(e)} role="button" tabIndex={0} style={{ ...card, textAlign: 'left', cursor: 'pointer', padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                <button onClick={(ev) => { ev.stopPropagation(); duplicate(e) }} title={L('dup')}
                  style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 2, padding: '5px 10px', borderRadius: '8px', border: '1px solid var(--pf-border-strong)', background: 'var(--pf-sheet)', color: 'var(--pf-gold)', fontFamily: 'var(--font-sans)', fontSize: '10.5px', cursor: 'pointer', opacity: dupBusyId === e.id ? 0.5 : 1 }}>
                  {dupBusyId === e.id ? '…' : `⧉ ${L('dup')}`}
                </button>
                <div style={{ height: '110px', background: e.img ? `center/cover url(${e.img})` : 'var(--pf-card-solid)', display: 'grid', placeItems: 'center' }}>
                  {!e.img && <span style={{ ...eyebrow, opacity: 0.6 }}>{locale === 'fr' ? 'Sans photo' : 'No photo'}</span>}
                </div>
                <div style={{ padding: '14px 16px', flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flexWrap: 'wrap', marginBottom: '7px' }}>
                    <span style={{ ...eyebrow, textTransform: 'capitalize' }}>{e.category || '—'}</span>
                    <Chip tone={s.tone}>{L(s.key)}</Chip>
                  </div>
                  <div style={{ fontFamily: 'var(--font-serif)', color: 'var(--pf-text)', fontSize: '14.5px', marginBottom: '6px' }}>{e.title || 'Untitled'}</div>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: '11.5px', color: 'var(--pf-muted)' }}>
                    {e.price != null ? `${L('from')} ${formatAmount(e.price)} XOF` : (locale === 'fr' ? 'Sur réservation' : 'Reservation only')}
                  </div>
                  {(e.needsReview?.length ?? 0) > 0 && (
                    <div style={{ marginTop: '8px' }}><Chip tone="alert">{locale === 'fr' ? 'À compléter' : 'Needs'}: {e.needsReview!.join(', ')}</Chip></div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showModal && company && (
        <ExperienceModal
          providerId={uid}
          companyId={company.id!}
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
