'use client'
// Shared visual vocabulary for the /partner surface, ported from the Claude
// Design mockup. Everything reads --pf-* tokens so light/dark come free.
//
// Font mapping: the mockup used Google stand-ins (Cormorant / Source Serif /
// IBM Plex Mono) because it couldn't load our licensed faces. We keep the same
// ROLES but bind them to the real brand fonts:
//   display numerals + headings → var(--font-display)  (Raveo Display)
//   body copy                   → var(--font-serif)    (LT Superior Serif)
//   labels, data, chrome        → var(--font-sans)     (Geist Mono)
import type { CSSProperties, ReactNode } from 'react'

export const card: CSSProperties = {
  padding: '18px',
  borderRadius: '16px',
  background: 'var(--pf-card)',
  border: '1px solid var(--pf-border)',
}

/** Shape-only card style for glass surfaces — pair with className="pf-glass"
 *  (the class carries background/border/blur/hover; inline would override). */
export const cardShape: CSSProperties = { padding: '18px', borderRadius: '16px' }

export const eyebrow: CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: '10px',
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'var(--pf-faint)',
}

export const numeral: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 500,
  color: 'var(--pf-text)',
  lineHeight: 1,
}

export const bodyText: CSSProperties = {
  fontFamily: 'var(--font-serif)',
  color: 'var(--pf-muted)',
  fontSize: '0.9375rem',
  lineHeight: 1.6,
}

export const mono: CSSProperties = { fontFamily: 'var(--font-sans)', color: 'var(--pf-muted)' }

/** Section heading with the small gold eyebrow above it. */
export function ScreenHeader({ label, title, intro }: { label: string; title: string; intro?: string }) {
  return (
    <div style={{ marginBottom: '22px' }}>
      <div style={{ ...eyebrow, color: 'var(--pf-eyebrow)', marginBottom: '8px' }}>{label}</div>
      <h1 style={{ fontFamily: 'var(--font-display)', color: 'var(--pf-head)', fontSize: 'clamp(1.5rem, 3.4vw, 2rem)', fontWeight: 400, letterSpacing: '0.04em', margin: 0 }}>{title}</h1>
      {intro && <p style={{ ...bodyText, margin: '10px 0 0', maxWidth: '38rem' }}>{intro}</p>}
    </div>
  )
}

/** An amount plus its independent currency suffix, as the mockup lays it out. */
export function Money({ amount, size = 27, currency = 'XOF' }: { amount: string; size?: number; currency?: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: size > 34 ? '8px' : '5px' }}>
      <span style={{ ...numeral, fontSize: `${size}px`, fontWeight: size > 34 ? 600 : 500 }}>{amount}</span>
      <span style={{ fontFamily: 'var(--font-sans)', fontSize: size > 34 ? '13px' : '11px', color: 'var(--pf-muted)' }}>{currency}</span>
    </span>
  )
}

