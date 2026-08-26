'use client'
// Ticket QR scanner (door check-in). Reads the guest's reservation QR with
// the phone camera, finds the booking in the partner's live list, and offers
// one tap: check in → status 'completed' (the delivery event that makes the
// money payable). Native BarcodeDetector where available; jsQR fallback
// (Safari). Accepts a raw booking id (bk-XXXXXXXX) or any URL containing one.
import { useEffect, useRef, useState } from 'react'
import type { Booking } from '@/lib/schema'
import { formatAmount, formatDate, toDate } from '@/lib/money'
import { Chip, PrimaryButton, GhostButton, eyebrow } from './ui'
import { t, type Locale } from '@/app/partner/i18n'
import { X, ScanLine, CheckCheck } from 'lucide-react'

/** The app's ticket payload: palmera://checkin?booking=bk-…&exp=…&guest=…
 *  (per-guest tickets). Bare booking ids are accepted as a fallback. */
const parseTicket = (raw: string): { bookingId: string | null; guestId: string | null } => {
  try {
    if (raw.includes('checkin')) {
      const u = new URL(raw)
      return { bookingId: u.searchParams.get('booking'), guestId: u.searchParams.get('guest') }
    }
  } catch { /* not a URL */ }
  return { bookingId: raw.match(/bk-[A-Za-z0-9]{6,12}/i)?.[0] ?? null, guestId: null }
}

