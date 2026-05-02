/**
 * Repository Supabase per `public.campaigns` (Marketing › Campagne).
 * Adapter senza dipendenze da hook/UI.
 */
import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js"
import { hasSupabaseConfig, supabase } from "../../lib/supabase"
import {
  EMPTY_CAMPAIGN_METRICS,
  type CampaignLifecycle,
  type CampaignRecord,
} from "./types"

/** Soglia inattività CAMPAIGNS_CONTRACT.md §2 (giorni). */
export const CAMPAIGN_INACTIVE_THRESHOLD_DAYS = 5

/** Bucket anteprime (`creative_image_path` = path relativo a questo bucket). */
export const CAMPAIGN_PREVIEWS_BUCKET = "campaign-previews"

const MAX_CAMPAIGN_CREATIVE_BYTES = 5 * 1024 * 1024

const ALLOWED_CAMPAIGN_CREATIVE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
])

const INACTIVE_MS = CAMPAIGN_INACTIVE_THRESHOLD_DAYS * 24 * 60 * 60 * 1000

/** Riga `public.campaigns` come restituita da PostgREST (snake_case). */
export type CampaignDbRow = {
  id: string
  name: string
  subtitle: string
  cid: string
  base_url: string
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string
  utm_term: string | null
  utm_content: string | null
  creative_image_path: string
  starts_at: string
  first_data_at: string | null
  last_data_at: string | null
  created_at: string
  updated_at: string
}

const CAMPAIGN_COLUMNS = [
  "id",
  "name",
  "subtitle",
  "cid",
  "base_url",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "creative_image_path",
  "starts_at",
  "first_data_at",
  "last_data_at",
  "created_at",
  "updated_at",
].join(", ")

export type CampaignInsertInput = {
  name: string
  subtitle: string
  cid: string
  baseUrl: string
  utmCampaign: string
  creativeImagePath: string
  utmSource?: string | null
  utmMedium?: string | null
  utmTerm?: string | null
  utmContent?: string | null
  /** ISO 8601 timestamptz; omesso → default DB `now()`. */
  startsAt?: string | null
}

export type CampaignPatchInput = Partial<{
  name: string
  subtitle: string
  cid: string
  baseUrl: string
  utmCampaign: string
  utmSource: string | null
  utmMedium: string | null
  utmTerm: string | null
  utmContent: string | null
  creativeImagePath: string
  startsAt: string | null
  firstDataAt: string | null
  lastDataAt: string | null
}>

function getSupabaseClient(): SupabaseClient {
  if (!hasSupabaseConfig || !supabase) {
    throw new Error(
      "Supabase admin non configurato. Verifica VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.",
    )
  }
  return supabase
}

/** Violazione univocità `cid` (PostgreSQL `23505`) — permette retry UI con nuovo cid. */
export class CampaignCidConflictError extends Error {
  constructor(message = "Il codice campagna (cid) è già in uso.") {
    super(message)
    this.name = "CampaignCidConflictError"
  }
}

export function isCampaignCidConflictError(err: unknown): err is CampaignCidConflictError {
  return err instanceof CampaignCidConflictError
}

function toCampaignError(error: PostgrestError, fallbackMessage: string): Error {
  if (error.code === "23505") {
    return new CampaignCidConflictError()
  }
  if (error.code === "23514") {
    return new Error("Dati campagna non validi secondo i vincoli database.")
  }
  return new Error(error.message || fallbackMessage)
}

function nullToEmpty(s: string | null | undefined): string {
  return typeof s === "string" ? s : ""
}

/**
 * Stato runtime campagna (CAMPAIGNS_CONTRACT.md §2).
 * `lastDataAt` assente con `firstDataAt` valorizzato: si assume attività recente usando `firstDataAt` come proxy.
 */
export function getCampaignLifecycle(
  firstDataAtIso: string | null | undefined,
  lastDataAtIso: string | null | undefined,
  nowMs: number = Date.now(),
): CampaignLifecycle {
  const first = typeof firstDataAtIso === "string" ? firstDataAtIso.trim() : ""
  if (!first) return "waiting_data"

  const lastRaw =
    typeof lastDataAtIso === "string" && lastDataAtIso.trim()
      ? lastDataAtIso.trim()
      : first
  const lastMs = new Date(lastRaw).getTime()
  if (Number.isNaN(lastMs)) return "waiting_data"

  if (nowMs - lastMs > INACTIVE_MS) return "inactive"
  return "active"
}

