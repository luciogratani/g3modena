/**
 * Candidates repository — adapter Supabase per la board admin.
 *
 * Sostituisce il blob `localStorage` (gate E4 / L5): la sorgente condivisa
 * della board e' `public.candidates`, con `pipeline_stage` + colonne
 * discard come canoniche, `kanban_rank numeric` per l'ordinamento dentro
 * (city_id, pipeline_stage), e `admin_workflow jsonb` come snapshot UI
 * non normalizzato (note, interview/training/postpone metadata, sub-lane,
 * score, ecc.).
 *
 * Il modulo espone:
 *  - tipo `CandidatesRepository` iniettabile (per test in-memory);
 *  - implementazione default `supabaseCandidatesRepository` legata al
 *    client autenticato di `admin/src/lib/supabase.ts`;
 *  - mapper `rowToCandidate` / `candidateToAdminWorkflow` che gestiscono
 *    snake/camel + flatten del blob;
 *  - helper `computeMidpointRank` per calcolare la rank di un drop
 *    (strategia midpoint float, vedi migrazione `0150`).
 */
import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js"
import { hasSupabaseConfig, supabase } from "../../lib/supabase"
import { CITIES_UPDATED_EVENT, loadCities } from "../cities/storage"
import type {
  Candidate,
  CandidateStatus,
  DiscardReasonKey,
  DiscardReturnStatus,
  InterviewAvailability,
  InterviewOutcome,
  PostponeReturnStatus,
  TrainingSublaneType,
  TrainingTrack,
} from "../../data/mockCandidates"

export { computeMidpointRank, KANBAN_RANK_FIRST, KANBAN_RANK_STEP } from "./board-utils"

/** Bucket allegati foto L1 / admin (privato; la board usa URL firmati in memoria). */
export const CAREERS_PHOTOS_BUCKET = "careers-photos"

const PROFILE_PHOTO_SIGNED_URL_TTL_SEC = 3600

/** URL assoluto navigabile (pubblico o gia' firmato): non va passato a `createSignedUrl`. */
export function profileImageNeedsCareersPhotoSigning(image: string): boolean {
  const trimmed = image.trim()
  if (!trimmed) return false
  if (trimmed.startsWith("data:")) return false
  return !/^https?:\/\//i.test(trimmed)
}

