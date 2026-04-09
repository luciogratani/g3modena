import type { LucideIcon } from "lucide-react"
import { Award, Car, Languages, School } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { CameriereTag } from "./types"

const TAG_ORDER: CameriereTag[] = ["automunito", "esperienza", "multilingue", "fuori_sede"]

const TAG_CONFIG: Record<CameriereTag, { icon: LucideIcon; label: string }> = {
  automunito: { icon: Car, label: "Automunito" },
  esperienza: { icon: Award, label: "Esperienza" },
  multilingue: { icon: Languages, label: "Multilingue" },
  fuori_sede: { icon: School, label: "Fuori sede" },
}

type CamerieriTagIconGroupProps = {
  tags: CameriereTag[]
}

/**
 * Icon-only tags (same visual language as CandidateCard attribute badges).
 */
export function CamerieriTagIconGroup({ tags }: CamerieriTagIconGroupProps) {
  const ordered = TAG_ORDER.filter((key) => tags.includes(key))

  if (ordered.length === 0) {
    return <span className="text-xs text-muted-foreground">—</span>
  }

  return (
    <div className="flex min-w-0 shrink items-center gap-1 overflow-hidden">
      {ordered.map((tag) => {
        const { icon: Icon, label } = TAG_CONFIG[tag]
        return (
          <Tooltip key={tag}>
            <TooltipTrigger asChild>
              <Badge variant="outline" aria-label={label} className="h-6 w-6 shrink-0 justify-center p-0">
                <Icon className="size-3.5 shrink-0" />
              </Badge>
            </TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
          </Tooltip>
        )
      })}
    </div>
  )
}
