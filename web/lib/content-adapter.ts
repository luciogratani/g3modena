import {
  siteContent,
  type ContactEntry,
  type FooterContent,
  type HeroContent,
  type SeoContent,
  type SectionToggle,
  type SiteContent,
  type WhyG3IconKey,
} from "@/data/site-content"
import { inferMediaType } from "@/lib/media"
import {
  CMS_SECTION,
  CMS_SECTION_TOGGLE,
  CMS_SECTION_TOGGLE_ALIASES,
  normalizeCmsSectionKey,
} from "@g3/content-contract"

export interface SiteSectionRow {
  sectionKey: string
  content: unknown
}

export interface LoadSiteContentParams {
  tenantSchema: string
  fetchSections?: (tenantSchema: string) => Promise<SiteSectionRow[] | null>
}

const allowedWhyG3Icons = new Set<WhyG3IconKey>([
  "clock",
  "crown",
  "users",
  "shield-check",
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value : fallback
}

function asStringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback
  const cleaned = value.filter(
    (item): item is string => typeof item === "string" && item.trim().length > 0
  )
  return cleaned.length > 0 ? cleaned : fallback
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback
}

function normalizeHero(raw: unknown): HeroContent {
  const fallback = siteContent.hero
  if (!isRecord(raw)) return fallback

  const mediaRaw = isRecord(raw.media) ? raw.media : {}
  const mediaSrc = asString(mediaRaw.src, fallback.media.src)
  const mediaType =
    mediaRaw.type === "image" || mediaRaw.type === "video"
      ? mediaRaw.type
      : inferMediaType(mediaSrc)

  const primaryCtaRaw = isRecord(raw.primaryCta) ? raw.primaryCta : {}
  const secondaryCtaRaw = isRecord(raw.secondaryCta) ? raw.secondaryCta : {}

  return {
    media: {
      type: mediaType,
      src: mediaSrc,
      poster: asString(mediaRaw.poster, fallback.media.poster ?? ""),
    },
    title: asString(raw.title, fallback.title),
    subtitle: asString(raw.subtitle, fallback.subtitle),
    primaryCta: {
      label: asString(primaryCtaRaw.label, fallback.primaryCta.label),
      href: asString(primaryCtaRaw.href, fallback.primaryCta.href),
    },
    secondaryCta: {
      label: asString(secondaryCtaRaw.label, fallback.secondaryCta.label),
      href: asString(secondaryCtaRaw.href, fallback.secondaryCta.href),
    },
  }
}

function normalizeAbout(raw: unknown): SiteContent["about"] {
  const fallback = siteContent.about
  if (!isRecord(raw)) return fallback

  const imageRaw = isRecord(raw.image) ? raw.image : {}
  return {
    label: asString(raw.label, fallback.label),
    title: asString(raw.title, fallback.title),
    paragraphs: asStringArray(raw.paragraphs, fallback.paragraphs),
    image: {
      src: asString(imageRaw.src, fallback.image.src),
      alt: asString(imageRaw.alt, fallback.image.alt),
    },
  }
}

function normalizeClients(raw: unknown): SiteContent["clients"] {
  const fallback = siteContent.clients
  if (!isRecord(raw)) return fallback

  const items =
    Array.isArray(raw.items) && raw.items.length > 0
      ? raw.items
          .filter((item): item is Record<string, unknown> => isRecord(item))
          .map((item) => ({
            name: asString(item.name, ""),
            location: asString(item.location, ""),
          }))
          .filter((item) => item.name && item.location)
      : fallback.items

  return {
    label: asString(raw.label, fallback.label),
    title: asString(raw.title, fallback.title),
    items: items.length > 0 ? items : fallback.items,
  }
}

function normalizeWhyG3(raw: unknown): SiteContent["whyG3"] {
  const fallback = siteContent.whyG3
  if (!isRecord(raw)) return fallback

  const reasons =
    Array.isArray(raw.reasons) && raw.reasons.length > 0
      ? raw.reasons
          .filter((item): item is Record<string, unknown> => isRecord(item))
          .map((item) => ({
            icon: allowedWhyG3Icons.has(item.icon as WhyG3IconKey)
              ? (item.icon as WhyG3IconKey)
              : null,
            title: asString(item.title, ""),
            description: asString(item.description, ""),
          }))
          .filter(
            (item): item is { icon: WhyG3IconKey; title: string; description: string } =>
              Boolean(item.icon) && Boolean(item.title) && Boolean(item.description)
          )
      : fallback.reasons

  return {
    label: asString(raw.label, fallback.label),
    title: asString(raw.title, fallback.title),
    reasons: reasons.length > 0 ? reasons : fallback.reasons,
  }
}

function normalizeContactEntries(raw: unknown, fallback: ContactEntry[]): ContactEntry[] {
  if (!Array.isArray(raw) || raw.length === 0) return fallback

  const entries = raw
    .filter((item): item is Record<string, unknown> => isRecord(item))
    .map((item) => {
      const type = item.type === "phone" || item.type === "email" ? item.type : null
      if (!type) return null
      const label = asString(item.label, "")
      const href = asString(item.href, "")
      if (!label || !href) return null
      return { type, label, href }
    })
    .filter((entry): entry is ContactEntry => Boolean(entry))

  return entries.length > 0 ? entries : fallback
}

