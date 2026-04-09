import type { CameriereAvailabilityWindow, CameriereTimelineScale } from "./types"
import { TIMELINE_SCALE_DAYS } from "./timeline-constants"

const DAY_MS = 24 * 60 * 60 * 1000

export type TimelineRange = {
  start: Date
  end: Date
  days: number
}

export function atStartOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0)
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS)
}

export function startOfWeekMonday(date: Date): Date {
  const day = date.getDay()
  const shift = day === 0 ? -6 : 1 - day
  return addDays(atStartOfDay(date), shift)
}

export function differenceInDays(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / DAY_MS)
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function getTimelineRange(scale: CameriereTimelineScale, referenceDate = new Date()): TimelineRange {
  const start = startOfWeekMonday(referenceDate)
  const days = TIMELINE_SCALE_DAYS[scale]
  const end = addDays(start, days)
  return { start, end, days }
}

export function dateToPercent(date: Date, range: TimelineRange): number {
  const dayOffset = differenceInDays(range.start, atStartOfDay(date))
  return clamp((dayOffset / range.days) * 100, 0, 100)
}

export function durationToPercent(start: Date, end: Date, range: TimelineRange): number {
  const daySpan = clamp(differenceInDays(atStartOfDay(start), atStartOfDay(end)), 1, range.days)
  return (daySpan / range.days) * 100
}

export function windowToSegment(window: { start: Date; end: Date }, range: TimelineRange): { left: number; width: number } {
  return {
    left: dateToPercent(window.start, range),
    width: durationToPercent(window.start, window.end, range),
  }
}

export function parseAvailabilityWindowDates(window: CameriereAvailabilityWindow): { start: Date; end: Date } | null {
  const start = atStartOfDay(new Date(window.startDate))
  const end = atStartOfDay(new Date(window.endDate))
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null
  if (end <= start) return null
  return { start, end }
}

