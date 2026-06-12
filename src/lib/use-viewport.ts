'use client'
import { useState, useEffect } from 'react'

export function useViewport() {
  const [w, setW] = useState(1280)
  useEffect(() => {
    const update = () => setW(window.innerWidth)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])
  return {
    isMobile: w < 768,
    isTablet: w >= 768 && w < 1024,
    w,
  }
}
