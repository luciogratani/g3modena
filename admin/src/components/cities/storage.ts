import type { OfficeCity } from "./types"

type SerializedCitiesV1 = {
  version: 1
  items: OfficeCity[]
}

type SaveCityInput = {
  slug: string
  displayName: string
  isActive?: boolean
}

type UpdateCityInput = {
  slug: string
  displayName: string
  isActive: boolean
}

type DeleteCityResult = {
  deleted: boolean
  reason?: string
}

const LEGACY_LOCKED_SLUGS = new Set(["modena", "sassari"])
const STORAGE_VERSION = 1

const SEEDED_CITIES: OfficeCity[] = [
  {
    id: "7f52706d-85f3-40d8-98d8-c55cbe0fa997",
    slug: "modena",
    displayName: "Modena",
    isActive: true,
    sortOrder: 10,
  },
  {
    id: "dc5f7ed2-0b8d-432f-9a01-29a230f8539b",
    slug: "sassari",
    displayName: "Sassari",
    isActive: true,
    sortOrder: 20,
  },
]

export const CITIES_STORAGE_KEY = "admin:cities:v1"
export const CITIES_UPDATED_EVENT = "admin:cities:updated"

function normalizeSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function ensureSorted(items: OfficeCity[]): OfficeCity[] {
  return [...items].sort((a, b) => {
    if (a.sortOrder === b.sortOrder) return a.displayName.localeCompare(b.displayName, "it")
    return a.sortOrder - b.sortOrder
  })
}

function normalizeSortOrder(items: OfficeCity[]): OfficeCity[] {
  return ensureSorted(items).map((item, index) => ({
    ...item,
    sortOrder: (index + 1) * 10,
  }))
}

function sanitizeCity(raw: unknown): OfficeCity | null {
  if (!raw || typeof raw !== "object") return null
  const item = raw as Partial<OfficeCity>
  if (typeof item.id !== "string" || !item.id.trim()) return null
  if (typeof item.displayName !== "string" || !item.displayName.trim()) return null
  if (typeof item.slug !== "string") return null
  const normalizedSlug = normalizeSlug(item.slug)
  if (!normalizedSlug) return null
  const parsedSortOrder =
    typeof item.sortOrder === "number" && Number.isFinite(item.sortOrder)
      ? Math.max(0, Math.round(item.sortOrder))
      : 0
  return {
    id: item.id.trim(),
    slug: normalizedSlug,
    displayName: item.displayName.trim(),
    isActive: typeof item.isActive === "boolean" ? item.isActive : true,
    sortOrder: parsedSortOrder,
  }
}

function parseStorage(rawValue: string | null): OfficeCity[] {
  if (!rawValue) return SEEDED_CITIES
  try {
    const parsed = JSON.parse(rawValue) as Partial<SerializedCitiesV1>
    if (parsed.version !== STORAGE_VERSION || !Array.isArray(parsed.items)) return SEEDED_CITIES

    const seenIds = new Set<string>()
    const seenSlugs = new Set<string>()
    const sanitized = parsed.items
      .map(sanitizeCity)
      .filter((city): city is OfficeCity => Boolean(city))
      .filter((city) => {
        if (seenIds.has(city.id) || seenSlugs.has(city.slug)) return false
        seenIds.add(city.id)
        seenSlugs.add(city.slug)
        return true
      })

    return normalizeSortOrder(sanitized.length > 0 ? sanitized : SEEDED_CITIES)
  } catch {
    return SEEDED_CITIES
  }
}

function saveCities(cities: OfficeCity[]): void {
  if (typeof window === "undefined") return
  const payload: SerializedCitiesV1 = {
    version: STORAGE_VERSION,
    items: normalizeSortOrder(cities),
  }
  localStorage.setItem(CITIES_STORAGE_KEY, JSON.stringify(payload))
  window.dispatchEvent(new CustomEvent(CITIES_UPDATED_EVENT))
}

