'use client'
// Shared CSS-only chart primitives in the pf idiom, extracted from the
// partner earnings page so /admin analytics and /partner render identically.
// No chart library: flexbox + gradient fills + the pf-bar/pf-pill animations
// (globals.css). Values are pre-computed by the caller — these only draw.

export interface BarDatum { label: string; value: number; display?: string; img?: string | null }

/** Vertical bars, gold gradient, grown-from-baseline animation. The 6%/2%
 *  floor keeps tiny-but-nonzero periods visible. */
export function BarChart({ data, height = 96 }: { data: BarDatum[]; height?: number }) {
  const max = Math.max(...data.map((d) => d.value), 0)
  return (
    <div style={{ padding: '20px 18px 14px', borderRadius: '18px', background: 'var(--pf-card)', border: '1px solid var(--pf-border)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px' }}>
        {data.map((d, i) => (
          <div key={`${d.label}_${i}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '7px', minWidth: 0 }}>
            {d.value > 0 && <span style={{ fontFamily: 'var(--font-sans)', fontSize: '10px', color: 'var(--pf-gold)', whiteSpace: 'nowrap' }}>{d.display ?? d.value}</span>}
            <div style={{ height: `${height}px`, width: '100%', maxWidth: '46px', display: 'flex', alignItems: 'flex-end' }}>
              <div className="pf-bar" style={{ width: '100%', height: `${max > 0 ? Math.max((d.value / max) * 100, d.value > 0 ? 6 : 2) : 2}%`, borderRadius: '9px 9px 4px 4px', background: d.value > 0 ? 'linear-gradient(180deg, var(--pf-gold), var(--pf-gold-deep))' : 'var(--pf-border)', boxShadow: d.value > 0 ? '0 0 16px rgba(190,154,86,0.35)' : 'none' }} />
            </div>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '10px', letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--pf-faint)', whiteSpace: 'nowrap' }}>{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Ranked list — "top X by Y". A quiet editorial list: rank, name, amount
 *  and share, with a 3px hairline underneath showing the proportion. No
 *  glow, no sheen (the fat gold capsules read as progress bars and fought
 *  the numbers). Width still sweeps in from zero via `.pf-pill`. */
export function RankPills({ items }: { items: BarDatum[] }) {
  const total = items.reduce((s, i) => s + Math.max(0, i.value), 0)
  const max = Math.max(...items.map((i) => i.value), 1)
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {items.map((b, i) => {
        const share = total > 0 ? Math.round((b.value / total) * 100) : 0
        return (
          <div key={`${b.label}_${i}`} style={{ padding: '9px 0 10px', borderTop: i > 0 ? '1px solid var(--pf-border)' : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '7px' }}>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: '10px', color: 'var(--pf-faint)', width: '14px', flexShrink: 0, textAlign: 'right' }}>{i + 1}</span>
              {b.img && (
                // eslint-disable-next-line @next/next/no-img-element
                <img loading="lazy" decoding="async" src={b.img} alt="" style={{ width: '22px', height: '22px', borderRadius: '7px', objectFit: 'cover', flexShrink: 0, border: '1px solid var(--pf-border-strong)' }} />
              )}
              <span style={{ fontFamily: 'var(--font-serif)', fontSize: '14px', color: 'var(--pf-text)', minWidth: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.label}</span>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: '10.5px', color: 'var(--pf-faint)', whiteSpace: 'nowrap' }}>{share}%</span>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: 'var(--pf-text)', whiteSpace: 'nowrap', minWidth: '4.5rem', textAlign: 'right' }}>{b.display ?? b.value}</span>
            </div>
            <div style={{ height: '3px', borderRadius: '2px', background: 'var(--pf-border)', overflow: 'hidden', marginLeft: '24px' }}>
              <div className="pf-pill" style={{ height: '100%', width: `${Math.max((b.value / max) * 100, 1.5)}%`, borderRadius: '2px', background: i === 0 ? 'var(--pf-gold)' : 'var(--pf-gold-deep)', opacity: i === 0 ? 1 : 0.75 }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

/** Radial completion gauge — conic-gradient donut with a center readout. */
export function Donut({ percent, label, sub }: { percent: number; label: string; sub?: string }) {
  const p = Math.max(0, Math.min(100, percent))
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
      <div style={{ width: '92px', height: '92px', borderRadius: '50%', flexShrink: 0, background: `conic-gradient(var(--pf-gold) ${p * 3.6}deg, var(--pf-border) 0deg)`, display: 'grid', placeItems: 'center', boxShadow: p > 0 ? '0 0 26px rgba(190,154,86,0.3)' : 'none' }}>
        <div style={{ width: '66px', height: '66px', borderRadius: '50%', background: 'var(--pf-card-solid)', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-display)', fontSize: '17px', color: 'var(--pf-text)' }}>{Math.round(p)}%</div>
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--pf-faint)' }}>{label}</div>
        {sub && <div style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', color: 'var(--pf-muted)', marginTop: '5px', lineHeight: 1.5 }}>{sub}</div>}
      </div>
    </div>
  )
}
