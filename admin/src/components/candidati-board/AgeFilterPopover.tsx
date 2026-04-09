/**
 * Age range popover for "Nuovo" candidates.
 *
 * Note:
 * - the age filter is considered active only when range differs from defaults;
 * - this component only edits range values, activation derives from state.
 */
import { Filter } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Slider } from "@/components/ui/slider"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

type AgeFilterPopoverProps = {
  minAge: number
  maxAge: number
  defaultMinAge: number
  defaultMaxAge: number
  isActive: boolean
  onSetAgeRange: (ageRange: { minAge: number | null; maxAge: number | null }) => void
  onOpenFilterSettings: (event: { preventDefault: () => void }) => void
}

export function AgeFilterPopover({
  minAge,
  maxAge,
  defaultMinAge,
  defaultMaxAge,
  isActive,
  onSetAgeRange,
  onOpenFilterSettings,
}: AgeFilterPopoverProps) {
  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                "rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                isActive && "bg-accent text-foreground",
              )}
              onContextMenu={onOpenFilterSettings}
              aria-label="Filtra per età"
            >
              <Filter className="size-4" />
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Filtro età</TooltipContent>
      </Tooltip>
      <PopoverContent className="w-72 space-y-4 p-3" align="end">
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Età minima</span>
              <span>{minAge}</span>
            </div>
            <Slider
              value={[minAge]}
              min={defaultMinAge}
              max={defaultMaxAge}
              step={1}
              onValueChange={(values) => {
                const nextMinAge = values[0]
                if (typeof nextMinAge !== "number") return
                onSetAgeRange({
                  minAge: nextMinAge,
                  maxAge,
                })
              }}
              aria-label="Età minima"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Età massima</span>
              <span>{maxAge}</span>
            </div>
            <Slider
              value={[maxAge]}
              min={defaultMinAge}
              max={defaultMaxAge}
              step={1}
              onValueChange={(values) => {
                const nextMaxAge = values[0]
                if (typeof nextMaxAge !== "number") return
                onSetAgeRange({
                  minAge,
                  maxAge: nextMaxAge,
                })
              }}
              aria-label="Età massima"
            />
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Attivo solo quando il range è diverso da {defaultMinAge}-{defaultMaxAge}.
        </p>
      </PopoverContent>
    </Popover>
  )
}
