'use client'
import { useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { onScrollFrame } from '@/lib/scroll-bus'
import { useViewport } from '@/lib/use-viewport'

// Photo config — 3 size tiers: L ≈24vw, M ≈15vw, S ≈9vw
// Horizontal zones: far-edge (1-3vw), mid (8-14vw), inner (17-22vw)
const PHOTOS = [
  // Group 0: entry — L left, L right (top), S inner-left, S inner-right (bottom)
  { src: '/images/bas-van-den-eijkhof-w_O7qjB9ZVY-unsplash.jpg',    top: '32vh', left: '2vw',   w: 'clamp(120px,23vw,360px)', h: 'clamp(140px,27vw,420px)', speed: 0.1,  group: 0 },
  { src: '/images/priscilla-du-preez-W3SEyZODn8U-unsplash-min.jpg', top: '28vh', right: '2vw',  w: 'clamp(100px,19vw,295px)', h: 'clamp(120px,23vw,360px)', speed: 0.1,  group: 0 },
  { src: '/images/upgraded-points-uu5Z7cx2PdA-unsplash.jpg',        top: '66vh', left: '14vw',  w: 'clamp(60px,9vw,140px)',   h: 'clamp(60px,9vw,140px)',   speed: 0.08, group: 0 },
  { src: '/images/aliunix-NI265AcvQZs-unsplash-1.jpg',              top: '68vh', right: '12vw', w: 'clamp(65px,10vw,155px)',  h: 'clamp(65px,10vw,155px)',  speed: 0.08, group: 0 },
  // Group 1 (Gather) — L far-left, M far-right, M inner-right (lower), S inner-left (lower)
  { src: '/images/ron-mcclenny-iqUSpwmvnw8-unsplash.jpg',           top: '28vh', left: '1vw',   w: 'clamp(110px,21vw,320px)', h: 'clamp(90px,17vw,260px)',  speed: 0.12, group: 1 },
  { src: '/images/chaz-mcgregor-THXYw7ysYus-unsplash.jpg',          top: '24vh', right: '2vw',  w: 'clamp(85px,14vw,215px)',  h: 'clamp(95px,16vw,250px)',  speed: 0.09, group: 1 },
  { src: '/images/gilles-de-muynck-PtJDCD4fTI4-unsplash.jpg',       top: '58vh', right: '13vw', w: 'clamp(80px,13vw,200px)',  h: 'clamp(80px,13vw,200px)',  speed: 0.1,  group: 1 },
  { src: '/images/konrad-bachusz--tpKv0goE94-unsplash.jpg',         top: '64vh', left: '17vw',  w: 'clamp(58px,8vw,125px)',   h: 'clamp(58px,8vw,125px)',   speed: 0.1,  group: 1 },
  // Group 2 (Reserve) — L far-left, M far-right
  { src: '/images/redcharlie-nf7W_hn6DKQ-unsplash-min.jpg',         top: '30vh', left: '2vw',   w: 'clamp(150px,26vw,395px)', h: 'clamp(150px,26vw,395px)', speed: 0.1,  group: 2 },
  { src: '/images/haven-xie-IoTTc6Z5lTM-unsplash.jpg',              top: '32vh', right: '3vw',  w: 'clamp(100px,17vw,260px)', h: 'clamp(90px,15vw,230px)',  speed: 0.1,  group: 2 },
  // Group 3 (Commit) — M inner-left, S inner-right
  { src: '/images/ed-wingate-ZMIdqdsbP2U-unsplash-min.jpg',         top: '53vh', left: '13vw',  w: 'clamp(90px,15vw,230px)',  h: 'clamp(95px,16vw,245px)',  speed: 0.025, group: 3 },
  { src: '/images/bruno-ngarukiye-2qCs8eel2qI-unsplash.jpg',        top: '58vh', right: '14vw', w: 'clamp(60px,9vw,140px)',   h: 'clamp(58px,9vw,138px)',   speed: 0.025, group: 3 },
]

// Mobile overrides — push all photos to far edges and lower tops to avoid covering center phrases
const MOBILE_OVERRIDES: ({ top?: string; left?: string; right?: string; w?: string; h?: string } | null)[] = [
  { top: '55vh', left: '1vw',  w: 'clamp(70px,16vw,120px)', h: 'clamp(80px,19vw,140px)' },  // group 0 left
  { top: '52vh', right: '1vw', w: 'clamp(60px,13vw,100px)', h: 'clamp(70px,16vw,120px)' },  // group 0 right
  { top: '72vh', left: '2vw',  w: 'clamp(44px,8vw,70px)',   h: 'clamp(44px,8vw,70px)'   },  // group 0 small left
  { top: '74vh', right: '2vw', w: 'clamp(46px,9vw,75px)',   h: 'clamp(46px,9vw,75px)'   },  // group 0 small right
  { top: '30vh', left: '1vw',  w: 'clamp(70px,15vw,115px)', h: 'clamp(56px,12vw,90px)'  },  // group 1 left
  { top: '26vh', right: '1vw', w: 'clamp(55px,11vw,85px)',  h: 'clamp(62px,13vw,95px)'  },  // group 1 right
  { top: '65vh', right: '2vw', w: 'clamp(52px,10vw,80px)',  h: 'clamp(52px,10vw,80px)'  },  // group 1 lower right
  { top: '70vh', left: '2vw',  w: 'clamp(40px,7vw,60px)',   h: 'clamp(40px,7vw,60px)'   },  // group 1 lower left
  { top: '32vh', left: '1vw',  w: 'clamp(80px,18vw,135px)', h: 'clamp(80px,18vw,135px)' },  // group 2 left
  { top: '34vh', right: '1vw', w: 'clamp(60px,13vw,100px)', h: 'clamp(54px,12vw,90px)'  },  // group 2 right
  { top: '60vh', left: '2vw',  w: 'clamp(58px,11vw,88px)',  h: 'clamp(62px,12vw,94px)'  },  // group 3 left
  { top: '62vh', right: '2vw', w: 'clamp(40px,8vw,64px)',   h: 'clamp(40px,8vw,64px)'   },  // group 3 right
]

export default function BaseSection() {
  const t = useTranslations('base')
  const { isMobile, isTablet } = useViewport()
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
    headingRefs.current.forEach(el => { if (el) { el.style.opacity = '0'; el.style.transform = 'translateY(0.75rem)'; el.style.transition = 'none' } })
    labelRefs.current.forEach(el => { if (el) { el.style.opacity = '0'; el.style.transition = 'none' } })
    photoRefs.current.forEach((el, i) => { if (el) { el.style.opacity = PHOTOS[i].group === 0 ? '1' : '0'; el.style.transition = 'none' } })

    requestAnimationFrame(() => requestAnimationFrame(() => {
      labelRefs.current.forEach(el => { if (el) el.style.transition = 'opacity 0.35s ease' })
      photoRefs.current.forEach(el => { if (el) el.style.transition = 'opacity 0.5s ease' })
      ready.current = true
    }))

    const update = () => {
      if (!outerRef.current || !ready.current) return

      const rect = outerRef.current.getBoundingClientRect()
      const total = outerRef.current.offsetHeight - window.innerHeight
      const scrolled = Math.max(0, -rect.top)
      const prog = Math.min(1, scrolled / total)

      if (introRef.current) introRef.current.style.opacity = String(Math.max(0, 1 - prog / 0.06))

      const pp = Math.max(0, Math.min(1, (prog - 0.04) / 0.92))
      const ri = pp * 4
      const ai = Math.min(3, Math.floor(ri))
      const wp = ri - Math.floor(ri)

      photoRefs.current.forEach((el, i) => {
        if (!el) return
        el.style.transform = `translateY(${scrolled * PHOTOS[i].speed * -1}px)`
        const g = PHOTOS[i].group
        const isVisible = g === 0 ? prog < 0.18 : g === ai
        el.style.opacity = isVisible ? '1' : '0'
      })

      headingRefs.current.forEach((el, i) => {
        if (!el) return
        let op = 0
        if (i === ai) {
          if (i < 3) {
            if (wp < 0.08) op = wp / 0.08
            else if (wp < 0.85) op = 1
            else op = Math.max(0, 1 - (wp - 0.85) / 0.15)
          } else {
            op = prog >= 0.95 ? 1 : Math.min(1, wp / 0.08)
          }
        }
        el.style.opacity = String(op)
        el.style.transform = `translateY(${(1 - op) * 0.75}rem)`
      })
      labelRefs.current.forEach((el, i) => { if (!el) return; el.style.opacity = i === ai ? '1' : '0' })
    }

    const unsub = onScrollFrame(update)
    update()
    return () => { unsub() }
  }, [])

  const sectionH = isMobile ? '520vh' : isTablet ? '620vh' : '700vh'

  return (
    <section id="base" ref={outerRef} style={{ position: 'relative', height: sectionH, background: 'transparent', zIndex: 1 }}>
      <div style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'hidden', width: '100%' }}>

        {PHOTOS.map((p, i) => {
          const ov = isMobile ? MOBILE_OVERRIDES[i] : null
          const top   = ov?.top   ?? p.top
          const w     = ov?.w     ?? p.w
          const h     = ov?.h     ?? p.h
          const left  = ov?.left  ?? (p as any).left  ?? undefined
          const right = ov?.right ?? (p as any).right ?? undefined
          return (
            <div key={i} ref={el => { photoRefs.current[i] = el }}
              style={{
                position: 'absolute', top,
                ...(left  ? { left  } : {}),
                ...(right ? { right } : {}),
                width: w, height: h,
                borderRadius: '8px',
                overflow: 'hidden', willChange: 'transform, opacity', zIndex: 1,
              }}>
              <img src={p.src} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </div>
          )
        })}

        <div ref={introRef} style={{
          position: 'absolute',
          top: 'clamp(4rem,5.5vw,5.5rem)',
          left: 'clamp(1.5rem,4.5vw,2.5rem)',
          right: 'clamp(1.5rem,4.5vw,2.5rem)',
          zIndex: 5,
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
          gap: 'clamp(0.75rem,3.8vw,3rem)',
        }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(42,33,25,0.72)', lineHeight: 1.7, margin: 0, maxWidth: '24rem' }}>
            {t('intro1')}
          </p>
          {!isMobile && (
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(1rem,1.6vw,1.25rem)', lineHeight: 1.6, color: 'rgba(42,33,25,0.82)', margin: 0, maxWidth: '32rem', justifySelf: 'end' }}>
              {t('intro2')}
            </p>
          )}
        </div>

        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 4, pointerEvents: 'none', gap: '16px',
          ...(isMobile ? { background: 'radial-gradient(ellipse 90% 28% at 50% 50%, rgba(240,236,226,0.72) 0%, transparent 100%)' } : {}),
        }}>
          <div style={{ position: 'relative', height: '1.5rem', width: '100%', textAlign: 'center' }}>
            {PILLARS.map((p, i) => (
              <div key={p.label} ref={el => { labelRefs.current[i] = el }}
                style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#9e763b' }}>{p.label}</span>
              </div>
            ))}
          </div>
          <div style={{ position: 'relative', width: '100%', textAlign: 'center', minHeight: 'clamp(5.5rem,9vw,7.5rem)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {PILLARS.map((p, i) => (
              <div key={p.text} ref={el => { headingRefs.current[i] = el }}
                style={{ position: i === 0 ? 'relative' : 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transform: 'translateY(0.75rem)', willChange: 'opacity, transform' }}>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(1.75rem,5vw,4rem)', fontWeight: 400, letterSpacing: '-0.09375rem', lineHeight: 1.15, color: 'var(--color-dark)', margin: 0, padding: '0 clamp(1.5rem,4.5vw,2.5rem)', textAlign: 'center', ...(isMobile ? { textShadow: '0 0 20px rgba(240,236,226,0.9), 0 0 40px rgba(240,236,226,0.6)' } : {}) }}>
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
