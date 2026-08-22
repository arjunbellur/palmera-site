'use client'
import { useEffect } from 'react'

/** Close-on-Escape for modals and sheets (UI audit: none did). */
export function useEscape(onClose: (() => void) | undefined, active = true) {
  useEffect(() => {
    if (!active || !onClose) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose, active])
}
