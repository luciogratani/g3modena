import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const SCORE_META = {
  1: { label: "Molto basso", className: "bg-rose-500/10 text-rose-700 border-rose-600/30 dark:text-rose-300" },
  2: { label: "Basso", className: "bg-orange-500/10 text-orange-700 border-orange-600/30 dark:text-orange-300" },
  3: { label: "Medio", className: "bg-amber-500/10 text-amber-700 border-amber-600/30 dark:text-amber-300" },
  4: { label: "Buono", className: "bg-sky-500/10 text-sky-700 border-sky-600/30 dark:text-sky-300" },
  5: { label: "Ottimo", className: "bg-emerald-500/10 text-emerald-700 border-emerald-600/30 dark:text-emerald-300" },
} as const

function getScoreMeta(score: number) {
  const normalizedScore = Math.max(1, Math.min(5, Math.round(score))) as 1 | 2 | 3 | 4 | 5
  return SCORE_META[normalizedScore]
}

export function ScoreBadge({ score }: { score: number }) {
  const meta = getScoreMeta(score)
  return (
    <Badge variant="outline" className={cn("border font-medium", meta.className)}>
      Score {score}/5 - {meta.label}
    </Badge>
  )
}

