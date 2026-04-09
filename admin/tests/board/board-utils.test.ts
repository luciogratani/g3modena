import { beforeEach, describe, expect, it } from "vitest"
import {
  BOARD_STORAGE_KEY,
  collectDuplicateCandidateIds,
  createInitialBoardState,
  localStorageBoardAdapter,
  moveCandidateToStatus,
  type CandidateBoardState,
} from "../../src/components/candidati-board/board-utils"
import { CANDIDATES, type Candidate } from "../../src/data/mockCandidates"
import { installLocalStorageMock } from "./test-helpers"

function makeCandidate(
  id: string,
  status: Candidate["status"],
  overrides: Partial<Candidate> = {},
): Candidate {
  return {
    ...CANDIDATES[0],
    id,
    status,
    ...overrides,
  }
}

function countCandidateOccurrences(state: CandidateBoardState, candidateId: string): number {
  return Object.values(state.columns).reduce(
    (count, columnIds) => count + columnIds.filter((id) => id === candidateId).length,
    0,
  )
}

describe("board-utils", () => {
  beforeEach(() => {
    installLocalStorageMock()
  })

  it("clears postpone metadata when moving out from in_attesa", () => {
    const postponed = makeCandidate("candidate-postponed", "in_attesa", {
      postponedUntil: "2026-03-30",
      postponeReason: "Ricontattare a fine mese",
      postponeReturnStatus: "nuovo",
    })
    const state = createInitialBoardState([postponed])

    const nextState = moveCandidateToStatus(state, postponed.id, "nuovo")
    const nextCandidate = nextState.byId[postponed.id]

    expect(nextState.columns.in_attesa).not.toContain(postponed.id)
    expect(nextState.columns.nuovo).toContain(postponed.id)
    expect(nextCandidate.postponedUntil).toBeUndefined()
    expect(nextCandidate.postponeReason).toBeUndefined()
    expect(nextCandidate.postponeReturnStatus).toBeUndefined()
  })

  it("clears training sublane and prunes unused lanes outside formazione", () => {
    const inTraining = makeCandidate("candidate-training", "formazione", {
      trainingSublaneId: "training-teoria-2026-04-01",
      trainingPhase: "teoria",
      trainingScheduledDate: "2026-04-01",
    })
    const state: CandidateBoardState = {
      ...createInitialBoardState([inTraining]),
      trainingSublanes: [
        {
          id: "training-teoria-2026-04-01",
          type: "teoria",
          date: "2026-04-01",
          createdAt: "2026-03-01T10:00:00.000Z",
        },
      ],
    }

    const nextState = moveCandidateToStatus(state, inTraining.id, "colloquio")
    const nextCandidate = nextState.byId[inTraining.id]

    expect(nextState.columns.colloquio).toContain(inTraining.id)
    expect(nextCandidate.trainingSublaneId).toBeUndefined()
    expect(nextCandidate.trainingPhase).toBeUndefined()
    expect(nextCandidate.trainingScheduledDate).toBeUndefined()
    expect(nextState.trainingSublanes).toEqual([])
  })

  it("detects duplicate candidate ids across columns", () => {
    const candidate = makeCandidate("dup-1", "nuovo")
    const state: CandidateBoardState = {
      ...createInitialBoardState([candidate]),
      columns: {
        nuovo: ["dup-1"],
        colloquio: ["dup-1"],
        formazione: [],
        in_attesa: [],
        rimandati: [],
        archivio: [],
      },
    }

    expect(collectDuplicateCandidateIds(state.columns)).toEqual(["dup-1"])
  })

  it("rehydrates persisted board enforcing unique candidate ids", () => {
    const c1 = makeCandidate("c1", "nuovo")
    const c2 = makeCandidate("c2", "colloquio")
    const c3 = makeCandidate("c3", "nuovo")

    const persisted = {
      version: 3,
      columns: {
        nuovo: ["c1", "c2"],
        colloquio: ["c1"],
        formazione: [],
        in_attesa: [],
        rimandati: [],
        archivio: [],
      },
      byId: {
        c1: {
          interviewNote: "Persisted metadata",
        },
      },
      trainingSublanes: [],
    }

    window.localStorage.setItem(BOARD_STORAGE_KEY, JSON.stringify(persisted))
    const hydrated = localStorageBoardAdapter.load([c1, c2, c3])

    expect(hydrated).not.toBeNull()
    expect(hydrated!.byId.c1.interviewNote).toBe("Persisted metadata")
    expect(countCandidateOccurrences(hydrated!, "c1")).toBe(1)
    expect(hydrated!.columns.nuovo).toContain("c3")
  })
})
