'use client'
import { useEffect } from 'react'
import { onScrollFrame } from '@/lib/scroll-bus'

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
    document.body.style.transition = 'background-color 0.45s ease'
    document.body.style.backgroundColor = DARK

    // Cache DOM refs — avoids querySelector on every frame
    const zoneEls: (Element | null)[] = ZONES.map(z => document.getElementById(z.id))
    let footer = document.querySelector('footer')
    const onResize = () => { footer = document.querySelector('footer') }
    window.addEventListener('resize', onResize)

    const update = () => {
      const mid = window.innerHeight * 0.5
      let color = LIGHT

      if (footer) {
        const r = footer.getBoundingClientRect()
        if (r.top <= mid && r.bottom > mid) { document.body.style.backgroundColor = LIGHT; return }
      }

      for (let i = 0; i < ZONES.length; i++) {
        const el = zoneEls[i]
        if (!el) continue
        const r = el.getBoundingClientRect()
        if (r.top <= mid && r.bottom > mid) { color = ZONES[i].color; break }
      }
      document.body.style.backgroundColor = color
    }

    const unsub = onScrollFrame(update)
    update()
    return () => {
      unsub()
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return null
}
