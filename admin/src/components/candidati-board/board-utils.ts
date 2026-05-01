/**
 * Candidate Board low-level utilities and shared types.
 *
 * Responsibilities:
 * - board state shape (in-memory only);
 * - movement/reorder helpers;
 * - training sub-lane derivation from candidate rows (post DB load);
 * - shared filter-related storage keys/constants.
 *
 * Persistence note (E4 / L5): la board non vive piu' su `localStorage`.
 * La sorgente condivisa e' `public.candidates` via
 * `candidates-repository.ts`; questo modulo resta puro (state shape,
 * transitions, cleanup metadata) per essere testato senza I/O.
 */
import { arrayMove } from "@dnd-kit/sortable"
import {
  KANBAN_COLUMNS,
  type Candidate,
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
  "scartati",
]

export const KANBAN_RANK_STEP = 1000
export const KANBAN_RANK_FIRST = 1000

/**
 * Calcola la rank di un drop secondo la strategia midpoint float
 * (vedi migrazione `0150` + `candidates-repository.ts`).
 *
 * - vicini definiti: rank = (prev + next) / 2;
 * - solo `next` (drop in testa alla colonna): rank = next / 2;
 * - solo `prev` (drop in coda): rank = prev + KANBAN_RANK_STEP;
 * - colonna vuota: rank = KANBAN_RANK_FIRST.
 *
 * Quando il midpoint collassa sulla rank del vicino sinistro (caso
 * patologico dopo molti drop nella stessa fessura), forziamo un piccolo
 * passo positivo per non duplicare la rank.
 */
export function computeMidpointRank(
  prev: number | null | undefined,
  next: number | null | undefined,
): number {
  const hasPrev = typeof prev === "number" && Number.isFinite(prev)
  const hasNext = typeof next === "number" && Number.isFinite(next)
  if (!hasPrev && !hasNext) return KANBAN_RANK_FIRST
  if (!hasPrev) return (next as number) / 2
  if (!hasNext) return (prev as number) + KANBAN_RANK_STEP
  const midpoint = ((prev as number) + (next as number)) / 2
  if (midpoint <= (prev as number)) {
    return (prev as number) + Number.EPSILON * 1024
  }
  return midpoint
}

export function getNewColumnFilterVisibilityStorageKey(boardCity: string): string {
  return `${NEW_COLUMN_FILTER_VISIBILITY_STORAGE_PREFIX}:${boardCity}`
}

export function getNewColumnFiltersStorageKey(boardCity: string): string {
  return `${NEW_COLUMN_FILTERS_STORAGE_PREFIX}:${boardCity}`
}

