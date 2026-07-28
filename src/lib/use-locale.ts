'use client'
import { useEffect, useState } from 'react'

export type Locale = 'fr' | 'en'

/**
 * The user's language, from the same `locale` cookie the dashboards write.
 * French is the default — most partners work in French — so a missing cookie
 * must never silently produce an English UI.
 */
export function useLocale(): Locale {
  const [locale, setLocale] = useState<Locale>('fr')
  useEffect(() => {
    const m = document.cookie.match(/locale=([^;]+)/)
    if (m && (m[1] === 'fr' || m[1] === 'en')) setLocale(m[1])
  }, [])
  return locale
}
