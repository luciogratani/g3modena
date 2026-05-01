import { act, renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"
import {
  AGE_FILTER_DEFAULT_MAX,
  AGE_FILTER_DEFAULT_MIN,
  getCurrentCandidateStatus,
  getNewColumnFiltersStorageKey,
  getNewColumnFilterVisibilityStorageKey,
} from "../../src/components/candidati-board/board-utils"
import { useCandidateBoardState } from "../../src/components/candidati-board/useCandidateBoardState"
import { useNewColumnFilters } from "../../src/components/candidati-board/useNewColumnFilters"
import { CANDIDATES, type Candidate } from "../../src/data/mockCandidates"
import { InMemoryCandidatesRepository, installLocalStorageMock } from "./test-helpers"

function modenaSeed(): Candidate[] {
  return CANDIDATES.filter((candidate) => candidate.candidateCity === "modena").map((candidate, index) => ({
    ...candidate,
    kanbanRank: (index + 1) * 1000,
  }))
}

function renderBoardHook(seed: Candidate[] = modenaSeed()) {
  const repository = new InMemoryCandidatesRepository(seed)
  const result = renderHook(() => useCandidateBoardState("modena", { repository }))
  return { ...result, repository }
}

describe("board hooks integration", () => {
  beforeEach(() => {
    installLocalStorageMock()
  })

  it("resets hidden filter state and persists visibility+state", async () => {
    const { result } = renderHook(() => useNewColumnFilters("modena"))

    act(() => {
      result.current.handleToggleFilterVisibility("esperienza")
      result.current.handleToggleNewColumnFilter("esperienza")
    })
    expect(result.current.newColumnFilters.esperienza).toBe(true)
    expect(result.current.newColumnFilterVisibility.esperienza).toBe(true)

    act(() => {
      result.current.handleToggleFilterVisibility("esperienza")
    })

    expect(result.current.newColumnFilterVisibility.esperienza).toBe(false)
    expect(result.current.newColumnFilters.esperienza).toBe(false)

    await waitFor(() => {
      const storedVisibility = window.localStorage.getItem(getNewColumnFilterVisibilityStorageKey("modena"))
      const storedFilters = window.localStorage.getItem(getNewColumnFiltersStorageKey("modena"))
      expect(storedVisibility).toContain('"esperienza":false')
      expect(storedFilters).toContain('"esperienza":false')
    })
  })

  it("keeps at least one visible filter in toolbar settings", () => {
    const { result } = renderHook(() => useNewColumnFilters("modena"))

    act(() => {
      result.current.handleToggleFilterVisibility("auto")
    })
    expect(result.current.newColumnFilterVisibility.auto).toBe(false)
    expect(result.current.newColumnFilterVisibility.eta).toBe(true)

    // eta is now the last visible filter: hiding must be ignored.
    act(() => {
      result.current.handleToggleFilterVisibility("eta")
    })

    expect(result.current.newColumnFilterVisibility.eta).toBe(true)
    expect(result.current.newColumnFilters.eta.minAge).toBe(AGE_FILTER_DEFAULT_MIN)
    expect(result.current.newColumnFilters.eta.maxAge).toBe(AGE_FILTER_DEFAULT_MAX)
  })

  it("opens postpone dialog on drag to in_attesa and confirms transition", async () => {
    const { result, repository } = renderBoardHook()
    await waitFor(() => expect(result.current.loading).toBe(false))
    const candidateId = result.current.boardState.columns.nuovo[0]
    expect(candidateId).toBeTruthy()

    act(() => {
      result.current.handleDragStart({ active: { id: candidateId } } as never)
      result.current.handleDragEnd({
        active: { id: candidateId },
        over: { id: "column-in_attesa" },
      } as never)
    })

    expect(result.current.postponeDialogOpen).toBe(true)
    expect(getCurrentCandidateStatus(result.current.boardState.columns, candidateId)).toBe("nuovo")

    act(() => {
      result.current.setPostponeDate("2026-04-01")
      result.current.setPostponeReason("Ricontatto pianificato")
    })
    act(() => {
      result.current.handleConfirmPostponeCandidate()
    })

    expect(result.current.postponeDialogOpen).toBe(false)
    expect(getCurrentCandidateStatus(result.current.boardState.columns, candidateId)).toBe("in_attesa")
    expect(result.current.boardState.byId[candidateId].postponedUntil).toBe("2026-04-01")

    await waitFor(() => {
      const updated = repository.updates.find(
        (entry) => entry.id === candidateId && entry.update.pipelineStage === "in_attesa",
      )
      expect(updated).toBeTruthy()
    })
  })

  it("opens interview dialog on drag to colloquio and applies metadata on confirm", async () => {
    const { result, repository } = renderBoardHook()
    await waitFor(() => expect(result.current.loading).toBe(false))
    const candidateId = result.current.boardState.columns.nuovo[0]

    act(() => {
      result.current.handleDragStart({ active: { id: candidateId } } as never)
      result.current.handleDragEnd({
        active: { id: candidateId },
        over: { id: "column-colloquio" },
      } as never)
    })

    expect(result.current.interviewDialogOpen).toBe(true)

    act(() => {
      result.current.setInterviewDate("2026-04-02")
      result.current.setInterviewTime("14:30")
      result.current.setInterviewNote("Confermare slot sala A")
    })
    act(() => {
      result.current.handleConfirmInterviewTransition()
    })

    expect(result.current.interviewDialogOpen).toBe(false)
    expect(getCurrentCandidateStatus(result.current.boardState.columns, candidateId)).toBe("colloquio")
    expect(result.current.boardState.byId[candidateId].interviewDateTime).toBe("2026-04-02T14:30")
    expect(result.current.boardState.byId[candidateId].interviewNote).toBe("Confermare slot sala A")

    await waitFor(() => {
      const updated = repository.updates.find(
        (entry) => entry.id === candidateId && entry.update.pipelineStage === "colloquio",
      )
      expect(updated).toBeTruthy()
    })
  })

  it("opens discard dialog on drag to scartati and confirms with reason", async () => {
    const { result, repository } = renderBoardHook()
    await waitFor(() => expect(result.current.loading).toBe(false))
    const candidateId = result.current.boardState.columns.nuovo[0]

    act(() => {
      result.current.handleDragStart({ active: { id: candidateId } } as never)
      result.current.handleDragEnd({
        active: { id: candidateId },
        over: { id: "column-scartati" },
      } as never)
    })

    expect(result.current.discardDialogOpen).toBe(true)
    expect(getCurrentCandidateStatus(result.current.boardState.columns, candidateId)).toBe("nuovo")

    act(() => {
      result.current.setDiscardReasonKey("not_a_fit")
    })
    act(() => {
      result.current.handleConfirmDiscardCandidate()
    })

    expect(result.current.discardDialogOpen).toBe(false)
    expect(getCurrentCandidateStatus(result.current.boardState.columns, candidateId)).toBe("scartati")
    expect(result.current.boardState.byId[candidateId].discardReasonKey).toBe("not_a_fit")
    expect(result.current.boardState.byId[candidateId].discardedAt).toBeTruthy()
    expect(result.current.boardState.byId[candidateId].discardReturnStatus).toBe("nuovo")

    await waitFor(() => {
      const updated = repository.updates.find(
        (entry) => entry.id === candidateId && entry.update.discardReasonKey === "not_a_fit",
      )
      expect(updated).toBeTruthy()
    })
  })

  it("blocks discard confirmation when reason is 'other' and note is empty", async () => {
    const { result } = renderBoardHook()
    await waitFor(() => expect(result.current.loading).toBe(false))
    const candidateId = result.current.boardState.columns.nuovo[0]

    act(() => {
      result.current.handleRequestDiscardCandidate(candidateId, "nuovo")
    })
    act(() => {
      result.current.setDiscardReasonKey("other")
      result.current.setDiscardReasonNote("   ")
    })
    act(() => {
      result.current.handleConfirmDiscardCandidate()
    })

    expect(result.current.discardDialogOpen).toBe(true)
    expect(getCurrentCandidateStatus(result.current.boardState.columns, candidateId)).toBe("nuovo")

    act(() => {
      result.current.setDiscardReasonNote("Motivazione libera")
    })
    act(() => {
      result.current.handleConfirmDiscardCandidate()
    })

    expect(result.current.discardDialogOpen).toBe(false)
    expect(getCurrentCandidateStatus(result.current.boardState.columns, candidateId)).toBe("scartati")
    expect(result.current.boardState.byId[candidateId].discardReasonKey).toBe("other")
    expect(result.current.boardState.byId[candidateId].discardReasonNote).toBe("Motivazione libera")
  })

  it("restores from scartati to discardReturnStatus and clears metadata", async () => {
    const { result, repository } = renderBoardHook()
    await waitFor(() => expect(result.current.loading).toBe(false))
    const candidateId = result.current.boardState.columns.nuovo[0]

    act(() => {
      result.current.handleDragStart({ active: { id: candidateId } } as never)
      result.current.handleDragEnd({
        active: { id: candidateId },
        over: { id: "column-colloquio" },
      } as never)
    })
    act(() => {
      result.current.setInterviewDate("2026-04-10")
      result.current.setInterviewTime("10:00")
    })
    act(() => {
      result.current.handleConfirmInterviewTransition()
    })
    expect(getCurrentCandidateStatus(result.current.boardState.columns, candidateId)).toBe("colloquio")

    act(() => {
      result.current.handleRequestDiscardCandidate(candidateId, "colloquio")
    })
    act(() => {
      result.current.setDiscardReasonKey("failed_interview")
    })
    act(() => {
      result.current.handleConfirmDiscardCandidate()
    })
    expect(getCurrentCandidateStatus(result.current.boardState.columns, candidateId)).toBe("scartati")

    act(() => {
      result.current.handleRestoreFromDiscard(candidateId)
    })

    expect(getCurrentCandidateStatus(result.current.boardState.columns, candidateId)).toBe("colloquio")
    expect(result.current.boardState.byId[candidateId].discardReasonKey).toBeUndefined()
    expect(result.current.boardState.byId[candidateId].discardReasonNote).toBeUndefined()
    expect(result.current.boardState.byId[candidateId].discardedAt).toBeUndefined()
    expect(result.current.boardState.byId[candidateId].discardReturnStatus).toBeUndefined()

    await waitFor(() => {
      // Restore writes a final transition back to colloquio with cleared discard columns
      const cleared = repository.updates
        .filter((entry) => entry.id === candidateId)
        .at(-1)
      expect(cleared?.update.pipelineStage).toBe("colloquio")
      expect(cleared?.update.discardReasonKey).toBeNull()
      expect(cleared?.update.discardedAt).toBeNull()
    })
  })

  it("clearing archive removes candidates and triggers DELETE in repo", async () => {
    const archived: Candidate = {
      ...modenaSeed()[0],
      id: "archived-1",
      status: "archivio",
      kanbanRank: 1000,
    }
    const { result, repository } = renderBoardHook([archived])
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.boardState.columns.archivio).toContain("archived-1")

    act(() => {
      result.current.handleClearArchived()
    })

    expect(result.current.boardState.columns.archivio).toEqual([])
    expect(result.current.boardState.byId["archived-1"]).toBeUndefined()

    await waitFor(() => {
      expect(repository.deletes).toContain("archived-1")
    })
  })
})
