/**
 * Main Candidate Board orchestration hook.
 *
 * Responsibilities:
 * - keeps the canonical board state and DnD transitions;
 * - coordinates workflow dialogs/actions (interview, training, postpone);
 * - composes focused hooks for "Nuovo" filters and daily recap logic.
 *
 * Important:
 * - board persistence remains localStorage-based in this phase;
 * - use this hook as the single integration point from `CandidatiBoard`.
 */
import { useEffect, useMemo, useState } from "react"
import type { DragEndEvent, DragOverEvent, DragStartEvent } from "@dnd-kit/core"
import {
  BOARD_STORAGE_KEY,
  collectDuplicateCandidateIds,
  createInitialBoardState,
  getCandidatesByStatus,
  getCurrentCandidateStatus,
  localStorageBoardAdapter,
  moveCandidate,
  moveCandidateToStatus,
  type CandidateBoardState,
} from "@/src/components/candidati-board/board-utils"
import {
  CANDIDATES,
  type Candidate,
  type CandidateStatus,
} from "@/src/data/mockCandidates"
import { useNewColumnFilters } from "./useNewColumnFilters"
import { useBoardRecap } from "./useBoardRecap"
import { useBoardWorkflowDialogs } from "./useBoardWorkflowDialogs"
import { useBoardWorkflowDetails } from "./useBoardWorkflowDetails"
import { promoteCandidateToCameriere } from "@/src/components/camerieri/storage"
import {
  applyTrainingSublaneToCandidate,
  getTrainingSublaneIdFromDrop,
} from "./workflow-utils"
export function useCandidateBoardState(boardCity: string = "modena") {
  const [boardState, setBoardState] = useState<CandidateBoardState>(() =>
    createInitialBoardState(CANDIDATES),
  )
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [activeCandidateId, setActiveCandidateId] = useState<string | null>(null)
  const [activeOverStatus, setActiveOverStatus] = useState<CandidateStatus | null>(null)
  const [workflowDrawerOpen, setWorkflowDrawerOpen] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const {
    newColumnFilters,
    newColumnFilterVisibility,
    handleToggleNewColumnFilter,
    handleToggleLanguageFilter,
    handleSetAgeRange,
    handleToggleFilterVisibility,
  } = useNewColumnFilters(boardCity)
  const {
    dailyRecapOpen,
    dailyRecapSkipToday,
    setDailyRecapSkipToday,
    dailyRecap,
    schedulingCalendar,
    handleDailyRecapOpenChange,
  } = useBoardRecap(boardState, hydrated)
  const {
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
  } = useBoardWorkflowDialogs({
    boardState,
    setBoardState,
  })
  const {
    handleUpdateGeneralNotes,
    handleUpdateInterviewDetails,
    handleUpdateTrainingDetails,
    handleUpdatePostponeDetails,
  } = useBoardWorkflowDetails({
    setBoardState,
  })

  useEffect(() => {
    const persistedState = localStorageBoardAdapter.load(CANDIDATES)
    if (persistedState) setBoardState(persistedState)
    setHydrated(true)
  }, [])

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
      handleRequestInterviewCandidate(activeId, overId)
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
      handleRequestTrainingCandidate(activeId, overId)
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

    if (sourceStatus !== targetStatus && targetStatus === "scartati") {
      handleRequestDiscardCandidate(activeId, sourceStatus)
      return
    }

    setBoardState((currentState) => moveCandidate(currentState, activeId, overId))
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

  function handleRestoreFromDiscard(candidateId: string) {
    setBoardState((currentState) => {
      const candidate = currentState.byId[candidateId]
      if (!candidate) return currentState
      const targetStatus = candidate.discardReturnStatus ?? "nuovo"
      return moveCandidateToStatus(currentState, candidateId, targetStatus)
    })
  }

  function handlePromoteToWaiter(candidateId: string) {
    const candidate = boardState.byId[candidateId]
    if (!candidate) return
    promoteCandidateToCameriere(candidate)
  }

  const selectedCandidate = selectedCandidateId ? boardState.byId[selectedCandidateId] ?? null : null
  const selectedCandidateStatus = selectedCandidateId
    ? getCurrentCandidateStatus(boardState.columns, selectedCandidateId)
    : null
  const activeCandidate = activeCandidateId ? boardState.byId[activeCandidateId] ?? null : null
  const postponeCandidate = postponeCandidateId ? boardState.byId[postponeCandidateId] ?? null : null
  const discardCandidate = discardCandidateId ? boardState.byId[discardCandidateId] ?? null : null
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
  function handleOpenRimandatiFromRecap() {
    setWorkflowDrawerOpen(true)
    handleDailyRecapOpenChange(false)
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
    discardDialogOpen,
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
    discardCandidate,
    discardReasonKey,
    discardReasonNote,
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
    setDiscardReasonKey,
    setDiscardReasonNote,
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
    handleRestoreFromDiscard,
    handleArchiveCandidate,
    handlePromoteToWaiter,
    handleRequestInterviewCandidate,
    handleRequestTrainingCandidate,
    handleRequestPostponeCandidate,
    handleRequestDiscardCandidate,
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
    handleDiscardDialogOpenChange,
    handleConfirmDiscardCandidate,
    handleDailyRecapOpenChange,
    handleOpenRimandatiFromRecap,
  }
}

