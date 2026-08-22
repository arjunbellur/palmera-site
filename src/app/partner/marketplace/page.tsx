'use client'
// The partner store (marketplace phase 2): browse supplier products, build a
// cart (one supplier per order, like ordering from one restaurant), pay via
// Stripe Checkout. Returning from Stripe lands back here — ?pay=success shows
// the order confirmed, ?pay=cancelled quietly marks the attempt cancelled so
// no zombie awaiting_payment orders accumulate (the app's item-13 lesson).
import { useEffect, useMemo, useState, useCallback } from 'react'
import { usePartner } from '../PartnerContext'
import { t } from '../i18n'
import type { SupplyProduct, SupplyOrder } from '@/lib/schema'
import { getLiveProducts, getSupplyOrdersByPartner } from '@/lib/firestore'
import { auth } from '@/lib/firebase'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { ScreenHeader, PrimaryButton, GhostButton, Chip, EmptyState, Skeleton, cardShape, eyebrow } from '@/components/partner/ui'
import { ShoppingBasket, ClipboardList, Package } from 'lucide-react'
import { formatAmount } from '@/lib/money'

const fmtXof = formatAmount

const ORDER_TONES: Record<string, 'gold' | 'green' | 'alert' | 'neutral'> = {
  awaiting_payment: 'neutral', paid: 'gold', accepted: 'gold',
  delivered: 'green', declined: 'alert', cancelled: 'neutral', refunded: 'neutral',
}