export function rowToCampaignRecord(row: CampaignDbRow): CampaignRecord {
  return {
    id: row.id,
    name: row.name,
    subtitle: row.subtitle,
    startsAt: row.starts_at,
    firstDataAt: row.first_data_at,
    lastDataAt: row.last_data_at,
    cid: row.cid,
    baseUrl: row.base_url,
    utmSource: nullToEmpty(row.utm_source),
    utmMedium: nullToEmpty(row.utm_medium),
    utmCampaign: row.utm_campaign,
    utmTerm: nullToEmpty(row.utm_term),
    utmContent: nullToEmpty(row.utm_content),
    creativePreview: row.creative_image_path.trim(),
    metrics: EMPTY_CAMPAIGN_METRICS,
  }
}

function buildInsertPayload(input: CampaignInsertInput): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    name: input.name.trim(),
    subtitle: input.subtitle.trim(),
    cid: input.cid.trim(),
    base_url: input.baseUrl.trim(),
    utm_campaign: input.utmCampaign.trim(),
    creative_image_path: input.creativeImagePath.trim(),
    utm_source: input.utmSource?.trim() || null,
    utm_medium: input.utmMedium?.trim() || null,
    utm_term: input.utmTerm?.trim() || null,
    utm_content: input.utmContent?.trim() || null,
  }
  if (input.startsAt != null && String(input.startsAt).trim()) {
    payload.starts_at = String(input.startsAt).trim()
  }
  return payload
}

function buildPatchPayload(patch: CampaignPatchInput): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  if (patch.name !== undefined) out.name = patch.name.trim()
  if (patch.subtitle !== undefined) out.subtitle = patch.subtitle.trim()
  if (patch.cid !== undefined) out.cid = patch.cid.trim()
  if (patch.baseUrl !== undefined) out.base_url = patch.baseUrl.trim()
  if (patch.utmCampaign !== undefined) out.utm_campaign = patch.utmCampaign.trim()
  if (patch.utmSource !== undefined) out.utm_source = patch.utmSource?.trim() || null
  if (patch.utmMedium !== undefined) out.utm_medium = patch.utmMedium?.trim() || null
  if (patch.utmTerm !== undefined) out.utm_term = patch.utmTerm?.trim() || null
  if (patch.utmContent !== undefined) out.utm_content = patch.utmContent?.trim() || null
  if (patch.creativeImagePath !== undefined)
    out.creative_image_path = patch.creativeImagePath.trim()
  if (patch.startsAt !== undefined) {
    const s = patch.startsAt?.trim()
    out.starts_at = s && s.length ? s : null
  }
  if (patch.firstDataAt !== undefined) {
    const s = patch.firstDataAt?.trim()
    out.first_data_at = s && s.length ? s : null
  }
  if (patch.lastDataAt !== undefined) {
    const s = patch.lastDataAt?.trim()
    out.last_data_at = s && s.length ? s : null
  }
  return out
}

/**
 * Lista campagne: più recenti per `starts_at`, poi `created_at`.
 */
export async function listCampaigns(): Promise<CampaignRecord[]> {
  const client = getSupabaseClient()
  const { data, error } = await client
    .from("campaigns")
    .select(CAMPAIGN_COLUMNS)
    .order("starts_at", { ascending: false })
    .order("created_at", { ascending: false })

  if (error) throw toCampaignError(error, "Impossibile caricare le campagne.")
  const rows = (data ?? []) as unknown as CampaignDbRow[]
  return rows.map(rowToCampaignRecord)
}

export async function insertCampaign(input: CampaignInsertInput): Promise<CampaignRecord> {
  const client = getSupabaseClient()
  const payload = buildInsertPayload(input)

  const { data, error } = await client
    .from("campaigns")
    .insert(payload)
    .select(CAMPAIGN_COLUMNS)
    .maybeSingle()

  if (error) throw toCampaignError(error, "Impossibile creare la campagna.")
  if (!data) throw new Error("Inserimento campagna fallito.")
  return rowToCampaignRecord(data as unknown as CampaignDbRow)
}

