export const CMS_SECTION = {
  hero: "hero",
  about: "about",
  clients: "clients",
  whyG3: "why_g3",
  footer: "footer",
  sections: "sections",
} as const

export type CmsSectionKey = (typeof CMS_SECTION)[keyof typeof CMS_SECTION]

export const CMS_SECTION_KEYS: CmsSectionKey[] = [
  CMS_SECTION.hero,
  CMS_SECTION.about,
  CMS_SECTION.clients,
  CMS_SECTION.whyG3,
  CMS_SECTION.footer,
  CMS_SECTION.sections,
]

const CMS_SECTION_KEY_SET = new Set<CmsSectionKey>(CMS_SECTION_KEYS)

export const CMS_SECTION_KEY_ALIASES: Record<string, CmsSectionKey> = {
  whyG3: CMS_SECTION.whyG3,
  "why-g3": CMS_SECTION.whyG3,
}

export function normalizeCmsSectionKey(raw: string | null | undefined): CmsSectionKey | null {
  if (!raw || typeof raw !== "string") return null
  const normalized = raw.trim()
  if (!normalized) return null
  if (CMS_SECTION_KEY_SET.has(normalized as CmsSectionKey)) return normalized as CmsSectionKey
  return CMS_SECTION_KEY_ALIASES[normalized] ?? null
}

export const CMS_SECTION_TOGGLE = {
  contactForm: "contactForm",
  careersForm: "careersForm",
} as const

export type CmsSectionToggleKey = (typeof CMS_SECTION_TOGGLE)[keyof typeof CMS_SECTION_TOGGLE]

export const CMS_SECTION_TOGGLE_ALIASES: Record<CmsSectionToggleKey, readonly string[]> = {
  contactForm: ["contactForm", "contact_form"],
  careersForm: ["careersForm", "careers_form"],
}