/** Heuristica per non serializzare in `admin_workflow` URL firmati Supabase (scadono). */
export function isLikelySupabaseObjectSignedUrl(url: string): boolean {
  return (
    /^https?:\/\//i.test(url) &&
    (/[?&]token=/.test(url) || /\/storage\/v1\/object\/sign\//.test(url))
  )
}

function shouldOmitProfileImageFromAdminBlob(candidate: Candidate): boolean {
  const pi = candidate.profileImage
  if (!pi) return false
  if (isLikelySupabaseObjectSignedUrl(pi)) return true
  const storagePath = candidate.profilePhotoStoragePath
  if (storagePath != null && storagePath !== "" && pi === storagePath) return true
  return false
}

export type AdminWorkflowBlob = {
  firstName?: string
  lastName?: string
  birthYear?: number
  educationTitle?: string
  referralSource?: string
  profileImage?: string
  interviewAvailability?: InterviewAvailability
  score?: number
  notes?: string
  interviewDateTime?: string
  interviewNote?: string
  interviewOutcome?: InterviewOutcome
  trainingTrack?: TrainingTrack
  trainingPhase?: TrainingSublaneType
  trainingScheduledDate?: string
  trainingTheoryDate?: string
  trainingPracticeDate?: string
  trainingTheoryCompleted?: boolean
  trainingPracticeCompleted?: boolean
  trainingNote?: string
  trainingSublaneId?: string
  trainingStartDate?: string
  trainingEndDate?: string
  postponedUntil?: string
  postponeReason?: string
  postponeReturnStatus?: PostponeReturnStatus
}

export type CandidateRow = {
  id: string
  city_id: string
  full_name: string
  email: string
  phone: string
  age: number | null
  residence_city: string
  availability: string
  education_level: string
  is_away_student: boolean
  languages: string[] | null
  has_driver_license: boolean
  has_relevant_experience: boolean
  plans_next_two_years: string | null
  job_attraction: string | null
  profile_photo_path: string | null
  cv_path: string | null
  pipeline_stage: CandidateStatus
  discard_reason_key: DiscardReasonKey | null
  discard_reason_note: string | null
  discarded_at: string | null
  discard_return_status: DiscardReturnStatus | null
  admin_workflow: AdminWorkflowBlob | null
  kanban_rank: number | string
  created_at: string
}

export type CandidateUpdate = {
  pipelineStage?: CandidateStatus
  kanbanRank?: number
  discardReasonKey?: DiscardReasonKey | null
  discardReasonNote?: string | null
  discardedAt?: string | null
  discardReturnStatus?: DiscardReturnStatus | null
  adminWorkflow?: AdminWorkflowBlob
}

export interface CandidatesRepository {
  listByCity(citySlug: string): Promise<Candidate[]>
  updateCandidate(id: string, update: CandidateUpdate): Promise<void>
  deleteCandidate(id: string): Promise<void>
  countNewByCity(activeSlugs: string[]): Promise<Record<string, number>>
}

const CANDIDATE_COLUMNS = [
  "id",
  "city_id",
  "full_name",
  "email",
  "phone",
  "age",
  "residence_city",
  "availability",
  "education_level",
  "is_away_student",
  "languages",
  "has_driver_license",
  "has_relevant_experience",
  "plans_next_two_years",
  "job_attraction",
  "profile_photo_path",
  "cv_path",
  "pipeline_stage",
  "discard_reason_key",
  "discard_reason_note",
  "discarded_at",
  "discard_return_status",
  "admin_workflow",
  "kanban_rank",
  "created_at",
].join(", ")

let slugToIdCache: Map<string, string> | null = null
let idToSlugCache: Map<string, string> | null = null

if (typeof window !== "undefined") {
  window.addEventListener(CITIES_UPDATED_EVENT, () => {
    slugToIdCache = null
    idToSlugCache = null
  })
}

export function clearCandidatesCityCache(): void {
  slugToIdCache = null
  idToSlugCache = null
}

async function getCityCache(): Promise<{
  slugToId: Map<string, string>
  idToSlug: Map<string, string>
}> {
  if (slugToIdCache && idToSlugCache) {
    return { slugToId: slugToIdCache, idToSlug: idToSlugCache }
  }
  const cities = await loadCities()
  const slugToId = new Map<string, string>()
  const idToSlug = new Map<string, string>()
  for (const city of cities) {
    slugToId.set(city.slug, city.id)
    idToSlug.set(city.id, city.slug)
  }
  slugToIdCache = slugToId
  idToSlugCache = idToSlug
  return { slugToId, idToSlug }
}

function getSupabaseClient() {
  if (!hasSupabaseConfig || !supabase) {
    throw new Error(
      "Supabase admin non configurato. Verifica VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.",
    )
  }
  return supabase
}

function toCandidateError(error: PostgrestError, fallback: string): Error {
  if (error.code === "23514") {
    return new Error("Aggiornamento candidato rifiutato: vincolo DB non rispettato.")
  }
  return new Error(error.message || fallback)
}

function parseNumeric(value: number | string | null | undefined): number {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const trimmed = (fullName ?? "").trim()
  if (!trimmed) return { firstName: "", lastName: "" }
  const parts = trimmed.split(/\s+/)
  if (parts.length === 1) return { firstName: parts[0], lastName: "" }
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  }
}

function ageToBirthYear(age: number | null | undefined): number {
  if (typeof age !== "number" || !Number.isFinite(age)) return 0
  const currentYear = new Date().getFullYear()
  return currentYear - age
}

function profileImageFromRow(blob: AdminWorkflowBlob, profilePhotoPath: string | null): string {
  const fromBlob = blob.profileImage
  if (typeof fromBlob === "string" && fromBlob.trim() !== "") return fromBlob.trim()
  return profilePhotoPath ?? ""
}

