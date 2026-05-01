import type { SupabaseClient } from "@supabase/supabase-js"
import { describe, expect, it } from "vitest"
import {
  applyCareersPhotoSignedUrls,
  candidateToAdminWorkflow,
  isLikelySupabaseObjectSignedUrl,
  profileImageNeedsCareersPhotoSigning,
  rowToCandidate,
  type AdminWorkflowBlob,
  type CandidateRow,
} from "../../src/components/candidati-board/candidates-repository"
import type { Candidate } from "../../src/data/mockCandidates"

const baseRow: CandidateRow = {
  id: "11111111-1111-1111-1111-111111111111",
  city_id: "city-1",
  full_name: "Maria Rossi",
  email: "maria.rossi@email.it",
  phone: "+39 333 1234567",
  age: 24,
  residence_city: "Carpi",
  availability: "Immediata",
  education_level: "Diploma alberghiero",
  is_away_student: false,
  languages: ["Italiano", "Inglese B1"],
  has_driver_license: true,
  has_relevant_experience: true,
  plans_next_two_years: "Crescere nel settore.",
  job_attraction: "Lavoro in team.",
  profile_photo_path: "candidates/photo.jpg",
  cv_path: "candidates/cv.pdf",
  pipeline_stage: "nuovo",
  discard_reason_key: null,
  discard_reason_note: null,
  discarded_at: null,
  discard_return_status: null,
  admin_workflow: {},
  kanban_rank: 1000,
  created_at: "2026-03-08T10:30:00Z",
}

describe("candidates-repository — mapping", () => {
  it("maps DB row to Candidate splitting full_name and deriving birthYear", () => {
    const candidate = rowToCandidate(baseRow, "modena")
    expect(candidate.id).toBe(baseRow.id)
    expect(candidate.firstName).toBe("Maria")
    expect(candidate.lastName).toBe("Rossi")
    expect(candidate.candidateCity).toBe("modena")
    expect(candidate.email).toBe("maria.rossi@email.it")
    expect(candidate.languages).toEqual(["Italiano", "Inglese B1"])
    expect(candidate.status).toBe("nuovo")
    expect(candidate.kanbanRank).toBe(1000)
    expect(candidate.profileImage).toBe("candidates/photo.jpg")
    expect(candidate.profilePhotoStoragePath).toBe("candidates/photo.jpg")
    expect(candidate.educationTitle).toBe("Diploma alberghiero")
    expect(candidate.birthYear).toBe(new Date().getFullYear() - 24)
  })

  it("falls back to profile_photo_path when admin_workflow profileImage is blank", () => {
    const candidate = rowToCandidate(
      {
        ...baseRow,
        profile_photo_path: "u/id/profile-photo.jpg",
        admin_workflow: { profileImage: "" },
      },
      "modena",
    )
    expect(candidate.profileImage).toBe("u/id/profile-photo.jpg")
    expect(candidate.profilePhotoStoragePath).toBe("u/id/profile-photo.jpg")
  })

  it("prefers admin_workflow values over derived defaults", () => {
    const blob: AdminWorkflowBlob = {
      firstName: "M.",
      lastName: "R.",
      birthYear: 1995,
      educationTitle: "Master gestione",
      referralSource: "LinkedIn",
      profileImage: "https://example.com/avatar.png",
      score: 5,
      notes: "Profilo forte.",
      interviewDateTime: "2026-04-05T14:30",
      interviewNote: "Sala A",
    }
    const candidate = rowToCandidate({ ...baseRow, admin_workflow: blob }, "modena")
    expect(candidate.firstName).toBe("M.")
    expect(candidate.lastName).toBe("R.")
    expect(candidate.birthYear).toBe(1995)
    expect(candidate.educationTitle).toBe("Master gestione")
    expect(candidate.referralSource).toBe("LinkedIn")
    expect(candidate.profileImage).toBe("https://example.com/avatar.png")
    expect(candidate.profilePhotoStoragePath).toBe("candidates/photo.jpg")
    expect(candidate.score).toBe(5)
    expect(candidate.notes).toBe("Profilo forte.")
    expect(candidate.interviewDateTime).toBe("2026-04-05T14:30")
    expect(candidate.interviewNote).toBe("Sala A")
  })

  it("normalizes kanban_rank arriving as string from PostgREST numeric", () => {
    const candidate = rowToCandidate({ ...baseRow, kanban_rank: "2500" } as unknown as CandidateRow, "sassari")
    expect(candidate.kanbanRank).toBe(2500)
    expect(candidate.candidateCity).toBe("sassari")
  })

  it("candidateToAdminWorkflow includes only defined workflow fields", () => {
    const candidate: Candidate = {
      ...rowToCandidate(baseRow, "modena"),
      notes: "Da contattare",
      interviewDateTime: "2026-05-10T09:30",
      trainingPhase: "teoria",
      trainingScheduledDate: "2026-05-12",
      trainingSublaneId: "training-teoria-2026-05-12",
      postponedUntil: undefined,
      postponeReason: undefined,
    }
    const blob = candidateToAdminWorkflow(candidate)
    expect(blob.notes).toBe("Da contattare")
    expect(blob.interviewDateTime).toBe("2026-05-10T09:30")
    expect(blob.trainingPhase).toBe("teoria")
    expect(blob.trainingScheduledDate).toBe("2026-05-12")
    expect(blob.trainingSublaneId).toBe("training-teoria-2026-05-12")
    expect("postponedUntil" in blob).toBe(false)
    expect("postponeReason" in blob).toBe(false)
  })

  it("preserves discard canonical columns from row (not from blob)", () => {
    const candidate = rowToCandidate(
      {
        ...baseRow,
        pipeline_stage: "scartati",
        discard_reason_key: "no_show",
        discard_reason_note: "Non risponde",
        discarded_at: "2026-04-30T10:00:00.000Z",
        discard_return_status: "nuovo",
      },
      "modena",
    )
    expect(candidate.status).toBe("scartati")
    expect(candidate.discardReasonKey).toBe("no_show")
    expect(candidate.discardReasonNote).toBe("Non risponde")
    expect(candidate.discardedAt).toBe("2026-04-30T10:00:00.000Z")
    expect(candidate.discardReturnStatus).toBe("nuovo")
  })

  it("candidateToAdminWorkflow omits profileImage when it matches storage path (canonical column)", () => {
    const candidate = rowToCandidate(baseRow, "modena")
    const blob = candidateToAdminWorkflow(candidate)
    expect(blob.profileImage).toBeUndefined()
  })

  it("candidateToAdminWorkflow omits Supabase signed URLs from workflow JSON", () => {
    const signed =
      "https://proj.supabase.co/storage/v1/object/sign/careers-photos/u/p.jpg?token=abc"
    const candidate: Candidate = {
      ...rowToCandidate(baseRow, "modena"),
      profileImage: signed,
    }
    expect(candidateToAdminWorkflow(candidate).profileImage).toBeUndefined()
  })

  it("candidateToAdminWorkflow keeps a public https profile image override", () => {
    const candidate = rowToCandidate(
      {
        ...baseRow,
        admin_workflow: { profileImage: "https://cdn.example/face.png" },
      },
      "modena",
    )
    expect(candidateToAdminWorkflow(candidate).profileImage).toBe("https://cdn.example/face.png")
  })
})

