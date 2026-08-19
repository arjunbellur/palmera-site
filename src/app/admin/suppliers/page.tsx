'use client'
// Supplier directory + concierge authoring (marketplace phase 1). Admins
// create supplier records (the supplier claims theirs at first /supplier
// login with the registered email) and can author their catalog directly —
// same concierge play as experiences. English-only, like the rest of /admin.
import { useEffect, useState, useCallback } from 'react'
import { useAdmin } from '../AdminContext'
import type { Supplier, SupplyProduct } from '@/lib/schema'
import { getAllSuppliers, createSupplier, updateSupplier, getProductsBySupplier, updateSupplyProduct, deleteSupplyProduct } from '@/lib/firestore'
import ProductModal from '@/components/supplier/ProductModal'
import { ScreenHeader, PrimaryButton, GhostButton, Chip, EmptyState, Skeleton, cardShape, eyebrow } from '@/components/partner/ui'

const fmtXof = (n: number) => new Intl.NumberFormat('fr-FR').format(n)
const pctText = (rate: number) => String(+(rate * 100).toFixed(2))

const field: React.CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: '10px',
  border: '1px solid var(--pf-border)', background: 'var(--pf-bg)',
  color: 'var(--pf-text)', fontFamily: 'var(--font-sans)', fontSize: '13.5px',
}
const lbl: React.CSSProperties = {
  display: 'block', fontFamily: 'var(--font-sans)', fontSize: '11px',
  letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--pf-faint)',
  margin: '12px 0 6px',
}

const MODAL_LABELS = {
  name: 'Product name', category: 'Category', unit: 'Unit', unitSize: 'Unit size',
  price: 'Price (XOF)', stock: 'Stock', photo: 'Photo', visible: 'Visible in marketplace',
  save: 'Save', cancel: 'Cancel', saving: 'Saving…',
}

function SupplierForm({ supplier, onDone }: { supplier: Supplier | null; onDone: () => void }) {
  const [form, setForm] = useState({
    name: supplier?.name || '', email: supplier?.email || '',
    phone: supplier?.phone || '', city: supplier?.city || '',
    rate: supplier ? pctText(supplier.commissionRate) : '10',
    notes: supplier?.notes || '',
  })
  const [saving, setSaving] = useState(false)
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))
  const save = async () => {
    if (!form.name.trim() || !form.email.trim()) return
    setSaving(true)
    const pct = Math.max(0, Math.min(100, parseFloat(form.rate) || 0))
    const data = {
      name: form.name.trim(), email: form.email.trim().toLowerCase(),
      phone: form.phone.trim(), city: form.city.trim(),
      commissionRate: Math.round(pct * 100) / 10000, notes: form.notes.trim(),
    }
    try {
      if (supplier?.id) await updateSupplier(supplier.id, data)
      else await createSupplier(data)
      onDone()
    } catch (e) { console.error('supplier save failed:', e); setSaving(false) }
  }
  return (
    <div className="pf-glass" style={{ ...cardShape, marginBottom: '16px' }}>
      <p style={{ ...eyebrow, margin: '0 0 4px' }}>{supplier ? 'Edit supplier' : 'New supplier'}</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(13rem, 1fr))', gap: '0 14px' }}>
        <div><label style={lbl}>Business name</label><input style={field} value={form.name} onChange={e => set('name', e.target.value)} /></div>
        <div><label style={lbl}>Email (their /supplier login)</label><input style={field} type="email" value={form.email} onChange={e => set('email', e.target.value)} disabled={!!supplier?.uid} /></div>
        <div><label style={lbl}>Phone</label><input style={field} value={form.phone} onChange={e => set('phone', e.target.value)} /></div>
        <div><label style={lbl}>City</label><input style={field} value={form.city} onChange={e => set('city', e.target.value)} /></div>
        <div><label style={lbl}>Commission %</label><input style={field} type="number" min="0" max="100" step="0.1" inputMode="decimal" value={form.rate} onChange={e => set('rate', e.target.value)} /></div>
        <div><label style={lbl}>Notes (internal)</label><input style={field} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Vetted by…" /></div>
      </div>
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' }}>
        <GhostButton onClick={onDone}>Cancel</GhostButton>
        <PrimaryButton onClick={save}>{saving ? 'Saving…' : supplier ? 'Save changes' : 'Create supplier'}</PrimaryButton>
      </div>
    </div>
  )
}

