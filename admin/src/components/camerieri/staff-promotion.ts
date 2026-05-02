import type { Candidate } from "../../data/mockCandidates"
import { createCameriereInputFromCandidate } from "./mappers"
import { dispatchStaffListInvalidated } from "./staff-events"
import { upsertStaff } from "./staff-repository"

/**
 * Promuove candidato → riga `public.staff` (idempotenza su `source_candidate_id`).
 */
export async function promoteCandidateToCameriere(candidate: Candidate): Promise<void> {
  await upsertStaff(createCameriereInputFromCandidate(candidate))
  dispatchStaffListInvalidated()
}
