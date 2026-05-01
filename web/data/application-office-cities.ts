export type ApplicationOfficeCity = {
  slug: string
  displayName: string
  sortOrder: number
}

type CityRestRow = {
  slug: string
  display_name: string
  sort_order: number
}

export const fallbackApplicationOfficeCities: ApplicationOfficeCity[] = [
  {
    slug: "modena",
    displayName: "Modena",
    sortOrder: 1,
  },
  {
    slug: "sassari",
    displayName: "Sassari",
    sortOrder: 2,
  },
]

export const applicationOfficeCities = fallbackApplicationOfficeCities

function mapCityRow(row: CityRestRow): ApplicationOfficeCity {
  return {
    slug: row.slug,
    displayName: row.display_name,
    sortOrder: row.sort_order,
  }
}

export async function loadApplicationOfficeCities(): Promise<ApplicationOfficeCity[]> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

  if (!supabaseUrl || !supabaseAnonKey) {
    return fallbackApplicationOfficeCities
  }

  try {
    const endpoint = new URL("/rest/v1/cities", supabaseUrl)
    endpoint.searchParams.set("select", "slug,display_name,sort_order")
    endpoint.searchParams.set("is_active", "eq.true")
    endpoint.searchParams.set("order", "sort_order.asc,slug.asc")

    const response = await fetch(endpoint, {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Supabase cities responded with ${response.status}`)
    }

    const rows = (await response.json()) as CityRestRow[]
    return rows.map(mapCityRow)
  } catch (error) {
    console.warn("Falling back to static application office cities.", error)
    return fallbackApplicationOfficeCities
  }
}
