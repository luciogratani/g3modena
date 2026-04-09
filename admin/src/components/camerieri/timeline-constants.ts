import type { CameriereTimelineScale } from "./types"

export const TIMELINE_HEADER_HEIGHT_CLASS = "h-12"
export const TIMELINE_ROW_HEIGHT_CLASS = "h-14"
export const TIMELINE_STICKY_Z_CLASS = "z-20"
export const TIMELINE_GRID_LINE_CLASS = "bg-border/70"
export const TIMELINE_TODAY_LINE_CLASS = "bg-sky-500/90"
export const TIMELINE_DEFAULT_SCALE: CameriereTimelineScale = "1m"

export const TIMELINE_SCALE_DAYS: Record<CameriereTimelineScale, number> = {
  "2w": 14,
  "1m": 28,
  "2m": 56,
  "4m": 112,
}

