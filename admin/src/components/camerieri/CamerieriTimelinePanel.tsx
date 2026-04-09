import {
  addDays,
  atStartOfDay,
  dateToPercent,
  getTimelineRange,
  parseAvailabilityWindowDates,
  windowToSegment,
} from "./timeline-geometry"
import {
  TIMELINE_DEFAULT_SCALE,
  TIMELINE_GRID_LINE_CLASS,
  TIMELINE_HEADER_HEIGHT_CLASS,
  TIMELINE_ROW_HEIGHT_CLASS,
  TIMELINE_STICKY_Z_CLASS,
  TIMELINE_TODAY_LINE_CLASS,
} from "./timeline-constants"
import type { Cameriere, CameriereAvailabilityKind, CameriereAvailabilityWindow } from "./types"

type DemoAvailabilityProfile = "none" | "available_only" | "unavailable_only" | "mixed"

type CamerieriTimelinePanelProps = {
  items: Cameriere[]
}

type DemoAvailabilityWindow = {
  id: string
  start: Date
  end: Date
  kind: CameriereAvailabilityKind
  title?: string
}

function formatWeekLabel(date: Date): string {
  return date.toLocaleDateString("it-IT", { day: "2-digit", month: "short" })
}

function getStableSeed(value: string): number {
  return value.split("").reduce((acc, char, index) => acc + char.charCodeAt(0) * (index + 1), 0)
}

function getDemoAvailabilityProfile(item: Cameriere): DemoAvailabilityProfile | null {
  const sourceId = item.sourceCandidateId
  if (!sourceId?.startsWith("demo-")) return null
  const match = sourceId.match(/demo-(?:modena|sassari)-(\d{2})/)
  if (!match) return null
  const number = Number(match[1])
  if (number >= 1 && number <= 3) return "none"
  if (number >= 4 && number <= 6) return "available_only"
  if (number >= 7 && number <= 9) return "unavailable_only"
  return "mixed"
}

function getDemoAvailabilityWindows(item: Cameriere, rangeStart: Date): DemoAvailabilityWindow[] {
  const seed = getStableSeed(item.id)
  const profile = getDemoAvailabilityProfile(item)
  const firstStartOffset = seed % 8
  const firstLength = 5 + (seed % 3)
  const secondStartOffset = 12 + (seed % 6)
  const secondLength = 4 + (seed % 4)

  if (profile === "none") {
    return []
  }

  const availableWindow: DemoAvailabilityWindow = {
    id: `${item.id}-a`,
    start: addDays(rangeStart, firstStartOffset),
    end: addDays(rangeStart, firstStartOffset + firstLength),
    kind: profile === "unavailable_only" ? "unavailable" : "available",
  }
  const unavailableWindow: DemoAvailabilityWindow = {
    id: `${item.id}-b`,
    start: addDays(rangeStart, secondStartOffset),
    end: addDays(rangeStart, secondStartOffset + secondLength),
    kind: profile === "available_only" ? "available" : "unavailable",
  }

  if (profile === "available_only") return [availableWindow]
  if (profile === "unavailable_only") return [availableWindow]
  if (profile === "mixed") return [availableWindow, unavailableWindow]

  if (item.isActive) return [availableWindow, unavailableWindow]
  return [{ ...availableWindow, kind: "unavailable" }, { ...unavailableWindow, kind: "available" }]
}

function fromPersistedAvailabilityWindows(windows: CameriereAvailabilityWindow[]): DemoAvailabilityWindow[] {
  return windows
    .map((window) => {
      const parsed = parseAvailabilityWindowDates(window)
      if (!parsed) return null
      const title = window.note?.trim()
      return {
        id: window.id,
        start: parsed.start,
        end: parsed.end,
        kind: window.kind,
        ...(title ? { title } : {}),
      } as DemoAvailabilityWindow
    })
    .filter((window): window is DemoAvailabilityWindow => window !== null)
}

