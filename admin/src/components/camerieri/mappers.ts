import type { Candidate } from "@/src/data/mockCandidates"
import type { Cameriere, CameriereCreateInput, CameriereTag } from "./types"

export function getCameriereTagsFromCandidate(candidate: Candidate): CameriereTag[] {
  const tags: CameriereTag[] = []
  if (candidate.hasDrivingLicense) tags.push("automunito")
  if (candidate.hasExperience) tags.push("esperienza")
  if (candidate.languages.length > 1) tags.push("multilingue")
  if (candidate.isOffsiteStudent) tags.push("fuori_sede")
  return tags
}

export function createCameriereInputFromCandidate(candidate: Candidate): CameriereCreateInput {
  const pathFromColumn = candidate.profilePhotoStoragePath?.trim()
  const img = candidate.profileImage?.trim()
  const fallbackPath =
    img && !/^https?:\/\//i.test(img)
      ? img
      : undefined

  return {
    city: candidate.candidateCity,
    sourceCandidateId: candidate.id,
    firstName: candidate.firstName,
    lastName: candidate.lastName,
    avatarUrl: pathFromColumn || fallbackPath || undefined,
    email: candidate.email || undefined,
    phone: candidate.phone || undefined,
    isActive: true,
    tags: getCameriereTagsFromCandidate(candidate),
  }
}

export function toSearchableCameriereText(cameriere: Cameriere): string {
  return [
    cameriere.firstName,
    cameriere.lastName,
    cameriere.email ?? "",
    cameriere.phone ?? "",
    ...cameriere.tags,
  ]
    .join(" ")
    .toLowerCase()
}
