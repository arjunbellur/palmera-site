'use client'
export const dynamic = 'force-dynamic'
// Overview ("Pulse") — the screen Arjun + Jordan open every morning: app
// growth (Samson's live data), the business numbers, what needs action, and
// a feed of what just happened. App + booking tiles are LIVE listeners;
// the activity feed is a one-shot merge with a refresh button.
import { useEffect, useState } from 'react'
import {
  subscribeAppProfiles, subscribeAllBookings, subscribeAllProviders, subscribeAllCompanies,
  getAppMoments, getAppReviews, getCountersignature,
} from '@/lib/firestore'
import { isAdminEmail } from '@/lib/admin'
import { docDate, countSince, startOfToday, startOfWeek, startOfMonth, isRealBooking, sumField, bucketByPeriod } from '@/lib/analytics'
import { ScreenHeader, Chip, Skeleton, Money, SectionTitle, eyebrow } from '@/components/partner/ui'
import { CountTile, SparkTile, timeAgo, glass } from './ui'
import type { AppProfile, AppDoc, Booking, Provider, Company } from '@/lib/schema'

const fmtXof = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(n))

interface Activity {
  icon: string
  title: string
  detail: string
  when: Date
  avatar?: string | null
  chip?: { label: string; tone: 'gold' | 'green' | 'alert' | 'neutral' }
  amount?: number
}

