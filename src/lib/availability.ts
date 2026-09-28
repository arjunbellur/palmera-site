// The app reads weekly hours from `availability` as { mon..sun: {open, close}
// | {closed: true} } plus `closedDays: string[]` (Samson, Models.swift
// 2026-09-10). The dashboard's own source of truth is `schedule` (hours.same /
// hours.byDay + days). This derives the app's shape from ours so both sides
// stay in step without either changing its model.
import type { Experience } from './schema'

export const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
type DayKey = (typeof DAY_KEYS)[number]
export type DayHours = { open: string; close: string } | { closed: true }
export type Availability = { availability: Record<DayKey, DayHours>; closedDays: DayKey[] }

const norm = (d: string): DayKey | null => {
  const k = d.slice(0, 3).toLowerCase()
  return (DAY_KEYS as readonly string[]).includes(k) ? (k as DayKey) : null
}

/** null when the listing has no weekly hours (one-time events, stays with
 *  check-in/out, or nothing set yet) — callers then write nothing. */
export function availabilityFromSchedule(scheduleType: Experience['scheduleType'] | undefined, schedule: Experience['schedule'] | null | undefined): Availability | null {
  if (scheduleType === 'one_time' || !schedule?.hours?.same) return null
  const open = new Set<DayKey>((schedule.days?.length ? schedule.days : [...DAY_KEYS]).map(norm).filter(Boolean) as DayKey[])
  const availability = {} as Record<DayKey, DayHours>
  const closedDays: DayKey[] = []
  for (const d of DAY_KEYS) {
    const byDay = schedule.hours.byDay?.[d]
    if (!open.has(d) || byDay === null) { availability[d] = { closed: true }; closedDays.push(d); continue }
    const h = byDay ?? schedule.hours.same
    availability[d] = { open: h.open, close: h.close }
  }
  return { availability, closedDays }
}
