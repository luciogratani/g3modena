/**
 * Migrazione **una tantum** da `admin:camerieri:crm:v1` (legacy localStorage)
 * verso `public.staff`.
 *
 * - Eseguite solo in browser dopo login configurato (`hasSupabaseConfig`).
 * - Marca `{@link LOCAL_DRAINED_KEY}` dopo successo (anche se non c'era nulla da importare).
 * - Rimuove la chiave legacy solo se tutte le righe importate senza errore atomico batch.
 * - `source_candidate_id` viene incluso solo se sembra UUID (riga candidates); FK fallita ⇒ retry senza FK.
 *
 * Override manuale: cancellare `admin:camerieri:v1-local-drained-at` da localStorage
 * solo se vuoi re-scansionare uno snapshot legacy salvato prima di svuotare la chiave.
 */
import type { CandidateCity } from "../../data/mockCandidates"
import { hasSupabaseConfig } from "../../lib/supabase"
import type { Cameriere } from "./types"
import { dispatchStaffListInvalidated } from "./staff-events"
import { upsertStaff } from "./staff-repository"

const LEGACY_CAMERIERI_STORAGE_KEY = "admin:camerieri:crm:v1"
export const LOCAL_CAMERIERI_DRAINED_MARKER_KEY = "admin:camerieri:v1-local-drained-at"

type SerializedCamerieriV1 = {
  version: 1
  byCity: Record<CandidateCity, Cameriere[]>
}

function createEmptyCityBuckets(): Record<CandidateCity, Cameriere[]> {
  return { modena: [], sassari: [] }
}

function sanitizeCameriere(raw: unknown): Cameriere | null {
  if (!raw || typeof raw !== "object") return null
  const item = raw as Partial<Cameriere>
  if (item.city !== "modena" && item.city !== "sassari") return null
  if (typeof item.id !== "string" || !item.id.trim()) return null
  if (typeof item.firstName !== "string" || !item.firstName.trim()) return null
  if (typeof item.lastName !== "string" || !item.lastName.trim()) return null
  if (typeof item.createdAt !== "string" || !item.createdAt.trim()) return null
  if (typeof item.updatedAt !== "string" || !item.updatedAt.trim()) return null
  return {
    id: item.id,
    sourceCandidateId:
      typeof item.sourceCandidateId === "string" && item.sourceCandidateId.trim()
        ? item.sourceCandidateId
        : undefined,
    city: item.city,
    firstName: item.firstName.trim(),
    lastName: item.lastName.trim(),
    avatarUrl: typeof item.avatarUrl === "string" && item.avatarUrl.trim() ? item.avatarUrl : undefined,
    email: typeof item.email === "string" && item.email.trim() ? item.email : undefined,
    phone: typeof item.phone === "string" && item.phone.trim() ? item.phone : undefined,
    isActive: typeof item.isActive === "boolean" ? item.isActive : true,
    tags: Array.isArray(item.tags) ? item.tags.filter((tag): tag is Cameriere["tags"][number] => typeof tag === "string") : [],
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }
}

function parseLegacyBuckets(rawValue: string | null): Record<CandidateCity, Cameriere[]> {
  const empty = createEmptyCityBuckets()
  if (!rawValue) return empty
  try {
    const parsed = JSON.parse(rawValue) as Partial<SerializedCamerieriV1>
    if (parsed.version !== 1 || !parsed.byCity) return empty

    const byCity = createEmptyCityBuckets()
    for (const city of ["modena", "sassari"] as const) {
      const list = Array.isArray(parsed.byCity[city]) ? parsed.byCity[city] : []
      const seenIds = new Set<string>()
      byCity[city] = list
        .map(sanitizeCameriere)
        .filter((item): item is Cameriere => Boolean(item))
        .filter((item) => {
          if (seenIds.has(item.id)) return false
          seenIds.add(item.id)
          return true
        })
    }
    return byCity
  } catch {
    return empty
  }
}

/** Heuristica UUID usata come `public.candidates.id`. */
export function looksLikeCandidatesRowUuid(raw: string | undefined): boolean {
  const t = raw?.trim() ?? ""
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(t)
}

function isLikelyFkViolation(error: unknown): boolean {
  const s = String(error instanceof Error ? error.message : error)
  return /\b23503\b/i.test(s) || /violates foreign key/i.test(s) || /foreign key constraint/i.test(s)
}

async function migrateOneCameriere(row: Cameriere): Promise<void> {
  const source =
    looksLikeCandidatesRowUuid(row.sourceCandidateId) ? row.sourceCandidateId!.trim() : undefined

  const base = {
    city: row.city,
    firstName: row.firstName,
    lastName: row.lastName,
    avatarUrl: row.avatarUrl,
    email: row.email,
    phone: row.phone,
    isActive: row.isActive,
    tags: row.tags,
  }

  try {
    await upsertStaff({ ...base, sourceCandidateId: source })
  } catch (err) {
    if (source && isLikelyFkViolation(err)) {
      await upsertStaff({ ...base, sourceCandidateId: undefined })
      return
    }
    throw err
  }
}

export type MigrateLocalCamerieriOutcome =
  | { status: "skipped"; reason: "no-window" | "no-supabase" | "already-drained" }
  | { status: "nothing-to-import"; removedLegacyKey: boolean }
  | { status: "ok"; migratedCount: number }
  | { status: "failed"; migratedCount: number; error: string }

/**
 * Scorre il blob locale v1 per Modena/Sassari e chiama {@link upsertStaff} per riga.
 * Non rilanciare dopo {@link LOCAL_CAMERIERI_DRAINED_MARKER_KEY} impostato.
 */
export async function migrateLocalCamerieriToStaffOnce(): Promise<MigrateLocalCamerieriOutcome> {
  if (typeof window === "undefined") return { status: "skipped", reason: "no-window" }
  if (!hasSupabaseConfig) return { status: "skipped", reason: "no-supabase" }
  if (localStorage.getItem(LOCAL_CAMERIERI_DRAINED_MARKER_KEY))
    return { status: "skipped", reason: "already-drained" }

  const raw = localStorage.getItem(LEGACY_CAMERIERI_STORAGE_KEY)
  const buckets = parseLegacyBuckets(raw)
  const flat = [...buckets.modena, ...buckets.sassari]
  const totalLegacyBytes = typeof raw === "string" ? raw.length : 0

  if (flat.length === 0 && totalLegacyBytes === 0) {
    localStorage.setItem(LOCAL_CAMERIERI_DRAINED_MARKER_KEY, new Date().toISOString())
    return { status: "nothing-to-import", removedLegacyKey: false }
  }

  let migratedCount = 0
  try {
    for (const row of flat) {
      await migrateOneCameriere(row)
      migratedCount += 1
    }
    localStorage.removeItem(LEGACY_CAMERIERI_STORAGE_KEY)
    localStorage.setItem(LOCAL_CAMERIERI_DRAINED_MARKER_KEY, new Date().toISOString())
    dispatchStaffListInvalidated()
    return { status: "ok", migratedCount }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Errore non previsto nella migrazione camerieri locali."
    return { status: "failed", migratedCount, error: message }
  }
}
