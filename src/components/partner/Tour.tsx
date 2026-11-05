'use client'
// Guided tour of the partner portal — the "here is where everything is"
// walkthrough a new partner sees once, with Skip on every step for anyone
// who already knows. A spotlight cut out of a scrim sits over the element
// each step is about (nav items, the company pill, the scan button), and a
// card beside it says what lives there. Steps that have no element on the
// current screen fall back to a centred card. Runs inside the partner
// layout so it survives navigation; `href` steps offer an "Open" link.
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { t, type Locale } from '@/app/partner/i18n'

export interface TourStep {
  id: string
  /** `data-tour` value of the element to spotlight; none = centred card. */
  target?: string
  /** Page this step is about — shown as an "Open" link when not already there. */
  href?: string
}

export const TOUR_STEPS: TourStep[] = [
  { id: 'welcome' },
  { id: 'home', target: 'nav_home', href: '/partner' },
  { id: 'res', target: 'nav_res', href: '/partner/reservations' },
  { id: 'scan', target: 'scan', href: '/partner' },
  { id: 'earn', target: 'nav_earn', href: '/partner/earnings' },
  { id: 'list', target: 'nav_list', href: '/partner/listings' },
  { id: 'market', target: 'nav_market', href: '/partner/marketplace' },
  { id: 'set', target: 'nav_set', href: '/partner/settings' },
  { id: 'company', target: 'company' },
  { id: 'lang', target: 'locale' },
  { id: 'end' },
]

interface Rect { top: number; left: number; width: number; height: number }
const PAD = 6

function measure(target?: string): Rect | null {
  if (!target) return null
  const el = document.querySelector<HTMLElement>(`[data-tour="${target}"]`)
  if (!el) return null
  const r = el.getBoundingClientRect()
  if (r.width === 0 || r.height === 0) return null
  return { top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 }
}