export default function Marketplace() {
  const { uid, company, locale } = usePartner()
  const L = useCallback((k: string) => t(locale, k), [locale])
  const [products, setProducts] = useState<SupplyProduct[] | null>(null)
  const [orders, setOrders] = useState<SupplyOrder[] | null>(null)
  const [cart, setCart] = useState<Record<string, number>>({}) // productId → qty
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<'store' | 'orders'>('store')
  const [banner, setBanner] = useState<'success' | 'cancelled' | null>(null)

  const load = useCallback(async () => {
    if (!uid) return
    const [ps, os] = await Promise.all([getLiveProducts(), getSupplyOrdersByPartner(uid)])
    setProducts(ps)
    setOrders(os.sort((a, b) => ((b.createdAt as { toMillis?: () => number })?.toMillis?.() ?? 0) - ((a.createdAt as { toMillis?: () => number })?.toMillis?.() ?? 0)))
  }, [uid])
  useEffect(() => { load() }, [load])

  // Return from Stripe: surface the outcome; a cancelled attempt is closed
  // out client-side so it never lingers as a phantom awaiting_payment order.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    const pay = q.get('pay'); const orderId = q.get('order')
    if (!pay || !orderId) return
    if (pay === 'success') { setBanner('success'); setTab('orders') }
    if (pay === 'cancelled') {
      setBanner('cancelled')
      updateDoc(doc(db, 'supply_orders', orderId), { status: 'cancelled', updatedAt: new Date() }).catch(() => {})
    }
    window.history.replaceState({}, '', '/partner/marketplace')
  }, [])

  const byId = useMemo(() => new Map((products || []).map(p => [p.id!, p])), [products])
  const cartItems = Object.entries(cart).filter(([, q]) => q > 0)
  const cartSupplier = cartItems.length ? byId.get(cartItems[0][0])?.supplierId : null
  const cartTotal = cartItems.reduce((s, [id, q]) => s + (byId.get(id)?.price || 0) * q, 0)

  const add = (p: SupplyProduct) => {
    setError('')
    // One supplier per order.
    if (cartSupplier && p.supplierId !== cartSupplier) { setError(L('mk_one_supplier')); return }
    setCart(c => ({ ...c, [p.id!]: (c[p.id!] || 0) + 1 }))
  }
  const sub = (id: string) => setCart(c => ({ ...c, [id]: Math.max(0, (c[id] || 0) - 1) }))

  const checkout = async () => {
    if (!company?.id || cartItems.length === 0 || busy) return
    setBusy(true); setError('')
    try {
      const token = await auth.currentUser?.getIdToken()
      const res = await fetch('/api/marketplace/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ companyId: company.id, note, items: cartItems.map(([productId, qty]) => ({ productId, qty })) }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data.error || 'checkout failed')
      window.location.href = data.url // → Stripe
    } catch (e) {
      console.error('checkout failed:', e)
      setError(L('mk_checkout_err'))
      setBusy(false)
    }
  }

  const groupedBySupplier = useMemo(() => {
    const m = new Map<string, SupplyProduct[]>()
    for (const p of products || []) {
      if (!m.has(p.supplierName)) m.set(p.supplierName, [])
      m.get(p.supplierName)!.push(p)
    }
    return [...m.entries()]
  }, [products])

  return (
    <>
      <ScreenHeader label={L('mk_label')} title={L('mk_title')} intro={L('mk_intro')} />

      {banner && (
        <div className="pf-glass" style={{ ...cardShape, marginBottom: '16px', borderColor: banner === 'success' ? 'var(--pf-success)' : 'var(--pf-border)' }}>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: banner === 'success' ? 'var(--pf-success)' : 'var(--pf-muted)', margin: 0 }}>
            {banner === 'success' ? L('mk_paid_banner') : L('mk_cancel_banner')}
          </p>
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
        {(['store', 'orders'] as const).map(k => (
          <button key={k} onClick={() => setTab(k)} style={{
            padding: '7px 16px', borderRadius: '999px', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: '12.5px',
            border: '1px solid var(--pf-border)',
            background: tab === k ? 'var(--pf-card)' : 'transparent',
            color: tab === k ? 'var(--pf-gold)' : 'var(--pf-faint)',
          }}>{L(k === 'store' ? 'mk_tab_store' : 'mk_tab_orders')}{k === 'orders' && orders?.length ? ` (${orders.length})` : ''}</button>
        ))}
      </div>

      {tab === 'store' && (
        <div className="pf-cols" style={{ alignItems: 'flex-start' }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            {products === null ? <Skeleton height="12rem" /> :
             products.length === 0 ? <EmptyState icon={<ShoppingBasket size={22} strokeWidth={1.75} />} title={L('mk_empty_t')} body={L('mk_empty_b')} /> :
             groupedBySupplier.map(([supplierName, ps]) => (
              <div key={supplierName} style={{ marginBottom: '22px' }}>
                <p style={{ ...eyebrow, margin: '0 0 10px' }}>{supplierName} · {ps[0].city}</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(13.5rem, 1fr))', gap: '12px' }}>
                  {[...ps].sort((a, b) => a.name.localeCompare(b.name)).map(p => (
                    <div key={p.id} className="pf-glass" style={{ ...cardShape, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <span style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'var(--pf-green-soft)', flexShrink: 0, overflow: 'hidden', display: 'grid', placeItems: 'center', color: 'var(--pf-gold)' }}>
                          {p.photo ? <img loading="lazy" decoding="async" src={p.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Package size={18} strokeWidth={1.75} />}
                        </span>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontFamily: 'var(--font-serif)', color: 'var(--pf-head)', fontSize: '13.5px', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
                          <p style={{ fontFamily: 'var(--font-sans)', color: 'var(--pf-faint)', fontSize: '11px', margin: '2px 0 0' }}>{p.unitSize ? `${p.unitSize} · ` : ''}{p.unit}</p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                        <span style={{ fontFamily: 'var(--font-display)', color: 'var(--pf-text)', fontSize: '15px' }}>{fmtXof(p.price)} <span style={{ fontSize: '10px', color: 'var(--pf-faint)' }}>XOF</span></span>
                        {cart[p.id!] ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
                            <GhostButton onClick={() => sub(p.id!)}>−</GhostButton>
                            <span style={{ fontFamily: 'var(--font-sans)', color: 'var(--pf-text)', fontSize: '13px', minWidth: '1.25rem', textAlign: 'center' }}>{cart[p.id!]}</span>
                            <GhostButton onClick={() => add(p)}>+</GhostButton>
                          </span>
                        ) : (
                          <GhostButton onClick={() => add(p)}>{L('mk_add')}</GhostButton>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Cart rail */}
          <aside className="pf-rail">
            <div className="pf-glass-gold" style={cardShape}>
              <p style={{ ...eyebrow, margin: '0 0 10px' }}>{L('mk_cart')}</p>
              {cartItems.length === 0 ? (
                <p style={{ fontFamily: 'var(--font-sans)', color: 'var(--pf-faint)', fontSize: '12.5px', margin: 0 }}>{L('mk_cart_empty')}</p>
              ) : (
                <>
                  {cartItems.map(([id, q]) => {
                    const p = byId.get(id)!
                    return (
                      <div key={id} style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', marginBottom: '8px' }}>
                        <span style={{ fontFamily: 'var(--font-sans)', fontSize: '12.5px', color: 'var(--pf-text)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q}× {p.name}</span>
                        <span style={{ fontFamily: 'var(--font-sans)', fontSize: '12.5px', color: 'var(--pf-muted)', flexShrink: 0 }}>{fmtXof(p.price * q)}</span>
                      </div>
                    )
                  })}
                  <div style={{ borderTop: '1px solid var(--pf-border)', margin: '10px 0', paddingTop: '10px', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontFamily: 'var(--font-sans)', fontSize: '12.5px', color: 'var(--pf-faint)' }}>{L('mk_total')}</span>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '17px', color: 'var(--pf-text)' }}>{fmtXof(cartTotal)} XOF</span>
                  </div>
                  <textarea value={note} onChange={e => setNote(e.target.value)} placeholder={L('mk_note_ph')} rows={2}
                    style={{ width: '100%', padding: '9px 11px', borderRadius: '10px', border: '1px solid var(--pf-border)', background: 'var(--pf-bg)', color: 'var(--pf-text)', fontFamily: 'var(--font-sans)', fontSize: '12.5px', resize: 'vertical', marginBottom: '10px' }} />
                  <PrimaryButton onClick={checkout}>{busy ? '…' : L('mk_pay')}</PrimaryButton>
                </>
              )}
              {error && <p style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: 'var(--pf-alert)', margin: '10px 0 0' }}>{error}</p>}
            </div>
          </aside>
        </div>
      )}

      {tab === 'orders' && (
        orders === null ? <Skeleton height="8rem" /> :
        orders.length === 0 ? <EmptyState icon={<ClipboardList size={22} strokeWidth={1.75} />} title={L('mk_orders_empty_t')} body={L('mk_orders_empty_b')} /> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {orders.map(o => (
              <div key={o.id} className="pf-glass" style={cardShape}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: 'var(--font-serif)', color: 'var(--pf-head)', fontSize: '14px', margin: 0 }}>{o.supplierName}</p>
                    <p style={{ fontFamily: 'var(--font-sans)', color: 'var(--pf-faint)', fontSize: '11.5px', margin: '3px 0 0' }}>
                      {o.items.map(i => `${i.qty}× ${i.name}`).join(' · ')}
                    </p>
                  </div>
                  <span style={{ fontFamily: 'var(--font-display)', color: 'var(--pf-text)', fontSize: '15px' }}>{fmtXof(o.orderTotal)} XOF</span>
                  <Chip tone={ORDER_TONES[o.status] || 'neutral'}>{L(`mk_st_${o.status}`)}</Chip>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </>
  )
}
