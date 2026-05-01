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
import { installLocalStorageMock } from "./test-helpers"

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

  it("opens postpone dialog on drag to in_attesa and confirms transition", () => {
    const { result } = renderHook(() => useCandidateBoardState("modena"))
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
  })

  it("opens interview dialog on drag to colloquio and applies metadata on confirm", () => {
    const { result } = renderHook(() => useCandidateBoardState("modena"))
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
  })

  it("opens discard dialog on drag to scartati and confirms with reason", () => {
    const { result } = renderHook(() => useCandidateBoardState("modena"))
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
  })

  it("blocks discard confirmation when reason is 'other' and note is empty", () => {
    const { result } = renderHook(() => useCandidateBoardState("modena"))
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

  it("restores from scartati to discardReturnStatus and clears metadata", () => {
    const { result } = renderHook(() => useCandidateBoardState("modena"))
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
  })
})
