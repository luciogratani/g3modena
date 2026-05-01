import { createClient } from "@supabase/supabase-js"

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey)
export const cmsTableName = import.meta.env.VITE_SUPABASE_CMS_TABLE ?? "cms_sections"
export const cmsTenantSchema = import.meta.env.VITE_TENANT_SCHEMA ?? null

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Supabase env vars (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) are missing. " +
      "Vite loads admin/.env or admin/.env.local only—not .env.example; copy admin/.env.example to admin/.env.",
  )
}

export const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null
