'use client'
import { useEffect } from 'react'

// Replicates Webflow's "Color Change" / "Color Light" wrapper behavior:
// the page background itself animates between light and dark as you scroll.
// Sections are transparent; the body carries the color.
const LIGHT = '#ebe8db' // BG/BG 1 from Webflow
const DARK = '#2a2119'  // Color/Dark from Webflow

// Each zone: section id -> background color when it occupies viewport center
const ZONES: { id: string; color: string }[] = [
  { id: 'hero',   color: DARK },
  { id: 'base',   color: LIGHT },
  { id: 'makes',  color: DARK },
  { id: 'skills', color: LIGHT },
  { id: 'story',  color: DARK },
  { id: 'signal', color: LIGHT },
]

export default function BackgroundController() {
  useEffect(() => {
    document.body.style.transition = 'background-color 0.8s ease'
    document.body.style.backgroundColor = DARK

    let raf = 0
    const update = () => {
      const mid = window.innerHeight * 0.5
      let color = LIGHT

      // Footer counts as light
      const footer = document.querySelector('footer')
      if (footer) {
        const r = footer.getBoundingClientRect()
        if (r.top <= mid && r.bottom > mid) {
          document.body.style.backgroundColor = LIGHT
          return
        }
      }

      for (const zone of ZONES) {
        const el = document.getElementById(zone.id)
        if (!el) continue
        const r = el.getBoundingClientRect()
        if (r.top <= mid && r.bottom > mid) {
          color = zone.color
          break
        }
      }
      document.body.style.backgroundColor = color
    }

    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(update)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    update()
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [])

  return null
}