/** Small stat tile: mono label above a serif numeral. */
export function StatTile({ label, amount, sub, currency }: { label: string; amount: string; sub?: ReactNode; currency?: string }) {
  return (
    <div className="pf-glass" style={cardShape}>
      <div style={eyebrow}>{label}</div>
      <div style={{ marginTop: '6px' }}><Money amount={amount} currency={currency} /></div>
      {sub && <div style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', color: 'var(--pf-muted)', marginTop: '8px' }}>{sub}</div>}
    </div>
  )
}

const TONES = {
  gold: { color: 'var(--pf-gold)', bg: 'var(--pf-gold-soft)' },
  green: { color: 'var(--pf-success)', bg: 'var(--pf-green-soft)' },
  alert: { color: 'var(--pf-alert)', bg: 'rgba(196,124,124,0.14)' },
  neutral: { color: 'var(--pf-faint)', bg: 'var(--pf-card)' },
} as const
export type Tone = keyof typeof TONES

export function Chip({ children, tone = 'neutral' }: { children: ReactNode; tone?: Tone }) {
  const t = TONES[tone]
  return (
    <span style={{ fontFamily: 'var(--font-sans)', fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', color: t.color, background: t.bg, padding: '3px 8px', borderRadius: '999px', whiteSpace: 'nowrap' }}>
      {children}
    </span>
  )
}

/** Empty state — a first-class screen here, since a new partner sees these first.
    Mockup idiom: the icon sits in a thin gold circle, and an optional mono chip
    carries the one reassuring fact ("paid every two weeks"). */
export function EmptyState({ icon, title, body, chip, action }: { icon: ReactNode; title: string; body: string; chip?: string; action?: ReactNode }) {
  return (
    <div className="pf-glass" style={{ ...cardShape, padding: '38px 22px', textAlign: 'center', borderRadius: '18px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
      <div style={{ width: '54px', height: '54px', borderRadius: '50%', border: '1px solid var(--pf-border-strong)', display: 'grid', placeItems: 'center', color: 'var(--pf-gold)', fontSize: '22px' }}>{icon}</div>
      <p style={{ fontFamily: 'var(--font-display)', color: 'var(--pf-head)', fontSize: '1.25rem', fontWeight: 400, letterSpacing: '0.03em', margin: 0 }}>{title}</p>
      <p style={{ ...bodyText, fontSize: '0.875rem', margin: 0, maxWidth: '40ch' }}>{body}</p>
      {chip && (
        <span style={{ marginTop: '4px', fontFamily: 'var(--font-sans)', fontSize: '10.5px', letterSpacing: '0.08em', color: 'var(--pf-gold)', border: '1px solid var(--pf-border-strong)', borderRadius: '20px', padding: '7px 14px' }}>{chip}</span>
      )}
      {action && <div style={{ marginTop: '6px' }}>{action}</div>}
    </div>
  )
}

export function PrimaryButton({ children, onClick, href, disabled, fullWidth, type = 'button', ariaLabel }: {
  children: ReactNode; onClick?: () => void; href?: string
  /** The props partner pages used to clone this button for. */
  disabled?: boolean; fullWidth?: boolean; type?: 'button' | 'submit'; ariaLabel?: string
}) {
  const style: CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px 20px', minHeight: '40px',
    width: fullWidth ? '100%' : undefined, flex: fullWidth ? 1 : undefined,
    background: 'var(--pf-gold-deep)', border: 'none', borderRadius: '10px', color: '#ebe8db',
    boxShadow: disabled ? 'none' : '0 0 18px rgba(190,154,86,0.28)', opacity: disabled ? 0.6 : 1,
    fontFamily: 'var(--font-sans)', fontSize: '12.5px', letterSpacing: '0.05em', cursor: disabled ? 'default' : 'pointer', textDecoration: 'none',
  }
  return href
    ? <a href={href} style={style} aria-label={ariaLabel}>{children}</a>
    : <button type={type} onClick={onClick} disabled={disabled} style={style} aria-label={ariaLabel}>{children}</button>
}

export function GhostButton({ children, onClick, tone = 'neutral', ariaLabel, disabled }: { children: ReactNode; onClick?: () => void; tone?: Tone; ariaLabel?: string; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={ariaLabel} style={{
      padding: '9px 16px', minHeight: '40px', background: 'transparent', borderRadius: '10px', cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1,
      border: `1px solid ${tone === 'alert' ? 'rgba(196,124,124,0.4)' : 'var(--pf-border-strong)'}`,
      color: tone === 'alert' ? 'var(--pf-alert)' : 'var(--pf-muted)',
      fontFamily: 'var(--font-sans)', fontSize: '12.5px', letterSpacing: '0.04em',
    }}>{children}</button>
  )
}

/** 40×40 icon-only button for shell headers (theme, sign out, close). */
export function IconButton({ children, onClick, label, tone = 'neutral' }: { children: ReactNode; onClick?: () => void; label: string; tone?: 'neutral' | 'gold' }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} style={{
      width: '40px', height: '40px', borderRadius: '10px', border: '1px solid var(--pf-border)', background: 'transparent',
      color: tone === 'gold' ? 'var(--pf-gold)' : 'var(--pf-faint)', cursor: 'pointer', display: 'grid', placeItems: 'center',
    }}>{children}</button>
  )
}

/** The spinner that was pasted into seven files. */
export function Spinner() {
  return <div style={{ width: '2rem', height: '2rem', border: '2px solid rgba(190,154,86,0.15)', borderTopColor: 'var(--pf-gold)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
}

/** Shared field styles for pf-family forms (settings, supplier, marketplace, admin). */
export const fieldStyle: CSSProperties = {
  width: '100%', padding: '10px 12px', minHeight: '40px', borderRadius: '10px',
  border: '1px solid var(--pf-border)', background: 'var(--pf-bg)',
  color: 'var(--pf-text)', fontFamily: 'var(--font-sans)', fontSize: '13.5px',
}
export const fieldLabel: CSSProperties = {
  display: 'block', fontFamily: 'var(--font-sans)', fontSize: '11px',
  letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--pf-faint)', margin: '12px 0 6px',
}

/** Shimmer placeholder shaped like the content it's waiting for. */
export function Skeleton({ height, style }: { height: string | number; style?: CSSProperties }) {
  return <div className="pf-skel" style={{ height, ...style }} />
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', margin: '28px 0 12px' }}>
      <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--pf-head)', fontSize: '1.0625rem', fontWeight: 400, letterSpacing: '0.03em', margin: 0 }}>{children}</h2>
      {action}
    </div>
  )
}
