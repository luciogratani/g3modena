import { useEffect, useMemo, useState } from "react"
import type { DragEndEvent, DragOverEvent, DragStartEvent } from "@dnd-kit/core"
import {
  AGE_FILTER_DEFAULT_MAX,
  AGE_FILTER_DEFAULT_MIN,
  BOARD_STORAGE_KEY,
  DEFAULT_NEW_COLUMN_FILTER_VISIBILITY,
  buildTrainingSublaneId,
  collectDuplicateCandidateIds,
  createInitialBoardState,
  findColumnByCandidateId,
  getNewColumnFilterVisibilityStorageKey,
  getCandidatesByStatus,
  getCurrentCandidateStatus,
  localStorageBoardAdapter,
  moveCandidate,
  moveCandidateToStatus,
  toDateKey,
  type CandidateBoardState,
  type NewColumnFilters,
  type NewColumnFilterVisibility,
  type NewColumnFilterVisibilityKey,
  type TrainingSublane,
} from "@/src/components/candidati-board/board-utils"
import {
  CANDIDATES,
  type Candidate,
  type CandidateCity,
  type PostponeReturnStatus,
  type CandidateStatus,
  type TrainingSublaneType,
} from "@/src/data/mockCandidates"
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

type PendingInterviewTransition = {
  candidateId: string
  overId: string
}

type PendingTrainingTransition = {
  candidateId: string
  overId: string
}

function getTrainingSublaneIdFromDrop(overId: string | null): string | null {
  if (!overId?.startsWith("training-lane-")) return null
  return overId.replace("training-lane-", "")
}

