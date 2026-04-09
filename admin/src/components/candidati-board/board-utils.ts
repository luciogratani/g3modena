/**
 * Candidate Board low-level utilities and shared types.
 *
 * Responsibilities:
 * - board state shape and versioned local persistence;
 * - movement/reorder helpers;
 * - migration-safe hydration logic;
 * - shared filter-related storage keys/constants.
 */
import { arrayMove } from "@dnd-kit/sortable"
import {
  CANDIDATES,
  KANBAN_COLUMNS,
  type Candidate,
  type CandidateCity,
  type CandidateStatus,
  type TrainingSublaneType,
} from "@/src/data/mockCandidates"

export type TrainingSublane = {
  id: string
  type: TrainingSublaneType
  date: string
  createdAt: string
}

export type CandidateBoardState = {
  byId: Record<string, Candidate>
  columns: Record<CandidateStatus, string[]>
  trainingSublanes: TrainingSublane[]
}

export type CandidateBoardPersistenceAdapter = {
  load: (candidates: Candidate[]) => CandidateBoardState | null
  save: (state: CandidateBoardState) => void
}

export type NewColumnFilters = {
  auto: boolean
  eta: {
    minAge: number | null
    maxAge: number | null
  }
  esperienza: boolean
  disponibilitaImmediata: boolean
  residenzaCittaBoard: boolean
  lingueParlate: {
    italiano: boolean
    inglese: boolean
    altro: boolean
  }
}

export type NewColumnFilterVisibilityKey =
  | "auto"
  | "eta"
  | "esperienza"
  | "disponibilitaImmediata"
  | "residenzaCittaBoard"
  | "lingue"

export type NewColumnFilterVisibility = Record<NewColumnFilterVisibilityKey, boolean>

export const BOARD_STORAGE_KEY = "admin:candidates:board:v1"
export const AGE_FILTER_DEFAULT_MIN = 18
export const AGE_FILTER_DEFAULT_MAX = 60
export const NEW_COLUMN_FILTER_VISIBILITY_STORAGE_PREFIX = "admin:candidates:new-column-filters:visibility:v1"
export const NEW_COLUMN_FILTERS_STORAGE_PREFIX = "admin:candidates:new-column-filters:state:v1"
export const DEFAULT_NEW_COLUMN_FILTER_VISIBILITY: NewColumnFilterVisibility = {
  auto: true,
  eta: true,
  esperienza: false,
  disponibilitaImmediata: false,
  residenzaCittaBoard: false,
  lingue: false,
}
export const MAIN_BOARD_STATUSES: CandidateStatus[] = [
  "nuovo",
  "colloquio",
  "formazione",
  "in_attesa",
]

export function getNewColumnFilterVisibilityStorageKey(boardCity: CandidateCity): string {
  return `${NEW_COLUMN_FILTER_VISIBILITY_STORAGE_PREFIX}:${boardCity}`
}

export function getNewColumnFiltersStorageKey(boardCity: CandidateCity): string {
  return `${NEW_COLUMN_FILTERS_STORAGE_PREFIX}:${boardCity}`
}

export function createEmptyColumns(): Record<CandidateStatus, string[]> {
  return {
    nuovo: [],
    colloquio: [],
    formazione: [],
    in_attesa: [],
    rimandati: [],
    archivio: [],
  }
}

export function buildTrainingSublaneId(type: TrainingSublaneType, date: string): string {
  return `training-${type}-${date}`
}