function getTimelineWindows(item: Cameriere, rangeStart: Date): DemoAvailabilityWindow[] {
  const persisted = Array.isArray(item.availabilityWindows)
    ? fromPersistedAvailabilityWindows(item.availabilityWindows)
    : []
  if (persisted.length > 0) return persisted
  return getDemoAvailabilityWindows(item, rangeStart)
}

function TimelineWindow({ window, range }: { window: DemoAvailabilityWindow; range: ReturnType<typeof getTimelineRange> }) {
  const segment = windowToSegment({ start: window.start, end: window.end }, range)
  const left = segment.left
  const width = segment.width
  const className =
    window.kind === "available"
      ? "border-emerald-600/70 bg-emerald-500/30"
      : "border-rose-600/70 bg-rose-500/30"

  return (
    <div
      className={`absolute bottom-2 top-2 rounded-sm border ${className}`}
      style={{ left: `${left}%`, width: `${width}%` }}
      title={`${window.kind === "available" ? "Disponibile" : "Non disponibile"} · ${window.start.toLocaleDateString("it-IT")} - ${window.end.toLocaleDateString("it-IT")}${window.title ? ` · ${window.title}` : ""}`}
    />
  )
}

/**
 * Right-side availability timeline (MVP).
 * Shows a 4-week weekly-grid with a visible "today" vertical marker.
 */
export function CamerieriTimelinePanel({ items }: CamerieriTimelinePanelProps) {
  const today = atStartOfDay(new Date())
  const range = getTimelineRange(TIMELINE_DEFAULT_SCALE, today)
  const rangeStart = range.start
  const weeksCount = range.days / 7
  const weekTicks = Array.from({ length: weeksCount + 1 }, (_, index) => addDays(rangeStart, index * 7))
  const todayLeft = dateToPercent(today, range)

  return (
    <div className="h-full min-h-0 bg-background">
      <div className={`sticky top-0 ${TIMELINE_STICKY_Z_CLASS} ${TIMELINE_HEADER_HEIGHT_CLASS} border-b border-border bg-background`}>
        <div className="relative h-full">
          {weekTicks.map((tickDate, index) => {
            const left = (index / weeksCount) * 100
            return (
              <div key={tickDate.toISOString()} className="absolute inset-y-0" style={{ left: `${left}%` }}>
                <div className={`h-full w-px ${TIMELINE_GRID_LINE_CLASS}`} />
                {index < weeksCount ? (
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                    {formatWeekLabel(tickDate)}
                  </span>
                ) : null}
              </div>
            )
          })}
          <div className={`absolute inset-y-0 z-10 w-0.5 ${TIMELINE_TODAY_LINE_CLASS}`} style={{ left: `${todayLeft}%` }} />
        </div>
      </div>

      <div className="min-h-0">
        {items.length === 0 ? (
          <div className={`flex ${TIMELINE_ROW_HEIGHT_CLASS} items-center px-3 text-sm text-muted-foreground`}>
            Nessun cameriere da visualizzare.
          </div>
        ) : (
          items.map((item, rowIndex) => {
            const windows = getTimelineWindows(item, rangeStart)
            return (
              <div
                key={item.id}
                className={`relative ${TIMELINE_ROW_HEIGHT_CLASS} ${rowIndex === items.length - 1 ? "" : "border-b border-border/70"}`}
              >
                {weekTicks.map((tickDate, tickIndex) => {
                  const left = (tickIndex / weeksCount) * 100
                  return <div key={tickDate.toISOString()} className={`absolute inset-y-0 w-px ${TIMELINE_GRID_LINE_CLASS}`} style={{ left: `${left}%` }} />
                })}
                <div className={`absolute inset-y-0 z-10 w-0.5 ${TIMELINE_TODAY_LINE_CLASS}`} style={{ left: `${todayLeft}%` }} />
                {windows.map((window) => (
                  <TimelineWindow key={window.id} window={window} range={range} />
                ))}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
