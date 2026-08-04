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
import { docDate, countSince, startOfToday, startOfWeek, startOfMonth, isRealBooking, sumField } from '@/lib/analytics'
import { ScreenHeader, Chip, Skeleton, Money, SectionTitle, card, eyebrow } from '@/components/partner/ui'
import { CountTile, formatDate } from './ui'
import type { AppProfile, AppDoc, Booking, Provider, Company } from '@/lib/schema'

const fmtXof = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(n))

interface Activity { icon: string; tone: string; text: string; when: Date }

export default function AdminOverview() {
  const [profiles, setProfiles] = useState<AppProfile[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [providers, setProviders] = useState<Provider[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [profilesLoaded, setProfilesLoaded] = useState(false)
  const [bookingsLoaded, setBookingsLoaded] = useState(false)
  const [uncountersigned, setUncountersigned] = useState<number | null>(null)
  const [activity, setActivity] = useState<Activity[] | null>(null)

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

  // ── Activity feed (one-shot merge) ──
  const loadActivity = async () => {
    const [moments, reviews] = await Promise.all([getAppMoments(), getAppReviews()])
    setActivity(null)
    const byId = new Map(profiles.map((p) => [p.id, p]))
    const who = (d: AppDoc) => { const p = byId.get(d.user_id as string); return p?.handle || p?.name || 'Someone' }
    const items: Activity[] = []
    profiles.forEach((p) => {
      const d = docDate(p); if (!d) return
      items.push({ icon: '✦', tone: 'var(--pf-gold)', text: `${p.handle || p.name || 'New user'} joined the app`, when: d })
    })
    bookings.forEach((b) => {
      const d = docDate(b); if (!d) return
      items.push({ icon: '▤', tone: 'var(--pf-success)', text: `${b.customerName || 'A guest'} booked ${b.title} · ${b.status}`, when: d })
    })
    moments.forEach((m) => {
      const d = docDate(m); if (!d) return
      items.push({ icon: '◉', tone: 'var(--pf-muted)', text: `${who(m)} posted a moment${m.caption ? ` — “${String(m.caption).slice(0, 60)}”` : ''}`, when: d })
    })
    reviews.forEach((r) => {
      const d = docDate(r); if (!d) return
      items.push({ icon: '★', tone: 'var(--pf-gold)', text: `${who(r)} left a ${r.rating}★ review`, when: d })
    })
    items.sort((a, b) => b.when.getTime() - a.when.getTime())
    setActivity(items.slice(0, 15))
  }
  useEffect(() => {
    if (profilesLoaded && bookingsLoaded && activity === null) loadActivity()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profilesLoaded, bookingsLoaded])

  const loading = !(profilesLoaded && bookingsLoaded)

  // ── Derivations ──
  const today = startOfToday(); const week = startOfWeek(); const month = startOfMonth()
  const signupsToday = countSince(profiles, today)
  const signupsWeek = countSince(profiles, week)
  const plusCount = profiles.filter((p) => p.is_plus).length

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

      {/* App growth */}
      <SectionTitle>App</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
        <CountTile label="Signups today" value={signupsToday} tone={signupsToday > 0 ? 'gold' : undefined} />
        <CountTile label="This week" value={signupsWeek} />
        <CountTile label="App users" value={profiles.length} />
        <CountTile label="Plus members" value={plusCount} />
      </div>

      {/* Business */}
      <SectionTitle>Business · this week</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
        <CountTile label="New bookings" value={weekBookings.length} />
        <CountTile label="Pending" value={byStatus('pending')} tone={byStatus('pending') > 0 ? 'gold' : undefined} />
        <CountTile label="Confirmed" value={byStatus('confirmed')} />
        <CountTile label="Completed" value={byStatus('completed')} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 15rem), 1fr))', gap: '12px', marginTop: '12px' }}>
        <div style={{ ...card, background: 'linear-gradient(150deg, rgba(190,154,86,0.12), var(--pf-card))', borderColor: 'var(--pf-border-strong)' }}>
          <div style={eyebrow}>GMV this month · completed</div>
          <div style={{ marginTop: '8px' }}><Money amount={fmtXof(gmvMonth)} size={34} /></div>
        </div>
        <div style={{ ...card, background: 'linear-gradient(150deg, rgba(190,154,86,0.12), var(--pf-card))', borderColor: 'var(--pf-border-strong)' }}>
          <div style={eyebrow}>Palmera commission this month</div>
          <div style={{ marginTop: '8px' }}><Money amount={fmtXof(commissionMonth)} size={34} /></div>
        </div>
      </div>

      {/* Pending actions */}
      {actions.length > 0 && (
        <>
          <SectionTitle>Needs attention</SectionTitle>
          <div style={{ ...card, background: 'var(--pf-green-soft)', borderColor: 'var(--pf-border-strong)', padding: '14px 16px' }}>
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
        <button onClick={loadActivity} style={{ background: 'transparent', border: 'none', color: 'var(--pf-gold)', fontFamily: 'var(--font-sans)', fontSize: '11.5px', cursor: 'pointer', padding: 0 }}>↻ Refresh</button>
      }>
        Latest activity
      </SectionTitle>
      {activity === null ? (
        <Skeleton height="220px" />
      ) : activity.length === 0 ? (
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: 'var(--pf-faint)', fontStyle: 'italic' }}>Nothing yet.</p>
      ) : (
        <div style={{ ...card, padding: '6px 16px' }}>
          {activity.map((a, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: '12px', padding: '9px 0', borderTop: i > 0 ? '1px solid var(--pf-border)' : 'none' }}>
              <span style={{ color: a.tone, fontSize: '12px', flexShrink: 0, width: '16px', textAlign: 'center' }}>{a.icon}</span>
              <span style={{ flex: 1, fontFamily: 'var(--font-serif)', color: 'var(--pf-text)', fontSize: '13.5px', minWidth: 0 }}>{a.text}</span>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: '10.5px', color: 'var(--pf-faint)', flexShrink: 0 }}>{formatDate(a.when.toISOString())}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
