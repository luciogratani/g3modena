import { describe, expect, it } from "vitest"
import { createInitialBoardState, type CandidateBoardState } from "../../src/components/candidati-board/board-utils"
import { CANDIDATES, type Candidate } from "../../src/data/mockCandidates"
import {
  applyTrainingSublaneToCandidate,
  ensureTrainingSublane,
  getTrainingDraftFromCandidate,
  pruneUnusedTrainingSublanes,
} from "../../src/components/candidati-board/workflow-utils"

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

describe("workflow-utils", () => {
  it("creates a training sublane once and reuses it", () => {
    const candidate = makeCandidate("candidate-1", "formazione")
    const state = createInitialBoardState([candidate])

    const first = ensureTrainingSublane(state, "teoria", "2026-04-10")
    const second = ensureTrainingSublane(first.nextState, "teoria", "2026-04-10")

    expect(first.lane.id).toBe("training-teoria-2026-04-10")
    expect(second.nextState.trainingSublanes).toHaveLength(1)
    expect(second.lane.id).toBe(first.lane.id)
  })

  it("applies sublane metadata to candidate", () => {
    const candidate = makeCandidate("candidate-apply", "formazione")
    const baseState = createInitialBoardState([candidate])
    const { nextState, lane } = ensureTrainingSublane(baseState, "pratica", "2026-05-12")

    const updated = applyTrainingSublaneToCandidate(nextState, candidate.id, lane.id)
    const updatedCandidate = updated.byId[candidate.id]

    expect(updatedCandidate.trainingSublaneId).toBe(lane.id)
    expect(updatedCandidate.trainingPhase).toBe("pratica")
    expect(updatedCandidate.trainingScheduledDate).toBe("2026-05-12")
    expect(updatedCandidate.trainingPracticeDate).toBe("2026-05-12")
  })

  it("clears candidate lane assignment and prunes empty sublanes", () => {
    const candidate = makeCandidate("candidate-clear", "formazione", {
      trainingSublaneId: "training-teoria-2026-06-01",
      trainingPhase: "teoria",
      trainingScheduledDate: "2026-06-01",
    })
    const state: CandidateBoardState = {
      ...createInitialBoardState([candidate]),
      trainingSublanes: [
        {
          id: "training-teoria-2026-06-01",
          type: "teoria",
          date: "2026-06-01",
          createdAt: "2026-03-01T10:00:00.000Z",
        },
      ],
    }

    const unassigned = applyTrainingSublaneToCandidate(state, candidate.id, null)
    const pruned = pruneUnusedTrainingSublanes(unassigned)

    expect(pruned.byId[candidate.id].trainingSublaneId).toBeUndefined()
    expect(pruned.trainingSublanes).toEqual([])
  })

  it("builds training draft from candidate legacy/new fields", () => {
    const candidate = makeCandidate("candidate-draft", "formazione", {
      trainingPhase: "pratica",
      trainingPracticeDate: "2026-07-15",
    })

    const draft = getTrainingDraftFromCandidate(candidate)
    expect(draft.phase).toBe("pratica")
    expect(draft.scheduledDate).toBe("2026-07-15")
  })
})
