export const SITE_MODE_VALUES = ["normal", "maintenance", "careers_only"] as const

export type SiteMode = (typeof SITE_MODE_VALUES)[number]

type SiteModeRestRow = {
  value: string
}

export const hasSiteModeRemoteConfig = Boolean(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY,
)

function isSiteMode(value: string): value is SiteMode {
  return SITE_MODE_VALUES.includes(value as SiteMode)
}

export async function loadSiteMode(): Promise<SiteMode> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

  if (!supabaseUrl || !supabaseAnonKey) {
    return "normal"
  }

  try {
    const endpoint = new URL("/rest/v1/site_settings", supabaseUrl)
    endpoint.searchParams.set("select", "value")
    endpoint.searchParams.set("key", "eq.site_mode")
    endpoint.searchParams.set("limit", "1")

    const response = await fetch(endpoint, {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Supabase site_settings responded with ${response.status}`)
    }

    const rows = (await response.json()) as SiteModeRestRow[]
    const value = rows[0]?.value
    return value && isSiteMode(value) ? value : "normal"
  } catch (error) {
    console.warn("Falling back to normal site mode.", error)
    return "normal"
  }
}
