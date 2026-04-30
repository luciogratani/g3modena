import { getStoredCampaignAttribution } from "@/lib/campaign-attribution"

export type AnalyticsEventType =
  | "page_view"
  | "cta_click"
  | "careers_form_open"
  | "careers_step_view"
  | "careers_abandon"
  | "careers_submit"

type AnalyticsEventRecord = {
  eventType: AnalyticsEventType
  occurredAt: string
  sessionId: string
  funnelAttemptId?: string
  formStepIndex?: number
  formFieldKey?: string
  ctaKey?: string
  citySlug?: string
  cid?: string
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  utmTerm?: string
  utmContent?: string
}

type TrackAnalyticsEventInput = {
  eventType: AnalyticsEventType
  funnelAttemptId?: string
  formStepIndex?: number
  formFieldKey?: string
  ctaKey?: string
  citySlug?: string
}

const ANALYTICS_SESSION_ID_KEY = "web:analytics:session-id:v1"
const CAREERS_FUNNEL_ATTEMPT_ID_KEY = "web:analytics:careers:funnel-attempt-id:v1"
const ANALYTICS_BUFFER_KEY = "web:analytics:buffer:v1"
const ANALYTICS_BUFFER_MAX_ITEMS = 200

function createId(): string {
  return crypto.randomUUID()
}

function loadBufferedEvents(): AnalyticsEventRecord[] {
  if (typeof window === "undefined") return []
  const rawValue = window.sessionStorage.getItem(ANALYTICS_BUFFER_KEY)
  if (!rawValue) return []
  try {
    const parsed = JSON.parse(rawValue) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item): item is AnalyticsEventRecord => Boolean(item && typeof item === "object"))
  } catch {
    return []
  }
}

function saveBufferedEvents(events: AnalyticsEventRecord[]): void {
  if (typeof window === "undefined") return
  window.sessionStorage.setItem(ANALYTICS_BUFFER_KEY, JSON.stringify(events.slice(-ANALYTICS_BUFFER_MAX_ITEMS)))
}

export function getAnalyticsBufferSnapshot(): AnalyticsEventRecord[] {
  return loadBufferedEvents()
}

export function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return createId()
  const existing = window.sessionStorage.getItem(ANALYTICS_SESSION_ID_KEY)
  if (existing && existing.trim()) return existing
  const created = createId()
  window.sessionStorage.setItem(ANALYTICS_SESSION_ID_KEY, created)
  return created
}

export function getOrCreateCareersFunnelAttemptId(): string {
  if (typeof window === "undefined") return createId()
  const existing = window.sessionStorage.getItem(CAREERS_FUNNEL_ATTEMPT_ID_KEY)
  if (existing && existing.trim()) return existing
  const created = createId()
  window.sessionStorage.setItem(CAREERS_FUNNEL_ATTEMPT_ID_KEY, created)
  return created
}

export function clearCareersFunnelAttemptId(): void {
  if (typeof window === "undefined") return
  window.sessionStorage.removeItem(CAREERS_FUNNEL_ATTEMPT_ID_KEY)
}

export function trackAnalyticsEvent(input: TrackAnalyticsEventInput): AnalyticsEventRecord {
  const attribution = getStoredCampaignAttribution()
  const event: AnalyticsEventRecord = {
    eventType: input.eventType,
    occurredAt: new Date().toISOString(),
    sessionId: getOrCreateSessionId(),
    funnelAttemptId: input.funnelAttemptId,
    formStepIndex: input.formStepIndex,
    formFieldKey: input.formFieldKey,
    ctaKey: input.ctaKey,
    citySlug: input.citySlug,
    cid: attribution.cid,
    utmSource: attribution.utmSource,
    utmMedium: attribution.utmMedium,
    utmCampaign: attribution.utmCampaign,
    utmTerm: attribution.utmTerm,
    utmContent: attribution.utmContent,
  }

  const buffered = [...loadBufferedEvents(), event]
  saveBufferedEvents(buffered)

  if (import.meta.env.DEV) {
    console.info("[analytics/local]", event)
  }

  return event
}