describe("candidates-repository — profile photo signing helpers", () => {
  it("profileImageNeedsCareersPhotoSigning is false for http(s) and data URLs", () => {
    expect(profileImageNeedsCareersPhotoSigning("")).toBe(false)
    expect(profileImageNeedsCareersPhotoSigning("  ")).toBe(false)
    expect(profileImageNeedsCareersPhotoSigning("https://x/y")).toBe(false)
    expect(profileImageNeedsCareersPhotoSigning("http://x/y")).toBe(false)
    expect(profileImageNeedsCareersPhotoSigning("data:image/png;base64,abc")).toBe(false)
    expect(profileImageNeedsCareersPhotoSigning("cand/id/photo.jpg")).toBe(true)
  })

  it("isLikelySupabaseObjectSignedUrl matches sign path or token query", () => {
    expect(
      isLikelySupabaseObjectSignedUrl(
        "https://x.supabase.co/storage/v1/object/sign/bucket/k?token=t",
      ),
    ).toBe(true)
    expect(isLikelySupabaseObjectSignedUrl("https://images.example/i.jpg")).toBe(false)
  })

  it("applyCareersPhotoSignedUrls replaces storage keys with signed URLs", async () => {
    const client = {
      storage: {
        from: () => ({
          createSignedUrl: async (path: string) => ({
            data: { signedUrl: `https://signed.invalid/${path}?token=z` },
            error: null,
          }),
        }),
      },
    } as unknown as SupabaseClient

    const mapped = [
      rowToCandidate({ ...baseRow, profile_photo_path: "u/photo.webp", admin_workflow: {} }, "modena"),
    ]
    const out = await applyCareersPhotoSignedUrls(client, mapped)
    expect(out[0].profileImage).toBe("https://signed.invalid/u/photo.webp?token=z")
    expect(out[0].profilePhotoStoragePath).toBe("u/photo.webp")
    expect(candidateToAdminWorkflow(out[0]).profileImage).toBeUndefined()
  })
})
