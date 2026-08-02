'use client'
// Admin-only additions to the pf kit. The partner kit (components/partner/ui)
// stays untouched — admin churn shouldn't ripple into the partner surface.
// Everything reads --pf-* tokens so light/dark come free.
import type { CSSProperties, ReactNode } from 'react'
import { card, eyebrow, numeral } from '@/components/partner/ui'

/** StatTile's plain-number sibling — admin stats are counts, not money. */
export function CountTile({ label, value, tone }: { label: string; value: number; tone?: 'gold' | 'alert' }) {
  const color = tone === 'gold' ? 'var(--pf-gold)' : tone === 'alert' ? 'var(--pf-alert)' : 'var(--pf-text)'
  return (
    <div style={card}>
      <div style={eyebrow}>{label}</div>
      <div style={{ ...numeral, fontSize: '27px', marginTop: '6px', color }}>{value}</div>
    </div>
  )
}

/** Chip's button sibling, for filter rows. Tapping an active chip clears it. */
export function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick} style={{
      padding: '6px 13px', borderRadius: '999px', cursor: 'pointer',
      fontFamily: 'var(--font-sans)', fontSize: '11px', letterSpacing: '0.03em',
      border: `1px solid ${active ? 'var(--pf-gold)' : 'var(--pf-border)'}`,
      background: active ? 'rgba(190,154,86,0.14)' : 'transparent',
      color: active ? 'var(--pf-gold)' : 'var(--pf-faint)',
    }}>{children}</button>
  )
}

export function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <p style={{ ...eyebrow, margin: '0 0 4px' }}>{label}</p>
      <p style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: value ? 'var(--pf-text)' : 'var(--pf-faint)', margin: 0, lineHeight: 1.5, fontStyle: value ? 'normal' : 'italic' }}>{value || 'Not provided'}</p>
    </div>
  )
}

export function Grid({ children }: { children: ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(14rem, 1fr))', gap: '0 2rem' }}>{children}</div>
}

export function SectionHeading({ children }: { children: ReactNode }) {
  return <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--pf-head)', fontSize: '1.0625rem', fontWeight: 400, letterSpacing: '0.03em', margin: '28px 0 14px', paddingBottom: '8px', borderBottom: '1px solid var(--pf-border)' }}>{children}</h3>
}

export function DangerButton({ children, onClick, disabled, solid }: { children: ReactNode; onClick: () => void; disabled?: boolean; solid?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: '9px 16px', borderRadius: '10px', cursor: disabled ? 'default' : 'pointer',
      background: solid ? 'rgba(196,124,124,0.14)' : 'transparent',
      border: `1px solid rgba(196,124,124,${solid ? 0.5 : 0.4})`,
      color: 'var(--pf-alert)', opacity: disabled ? 0.6 : 1,
      fontFamily: 'var(--font-sans)', fontSize: '12px', letterSpacing: '0.04em',
    }}>{children}</button>
  )
}

export const inputStyle: CSSProperties = {
  background: 'var(--pf-card)', border: '1px solid var(--pf-border)', borderRadius: '10px',
  padding: '9px 14px', color: 'var(--pf-text)', fontSize: '13px',
  fontFamily: 'var(--font-sans)', outline: 'none', boxSizing: 'border-box',
}

export function formatDate(ts: unknown): string {
  if (!ts) return '—'
  const sec = (ts as { seconds?: number })?.seconds
  if (sec) return new Date(sec * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  if (typeof ts === 'string') return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  return '—'
}
