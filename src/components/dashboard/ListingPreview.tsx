'use client'
// Guest-facing preview of a listing, matched to the real app: the compact
// home-feed card and the experience page. Shared by the editor's Preview
// step and the "Preview as guest" button on listing cards (Jordan #12).
import type { Experience } from '@/lib/schema'
import { formatAmount } from '@/lib/money'

const fmt = formatAmount
const hintStyle: React.CSSProperties = { fontSize: '0.6875rem', color: 'var(--db-text-ghost)', fontFamily: 'var(--font-sans)', margin: 0, lineHeight: 1.5 }

const STR = {
  fr: { previewNote: 'Aperçu approximatif — l’app peut différer légèrement.', prevHomeCard: 'Carte sur la page d’accueil', prevDetail: 'Page de l’expérience', mainPhoto: 'Photo principale', guestsWord: 'pers.', fromLabel: 'À PARTIR DE', bookNow: 'Réserver' },
  en: { previewNote: 'Approximate preview — the app may differ slightly.', prevHomeCard: 'Card on the home page', prevDetail: 'Experience page', mainPhoto: 'Main photo', guestsWord: 'guests', fromLabel: 'FROM', bookNow: 'Book now' },
}

export default function ListingPreview({ exp, companyName, locale }: { exp: Partial<Experience>; companyName?: string; locale: 'fr' | 'en' }) {
  const S = STR[locale]
  const APP = { sheet: '#0E2233', chip: '#16324a', gold: '#E9BC4F', goldDeep: '#D9A62E', cream: '#F3EBD8', dim: 'rgba(243,235,216,0.65)' }
  const sectionLabel = (txt: string) => (
    <p style={{ fontSize: '0.6875rem', color: 'var(--db-gold)', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'var(--font-sans)', margin: '0 0 0.625rem', textAlign: 'center' }}>{txt}</p>
  )
  return (
    <div>
      {/* Home-feed card — the compact tile guests scroll past (Jordan's ask):
          photo with a bottom gradient, title + city over it, FROM price. */}
      {sectionLabel(S.prevHomeCard)}
      <div style={{ maxWidth: '17rem', margin: '0 auto 1.75rem', borderRadius: '1.125rem', overflow: 'hidden', border: '1px solid var(--db-border-subtle)', background: APP.sheet, position: 'relative' }}>
        <div style={{ height: '13rem', background: exp.img ? `center/cover url(${exp.img})` : '#1a2f44', display: 'grid', placeItems: 'center' }}>
          {!exp.img && <span style={{ color: APP.dim, fontFamily: 'var(--font-sans)', fontSize: '0.75rem' }}>{S.mainPhoto}</span>}
        </div>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(14,34,51,0) 40%, rgba(14,34,51,0.92) 100%)' }} />
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '0.875rem 1rem' }}>
          {exp.city && <div style={{ color: APP.gold, fontFamily: 'var(--font-sans)', fontSize: '0.5625rem', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>⚲ {exp.city}</div>}
          <div style={{ color: APP.cream, fontFamily: 'var(--font-serif)', fontSize: '1.0625rem', fontWeight: 600, lineHeight: 1.2, marginBottom: '0.25rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{exp.title || '…'}</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
            <span style={{ color: APP.dim, fontFamily: 'var(--font-sans)', fontSize: '0.6875rem' }}><span style={{ color: APP.gold }}>★</span> 0.00</span>
            <span style={{ color: APP.cream, fontFamily: 'var(--font-sans)', fontSize: '0.75rem' }}><span style={{ color: APP.dim, fontSize: '0.5625rem', letterSpacing: '0.1em' }}>{S.fromLabel}</span> {fmt((exp.mode === 'paid') ? (exp.price || 0) : 0)} XOF</span>
          </div>
        </div>
      </div>

      {sectionLabel(S.prevDetail)}
      <div style={{ maxWidth: '23rem', margin: '0 auto', borderRadius: '1.25rem', overflow: 'hidden', border: '1px solid var(--db-border-subtle)', background: APP.sheet }}>
        <div style={{ height: '11rem', background: exp.img ? `center/cover url(${exp.img})` : '#1a2f44', display: 'grid', placeItems: 'center' }}>
          {!exp.img && <span style={{ color: APP.dim, fontFamily: 'var(--font-sans)', fontSize: '0.75rem' }}>{S.mainPhoto}</span>}
        </div>
        <div style={{ padding: '1.125rem 1.25rem 0' }}>
          {exp.location && (
            <div style={{ color: APP.gold, fontFamily: 'var(--font-sans)', fontSize: '0.625rem', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>⚲ {exp.location} ↗</div>
          )}
          <div style={{ color: APP.cream, fontFamily: 'var(--font-serif)', fontSize: '1.5rem', fontWeight: 600, lineHeight: 1.15, marginBottom: '0.5rem' }}>{exp.title || '…'}</div>
          <div style={{ color: APP.dim, fontFamily: 'var(--font-sans)', fontSize: '0.75rem', marginBottom: '0.875rem' }}>
            <span style={{ color: APP.gold }}>★</span> 0.00 (0) · ◍ {exp.minGuests}–{exp.maxGuests} {S.guestsWord}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', background: APP.chip, borderRadius: '0.875rem', padding: '0.75rem 0.875rem', marginBottom: '0.875rem' }}>
            <span style={{ width: '2rem', height: '2rem', borderRadius: '50%', background: APP.gold, color: '#132638', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-serif)', fontWeight: 700 }}>{(companyName || 'P').charAt(0).toUpperCase()}</span>
            <span style={{ color: APP.cream, fontFamily: 'var(--font-sans)', fontSize: '0.8125rem' }}>{companyName || '—'} <span style={{ color: APP.gold }}>✓</span></span>
          </div>
          {exp.description && (
            <>
              <div style={{ color: APP.gold, fontFamily: 'var(--font-sans)', fontSize: '0.625rem', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '0.375rem' }}>The Experience</div>
              <p style={{ color: APP.dim, fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', lineHeight: 1.6, margin: 0, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{exp.description}</p>
            </>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', margin: '1rem', padding: '0.75rem 1rem', background: APP.chip, borderRadius: '1rem' }}>
          <div>
            <div style={{ color: APP.dim, fontFamily: 'var(--font-sans)', fontSize: '0.5625rem', letterSpacing: '0.12em' }}>{S.fromLabel}</div>
            <div style={{ color: APP.cream, fontFamily: 'var(--font-serif)', fontSize: '1.25rem', fontWeight: 600 }}>{fmt((exp.mode === 'paid') ? (exp.price || 0) : 0)} XOF</div>
          </div>
          <div style={{ background: APP.gold, color: '#132638', borderRadius: '999px', padding: '0.625rem 1.375rem', fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', fontWeight: 600 }}>{S.bookNow}</div>
        </div>
      </div>
      <p style={{ ...hintStyle, textAlign: 'center', marginTop: '0.875rem' }}>{S.previewNote}</p>
    </div>
  )
}