export default function TicketScanner({ bookings, locale, onCheckIn, onClose }: {
  bookings: Booking[]
  locale: Locale
  onCheckIn: (b: Booking, guestId: string | null) => Promise<void>
  onClose: () => void
}) {
  const L = (k: string) => t(locale, k)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState('')
  const [manual, setManual] = useState('')
  const [hit, setHit] = useState<{ raw: string; booking: Booking | null; guestId: string | null } | null>(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  // Camera + decode loop. Stops while a result card is showing.
  useEffect(() => {
    if (hit) return
    let stream: MediaStream | null = null
    let raf = 0
    let stopped = false
    const canvas = document.createElement('canvas')
    ;(async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        if (stopped) { stream.getTracks().forEach(t => t.stop()); return }
        const video = videoRef.current!
        video.srcObject = stream
        await video.play()
        type BD = { detect: (v: HTMLVideoElement) => Promise<{ rawValue: string }[]> }
        const Detector = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => BD }).BarcodeDetector
        const detector = Detector ? new Detector({ formats: ['qr_code'] }) : null
        const jsQR = detector ? null : (await import('jsqr')).default
        const tick = async () => {
          if (stopped || !videoRef.current) return
          try {
            if (detector) {
              const codes = await detector.detect(videoRef.current)
              if (codes[0]?.rawValue) return found(codes[0].rawValue)
            } else if (jsQR && videoRef.current.videoWidth) {
              canvas.width = videoRef.current.videoWidth; canvas.height = videoRef.current.videoHeight
              const ctx = canvas.getContext('2d', { willReadFrequently: true })!
              ctx.drawImage(videoRef.current, 0, 0)
              const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
              const code = jsQR(img.data, img.width, img.height)
              if (code?.data) return found(code.data)
            }
          } catch { /* keep scanning */ }
          raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)
      } catch {
        setError(L('scan_no_camera'))
      }
    })()
    const found = (raw: string) => {
      const { bookingId, guestId } = parseTicket(raw)
      const booking = bookingId ? bookings.find(b => b.id?.toLowerCase() === bookingId.toLowerCase()) ?? null : null
      setHit({ raw, booking, guestId })
      if (navigator.vibrate) navigator.vibrate(80)
    }
    return () => { stopped = true; cancelAnimationFrame(raf); stream?.getTracks().forEach(t => t.stop()) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hit, bookings])

  const submitManual = () => {
    const { bookingId, guestId } = parseTicket(manual.trim())
    const id = bookingId || manual.trim()
    if (!id) return
    setHit({ raw: manual.trim(), booking: bookings.find(b => b.id?.toLowerCase() === id.toLowerCase()) ?? null, guestId })
  }

  const checkIn = async (b: Booking) => {
    setBusy(true)
    try { await onCheckIn(b, hit?.guestId ?? null); setDone(true) } catch { setError(L('scan_checkin_err')) }
    setBusy(false)
  }

  const b = hit?.booking
  const when = b ? toDate(b.scheduledFor) : null
  const guestSeen = !!(b && hit?.guestId && (b.checkedInGuests || []).includes(hit.guestId))
  // Per-guest tickets: a completed booking is only "used" for a guest whose
  // ticket was already scanned (or for a no-guest code scanned twice).
  const verdict: 'ok' | 'used' | 'bad' | 'unknown' | null = !hit ? null
    : !b ? 'unknown'
    : b.status === 'confirmed' ? 'ok'
    : b.status === 'completed' ? (hit.guestId && !guestSeen ? 'ok' : 'used')
    : 'bad'

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'var(--pf-scrim)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div role="dialog" aria-modal="true" aria-label={L('scan_title')} onClick={e => e.stopPropagation()} className="pf-glass" style={{ width: 'min(26rem, 100%)', borderRadius: '18px', padding: '18px', maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span style={{ ...eyebrow, display: 'inline-flex', alignItems: 'center', gap: '8px' }}><ScanLine size={13} strokeWidth={1.75} /> {L('scan_title')}</span>
          <button onClick={onClose} aria-label="Close" style={{ background: 'transparent', border: 'none', color: 'var(--pf-faint)', cursor: 'pointer', width: '40px', height: '40px', display: 'grid', placeItems: 'center' }}><X size={16} strokeWidth={1.75} /></button>
        </div>

        {!hit && (
          <>
            <div style={{ borderRadius: '14px', overflow: 'hidden', background: '#000', aspectRatio: '4 / 3', display: 'grid', placeItems: 'center' }}>
              {error
                ? <p style={{ color: 'var(--pf-faint)', fontFamily: 'var(--font-sans)', fontSize: '12.5px', padding: '0 18px', textAlign: 'center' }}>{error}</p>
                : <video ref={videoRef} muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
            </div>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '11.5px', color: 'var(--pf-faint)', margin: '10px 0' }}>{L('scan_hint')}</p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input value={manual} onChange={e => setManual(e.target.value)} onKeyDown={e => e.key === 'Enter' && submitManual()} placeholder="bk-XXXXXXXX"
                style={{ flex: 1, padding: '10px 12px', minHeight: '40px', borderRadius: '10px', border: '1px solid var(--pf-border)', background: 'var(--pf-bg)', color: 'var(--pf-text)', fontFamily: 'var(--font-sans)', fontSize: '13px' }} />
              <GhostButton onClick={submitManual}>{L('scan_lookup')}</GhostButton>
            </div>
          </>
        )}

        {hit && (
          <div>
            {verdict === 'ok' && b && (
              <div style={{ border: '1px solid rgba(122,158,107,0.5)', background: 'rgba(122,158,107,0.08)', borderRadius: '14px', padding: '16px' }}>
                {done ? (
                  <div style={{ textAlign: 'center', padding: '8px 0' }}>
                    <CheckCheck size={34} strokeWidth={1.75} style={{ color: 'var(--pf-success)' }} />
                    <p style={{ fontFamily: 'var(--font-serif)', color: 'var(--pf-head)', fontSize: '17px', margin: '8px 0 2px' }}>{L('scan_done')}</p>
                    <p style={{ fontFamily: 'var(--font-sans)', color: 'var(--pf-muted)', fontSize: '12px', margin: 0 }}>{b.customerName} · {b.guestCount} {locale === 'fr' ? 'pers.' : 'guests'}</p>
                  </div>
                ) : (<>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontFamily: 'var(--font-serif)', color: 'var(--pf-head)', fontSize: '16px' }}>{b.customerName || '—'}</span>
                    <Chip tone="green">{b.status === 'completed' ? `${(b.checkedInGuests || []).length + 1}/${b.guestCount}` : L('f_confirmed')}</Chip>
                  </div>
                  <p style={{ fontFamily: 'var(--font-sans)', color: 'var(--pf-muted)', fontSize: '12.5px', margin: '0 0 4px' }}>{b.title}</p>
                  <p style={{ fontFamily: 'var(--font-sans)', color: 'var(--pf-faint)', fontSize: '11.5px', margin: 0 }}>
                    {when ? `${formatDate(when)} · ${when.toLocaleTimeString(locale === 'fr' ? 'fr-FR' : 'en-GB', { hour: '2-digit', minute: '2-digit' })}` : '—'} · {b.guestCount} {locale === 'fr' ? 'pers.' : 'guests'}{b.bookingTotal > 0 ? ` · ${formatAmount(b.bookingTotal)} XOF` : ''}
                  </p>
                  <div style={{ marginTop: '14px' }}>
                    <PrimaryButton fullWidth disabled={busy} onClick={() => checkIn(b)}>{busy ? '…' : L('scan_checkin')}</PrimaryButton>
                  </div>
                </>)}
              </div>
            )}
            {verdict === 'used' && b && (
              <div style={{ border: '1px solid rgba(190,154,86,0.5)', background: 'var(--pf-gold-soft)', borderRadius: '14px', padding: '16px' }}>
                <Chip tone="gold">{L('scan_used')}</Chip>
                <p style={{ fontFamily: 'var(--font-sans)', color: 'var(--pf-muted)', fontSize: '12.5px', margin: '10px 0 0' }}>{b.customerName} · {b.title}{b.checkedInAt ? ` · ${formatDate(b.checkedInAt, true)}` : ''}</p>
              </div>
            )}
            {verdict === 'bad' && b && (
              <div style={{ border: '1px solid rgba(196,124,124,0.5)', background: 'var(--pf-alert-soft)', borderRadius: '14px', padding: '16px' }}>
                <Chip tone="alert">{L(`st_${b.status}` as string) || b.status}</Chip>
                <p style={{ fontFamily: 'var(--font-sans)', color: 'var(--pf-muted)', fontSize: '12.5px', margin: '10px 0 0' }}>{b.customerName} · {b.title} — {L('scan_not_valid')}</p>
              </div>
            )}
            {verdict === 'unknown' && (
              <div style={{ border: '1px solid var(--pf-border-strong)', borderRadius: '14px', padding: '16px' }}>
                <Chip tone="neutral">{L('scan_unknown')}</Chip>
                <p style={{ fontFamily: 'var(--font-sans)', color: 'var(--pf-faint)', fontSize: '11.5px', margin: '10px 0 0', wordBreak: 'break-all' }}>{hit.raw.slice(0, 120)}</p>
              </div>
            )}
            {error && <p style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: 'var(--pf-alert)', margin: '10px 0 0' }}>{error}</p>}
            <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
              <GhostButton onClick={() => { setHit(null); setDone(false); setError('') }}>{L('scan_again')}</GhostButton>
              <GhostButton onClick={onClose}>{L('help_cancel')}</GhostButton>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
