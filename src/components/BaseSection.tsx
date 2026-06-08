'use client'
import { useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'

const PHOTOS = [
  { src: '/images/bas-van-den-eijkhof-w_O7qjB9ZVY-unsplash.jpg',   top: '12vh', left: '3vw',  w: '18vw', h: '18vw', speed: 0.35 },
  { src: '/images/priscilla-du-preez-W3SEyZODn8U-unsplash-min.jpg', top: '14vh', right: '4vw', w: '15vw', h: '18vw', speed: 0.5  },
  { src: '/images/upgraded-points-uu5Z7cx2PdA-unsplash.jpg',        top: '42vh', left: '22vw', w: '12vw', h: '12vw', speed: 0.25 },
  { src: '/images/aliunix-NI265AcvQZs-unsplash-1.jpg',              top: '46vh', right: '3vw', w: '17vw', h: '17vw', speed: 0.55 },
  { src: '/images/konrad-bachusz--tpKv0goE94-unsplash.jpg',         top: '68vh', left: '4vw',  w: '16vw', h: '16vw', speed: 0.3  },
  { src: '/images/chaz-mcgregor-THXYw7ysYus-unsplash.jpg',          top: '72vh', right: '12vw',w: '13vw', h: '13vw', speed: 0.45 },
  { src: '/images/ron-mcclenny-iqUSpwmvnw8-unsplash.jpg',           top: '94vh', left: '10vw', w: '22vw', h: '14vw', speed: 0.4  },
  { src: '/images/gilles-de-muynck-PtJDCD4fTI4-unsplash.jpg',       top: '98vh', right: '5vw', w: '15vw', h: '15vw', speed: 0.5  },
  { src: '/images/redcharlie-nf7W_hn6DKQ-unsplash-min.jpg',         top: '122vh',left: '3vw',  w: '17vw', h: '17vw', speed: 0.3  },
  { src: '/images/haven-xie-IoTTc6Z5lTM-unsplash.jpg',              top: '126vh',right: '17vw',w: '13vw', h: '17vw', speed: 0.45 },
  { src: '/images/ed-wingate-ZMIdqdsbP2U-unsplash-min.jpg',         top: '148vh',left: '25vw', w: '13vw', h: '13vw', speed: 0.55 },
  { src: '/images/bruno-ngarukiye-2qCs8eel2qI-unsplash.jpg',        top: '36vh', left: '5vw',  w: '16vw', h: '16vw', speed: 0.2  },
]

export default function BaseSection() {
  const t = useTranslations('base')
  const outerRef = useRef<HTMLDivElement>(null)
  const photoRefs = useRef<(HTMLDivElement | null)[]>([])
  const headingRefs = useRef<(HTMLDivElement | null)[]>([])
  const labelRefs = useRef<(HTMLDivElement | null)[]>([])
  const introRef = useRef<HTMLDivElement>(null)

  const PILLARS = [
    { label: t('discover'), text: t('discoverText') },
    { label: t('gather'), text: t('gatherText') },
    { label: t('reserve'), text: t('reserveText') },
    { label: t('commit'), text: t('commitText') },
  ]

  useEffect(() => {
    let rafId: number
    let lastScrollY = -1
    if (headingRefs.current[0]) { headingRefs.current[0].style.opacity = '1'; headingRefs.current[0].style.transform = 'translateY(0)' }
    if (labelRefs.current[0]) labelRefs.current[0].style.opacity = '1'

    const update = () => {
      if (!outerRef.current) return
      const scrollY = window.scrollY
      if (Math.abs(scrollY - lastScrollY) < 0.5) return
      lastScrollY = scrollY
      const rect = outerRef.current.getBoundingClientRect()
      const totalScroll = outerRef.current.offsetHeight - window.innerHeight
      const scrolled = Math.max(0, -rect.top)
      const progress = Math.min(1, scrolled / totalScroll)

      photoRefs.current.forEach((el, i) => { if (!el) return; el.style.transform = `translateY(${scrolled * PHOTOS[i].speed * -1}px)` })
      if (introRef.current) introRef.current.style.opacity = String(Math.max(0, 1 - progress * 18))

      const pillarProgress = Math.max(0, Math.min(1, (progress - 0.05) / 0.9))
      const rawIndex = pillarProgress * 4
      const activeIndex = Math.min(3, Math.floor(rawIndex))
      const withinPillar = rawIndex - Math.floor(rawIndex)

      headingRefs.current.forEach((el, i) => {
        if (!el) return
        let opacity = 0
        if (i === activeIndex) {
          if (i < 3) { if (withinPillar < 0.25) opacity = withinPillar / 0.25; else if (withinPillar < 0.8) opacity = 1; else opacity = Math.max(0, 1 - (withinPillar - 0.8) / 0.2) }
          else { opacity = progress >= 0.9 ? 1 : Math.min(1, withinPillar / 0.25) }
        }
        el.style.opacity = String(opacity)
        el.style.transform = `translateY(${(1 - opacity) * 0.75}rem)`
      })
      labelRefs.current.forEach((el, i) => { if (!el) return; el.style.opacity = i === activeIndex ? '1' : '0' })
    }

    const onScroll = () => { cancelAnimationFrame(rafId); rafId = requestAnimationFrame(update) }
    window.addEventListener('scroll', onScroll, { passive: true })
    update()
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(rafId) }
  }, [])

  return (
    <section id="base" ref={outerRef} style={{ position: 'relative', height: '400vh', background: 'var(--bg-1)', borderTopLeftRadius: '1.5rem', borderTopRightRadius: '1.5rem', zIndex: 1 }}>
      <div style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'hidden', width: '100%' }}>
        {PHOTOS.map((photo, i) => (
          <div key={i} ref={el => { photoRefs.current[i] = el }}
            style={{ position: 'absolute', top: photo.top, ...((photo as any).left !== undefined ? { left: (photo as any).left } : {}), ...((photo as any).right !== undefined ? { right: (photo as any).right } : {}), width: photo.w, height: photo.h, borderRadius: '0.625rem', overflow: 'hidden', willChange: 'transform', zIndex: 1 }}>
            <img src={photo.src} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </div>
        ))}
        <div ref={introRef} style={{ position: 'absolute', top: '6rem', left: '2.5rem', right: '2.5rem', zIndex: 3, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(42,33,25,0.65)', lineHeight: 1.7, margin: 0 }}>{t('intro1')}</p>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(1rem, 1.8vw, 1.375rem)', lineHeight: 1.55, color: 'rgba(42,33,25,0.75)', margin: 0 }}>{t('intro2')}</p>
        </div>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 4, pointerEvents: 'none' }}>
          <div style={{ position: 'relative', height: '1.5rem', width: '100%', textAlign: 'center', marginBottom: '1rem' }}>
            {PILLARS.map((p, i) => (
              <div key={p.label} ref={el => { labelRefs.current[i] = el }}
                style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: i === 0 ? 1 : 0, transition: 'opacity 0.5s ease' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#9e763b' }}>{p.label}</span>
              </div>
            ))}
          </div>
          <div style={{ position: 'relative', width: '100%', textAlign: 'center', minHeight: '7.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {PILLARS.map((p, i) => (
              <div key={p.text} ref={el => { headingRefs.current[i] = el }}
                style={{ position: i === 0 ? 'relative' : 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: i === 0 ? 1 : 0, transform: 'translateY(0)', transition: 'opacity 0.5s ease, transform 0.5s ease', willChange: 'opacity, transform' }}>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(2.25rem, 5vw, 4rem)', fontWeight: 400, letterSpacing: '-0.09375rem', lineHeight: 1.1, color: 'var(--color-dark)', margin: 0, padding: '0 2.5rem', textAlign: 'center' }}>
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
