'use client'
// Growth ("App") — how the mobile app is doing: signups, engagement, the
// social graph, the points economy, and which experiences convert. One-shot
// reads of the app's collections (all admin-readable under existing rules)
// with a refresh button; charts from the shared pf kit.
import { useEffect, useState } from 'react'
import {
  getAppProfiles, getAppMoments, countDocs, getAppMomentComments,
  getAppFriends, getAppFavorites, getAppReviews, getAppPointsLedger,
  getAppChatMessages, getAllBookingsAdmin, getAllExperiencesAdmin,
} from '@/lib/firestore'
import { bucketByPeriod, groupCount, isRealBooking, docDate } from '@/lib/analytics'
import { ScreenHeader, Chip, Skeleton, SectionTitle, EmptyState, card, eyebrow } from '@/components/partner/ui'
import { BarChart, RankPills } from '@/components/charts'
import { CountTile, SparkTile, FilterChip, glass } from '../ui'
import type { AppProfile, AppDoc, Booking, Experience } from '@/lib/schema'
import { Users, Gem, Camera, Heart, PencilLine, MessageSquare, Coins, ListOrdered, LayoutGrid, UserPlus, Clock } from 'lucide-react'
import { formatAmount } from '@/lib/money'
import MembersPanel from '@/components/admin/MembersPanel'

const fmt = formatAmount

type RankMode = 'favorites' | 'bookings' | 'revenue'

