/**
 * Main Candidate Board orchestration hook.
 *
 * Responsibilities:
 * - load condivisa via repository Supabase (E4 / L5);
 * - canonical board state e DnD transitions;
 * - workflow dialogs/actions (interview, training, postpone, discard);
 * - sync ottimistico al DB con diff per-candidato + dispatch evento
 *   `admin:candidates:board-updated` su writeback riusciti;
 * - composizione hook focalizzati per filtri "Nuovo" e recap giornaliero.
 */
import { useEffect, useMemo, useRef, useState } from "react"
import type { DragEndEvent, DragOverEvent, DragStartEvent } from "@dnd-kit/core"
import {
  collectDuplicateCandidateIds,
  createBoardStateFromRepoRows,
  createEmptyBoardState,
  findColumnByCandidateId,
  getCandidatesByStatus,
  getCurrentCandidateStatus,
  moveCandidate,
  moveCandidateToStatus,
  type CandidateBoardState,
} from "@/src/components/candidati-board/board-utils"
import {
  candidateToAdminWorkflow,
  type AdminWorkflowBlob,
  type CandidateUpdate,
  type CandidatesRepository,
  supabaseCandidatesRepository,
} from "@/src/components/candidati-board/candidates-repository"
import {
  CITIES_UPDATED_EVENT,
} from "@/src/components/cities/storage"
import type {
  Candidate,
  CandidateStatus,
  DiscardReasonKey,
  DiscardReturnStatus,
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

export const BOARD_UPDATED_EVENT = "admin:candidates:board-updated"

type CandidateSyncSnapshot = {
  pipelineStage: CandidateStatus | null
  kanbanRank: number | undefined
  discardReasonKey: DiscardReasonKey | undefined
  discardReasonNote: string | undefined
  discardedAt: string | undefined
  discardReturnStatus: DiscardReturnStatus | undefined
  adminWorkflowJson: string
}

export type UseCandidateBoardStateOptions = {
  repository?: CandidatesRepository
}

function snapshotCandidate(
  state: CandidateBoardState,
  candidateId: string,
): CandidateSyncSnapshot | null {
  const candidate = state.byId[candidateId]
  if (!candidate) return null
  return {
    pipelineStage: findColumnByCandidateId(state.columns, candidateId),
    kanbanRank: candidate.kanbanRank,
    discardReasonKey: candidate.discardReasonKey,
    discardReasonNote: candidate.discardReasonNote,
    discardedAt: candidate.discardedAt,
    discardReturnStatus: candidate.discardReturnStatus,
    adminWorkflowJson: stableStringify(candidateToAdminWorkflow(candidate)),
  }
}

function snapshotsEqual(a: CandidateSyncSnapshot, b: CandidateSyncSnapshot): boolean {
  return (
    a.pipelineStage === b.pipelineStage &&
    a.kanbanRank === b.kanbanRank &&
    a.discardReasonKey === b.discardReasonKey &&
    a.discardReasonNote === b.discardReasonNote &&
    a.discardedAt === b.discardedAt &&
    a.discardReturnStatus === b.discardReturnStatus &&
    a.adminWorkflowJson === b.adminWorkflowJson
  )
}

/**
 * JSON.stringify deterministico (chiavi ordinate) — ci serve un confronto
 * stabile dello snapshot di `admin_workflow` indipendente dall'ordine di
 * inserimento.
 */
function stableStringify(value: AdminWorkflowBlob): string {
  const sortedKeys = Object.keys(value).sort()
  const ordered: Record<string, unknown> = {}
  for (const key of sortedKeys) {
    const blobValue = (value as Record<string, unknown>)[key]
    if (blobValue !== undefined) ordered[key] = blobValue
  }
  return JSON.stringify(ordered)
}

function buildUpdateFromSnapshots(
  candidate: Candidate,
  prev: CandidateSyncSnapshot | undefined,
  next: CandidateSyncSnapshot,
): CandidateUpdate {
  const update: CandidateUpdate = {}
  if (next.pipelineStage && (!prev || prev.pipelineStage !== next.pipelineStage)) {
    update.pipelineStage = next.pipelineStage
  }
  if (!prev || prev.kanbanRank !== next.kanbanRank) {
    if (typeof next.kanbanRank === "number" && Number.isFinite(next.kanbanRank)) {
      update.kanbanRank = next.kanbanRank
    }
  }
  if (!prev || prev.discardReasonKey !== next.discardReasonKey) {
    update.discardReasonKey = next.discardReasonKey ?? null
  }
  if (!prev || prev.discardReasonNote !== next.discardReasonNote) {
    update.discardReasonNote = next.discardReasonNote ?? null
  }
  if (!prev || prev.discardedAt !== next.discardedAt) {
    update.discardedAt = next.discardedAt ?? null
  }
  if (!prev || prev.discardReturnStatus !== next.discardReturnStatus) {
    update.discardReturnStatus = next.discardReturnStatus ?? null
  }
  if (!prev || prev.adminWorkflowJson !== next.adminWorkflowJson) {
    update.adminWorkflow = candidateToAdminWorkflow(candidate)
  }
  return update
}

export function useCandidateBoardState(
  boardCity: string = "modena",
  options: UseCandidateBoardStateOptions = {},
) {
  const repository = options.repository ?? supabaseCandidatesRepository

  const [boardState, setBoardState] = useState<CandidateBoardState>(() => createEmptyBoardState())
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [activeCandidateId, setActiveCandidateId] = useState<string | null>(null)
  const [activeOverStatus, setActiveOverStatus] = useState<CandidateStatus | null>(null)
  const [workflowDrawerOpen, setWorkflowDrawerOpen] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [boardError, setBoardError] = useState<string | null>(null)

  const lastSyncedRef = useRef<Map<string, CandidateSyncSnapshot>>(new Map())
  const repositoryRef = useRef(repository)
  repositoryRef.current = repository

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
    let cancelled = false

    async function loadBoardForCity() {
      setLoading(true)
      setBoardError(null)
      try {
        const candidates = await repositoryRef.current.listByCity(boardCity)
        if (cancelled) return
        const nextState = createBoardStateFromRepoRows(candidates)
        const initialSnapshots = new Map<string, CandidateSyncSnapshot>()
        for (const id of Object.keys(nextState.byId)) {
          const snapshot = snapshotCandidate(nextState, id)
          if (snapshot) initialSnapshots.set(id, snapshot)
        }
        lastSyncedRef.current = initialSnapshots
        setBoardState(nextState)
        setSelectedCandidateId(null)
        setSheetOpen(false)
      } catch (error) {
        if (cancelled) return
        const message = error instanceof Error ? error.message : "Errore di caricamento board"
        setBoardError(message)
        lastSyncedRef.current = new Map()
        setBoardState(createEmptyBoardState())
      } finally {
        if (!cancelled) {
          setHydrated(true)
          setLoading(false)
        }
      }
    }

    void loadBoardForCity()

    function handleCitiesUpdated() {
      void loadBoardForCity()
    }

    window.addEventListener(CITIES_UPDATED_EVENT, handleCitiesUpdated)
    return () => {
      cancelled = true
      window.removeEventListener(CITIES_UPDATED_EVENT, handleCitiesUpdated)
    }
  }, [boardCity])

  useEffect(() => {
    if (!hydrated) return
    const repo = repositoryRef.current
    const lastSynced = lastSyncedRef.current
    const currentIds = new Set(Object.keys(boardState.byId))
    let mutated = false

    for (const previousId of [...lastSynced.keys()]) {
      if (currentIds.has(previousId)) continue
      lastSynced.delete(previousId)
      mutated = true
      void repo.deleteCandidate(previousId).catch((error) => {
        console.error("[CandidatesBoard] DELETE failed", previousId, error)
        const message = error instanceof Error ? error.message : "Errore di sincronizzazione"
        setBoardError(message)
      })
    }

    for (const id of currentIds) {
      const candidate = boardState.byId[id]
      const snapshot = snapshotCandidate(boardState, id)
      if (!candidate || !snapshot) continue
      const previous = lastSynced.get(id)
      if (previous && snapshotsEqual(previous, snapshot)) continue
      const update = buildUpdateFromSnapshots(candidate, previous, snapshot)
      lastSynced.set(id, snapshot)
      if (Object.keys(update).length === 0) continue
      mutated = true
      void repo.updateCandidate(id, update).catch((error) => {
        console.error("[CandidatesBoard] UPDATE failed", id, error)
        const message = error instanceof Error ? error.message : "Errore di sincronizzazione"
        setBoardError(message)
      })
    }

    if (mutated && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(BOARD_UPDATED_EVENT))
    }
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
      const archivedIds = new Set(currentState.columns.archivio)
      const nextById: Record<string, Candidate> = {}
      for (const [id, candidate] of Object.entries(currentState.byId)) {
        if (!archivedIds.has(id)) nextById[id] = candidate
      }
      return {
        ...currentState,
        byId: nextById,
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
    loading,
    boardError,
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