export function rowToCandidate(row: CandidateRow, citySlug: string): Candidate {
  const blob = row.admin_workflow ?? {}
  const { firstName, lastName } = blob.firstName || blob.lastName
    ? { firstName: blob.firstName ?? "", lastName: blob.lastName ?? "" }
    : splitFullName(row.full_name)

  return {
    id: row.id,
    created_at: row.created_at,
    firstName,
    lastName,
    candidateCity: citySlug,
    profileImage: profileImageFromRow(blob, row.profile_photo_path),
    profilePhotoStoragePath: row.profile_photo_path ?? null,
    email: row.email,
    phone: row.phone,
    birthYear: blob.birthYear ?? ageToBirthYear(row.age),
    educationTitle: blob.educationTitle ?? row.education_level,
    residenceCity: row.residence_city,
    isOffsiteStudent: row.is_away_student,
    referralSource: blob.referralSource ?? "",
    languages: row.languages ?? [],
    hasDrivingLicense: row.has_driver_license,
    hasExperience: row.has_relevant_experience,
    futurePlans: row.plans_next_two_years ?? "",
    jobAttraction: row.job_attraction ?? "",
    interviewAvailability: blob.interviewAvailability ?? "mattina",
    availability: row.availability,
    status: row.pipeline_stage,
    score: blob.score ?? 0,
    notes: blob.notes,
    interviewDateTime: blob.interviewDateTime,
    interviewNote: blob.interviewNote,
    interviewOutcome: blob.interviewOutcome,
    trainingTrack: blob.trainingTrack,
    trainingPhase: blob.trainingPhase,
    trainingScheduledDate: blob.trainingScheduledDate,
    trainingTheoryDate: blob.trainingTheoryDate,
    trainingPracticeDate: blob.trainingPracticeDate,
    trainingTheoryCompleted: blob.trainingTheoryCompleted,
    trainingPracticeCompleted: blob.trainingPracticeCompleted,
    trainingNote: blob.trainingNote,
    trainingSublaneId: blob.trainingSublaneId,
    trainingStartDate: blob.trainingStartDate,
    trainingEndDate: blob.trainingEndDate,
    postponedUntil: blob.postponedUntil,
    postponeReason: blob.postponeReason,
    postponeReturnStatus: blob.postponeReturnStatus,
    discardReasonKey: row.discard_reason_key ?? undefined,
    discardReasonNote: row.discard_reason_note ?? undefined,
    discardedAt: row.discarded_at ?? undefined,
    discardReturnStatus: row.discard_return_status ?? undefined,
    kanbanRank: parseNumeric(row.kanban_rank),
  }
}

export function candidateToAdminWorkflow(candidate: Candidate): AdminWorkflowBlob {
  const blob: AdminWorkflowBlob = {}
  if (candidate.firstName) blob.firstName = candidate.firstName
  if (candidate.lastName) blob.lastName = candidate.lastName
  if (candidate.birthYear) blob.birthYear = candidate.birthYear
  if (candidate.educationTitle) blob.educationTitle = candidate.educationTitle
  if (candidate.referralSource) blob.referralSource = candidate.referralSource
  if (candidate.profileImage && !shouldOmitProfileImageFromAdminBlob(candidate)) {
    blob.profileImage = candidate.profileImage
  }
  if (candidate.interviewAvailability) blob.interviewAvailability = candidate.interviewAvailability
  if (typeof candidate.score === "number") blob.score = candidate.score
  if (candidate.notes !== undefined) blob.notes = candidate.notes
  if (candidate.interviewDateTime !== undefined) blob.interviewDateTime = candidate.interviewDateTime
  if (candidate.interviewNote !== undefined) blob.interviewNote = candidate.interviewNote
  if (candidate.interviewOutcome !== undefined) blob.interviewOutcome = candidate.interviewOutcome
  if (candidate.trainingTrack !== undefined) blob.trainingTrack = candidate.trainingTrack
  if (candidate.trainingPhase !== undefined) blob.trainingPhase = candidate.trainingPhase
  if (candidate.trainingScheduledDate !== undefined) blob.trainingScheduledDate = candidate.trainingScheduledDate
  if (candidate.trainingTheoryDate !== undefined) blob.trainingTheoryDate = candidate.trainingTheoryDate
  if (candidate.trainingPracticeDate !== undefined) blob.trainingPracticeDate = candidate.trainingPracticeDate
  if (candidate.trainingTheoryCompleted !== undefined) blob.trainingTheoryCompleted = candidate.trainingTheoryCompleted
  if (candidate.trainingPracticeCompleted !== undefined) blob.trainingPracticeCompleted = candidate.trainingPracticeCompleted
  if (candidate.trainingNote !== undefined) blob.trainingNote = candidate.trainingNote
  if (candidate.trainingSublaneId !== undefined) blob.trainingSublaneId = candidate.trainingSublaneId
  if (candidate.trainingStartDate !== undefined) blob.trainingStartDate = candidate.trainingStartDate
  if (candidate.trainingEndDate !== undefined) blob.trainingEndDate = candidate.trainingEndDate
  if (candidate.postponedUntil !== undefined) blob.postponedUntil = candidate.postponedUntil
  if (candidate.postponeReason !== undefined) blob.postponeReason = candidate.postponeReason
  if (candidate.postponeReturnStatus !== undefined) blob.postponeReturnStatus = candidate.postponeReturnStatus
  return blob
}

