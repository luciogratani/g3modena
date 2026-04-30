import {
  getAnalyticsBufferSnapshot,
  getAnalyticsBufferUpdatedEventName,
  removeAnalyticsEventsFromBuffer,
  type AnalyticsEventRecord,
} from "@/lib/analytics"

const ANALYTICS_INGEST_URL = import.meta.env.VITE_ANALYTICS_INGEST_URL?.trim() ?? ""
const FLUSH_INTERVAL_MS = 15_000
const FLUSH_DEBOUNCE_MS = 1_500
const MAX_BATCH_SIZE = 25
const FLUSH_AFTER_NEW_EVENTS = 10

type FlushReason = "interval" | "debounced" | "visibilitychange" | "pagehide" | "manual"

type AnalyticsIngestEventPayload = {
  client_event_id?: string
  occurred_at: string
  session_id: string
  event_type: string
  funnel_attempt_id?: string
  form_step_index?: number
  form_field_key?: string
  cta_key?: string
  city_slug?: string
  cid?: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_term?: string
  utm_content?: string
}

type AnalyticsIngestResponse = {
  accepted_event_ids?: string[]
  accepted_count?: number
}

let hasStarted = false
let isFlushing = false
let intervalHandle: number | null = null
let debounceHandle: number | null = null
let queuedEventsSinceFlush = 0

type WindowWithIdleCallback = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => void
}

function isDev(): boolean {
  return import.meta.env.DEV
}

function logDev(message: string, extra?: unknown): void {
  if (!isDev()) return
  if (typeof extra === "undefined") {
    console.info(message)
    return
  }
  console.info(message, extra)
}

function compactString(value: string | undefined): string | undefined {
  if (!value) return undefined
  const compacted = value.trim()
  return compacted.length > 0 ? compacted : undefined
}

function toIngestEvent(event: AnalyticsEventRecord): AnalyticsIngestEventPayload {
  return {
    client_event_id: compactString(event.clientEventId),
    occurred_at: event.occurredAt,
    session_id: event.sessionId,
    event_type: event.eventType,
    funnel_attempt_id: compactString(event.funnelAttemptId),
    form_step_index: event.formStepIndex,
    form_field_key: compactString(event.formFieldKey),
    cta_key: compactString(event.ctaKey),
    city_slug: compactString(event.citySlug),
    cid: compactString(event.cid),
    utm_source: compactString(event.utmSource),
    utm_medium: compactString(event.utmMedium),
    utm_campaign: compactString(event.utmCampaign),
    utm_term: compactString(event.utmTerm),
    utm_content: compactString(event.utmContent),
  }
}

function clearDebounceTimer(): void {
  if (debounceHandle === null) return
  window.clearTimeout(debounceHandle)
  debounceHandle = null
}

function getAcceptedEvents(
  batch: AnalyticsEventRecord[],
  responseBody: AnalyticsIngestResponse | null
): AnalyticsEventRecord[] {
  const acceptedIds = responseBody?.accepted_event_ids?.filter((id) => typeof id === "string") ?? []
  if (acceptedIds.length > 0) {
    const acceptedIdSet = new Set(acceptedIds)
    return batch.filter((event) => event.clientEventId && acceptedIdSet.has(event.clientEventId))
  }

  const acceptedCount =
    typeof responseBody?.accepted_count === "number" && Number.isFinite(responseBody.accepted_count)
      ? Math.max(0, Math.min(batch.length, Math.floor(responseBody.accepted_count)))
      : batch.length

  return batch.slice(0, acceptedCount)
}

async function flushAnalyticsBuffer(reason: FlushReason): Promise<void> {
  if (typeof window === "undefined") return
  if (!ANALYTICS_INGEST_URL) return
  if (isFlushing) return

  const snapshot = getAnalyticsBufferSnapshot()
  if (!snapshot.length) return

  const batch = snapshot.slice(0, MAX_BATCH_SIZE)
  if (!batch.length) return

  isFlushing = true

  try {
    const response = await fetch(ANALYTICS_INGEST_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        events: batch.map(toIngestEvent),
      }),
      keepalive: reason === "visibilitychange" || reason === "pagehide",
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    let parsedBody: AnalyticsIngestResponse | null = null
    if (response.status !== 204) {
      try {
        parsedBody = (await response.json()) as AnalyticsIngestResponse
      } catch {
        parsedBody = null
      }
    }

    const acceptedEvents = getAcceptedEvents(batch, parsedBody)
    const removedCount = removeAnalyticsEventsFromBuffer(acceptedEvents)
    queuedEventsSinceFlush = 0
    logDev("[analytics/ingest] flush ok", {
      reason,
      attempted: batch.length,
      accepted: acceptedEvents.length,
      removed: removedCount,
    })
  } catch (error) {
    logDev("[analytics/ingest] flush failed", {
      reason,
      error,
      queued: snapshot.length,
    })
  } finally {
    isFlushing = false
  }
}

function scheduleDebouncedFlush(): void {
  if (typeof window === "undefined") return
  if (!ANALYTICS_INGEST_URL) return
  clearDebounceTimer()
  debounceHandle = window.setTimeout(() => {
    debounceHandle = null
    const idleWindow = window as WindowWithIdleCallback
    if (typeof idleWindow.requestIdleCallback === "function") {
      idleWindow.requestIdleCallback(() => {
        void flushAnalyticsBuffer("debounced")
      }, { timeout: FLUSH_DEBOUNCE_MS })
      return
    }
    void flushAnalyticsBuffer("debounced")
  }, FLUSH_DEBOUNCE_MS)
}

export function startAnalyticsIngestAdapter(): void {
  if (typeof window === "undefined") return
  if (hasStarted) return
  hasStarted = true

  if (!ANALYTICS_INGEST_URL) {
    logDev("[analytics/ingest] disabled: VITE_ANALYTICS_INGEST_URL not configured")
    return
  }

  const onBufferUpdated = ((event: Event) => {
    const detail = (event as CustomEvent<{ addedEvents?: number }>).detail
    queuedEventsSinceFlush += Math.max(0, detail?.addedEvents ?? 0)

    if (queuedEventsSinceFlush >= FLUSH_AFTER_NEW_EVENTS) {
      void flushAnalyticsBuffer("manual")
      return
    }

    scheduleDebouncedFlush()
  }) as EventListener

  const onVisibilityChange = () => {
    if (document.visibilityState !== "hidden") return
    void flushAnalyticsBuffer("visibilitychange")
  }

  const onPageHide = () => {
    void flushAnalyticsBuffer("pagehide")
  }

  window.addEventListener(getAnalyticsBufferUpdatedEventName(), onBufferUpdated)
  document.addEventListener("visibilitychange", onVisibilityChange)
  window.addEventListener("pagehide", onPageHide)

  intervalHandle = window.setInterval(() => {
    void flushAnalyticsBuffer("interval")
  }, FLUSH_INTERVAL_MS)

  if (getAnalyticsBufferSnapshot().length > 0) {
    scheduleDebouncedFlush()
  }

  if (isDev()) {
    window.addEventListener("beforeunload", () => {
      if (intervalHandle !== null) window.clearInterval(intervalHandle)
      clearDebounceTimer()
      window.removeEventListener(getAnalyticsBufferUpdatedEventName(), onBufferUpdated)
      document.removeEventListener("visibilitychange", onVisibilityChange)
      window.removeEventListener("pagehide", onPageHide)
      intervalHandle = null
    })
  }
}
