'use client'
/**
 * Price input in the same idiom as Stepper (Arjun): big − / + buttons, the
 * number typed directly, formatted with thousands separators while editing,
 * and a SMART step — ±500 under 10 000 XOF, ±1 000 under 100 000, ±5 000
 * above — so a partner reaches 45 000 in a few taps instead of forty.
 */
export default function PriceInput({ value, onChange, placeholder, compact }: {
  value: number | null; onChange: (v: number | null) => void; placeholder?: string; compact?: boolean
}) {
  const step = (v: number) => (v < 10_000 ? 500 : v < 100_000 ? 1_000 : 5_000)
  const v = value ?? 0
  const size = compact ? '1.875rem' : '2.25rem'
  const btn: React.CSSProperties = { width: size, height: size, borderRadius: '50%', border: '1px solid var(--db-border-gold)', background: 'transparent', color: 'var(--db-text)', fontSize: compact ? '1rem' : '1.125rem', cursor: 'pointer', lineHeight: 1, flexShrink: 0 }
  const shown = value == null ? '' : new Intl.NumberFormat('fr-FR').format(value)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: compact ? '0.5rem' : '0.875rem' }}>
      <button type="button" onClick={() => onChange(Math.max(0, v - step(v - 1)))} disabled={v <= 0} style={{ ...btn, opacity: v <= 0 ? 0.35 : 1 }}>−</button>
      <div style={{ position: 'relative', flex: 1, minWidth: compact ? '5.5rem' : '7rem' }}>
        <input inputMode="numeric" placeholder={placeholder ?? '0'} value={shown}
          onChange={(e) => { const digits = e.target.value.replace(/[^0-9]/g, ''); onChange(digits ? Math.min(99_999_999, parseInt(digits, 10)) : null) }}
          style={{ width: '100%', textAlign: 'center', background: 'var(--db-bg-input)', border: '1px solid var(--db-border-subtle)', borderRadius: '0.375rem', padding: compact ? '0.375rem 2.25rem 0.375rem 0.5rem' : '0.4375rem 2.5rem 0.4375rem 0.5rem', color: 'var(--db-text)', fontFamily: 'var(--font-display)', fontSize: compact ? '1rem' : '1.125rem', outline: 'none' }} />
        <span style={{ position: 'absolute', right: '0.625rem', top: '50%', transform: 'translateY(-50%)', fontFamily: 'var(--font-sans)', fontSize: '0.625rem', letterSpacing: '0.08em', color: 'var(--db-text-faint)', pointerEvents: 'none' }}>XOF</span>
      </div>
      <button type="button" onClick={() => onChange(v + step(v))} style={btn}>+</button>
    </div>
  )
}