function ensureUniqueSlug(cities: OfficeCity[], slug: string, excludingId?: string): void {
  const duplicate = cities.some((city) => city.slug === slug && city.id !== excludingId)
  if (duplicate) {
    throw new Error(`La slug "${slug}" e gia in uso da un'altra sede.`)
  }
}

export function loadCities(): OfficeCity[] {
  if (typeof window === "undefined") return SEEDED_CITIES
  return parseStorage(localStorage.getItem(CITIES_STORAGE_KEY))
}

export function listActiveCities(): OfficeCity[] {
  return loadCities().filter((city) => city.isActive)
}

export function isCityDeleteLocked(city: OfficeCity): boolean {
  return LEGACY_LOCKED_SLUGS.has(city.slug)
}

export function canDeleteCity(city: OfficeCity): DeleteCityResult {
  if (isCityDeleteLocked(city)) {
    return {
      deleted: false,
      reason: "Questa sede e usata dai dati legacy della board/camerieri. Disattivala invece di eliminarla.",
    }
  }
  return { deleted: true }
}

export function createCity(input: SaveCityInput): OfficeCity {
  const slug = normalizeSlug(input.slug)
  if (!slug) {
    throw new Error("Inserisci una slug valida (es. bologna).")
  }
  const displayName = input.displayName.trim()
  if (!displayName) {
    throw new Error("Il nome sede e obbligatorio.")
  }

  const cities = loadCities()
  ensureUniqueSlug(cities, slug)

  const maxSortOrder = cities.reduce((acc, city) => Math.max(acc, city.sortOrder), 0)
  const created: OfficeCity = {
    id: crypto.randomUUID(),
    slug,
    displayName,
    isActive: typeof input.isActive === "boolean" ? input.isActive : true,
    sortOrder: maxSortOrder + 10,
  }

  saveCities([...cities, created])
  return created
}

export function updateCity(cityId: string, input: UpdateCityInput): OfficeCity {
  const cities = loadCities()
  const index = cities.findIndex((city) => city.id === cityId)
  if (index < 0) throw new Error("Sede non trovata.")

  const slug = normalizeSlug(input.slug)
  if (!slug) {
    throw new Error("Inserisci una slug valida (es. bologna).")
  }
  const displayName = input.displayName.trim()
  if (!displayName) {
    throw new Error("Il nome sede e obbligatorio.")
  }

  ensureUniqueSlug(cities, slug, cityId)
  const updated: OfficeCity = {
    ...cities[index],
    slug,
    displayName,
    isActive: input.isActive,
  }
  const next = [...cities]
  next[index] = updated
  saveCities(next)
  return updated
}

export function setCityActive(cityId: string, isActive: boolean): OfficeCity {
  const cities = loadCities()
  const index = cities.findIndex((city) => city.id === cityId)
  if (index < 0) throw new Error("Sede non trovata.")
  const updated: OfficeCity = { ...cities[index], isActive }
  const next = [...cities]
  next[index] = updated
  saveCities(next)
  return updated
}

export function moveCity(cityId: string, direction: "up" | "down"): OfficeCity[] {
  const ordered = normalizeSortOrder(loadCities())
  const index = ordered.findIndex((city) => city.id === cityId)
  if (index < 0) throw new Error("Sede non trovata.")

  const targetIndex = direction === "up" ? index - 1 : index + 1
  if (targetIndex < 0 || targetIndex >= ordered.length) return ordered

  const next = [...ordered]
  const currentItem = next[index]
  next[index] = next[targetIndex]
  next[targetIndex] = currentItem
  const normalized = normalizeSortOrder(next)
  saveCities(normalized)
  return normalized
}

export function deleteCity(cityId: string): DeleteCityResult {
  const cities = loadCities()
  const target = cities.find((city) => city.id === cityId)
  if (!target) return { deleted: false, reason: "Sede non trovata." }
  const gate = canDeleteCity(target)
  if (!gate.deleted) return gate

  const next = cities.filter((city) => city.id !== cityId)
  saveCities(next)
  return { deleted: true }
}
