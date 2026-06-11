'use client'
import { useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'

// Photos in 4 groups tied to pillars. Sizes match Webflow Scroll Image / Large (356px max, 8px radius).
// Group 0 photos pushed below the intro text zone (intro sits at top ~5.5rem).
const PHOTOS = [
  { src: '/images/bas-van-den-eijkhof-w_O7qjB9ZVY-unsplash.jpg',    top: '26vh', left: '1vw',   w: 'clamp(180px,22vw,356px)', h: 'clamp(180px,22vw,356px)', speed: 0.1,  group: 0 },
  { src: '/images/priscilla-du-preez-W3SEyZODn8U-unsplash-min.jpg', top: '24vh', right: '1vw',  w: 'clamp(160px,20vw,320px)', h: 'clamp(180px,22vw,356px)', speed: 0.1,  group: 0 },
  { src: '/images/upgraded-points-uu5Z7cx2PdA-unsplash.jpg',        top: '64vh', left: '3vw',   w: 'clamp(140px,18vw,280px)', h: 'clamp(140px,18vw,280px)', speed: 0.08, group: 0 },
  { src: '/images/aliunix-NI265AcvQZs-unsplash-1.jpg',              top: '64vh', right: '3vw',  w: 'clamp(140px,18vw,280px)', h: 'clamp(140px,18vw,280px)', speed: 0.08, group: 0 },
  { src: '/images/ron-mcclenny-iqUSpwmvnw8-unsplash.jpg',           top: '20vh', left: '16vw',  w: 'clamp(120px,14vw,220px)', h: 'clamp(100px,11vw,180px)', speed: 0.12, group: 1 },
  { src: '/images/gilles-de-muynck-PtJDCD4fTI4-unsplash.jpg',       top: '22vh', right: '16vw', w: 'clamp(120px,14vw,220px)', h: 'clamp(120px,14vw,220px)', speed: 0.12, group: 1 },
  { src: '/images/konrad-bachusz--tpKv0goE94-unsplash.jpg',         top: '60vh', left: '16vw',  w: 'clamp(130px,15vw,240px)', h: 'clamp(130px,15vw,240px)', speed: 0.1,  group: 1 },
  { src: '/images/chaz-mcgregor-THXYw7ysYus-unsplash.jpg',          top: '62vh', right: '16vw', w: 'clamp(120px,14vw,220px)', h: 'clamp(130px,16vw,260px)', speed: 0.1,  group: 1 },
  { src: '/images/redcharlie-nf7W_hn6DKQ-unsplash-min.jpg',         top: '22vh', left: '1vw',   w: 'clamp(160px,20vw,320px)', h: 'clamp(160px,20vw,320px)', speed: 0.1,  group: 2 },
  { src: '/images/haven-xie-IoTTc6Z5lTM-unsplash.jpg',              top: '22vh', right: '1vw',  w: 'clamp(150px,18vw,290px)', h: 'clamp(130px,15vw,240px)', speed: 0.1,  group: 2 },
  { src: '/images/ed-wingate-ZMIdqdsbP2U-unsplash-min.jpg',         top: '60vh', left: '16vw',  w: 'clamp(120px,14vw,220px)', h: 'clamp(130px,16vw,260px)', speed: 0.12, group: 3 },
  { src: '/images/bruno-ngarukiye-2qCs8eel2qI-unsplash.jpg',        top: '60vh', right: '16vw', w: 'clamp(110px,13vw,200px)', h: 'clamp(110px,13vw,200px)', speed: 0.12, group: 3 },
]

export default function BaseSection() {
  const t = useTranslations('base')
  const outerRef = useRef<HTMLDivElement>(null)
  const photoRefs = useRef<(HTMLDivElement | null)[]>([])
  const headingRefs = useRef<(HTMLDivElement | null)[]>([])
  const labelRefs = useRef<(HTMLDivElement | null)[]>([])
  const introRef = useRef<HTMLDivElement>(null)
  const ready = useRef(false)

  const PILLARS = [
    { label: t('discover'), text: t('discoverText') },
    { label: t('gather'),   text: t('gatherText') },
    { label: t('reserve'),  text: t('reserveText') },
    { label: t('commit'),   text: t('commitText') },
  ]

  useEffect(() => {
    let raf: number
    let lastY = -1

    // Initialise hidden without transitions to avoid entrance glitch
    headingRefs.current.forEach(el => { if (el) { el.style.opacity = '0'; el.style.transform = 'translateY(0.75rem)'; el.style.transition = 'none' } })
    labelRefs.current.forEach(el => { if (el) { el.style.opacity = '0'; el.style.transition = 'none' } })
    photoRefs.current.forEach((el, i) => { if (el) { el.style.opacity = PHOTOS[i].group === 0 ? '1' : '0'; el.style.transition = 'none' } })

    requestAnimationFrame(() => requestAnimationFrame(() => {
      headingRefs.current.forEach(el => { if (el) el.style.transition = 'opacity 0.6s ease, transform 0.6s ease' })
      labelRefs.current.forEach(el => { if (el) el.style.transition = 'opacity 0.5s ease' })
      photoRefs.current.forEach(el => { if (el) el.style.transition = 'opacity 0.6s ease' })
      ready.current = true
    }))

    const update = () => {
      if (!outerRef.current || !ready.current) return
      const sy = window.scrollY
      if (Math.abs(sy - lastY) < 0.5) return
      lastY = sy

      const rect = outerRef.current.getBoundingClientRect()
      const total = outerRef.current.offsetHeight - window.innerHeight
      const scrolled = Math.max(0, -rect.top)
      const prog = Math.min(1, scrolled / total)

      // Intro fades out over first 15%
      if (introRef.current) introRef.current.style.opacity = String(Math.max(0, 1 - prog / 0.15))

      // Pillars across 18% to 96%
      const pp = Math.max(0, Math.min(1, (prog - 0.18) / 0.78))
      const ri = pp * 4
      const ai = Math.min(3, Math.floor(ri))
      const wp = ri - Math.floor(ri)

      // Photos: parallax + group fade tied to active pillar
      photoRefs.current.forEach((el, i) => {
        if (!el) return
        el.style.transform = `translateY(${scrolled * PHOTOS[i].speed * -1}px)`
        const g = PHOTOS[i].group
        const isVisible = g === 0 ? prog < 0.3 : g === ai
        el.style.opacity = isVisible ? '1' : '0'
      })

      headingRefs.current.forEach((el, i) => {
        if (!el) return
        let op = 0
        if (i === ai) {
          if (i < 3) {
            if (wp < 0.15) op = wp / 0.15
            else if (wp < 0.85) op = 1
            else op = Math.max(0, 1 - (wp - 0.85) / 0.15)
          } else {
            op = prog >= 0.95 ? 1 : Math.min(1, wp / 0.15)
          }
        }
        el.style.opacity = String(op)
        el.style.transform = `translateY(${(1 - op) * 0.75}rem)`
      })
      labelRefs.current.forEach((el, i) => { if (!el) return; el.style.opacity = i === ai ? '1' : '0' })
    }

    const onScroll = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(update) }
    window.addEventListener('scroll', onScroll, { passive: true })
    update()
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf) }
  }, [])

  return (
    // Transparent background — the body color (controlled by BackgroundController) shows through
    <section id="base" ref={outerRef} style={{ position: 'relative', height: '700vh', background: 'transparent', zIndex: 1 }}>
      <div style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'hidden', width: '100%' }}>

        {PHOTOS.map((p, i) => (
          <div key={i} ref={el => { photoRefs.current[i] = el }}
            style={{
              position: 'absolute', top: p.top,
              ...((p as any).left ? { left: (p as any).left } : {}),
              ...((p as any).right ? { right: (p as any).right } : {}),
              width: p.w, height: p.h,
              borderRadius: '8px', // Radius/Radius 3 from Webflow
              overflow: 'hidden', willChange: 'transform, opacity', zIndex: 1,
            }}>
            <img src={p.src} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </div>
        ))}

        {/* Intro text — clear zone at top */}
        <div ref={introRef} style={{ position: 'absolute', top: '5.5rem', left: '2.5rem', right: '2.5rem', zIndex: 5, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(42,33,25,0.72)', lineHeight: 1.7, margin: 0, maxWidth: '24rem' }}>
            {t('intro1')}
          </p>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(1rem,1.6vw,1.25rem)', lineHeight: 1.6, color: 'rgba(42,33,25,0.82)', margin: 0, maxWidth: '32rem', justifySelf: 'end' }}>
            {t('intro2')}
          </p>
        </div>

        {/* Pillar text — sticky center, matches Webflow Text Master / Scroll Center (gap 16px) */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 4, pointerEvents: 'none', gap: '16px' }}>
          <div style={{ position: 'relative', height: '1.5rem', width: '100%', textAlign: 'center' }}>
            {PILLARS.map((p, i) => (
              <div key={p.label} ref={el => { labelRefs.current[i] = el }}
                style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#9e763b' }}>{p.label}</span>
              </div>
            ))}
          </div>
          <div style={{ position: 'relative', width: '100%', textAlign: 'center', minHeight: '7.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {PILLARS.map((p, i) => (
              <div key={p.text} ref={el => { headingRefs.current[i] = el }}
                style={{ position: i === 0 ? 'relative' : 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transform: 'translateY(0.75rem)', willChange: 'opacity, transform' }}>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(2.25rem,5vw,4rem)', fontWeight: 400, letterSpacing: '-0.09375rem', lineHeight: 1.1, color: 'var(--color-dark)', margin: 0, padding: '0 2.5rem', textAlign: 'center' }}>
                  {p.text}
                </h2>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
