import { getStoredCampaignAttribution } from "@/lib/campaign-attribution"
import type { CtaKey } from "@/lib/analytics-cta-keys"

export type AnalyticsEventType =
  | "page_view"
  | "cta_click"
  | "careers_form_open"
  | "careers_step_view"
  | "careers_abandon"
  | "careers_submit"

type AnalyticsEventRecord = {
  clientEventId?: string
  eventType: AnalyticsEventType
  occurredAt: string
  sessionId: string
  funnelAttemptId?: string
  formStepIndex?: number
  formFieldKey?: string
  ctaKey?: CtaKey
  citySlug?: string
  cid?: string
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  utmTerm?: string
  utmContent?: string
}

export type { AnalyticsEventRecord }

type TrackAnalyticsEventBaseInput = {
  funnelAttemptId?: string
  formStepIndex?: number
  formFieldKey?: string
  citySlug?: string
}

type TrackAnalyticsEventInput =
  | (TrackAnalyticsEventBaseInput & {
      eventType: "cta_click"
      ctaKey: CtaKey
    })
  | (TrackAnalyticsEventBaseInput & {
      eventType: Exclude<AnalyticsEventType, "cta_click">
      ctaKey?: never
    })

const ANALYTICS_SESSION_ID_KEY = "web:analytics:session-id:v1"
const CAREERS_FUNNEL_ATTEMPT_ID_KEY = "web:analytics:careers:funnel-attempt-id:v1"
const ANALYTICS_BUFFER_KEY = "web:analytics:buffer:v1"
const ANALYTICS_BUFFER_UPDATED_EVENT = "web:analytics:buffer-updated"
const CAREERS_ABANDON_SENT_KEY_PREFIX = "web:analytics:careers:abandon-sent:v1:"
const CAREERS_SUBMIT_SENT_KEY_PREFIX = "web:analytics:careers:submit-sent:v1:"
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

function buildEventIdentityKey(event: AnalyticsEventRecord): string {
  if (event.clientEventId && event.clientEventId.trim()) return `id:${event.clientEventId.trim()}`
  return JSON.stringify({
    eventType: event.eventType,
    occurredAt: event.occurredAt,
    sessionId: event.sessionId,
    funnelAttemptId: event.funnelAttemptId,
    formStepIndex: event.formStepIndex,
    formFieldKey: event.formFieldKey,
    ctaKey: event.ctaKey,
    citySlug: event.citySlug,
    cid: event.cid,
    utmSource: event.utmSource,
    utmMedium: event.utmMedium,
    utmCampaign: event.utmCampaign,
    utmTerm: event.utmTerm,
    utmContent: event.utmContent,
  })
}

function notifyAnalyticsBufferUpdated(addedEvents: number, totalEvents: number): void {
  if (typeof window === "undefined") return
  window.dispatchEvent(
    new CustomEvent(ANALYTICS_BUFFER_UPDATED_EVENT, {
      detail: {
        addedEvents,
        totalEvents,
      },
    })
  )
}

export function getAnalyticsBufferSnapshot(): AnalyticsEventRecord[] {
  return loadBufferedEvents()
}

export function getAnalyticsBufferUpdatedEventName(): string {
  return ANALYTICS_BUFFER_UPDATED_EVENT
}

export function removeAnalyticsEventsFromBuffer(eventsToRemove: AnalyticsEventRecord[]): number {
  if (!eventsToRemove.length) return 0
  const buffered = loadBufferedEvents()
  if (!buffered.length) return 0

  const removals = new Map<string, number>()
  for (const event of eventsToRemove) {
    const key = buildEventIdentityKey(event)
    removals.set(key, (removals.get(key) ?? 0) + 1)
  }

  let removedCount = 0
  const nextBuffer = buffered.filter((event) => {
    const key = buildEventIdentityKey(event)
    const remaining = removals.get(key) ?? 0
    if (remaining <= 0) return true
    removals.set(key, remaining - 1)
    removedCount += 1
    return false
  })

  if (removedCount > 0) {
    saveBufferedEvents(nextBuffer)
    notifyAnalyticsBufferUpdated(0, nextBuffer.length)
  }

  return removedCount
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

function getCareersAttemptFlagKey(prefix: string, funnelAttemptId: string): string {
  return `${prefix}${funnelAttemptId}`
}

function isCareersAttemptFlagSet(prefix: string, funnelAttemptId: string): boolean {
  if (typeof window === "undefined") return false
  if (!funnelAttemptId.trim()) return false
  return (
    window.sessionStorage.getItem(getCareersAttemptFlagKey(prefix, funnelAttemptId)) === "1"
  )
}

function setCareersAttemptFlag(prefix: string, funnelAttemptId: string): void {
  if (typeof window === "undefined") return
  if (!funnelAttemptId.trim()) return
  window.sessionStorage.setItem(getCareersAttemptFlagKey(prefix, funnelAttemptId), "1")
}

type TrackCareersSubmitInput = {
  funnelAttemptId: string
  formStepIndex: number
  citySlug: string
}

type TrackCareersAbandonIfNeededInput = {
  funnelAttemptId: string
  formStepIndex: number
  formFieldKey?: string
}

export function trackCareersSubmit(input: TrackCareersSubmitInput): AnalyticsEventRecord {
  const event = trackAnalyticsEvent({
    eventType: "careers_submit",
    funnelAttemptId: input.funnelAttemptId,
    formStepIndex: input.formStepIndex,
    citySlug: input.citySlug,
  })
  setCareersAttemptFlag(CAREERS_SUBMIT_SENT_KEY_PREFIX, input.funnelAttemptId)
  return event
}

export function trackCareersAbandonIfNeeded(
  input: TrackCareersAbandonIfNeededInput
): AnalyticsEventRecord | null {
  const attemptId = input.funnelAttemptId.trim()
  if (!attemptId) return null
  if (isCareersAttemptFlagSet(CAREERS_SUBMIT_SENT_KEY_PREFIX, attemptId)) return null
  if (isCareersAttemptFlagSet(CAREERS_ABANDON_SENT_KEY_PREFIX, attemptId)) return null

  const event = trackAnalyticsEvent({
    eventType: "careers_abandon",
    funnelAttemptId: attemptId,
    formStepIndex: input.formStepIndex,
    formFieldKey: input.formFieldKey,
  })
  setCareersAttemptFlag(CAREERS_ABANDON_SENT_KEY_PREFIX, attemptId)
  return event
}

export function trackCtaClick(ctaKey: CtaKey): AnalyticsEventRecord {
  return trackAnalyticsEvent({
    eventType: "cta_click",
    ctaKey,
  })
}

export function trackAnalyticsEvent(input: TrackAnalyticsEventInput): AnalyticsEventRecord {
  const attribution = getStoredCampaignAttribution()
  const event: AnalyticsEventRecord = {
    clientEventId: createId(),
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
  notifyAnalyticsBufferUpdated(1, buffered.length)

  if (import.meta.env.DEV) {
    console.info("[analytics/local]", event)
  }

  return event
}
