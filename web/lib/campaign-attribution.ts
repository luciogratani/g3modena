export type CampaignAttribution = {
  cid?: string
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  utmTerm?: string
  utmContent?: string
}

type SerializedCampaignAttributionV1 = {
  version: 1
  data: CampaignAttribution
}

const ATTRIBUTION_STORAGE_KEY = "web:campaign-attribution:v1"

const MAX_VALUE_LENGTH = 150

function sanitizeValue(raw: string | null): string | undefined {
  if (!raw) return undefined
  const normalized = raw.trim()
  if (!normalized) return undefined
  return normalized.slice(0, MAX_VALUE_LENGTH)
}

function sanitizeAttribution(raw: unknown): CampaignAttribution {
  if (!raw || typeof raw !== "object") return {}
  const item = raw as Partial<CampaignAttribution>
  return {
    cid: typeof item.cid === "string" ? sanitizeValue(item.cid) : undefined,
    utmSource: typeof item.utmSource === "string" ? sanitizeValue(item.utmSource) : undefined,
    utmMedium: typeof item.utmMedium === "string" ? sanitizeValue(item.utmMedium) : undefined,
    utmCampaign: typeof item.utmCampaign === "string" ? sanitizeValue(item.utmCampaign) : undefined,
    utmTerm: typeof item.utmTerm === "string" ? sanitizeValue(item.utmTerm) : undefined,
    utmContent: typeof item.utmContent === "string" ? sanitizeValue(item.utmContent) : undefined,
  }
}

function hasAnyAttribution(item: CampaignAttribution): boolean {
  return Boolean(
    item.cid ||
      item.utmSource ||
      item.utmMedium ||
      item.utmCampaign ||
      item.utmTerm ||
      item.utmContent,
  )
}

function readFromSearch(search: string): CampaignAttribution {
  const params = new URLSearchParams(search)
  return {
    cid: sanitizeValue(params.get("cid")),
    utmSource: sanitizeValue(params.get("utm_source")),
    utmMedium: sanitizeValue(params.get("utm_medium")),
    utmCampaign: sanitizeValue(params.get("utm_campaign")),
    utmTerm: sanitizeValue(params.get("utm_term")),
    utmContent: sanitizeValue(params.get("utm_content")),
  }
}

function loadStoredAttribution(): CampaignAttribution {
  if (typeof window === "undefined") return {}
  const rawValue = window.sessionStorage.getItem(ATTRIBUTION_STORAGE_KEY)
  if (!rawValue) return {}
  try {
    const parsed = JSON.parse(rawValue) as Partial<SerializedCampaignAttributionV1>
    if (parsed.version !== 1) return {}
    return sanitizeAttribution(parsed.data)
  } catch {
    return {}
  }
}

function saveStoredAttribution(attribution: CampaignAttribution): void {
  if (typeof window === "undefined") return
  if (!hasAnyAttribution(attribution)) {
    window.sessionStorage.removeItem(ATTRIBUTION_STORAGE_KEY)
    return
  }
  const payload: SerializedCampaignAttributionV1 = {
    version: 1,
    data: attribution,
  }
  window.sessionStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(payload))
}

function mergeAttribution(previous: CampaignAttribution, next: CampaignAttribution): CampaignAttribution {
  return {
    cid: next.cid ?? previous.cid,
    utmSource: next.utmSource ?? previous.utmSource,
    utmMedium: next.utmMedium ?? previous.utmMedium,
    utmCampaign: next.utmCampaign ?? previous.utmCampaign,
    utmTerm: next.utmTerm ?? previous.utmTerm,
    utmContent: next.utmContent ?? previous.utmContent,
  }
}

/**
 * Captures campaign params from current URL and keeps them in session storage
 * so the careers funnel can reuse attribution across step navigation.
 */
export function captureCampaignAttributionFromLocation(): CampaignAttribution {
  if (typeof window === "undefined") return {}
  const fromQuery = readFromSearch(window.location.search)
  const merged = mergeAttribution(loadStoredAttribution(), fromQuery)
  saveStoredAttribution(merged)
  return merged
}

export function getStoredCampaignAttribution(): CampaignAttribution {
  return loadStoredAttribution()
}
