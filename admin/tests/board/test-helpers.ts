import {
  candidateToAdminWorkflow,
  rowToCandidate,
  type AdminWorkflowBlob,
  type CandidateRow,
  type CandidateUpdate,
  type CandidatesRepository,
} from "../../src/components/candidati-board/candidates-repository"
import { KANBAN_RANK_STEP } from "../../src/components/candidati-board/board-utils"
import type { Candidate, CandidateStatus } from "../../src/data/mockCandidates"

export function installLocalStorageMock() {
  const storage = new Map<string, string>()
  const mockLocalStorage: Storage = {
    get length() {
      return storage.size
    },
    clear() {
      storage.clear()
    },
    getItem(key: string) {
      return storage.get(key) ?? null
    },
    key(index: number) {
      return [...storage.keys()][index] ?? null
    },
    removeItem(key: string) {
      storage.delete(key)
    },
    setItem(key: string, value: string) {
      storage.set(key, value)
    },
  }

  Object.defineProperty(window, "localStorage", { value: mockLocalStorage, configurable: true })
  Object.defineProperty(globalThis, "localStorage", { value: mockLocalStorage, configurable: true })
}

type StoredCandidate = {
  row: CandidateRow
  citySlug: string
}

/**
 * Repository in-memory per i test della board.
 *
 * - mantiene una mappa id -> riga simulata (city_id derivato da citySlug);
 * - emette `Candidate[]` ordinati per (pipeline_stage, kanban_rank);
 * - registra ogni `updateCandidate`/`deleteCandidate` per asserzioni di
 *   sincronizzazione lato test.
 */
export class InMemoryCandidatesRepository implements CandidatesRepository {
  private rows = new Map<string, StoredCandidate>()
  public updates: Array<{ id: string; update: CandidateUpdate }> = []
  public deletes: string[] = []

  constructor(seed: Candidate[] = []) {
    seed.forEach((candidate, index) => {
      this.rows.set(candidate.id, {
        citySlug: candidate.candidateCity || "modena",
        row: this.candidateToRow(candidate, index),
      })
    })
  }

  async listByCity(citySlug: string): Promise<Candidate[]> {
    const rows = [...this.rows.values()]
      .filter((entry) => entry.citySlug === citySlug)
      .map((entry) => entry.row)
      .sort((a, b) => {
        if (a.pipeline_stage !== b.pipeline_stage) {
          return a.pipeline_stage.localeCompare(b.pipeline_stage)
        }
        const aRank = Number(a.kanban_rank)
        const bRank = Number(b.kanban_rank)
        return aRank - bRank
      })
    return rows.map((row) => rowToCandidate(row, citySlug))
  }

  async updateCandidate(id: string, update: CandidateUpdate): Promise<void> {
    this.updates.push({ id, update })
    const entry = this.rows.get(id)
    if (!entry) return
    const next: CandidateRow = { ...entry.row }
    if (update.pipelineStage !== undefined) next.pipeline_stage = update.pipelineStage
    if (update.kanbanRank !== undefined) next.kanban_rank = update.kanbanRank
    if (update.discardReasonKey !== undefined) next.discard_reason_key = update.discardReasonKey
    if (update.discardReasonNote !== undefined) next.discard_reason_note = update.discardReasonNote
    if (update.discardedAt !== undefined) next.discarded_at = update.discardedAt
    if (update.discardReturnStatus !== undefined) next.discard_return_status = update.discardReturnStatus
    if (update.adminWorkflow !== undefined) next.admin_workflow = update.adminWorkflow as AdminWorkflowBlob
    this.rows.set(id, { ...entry, row: next })
  }

  async deleteCandidate(id: string): Promise<void> {
    this.deletes.push(id)
    this.rows.delete(id)
  }

  async countNewByCity(activeSlugs: string[]): Promise<Record<string, number>> {
    const counts: Record<string, number> = Object.fromEntries(activeSlugs.map((slug) => [slug, 0]))
    for (const entry of this.rows.values()) {
      if (entry.row.pipeline_stage !== "nuovo") continue
      if (typeof counts[entry.citySlug] === "number") counts[entry.citySlug] += 1
    }
    return counts
  }

  private candidateToRow(candidate: Candidate, index: number): CandidateRow {
    return {
      id: candidate.id,
      city_id: `city-${candidate.candidateCity || "modena"}`,
      full_name: `${candidate.firstName ?? ""} ${candidate.lastName ?? ""}`.trim() || candidate.id,
      email: candidate.email,
      phone: candidate.phone,
      age: typeof candidate.birthYear === "number" && candidate.birthYear > 0
        ? new Date().getFullYear() - candidate.birthYear
        : null,
      residence_city: candidate.residenceCity,
      availability: candidate.availability,
      education_level: candidate.educationTitle,
      is_away_student: candidate.isOffsiteStudent,
      languages: candidate.languages,
      has_driver_license: candidate.hasDrivingLicense,
      has_relevant_experience: candidate.hasExperience,
      plans_next_two_years: candidate.futurePlans || null,
      job_attraction: candidate.jobAttraction || null,
      profile_photo_path: candidate.profileImage || null,
      cv_path: null,
      pipeline_stage: candidate.status as CandidateStatus,
      discard_reason_key: candidate.discardReasonKey ?? null,
      discard_reason_note: candidate.discardReasonNote ?? null,
      discarded_at: candidate.discardedAt ?? null,
      discard_return_status: candidate.discardReturnStatus ?? null,
      admin_workflow: candidateToAdminWorkflow(candidate),
      kanban_rank: candidate.kanbanRank ?? (index + 1) * KANBAN_RANK_STEP,
      created_at: candidate.created_at,
    }
  }
}
