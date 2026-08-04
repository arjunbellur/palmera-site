'use client'
// Shared CSS-only chart primitives in the pf idiom, extracted from the
// partner earnings page so /admin analytics and /partner render identically.
// No chart library: flexbox + gradient fills + the pf-bar/pf-pill animations
// (globals.css). Values are pre-computed by the caller — these only draw.

export interface BarDatum { label: string; value: number; display?: string }

/** Vertical bars, gold gradient, grown-from-baseline animation. The 6%/2%
 *  floor keeps tiny-but-nonzero periods visible. */
export function BarChart({ data, height = 96 }: { data: BarDatum[]; height?: number }) {
  const max = Math.max(...data.map((d) => d.value), 0)
  return (
    <div style={{ padding: '20px 18px 14px', borderRadius: '18px', background: 'var(--pf-card)', border: '1px solid var(--pf-border)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px' }}>
        {data.map((d, i) => (
          <div key={`${d.label}_${i}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '7px', minWidth: 0 }}>
            {d.value > 0 && <span style={{ fontFamily: 'var(--font-sans)', fontSize: '9.5px', color: 'var(--pf-gold)', whiteSpace: 'nowrap' }}>{d.display ?? d.value}</span>}
            <div style={{ height: `${height}px`, width: '100%', maxWidth: '46px', display: 'flex', alignItems: 'flex-end' }}>
              <div className="pf-bar" style={{ width: '100%', height: `${max > 0 ? Math.max((d.value / max) * 100, d.value > 0 ? 6 : 2) : 2}%`, borderRadius: '9px 9px 4px 4px', background: d.value > 0 ? 'linear-gradient(180deg, var(--pf-gold), var(--pf-gold-deep))' : 'var(--pf-border)' }} />
            </div>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '8.5px', letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--pf-faint)', whiteSpace: 'nowrap' }}>{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Horizontal ranked pills — "top X by Y". Sweeps in from zero width. */
export function RankPills({ items }: { items: BarDatum[] }) {
  const max = Math.max(...items.map((i) => i.value), 1)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      {items.map((b, i) => (
        <div key={`${b.label}_${i}`}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '7px', gap: '12px' }}>
            <span style={{ fontFamily: 'var(--font-serif)', fontSize: '14.5px', color: 'var(--pf-text)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.label}</span>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', color: 'var(--pf-gold)', whiteSpace: 'nowrap' }}>{b.display ?? b.value}</span>
          </div>
          <div style={{ height: '30px', borderRadius: '20px', background: 'var(--pf-card)', border: '1px solid var(--pf-border)', overflow: 'hidden' }}>
            <div className="pf-pill" style={{ height: '100%', width: `${Math.max((b.value / max) * 100, 4)}%`, borderRadius: '20px', background: 'linear-gradient(90deg, var(--pf-gold-deep), var(--pf-gold))' }} />
          </div>
        </div>
      ))}
    </div>
  )
}
