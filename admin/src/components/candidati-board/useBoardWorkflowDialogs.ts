/**
 * Workflow dialog state manager for Candidate Board.
 *
 * Responsibilities:
 * - owns dialog states and form drafts for postpone/interview/training flows;
 * - exposes request/confirm handlers used by DnD and context actions;
 * - applies workflow metadata updates to board state safely.
 */
import { useState, type Dispatch, type SetStateAction } from "react"
import {
  findColumnByCandidateId,
  getCurrentCandidateStatus,
  moveCandidate,
  moveCandidateToStatus,
  type CandidateBoardState,
} from "@/src/components/candidati-board/board-utils"
import type {
  CandidateStatus,
  DiscardReasonKey,
  DiscardReturnStatus,
  PostponeReturnStatus,
  TrainingSublaneType,
} from "@/src/data/mockCandidates"
import {
  ensureTrainingSublane,
  getCurrentDatetimeLocalValue,
  getTrainingDraftFromCandidate,
  pruneUnusedTrainingSublanes,
  splitDatetimeLocal,
} from "./workflow-utils"

type PendingInterviewTransition = {
  candidateId: string
  overId: string
}

type PendingTrainingTransition = {
  candidateId: string
  overId: string
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

function resolveDiscardReturnStatus(
  sourceStatus: CandidateStatus | null | undefined,
  fallbackStatus: DiscardReturnStatus | undefined,
): DiscardReturnStatus {
  if (
    sourceStatus === "nuovo" ||
    sourceStatus === "colloquio" ||
    sourceStatus === "formazione" ||
    sourceStatus === "in_attesa" ||
    sourceStatus === "rimandati"
  ) {
    return sourceStatus
  }
  return fallbackStatus ?? "nuovo"
}

type UseBoardWorkflowDialogsArgs = {
  boardState: CandidateBoardState
  setBoardState: Dispatch<SetStateAction<CandidateBoardState>>
}

export function useBoardWorkflowDialogs({ boardState, setBoardState }: UseBoardWorkflowDialogsArgs) {
  const [postponeDialogOpen, setPostponeDialogOpen] = useState(false)
  const [postponeCandidateId, setPostponeCandidateId] = useState<string | null>(null)
  const [postponeSourceStatus, setPostponeSourceStatus] = useState<CandidateStatus | null>(null)
  const [postponeDate, setPostponeDate] = useState("")
  const [postponeReason, setPostponeReason] = useState("")

  const [interviewDialogOpen, setInterviewDialogOpen] = useState(false)
  const [pendingInterviewTransition, setPendingInterviewTransition] = useState<PendingInterviewTransition | null>(null)
  const [interviewDate, setInterviewDate] = useState("")
  const [interviewTime, setInterviewTime] = useState("09:00")
  const [interviewNote, setInterviewNote] = useState("")

  const [trainingDialogOpen, setTrainingDialogOpen] = useState(false)
  const [pendingTrainingTransition, setPendingTrainingTransition] = useState<PendingTrainingTransition | null>(null)
  const [trainingPhase, setTrainingPhase] = useState<TrainingSublaneType>("teoria")
  const [trainingDate, setTrainingDate] = useState("")
  const [trainingNote, setTrainingNote] = useState("")

  const [discardDialogOpen, setDiscardDialogOpen] = useState(false)
  const [discardCandidateId, setDiscardCandidateId] = useState<string | null>(null)
  const [discardSourceStatus, setDiscardSourceStatus] = useState<CandidateStatus | null>(null)
  const [discardReasonKey, setDiscardReasonKey] = useState<DiscardReasonKey | null>(null)
  const [discardReasonNote, setDiscardReasonNote] = useState("")

  function handleRequestPostponeCandidate(candidateId: string, sourceStatus?: CandidateStatus | null) {
    const currentStatus = sourceStatus ?? getCurrentCandidateStatus(boardState.columns, candidateId)
    setPostponeCandidateId(candidateId)
    setPostponeSourceStatus(currentStatus)
    setPostponeDate(new Date().toISOString().slice(0, 10))
    setPostponeReason("")
    setPostponeDialogOpen(true)
  }

  function handleRequestInterviewCandidate(candidateId: string, overId = "column-colloquio") {
    const candidate = boardState.byId[candidateId]
    setPendingInterviewTransition({ candidateId, overId })
    const splitDateTime = splitDatetimeLocal(candidate?.interviewDateTime || getCurrentDatetimeLocalValue())
    setInterviewDate(splitDateTime.date)
    setInterviewTime(splitDateTime.time)
    setInterviewNote(candidate?.interviewNote ?? "")
    setInterviewDialogOpen(true)
  }

  function handleRequestTrainingCandidate(candidateId: string, overId = "column-formazione") {
    const candidate = boardState.byId[candidateId]
    setPendingTrainingTransition({ candidateId, overId })
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
      const sourceStatus = postponeSourceStatus ?? findColumnByCandidateId(currentState.columns, postponeCandidateId)
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
      let workingState = moveCandidate(currentState, pendingTrainingTransition.candidateId, pendingTrainingTransition.overId)
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

  function handleRequestDiscardCandidate(candidateId: string, sourceStatus?: CandidateStatus | null) {
    const currentStatus = sourceStatus ?? getCurrentCandidateStatus(boardState.columns, candidateId)
    setDiscardCandidateId(candidateId)
    setDiscardSourceStatus(currentStatus)
    setDiscardReasonKey(null)
    setDiscardReasonNote("")
    setDiscardDialogOpen(true)
  }

  function handleDiscardDialogOpenChange(open: boolean) {
    setDiscardDialogOpen(open)
    if (!open) {
      setDiscardCandidateId(null)
      setDiscardSourceStatus(null)
      setDiscardReasonKey(null)
      setDiscardReasonNote("")
    }
  }

  function handleConfirmDiscardCandidate() {
    if (!discardCandidateId || !discardReasonKey) return
    const trimmedNote = discardReasonNote.trim()
    if (discardReasonKey === "other" && !trimmedNote) return
    setBoardState((currentState) => {
      const currentCandidate = currentState.byId[discardCandidateId]
      if (!currentCandidate) return currentState
      const sourceStatus = discardSourceStatus ?? findColumnByCandidateId(currentState.columns, discardCandidateId)
      const discardReturnStatus = resolveDiscardReturnStatus(sourceStatus, currentCandidate.discardReturnStatus)
      const movedState = moveCandidateToStatus(currentState, discardCandidateId, "scartati")
      return {
        ...movedState,
        byId: {
          ...movedState.byId,
          [discardCandidateId]: {
            ...currentCandidate,
            discardReasonKey,
            discardReasonNote: trimmedNote ? trimmedNote : undefined,
            discardedAt: new Date().toISOString(),
            discardReturnStatus,
          },
        },
      }
    })
    handleDiscardDialogOpenChange(false)
  }

  return {
    postponeDialogOpen,
    postponeCandidateId,
    postponeDate,
    postponeReason,
    interviewDialogOpen,
    interviewDate,
    interviewTime,
    interviewNote,
    trainingDialogOpen,
    trainingPhase,
    trainingDate,
    trainingNote,
    discardDialogOpen,
    discardCandidateId,
    discardReasonKey,
    discardReasonNote,

    setPostponeDate,
    setPostponeReason,
    setInterviewDate,
    setInterviewTime,
    setInterviewNote,
    setTrainingPhase,
    setTrainingDate,
    setTrainingNote,
    setDiscardReasonKey,
    setDiscardReasonNote,

    handleRequestPostponeCandidate,
    handleRequestInterviewCandidate,
    handleRequestTrainingCandidate,
    handleConfirmPostponeCandidate,
    handlePostponeDialogOpenChange,
    handleInterviewDialogOpenChange,
    handleConfirmInterviewTransition,
    handleTrainingDialogOpenChange,
    handleConfirmTrainingTransition,
    handleRequestDiscardCandidate,
    handleDiscardDialogOpenChange,
    handleConfirmDiscardCandidate,
  }
}
