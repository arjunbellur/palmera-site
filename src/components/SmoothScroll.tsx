'use client'
import Lenis from 'lenis'
import { useEffect } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { dispatchScroll } from '@/lib/scroll-bus'

declare global { interface Window { __lenis?: Lenis } }

// ONE scroll engine. Lenis smooths the wheel; GSAP's ticker drives Lenis;
// ScrollTrigger reads Lenis's position. Every scroll animation on the site
// hangs off this so nothing fights anything (the old hand-rolled rAF loops
// each polled scroll independently — that was the "buggy" feel).
export default function SmoothScroll() {
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger)
    const lenis = new Lenis({
      duration: 1.1,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    })
    window.__lenis = lenis
    lenis.on('scroll', () => { dispatchScroll(); ScrollTrigger.update() })
    const tick = (time: number) => { lenis.raf(time * 1000) }
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)
    return () => {
      gsap.ticker.remove(tick)
      lenis.destroy()
      delete window.__lenis
    }
  }, [])

  return null
}
