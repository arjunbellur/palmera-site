'use client'
// Supplier profile — the fields the supplier owns (rules allow everything
// except uid / email / commissionRate / status). Delivery fee + the two
// review thresholds feed the dépôt-vente order flow (docs/marketplace-api.md).
import { useCallback, useEffect, useState } from 'react'
import { useSupplier } from '../SupplierContext'
import { t } from '../i18n'
import { updateSupplier } from '@/lib/firestore'
import type { Supplier } from '@/lib/schema'
import { ScreenHeader, PrimaryButton, cardShape, fieldStyle, fieldLabel, eyebrow } from '@/components/partner/ui'

const DEFAULT_THRESHOLD = 10

type Form = { deliveryFee: string; maxPerOrder: string; firstOrderMax: string; phone: string; city: string }

const fromSupplier = (s: Supplier): Form => ({
  deliveryFee: s.deliveryFee != null ? String(s.deliveryFee) : '',
  maxPerOrder: s.maxPerOrder != null ? String(s.maxPerOrder) : '',
  firstOrderMax: s.firstOrderMax != null ? String(s.firstOrderMax) : '',
  phone: s.phone || '',
  city: s.city || '',
})

/** Whole non-negative integer, or `fallback` when blank / unparsable. */
const toInt = (raw: string, fallback: number, min = 0) => {
  const n = Math.round(parseFloat(raw))
  return Number.isFinite(n) ? Math.max(min, n) : fallback
}

const hint: React.CSSProperties = { fontFamily: 'var(--font-sans)', color: 'var(--pf-faint)', fontSize: '12px', lineHeight: 1.5, margin: '6px 0 0' }

export default function SupplierSettings() {
  const { supplier, locale, refresh } = useSupplier()
  const L = useCallback((k: string) => t(locale, k), [locale])
  const [form, setForm] = useState<Form>({ deliveryFee: '', maxPerOrder: '', firstOrderMax: '', phone: '', city: '' })
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)

  useEffect(() => { if (supplier) setForm(fromSupplier(supplier)) }, [supplier])
  const set = (k: keyof Form, v: string) => { setForm(f => ({ ...f, [k]: v })); setNotice(null) }

  const save = async () => {
    if (!supplier?.id || saving) return
    setSaving(true); setNotice(null)
    try {
      await updateSupplier(supplier.id, {
        deliveryFee: toInt(form.deliveryFee, 0),
        // Blank threshold = back to the documented default (10), never 0 —
        // a 0 would send every order to review.
        maxPerOrder: toInt(form.maxPerOrder, DEFAULT_THRESHOLD, 1),
        firstOrderMax: toInt(form.firstOrderMax, DEFAULT_THRESHOLD, 1),
        phone: form.phone.trim(),
        city: form.city.trim(),
      })
      await refresh()
      setNotice({ tone: 'ok', text: L('set_saved') })
    } catch (e) {
      console.error('supplier settings save failed:', e)
      setNotice({ tone: 'err', text: L('set_err') })
    }
    setSaving(false)
  }

  if (!supplier) return null

  return (
    <>
      <ScreenHeader label={L('set_label')} title={L('set_title')} intro={L('set_intro')} />

      <div style={{ display: 'grid', gap: '14px', maxWidth: '36rem' }}>
        <section className="pf-glass" style={cardShape}>
          <span style={eyebrow}>{L('delivery_fee')}</span>
          <label style={fieldLabel} htmlFor="set-fee">{L('set_delivery_fee')}</label>
          <input id="set-fee" style={fieldStyle} type="number" min="0" step="1" inputMode="numeric" placeholder="0"
            value={form.deliveryFee} onChange={e => set('deliveryFee', e.target.value)} />
          <p style={hint}>{L('set_delivery_fee_hint')}</p>
        </section>

        <section className="pf-glass" style={cardShape}>
          <span style={eyebrow}>{L('set_thresholds')}</span>
          <label style={fieldLabel} htmlFor="set-max">{L('set_max_per_order')}</label>
          <input id="set-max" style={fieldStyle} type="number" min="1" step="1" inputMode="numeric" placeholder={String(DEFAULT_THRESHOLD)}
            value={form.maxPerOrder} onChange={e => set('maxPerOrder', e.target.value)} />
          <p style={hint}>{L('set_max_per_order_hint')} {L('set_default_hint')}.</p>

          <label style={fieldLabel} htmlFor="set-first">{L('set_first_order_max')}</label>
          <input id="set-first" style={fieldStyle} type="number" min="1" step="1" inputMode="numeric" placeholder={String(DEFAULT_THRESHOLD)}
            value={form.firstOrderMax} onChange={e => set('firstOrderMax', e.target.value)} />
          <p style={hint}>{L('set_first_order_max_hint')} {L('set_default_hint')}.</p>
        </section>

        <section className="pf-glass" style={cardShape}>
          <span style={eyebrow}>{L('set_contact')}</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(12rem, 1fr))', gap: '0 12px' }}>
            <div>
              <label style={fieldLabel} htmlFor="set-phone">{L('set_phone')}</label>
              <input id="set-phone" style={fieldStyle} type="tel" inputMode="tel" autoComplete="tel" value={form.phone} onChange={e => set('phone', e.target.value)} />
            </div>
            <div>
              <label style={fieldLabel} htmlFor="set-city">{L('set_city')}</label>
              <input id="set-city" style={fieldStyle} type="text" autoComplete="address-level2" value={form.city} onChange={e => set('city', e.target.value)} />
            </div>
          </div>
        </section>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <PrimaryButton onClick={save} disabled={saving}>{saving ? L('set_saving') : L('set_save')}</PrimaryButton>
          {notice && (
            <span role="status" style={{ fontFamily: 'var(--font-sans)', fontSize: '12.5px', color: notice.tone === 'ok' ? 'var(--pf-success)' : 'var(--pf-alert)' }}>{notice.text}</span>
          )}
        </div>
      </div>
    </>
  )
}
