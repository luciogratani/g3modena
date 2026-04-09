/**
 * Workflow detail updaters for Candidate Detail Sheet.
 *
 * Responsibilities:
 * - owns pure update handlers for notes/interview/training/postpone metadata;
 * - keeps `useCandidateBoardState` focused on orchestration and DnD flows;
 * - preserves current business rules for single active training phase.
 */
import type { Dispatch, SetStateAction } from "react"
import { getCurrentCandidateStatus, type CandidateBoardState } from "@/src/components/candidati-board/board-utils"
import type { TrainingSublaneType } from "@/src/data/mockCandidates"
import { ensureTrainingSublane, pruneUnusedTrainingSublanes } from "./workflow-utils"

type UseBoardWorkflowDetailsArgs = {
  setBoardState: Dispatch<SetStateAction<CandidateBoardState>>
}

export function useBoardWorkflowDetails({ setBoardState }: UseBoardWorkflowDetailsArgs) {
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
            trainingTheoryCompleted: normalizedPhase === "pratica" ? true : Boolean(candidate.trainingTheoryCompleted),
            trainingPracticeCompleted: normalizedPhase === "pratica" ? Boolean(candidate.trainingPracticeCompleted) : false,
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
    handleUpdateGeneralNotes,
    handleUpdateInterviewDetails,
    handleUpdateTrainingDetails,
    handleUpdatePostponeDetails,
  }
}
