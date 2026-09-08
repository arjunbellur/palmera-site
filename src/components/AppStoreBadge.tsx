'use client'
import { useLocale } from 'next-intl'

export const APP_STORE_URL = 'https://apps.apple.com/app/palmera/id6784757513'

/** The download call-to-action. `light` = cream pill for the dark bands;
 *  `dark` = dark pill on the cream ground. */
export function AppStoreBadge({ variant = 'dark' }: { variant?: 'dark' | 'light' }) {
  const locale = useLocale()
  const light = variant === 'light'
  return (
    <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" aria-label="App Store"
      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.625rem', padding: '0.75rem 1.375rem', background: light ? '#ebe8db' : 'var(--color-dark)', borderRadius: '0.625rem', textDecoration: 'none', color: light ? '#2a2119' : '#ebe8db' }}>
      <svg width="20" height="24" viewBox="0 0 384 512" fill="currentColor" aria-hidden>
        <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
      </svg>
      <span style={{ display: 'grid', lineHeight: 1.15, textAlign: 'left' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.72 }}>
          {locale === 'fr' ? 'Télécharger dans' : 'Download on the'}
        </span>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.0625rem', fontWeight: 600, letterSpacing: '-0.01em' }}>{locale === 'fr' ? 'l’App Store' : 'App Store'}</span>
      </span>
    </a>
  )
}
