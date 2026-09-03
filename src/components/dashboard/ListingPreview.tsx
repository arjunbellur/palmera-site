'use client'
// Guest-facing preview of a listing, matched to the real app render (Papa
// Dikoum via Jordan, 2026-09-03: "the output on Palmera platform must be the
// same" — same typography, same layout). Reference: the app's Discover card
// ("Hand-picked for you" tile) and ExperienceView. Shared by the editor's
// Preview step and the "Preview as guest" button on listing cards.
import type { Experience } from '@/lib/schema'
import { formatAmount } from '@/lib/money'

const fmt = formatAmount
const hintStyle: React.CSSProperties = { fontSize: '0.6875rem', color: 'var(--db-text-ghost)', fontFamily: 'var(--font-sans)', margin: 0, lineHeight: 1.5 }

const STR = {
  fr: { previewNote: 'Aperçu fidèle à l’app — les avis et distances sont des exemples.', prevHomeCard: 'Carte sur la page d’accueil', prevDetail: 'Page de l’expérience', mainPhoto: 'Photo principale', guestsWord: 'pers.', fromLabel: 'À PARTIR DE', bookNow: 'Réserver', message: 'Message', theExperience: 'L’expérience', included: 'Ce qui est inclus' },
  en: { previewNote: 'Matched to the app — ratings and distances are placeholders.', prevHomeCard: 'Card on the home page', prevDetail: 'Experience page', mainPhoto: 'Main photo', guestsWord: 'guests', fromLabel: 'FROM', bookNow: 'Book now', message: 'Message', theExperience: 'The Experience', included: 'What’s included' },
}

// The app's palette (Palette.swift): deep navy ground, lighter navy chips,
// gold accents, warm cream type. Serif everywhere the app uses its serif.
const APP = { sheet: '#0D2136', chip: '#15304A', chipSoft: 'rgba(233,188,79,0.16)', gold: '#E9BC4F', cream: '#F6F1E4', dim: 'rgba(246,241,228,0.62)', navyInk: '#132638' }