export function createEmptyColumns(): Record<CandidateStatus, string[]> {
  return {
    nuovo: [],
    colloquio: [],
    formazione: [],
    in_attesa: [],
    scartati: [],
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

export function createEmptyBoardState(): CandidateBoardState {
  return {
    byId: {},
    columns: createEmptyColumns(),
    trainingSublanes: [],
  }
}

export function createInitialBoardState(candidates: Candidate[] = []): CandidateBoardState {
  const byId = Object.fromEntries(candidates.map((candidate) => [candidate.id, candidate]))
  const columns = createEmptyColumns()
  const seen = new Set<string>()
  candidates.forEach((candidate) => {
    if (seen.has(candidate.id)) return
    seen.add(candidate.id)
    columns[candidate.status].push(candidate.id)
  })
  return { byId, columns, trainingSublanes: [] }
}

/**
 * Costruisce il board state a partire da righe gia' caricate dal repository.
 *
 * Le righe arrivano ordinate per (pipeline_stage ASC, kanban_rank ASC), quindi
 * `createInitialBoardState` produce naturalmente colonne ordinate per rank.
 * Inoltre deriviamo i `trainingSublanes` di board dai candidati in
 * `formazione` usando i loro metadata persistiti (admin_workflow JSONB).
 */
export function createBoardStateFromRepoRows(candidates: Candidate[]): CandidateBoardState {
  const baseState = createInitialBoardState(candidates)
  return deriveTrainingSublanesFromState(baseState)
}

function deriveTrainingSublanesFromState(state: CandidateBoardState): CandidateBoardState {
  const trainingSublanes: TrainingSublane[] = []
  const trainingLaneById = new Map<string, TrainingSublane>()
  const mergedById: Record<string, Candidate> = { ...state.byId }

  for (const candidateId of state.columns.formazione) {
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
      preferredType === "teoria"
        ? explicitDate ?? theoryDate
        : preferredType === "pratica"
          ? explicitDate ?? practiceDate
          : null
    if (!preferredType || !preferredDate) continue

    const laneId = candidate.trainingSublaneId?.trim()
      ? candidate.trainingSublaneId
      : buildTrainingSublaneId(preferredType, preferredDate)

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
  for (const candidateId of state.columns.formazione) {
    const laneId = mergedById[candidateId]?.trainingSublaneId
    if (laneId && trainingLaneById.has(laneId)) usedSublaneIds.add(laneId)
  }

  return {
    ...state,
    byId: mergedById,
    trainingSublanes: trainingSublanes.filter((lane) => usedSublaneIds.has(lane.id)),
  }
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
    const reorderedState: CandidateBoardState = {
      ...state,
      columns: {
        ...state.columns,
        [sourceColumn]: arrayMove(sourceIds, sourceIndex, newIndex),
      },
    }
    return applyRankToCandidate(reorderedState, activeId, sourceColumn)
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
  const rankedState = applyRankToCandidate(nextState, activeId, targetColumn)
  const clearedPostponeState = clearPostponeMetadataIfNeeded(rankedState, activeId, targetColumn)
  const clearedDiscardState = clearDiscardMetadataIfNeeded(clearedPostponeState, activeId, targetColumn)
  return clearTrainingSublaneIfNeeded(clearedDiscardState, activeId, targetColumn)
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
  const rankedState = applyRankToCandidate(nextState, candidateId, targetStatus)
  const clearedPostponeState = clearPostponeMetadataIfNeeded(rankedState, candidateId, targetStatus)
  const clearedDiscardState = clearDiscardMetadataIfNeeded(clearedPostponeState, candidateId, targetStatus)
  return clearTrainingSublaneIfNeeded(clearedDiscardState, candidateId, targetStatus)
}

/**
 * Riassegna `kanbanRank` al candidato in base ai vicini nella colonna
 * target. Pure: opera solo sullo state in input.
 */
function applyRankToCandidate(
  state: CandidateBoardState,
  candidateId: string,
  targetColumn: CandidateStatus,
): CandidateBoardState {
  const candidate = state.byId[candidateId]
  if (!candidate) return state
  const ids = state.columns[targetColumn]
  const index = ids.indexOf(candidateId)
  if (index === -1) return state
  const prevId = index > 0 ? ids[index - 1] : null
  const nextId = index < ids.length - 1 ? ids[index + 1] : null
  const prevRank = prevId ? state.byId[prevId]?.kanbanRank ?? null : null
  const nextRank = nextId ? state.byId[nextId]?.kanbanRank ?? null : null
  const newRank = computeMidpointRank(prevRank, nextRank)
  if (candidate.kanbanRank === newRank) return state
  return {
    ...state,
    byId: {
      ...state.byId,
      [candidateId]: {
        ...candidate,
        kanbanRank: newRank,
      },
    },
  }
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

function clearDiscardMetadataIfNeeded(
  state: CandidateBoardState,
  candidateId: string,
  targetStatus: CandidateStatus,
): CandidateBoardState {
  // When a candidate exits the discard lane, we clear discard metadata
  // (reason key/note, timestamp, return status) to keep active lanes free of
  // stale rejection data. Symmetric to clearPostponeMetadataIfNeeded.
  if (targetStatus === "scartati") return state
  const candidate = state.byId[candidateId]
  if (!candidate) return state
  if (
    !candidate.discardReasonKey &&
    !candidate.discardReasonNote &&
    !candidate.discardedAt &&
    !candidate.discardReturnStatus
  ) {
    return state
  }

  return {
    ...state,
    byId: {
      ...state.byId,
      [candidateId]: {
        ...candidate,
        discardReasonKey: undefined,
        discardReasonNote: undefined,
        discardedAt: undefined,
        discardReturnStatus: undefined,
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
