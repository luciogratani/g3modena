/**
 * Daily board recap and scheduling markers hook.
 *
 * Responsibilities:
 * - computes recap counters and postponed summaries from board state;
 * - prepares highlighted days for workflow date pickers;
 * - manages recap open/skip-for-today behavior.
 */
import { useEffect, useMemo, useState } from "react"
import type { CandidateBoardState } from "@/src/components/candidati-board/board-utils"
import { getCandidatesByStatus } from "@/src/components/candidati-board/board-utils"
import { parseSafeDate } from "./date-utils"

const DAILY_RECAP_DISMISSED_KEY = "admin:candidates:daily-recap:dismissed-on"

type DailyRecapItem = {
  id: string
  fullName: string
  postponedUntil: string
}

type PostponeReminderSummary = {
  overdueCount: number
  dueTodayCount: number
  upcoming7DaysCount: number
}

function getTodayIsoDate(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function isSameDay(date: Date, reference: Date): boolean {
  return (
    date.getFullYear() === reference.getFullYear() &&
    date.getMonth() === reference.getMonth() &&
    date.getDate() === reference.getDate()
  )
}

function parseDateOnly(value: string | undefined): Date | null {
  if (!value?.trim()) return null
  const parsed = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed
}

function isTodayInTrainingWindow(
  today: Date,
  trainingScheduledDate: string | undefined,
  trainingTheoryDate: string | undefined,
  trainingPracticeDate: string | undefined,
): boolean {
  const scheduled = parseDateOnly(trainingScheduledDate)
  const theory = parseDateOnly(trainingTheoryDate)
  const practice = parseDateOnly(trainingPracticeDate)
  if (!scheduled && !theory && !practice) return false
  return (
    isSameDay(today, scheduled ?? today) ||
    isSameDay(today, theory ?? today) ||
    isSameDay(today, practice ?? today)
  )
}

function toLocalDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function fromDateKey(dateKey: string): Date | null {
  const parsed = new Date(`${dateKey}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed
}

function getDayDiff(targetDate: Date, fromDate: Date): number {
  const target = new Date(targetDate)
  const from = new Date(fromDate)
  target.setHours(0, 0, 0, 0)
  from.setHours(0, 0, 0, 0)
  const diffMs = target.getTime() - from.getTime()
  return Math.round(diffMs / (1000 * 60 * 60 * 24))
}

export function useBoardRecap(boardState: CandidateBoardState, hydrated: boolean) {
  const [dailyRecapOpen, setDailyRecapOpen] = useState(false)
  const [dailyRecapSkipToday, setDailyRecapSkipToday] = useState(false)
  const [dailyRecapEvaluated, setDailyRecapEvaluated] = useState(false)

  const dailyRecap = useMemo(() => {
    const today = new Date()
    const newCount = boardState.columns.nuovo.length
    const interviewsTodayCount = boardState.columns.colloquio.reduce((count, candidateId) => {
      const candidate = boardState.byId[candidateId]
      if (!candidate?.interviewDateTime) return count
      const interviewDate = parseSafeDate(candidate.interviewDateTime)
      if (!interviewDate) return count
      return isSameDay(interviewDate, today) ? count + 1 : count
    }, 0)

    const trainingTodayCount = boardState.columns.formazione.reduce((count, candidateId) => {
      const candidate = boardState.byId[candidateId]
      if (!candidate) return count
      return isTodayInTrainingWindow(
        today,
        candidate.trainingScheduledDate,
        candidate.trainingTheoryDate ?? candidate.trainingStartDate,
        candidate.trainingPracticeDate ?? candidate.trainingEndDate,
      )
        ? count + 1
        : count
    }, 0)

    const postponedCandidates = getCandidatesByStatus(boardState, "in_attesa")
      .filter((candidate) => Boolean(candidate.postponedUntil))
      .sort((a, b) => (a.postponedUntil ?? "").localeCompare(b.postponedUntil ?? ""))
    const postponedCandidatesPreview: DailyRecapItem[] = postponedCandidates.slice(0, 5).map((candidate) => ({
      id: candidate.id,
      fullName: `${candidate.firstName} ${candidate.lastName}`,
      postponedUntil: candidate.postponedUntil ?? "",
    }))

    const postponeSummary: PostponeReminderSummary = postponedCandidates.reduce(
      (summary, candidate) => {
        const postponeDate = parseDateOnly(candidate.postponedUntil)
        if (!postponeDate) return summary
        const dayDiff = getDayDiff(postponeDate, today)
        if (dayDiff < 0) summary.overdueCount += 1
        else if (dayDiff === 0) summary.dueTodayCount += 1
        else if (dayDiff <= 7) summary.upcoming7DaysCount += 1
        return summary
      },
      { overdueCount: 0, dueTodayCount: 0, upcoming7DaysCount: 0 },
    )

    return {
      newCount,
      interviewsTodayCount,
      trainingTodayCount,
      postponedCandidates: postponedCandidatesPreview,
      postponedTotalCount: postponedCandidates.length,
      postponeSummary,
    }
  }, [boardState])

  const schedulingCalendar = useMemo(() => {
    const interviewDateKeys = new Set<string>()
    const trainingTheoryDateKeys = new Set<string>()
    const trainingPracticeDateKeys = new Set<string>()

    for (const candidate of Object.values(boardState.byId)) {
      const interviewDate = parseSafeDate(candidate.interviewDateTime)
      if (interviewDate) interviewDateKeys.add(toLocalDateKey(interviewDate))

      const theoryDate = parseDateOnly(
        candidate.trainingPhase === "teoria"
          ? candidate.trainingScheduledDate ?? candidate.trainingTheoryDate ?? candidate.trainingStartDate
          : candidate.trainingTheoryDate ?? candidate.trainingStartDate,
      )
      if (theoryDate) trainingTheoryDateKeys.add(toLocalDateKey(theoryDate))

      const practiceDate = parseDateOnly(
        candidate.trainingPhase === "pratica"
          ? candidate.trainingScheduledDate ?? candidate.trainingPracticeDate ?? candidate.trainingEndDate
          : candidate.trainingPracticeDate ?? candidate.trainingEndDate,
      )
      if (practiceDate) trainingPracticeDateKeys.add(toLocalDateKey(practiceDate))
    }

    const activityDateKeys = new Set<string>([
      ...interviewDateKeys,
      ...trainingTheoryDateKeys,
      ...trainingPracticeDateKeys,
    ])

    return {
      interviewDays: [...interviewDateKeys].map(fromDateKey).filter((day): day is Date => Boolean(day)),
      trainingTheoryDays: [...trainingTheoryDateKeys].map(fromDateKey).filter((day): day is Date => Boolean(day)),
      trainingPracticeDays: [...trainingPracticeDateKeys].map(fromDateKey).filter((day): day is Date => Boolean(day)),
      activityDays: [...activityDateKeys].map(fromDateKey).filter((day): day is Date => Boolean(day)),
    }
  }, [boardState.byId])

  useEffect(() => {
    if (!hydrated || dailyRecapEvaluated) return
    const dismissedOn = localStorage.getItem(DAILY_RECAP_DISMISSED_KEY)
    const todayIso = getTodayIsoDate()
    if (dismissedOn === todayIso) {
      setDailyRecapEvaluated(true)
      return
    }

    if (
      dailyRecap.newCount > 0 ||
      dailyRecap.interviewsTodayCount > 0 ||
      dailyRecap.trainingTodayCount > 0 ||
      dailyRecap.postponedCandidates.length > 0
    ) {
      setDailyRecapOpen(true)
    }
    setDailyRecapEvaluated(true)
  }, [hydrated, dailyRecap, dailyRecapEvaluated])

  function handleDailyRecapOpenChange(open: boolean) {
    setDailyRecapOpen(open)
    if (!open && dailyRecapSkipToday) {
      localStorage.setItem(DAILY_RECAP_DISMISSED_KEY, getTodayIsoDate())
    }
    if (!open) {
      setDailyRecapSkipToday(false)
    }
  }

  return {
    dailyRecapOpen,
    dailyRecapSkipToday,
    setDailyRecapSkipToday,
    dailyRecap,
    schedulingCalendar,
    handleDailyRecapOpenChange,
  }
}