export function toDateKey(value: string | undefined): string | null {
  if (!value?.trim()) return null
  const parsed = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return null
  const year = parsed.getFullYear()
  const month = String(parsed.getMonth() + 1).padStart(2, "0")
  const day = String(parsed.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function createInitialBoardState(candidates: Candidate[] = CANDIDATES): CandidateBoardState {
  const byId = Object.fromEntries(candidates.map((candidate) => [candidate.id, candidate]))
  const columns = createEmptyColumns()
  candidates.forEach((candidate) => {
    columns[candidate.status].push(candidate.id)
  })
  return { byId, columns, trainingSublanes: [] }
}

export function findColumnByCandidateId(
  columns: Record<CandidateStatus, string[]>,
  candidateId: string,
): CandidateStatus | null {
  for (const column of KANBAN_COLUMNS) {
    if (columns[column.id].includes(candidateId)) return column.id
  }
  return null
}

function getDropTargetColumn(
  columns: Record<CandidateStatus, string[]>,
  overId: string,
): CandidateStatus | null {
  if (overId.startsWith("column-")) {
    return overId.replace("column-", "") as CandidateStatus
  }
  return findColumnByCandidateId(columns, overId)
}

export function moveCandidate(
  state: CandidateBoardState,
  activeId: string,
  overId: string,
): CandidateBoardState {
  if (activeId === overId) return state

  const sourceColumn = findColumnByCandidateId(state.columns, activeId)
  if (!sourceColumn) return state

  const targetColumn = getDropTargetColumn(state.columns, overId)
  if (!targetColumn) return state

  const sourceIds = state.columns[sourceColumn]
  const targetIds = state.columns[targetColumn]
  const sourceIndex = sourceIds.indexOf(activeId)
  const overIsCard = !overId.startsWith("column-")
  const targetIndexFromCard = overIsCard ? targetIds.indexOf(overId) : -1
  const targetIndex = targetIndexFromCard >= 0 ? targetIndexFromCard : targetIds.length

  if (sourceColumn === targetColumn) {
    if (sourceIndex === -1) return state
    const newIndex = targetIndexFromCard >= 0 ? targetIndex : targetIds.length - 1
    if (sourceIndex === newIndex) return state
    return {
      ...state,
      columns: {
        ...state.columns,
        [sourceColumn]: arrayMove(sourceIds, sourceIndex, newIndex),
      },
    }
  }

  if (sourceIndex === -1) return state
  const nextSourceIds = sourceIds.filter((id) => id !== activeId)
  const nextTargetIds = [...targetIds]
  const safeTargetIndex = Math.max(0, Math.min(targetIndex, nextTargetIds.length))
  nextTargetIds.splice(safeTargetIndex, 0, activeId)

  const nextState = {
    ...state,
    columns: {
      ...state.columns,
      [sourceColumn]: nextSourceIds,
      [targetColumn]: nextTargetIds,
    },
  }
  const clearedPostponeState = clearPostponeMetadataIfNeeded(nextState, activeId, targetColumn)
  return clearTrainingSublaneIfNeeded(clearedPostponeState, activeId, targetColumn)
}

type SerializedBoardV1 = {
  columns: Record<CandidateStatus, string[]>
}

type SerializedBoardV2 = {
  version: 2
  columns: Record<CandidateStatus, string[]>
  byId: Record<string, Candidate>
}

type SerializedBoardV3 = {
  version: 3
  columns: Record<CandidateStatus, string[]>
  byId: Record<string, Candidate>
  trainingSublanes: TrainingSublane[]
}

function serializeBoard(state: CandidateBoardState): string {
  const payload: SerializedBoardV3 = {
    version: 3,
    columns: state.columns,
    byId: state.byId,
    trainingSublanes: state.trainingSublanes,
  }
  return JSON.stringify(payload)
}

function hydrateBoard(serializedState: string, candidates: Candidate[]): CandidateBoardState | null {
  try {
    const parsed = JSON.parse(serializedState) as
      | (SerializedBoardV1 & { version?: never })
      | { version: 2; columns?: Partial<Record<CandidateStatus, unknown>>; byId?: Record<string, unknown> }
      | {
          version: 3
          columns?: Partial<Record<CandidateStatus, unknown>>
          byId?: Record<string, unknown>
          trainingSublanes?: unknown
        }

    const initialState = createInitialBoardState(candidates)
    if (!parsed?.columns) return initialState

    const nextColumns = createEmptyColumns()
    const seenIds = new Set<string>()

    // Rehydrate persisted columns first, enforcing global id uniqueness.
    // Important: an id must appear in at most one column, otherwise dnd-kit becomes unstable.
    for (const column of KANBAN_COLUMNS) {
      const rawIds = parsed.columns[column.id]
      if (!Array.isArray(rawIds)) continue
      for (const rawId of rawIds) {
        if (typeof rawId !== "string") continue
        if (!initialState.byId[rawId]) continue
        if (seenIds.has(rawId)) continue
        seenIds.add(rawId)
        nextColumns[column.id].push(rawId)
      }
    }

    // Append new/unseen candidates once, in their default status column.
    // This preserves backward compatibility when mock data changes between sessions.
    for (const candidate of candidates) {
      if (seenIds.has(candidate.id)) continue
      seenIds.add(candidate.id)
      nextColumns[candidate.status].push(candidate.id)
    }

    const mergedById: Record<string, Candidate> = { ...initialState.byId }
    if ((parsed.version === 2 || parsed.version === 3) && parsed.byId && typeof parsed.byId === "object") {
      for (const candidateId of Object.keys(mergedById)) {
        const persistedCandidate = parsed.byId[candidateId]
        if (!persistedCandidate || typeof persistedCandidate !== "object") continue
        mergedById[candidateId] = {
          ...mergedById[candidateId],
          ...(persistedCandidate as Partial<Candidate>),
        }
      }
    }

    const trainingSublanes: TrainingSublane[] = []
    const trainingLaneById = new Map<string, TrainingSublane>()
    if (parsed.version === 3 && Array.isArray(parsed.trainingSublanes)) {
      for (const rawLane of parsed.trainingSublanes) {
        if (!rawLane || typeof rawLane !== "object") continue
        const lane = rawLane as Partial<TrainingSublane>
        const type = lane.type
        const date = toDateKey(typeof lane.date === "string" ? lane.date : undefined)
        if ((type !== "teoria" && type !== "pratica") || !date) continue
        const id = typeof lane.id === "string" && lane.id.trim() ? lane.id : buildTrainingSublaneId(type, date)
        if (trainingLaneById.has(id)) continue
        const normalizedLane: TrainingSublane = {
          id,
          type,
          date,
          createdAt:
            typeof lane.createdAt === "string" && lane.createdAt.trim() ? lane.createdAt : new Date().toISOString(),
        }
        trainingLaneById.set(id, normalizedLane)
        trainingSublanes.push(normalizedLane)
      }
    }

    // Backward compatibility for v1/v2 and legacy records:
    // derive sub-lanes from normalized training phase/date when possible.
    for (const candidateId of nextColumns.formazione) {
      const candidate = mergedById[candidateId]
      if (!candidate) continue
      if (candidate.trainingSublaneId && trainingLaneById.has(candidate.trainingSublaneId)) continue

      const explicitDate = toDateKey(candidate.trainingScheduledDate)
      const theoryDate = toDateKey(candidate.trainingTheoryDate ?? candidate.trainingStartDate)
      const practiceDate = toDateKey(candidate.trainingPracticeDate ?? candidate.trainingEndDate)
      const explicitPhase = candidate.trainingPhase
      const preferredType: TrainingSublaneType | null =
        explicitPhase === "teoria" || explicitPhase === "pratica"
          ? explicitPhase
          : practiceDate
            ? "pratica"
            : theoryDate
              ? "teoria"
              : null
      const preferredDate =
        preferredType === "teoria" ? explicitDate ?? theoryDate : preferredType === "pratica" ? explicitDate ?? practiceDate : null
      if (!preferredType || !preferredDate) continue

      const laneId = buildTrainingSublaneId(preferredType, preferredDate)
      if (!trainingLaneById.has(laneId)) {
        const lane: TrainingSublane = {
          id: laneId,
          type: preferredType,
          date: preferredDate,
          createdAt: new Date().toISOString(),
        }
        trainingLaneById.set(lane.id, lane)
        trainingSublanes.push(lane)
      }
      mergedById[candidateId] = {
        ...candidate,
        trainingPhase: preferredType,
        trainingScheduledDate: preferredDate,
        trainingTheoryDate: preferredType === "teoria" ? preferredDate : undefined,
        trainingPracticeDate: preferredType === "pratica" ? preferredDate : undefined,
        trainingSublaneId: laneId,
      }
    }

    const usedSublaneIds = new Set<string>()
    for (const candidateId of nextColumns.formazione) {
      const laneId = mergedById[candidateId]?.trainingSublaneId
      if (laneId && trainingLaneById.has(laneId)) usedSublaneIds.add(laneId)
    }
    const prunedTrainingSublanes = trainingSublanes.filter((lane) => usedSublaneIds.has(lane.id))

    return {
      byId: mergedById,
      columns: nextColumns,
      trainingSublanes: prunedTrainingSublanes,
    }
  } catch {
    return null
  }
}

export const localStorageBoardAdapter: CandidateBoardPersistenceAdapter = {
  load(candidates) {
    if (typeof window === "undefined") return null
    const serialized = localStorage.getItem(BOARD_STORAGE_KEY)
    if (!serialized) return null
    return hydrateBoard(serialized, candidates)
  },
  save(state) {
    if (typeof window === "undefined") return
    localStorage.setItem(BOARD_STORAGE_KEY, serializeBoard(state))
  },
}

export function getCandidatesByStatus(
  state: CandidateBoardState,
  status: CandidateStatus,
): Candidate[] {
  return state.columns[status]
    .map((candidateId) => state.byId[candidateId])
    .filter((candidate): candidate is Candidate => Boolean(candidate))
}

export function getCurrentCandidateStatus(
  columns: Record<CandidateStatus, string[]>,
  candidateId: string,
): CandidateStatus | null {
  return findColumnByCandidateId(columns, candidateId)
}

export function moveCandidateToStatus(
  state: CandidateBoardState,
  candidateId: string,
  targetStatus: CandidateStatus,
): CandidateBoardState {
  const nextColumns = { ...state.columns }
  for (const column of KANBAN_COLUMNS) {
    nextColumns[column.id] = nextColumns[column.id].filter((id) => id !== candidateId)
  }
  nextColumns[targetStatus] = [...nextColumns[targetStatus], candidateId]
  const nextState = {
    ...state,
    columns: nextColumns,
  }
  const clearedPostponeState = clearPostponeMetadataIfNeeded(nextState, candidateId, targetStatus)
  return clearTrainingSublaneIfNeeded(clearedPostponeState, candidateId, targetStatus)
}

function clearPostponeMetadataIfNeeded(
  state: CandidateBoardState,
  candidateId: string,
  targetStatus: CandidateStatus,
): CandidateBoardState {
  // When a candidate exits the postpone lane (`in_attesa`/`rimandati`),
  // we clear postpone metadata to avoid stale "Rimandata" badges in active lanes.
  if (targetStatus === "in_attesa" || targetStatus === "rimandati") return state
  const candidate = state.byId[candidateId]
  if (!candidate) return state
  if (!candidate.postponedUntil && !candidate.postponeReason && !candidate.postponeReturnStatus) return state

  return {
    ...state,
    byId: {
      ...state.byId,
      [candidateId]: {
        ...candidate,
        postponedUntil: undefined,
        postponeReason: undefined,
        postponeReturnStatus: undefined,
      },
    },
  }
}

function clearTrainingSublaneIfNeeded(
  state: CandidateBoardState,
  candidateId: string,
  targetStatus: CandidateStatus,
): CandidateBoardState {
  if (targetStatus === "formazione") return state
  const candidate = state.byId[candidateId]
  if (!candidate?.trainingSublaneId) return state

  const nextById = {
    ...state.byId,
    [candidateId]: {
      ...candidate,
      trainingSublaneId: undefined,
      trainingPhase: undefined,
      trainingScheduledDate: undefined,
    },
  }
  const usedLaneIds = new Set<string>()
  for (const formazioneCandidateId of state.columns.formazione) {
    const laneId = nextById[formazioneCandidateId]?.trainingSublaneId
    if (laneId) usedLaneIds.add(laneId)
  }
  return {
    ...state,
    byId: nextById,
    trainingSublanes: state.trainingSublanes.filter((lane) => usedLaneIds.has(lane.id)),
  }
}

export function collectDuplicateCandidateIds(
  columns: Record<CandidateStatus, string[]>,
): string[] {
  // Dev diagnostic helper: scans all columns and returns ids that appear more than once.
  // Used to catch regressions in hydration/move logic without affecting production runtime.
  const seenIds = new Set<string>()
  const duplicateIds = new Set<string>()

  for (const column of KANBAN_COLUMNS) {
    for (const candidateId of columns[column.id]) {
      if (seenIds.has(candidateId)) {
        duplicateIds.add(candidateId)
      } else {
        seenIds.add(candidateId)
      }
    }
  }

  return [...duplicateIds]
}
