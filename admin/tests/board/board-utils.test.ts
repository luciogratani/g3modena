import { describe, expect, it } from "vitest"
import {
  collectDuplicateCandidateIds,
  computeMidpointRank,
  createBoardStateFromRepoRows,
  createInitialBoardState,
  KANBAN_RANK_FIRST,
  KANBAN_RANK_STEP,
  moveCandidate,
  moveCandidateToStatus,
  type CandidateBoardState,
} from "../../src/components/candidati-board/board-utils"
import { CANDIDATES, type Candidate } from "../../src/data/mockCandidates"

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

describe("board-utils — pure transitions", () => {
  it("clears postpone metadata when moving out from in_attesa", () => {
    const postponed = makeCandidate("candidate-postponed", "in_attesa", {
      postponedUntil: "2026-03-30",
      postponeReason: "Ricontattare a fine mese",
      postponeReturnStatus: "nuovo",
      kanbanRank: 1000,
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
      kanbanRank: 1000,
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
        scartati: [],
        rimandati: [],
        archivio: [],
      },
    }

    expect(collectDuplicateCandidateIds(state.columns)).toEqual(["dup-1"])
  })

  it("clears discard metadata when moving out from scartati", () => {
    const discarded = makeCandidate("candidate-discarded", "scartati", {
      discardReasonKey: "not_a_fit",
      discardReasonNote: "Profilo non in linea",
      discardedAt: "2026-04-30T10:00:00.000Z",
      discardReturnStatus: "colloquio",
      kanbanRank: 1000,
    })
    const state = createInitialBoardState([discarded])

    const nextState = moveCandidateToStatus(state, discarded.id, "nuovo")
    const nextCandidate = nextState.byId[discarded.id]

    expect(nextState.columns.scartati).not.toContain(discarded.id)
    expect(nextState.columns.nuovo).toContain(discarded.id)
    expect(nextCandidate.discardReasonKey).toBeUndefined()
    expect(nextCandidate.discardReasonNote).toBeUndefined()
    expect(nextCandidate.discardedAt).toBeUndefined()
    expect(nextCandidate.discardReturnStatus).toBeUndefined()
  })

  it("preserves discard metadata while still in scartati", () => {
    const discarded = makeCandidate("candidate-discarded", "scartati", {
      discardReasonKey: "no_show",
      discardReasonNote: "Non si e' presentato/a",
      discardedAt: "2026-04-30T10:00:00.000Z",
      discardReturnStatus: "nuovo",
      kanbanRank: 1000,
    })
    const state = createInitialBoardState([discarded])

    const nextState = moveCandidateToStatus(state, discarded.id, "scartati")
    const nextCandidate = nextState.byId[discarded.id]

    expect(nextState.columns.scartati).toContain(discarded.id)
    expect(nextCandidate.discardReasonKey).toBe("no_show")
    expect(nextCandidate.discardReasonNote).toBe("Non si e' presentato/a")
    expect(nextCandidate.discardedAt).toBe("2026-04-30T10:00:00.000Z")
    expect(nextCandidate.discardReturnStatus).toBe("nuovo")
  })

  it("clears discard metadata when archiving from scartati", () => {
    const discarded = makeCandidate("candidate-discarded", "scartati", {
      discardReasonKey: "duplicate",
      discardedAt: "2026-04-30T10:00:00.000Z",
      discardReturnStatus: "nuovo",
      kanbanRank: 1000,
    })
    const state = createInitialBoardState([discarded])

    const nextState = moveCandidateToStatus(state, discarded.id, "archivio")
    const nextCandidate = nextState.byId[discarded.id]

    expect(nextState.columns.archivio).toContain(discarded.id)
    expect(nextCandidate.discardReasonKey).toBeUndefined()
    expect(nextCandidate.discardedAt).toBeUndefined()
    expect(nextCandidate.discardReturnStatus).toBeUndefined()
  })

  it("clears training sublane assignment when discarding from formazione", () => {
    const inTraining = makeCandidate("candidate-training", "formazione", {
      trainingSublaneId: "training-teoria-2026-04-01",
      trainingPhase: "teoria",
      trainingScheduledDate: "2026-04-01",
      kanbanRank: 1000,
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

    const nextState = moveCandidateToStatus(state, inTraining.id, "scartati")
    const nextCandidate = nextState.byId[inTraining.id]

    expect(nextState.columns.scartati).toContain(inTraining.id)
    expect(nextCandidate.trainingSublaneId).toBeUndefined()
    expect(nextCandidate.trainingPhase).toBeUndefined()
    expect(nextState.trainingSublanes).toEqual([])
  })
})

describe("board-utils — kanban rank", () => {
  it("computeMidpointRank: empty column returns FIRST", () => {
    expect(computeMidpointRank(null, null)).toBe(KANBAN_RANK_FIRST)
  })

  it("computeMidpointRank: append to tail returns prev + STEP", () => {
    expect(computeMidpointRank(2000, null)).toBe(2000 + KANBAN_RANK_STEP)
  })

  it("computeMidpointRank: drop at head halves next", () => {
    expect(computeMidpointRank(null, 1000)).toBe(500)
  })

  it("computeMidpointRank: midpoint between neighbors", () => {
    expect(computeMidpointRank(1000, 2000)).toBe(1500)
  })

  it("moveCandidate intra-column reorder updates kanbanRank", () => {
    const a = makeCandidate("a", "nuovo", { kanbanRank: 1000 })
    const b = makeCandidate("b", "nuovo", { kanbanRank: 2000 })
    const c = makeCandidate("c", "nuovo", { kanbanRank: 3000 })
    const state = createInitialBoardState([a, b, c])

    // move c (rank 3000) to position of a (top): c should land before a, with rank 500
    const nextState = moveCandidate(state, "c", "a")
    expect(nextState.columns.nuovo).toEqual(["c", "a", "b"])
    expect(nextState.byId["c"].kanbanRank).toBe(500)
  })

  it("moveCandidateToStatus appends to target column with rank prev+STEP", () => {
    const a = makeCandidate("a", "nuovo", { kanbanRank: 1000 })
    const b = makeCandidate("b", "colloquio", { kanbanRank: 5000 })
    const state = createInitialBoardState([a, b])

    const nextState = moveCandidateToStatus(state, "a", "colloquio")
    expect(nextState.columns.colloquio).toEqual(["b", "a"])
    expect(nextState.byId["a"].kanbanRank).toBe(5000 + KANBAN_RANK_STEP)
  })

  it("createBoardStateFromRepoRows preserves rank ordering inside each column", () => {
    const rows = [
      makeCandidate("c1", "nuovo", { kanbanRank: 3000 }),
      makeCandidate("c2", "nuovo", { kanbanRank: 1000 }),
      makeCandidate("c3", "nuovo", { kanbanRank: 2000 }),
    ]
    // Repo returns rows already ORDER BY rank ASC, so we feed sorted input here:
    const sortedRows = [...rows].sort((a, b) => (a.kanbanRank ?? 0) - (b.kanbanRank ?? 0))
    const state = createBoardStateFromRepoRows(sortedRows)
    expect(state.columns.nuovo).toEqual(["c2", "c3", "c1"])
  })
})
