/**
 * Local storage adapter for Camerieri CRM (MVP phase).
 *
 * In this phase, data is local and versioned to allow future migration to backend.
 */
import type { Candidate, CandidateCity } from "@/src/data/mockCandidates"
import { createCameriereInputFromCandidate } from "./mappers"
import type { Cameriere, CameriereCreateInput } from "./types"

type SerializedCamerieriV1 = {
  version: 1
  byCity: Record<CandidateCity, Cameriere[]>
}

export const CAMERIERI_STORAGE_KEY = "admin:camerieri:crm:v1"
export const CAMERIERI_UPDATED_EVENT = "admin:camerieri:updated"

const DEMO_FIRST_NAMES = [
  "Luca",
  "Giulia",
  "Marco",
  "Sara",
  "Davide",
  "Chiara",
  "Andrea",
  "Marta",
  "Simone",
  "Elena",
  "Paolo",
  "Francesca",
  "Nicolo",
  "Ilaria",
  "Gabriele",
]

const DEMO_LAST_NAMES = [
  "Rossi",
  "Bianchi",
  "Ferrari",
  "Ricci",
  "Conti",
  "Moretti",
  "Greco",
  "Mariani",
  "Costa",
  "Romano",
  "Barbieri",
  "Gallo",
  "Lombardi",
  "Fontana",
  "Mancini",
]

const DEMO_TAGS: Cameriere["tags"][] = [
  ["automunito"],
  ["esperienza"],
  ["multilingue"],
  ["fuori_sede"],
  ["automunito", "esperienza"],
  ["esperienza", "multilingue"],
  ["automunito", "fuori_sede"],
  ["multilingue", "fuori_sede"],
  [],
  ["esperienza"],
  ["automunito", "multilingue"],
  ["fuori_sede"],
  ["automunito"],
  ["esperienza", "fuori_sede"],
  ["multilingue"],
]

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

function parseStorage(rawValue: string | null): Record<CandidateCity, Cameriere[]> {
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

function saveByCity(byCity: Record<CandidateCity, Cameriere[]>): void {
  if (typeof window === "undefined") return
  const payload: SerializedCamerieriV1 = { version: 1, byCity }
  localStorage.setItem(CAMERIERI_STORAGE_KEY, JSON.stringify(payload))
  window.dispatchEvent(new CustomEvent(CAMERIERI_UPDATED_EVENT))
}

export function loadCamerieriByCity(): Record<CandidateCity, Cameriere[]> {
  if (typeof window === "undefined") return createEmptyCityBuckets()
  return parseStorage(localStorage.getItem(CAMERIERI_STORAGE_KEY))
}

function buildDemoCamerieriForCity(city: CandidateCity): Cameriere[] {
  const now = new Date()
  return DEMO_FIRST_NAMES.map((firstName, index) => {
    const number = String(index + 1).padStart(2, "0")
    const sourceCandidateId = `demo-${city}-${number}`
    const dayOffset = index % 10
    const createdAt = new Date(now.getTime() - (18 + dayOffset) * 24 * 60 * 60 * 1000).toISOString()
    const updatedAt = new Date(now.getTime() - dayOffset * 24 * 60 * 60 * 1000).toISOString()
    const lowerCity = city === "modena" ? "modena" : "sassari"
    return {
      id: `waiter-${sourceCandidateId}`,
      sourceCandidateId,
      city,
      firstName,
      lastName: DEMO_LAST_NAMES[index],
      avatarUrl: undefined,
      email: `${firstName.toLowerCase()}.${DEMO_LAST_NAMES[index].toLowerCase()}+${lowerCity}@demo.g3.it`,
      phone: `+39 33${(index + 1).toString().padStart(2, "0")} 55 77 ${(10 + index).toString().padStart(2, "0")}`,
      isActive: index % 5 !== 0,
      tags: DEMO_TAGS[index] ?? [],
      createdAt,
      updatedAt,
    } satisfies Cameriere
  })
}

/**
 * Seeds a deterministic set of demo waiters for visual QA.
 * Idempotent by `sourceCandidateId`, so repeated calls never duplicate entries.
 */
export function ensureDemoCamerieriSeed(city: CandidateCity): void {
  const byCity = loadCamerieriByCity()
  const existingSourceIds = new Set(byCity[city].map((item) => item.sourceCandidateId).filter(Boolean))
  const missingDemoItems = buildDemoCamerieriForCity(city).filter((item) => !existingSourceIds.has(item.sourceCandidateId))
  if (missingDemoItems.length === 0) return
  byCity[city] = [...missingDemoItems, ...byCity[city]]
  saveByCity(byCity)
}

export function getCamerieriForCity(city: CandidateCity): Cameriere[] {
  return loadCamerieriByCity()[city]
}

export function upsertCameriere(input: CameriereCreateInput): { created: boolean; cameriere: Cameriere } {
  const byCity = loadCamerieriByCity()
  const nowIso = new Date().toISOString()
  const targetCityList = byCity[input.city]

  let existingCity: CandidateCity | null = null
  let existingIndex = -1
  if (input.sourceCandidateId) {
    for (const city of ["modena", "sassari"] as const) {
      const idx = byCity[city].findIndex((item) => item.sourceCandidateId === input.sourceCandidateId)
      if (idx >= 0) {
        existingCity = city
        existingIndex = idx
        break
      }
    }
  }

  if (existingIndex < 0) {
    const existingIndexById = targetCityList.findIndex(
      (item) => item.id === (input.sourceCandidateId ? `waiter-${input.sourceCandidateId}` : ""),
    )
    if (existingIndexById >= 0) {
      existingCity = input.city
      existingIndex = existingIndexById
    }
  }

  if (existingIndex >= 0) {
    const currentCity = existingCity ?? input.city
    const currentList = byCity[currentCity]
    const current = currentList[existingIndex]
    const updated: Cameriere = {
      ...current,
      city: input.city,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      avatarUrl: input.avatarUrl?.trim() || current.avatarUrl,
      email: input.email?.trim() || current.email,
      phone: input.phone?.trim() || current.phone,
      isActive: typeof input.isActive === "boolean" ? input.isActive : current.isActive,
      tags: input.tags ?? current.tags,
      updatedAt: nowIso,
      sourceCandidateId: input.sourceCandidateId ?? current.sourceCandidateId,
    }
    const withoutCurrent = [...currentList.slice(0, existingIndex), ...currentList.slice(existingIndex + 1)]
    byCity[currentCity] = withoutCurrent
    byCity[input.city] = [updated, ...byCity[input.city].filter((item) => item.id !== updated.id)]
    saveByCity(byCity)
    return { created: false, cameriere: updated }
  }

  const cameriere: Cameriere = {
    id: input.sourceCandidateId ? `waiter-${input.sourceCandidateId}` : `waiter-${crypto.randomUUID()}`,
    sourceCandidateId: input.sourceCandidateId,
    city: input.city,
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    avatarUrl: input.avatarUrl?.trim() || undefined,
    email: input.email?.trim() || undefined,
    phone: input.phone?.trim() || undefined,
    isActive: typeof input.isActive === "boolean" ? input.isActive : true,
    tags: input.tags ?? [],
    createdAt: nowIso,
    updatedAt: nowIso,
  }
  byCity[input.city] = [cameriere, ...targetCityList]
  saveByCity(byCity)
  return { created: true, cameriere }
}

export function promoteCandidateToCameriere(candidate: Candidate): { created: boolean; cameriere: Cameriere } {
  return upsertCameriere(createCameriereInputFromCandidate(candidate))
}
