/**
 * Workflow utilities for Candidate Board transitions.
 *
 * Centralizes date normalization and training sub-lane helpers used by
 * `useCandidateBoardState` to keep the hook focused on orchestration.
 */
import {
  buildTrainingSublaneId,
  toDateKey,
  type CandidateBoardState,
  type TrainingSublane,
} from "@/src/components/candidati-board/board-utils"
import type { Candidate, TrainingSublaneType } from "@/src/data/mockCandidates"
import { parseSafeDate } from "./date-utils"

export function getTrainingSublaneIdFromDrop(overId: string | null): string | null {
  if (!overId?.startsWith("training-lane-")) return null
  return overId.replace("training-lane-", "")
}

export function toDatetimeLocalValue(value: string | undefined): string {
  const parsed = parseSafeDate(value)
  if (!parsed) return ""
  const year = parsed.getFullYear()
  const month = String(parsed.getMonth() + 1).padStart(2, "0")
  const day = String(parsed.getDate()).padStart(2, "0")
  const hours = String(parsed.getHours()).padStart(2, "0")
  const minutes = String(parsed.getMinutes()).padStart(2, "0")
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

export function getCurrentDatetimeLocalValue(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  const hours = String(now.getHours()).padStart(2, "0")
  const minutes = String(now.getMinutes()).padStart(2, "0")
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

export function splitDatetimeLocal(value: string | undefined): { date: string; time: string } {
  const normalized = toDatetimeLocalValue(value)
  if (!normalized) return { date: "", time: "09:00" }
  const [date, time] = normalized.split("T")
  return { date, time: time?.slice(0, 5) || "09:00" }
}

export function toDateInputValue(value: string | undefined): string {
  if (!value?.trim()) return ""
  const parsed = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return ""
  const year = parsed.getFullYear()
  const month = String(parsed.getMonth() + 1).padStart(2, "0")
  const day = String(parsed.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function getTrainingDraftFromCandidate(candidate: Candidate | undefined): {
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

export function ensureTrainingSublane(
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

export function pruneUnusedTrainingSublanes(state: CandidateBoardState): CandidateBoardState {
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

export function applyTrainingSublaneToCandidate(
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