const eyebrow = (extra?: React.CSSProperties): React.CSSProperties => ({ color: APP.gold, fontFamily: 'var(--font-sans)', fontSize: '0.625rem', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', ...extra })
const serifTitle = (size: string): React.CSSProperties => ({ color: APP.cream, fontFamily: 'var(--font-serif)', fontSize: size, fontWeight: 700, lineHeight: 1.12, letterSpacing: '0.01em' })
const iconCircle: React.CSSProperties = { width: '1.75rem', height: '1.75rem', borderRadius: '50%', background: 'rgba(13,33,54,0.55)', color: APP.cream, display: 'grid', placeItems: 'center', fontSize: '0.75rem' }

function Stars({ score = '0.00', count = 0 }: { score?: string; count?: number }) {
  return (
    <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem' }}>
      <span style={{ color: APP.gold }}>★ </span>
      <span style={{ color: APP.cream, fontWeight: 600 }}>{score}</span>
      <span style={{ color: APP.gold }}> ({count})</span>
    </span>
  )
}

export default function ListingPreview({ exp, companyName, locale }: { exp: Partial<Experience>; companyName?: string; locale: 'fr' | 'en' }) {
  const S = STR[locale]
  const price = exp.mode === 'paid' ? (exp.price || 0) : 0
  const usd = Math.round(price / 560) // rough XOF→USD, preview only — the app does the same "≈ $" hint
  const includes = (exp.includes || []).filter(Boolean).slice(0, 4)
  const sectionLabel = (txt: string) => (
    <p style={{ fontSize: '0.6875rem', color: 'var(--db-gold)', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'var(--font-sans)', margin: '0 0 0.625rem', textAlign: 'center' }}>{txt}</p>
  )
  const photo = (h: string, children?: React.ReactNode) => (
    <div style={{ height: h, background: exp.img ? `center/cover url(${exp.img})` : '#1a2f44', display: 'grid', placeItems: 'center', position: 'relative' }}>
      {!exp.img && <span style={{ color: APP.dim, fontFamily: 'var(--font-sans)', fontSize: '0.75rem' }}>{S.mainPhoto}</span>}
      {children}
    </div>
  )
  return (
    <div>
      {/* ── Home-feed card — the "Hand-picked for you" tile: photo with the
          send/heart pills, then eyebrow CATEGORY · CITY, serif title and the
          rating BELOW the photo. No price on the card — the app shows none. */}
      {sectionLabel(S.prevHomeCard)}
      <div style={{ maxWidth: '16rem', margin: '0 auto 1.75rem', borderRadius: '1.375rem', overflow: 'hidden', border: '1px solid var(--db-border-subtle)', background: APP.sheet }}>
        {photo('14rem', (
          <div style={{ position: 'absolute', top: '0.625rem', right: '0.625rem', display: 'grid', gap: '0.375rem' }}>
            <span style={iconCircle}>➤</span>
            <span style={iconCircle}>♡</span>
          </div>
        ))}
        <div style={{ padding: '0.875rem 1rem 1rem' }}>
          <div style={eyebrow({ marginBottom: '0.375rem' })}>
            {[exp.category, exp.city].filter(Boolean).join(' · ') || '…'}
          </div>
          <div style={{ ...serifTitle('1.1875rem'), marginBottom: '0.375rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{exp.title || '…'}</div>
          <Stars />
        </div>
      </div>

      {/* ── Experience page — ExperienceView: hero with carousel dots, anchor
          eyebrow + ↗, big serif title, rating · guests, company chip with the
          Message pill, The Experience, What's included, FROM / ≈ $ / Book now. */}
      {sectionLabel(S.prevDetail)}
      <div style={{ maxWidth: '23rem', margin: '0 auto', borderRadius: '1.25rem', overflow: 'hidden', border: '1px solid var(--db-border-subtle)', background: APP.sheet }}>
        {photo('12rem', (
          <div style={{ position: 'absolute', bottom: '0.625rem', right: '0.875rem', display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
            <span style={{ width: '1rem', height: '0.25rem', borderRadius: '999px', background: APP.gold }} />
            <span style={{ width: '0.25rem', height: '0.25rem', borderRadius: '50%', background: 'rgba(246,241,228,0.5)' }} />
            <span style={{ width: '0.25rem', height: '0.25rem', borderRadius: '50%', background: 'rgba(246,241,228,0.5)' }} />
          </div>
        ))}
        <div style={{ padding: '1.25rem 1.25rem 0' }}>
          {exp.location && (
            <div style={eyebrow({ marginBottom: '0.625rem' })}>⚓ {exp.location} <span style={{ letterSpacing: 0 }}>↗</span></div>
          )}
          <div style={{ ...serifTitle('1.875rem'), marginBottom: '0.5rem' }}>{exp.title || '…'}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: APP.cream, fontFamily: 'var(--font-sans)', fontSize: '0.75rem' }}>
            <Stars />
            <span style={{ color: APP.dim }}>·</span>
            <span>◍ {exp.minGuests}–{exp.maxGuests} {S.guestsWord}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', background: APP.chip, borderRadius: '1rem', padding: '0.75rem 0.875rem', marginBottom: '1.125rem' }}>
            <span style={{ width: '2.25rem', height: '2.25rem', borderRadius: '50%', background: APP.gold, color: APP.navyInk, display: 'grid', placeItems: 'center', fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: '1rem', flexShrink: 0 }}>{(companyName || 'P').charAt(0).toUpperCase()}</span>
            <span style={{ minWidth: 0, flex: 1 }}>
              <span style={{ display: 'block', color: APP.cream, fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{companyName || '—'} <span style={{ color: APP.gold }}>✓</span> <span style={{ color: APP.dim }}>›</span></span>
              <Stars />
            </span>
            <span style={{ border: `1.5px solid ${APP.gold}`, color: APP.gold, borderRadius: '999px', padding: '0.4375rem 1rem', fontFamily: 'var(--font-sans)', fontSize: '0.75rem', fontWeight: 600, flexShrink: 0 }}>{S.message}</span>
          </div>
          {exp.description && (
            <>
              <div style={eyebrow({ marginBottom: '0.5rem' })}>{S.theExperience}</div>
              <p style={{ color: APP.dim, fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', lineHeight: 1.6, margin: '0 0 1.125rem', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{exp.description}</p>
            </>
          )}
          {includes.length > 0 && (
            <>
              <div style={eyebrow({ marginBottom: '0.625rem' })}>{S.included}</div>
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {includes.map((item) => (
                  <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                    <span style={{ width: '1.25rem', height: '1.25rem', borderRadius: '50%', background: APP.chipSoft, color: APP.gold, display: 'grid', placeItems: 'center', fontSize: '0.625rem', fontWeight: 700, flexShrink: 0 }}>✓</span>
                    <span style={{ color: APP.cream, fontFamily: 'var(--font-sans)', fontSize: '0.8125rem' }}>{item}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', margin: '1.125rem 1rem 1rem', padding: '0.75rem 1.125rem', background: APP.chip, borderRadius: '1.25rem' }}>
          <div>
            <div style={{ color: APP.dim, fontFamily: 'var(--font-sans)', fontSize: '0.5625rem', fontWeight: 600, letterSpacing: '0.14em' }}>{S.fromLabel}</div>
            <div style={{ ...serifTitle('1.375rem') }}>{fmt(price)} XOF</div>
            <div style={{ color: APP.dim, fontFamily: 'var(--font-sans)', fontSize: '0.6875rem' }}>≈ ${fmt(usd)}</div>
          </div>
          <div style={{ background: APP.gold, color: APP.navyInk, borderRadius: '999px', padding: '0.75rem 1.5rem', fontFamily: 'var(--font-sans)', fontSize: '0.875rem', fontWeight: 700 }}>{S.bookNow}</div>
        </div>
      </div>
      <p style={{ ...hintStyle, textAlign: 'center', marginTop: '0.875rem' }}>{S.previewNote}</p>
    </div>
  )
}
