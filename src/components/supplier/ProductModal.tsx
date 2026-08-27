'use client'
// Create/edit one supply product. Shared by the supplier portal (uploads to
// the supplier's own storage path) and the admin concierge flow (uploads to
// the ACTING ADMIN's path via storageUid — a supplier's folder isn't the
// admin's to write; the product stores plain download URLs either way).
import { useState } from 'react'
import type { Supplier, SupplyProduct } from '@/lib/schema'
import { addSupplyProduct, updateSupplyProduct } from '@/lib/firestore'
import PhotoUpload from '@/components/dashboard/PhotoUpload'
import { PrimaryButton, GhostButton } from '@/components/partner/ui'
import PriceInput from '@/components/dashboard/PriceInput'
import { useEscape } from '@/lib/use-escape'

const UNITS = ['bottle', 'case', 'crate', 'pack', 'unit'] as const
const CATEGORIES = ['alcohol'] as const // grows via config/marketplace later

const field: React.CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: '10px',
  border: '1px solid var(--pf-border)', background: 'var(--pf-bg)',
  color: 'var(--pf-text)', fontFamily: 'var(--font-sans)', fontSize: '13.5px',
}
const lbl: React.CSSProperties = {
  display: 'block', fontFamily: 'var(--font-sans)', fontSize: '11px',
  letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--pf-faint)',
  margin: '14px 0 6px',
}

export default function ProductModal({ supplier, product, storageUid, labels, onClose, onSaved }: {
  supplier: Supplier
  product: SupplyProduct | null
  storageUid: string           // whose Storage folder receives the photo
  labels: { title: string; name: string; category: string; unit: string; unitSize: string; price: string; stock: string; photo: string; visible: string; save: string; cancel: string; saving: string }
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState({
    name: product?.name || '',
    category: product?.category || 'alcohol',
    unit: product?.unit || 'bottle',
    unitSize: product?.unitSize || '',
    price: product?.price != null ? String(product.price) : '',
    stock: product?.stock != null ? String(product.stock) : '0',
    photo: product?.photo || '',
    live: (product?.status ?? 'live') === 'live',
  })
  const [saving, setSaving] = useState(false)
  useEscape(onClose)
  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }))

  const save = async () => {
    if (!form.name.trim() || !form.price) return
    setSaving(true)
    try {
      const data = {
        supplierId: supplier.id!,
        supplierName: supplier.name,
        city: supplier.city,
        name: form.name.trim(),
        category: form.category,
        unit: form.unit,
        unitSize: form.unitSize.trim(),
        price: Math.max(0, Math.round(parseFloat(form.price) || 0)),
        stock: Math.max(0, Math.round(parseFloat(form.stock) || 0)),
        photo: form.photo || null,
        status: (form.live ? 'live' : 'hidden') as SupplyProduct['status'],
      }
      if (product?.id) await updateSupplyProduct(product.id, data)
      else await addSupplyProduct(data)
      onSaved()
    } catch (e) {
      console.error('product save failed:', e)
      setSaving(false)
    }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'var(--pf-scrim)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '18px' }}>
      <div role="dialog" aria-modal="true" aria-label={labels.title} onClick={e => e.stopPropagation()} className="pf-glass" style={{ width: 'min(480px, 100%)', maxHeight: '88dvh', overflowY: 'auto', borderRadius: '18px', padding: '24px' }}>
        <h3 style={{ fontFamily: 'var(--font-serif)', color: 'var(--pf-head)', fontSize: '18px', fontWeight: 500, margin: 0 }}>{labels.title}</h3>

        <label style={lbl}>{labels.name}</label>
        <input style={field} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Château Musar 2019" />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={lbl}>{labels.category}</label>
            <select style={field} value={form.category} onChange={e => set('category', e.target.value)}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>{labels.unit}</label>
            <select style={field} value={form.unit} onChange={e => set('unit', e.target.value)}>
              {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>{labels.unitSize}</label>
            <input style={field} value={form.unitSize} onChange={e => set('unitSize', e.target.value)} placeholder="75cl · ×24…" />
          </div>
          <div>
            <label style={lbl}>{labels.price}</label>
            <PriceInput compact value={form.price === '' ? null : Number(form.price)} onChange={v => set('price', v == null ? '' : String(v))} placeholder="12 000" />
          </div>
          <div>
            <label style={lbl}>{labels.stock}</label>
            <input style={field} type="number" min="0" inputMode="numeric" value={form.stock} onChange={e => set('stock', e.target.value)} />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '4px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--font-sans)', fontSize: '13px', color: 'var(--pf-text)', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.live} onChange={e => set('live', e.target.checked)} />
              {labels.visible}
            </label>
          </div>
        </div>

        <label style={lbl}>{labels.photo}</label>
        <PhotoUpload uid={storageUid} label={labels.photo} fieldName="supply_product"
          existingUrl={form.photo} onUploaded={url => set('photo', url)} />

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '22px' }}>
          <GhostButton onClick={onClose}>{labels.cancel}</GhostButton>
          <PrimaryButton onClick={save}>{saving ? labels.saving : labels.save}</PrimaryButton>
        </div>
      </div>
    </div>
  )
}
