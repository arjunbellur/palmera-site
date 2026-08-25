'use client'
// Supplier home = inventory. Products marked "live" appear in the partner
// marketplace (phase 2); stock and price edits are the supplier's daily loop.
import { useEffect, useState, useCallback } from 'react'
import { useSupplier } from './SupplierContext'
import { t } from './i18n'
import type { SupplyProduct } from '@/lib/schema'
import { getProductsBySupplier, updateSupplyProduct, deleteSupplyProduct } from '@/lib/firestore'
import ProductModal from '@/components/supplier/ProductModal'
import { ScreenHeader, PrimaryButton, GhostButton, Chip, EmptyState, Skeleton, cardShape, SearchInput } from '@/components/partner/ui'
import { Package } from 'lucide-react'
import { formatAmount } from '@/lib/money'

const fmtXof = formatAmount

export default function SupplierInventory() {
  const { supplier, uid, locale } = useSupplier()
  const L = useCallback((k: string) => t(locale, k), [locale])
  const [products, setProducts] = useState<SupplyProduct[] | null>(null)
  const [modal, setModal] = useState<{ open: boolean; product: SupplyProduct | null }>({ open: false, product: null })
  const [q, setQ] = useState('')

  const load = useCallback(async () => {
    if (!supplier?.id) return
    setProducts(await getProductsBySupplier(supplier.id))
  }, [supplier?.id])
  useEffect(() => { load() }, [load])

  const toggle = async (p: SupplyProduct) => {
    await updateSupplyProduct(p.id!, { status: p.status === 'live' ? 'hidden' : 'live' })
    load()
  }
  const remove = async (p: SupplyProduct) => {
    if (!window.confirm(L('delete_confirm'))) return
    await deleteSupplyProduct(p.id!)
    load()
  }

  if (!supplier) return null

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '14px', flexWrap: 'wrap' }}>
        <ScreenHeader label={L('inv_label')} title={L('inv_title')} intro={L('inv_intro')} />
        <div style={{ paddingBottom: '18px' }}>
          <PrimaryButton onClick={() => setModal({ open: true, product: null })}>{L('add_product')}</PrimaryButton>
        </div>
      </div>

      {products === null ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(15rem, 1fr))', gap: '14px' }}>
          {[0, 1, 2].map(i => <Skeleton key={i} height="10rem" />)}
        </div>
      ) : products.length === 0 ? (
        <EmptyState icon={<Package size={22} strokeWidth={1.75} />} title={L('empty_title')} body={L('empty_body')}
          action={<PrimaryButton onClick={() => setModal({ open: true, product: null })}>{L('add_product')}</PrimaryButton>} />
      ) : (
        <>
        {products.length > 4 && <div style={{ marginBottom: '14px' }}><SearchInput value={q} onChange={setQ} placeholder={L('search_products')} /></div>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(15rem, 1fr))', gap: '14px' }}>
          {[...products].filter(p => !q.trim() || p.name.toLowerCase().includes(q.trim().toLowerCase())).sort((a, b) => a.name.localeCompare(b.name)).map(p => (
            <div key={p.id} className="pf-glass" style={{ ...cardShape, display: 'flex', flexDirection: 'column', gap: '10px', opacity: p.status === 'hidden' ? 0.6 : 1 }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <span style={{ width: '52px', height: '52px', borderRadius: '12px', background: 'var(--pf-green-soft)', flexShrink: 0, overflow: 'hidden', display: 'grid', placeItems: 'center', color: 'var(--pf-gold)', fontSize: '18px' }}>
                  {p.photo ? <img loading="lazy" decoding="async" src={p.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Package size={18} strokeWidth={1.75} />}
                </span>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontFamily: 'var(--font-serif)', color: 'var(--pf-head)', fontSize: '14.5px', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
                  <p style={{ fontFamily: 'var(--font-sans)', color: 'var(--pf-faint)', fontSize: '11.5px', margin: '2px 0 0' }}>{p.unitSize ? `${p.unitSize} · ` : ''}{p.unit}</p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: 'var(--font-display)', color: 'var(--pf-text)', fontSize: '17px' }}>{fmtXof(p.price)} <span style={{ fontSize: '11px', color: 'var(--pf-faint)' }}>XOF</span></span>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '11.5px', color: p.stock > 0 ? 'var(--pf-muted)' : 'var(--pf-red)' }}>{L('stock')}: {p.stock}</span>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: 'auto', flexWrap: 'wrap' }}>
                <Chip tone={p.status === 'live' ? 'green' : 'neutral'}>{p.status === 'live' ? L('live') : L('hidden')}</Chip>
                <span style={{ flex: 1 }} />
                <GhostButton onClick={() => setModal({ open: true, product: p })}>{L('edit')}</GhostButton>
                <GhostButton onClick={() => toggle(p)}>{p.status === 'live' ? L('hide') : L('show')}</GhostButton>
                <GhostButton tone="alert" onClick={() => remove(p)}>✕</GhostButton>
              </div>
            </div>
          ))}
        </div>
        </>
      )}

      {modal.open && (
        <ProductModal supplier={supplier} product={modal.product} storageUid={uid}
          labels={{
            title: L(modal.product ? 'm_title_edit' : 'm_title_new'),
            name: L('m_name'), category: L('m_category'), unit: L('m_unit'),
            unitSize: L('m_unit_size'), price: L('m_price'), stock: L('m_stock'),
            photo: L('m_photo'), visible: L('m_visible'), save: L('m_save'),
            cancel: L('m_cancel'), saving: L('m_saving'),
          }}
          onClose={() => setModal({ open: false, product: null })}
          onSaved={() => { setModal({ open: false, product: null }); load() }} />
      )}
    </>
  )
}
