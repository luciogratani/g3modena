/**
 * Repository Supabase per `public.staff` (UI: Camerieri).
 * Adapter Supabase per `public.staff`; nessuna dipendenza da hook/UI.
 */
import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js"
import { hasSupabaseConfig, supabase } from "../../lib/supabase"
import { loadCities } from "../cities/storage"
import { CAREERS_PHOTOS_BUCKET } from "../candidati-board/candidates-repository"
import type { CandidateCitySlug } from "../../data/mockCandidates"
import type { Cameriere, CameriereCreateInput, CameriereTag } from "./types"

const PROFILE_PHOTO_SIGNED_URL_TTL_SEC = 3600

/** Bucket avatar caricati dal CRM (`avatar_path` con prefisso `crm-staff/`). */
export const STAFF_CRM_AVATARS_BUCKET = "staff-crm-avatars"

/** Prefisso path oggetti nel bucket sopra — distinto da allegati candidature (`careers-photos`). */
export const STAFF_CRM_AVATAR_PATH_PREFIX = "crm-staff/"

const MAX_STAFF_CRM_AVATAR_BYTES = 5 * 1024 * 1024

const ALLOWED_STAFF_CRM_AVATAR_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
])

function resolveStaffCrmAvatarMime(file: File): string | null {
  const t = file.type?.toLowerCase().trim()
  if (t && ALLOWED_STAFF_CRM_AVATAR_TYPES.has(t)) return t
  const ext = file.name.split(".").pop()?.toLowerCase()
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg"
  if (ext === "png") return "image/png"
  if (ext === "webp") return "image/webp"
  return null
}

function staffCrmAvatarExtensionFromMime(mime: string): string {
  if (mime === "image/jpeg") return "jpg"
  if (mime === "image/png") return "png"
  if (mime === "image/webp") return "webp"
  return "img"
}

/** Riga canonica letta/scritta dalla tabella `public.staff`. */
export type StaffRow = {
  id: string
  city_id: string
  source_candidate_id: string | null
  first_name: string
  last_name: string
  avatar_path: string | null
  email: string | null
  phone: string | null
  is_active: boolean
  tags: string[]
  created_at: string
  updated_at: string
}

const STAFF_COLUMNS = [
  "id",
  "city_id",
  "source_candidate_id",
  "first_name",
  "last_name",
  "avatar_path",
  "email",
  "phone",
  "is_active",
  "tags",
  "created_at",
  "updated_at",
].join(", ")

const ALLOWED_TAGS: ReadonlySet<string> = new Set([
  "automunito",
  "esperienza",
  "multilingue",
  "fuori_sede",
])

export function normalizeTags(raw: unknown): CameriereTag[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((t): t is CameriereTag => typeof t === "string" && ALLOWED_TAGS.has(t))
}

/**
 * Non salvare URL assoluti (signed o pubblici) in `avatar_path`.
 * Paths bucket careers restano relativi alla root del bucket.
 */
export function staffAvatarUrlToPersistencePath(raw: string | undefined): string | null {
  const t = typeof raw === "string" ? raw.trim() : ""
  if (!t) return null
  if (/^https?:\/\//i.test(t)) return null
  return t
}

/**
 * Carica un avatar nel bucket privato `staff-crm-avatars` (sessione authenticated).
 * Ritorna il **path oggetto** da salvare in `avatar_path` (senza prefisso nome bucket).
 */
export async function uploadStaffCrmAvatar(file: File): Promise<string> {
  const client = getSupabaseClient()
  if (file.size > MAX_STAFF_CRM_AVATAR_BYTES) {
    throw new Error("Immagine troppo grande (massimo 5 MB).")
  }
  const mime = resolveStaffCrmAvatarMime(file)
  if (!mime) {
    throw new Error("Formato non supportato: usa JPEG, PNG o WebP.")
  }
  const ext = staffCrmAvatarExtensionFromMime(mime)
  const objectPath = `${STAFF_CRM_AVATAR_PATH_PREFIX}${crypto.randomUUID()}.${ext}`

  const { error } = await client.storage.from(STAFF_CRM_AVATARS_BUCKET).upload(objectPath, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: mime,
  })

  if (error) throw new Error(error.message || "Upload avatar fallito.")
  return objectPath
}