export default function AdminSuppliers() {
  const { uid: adminUid } = useAdmin()
  const [suppliers, setSuppliers] = useState<Supplier[] | null>(null)
  const [open, setOpen] = useState<string | null>(null) // expanded supplier id
  const [products, setProducts] = useState<Record<string, SupplyProduct[]>>({})
  const [form, setForm] = useState<{ show: boolean; supplier: Supplier | null }>({ show: false, supplier: null })
  const [prodModal, setProdModal] = useState<{ supplier: Supplier; product: SupplyProduct | null } | null>(null)

  const load = useCallback(async () => { setSuppliers(await getAllSuppliers()) }, [])
  useEffect(() => { load() }, [load])

  const loadProducts = useCallback(async (supplierId: string) => {
    const ps = await getProductsBySupplier(supplierId)
    setProducts(prev => ({ ...prev, [supplierId]: ps }))
  }, [])
  const expand = (s: Supplier) => {
    const next = open === s.id ? null : s.id!
    setOpen(next)
    if (next && !products[next]) loadProducts(next)
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '14px', flexWrap: 'wrap' }}>
        <ScreenHeader label="Marketplace" title="Suppliers"
          intro="Wholesale businesses selling to partners. Create the record with their email — they claim it at their first /supplier sign-in. You can author their catalog for them." />
        <div style={{ paddingBottom: '18px' }}>
          <PrimaryButton onClick={() => setForm({ show: true, supplier: null })}>+ Add supplier</PrimaryButton>
        </div>
      </div>

      {form.show && <SupplierForm supplier={form.supplier} onDone={() => { setForm({ show: false, supplier: null }); load() }} />}

      {suppliers === null ? (
        <Skeleton height="8rem" />
      ) : suppliers.length === 0 && !form.show ? (
        <EmptyState icon="◫" title="No suppliers yet" body="Add the first supplier to open the marketplace."
          action={<PrimaryButton onClick={() => setForm({ show: true, supplier: null })}>+ Add supplier</PrimaryButton>} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {suppliers.sort((a, b) => a.name.localeCompare(b.name)).map(s => (
            <div key={s.id} className="pf-glass" style={cardShape}>
              <div onClick={() => expand(s)} style={{ display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer', flexWrap: 'wrap' }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ fontFamily: 'var(--font-serif)', color: 'var(--pf-head)', fontSize: '15px', margin: 0 }}>{s.name}</p>
                  <p style={{ fontFamily: 'var(--font-sans)', color: 'var(--pf-faint)', fontSize: '11.5px', margin: '2px 0 0' }}>{s.city || '—'} · {s.email} · {s.phone || '—'}</p>
                </div>
                <Chip tone="gold">{pctText(s.commissionRate)}%</Chip>
                <Chip tone={s.uid ? 'green' : 'neutral'}>{s.uid ? 'Claimed' : 'Invited'}</Chip>
                <Chip tone={s.status === 'active' ? 'green' : 'alert'}>{s.status}</Chip>
                <span style={{ color: 'var(--pf-faint)', fontSize: '12px' }}>{open === s.id ? '▾' : '▸'}</span>
              </div>

              {open === s.id && (
                <div style={{ marginTop: '16px', borderTop: '1px solid var(--pf-border)', paddingTop: '14px' }}>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                    <GhostButton onClick={() => setForm({ show: true, supplier: s })}>Edit details</GhostButton>
                    <GhostButton onClick={async () => { await updateSupplier(s.id!, { status: s.status === 'active' ? 'paused' : 'active' }); load() }}>
                      {s.status === 'active' ? 'Pause' : 'Reactivate'}
                    </GhostButton>
                    <span style={{ flex: 1 }} />
                    <PrimaryButton onClick={() => setProdModal({ supplier: s, product: null })}>+ Add product</PrimaryButton>
                  </div>
                  {!products[s.id!] ? <Skeleton height="4rem" /> : products[s.id!].length === 0 ? (
                    <p style={{ fontFamily: 'var(--font-sans)', color: 'var(--pf-faint)', fontSize: '12.5px' }}>No products yet — author their catalog with “+ Add product”.</p>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(14rem, 1fr))', gap: '10px' }}>
                      {products[s.id!].sort((a, b) => a.name.localeCompare(b.name)).map(p => (
                        <div key={p.id} style={{ border: '1px solid var(--pf-border)', borderRadius: '12px', padding: '12px', display: 'flex', gap: '10px', alignItems: 'center', opacity: p.status === 'hidden' ? 0.6 : 1 }}>
                          <span style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--pf-green-soft)', flexShrink: 0, overflow: 'hidden', display: 'grid', placeItems: 'center', color: 'var(--pf-gold)' }}>
                            {p.photo ? <img loading="lazy" decoding="async" src={p.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '▦'}
                          </span>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <p style={{ fontFamily: 'var(--font-sans)', color: 'var(--pf-text)', fontSize: '12.5px', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
                            <p style={{ fontFamily: 'var(--font-sans)', color: 'var(--pf-faint)', fontSize: '11px', margin: '2px 0 0' }}>{fmtXof(p.price)} XOF · stock {p.stock}{p.status === 'hidden' ? ' · hidden' : ''}</p>
                          </div>
                          <GhostButton onClick={() => setProdModal({ supplier: s, product: p })}>Edit</GhostButton>
                          <GhostButton onClick={async () => { await updateSupplyProduct(p.id!, { status: p.status === 'live' ? 'hidden' : 'live' }); loadProducts(s.id!) }}>{p.status === 'live' ? 'Hide' : 'Show'}</GhostButton>
                          <GhostButton tone="alert" onClick={async () => { if (window.confirm('Delete this product?')) { await deleteSupplyProduct(p.id!); loadProducts(s.id!) } }}>✕</GhostButton>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {prodModal && (
        <ProductModal supplier={prodModal.supplier} product={prodModal.product} storageUid={adminUid}
          labels={{ title: prodModal.product ? 'Edit product' : `New product — ${prodModal.supplier.name}`, ...MODAL_LABELS }}
          onClose={() => setProdModal(null)}
          onSaved={() => { const sid = prodModal.supplier.id!; setProdModal(null); loadProducts(sid) }} />
      )}
    </>
  )
}
