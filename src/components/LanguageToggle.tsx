'use client'
import { useState, useEffect } from 'react'

interface LanguageToggleProps {
  light?: boolean
}

export default function LanguageToggle({ light = false }: LanguageToggleProps) {
  const [locale, setLocale] = useState('fr')

  useEffect(() => {
    const match = document.cookie.match(/locale=([^;]+)/)
    setLocale(match ? match[1] : 'fr')
  }, [])

  const toggle = (lang: string) => {
    document.cookie = `locale=${lang};path=/;max-age=${60 * 60 * 24 * 365}`
    setLocale(lang)
    window.location.reload()
  }

  const textColor = light ? '#2a2119' : '#dfc9a6'
  const activeBg = light ? 'rgba(42,33,25,0.12)' : 'rgba(190,154,86,0.18)'
  const activeColor = light ? '#2a2119' : '#be9a56'

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.125rem',
      background: light ? 'rgba(42,33,25,0.07)' : 'rgba(255,255,255,0.06)',
      borderRadius: '0.25rem',
      padding: '0.125rem',
      flexShrink: 0,
    }}>
      {(['fr', 'en'] as const).map(lang => (
        <button
          key={lang}
          onClick={() => toggle(lang)}
          style={{
            background: locale === lang ? activeBg : 'transparent',
            border: 'none',
            color: locale === lang ? activeColor : `${textColor}80`,
            fontFamily: 'var(--font-mono)',
            fontSize: '0.6875rem',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            padding: '0.3125rem 0.5rem',
            borderRadius: '0.1875rem',
            cursor: 'pointer',
            transition: 'all 0.2s',
            fontWeight: locale === lang ? 600 : 400,
          }}
        >
          {lang}
        </button>
      ))}
    </div>
  )
}