async function slugToCityId(slug: string): Promise<string | null> {
  const cities = await loadCities()
  return cities.find((c) => c.slug === slug)?.id ?? null
}

function getSupabaseClient(): SupabaseClient {
  if (!hasSupabaseConfig || !supabase) {
    throw new Error(
      "Supabase admin non configurato. Verifica VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.",
    )
  }
  return supabase
}

function toStaffError(error: PostgrestError, fallbackMessage: string): Error {
  if (error.code === "23505") {
    return new Error("Violazione unicita sul personale staff (candidate gia associato?).")
  }
  if (error.code === "23514") {
    return new Error("Dati cameriere non validi secondo il vincolo database.")
  }
  if (error.code === "23503") {
    return new Error("Riferimento citta o candidato non valido.")
  }
  return new Error(error.message || fallbackMessage)
}

function rowToCameriere(row: StaffRow, citySlug: CandidateCitySlug): Cameriere {
  return {
    id: row.id,
    sourceCandidateId: row.source_candidate_id ?? undefined,
    city: citySlug,
    firstName: row.first_name,
    lastName: row.last_name,
    avatarUrl: row.avatar_path?.trim() || undefined,
    email: row.email?.trim() || undefined,
    phone: row.phone?.trim() || undefined,
    isActive: row.is_active,
    tags: normalizeTags(row.tags),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/**
 * URL firmati per anteprima tabella: path con prefisso `crm-staff/` → `staff-crm-avatars`,
 * altrimenti `careers-photos` (promozione candidato).
 */
export async function staffApplyAvatarSignedUrls(
  client: SupabaseClient,
  items: Cameriere[],
): Promise<Cameriere[]> {
  return Promise.all(
    items.map(async (item) => {
      const path = item.avatarUrl?.trim()
      if (!path || /^https?:\/\//i.test(path)) return item
      const bucket = path.startsWith(STAFF_CRM_AVATAR_PATH_PREFIX)
        ? STAFF_CRM_AVATARS_BUCKET
        : CAREERS_PHOTOS_BUCKET
      const { data, error } = await client.storage
        .from(bucket)
        .createSignedUrl(path, PROFILE_PHOTO_SIGNED_URL_TTL_SEC)
      if (error || !data?.signedUrl) return item
      return { ...item, avatarUrl: data.signedUrl }
    }),
  )
}

export async function listByCitySlug(citySlug: CandidateCitySlug): Promise<Cameriere[]> {
  const client = getSupabaseClient()
  const cityId = await slugToCityId(citySlug)
  if (!cityId) return []

  const { data, error } = await client
    .from("staff")
    .select(STAFF_COLUMNS)
    .eq("city_id", cityId)
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true })

  if (error) throw toStaffError(error, "Impossibile caricare i camerieri.")
  const rows = (data ?? []) as unknown as StaffRow[]
  const mapped = rows.map((row) => rowToCameriere(row, citySlug))
  return staffApplyAvatarSignedUrls(client, mapped)
}

/**
 * Inserimento o aggiornamento da input CRM/board.
 * Con `sourceCandidateId`: idempotent su `staff.source_candidate_id` (uno per candidato).
 * Senza: solo INSERT nuova riga.
 */
export async function upsertStaff(
  input: CameriereCreateInput,
): Promise<{ created: boolean; cameriere: Cameriere }> {
  const client = getSupabaseClient()
  const cityId = await slugToCityId(input.city)
  if (!cityId) throw new Error(`Sede non trovata in database per slug: ${input.city}`)

  const persistedAvatarPath = staffAvatarUrlToPersistencePath(input.avatarUrl)
  const first_name = input.firstName.trim()
  const last_name = input.lastName.trim()

  if (input.sourceCandidateId?.trim()) {
    const sid = input.sourceCandidateId.trim()
    const { data: existingRow, error: fetchErr } = await client
      .from("staff")
      .select(STAFF_COLUMNS)
      .eq("source_candidate_id", sid)
      .maybeSingle()

    if (fetchErr) throw toStaffError(fetchErr, "Impossibile verificare lo staff associato.")

    if (existingRow) {
      const cur = existingRow as unknown as StaffRow
      const merged = {
        city_id: cityId,
        first_name,
        last_name,
        avatar_path: persistedAvatarPath ?? cur.avatar_path,
        email: input.email !== undefined ? input.email?.trim() || null : cur.email,
        phone: input.phone !== undefined ? input.phone?.trim() || null : cur.phone,
        is_active: typeof input.isActive === "boolean" ? input.isActive : cur.is_active,
        tags: input.tags !== undefined ? normalizeTags(input.tags) : normalizeTags(cur.tags),
      }
      const { data: updated, error } = await client
        .from("staff")
        .update(merged)
        .eq("id", cur.id)
        .select(STAFF_COLUMNS)
        .maybeSingle()

      if (error) throw toStaffError(error, "Impossibile aggiornare il cameriere.")
      if (!updated) throw new Error("Aggiornamento staff fallito.")

      const row = updated as unknown as StaffRow
      let cameriere = rowToCameriere(row, input.city)
      ;[cameriere] = await staffApplyAvatarSignedUrls(client, [cameriere])
      return { created: false, cameriere }
    }

    const is_active_insert = typeof input.isActive === "boolean" ? input.isActive : true
    const { data: inserted, error } = await client
      .from("staff")
      .insert({
        city_id: cityId,
        first_name,
        last_name,
        avatar_path: persistedAvatarPath,
        email: input.email?.trim() || null,
        phone: input.phone?.trim() || null,
        is_active: is_active_insert,
        tags: normalizeTags(input.tags ?? []),
        source_candidate_id: sid,
      })
      .select(STAFF_COLUMNS)
      .maybeSingle()

    if (error) throw toStaffError(error, "Impossibile creare il cameriere.")
    if (!inserted) throw new Error("Inserimento staff fallito.")

    const row = inserted as unknown as StaffRow
    let cameriere = rowToCameriere(row, input.city)
    ;[cameriere] = await staffApplyAvatarSignedUrls(client, [cameriere])
    return { created: true, cameriere }
  }

  const is_active_new = typeof input.isActive === "boolean" ? input.isActive : true
  const { data: inserted, error } = await client
    .from("staff")
    .insert({
      city_id: cityId,
      first_name,
      last_name,
      avatar_path: persistedAvatarPath,
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
      is_active: is_active_new,
      tags: normalizeTags(input.tags ?? []),
    })
    .select(STAFF_COLUMNS)
    .maybeSingle()

  if (error) throw toStaffError(error, "Impossibile creare il cameriere.")
  if (!inserted) throw new Error("Inserimento staff fallito.")

  const row = inserted as unknown as StaffRow
  let cameriere = rowToCameriere(row, input.city)
  ;[cameriere] = await staffApplyAvatarSignedUrls(client, [cameriere])
  return { created: true, cameriere }
}

/** Aggiorna solo `is_active` per righe nella sede indicata (CRM). */
export async function updateStaffActive(
  citySlug: CandidateCitySlug,
  staffId: string,
  isActive: boolean,
): Promise<Cameriere> {
  const client = getSupabaseClient()
  const cityId = await slugToCityId(citySlug)
  if (!cityId) throw new Error(`Sede non trovata in database per slug: ${citySlug}`)

  const { data, error } = await client
    .from("staff")
    .update({ is_active: isActive })
    .eq("id", staffId)
    .eq("city_id", cityId)
    .select(STAFF_COLUMNS)
    .maybeSingle()

  if (error) throw toStaffError(error, "Impossibile aggiornare lo stato del cameriere.")
  if (!data) throw new Error("Cameriere non trovato o non appartenente alla sede corrente.")

  const row = data as unknown as StaffRow
  let cameriere = rowToCameriere(row, citySlug)
  ;[cameriere] = await staffApplyAvatarSignedUrls(client, [cameriere])
  return cameriere
}