export default function AdminOverview() {
  const [profiles, setProfiles] = useState<AppProfile[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [providers, setProviders] = useState<Provider[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [profilesLoaded, setProfilesLoaded] = useState(false)
  const [bookingsLoaded, setBookingsLoaded] = useState(false)
  const [uncountersigned, setUncountersigned] = useState<number | null>(null)
  const [social, setSocial] = useState<{ moments: AppDoc[]; reviews: AppDoc[] } | null>(null)

  // ── Live tiles ──
  useEffect(() => {
    const u1 = subscribeAppProfiles((ps) => { setProfiles(ps); setProfilesLoaded(true) })
    const u2 = subscribeAllBookings((bs) => { setBookings(bs.filter(isRealBooking)); setBookingsLoaded(true) })
    const u3 = subscribeAllProviders((ps) => setProviders(ps.filter((p) => !isAdminEmail(p.email))))
    const u4 = subscribeAllCompanies(setCompanies)
    return () => { u1(); u2(); u3(); u4() }
  }, [])

  // Countersignature backlog (one read per signed provider, after first paint).
  useEffect(() => {
    const signed = providers.filter((p) => p.signoff)
    if (signed.length === 0) { setUncountersigned(providers.length ? 0 : null); return }
    let cancelled = false
    ;(async () => {
      const css = await Promise.all(signed.map((p) => getCountersignature(p.uid)))
      if (!cancelled) setUncountersigned(css.filter((c) => !c).length)
    })()
    return () => { cancelled = true }
  }, [providers])

  // ── Social payloads (one-shot; refresh button refetches). The feed itself
  // is DERIVED each render from live profiles/bookings + this cache, so a new
  // booking or signup pops into the feed the moment the listener fires. ──
  const loadSocial = async () => {
    setSocial(null)
    const [moments, reviews] = await Promise.all([getAppMoments(), getAppReviews()])
    setSocial({ moments, reviews })
  }
  useEffect(() => { loadSocial() }, [])

  const STATUS_TONE: Record<string, 'gold' | 'green' | 'alert' | 'neutral'> = {
    pending: 'gold', confirmed: 'green', completed: 'neutral', declined: 'alert', cancelled: 'alert', no_show: 'alert',
  }
  const activity: Activity[] | null = (() => {
    if (!social || !profilesLoaded || !bookingsLoaded) return null
    const byId = new Map(profiles.map((p) => [p.id, p]))
    // Some handles are stored WITH the @ already — normalize either way.
    const at = (h: string) => `@${h.replace(/^@+/, '')}`
    const who = (d: AppDoc) => { const p = byId.get(d.user_id as string); return p?.handle ? at(p.handle) : (p?.name || 'Someone') }
    const face = (d: AppDoc) => byId.get(d.user_id as string)?.avatar_url || null
    const items: Activity[] = []
    profiles.forEach((p) => {
      const d = docDate(p); if (!d) return
      items.push({ icon: '✦', title: p.handle ? at(p.handle) : (p.name || 'New user'), detail: 'joined Palmera', when: d, avatar: p.avatar_url || null, chip: { label: 'new user', tone: 'gold' } })
    })
    bookings.forEach((b) => {
      const d = docDate(b); if (!d) return
      items.push({
        icon: '▤', title: b.customerName || 'A guest', detail: `booked ${b.title}`, when: d,
        avatar: byId.get(b.customerId)?.avatar_url || null,
        chip: { label: b.status.replace('_', ' '), tone: STATUS_TONE[b.status] || 'neutral' },
        amount: b.bookingTotal > 0 ? b.bookingTotal : undefined,
      })
    })
    social.moments.forEach((m) => {
      const d = docDate(m); if (!d) return
      items.push({ icon: '◉', title: who(m), detail: m.caption ? `“${String(m.caption).slice(0, 70)}”` : 'posted a moment', when: d, avatar: face(m) })
    })
    social.reviews.forEach((r) => {
      const d = docDate(r); if (!d) return
      items.push({ icon: '★', title: who(r), detail: 'left a review', when: d, avatar: face(r), chip: { label: `★ ${r.rating}`, tone: 'gold' } })
    })
    items.sort((a, b) => b.when.getTime() - a.when.getTime())
    return items.slice(0, 15)
  })()

  const loading = !(profilesLoaded && bookingsLoaded)

  // ── Derivations ──
  const today = startOfToday(); const week = startOfWeek(); const month = startOfMonth()
  const signupsToday = countSince(profiles, today)
  const signupsWeek = countSince(profiles, week)
  const plusCount = profiles.filter((p) => p.is_plus).length

  const signupSpark = bucketByPeriod(profiles, { period: 'week', buckets: 8 }).map((b) => b.count)
  const bookingSpark = bucketByPeriod(bookings, { period: 'week', buckets: 8 }).map((b) => b.count)

  const weekBookings = bookings.filter((b) => { const d = docDate(b); return d !== null && d >= week })
  const byStatus = (st: string) => weekBookings.filter((b) => b.status === st).length
  const completedMonth = bookings.filter((b) => {
    if (b.status !== 'completed') return false
    const d = docDate(b, 'scheduledFor'); return d !== null && d >= month
  })
  const gmvMonth = sumField(completedMonth, 'bookingTotal')
  const commissionMonth = sumField(completedMonth, 'commissionAmount')

  // ── Pending actions ──
  const dayAgo = new Date(Date.now() - 24 * 3600 * 1000)
  const stalePending = bookings.filter((b) => { const d = docDate(b); return b.status === 'pending' && d !== null && d < dayAgo })
  const unsigned = providers.filter((p) => !p.signoff).length
  const incompleteCompanies = companies.filter((c) => !c.name || !c.heroPhoto || !c.logo)
  const actions = [
    ...(stalePending.length > 0 ? [{ text: `${stalePending.length} pending booking(s) waiting on a partner for over 24h`, href: '/admin/directory' }] : []),
    ...(unsigned > 0 ? [{ text: `${unsigned} partner(s) haven't signed the agreement`, href: '/admin/directory?agreement=unsigned' }] : []),
    ...((uncountersigned ?? 0) > 0 ? [{ text: `${uncountersigned} signed agreement(s) awaiting your countersignature`, href: '/admin/directory?agreement=signed' }] : []),
    ...(incompleteCompanies.length > 0 ? [{ text: `${incompleteCompanies.length} company profile(s) missing name or photos`, href: '/admin/directory' }] : []),
  ]

  if (loading) return (
    <div className="pf-in">
      <Skeleton height="74px" style={{ maxWidth: '30rem', marginBottom: '22px' }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '12px' }}>
        <Skeleton height="86px" /><Skeleton height="86px" /><Skeleton height="86px" /><Skeleton height="86px" />
      </div>
      <Skeleton height="220px" />
    </div>
  )

  return (
    <div className="pf-in">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap' }}>
        <ScreenHeader label="Palmera HQ" title="Overview" intro="The pulse of the app and the business — live." />
        <span style={{ marginTop: '4px' }}><Chip tone="green">● Live</Chip></span>
      </div>

      {/* Wide screens: numbers in the main column, the live feed + actions on
          a sticky right rail (pf-cols in globals.css). Single column <1200px. */}
      <div className="pf-cols">
      <div style={{ minWidth: 0 }}>
      {/* App growth */}
      <SectionTitle>App</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))', gap: '12px' }}>
        <SparkTile icon="✦" label="App users" value={profiles.length} spark={signupSpark} featured />
        <CountTile icon="↟" label="Signups today" value={signupsToday} tone={signupsToday > 0 ? 'gold' : undefined} />
        <CountTile icon="◔" label="This week" value={signupsWeek} />
        <CountTile icon="◆" label="Plus members" value={plusCount} />
      </div>

      {/* Business */}
      <SectionTitle>Business · this week</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))', gap: '12px' }}>
        <SparkTile icon="▤" label="New bookings" value={weekBookings.length} spark={bookingSpark} />
        <CountTile icon="◷" label="Pending" value={byStatus('pending')} tone={byStatus('pending') > 0 ? 'gold' : undefined} />
        <CountTile icon="✓" label="Confirmed" value={byStatus('confirmed')} />
        <CountTile icon="✦" label="Completed" value={byStatus('completed')} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 15rem), 1fr))', gap: '12px', marginTop: '12px' }}>
        <div className="pf-glass pf-glass-gold" style={glass}>
          <div style={eyebrow}>GMV this month · completed</div>
          <div style={{ marginTop: '8px' }}><Money amount={fmtXof(gmvMonth)} size={34} /></div>
        </div>
        <div className="pf-glass pf-glass-gold" style={glass}>
          <div style={eyebrow}>Palmera commission this month</div>
          <div style={{ marginTop: '8px' }}><Money amount={fmtXof(commissionMonth)} size={34} /></div>
        </div>
      </div>

      </div>

      <div className="pf-rail" style={{ minWidth: 0 }}>
      {/* Pending actions */}
      {actions.length > 0 && (
        <>
          <SectionTitle>Needs attention</SectionTitle>
          <div className="pf-glass" style={{ ...glass, padding: '14px 16px' }}>
            {actions.map((a, i) => (
              <a key={a.text} href={a.href} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '8px 0', textDecoration: 'none', borderTop: i > 0 ? '1px solid var(--pf-border)' : 'none' }}>
                <span style={{ fontFamily: 'var(--font-serif)', color: 'var(--pf-text)', fontSize: '13.5px' }}>{a.text}</span>
                <span style={{ color: 'var(--pf-gold)', fontSize: '13px', flexShrink: 0 }}>→</span>
              </a>
            ))}
          </div>
        </>
      )}

      {/* Activity feed */}
      <SectionTitle action={
        <button onClick={loadSocial} style={{ background: 'transparent', border: 'none', color: 'var(--pf-gold)', fontFamily: 'var(--font-sans)', fontSize: '11.5px', cursor: 'pointer', padding: 0 }}>↻ Refresh</button>
      }>
        Latest activity
      </SectionTitle>
      {activity === null ? (
        <Skeleton height="220px" />
      ) : activity.length === 0 ? (
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: 'var(--pf-faint)', fontStyle: 'italic' }}>Nothing yet.</p>
      ) : (
        <div className="pf-glass" style={{ ...glass, padding: '8px' }}>
          {/* Push-notification idiom: avatar chip with an event badge, bold
              sans title + muted meta line, status/amount on the right. Rows
              stagger in and lift on hover (.pf-note). */}
          {activity.map((a, i) => (
            <div key={`${a.title}_${a.when.getTime()}`} className="pf-note" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', animationDelay: `${Math.min(i * 45, 500)}ms` }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <span style={{ width: '36px', height: '36px', borderRadius: '12px', background: 'var(--pf-green-soft)', border: '1px solid var(--pf-border-strong)', color: 'var(--pf-gold)', display: 'grid', placeItems: 'center', fontSize: '14px', overflow: 'hidden' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {a.avatar ? <img loading="lazy" decoding="async" src={a.avatar} alt="" style={{ width: '36px', height: '36px', objectFit: 'cover', display: 'block' }} /> : a.icon}
                </span>
                {/* Event badge on the avatar corner — the notification tell. */}
                <span style={{ position: 'absolute', right: '-4px', bottom: '-4px', width: '16px', height: '16px', borderRadius: '6px', background: 'var(--pf-gold-deep)', color: '#0a0e18', display: 'grid', placeItems: 'center', fontSize: '8.5px', border: '2px solid var(--pf-card-solid)' }}>{a.icon}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-sans)', color: 'var(--pf-text)', fontSize: '12.5px', letterSpacing: '0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {a.title} <span style={{ color: 'var(--pf-muted)' }}>{a.detail}</span>
                </div>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: '10px', color: 'var(--pf-faint)', marginTop: '3px' }}>{timeAgo(a.when)}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                {a.amount != null && <span style={{ fontFamily: 'var(--font-sans)', fontSize: '11.5px', color: 'var(--pf-gold)' }}>+{fmtXof(a.amount)}</span>}
                {a.chip && <Chip tone={a.chip.tone}>{a.chip.label}</Chip>}
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
      </div>
    </div>
  )
}