export default function AdminAppGrowth() {
  const [data, setData] = useState<{
    profiles: AppProfile[]; moments: AppDoc[]; likes: number; comments: AppDoc[]
    friends: AppDoc[]; favorites: AppDoc[]; reviews: AppDoc[]; points: AppDoc[]
    messages: AppDoc[]; bookings: Booking[]; experiences: Experience[]
  } | null>(null)
  const [rankMode, setRankMode] = useState<RankMode>('bookings')

  const load = async () => {
    setData(null)
    const [profiles, moments, likes, comments, friends, favorites, reviews, points, messages, bookingsRaw, experiences] = await Promise.all([
      getAppProfiles(), getAppMoments(), countDocs('moment_likes'), getAppMomentComments(),
      getAppFriends(), getAppFavorites(), getAppReviews(), getAppPointsLedger(),
      getAppChatMessages(), getAllBookingsAdmin(), getAllExperiencesAdmin(),
    ])
    setData({ profiles, moments, likes, comments, friends, favorites, reviews, points, messages, bookings: bookingsRaw.filter(isRealBooking), experiences })
  }
  useEffect(() => { load() }, [])

  if (!data) return (
    <div className="pf-in">
      <Skeleton height="74px" style={{ maxWidth: '30rem', marginBottom: '22px' }} />
      <Skeleton height="180px" style={{ marginBottom: '12px' }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
        <Skeleton height="86px" /><Skeleton height="86px" /><Skeleton height="86px" />
      </div>
    </div>
  )

  const { profiles, moments, likes, comments, friends, favorites, reviews, points, messages, bookings, experiences } = data

  // ── 1. Signups ──
  const signupBuckets = bucketByPeriod(profiles, { period: 'week', buckets: 10 })
  const byCity = groupCount(profiles, 'city').slice(0, 5)

  // ── 2. Engagement ──
  const content = [...moments, ...comments, ...messages]
  const contentBuckets = bucketByPeriod(content, { period: 'week', buckets: 10 })
  const momentsPerUser = profiles.length ? (moments.length / profiles.length).toFixed(1) : '0'
  const likesPerMoment = moments.length ? (likes / moments.length).toFixed(1) : '0'

  // ── 3. Social graph ──
  const accepted = friends.filter((f) => f.status === 'accepted').length
  const pendingFriends = friends.length - accepted
  const avgFriends = profiles.length ? (accepted / profiles.length).toFixed(1) : '0'

  // ── 4. Points economy ──
  const totalPoints = points.reduce((s, p) => s + (typeof p.points === 'number' ? p.points : 0), 0)
  const pointsByKind = (() => {
    const m = new Map<string, number>()
    points.forEach((p) => {
      const k = typeof p.kind === 'string' ? p.kind : 'other'
      m.set(k, (m.get(k) || 0) + (typeof p.points === 'number' ? p.points : 0))
    })
    return [...m.entries()].map(([label, value]) => ({ label, value, display: `${fmt(value)} pts` })).sort((a, b) => b.value - a.value)
  })()
  const topEarners = (() => {
    const m = new Map<string, number>()
    points.forEach((p) => {
      if (typeof p.user_id !== 'string') return
      m.set(p.user_id, (m.get(p.user_id) || 0) + (typeof p.points === 'number' ? p.points : 0))
    })
    const byId = new Map(profiles.map((p) => [p.id, p]))
    return [...m.entries()]
      .map(([uid, value]) => { const pr = byId.get(uid); return { label: pr?.handle ? `@${pr.handle.replace(/^@+/, '')}` : (pr?.name || '—'), value, display: `${fmt(value)} pts`, img: pr?.avatar_url || null } })
      .sort((a, b) => b.value - a.value).slice(0, 5)
  })()

  // ── 5+6. Favorites → bookings funnel + top experiences ──
  const expTitle = new Map(experiences.map((e) => [e.id, e.title || 'Untitled']))
  const expImgById = new Map(experiences.map((e) => [e.id, e.img || null]))
  const expImgByTitle = new Map(experiences.map((e) => [e.title || 'Untitled', e.img || null]))
  const favByExp = groupCount(favorites, 'exp_id')
  const bookedCount = bookings.length
  const completedCount = bookings.filter((b) => b.status === 'completed').length
  const rankItems = (() => {
    if (rankMode === 'favorites') {
      return favByExp.slice(0, 5).map((f) => ({ label: expTitle.get(f.label) || f.label, value: f.value, display: `${f.value} ♥`, img: expImgById.get(f.label) || null }))
    }
    const m = new Map<string, number>()
    bookings.forEach((b) => {
      if (rankMode === 'revenue' && b.status !== 'completed') return
      const key = b.title || expTitle.get(b.experienceId) || '—'
      m.set(key, (m.get(key) || 0) + (rankMode === 'revenue' ? (b.bookingTotal || 0) : 1))
    })
    return [...m.entries()]
      .map(([label, value]) => ({ label, value, display: rankMode === 'revenue' ? `${fmt(value)} XOF` : `${value}`, img: expImgByTitle.get(label) || null }))
      .sort((a, b) => b.value - a.value).slice(0, 5)
  })()

  const newestUser = (() => {
    const withDates = profiles.map((p) => ({ p, d: docDate(p) })).filter((x) => x.d) as { p: AppProfile; d: Date }[]
    withDates.sort((a, b) => b.d.getTime() - a.d.getTime())
    return withDates[0]?.p
  })()

  return (
    <div className="pf-in">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap' }}>
        <ScreenHeader label="Palmera HQ" title="App growth" intro="Signups, engagement, and what's converting inside the app." />
        <button onClick={load} style={{ marginTop: '4px', background: 'transparent', border: '1px solid var(--pf-border)', borderRadius: '8px', color: 'var(--pf-gold)', fontFamily: 'var(--font-sans)', fontSize: '11px', cursor: 'pointer', padding: '6px 12px' }}>↻ Refresh</button>
      </div>

      {/* Composition: charts flow down the main column; city, social graph and
          the earners leaderboard live on the sticky rail at ≥1200px. */}
      <div className="pf-cols">
      <div style={{ minWidth: 0 }}>
      {/* 1 — Signups */}
      <SectionTitle>Signups</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))', gap: '12px', marginBottom: '12px' }}>
        <SparkTile icon={<Users size={14} strokeWidth={1.75} />} label="Total users" value={profiles.length} spark={signupBuckets.map((b) => b.count)} featured />
        <CountTile icon={<Gem size={14} strokeWidth={1.75} />} label="Plus members" value={profiles.filter((p) => p.is_plus).length} />
        <div className="pf-glass" style={glass}>
          <div style={{ width: '30px', height: '30px', borderRadius: '9px', background: 'var(--pf-green-soft)', color: 'var(--pf-gold)', display: 'grid', placeItems: 'center', fontSize: '13px', marginBottom: '10px' }}>↟</div>
          <div style={eyebrow}>Newest user</div>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', color: 'var(--pf-text)', marginTop: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {newestUser ? (newestUser.handle ? `@${newestUser.handle.replace(/^@+/, '')}` : newestUser.name || '—') : '—'}
          </div>
        </div>
      </div>
      <BarChart data={signupBuckets.map((b) => ({ label: b.label, value: b.count }))} />

      {/* 2 — Engagement */}
      <SectionTitle>Engagement</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))', gap: '12px', marginBottom: '12px' }}>
        <CountTile icon={<Camera size={14} strokeWidth={1.75} />} label="Moments" value={moments.length} />
        <CountTile icon={<Heart size={14} strokeWidth={1.75} />} label="Likes" value={likes} />
        <CountTile icon={<PencilLine size={14} strokeWidth={1.75} />} label="Comments" value={comments.length} />
        <CountTile icon={<MessageSquare size={14} strokeWidth={1.75} />} label="Chat messages" value={messages.length} />
      </div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
        <Chip tone="gold">{momentsPerUser} moments / user</Chip>
        <Chip tone="gold">{likesPerMoment} likes / moment</Chip>
        <Chip tone="neutral">{reviews.length} review(s)</Chip>
      </div>
      <div style={{ ...eyebrow, marginBottom: '10px' }}>Content per week · moments + comments + messages</div>
      <BarChart data={contentBuckets.map((b) => ({ label: b.label, value: b.count }))} />


      {/* 4 — Points economy */}
      <SectionTitle>Points economy</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))', gap: '12px', marginBottom: '16px' }}>
        <CountTile icon={<Coins size={14} strokeWidth={1.75} />} label="Points issued" value={totalPoints} tone="gold" />
        <CountTile icon={<ListOrdered size={14} strokeWidth={1.75} />} label="Ledger entries" value={points.length} />
      </div>
      {pointsByKind.length > 0 && (
        <div>
          <div style={{ ...eyebrow, marginBottom: '10px' }}>By reason</div>
          <RankPills items={pointsByKind.slice(0, 5)} />
        </div>
      )}

      {/* 5 — Funnel */}
      <SectionTitle>Discovery → booking funnel</SectionTitle>
      <div className="pf-glass" style={{ ...glass, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap', padding: '18px 22px' }}>
        {[
          { label: 'Favorited', value: favorites.length, icon: '♥' },
          { label: 'Booked', value: bookedCount, icon: '▤' },
          { label: 'Completed', value: completedCount, icon: '✓' },
        ].map((step, i) => (
          <div key={step.label} style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 auto' }}>
            {i > 0 && <span style={{ color: 'var(--pf-faint)', fontSize: '14px' }}>→</span>}
            <div>
              <div style={eyebrow}>{step.icon} {step.label}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '30px', color: i === 2 ? 'var(--pf-gold)' : 'var(--pf-text)', marginTop: '4px' }}>{step.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* 6 — Top experiences */}
      <SectionTitle action={
        <div style={{ display: 'flex', gap: '6px' }}>
          {(['favorites', 'bookings', 'revenue'] as RankMode[]).map((m) => (
            <FilterChip key={m} active={rankMode === m} onClick={() => setRankMode(m)}>{m}</FilterChip>
          ))}
        </div>
      }>
        Top experiences
      </SectionTitle>
      {rankItems.length === 0 ? (
        <EmptyState icon={<LayoutGrid size={22} strokeWidth={1.75} />} title="Nothing yet" body={`No ${rankMode === 'revenue' ? 'completed revenue' : rankMode} recorded so far.`} />
      ) : (
        <RankPills items={rankItems} />
      )}
      </div>

      <div className="pf-rail" style={{ minWidth: 0 }}>
        {byCity.length > 0 && (
          <>
            <SectionTitle>Users by city</SectionTitle>
            <RankPills items={byCity.map((c) => ({ label: c.label, value: c.value, display: `${c.value}` }))} />
          </>
        )}
        <SectionTitle>Social graph</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', gap: '12px' }}>
          <CountTile icon={<UserPlus size={14} strokeWidth={1.75} />} label="Friendships" value={accepted} tone="gold" />
          <CountTile icon={<Clock size={14} strokeWidth={1.75} />} label="Pending requests" value={pendingFriends} />
          <div className="pf-glass" style={glass}>
            <div style={{ width: '30px', height: '30px', borderRadius: '9px', background: 'var(--pf-green-soft)', color: 'var(--pf-gold)', display: 'grid', placeItems: 'center', fontSize: '13px', marginBottom: '10px' }}>∅</div>
            <div style={eyebrow}>Avg friends / user</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '27px', color: 'var(--pf-text)', marginTop: '6px' }}>{avgFriends}</div>
          </div>
        </div>
        {topEarners.length > 0 && (
          <>
            <SectionTitle>Top earners</SectionTitle>
            <RankPills items={topEarners} />
          </>
        )}
        <MembersPanel profiles={profiles} />
      </div>
      </div>
    </div>
  )
}