export async function applyCareersPhotoSignedUrls(
  client: SupabaseClient,
  candidates: Candidate[],
): Promise<Candidate[]> {
  return Promise.all(
    candidates.map(async (candidate) => {
      if (!profileImageNeedsCareersPhotoSigning(candidate.profileImage)) {
        return candidate
      }
      const path = candidate.profileImage.trim()
      const { data, error } = await client.storage
        .from(CAREERS_PHOTOS_BUCKET)
        .createSignedUrl(path, PROFILE_PHOTO_SIGNED_URL_TTL_SEC)
      if (error || !data?.signedUrl) return candidate
      return { ...candidate, profileImage: data.signedUrl }
    }),
  )
}

async function listByCity(citySlug: string): Promise<Candidate[]> {
  const client = getSupabaseClient()
  const { slugToId } = await getCityCache()
  const cityId = slugToId.get(citySlug)
  if (!cityId) return []

  const { data, error } = await client
    .from("candidates")
    .select(CANDIDATE_COLUMNS)
    .eq("city_id", cityId)
    .order("pipeline_stage", { ascending: true })
    .order("kanban_rank", { ascending: true })

  if (error) throw toCandidateError(error, "Impossibile caricare i candidati.")
  const rows = (data ?? []) as unknown as CandidateRow[]
  const mapped = rows.map((row) => rowToCandidate(row, citySlug))
  return applyCareersPhotoSignedUrls(client, mapped)
}

async function updateCandidate(id: string, update: CandidateUpdate): Promise<void> {
  const payload: Record<string, unknown> = {}
  if (update.pipelineStage !== undefined) payload.pipeline_stage = update.pipelineStage
  if (update.kanbanRank !== undefined) payload.kanban_rank = update.kanbanRank
  if (update.discardReasonKey !== undefined) payload.discard_reason_key = update.discardReasonKey
  if (update.discardReasonNote !== undefined) payload.discard_reason_note = update.discardReasonNote
  if (update.discardedAt !== undefined) payload.discarded_at = update.discardedAt
  if (update.discardReturnStatus !== undefined) payload.discard_return_status = update.discardReturnStatus
  if (update.adminWorkflow !== undefined) payload.admin_workflow = update.adminWorkflow

  if (Object.keys(payload).length === 0) return

  const client = getSupabaseClient()
  const { error } = await client.from("candidates").update(payload).eq("id", id)
  if (error) throw toCandidateError(error, "Impossibile aggiornare il candidato.")
}

async function deleteCandidate(id: string): Promise<void> {
  const client = getSupabaseClient()
  const { error } = await client.from("candidates").delete().eq("id", id)
  if (error) throw toCandidateError(error, "Impossibile eliminare il candidato.")
}

async function countNewByCity(activeSlugs: string[]): Promise<Record<string, number>> {
  const counts: Record<string, number> = Object.fromEntries(activeSlugs.map((slug) => [slug, 0]))
  if (activeSlugs.length === 0) return counts

  const { slugToId, idToSlug } = await getCityCache()
  const ids = activeSlugs
    .map((slug) => slugToId.get(slug))
    .filter((value): value is string => Boolean(value))
  if (ids.length === 0) return counts

  // PostgREST non supporta GROUP BY: prendiamo i city_id delle righe
  // `pipeline_stage='nuovo'` per le sedi attive e contiamo client-side.
  // Per le grandezze di team realistiche (decine/centinaia di righe) e'
  // accettabile; eventuale RPC aggregato resta evolutivo.
  const client = getSupabaseClient()
  const { data, error } = await client
    .from("candidates")
    .select("city_id")
    .eq("pipeline_stage", "nuovo")
    .in("city_id", ids)

  if (error) throw toCandidateError(error, "Impossibile contare le candidature nuove.")

  for (const row of (data ?? []) as { city_id: string }[]) {
    const slug = idToSlug.get(row.city_id)
    if (slug && typeof counts[slug] === "number") counts[slug] += 1
  }
  return counts
}

export const supabaseCandidatesRepository: CandidatesRepository = {
  listByCity,
  updateCandidate,
  deleteCandidate,
  countNewByCity,
}

export async function listCandidatesByCity(citySlug: string): Promise<Candidate[]> {
  return supabaseCandidatesRepository.listByCity(citySlug)
}

export async function updateCandidateRow(id: string, update: CandidateUpdate): Promise<void> {
  return supabaseCandidatesRepository.updateCandidate(id, update)
}

export async function deleteCandidateRow(id: string): Promise<void> {
  return supabaseCandidatesRepository.deleteCandidate(id)
}

export async function countNewCandidatesByCity(activeSlugs: string[]): Promise<Record<string, number>> {
  return supabaseCandidatesRepository.countNewByCity(activeSlugs)
}