function normalizeFooter(raw: unknown): FooterContent {
  const fallback = siteContent.footer
  if (!isRecord(raw)) return fallback

  const contactRaw = isRecord(raw.contact) ? raw.contact : {}
  const legalRaw = isRecord(raw.legal) ? raw.legal : {}

  return {
    contact: {
      name: asString(contactRaw.name, fallback.contact.name),
      role: asString(contactRaw.role, fallback.contact.role),
      entries: normalizeContactEntries(contactRaw.entries, fallback.contact.entries),
    },
    legal: {
      companyName: asString(legalRaw.companyName, fallback.legal.companyName),
      address: asString(legalRaw.address, fallback.legal.address),
      vatId: asString(legalRaw.vatId, fallback.legal.vatId),
    },
  }
}

function normalizeSectionToggle(raw: unknown, fallback: SectionToggle): SectionToggle {
  if (typeof raw === "boolean") return { enabled: raw }
  if (!isRecord(raw)) return fallback
  return { enabled: asBoolean(raw.enabled, fallback.enabled) }
}

function normalizeSeo(raw: unknown): SeoContent {
  const fallback = siteContent.seo
  if (!isRecord(raw)) return fallback
  return {
    metaTitle: asString(raw.metaTitle, fallback.metaTitle),
    metaDescription: asString(raw.metaDescription, fallback.metaDescription),
    canonicalUrl: asString(raw.canonicalUrl, fallback.canonicalUrl),
    ogTitle: asString(raw.ogTitle, fallback.ogTitle),
    ogDescription: asString(raw.ogDescription, fallback.ogDescription),
    ogImageUrl: asString(raw.ogImageUrl, fallback.ogImageUrl),
    robotsIndex: asBoolean(raw.robotsIndex, fallback.robotsIndex),
    robotsFollow: asBoolean(raw.robotsFollow, fallback.robotsFollow),
  }
}

function normalizeSections(raw: unknown): SiteContent["sections"] {
  const fallback = siteContent.sections
  if (!isRecord(raw)) return fallback

  const [contactCanonical, contactLegacy] = CMS_SECTION_TOGGLE_ALIASES[CMS_SECTION_TOGGLE.contactForm]
  const [careersCanonical, careersLegacy] = CMS_SECTION_TOGGLE_ALIASES[CMS_SECTION_TOGGLE.careersForm]

  const contactRaw = raw[contactCanonical] ?? raw[contactLegacy]
  const careersRaw = raw[careersCanonical] ?? raw[careersLegacy]

  return {
    contactForm: normalizeSectionToggle(contactRaw, fallback.contactForm),
    careersForm: normalizeSectionToggle(careersRaw, fallback.careersForm),
  }
}

export function adaptSiteContent(rows: SiteSectionRow[] | null | undefined): SiteContent {
  if (!rows || rows.length === 0) return siteContent

  const sectionMap = new Map<string, unknown>()
  for (const row of rows) {
    if (!row?.sectionKey) continue
    const normalizedSectionKey = normalizeCmsSectionKey(row.sectionKey)
    if (normalizedSectionKey) {
      sectionMap.set(normalizedSectionKey, row.content)
      continue
    }
    sectionMap.set(row.sectionKey, row.content)
  }

  return {
    hero: normalizeHero(sectionMap.get(CMS_SECTION.hero)),
    about: normalizeAbout(sectionMap.get(CMS_SECTION.about)),
    clients: normalizeClients(sectionMap.get(CMS_SECTION.clients)),
    whyG3: normalizeWhyG3(sectionMap.get(CMS_SECTION.whyG3)),
    footer: normalizeFooter(sectionMap.get(CMS_SECTION.footer)),
    seo: normalizeSeo(sectionMap.get("seo")),
    sections: normalizeSections(
      sectionMap.get(CMS_SECTION.sections) ?? {
        [CMS_SECTION_TOGGLE.contactForm]:
          sectionMap.get(CMS_SECTION_TOGGLE_ALIASES[CMS_SECTION_TOGGLE.contactForm][1]) ??
          sectionMap.get(CMS_SECTION_TOGGLE.contactForm) ??
          undefined,
        [CMS_SECTION_TOGGLE.careersForm]:
          sectionMap.get(CMS_SECTION_TOGGLE_ALIASES[CMS_SECTION_TOGGLE.careersForm][1]) ??
          sectionMap.get(CMS_SECTION_TOGGLE.careersForm) ??
          undefined,
      }
    ),
  }
}

/**
 * Loader pronto per l'integrazione Supabase:
 * - tenantSchema identifica il cliente (single DB, schema separati)
 * - fetchSections verra collegato al client Supabase
 */
export async function loadSiteContent({
  tenantSchema,
  fetchSections,
}: LoadSiteContentParams): Promise<SiteContent> {
  if (!fetchSections) return siteContent

  try {
    const rows = await fetchSections(tenantSchema)
    return adaptSiteContent(rows)
  } catch {
    return siteContent
  }
}
