'use client'
// Admin-only additions to the pf kit. The partner kit (components/partner/ui)
// stays untouched — admin churn shouldn't ripple into the partner surface.
// Everything reads --pf-* tokens so light/dark come free.
import type { CSSProperties, ReactNode } from 'react'
import { card, eyebrow, numeral } from '@/components/partner/ui'

/** StatTile's plain-number sibling — admin stats are counts, not money.
 *  Optional icon chip (top-left, soft square) per the FW-dashboard idiom. */
export function CountTile({ label, value, tone, icon }: { label: string; value: number; tone?: 'gold' | 'alert'; icon?: string }) {
  const color = tone === 'gold' ? 'var(--pf-gold)' : tone === 'alert' ? 'var(--pf-alert)' : 'var(--pf-text)'
  return (
    <div style={card}>
      {icon && <div style={{ width: '30px', height: '30px', borderRadius: '9px', background: 'var(--pf-green-soft)', color: 'var(--pf-gold)', display: 'grid', placeItems: 'center', fontSize: '13px', marginBottom: '10px' }}>{icon}</div>}
      <div style={eyebrow}>{label}</div>
      <div style={{ ...numeral, fontSize: '27px', marginTop: '6px', color }}>{value}</div>
    </div>
  )
}

/** Featured stat card: icon chip + big number + week-over-week delta + a tiny
 *  bar sparkline of the recent weeks. One per row max — it's the headline. */
export function SparkTile({ icon, label, value, spark, featured }: {
  icon: string; label: string; value: number | string
  spark: number[]; featured?: boolean
}) {
  const max = Math.max(...spark, 1)
  const last = spark[spark.length - 1] ?? 0
  const prev = spark[spark.length - 2] ?? 0
  const delta = prev > 0 ? Math.round(((last - prev) / prev) * 100) : (last > 0 ? 100 : 0)
  return (
    <div style={{ ...card, ...(featured ? { background: 'linear-gradient(150deg, rgba(190,154,86,0.16), var(--pf-card))', borderColor: 'var(--pf-border-strong)' } : {}) }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px', marginBottom: '10px' }}>
        <div style={{ width: '30px', height: '30px', borderRadius: '9px', background: 'var(--pf-green-soft)', color: 'var(--pf-gold)', display: 'grid', placeItems: 'center', fontSize: '13px' }}>{icon}</div>
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: '10px', color: delta >= 0 ? 'var(--pf-success)' : 'var(--pf-alert)' }}>
          {delta >= 0 ? '▲' : '▼'} {Math.abs(delta)}% <span style={{ color: 'var(--pf-faint)' }}>wk</span>
        </span>
      </div>
      <div style={eyebrow}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ ...numeral, fontSize: '27px', marginTop: '6px' }}>{value}</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '26px', paddingBottom: '2px' }}>
          {spark.map((v, i) => (
            <span key={i} style={{ width: '5px', borderRadius: '2px', height: `${Math.max((v / max) * 100, 8)}%`, background: i === spark.length - 1 ? 'var(--pf-gold)' : 'var(--pf-border-strong)' }} />
          ))}
        </div>
      </div>
    </div>
  )
}

/** "2h ago"-style short relative time for feeds. */
export function timeAgo(d: Date): string {
  const s = Math.floor((Date.now() - d.getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  if (s < 172800) return 'yesterday'
  return formatDate(d.toISOString())
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
