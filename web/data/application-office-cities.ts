export type ApplicationOfficeCity = {
  slug: string
  displayName: string
  sortOrder: number
}

// Keep this list manually aligned with admin cities until a public `cities` API is available.
export const applicationOfficeCities: ApplicationOfficeCity[] = [
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
