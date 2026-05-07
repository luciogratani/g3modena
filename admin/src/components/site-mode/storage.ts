import type { PostgrestError } from "@supabase/supabase-js"
import { hasSupabaseConfig, supabase } from "../../lib/supabase"

export const SITE_MODE_KEY = "site_mode"
export const SITE_MODE_VALUES = ["normal", "maintenance", "careers_only"] as const

export type SiteMode = (typeof SITE_MODE_VALUES)[number]

type SiteModeRow = {
  key: string
  value: string
}

function getSupabaseClient() {
  if (!hasSupabaseConfig || !supabase) {
    throw new Error("Supabase admin non configurato. Verifica VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.")
  }
  return supabase
}

function isSiteMode(value: string): value is SiteMode {
  return SITE_MODE_VALUES.includes(value as SiteMode)
}

function toSiteModeError(error: PostgrestError, fallbackMessage: string): Error {
  if (error.code === "23514") {
    return new Error("Modalita sito non valida. Usa normal, maintenance o careers_only.")
  }
  return new Error(error.message || fallbackMessage)
}

export async function loadSiteMode(): Promise<SiteMode> {
  const client = getSupabaseClient()
  const { data, error } = await client
    .from("site_settings")
    .select("key, value")
    .eq("key", SITE_MODE_KEY)
    .maybeSingle()

  if (error) throw toSiteModeError(error, "Impossibile caricare la modalita sito.")
  if (!data) return "normal"

  const value = (data as SiteModeRow).value
  return isSiteMode(value) ? value : "normal"
}

export async function saveSiteMode(siteMode: SiteMode): Promise<SiteMode> {
  const client = getSupabaseClient()
  const { data, error } = await client
    .from("site_settings")
    .upsert(
      {
        key: SITE_MODE_KEY,
        value: siteMode,
      },
      { onConflict: "key" },
    )
    .select("key, value")
    .single()

  if (error) throw toSiteModeError(error, "Impossibile salvare la modalita sito.")

  const value = (data as SiteModeRow).value
  return isSiteMode(value) ? value : "normal"
}