function resolvePostponeReturnStatus(
  sourceStatus: CandidateStatus | null | undefined,
  fallbackStatus: PostponeReturnStatus | undefined,
): PostponeReturnStatus {
  if (sourceStatus === "nuovo" || sourceStatus === "colloquio" || sourceStatus === "formazione") {
    return sourceStatus
  }
  return fallbackStatus ?? "nuovo"
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

function toDatetimeLocalValue(value: string | undefined): string {
  const parsed = parseSafeDate(value)
  if (!parsed) return ""
  const year = parsed.getFullYear()
  const month = String(parsed.getMonth() + 1).padStart(2, "0")
  const day = String(parsed.getDate()).padStart(2, "0")
  const hours = String(parsed.getHours()).padStart(2, "0")
  const minutes = String(parsed.getMinutes()).padStart(2, "0")
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

function getCurrentDatetimeLocalValue(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  const hours = String(now.getHours()).padStart(2, "0")
  const minutes = String(now.getMinutes()).padStart(2, "0")
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

function splitDatetimeLocal(value: string | undefined): { date: string; time: string } {
  const normalized = toDatetimeLocalValue(value)
  if (!normalized) return { date: "", time: "09:00" }
  const [date, time] = normalized.split("T")
  return { date, time: time?.slice(0, 5) || "09:00" }
}

function toDateInputValue(value: string | undefined): string {
  if (!value?.trim()) return ""
  const parsed = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return ""
  const year = parsed.getFullYear()
  const month = String(parsed.getMonth() + 1).padStart(2, "0")
  const day = String(parsed.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function getTrainingDraftFromCandidate(candidate: Candidate | undefined): {
  phase: TrainingSublaneType
  scheduledDate: string
} {
  const theoryDate = toDateInputValue(candidate?.trainingTheoryDate ?? candidate?.trainingStartDate)
  const practiceDate = toDateInputValue(candidate?.trainingPracticeDate ?? candidate?.trainingEndDate)
  const explicitPhase = candidate?.trainingPhase
  const phase: TrainingSublaneType =
    explicitPhase === "teoria" || explicitPhase === "pratica"
      ? explicitPhase
      : practiceDate
        ? "pratica"
        : "teoria"
  const scheduledDate = toDateInputValue(candidate?.trainingScheduledDate) || (phase === "teoria" ? theoryDate : practiceDate)
  return {
    phase,
    scheduledDate,
  }
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

function ensureTrainingSublane(
  state: CandidateBoardState,
  type: TrainingSublaneType,
  date: string,
): { nextState: CandidateBoardState; lane: TrainingSublane } {
  const normalizedDate = toDateKey(date)
  if (!normalizedDate) {
    throw new Error("Invalid training sublane date")
  }
  const laneId = buildTrainingSublaneId(type, normalizedDate)
  const existingLane = state.trainingSublanes.find((lane) => lane.id === laneId)
  if (existingLane) return { nextState: state, lane: existingLane }
  const lane: TrainingSublane = {
    id: laneId,
    type,
    date: normalizedDate,
    createdAt: new Date().toISOString(),
  }
  return {
    nextState: {
      ...state,
      trainingSublanes: [...state.trainingSublanes, lane],
    },
    lane,
  }
}

function pruneUnusedTrainingSublanes(state: CandidateBoardState): CandidateBoardState {
  const usedLaneIds = new Set<string>()
  for (const candidateId of state.columns.formazione) {
    const laneId = state.byId[candidateId]?.trainingSublaneId
    if (laneId) usedLaneIds.add(laneId)
  }
  const nextLanes = state.trainingSublanes.filter((lane) => usedLaneIds.has(lane.id))
  if (nextLanes.length === state.trainingSublanes.length) return state
  return {
    ...state,
    trainingSublanes: nextLanes,
  }
}

function applyTrainingSublaneToCandidate(
  state: CandidateBoardState,
  candidateId: string,
  laneId: string | null,
): CandidateBoardState {
  const candidate = state.byId[candidateId]
  if (!candidate) return state
  if (!laneId) {
    const nextState = {
      ...state,
      byId: {
        ...state.byId,
        [candidateId]: {
          ...candidate,
          trainingSublaneId: undefined,
        },
      },
    }
    return pruneUnusedTrainingSublanes(nextState)
  }
  const lane = state.trainingSublanes.find((item) => item.id === laneId)
  if (!lane) return state
  return {
    ...state,
    byId: {
      ...state.byId,
      [candidateId]: {
        ...candidate,
        trainingSublaneId: lane.id,
        trainingPhase: lane.type,
        trainingScheduledDate: lane.date,
        trainingTheoryDate: lane.type === "teoria" ? lane.date : undefined,
        trainingPracticeDate: lane.type === "pratica" ? lane.date : undefined,
      },
    },
  }
}

function getDayDiff(targetDate: Date, fromDate: Date): number {
  const target = new Date(targetDate)
  const from = new Date(fromDate)
  target.setHours(0, 0, 0, 0)
  from.setHours(0, 0, 0, 0)
  const diffMs = target.getTime() - from.getTime()
  return Math.round(diffMs / (1000 * 60 * 60 * 24))
}

function parseFilterVisibilityStorage(rawValue: string | null): NewColumnFilterVisibility {
  if (!rawValue) return { ...DEFAULT_NEW_COLUMN_FILTER_VISIBILITY }
  try {
    const parsed = JSON.parse(rawValue) as Partial<NewColumnFilterVisibility>
    const defaults = DEFAULT_NEW_COLUMN_FILTER_VISIBILITY
    return {
      auto: typeof parsed.auto === "boolean" ? parsed.auto : defaults.auto,
      eta: typeof parsed.eta === "boolean" ? parsed.eta : defaults.eta,
      esperienza: typeof parsed.esperienza === "boolean" ? parsed.esperienza : defaults.esperienza,
      disponibilitaImmediata:
        typeof parsed.disponibilitaImmediata === "boolean"
          ? parsed.disponibilitaImmediata
          : defaults.disponibilitaImmediata,
      residenzaCittaBoard:
        typeof parsed.residenzaCittaBoard === "boolean"
          ? parsed.residenzaCittaBoard
          : defaults.residenzaCittaBoard,
      lingue: typeof parsed.lingue === "boolean" ? parsed.lingue : defaults.lingue,
    }
  } catch {
    return { ...DEFAULT_NEW_COLUMN_FILTER_VISIBILITY }
  }
}

export function useCandidateBoardState(boardCity: CandidateCity = "modena") {
  const [boardState, setBoardState] = useState<CandidateBoardState>(() =>
    createInitialBoardState(CANDIDATES),
  )
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [activeCandidateId, setActiveCandidateId] = useState<string | null>(null)
  const [activeOverStatus, setActiveOverStatus] = useState<CandidateStatus | null>(null)
  const [workflowDrawerOpen, setWorkflowDrawerOpen] = useState(false)
  const [postponeDialogOpen, setPostponeDialogOpen] = useState(false)
  const [postponeCandidateId, setPostponeCandidateId] = useState<string | null>(null)
  const [postponeSourceStatus, setPostponeSourceStatus] = useState<CandidateStatus | null>(null)
  const [postponeDate, setPostponeDate] = useState("")
  const [postponeReason, setPostponeReason] = useState("")
  const [hydrated, setHydrated] = useState(false)
  const [dailyRecapOpen, setDailyRecapOpen] = useState(false)
  const [dailyRecapSkipToday, setDailyRecapSkipToday] = useState(false)
  const [dailyRecapEvaluated, setDailyRecapEvaluated] = useState(false)
  const [interviewDialogOpen, setInterviewDialogOpen] = useState(false)
  const [pendingInterviewTransition, setPendingInterviewTransition] = useState<PendingInterviewTransition | null>(
    null,
  )
  const [interviewDate, setInterviewDate] = useState("")
  const [interviewTime, setInterviewTime] = useState("09:00")
  const [interviewNote, setInterviewNote] = useState("")
  const [trainingDialogOpen, setTrainingDialogOpen] = useState(false)
  const [pendingTrainingTransition, setPendingTrainingTransition] = useState<PendingTrainingTransition | null>(null)
  const [trainingPhase, setTrainingPhase] = useState<TrainingSublaneType>("teoria")
  const [trainingDate, setTrainingDate] = useState("")
  const [trainingNote, setTrainingNote] = useState("")
  const [newColumnFilters, setNewColumnFilters] = useState<NewColumnFilters>({
    auto: false,
    eta: {
      minAge: AGE_FILTER_DEFAULT_MIN,
      maxAge: AGE_FILTER_DEFAULT_MAX,
    },
    esperienza: false,
    disponibilitaImmediata: false,
    residenzaCittaBoard: false,
    lingueParlate: {
      italiano: false,
      inglese: false,
      altro: false,
    },
  })
  const [newColumnFilterVisibility, setNewColumnFilterVisibility] = useState<NewColumnFilterVisibility>(
    () => ({ ...DEFAULT_NEW_COLUMN_FILTER_VISIBILITY }),
  )

  useEffect(() => {
    const persistedState = localStorageBoardAdapter.load(CANDIDATES)
    if (persistedState) setBoardState(persistedState)
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    const storageKey = getNewColumnFilterVisibilityStorageKey(boardCity)
    const persistedVisibility = parseFilterVisibilityStorage(localStorage.getItem(storageKey))
    setNewColumnFilterVisibility(persistedVisibility)
  }, [boardCity])

  useEffect(() => {
    if (typeof window === "undefined") return
    const storageKey = getNewColumnFilterVisibilityStorageKey(boardCity)
    localStorage.setItem(storageKey, JSON.stringify(newColumnFilterVisibility))
  }, [boardCity, newColumnFilterVisibility])

  useEffect(() => {
    if (!hydrated) return
    const timer = window.setTimeout(() => {
      localStorageBoardAdapter.save(boardState)
      window.dispatchEvent(new CustomEvent("admin:candidates:board-updated"))
    }, 300)
    return () => window.clearTimeout(timer)
  }, [boardState, hydrated])

  useEffect(() => {
    if (!import.meta.env.DEV) return
    // Guardrail for future refactors:
    // log duplicate ids early in development so issues are visible before reload/debug sessions.
    const duplicateIds = collectDuplicateCandidateIds(boardState.columns)
    if (duplicateIds.length === 0) return
    console.warn(
      "[CandidatesBoard] Duplicate candidate IDs detected across columns:",
      duplicateIds,
    )
  }, [boardState])

  useEffect(() => {
    function handleClearBoardStorageShortcut(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      const isTypingTarget =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable
      if (isTypingTarget) return

      const isResetShortcut =
        (event.metaKey || event.ctrlKey) && event.shiftKey && event.key === "Backspace"
      if (!isResetShortcut) return

      event.preventDefault()
      localStorage.removeItem(BOARD_STORAGE_KEY)
      setBoardState(createInitialBoardState(CANDIDATES))
      setSelectedCandidateId(null)
      setSheetOpen(false)
    }

    window.addEventListener("keydown", handleClearBoardStorageShortcut)
    return () => window.removeEventListener("keydown", handleClearBoardStorageShortcut)
  }, [])

  function handleOpenDetail(candidate: Candidate) {
    setSelectedCandidateId(candidate.id)
    setSheetOpen(true)
  }

  function handleDragStart(event: DragStartEvent) {
    const activeId = String(event.active.id)
    setActiveCandidateId(activeId)
    setActiveOverStatus(getCurrentCandidateStatus(boardState.columns, activeId))
  }

  function handleDragOver(event: DragOverEvent) {
    const overId = event.over ? String(event.over.id) : null
    if (!overId) {
      setActiveOverStatus(null)
      return
    }
    const statusFromOver = overId.startsWith("training-lane-")
      ? "formazione"
      : overId.startsWith("column-")
        ? (overId.replace("column-", "") as CandidateStatus)
        : getCurrentCandidateStatus(boardState.columns, overId)
    setActiveOverStatus(statusFromOver)
  }

  function handleDragEnd(event: DragEndEvent) {
    const activeId = String(event.active.id)
    const overId = event.over ? String(event.over.id) : null
    setActiveCandidateId(null)
    setActiveOverStatus(null)
    if (!overId) return

    const sourceStatus = getCurrentCandidateStatus(boardState.columns, activeId)
    const directTargetTrainingSublaneId = getTrainingSublaneIdFromDrop(overId)
    const targetStatus = directTargetTrainingSublaneId
      ? "formazione"
      : overId.startsWith("column-")
        ? (overId.replace("column-", "") as CandidateStatus)
        : getCurrentCandidateStatus(boardState.columns, overId)
    if (!sourceStatus || !targetStatus) return
    const overCandidate = boardState.byId[overId]
    const targetTrainingSublaneId =
      directTargetTrainingSublaneId ??
      (targetStatus === "formazione" ? (overCandidate?.trainingSublaneId ?? null) : null)

    if (sourceStatus !== targetStatus && targetStatus === "colloquio") {
      const candidate = boardState.byId[activeId]
      setPendingInterviewTransition({ candidateId: activeId, overId })
      const splitDateTime = splitDatetimeLocal(candidate?.interviewDateTime || getCurrentDatetimeLocalValue())
      setInterviewDate(splitDateTime.date)
      setInterviewTime(splitDateTime.time)
      setInterviewNote(candidate?.interviewNote ?? "")
      setInterviewDialogOpen(true)
      return
    }

    if (sourceStatus !== targetStatus && targetStatus === "formazione") {
      if (targetTrainingSublaneId) {
        setBoardState((currentState) => {
          const movedState = moveCandidateToStatus(currentState, activeId, "formazione")
          return applyTrainingSublaneToCandidate(movedState, activeId, targetTrainingSublaneId)
        })
        return
      }
      const candidate = boardState.byId[activeId]
      setPendingTrainingTransition({ candidateId: activeId, overId })
      const trainingDraft = getTrainingDraftFromCandidate(candidate)
      setTrainingPhase(trainingDraft.phase)
      setTrainingDate(trainingDraft.scheduledDate)
      setTrainingNote(candidate?.trainingNote ?? "")
      setTrainingDialogOpen(true)
      return
    }

    if (sourceStatus === "formazione" && targetStatus === "formazione") {
      if (targetTrainingSublaneId) {
        setBoardState((currentState) => {
          const reorderedState =
            overId.startsWith("column-") || overId.startsWith("training-lane-")
              ? currentState
              : moveCandidate(currentState, activeId, overId)
          return applyTrainingSublaneToCandidate(reorderedState, activeId, targetTrainingSublaneId)
        })
        return
      }
      if (overId === "column-formazione") {
        setBoardState((currentState) => applyTrainingSublaneToCandidate(currentState, activeId, null))
        return
      }
    }

    if (sourceStatus !== targetStatus && targetStatus === "in_attesa") {
      handleRequestPostponeCandidate(activeId, sourceStatus)
      return
    }

    setBoardState((currentState) => moveCandidate(currentState, activeId, overId))
  }

  function handleToggleNewColumnFilter(
    filterKey: "auto" | "esperienza" | "disponibilitaImmediata" | "residenzaCittaBoard",
  ) {
    setNewColumnFilters((currentFilters) => ({
      ...currentFilters,
      [filterKey]: !currentFilters[filterKey],
    }))
  }

  function handleToggleLanguageFilter(languageKey: keyof NewColumnFilters["lingueParlate"]) {
    setNewColumnFilters((currentFilters) => ({
      ...currentFilters,
      lingueParlate: {
        ...currentFilters.lingueParlate,
        [languageKey]: !currentFilters.lingueParlate[languageKey],
      },
    }))
  }

  function handleSetAgeRange(ageRange: { minAge: number | null; maxAge: number | null }) {
    setNewColumnFilters((currentFilters) => ({
      ...currentFilters,
      eta: {
        ...currentFilters.eta,
        minAge: ageRange.minAge,
        maxAge: ageRange.maxAge,
      },
    }))
  }

  function handleToggleFilterVisibility(filterKey: NewColumnFilterVisibilityKey) {
    setNewColumnFilterVisibility((currentVisibility) => {
      const isLastVisibleFilter = currentVisibility[filterKey] && Object.values(currentVisibility).filter(Boolean).length === 1
      const nextValue = isLastVisibleFilter ? true : !currentVisibility[filterKey]
      const nextVisibility = {
        ...currentVisibility,
        [filterKey]: nextValue,
      }

      if (filterKey === "eta" && !nextValue) {
        setNewColumnFilters((currentFilters) => ({
          ...currentFilters,
          eta: {
            minAge: AGE_FILTER_DEFAULT_MIN,
            maxAge: AGE_FILTER_DEFAULT_MAX,
          },
        }))
      }

      return nextVisibility
    })
  }

  function handleClearArchived() {
    setBoardState((currentState) => {
      if (currentState.columns.archivio.length === 0) return currentState
      return {
        ...currentState,
        columns: {
          ...currentState.columns,
          archivio: [],
        },
      }
    })
  }

  function handleRestoreCandidate(candidateId: string) {
    setBoardState((currentState) => {
      const candidate = currentState.byId[candidateId]
      if (!candidate) return currentState
      const targetStatus = candidate.postponeReturnStatus ?? "nuovo"
      return moveCandidateToStatus(currentState, candidateId, targetStatus)
    })
  }

  function handleRestoreArchivedCandidate(candidateId: string) {
    setBoardState((currentState) => moveCandidateToStatus(currentState, candidateId, "in_attesa"))
  }

  function handleArchiveCandidate(candidateId: string) {
    setBoardState((currentState) => moveCandidateToStatus(currentState, candidateId, "archivio"))
  }

  function handleRequestPostponeCandidate(candidateId: string, sourceStatus?: CandidateStatus | null) {
    const currentStatus = sourceStatus ?? getCurrentCandidateStatus(boardState.columns, candidateId)
    setPostponeCandidateId(candidateId)
    setPostponeSourceStatus(currentStatus)
    setPostponeDate(new Date().toISOString().slice(0, 10))
    setPostponeReason("")
    setPostponeDialogOpen(true)
  }

  function handleRequestInterviewCandidate(candidateId: string) {
    const candidate = boardState.byId[candidateId]
    setPendingInterviewTransition({ candidateId, overId: "column-colloquio" })
    const splitDateTime = splitDatetimeLocal(candidate?.interviewDateTime || getCurrentDatetimeLocalValue())
    setInterviewDate(splitDateTime.date)
    setInterviewTime(splitDateTime.time)
    setInterviewNote(candidate?.interviewNote ?? "")
    setInterviewDialogOpen(true)
  }

  function handleRequestTrainingCandidate(candidateId: string) {
    const candidate = boardState.byId[candidateId]
    setPendingTrainingTransition({ candidateId, overId: "column-formazione" })
    const trainingDraft = getTrainingDraftFromCandidate(candidate)
    setTrainingPhase(trainingDraft.phase)
    setTrainingDate(trainingDraft.scheduledDate)
    setTrainingNote(candidate?.trainingNote ?? "")
    setTrainingDialogOpen(true)
  }

  function handleConfirmPostponeCandidate() {
    if (!postponeCandidateId || !postponeDate || !postponeReason.trim()) return
    setBoardState((currentState) => {
      const currentCandidate = currentState.byId[postponeCandidateId]
      if (!currentCandidate) return currentState
      const sourceStatus =
        postponeSourceStatus ?? findColumnByCandidateId(currentState.columns, postponeCandidateId)
      const postponeReturnStatus = resolvePostponeReturnStatus(sourceStatus, currentCandidate.postponeReturnStatus)
      const movedState = moveCandidateToStatus(currentState, postponeCandidateId, "in_attesa")
      return {
        ...movedState,
        byId: {
          ...movedState.byId,
          [postponeCandidateId]: {
            ...currentCandidate,
            postponedUntil: postponeDate,
            postponeReason: postponeReason.trim(),
            postponeReturnStatus,
          },
        },
      }
    })
    setPostponeDialogOpen(false)
    setPostponeCandidateId(null)
    setPostponeSourceStatus(null)
    setPostponeDate("")
    setPostponeReason("")
  }

  function handlePostponeDialogOpenChange(open: boolean) {
    setPostponeDialogOpen(open)
    if (!open) {
      setPostponeCandidateId(null)
      setPostponeSourceStatus(null)
      setPostponeDate("")
      setPostponeReason("")
    }
  }

  const selectedCandidate = selectedCandidateId ? boardState.byId[selectedCandidateId] ?? null : null
  const selectedCandidateStatus = selectedCandidateId
    ? getCurrentCandidateStatus(boardState.columns, selectedCandidateId)
    : null
  const activeCandidate = activeCandidateId ? boardState.byId[activeCandidateId] ?? null : null
  const postponeCandidate = postponeCandidateId ? boardState.byId[postponeCandidateId] ?? null : null
  const activeCandidateColumnStatus = activeCandidate
    ? getCurrentCandidateStatus(boardState.columns, activeCandidate.id)
    : null
  const overlayStatus = activeOverStatus ?? activeCandidateColumnStatus ?? null

  const rimandatiCandidates = useMemo(
    () =>
      getCandidatesByStatus(boardState, "in_attesa").filter(
        (candidate) => Boolean(candidate.postponedUntil) || Boolean(candidate.postponeReason?.trim()),
      ),
    [boardState],
  )
  const archivioCandidates = useMemo(
    () => getCandidatesByStatus(boardState, "archivio"),
    [boardState],
  )
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
      trainingPracticeDays: [...trainingPracticeDateKeys]
        .map(fromDateKey)
        .filter((day): day is Date => Boolean(day)),
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

  function handleOpenRimandatiFromRecap() {
    setWorkflowDrawerOpen(true)
    handleDailyRecapOpenChange(false)
  }

  function handleInterviewDialogOpenChange(open: boolean) {
    setInterviewDialogOpen(open)
    if (!open) {
      setPendingInterviewTransition(null)
      setInterviewDate("")
      setInterviewTime("09:00")
      setInterviewNote("")
    }
  }

  function handleConfirmInterviewTransition() {
    if (!pendingInterviewTransition || !interviewDate.trim()) return
    setBoardState((currentState) => {
      const movedState = moveCandidate(
        currentState,
        pendingInterviewTransition.candidateId,
        pendingInterviewTransition.overId,
      )
      const currentCandidate = movedState.byId[pendingInterviewTransition.candidateId]
      if (!currentCandidate) return movedState
      const timeValue = interviewTime.trim() || "09:00"
      return {
        ...movedState,
        byId: {
          ...movedState.byId,
          [pendingInterviewTransition.candidateId]: {
            ...currentCandidate,
            interviewDateTime: `${interviewDate}T${timeValue}`,
            interviewNote: interviewNote.trim() ? interviewNote.trim() : undefined,
            interviewOutcome: undefined,
          },
        },
      }
    })
    handleInterviewDialogOpenChange(false)
  }

  function handleTrainingDialogOpenChange(open: boolean) {
    setTrainingDialogOpen(open)
    if (!open) {
      setPendingTrainingTransition(null)
      setTrainingPhase("teoria")
      setTrainingDate("")
      setTrainingNote("")
    }
  }

  function handleConfirmTrainingTransition() {
    if (!pendingTrainingTransition) return
    setBoardState((currentState) => {
      let workingState = moveCandidate(
        currentState,
        pendingTrainingTransition.candidateId,
        pendingTrainingTransition.overId,
      )
      let assignedTrainingSublaneId: string | null = null
      if (trainingDate.trim()) {
        const ensured = ensureTrainingSublane(workingState, trainingPhase, trainingDate)
        workingState = ensured.nextState
        assignedTrainingSublaneId = ensured.lane.id
      }

      const currentCandidate = workingState.byId[pendingTrainingTransition.candidateId]
      if (!currentCandidate) return workingState
      const nextState = {
        ...workingState,
        byId: {
          ...workingState.byId,
          [pendingTrainingTransition.candidateId]: {
            ...currentCandidate,
            trainingTrack: undefined,
            trainingPhase,
            trainingScheduledDate: trainingDate.trim() ? trainingDate : undefined,
            trainingTheoryDate: trainingPhase === "teoria" && trainingDate.trim() ? trainingDate : undefined,
            trainingPracticeDate: trainingPhase === "pratica" && trainingDate.trim() ? trainingDate : undefined,
            trainingTheoryCompleted: trainingPhase === "pratica",
            trainingPracticeCompleted: false,
            trainingNote: trainingNote.trim() ? trainingNote.trim() : undefined,
            trainingSublaneId: assignedTrainingSublaneId ?? undefined,
            trainingStartDate: undefined,
            trainingEndDate: undefined,
          },
        },
      }
      return pruneUnusedTrainingSublanes(nextState)
    })
    handleTrainingDialogOpenChange(false)
  }

  function handleUpdateGeneralNotes(candidateId: string, notes: string) {
    setBoardState((currentState) => {
      const candidate = currentState.byId[candidateId]
      if (!candidate) return currentState
      return {
        ...currentState,
        byId: {
          ...currentState.byId,
          [candidateId]: {
            ...candidate,
            notes: notes.trim() ? notes.trim() : undefined,
          },
        },
      }
    })
  }

  function handleUpdateInterviewDetails(
    candidateId: string,
    payload: { interviewDate: string; interviewTime: string; interviewNote: string },
  ) {
    if (!payload.interviewDate.trim()) return
    setBoardState((currentState) => {
      const candidate = currentState.byId[candidateId]
      if (!candidate) return currentState
      const timeValue = payload.interviewTime.trim() || "09:00"
      return {
        ...currentState,
        byId: {
          ...currentState.byId,
          [candidateId]: {
            ...candidate,
            interviewDateTime: `${payload.interviewDate}T${timeValue}`,
            interviewNote: payload.interviewNote.trim() ? payload.interviewNote.trim() : undefined,
          },
        },
      }
    })
  }

  function handleUpdateTrainingDetails(
    candidateId: string,
    payload: { trainingTheoryDate: string; trainingPracticeDate: string; trainingNote: string },
  ) {
    const normalizedPhase: TrainingSublaneType = payload.trainingPracticeDate.trim() ? "pratica" : "teoria"
    const normalizedDate =
      normalizedPhase === "pratica" ? payload.trainingPracticeDate.trim() : payload.trainingTheoryDate.trim()
    if (!normalizedDate) return
    setBoardState((currentState) => {
      const candidate = currentState.byId[candidateId]
      if (!candidate) return currentState
      let workingState = currentState
      let assignedTrainingSublaneId = candidate.trainingSublaneId ?? null
      const currentStatus = getCurrentCandidateStatus(currentState.columns, candidateId)
      if (currentStatus === "formazione") {
        const ensured = ensureTrainingSublane(workingState, normalizedPhase, normalizedDate)
        workingState = ensured.nextState
        assignedTrainingSublaneId = ensured.lane.id
      }
      const nextState = {
        ...workingState,
        byId: {
          ...workingState.byId,
          [candidateId]: {
            ...candidate,
            trainingPhase: normalizedPhase,
            trainingScheduledDate: normalizedDate,
            trainingTheoryDate: normalizedPhase === "teoria" ? normalizedDate : undefined,
            trainingPracticeDate: normalizedPhase === "pratica" ? normalizedDate : undefined,
            trainingTheoryCompleted:
              normalizedPhase === "pratica" ? true : Boolean(candidate.trainingTheoryCompleted),
            trainingPracticeCompleted:
              normalizedPhase === "pratica" ? Boolean(candidate.trainingPracticeCompleted) : false,
            trainingNote: payload.trainingNote.trim() ? payload.trainingNote.trim() : undefined,
            trainingTrack: undefined,
            trainingSublaneId: currentStatus === "formazione" ? (assignedTrainingSublaneId ?? undefined) : undefined,
            trainingStartDate: undefined,
            trainingEndDate: undefined,
          },
        },
      }
      return pruneUnusedTrainingSublanes(nextState)
    })
  }

  function handleUpdatePostponeDetails(
    candidateId: string,
    payload: { postponedUntil: string; postponeReason: string },
  ) {
    if (!payload.postponedUntil.trim() || !payload.postponeReason.trim()) return
    setBoardState((currentState) => {
      const candidate = currentState.byId[candidateId]
      if (!candidate) return currentState
      return {
        ...currentState,
        byId: {
          ...currentState.byId,
          [candidateId]: {
            ...candidate,
            postponedUntil: payload.postponedUntil,
            postponeReason: payload.postponeReason.trim(),
            postponeReturnStatus: candidate.postponeReturnStatus ?? "nuovo",
          },
        },
      }
    })
  }

  return {
    boardState,
    selectedCandidate,
    selectedCandidateStatus,
    sheetOpen,
    activeCandidate,
    overlayStatus: overlayStatus as CandidateStatus | null,
    workflowDrawerOpen,
    postponeDialogOpen,
    interviewDialogOpen,
    trainingDialogOpen,
    dailyRecapOpen,
    dailyRecapSkipToday,
    dailyRecap,
    schedulingCalendar,
    postponeCandidate,
    postponeDate,
    postponeReason,
    interviewDate,
    interviewTime,
    interviewNote,
    trainingPhase,
    trainingDate,
    trainingNote,
    trainingSublanes: boardState.trainingSublanes,
    newColumnFilters,
    newColumnFilterVisibility,
    rimandatiCandidates,
    archivioCandidates,
    setSheetOpen,
    setWorkflowDrawerOpen,
    setPostponeDate,
    setPostponeReason,
    setInterviewDate,
    setInterviewTime,
    setInterviewNote,
    setTrainingPhase,
    setTrainingDate,
    setTrainingNote,
    setDailyRecapSkipToday,
    handleOpenDetail,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    clearActiveDrag() {
      setActiveCandidateId(null)
      setActiveOverStatus(null)
    },
    handleToggleNewColumnFilter,
    handleSetAgeRange,
    handleToggleLanguageFilter,
    handleToggleFilterVisibility,
    handleClearArchived,
    handleRestoreCandidate,
    handleRestoreArchivedCandidate,
    handleArchiveCandidate,
    handleRequestInterviewCandidate,
    handleRequestTrainingCandidate,
    handleRequestPostponeCandidate,
    handleUpdateGeneralNotes,
    handleUpdateInterviewDetails,
    handleUpdateTrainingDetails,
    handleUpdatePostponeDetails,
    handleConfirmPostponeCandidate,
    handlePostponeDialogOpenChange,
    handleInterviewDialogOpenChange,
    handleConfirmInterviewTransition,
    handleTrainingDialogOpenChange,
    handleConfirmTrainingTransition,
    handleDailyRecapOpenChange,
    handleOpenRimandatiFromRecap,
  }
}

