import type { PostgrestError } from "@supabase/supabase-js"
import { hasSupabaseConfig, supabase } from "../../lib/supabase"
import type { OfficeCity } from "./types"

type CityRow = {
  id: string
  slug: string
  display_name: string
  is_active: boolean
  sort_order: number
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

function mapCityRow(row: CityRow): OfficeCity {
  return {
    id: row.id,
    slug: row.slug,
    displayName: row.display_name,
    isActive: row.is_active,
    sortOrder: row.sort_order,
  }
}

function getSupabaseClient() {
  if (!hasSupabaseConfig || !supabase) {
    throw new Error("Supabase admin non configurato. Verifica VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.")
  }
  return supabase
}

function dispatchCitiesUpdatedEvent(): void {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(CITIES_UPDATED_EVENT))
}

function toCityError(error: PostgrestError, fallbackMessage: string): Error {
  if (error.code === "23505") {
    return new Error("La slug scelta e gia in uso da un'altra sede.")
  }
  if (error.code === "23503") {
    return new Error("Questa sede e gia referenziata da altri dati. Disattivala invece di eliminarla.")
  }
  return new Error(error.message || fallbackMessage)
}

function validateCityInput(input: SaveCityInput | UpdateCityInput): {
  slug: string
  displayName: string
  isActive: boolean
} {
  const slug = normalizeSlug(input.slug)
  if (!slug) {
    throw new Error("Inserisci una slug valida (es. bologna).")
  }
  const displayName = input.displayName.trim()
  if (!displayName) {
    throw new Error("Il nome sede e obbligatorio.")
  }
  return {
    slug,
    displayName,
    isActive: typeof input.isActive === "boolean" ? input.isActive : true,
  }
}

export async function loadCities(): Promise<OfficeCity[]> {
  const client = getSupabaseClient()
  const { data, error } = await client
    .from("cities")
    .select("id, slug, display_name, is_active, sort_order")
    .order("sort_order", { ascending: true })
    .order("slug", { ascending: true })

  if (error) throw toCityError(error, "Impossibile caricare le sedi.")
  return (data ?? []).map((row) => mapCityRow(row as CityRow))
}

export async function listActiveCities(): Promise<OfficeCity[]> {
  const client = getSupabaseClient()
  const { data, error } = await client
    .from("cities")
    .select("id, slug, display_name, is_active, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("slug", { ascending: true })

  if (error) throw toCityError(error, "Impossibile caricare le sedi attive.")
  return (data ?? []).map((row) => mapCityRow(row as CityRow))
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

export async function createCity(input: SaveCityInput): Promise<OfficeCity> {
  const client = getSupabaseClient()
  const { slug, displayName, isActive } = validateCityInput(input)
  const cities = await loadCities()
  const maxSortOrder = cities.reduce((acc, city) => Math.max(acc, city.sortOrder), 0)

  const { data, error } = await client
    .from("cities")
    .insert({
      slug,
      display_name: displayName,
      is_active: isActive,
      sort_order: maxSortOrder + 10,
    })
    .select("id, slug, display_name, is_active, sort_order")
    .single()

  if (error) throw toCityError(error, "Impossibile creare la sede.")
  dispatchCitiesUpdatedEvent()
  return mapCityRow(data as CityRow)
}

export async function updateCity(cityId: string, input: UpdateCityInput): Promise<OfficeCity> {
  const client = getSupabaseClient()
  const { slug, displayName, isActive } = validateCityInput(input)
  const { data, error } = await client
    .from("cities")
    .update({
      slug,
      display_name: displayName,
      is_active: isActive,
    })
    .eq("id", cityId)
    .select("id, slug, display_name, is_active, sort_order")
    .maybeSingle()

  if (error) throw toCityError(error, "Impossibile aggiornare la sede.")
  if (!data) throw new Error("Sede non trovata.")
  dispatchCitiesUpdatedEvent()
  return mapCityRow(data as CityRow)
}

export async function setCityActive(cityId: string, isActive: boolean): Promise<OfficeCity> {
  const client = getSupabaseClient()
  const { data, error } = await client
    .from("cities")
    .update({ is_active: isActive })
    .eq("id", cityId)
    .select("id, slug, display_name, is_active, sort_order")
    .maybeSingle()

  if (error) throw toCityError(error, "Impossibile aggiornare lo stato della sede.")
  if (!data) throw new Error("Sede non trovata.")
  dispatchCitiesUpdatedEvent()
  return mapCityRow(data as CityRow)
}

export async function moveCity(cityId: string, direction: "up" | "down"): Promise<OfficeCity[]> {
  const client = getSupabaseClient()
  const ordered = normalizeSortOrder(await loadCities())
  const index = ordered.findIndex((city) => city.id === cityId)
  if (index < 0) throw new Error("Sede non trovata.")

  const targetIndex = direction === "up" ? index - 1 : index + 1
  if (targetIndex < 0 || targetIndex >= ordered.length) return ordered

  const next = [...ordered]
  const currentItem = next[index]
  next[index] = next[targetIndex]
  next[targetIndex] = currentItem
  const normalized = normalizeSortOrder(next)

  for (const city of normalized) {
    const { error } = await client.from("cities").update({ sort_order: city.sortOrder }).eq("id", city.id)
    if (error) throw toCityError(error, "Impossibile riordinare le sedi.")
  }

  dispatchCitiesUpdatedEvent()
  return normalized
}

export async function deleteCity(cityId: string): Promise<DeleteCityResult> {
  const cities = await loadCities()
  const target = cities.find((city) => city.id === cityId)
  if (!target) return { deleted: false, reason: "Sede non trovata." }
  const gate = canDeleteCity(target)
  if (!gate.deleted) return gate

  const client = getSupabaseClient()
  const { error } = await client.from("cities").delete().eq("id", cityId)
  if (error) {
    return {
      deleted: false,
      reason: toCityError(error, "Impossibile eliminare la sede.").message,
    }
  }

  dispatchCitiesUpdatedEvent()
  return { deleted: true }
}
