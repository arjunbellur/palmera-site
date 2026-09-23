'use client'
import { useLocale } from 'next-intl'

export const APP_STORE_URL = 'https://apps.apple.com/app/palmera/id6784757513'
export const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.palmeraexp.app&pcampaignid=web_share'

type Variant = 'dark' | 'light' | 'glass'

// Three treatments for the same pill:
//   dark  — dark pill on the cream ground
//   light — cream pill on the dark bands
//   glass — frosted, for sitting on photography/video without covering it
const styles = (variant: Variant): React.CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', gap: '0.625rem', padding: '0.75rem 1.25rem', borderRadius: '0.625rem', textDecoration: 'none', whiteSpace: 'nowrap',
  transition: 'background 0.35s ease, border-color 0.35s ease',
  ...(variant === 'dark' ? { background: 'var(--color-dark)', color: '#ebe8db', border: '1px solid transparent' }
    : variant === 'light' ? { background: '#ebe8db', color: '#2a2119', border: '1px solid transparent' }
    : { background: 'rgba(4,4,4,0.32)', color: '#ebe8db', border: '1px solid rgba(235,232,219,0.28)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)' }),
})

function Label({ top, name }: { top: string; name: string }) {
  return (
    <span style={{ display: 'grid', lineHeight: 1.15, textAlign: 'left' }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.72 }}>{top}</span>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.0625rem', fontWeight: 600, letterSpacing: '-0.01em' }}>{name}</span>
    </span>
  )
}

export function AppStoreBadge({ variant = 'dark' }: { variant?: Variant }) {
  const locale = useLocale()
  return (
    <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" aria-label="App Store" className={`store-badge store-${variant}`} style={styles(variant)}>
      <svg width="20" height="24" viewBox="0 0 384 512" fill="currentColor" aria-hidden>
        <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
      </svg>
      <Label top={locale === 'fr' ? 'Télécharger dans' : 'Download on the'} name={locale === 'fr' ? 'l’App Store' : 'App Store'} />
    </a>
  )
}

export function PlayStoreBadge({ variant = 'dark' }: { variant?: Variant }) {
  const locale = useLocale()
  return (
    <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" aria-label="Google Play" className={`store-badge store-${variant}`} style={styles(variant)}>
      {/* Play triangle, single colour so it sits with the Apple mark */}
      <svg width="20" height="22" viewBox="0 0 20 22" fill="currentColor" aria-hidden>
        <path d="M1.2 0.9 11.9 11 1.2 21.1c-.4-.3-.7-.8-.7-1.4V2.3c0-.6.3-1.1.7-1.4zM13.2 12.3l3 2.9-11.5 6.5c-.6.3-1.2.3-1.7.1l10.2-9.5zM16.2 6.8l2.9 1.6c1.2.7 1.2 2.5 0 3.2l-2.9 1.6L13.2 11l3-3.2zM2.9.2c.5-.2 1.1-.2 1.7.1l11.5 6.5-3 2.9L2.9.2z" />
      </svg>
      <Label top={locale === 'fr' ? 'Disponible sur' : 'Get it on'} name="Google Play" />
    </a>
  )
}

/** Both stores, side by side, wrapping on narrow screens. */
export function StoreBadges({ variant = 'dark', align = 'start' }: { variant?: Variant; align?: 'start' | 'center' | 'end' }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.625rem', justifyContent: align === 'center' ? 'center' : align === 'end' ? 'flex-end' : 'flex-start' }}>
      <AppStoreBadge variant={variant} />
      <PlayStoreBadge variant={variant} />
      <style>{`
        .store-glass:hover { background: rgba(4,4,4,0.5) !important; border-color: rgba(235,232,219,0.6) !important; }
        .store-badge:focus-visible { outline: 2px solid hsla(36.84,47.11%,76.27%,1); outline-offset: 3px; }
      `}</style>
    </div>
  )
}
