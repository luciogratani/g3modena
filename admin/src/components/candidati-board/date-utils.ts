import { format, parseISO } from "date-fns"
import { it } from "date-fns/locale"
import type { Candidate } from "@/src/data/mockCandidates"

export function parseSafeDate(value: string | undefined | null): Date | null {
  if (!value || typeof value !== "string") return null
  const parsed = parseISO(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed
}

function parseSafeDateOnly(value: string | undefined | null): Date | null {
  if (!value || typeof value !== "string") return null
  const parsed = parseISO(`${value}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return null
  parsed.setHours(0, 0, 0, 0)
  return parsed
}

export function formatCandidateDate(
  value: string | undefined | null,
  dateFormat: string,
  fallback = "Data non valida",
): string {
  const parsed = parseSafeDate(value)
  if (!parsed) return fallback
  return format(parsed, dateFormat, { locale: it })
}

export type PostponeBadge = { label: string; className: string }

export function getPostponeBadge(candidate: Candidate): PostponeBadge | null {
  const postponeDate = parseSafeDateOnly(candidate.postponedUntil)
  if (!candidate.postponedUntil) return null
  if (!postponeDate) return { label: "Rimandata", className: "" }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (postponeDate > today) return { label: "Rimandata", className: "" }

  const label = format(postponeDate, "d MMM", { locale: it })

  if (postponeDate.getTime() === today.getTime()) {
    return { label, className: "bg-black text-white border-black hover:bg-black hover:text-white" }
  }
  return {
    label,
    className:
      "bg-destructive text-destructive-foreground border-destructive hover:bg-destructive hover:text-destructive-foreground",
  }
}

export function getInAttesaCounterClassName(candidates: Candidate[]): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let hasPast = false
  let hasToday = false

  for (const candidate of candidates) {
    const postponeDate = parseSafeDateOnly(candidate.postponedUntil)
    if (!postponeDate) continue
    if (postponeDate.getTime() < today.getTime()) hasPast = true
    else if (postponeDate.getTime() === today.getTime()) hasToday = true
  }

  if (hasPast) {
    return "bg-destructive text-destructive-foreground border-destructive hover:bg-destructive hover:text-destructive-foreground"
  }
  if (hasToday) return "bg-black text-white border-black hover:bg-black hover:text-white"
  return ""
}

