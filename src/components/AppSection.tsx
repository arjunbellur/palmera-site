'use client'
import { useEffect, useRef } from 'react'

const CIRCLE_IMAGES = [
  '/images/gbenga-onalaja-bZC_VAVhoQE-unsplash.jpg',
  '/images/paul-macallan-CFKksjYRSQ8-unsplash.jpg',
  '/images/ed-wingate-ZMIdqdsbP2U-unsplash-min.jpg',
  '/images/redcharlie-nf7W_hn6DKQ-unsplash-min.jpg',
  '/images/priscilla-du-preez-W3SEyZODn8U-unsplash-min.jpg',
  '/images/gilles-de-muynck-PtJDCD4fTI4-unsplash.jpg',
  '/images/chaz-mcgregor-THXYw7ysYus-unsplash.jpg',
  '/images/bas-van-den-eijkhof-w_O7qjB9ZVY-unsplash.jpg',
  '/images/aliunix-NI265AcvQZs-unsplash-1.jpg',
  '/images/ton-toan-dxwt8veyBzQ-unsplash.jpg',
  '/images/konrad-bachusz--tpKv0goE94-unsplash.jpg',
  '/images/haven-xie-IoTTc6Z5lTM-unsplash.jpg',
  '/images/mike-swigunski-H9mQC5pNzP0-unsplash.jpg',
  '/images/marek-okon-v2nO45qoGU0-unsplash.jpg',
  '/images/bruno-ngarukiye-2qCs8eel2qI-unsplash.jpg',
  '/images/bruno-ngarukiye-P7K8gBPNMUc-unsplash.jpg',
  '/images/thomas-ashlock-RAjND0B3HDw-unsplash.jpg',
  '/images/manuel-moreno-DGa0LQ0yDPc-unsplash.jpg',
  '/images/tobias-tullius-XZOO6QHub60-unsplash.jpg',
  '/images/upgraded-points-uu5Z7cx2PdA-unsplash.jpg',
]

export default function AppSection() {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const angleRef = useRef(0)
  const rafRef = useRef<number>(0)
  const itemDataRef = useRef<{ baseDeg: number }[]>([])

  useEffect(() => {
    if (!wrapperRef.current) return
    const items = Array.from(wrapperRef.current.querySelectorAll<HTMLElement>('.circle-img-item'))
    const total = items.length
    const vw = window.innerWidth
    const radius = Math.min(vw * 0.38, 380)
    const imgSize = Math.min(vw * 0.1, 108)

    items.forEach((item, i) => {
      const baseDeg = (i / total) * 360 - 90
      itemDataRef.current[i] = { baseDeg }
      item.style.width = `${imgSize}px`
      item.style.height = `${imgSize}px`
    })

    const positionItems = (rotDeg: number) => {
      items.forEach((item, i) => {
        const totalDeg = itemDataRef.current[i].baseDeg + rotDeg
        const rad = (totalDeg * Math.PI) / 180
        const x = Math.cos(rad) * radius
        const y = Math.sin(rad) * radius
        const sz = item.offsetWidth
        item.style.left = `calc(50% + ${x}px - ${sz / 2}px)`
        item.style.top = `calc(50% + ${y}px - ${sz / 2}px)`
        const img = item.querySelector('img') as HTMLElement
        if (img) img.style.transform = `rotate(${-rotDeg}deg)`
      })
    }

    positionItems(0)

    const rotate = () => {
      angleRef.current += 0.25
      positionItems(angleRef.current)
      rafRef.current = requestAnimationFrame(rotate)
    }
    rafRef.current = requestAnimationFrame(rotate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  return (
    <section id="signal" style={{ background: 'var(--bg-1)', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
      <div ref={wrapperRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {CIRCLE_IMAGES.map((src, i) => (
          <div key={i} className="circle-img-item" style={{ position: 'absolute', borderRadius: '0.625rem', overflow: 'hidden', boxShadow: '0 0.25rem 1.25rem rgba(42,33,25,0.18)' }}>
            <img src={src} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transformOrigin: 'center center' }} />
          </div>
        ))}
      </div>
      <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', maxWidth: '30rem', padding: '0 1.5rem' }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(42,33,25,0.55)', marginBottom: '1.25rem' }}>
          Step inside early
        </p>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(2.25rem, 5.5vw, 4.25rem)', fontWeight: 400, letterSpacing: '-0.125rem', lineHeight: 1.05, color: 'var(--color-dark)', marginBottom: '2.5rem' }}>
          We&apos;ll invite you when it&apos;s ready
        </h2>
        <a href="https://form.typeform.com/to/xo1Bskym" target="_blank" rel="noopener noreferrer"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem', padding: '0.875rem 2rem', background: 'var(--color-dark)', color: '#ebe8db', textDecoration: 'none', borderRadius: '0.25rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          Be Included
          <svg width="18" height="18" viewBox="0 0 26 26" fill="none">
            <path d="M1.33594 12.9987H23.0026M13.0026 1.33203L24.6693 12.9987L13.0026 24.6654" stroke="#ebe8db" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </a>
      </div>
    </section>
  )
}