export default function Tour({ open, locale, isMobile, onClose }: {
  open: boolean
  locale: Locale
  isMobile: boolean
  /** `done` is true when the partner reached the last step, false on Skip. */
  onClose: (done: boolean) => void
}) {
  const L = (k: string) => t(locale, k)
  const pathname = usePathname()
  const [i, setI] = useState(0)
  const [rect, setRect] = useState<Rect | null>(null)
  // Viewport size is read in an effect, never during render, so a server
  // render and the first client render agree (no hydration mismatch).
  const [vp, setVp] = useState<{ w: number; h: number } | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const step = TOUR_STEPS[i]
  const last = i === TOUR_STEPS.length - 1

  useEffect(() => { if (open) setI(0) }, [open])

  // Re-measure on step change, resize, scroll and after the page swaps.
  useLayoutEffect(() => {
    if (!open) return
    const update = () => { setRect(measure(step.target)); setVp({ w: window.innerWidth, h: window.innerHeight }) }
    update()
    const t1 = setTimeout(update, 60); const t2 = setTimeout(update, 400)
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => { clearTimeout(t1); clearTimeout(t2); window.removeEventListener('resize', update); window.removeEventListener('scroll', update, true) }
  }, [open, step.target, pathname, isMobile])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose(false)
      else if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); last ? onClose(true) : setI((n) => Math.min(TOUR_STEPS.length - 1, n + 1)) }
      else if (e.key === 'ArrowLeft') setI((n) => Math.max(0, n - 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, last, onClose])

  useEffect(() => { if (open) cardRef.current?.focus() }, [open, i])

  if (!open || !vp) return null

  // Card placement: beside the spotlight on desktop (right of the rail, or
  // below a content element), above the tab bar on phones, centred when
  // there is nothing to point at.
  const W = Math.min(360, vp.w - 32)
  let cardStyle: CSSProperties
  if (!rect) {
    cardStyle = { position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: W }
  } else if (isMobile) {
    const above = rect.top > vp.h / 2
    cardStyle = above
      ? { position: 'fixed', left: '50%', transform: 'translateX(-50%)', bottom: Math.max(16, vp.h - rect.top + 12), width: W }
      : { position: 'fixed', left: '50%', transform: 'translateX(-50%)', top: rect.top + rect.height + 12, width: W }
  } else {
    const fitsRight = rect.left + rect.width + 16 + W < vp.w
    const top = Math.min(Math.max(16, rect.top), vp.h - 320)
    cardStyle = fitsRight
      ? { position: 'fixed', left: rect.left + rect.width + 16, top, width: W }
      : { position: 'fixed', left: Math.max(16, rect.left), top: rect.top + rect.height + 14, width: W }
  }
  const showOpen = !!step.href && pathname !== step.href

  return (
    <div role="dialog" aria-modal="true" aria-label={L('tour_aria')} style={{ position: 'fixed', inset: 0, zIndex: 80 }}>
      {/* Scrim with the spotlight cut out — one element, the shadow does the masking. */}
      {rect ? (
        <div aria-hidden style={{ position: 'fixed', top: rect.top, left: rect.left, width: rect.width, height: rect.height, borderRadius: '14px', boxShadow: '0 0 0 9999px var(--pf-scrim), 0 0 0 1.5px var(--pf-gold), 0 0 28px rgba(190,154,86,0.45)', transition: 'top 0.32s cubic-bezier(0.22,1,0.36,1), left 0.32s cubic-bezier(0.22,1,0.36,1), width 0.32s ease, height 0.32s ease', pointerEvents: 'none' }} />
      ) : (
        <div aria-hidden onClick={() => onClose(false)} style={{ position: 'fixed', inset: 0, background: 'var(--pf-scrim)' }} />
      )}
      {/* Clicks outside the card end the tour (same as Skip). */}
      {rect && <div aria-hidden onClick={() => onClose(false)} style={{ position: 'fixed', inset: 0 }} />}

      <div ref={cardRef} tabIndex={-1} className="pf-glass pf-in" style={{ ...cardStyle, zIndex: 1, padding: '18px 18px 14px', borderRadius: '18px', background: 'var(--pf-sheet)', border: '1px solid var(--pf-border-strong)', boxShadow: '0 24px 60px rgba(0,0,0,0.45)', outline: 'none', maxHeight: 'calc(100vh - 32px)', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '8px' }}>
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--pf-gold)' }}>
            {i === 0 ? L('tour_label') : `${L('tour_step')} ${i} / ${TOUR_STEPS.length - 2}`}
          </span>
          <button type="button" onClick={() => onClose(false)} style={{ background: 'transparent', border: 'none', color: 'var(--pf-faint)', fontFamily: 'var(--font-sans)', fontSize: '11px', letterSpacing: '0.04em', cursor: 'pointer', padding: '4px 0' }}>{L('tour_skip')}</button>
        </div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.125rem', fontWeight: 600, color: 'var(--pf-head)', margin: '0 0 6px', letterSpacing: '0.02em' }}>{L(`tour_${step.id}_t`)}</h2>
        <p style={{ fontFamily: 'var(--font-serif)', fontSize: '13.5px', lineHeight: 1.5, color: 'var(--pf-text)', margin: 0 }}>{L(`tour_${step.id}_b`)}</p>
        {showOpen && (
          <Link href={step.href!} style={{ display: 'inline-block', marginTop: '10px', fontFamily: 'var(--font-sans)', fontSize: '11.5px', color: 'var(--pf-gold)', textDecoration: 'none', letterSpacing: '0.03em' }}>{L('tour_open')} →</Link>
        )}

        {/* Progress dots + controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginTop: '16px' }}>
          <span aria-hidden style={{ display: 'flex', gap: '4px' }}>
            {TOUR_STEPS.map((s, k) => <span key={s.id} style={{ width: k === i ? '14px' : '5px', height: '5px', borderRadius: '999px', background: k <= i ? 'var(--pf-gold)' : 'var(--pf-border-strong)', transition: 'width 0.2s ease' }} />)}
          </span>
          <span style={{ display: 'flex', gap: '8px' }}>
            {i > 0 && (
              <button type="button" onClick={() => setI((n) => n - 1)} className="pf-cap pf-cap-ghost" style={{ padding: '8px 13px', border: '1px solid var(--pf-border-strong)', background: 'transparent', color: 'var(--pf-muted)', fontFamily: 'var(--font-sans)', fontSize: '11.5px', cursor: 'pointer' }}>{L('tour_back')}</button>
            )}
            <button type="button" onClick={() => (last ? onClose(true) : setI((n) => n + 1))} className="pf-cap pf-cap-primary" style={{ padding: '8px 16px', border: 'none', color: '#f4ecdb', fontFamily: 'var(--font-sans)', fontSize: '11.5px', cursor: 'pointer' }}>
              {i === 0 ? L('tour_start') : last ? L('tour_done') : L('tour_next')}
            </button>
          </span>
        </div>
      </div>
    </div>
  )
}