export async function patchCampaign(
  id: string,
  patch: CampaignPatchInput,
): Promise<CampaignRecord> {
  const client = getSupabaseClient()
  const payload = buildPatchPayload(patch)
  if (Object.keys(payload).length === 0) {
    const { data, error } = await client
      .from("campaigns")
      .select(CAMPAIGN_COLUMNS)
      .eq("id", id)
      .maybeSingle()
    if (error) throw toCampaignError(error, "Impossibile caricare la campagna.")
    if (!data) throw new Error("Campagna non trovata.")
    return rowToCampaignRecord(data as unknown as CampaignDbRow)
  }

  const { data, error } = await client
    .from("campaigns")
    .update(payload)
    .eq("id", id)
    .select(CAMPAIGN_COLUMNS)
    .maybeSingle()

  if (error) throw toCampaignError(error, "Impossibile aggiornare la campagna.")
  if (!data) throw new Error("Campagna non trovata o aggiornamento fallito.")
  return rowToCampaignRecord(data as unknown as CampaignDbRow)
}

function resolveCreativeMime(file: File): string | null {
  const t = file.type?.toLowerCase().trim()
  if (t && ALLOWED_CAMPAIGN_CREATIVE_TYPES.has(t)) return t
  const ext = file.name.split(".").pop()?.toLowerCase()
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg"
  if (ext === "png") return "image/png"
  if (ext === "webp") return "image/webp"
  return null
}

function extensionFromMime(mime: string): string {
  if (mime === "image/jpeg") return "jpg"
  if (mime === "image/png") return "png"
  if (mime === "image/webp") return "webp"
  return "img"
}

/**
 * Carica una creatività nel bucket privato `campaign-previews` (solo sessione authenticated).
 * Ritorna il **path oggetto** da salvare in `creative_image_path` (senza prefisso bucket).
 */
export async function uploadCampaignCreative(file: File): Promise<string> {
  const client = getSupabaseClient()
  if (file.size > MAX_CAMPAIGN_CREATIVE_BYTES) {
    throw new Error("Immagine troppo grande (massimo 5 MB).")
  }
  const mime = resolveCreativeMime(file)
  if (!mime) {
    throw new Error("Formato non supportato: usa JPEG, PNG o WebP.")
  }
  const ext = extensionFromMime(mime)
  const objectPath = `preview/${crypto.randomUUID()}.${ext}`

  const { error } = await client.storage.from(CAMPAIGN_PREVIEWS_BUCKET).upload(objectPath, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: mime,
  })

  if (error) throw new Error(error.message || "Upload creatività fallito.")
  return objectPath
}

const CAMPAIGN_PREVIEW_SIGNED_URL_TTL_SEC = 3600

/** Path bucket relativo vs URL pubblico / data URL già navigabile. */
export function campaignCreativePreviewNeedsSigning(raw: string | undefined): boolean {
  const t = typeof raw === "string" ? raw.trim() : ""
  if (!t) return false
  if (t.startsWith("data:")) return false
  return !/^https?:\/\//i.test(t)
}

export async function applyCampaignCreativeSignedUrls(
  client: SupabaseClient,
  campaigns: CampaignRecord[],
): Promise<CampaignRecord[]> {
  return Promise.all(
    campaigns.map(async (c) => {
      const path = c.creativePreview.trim()
      if (!campaignCreativePreviewNeedsSigning(path)) return c
      const { data, error } = await client.storage
        .from(CAMPAIGN_PREVIEWS_BUCKET)
        .createSignedUrl(path, CAMPAIGN_PREVIEW_SIGNED_URL_TTL_SEC)
      if (error || !data?.signedUrl) return c
      return { ...c, creativePreview: data.signedUrl }
    }),
  )
}

/** Lista da DB + URL firmate per anteprima nel bucket privato `campaign-previews`. */
export async function loadCampaignsForAdmin(): Promise<CampaignRecord[]> {
  const list = await listCampaigns()
  const client = getSupabaseClient()
  return applyCampaignCreativeSignedUrls(client, list)
}
