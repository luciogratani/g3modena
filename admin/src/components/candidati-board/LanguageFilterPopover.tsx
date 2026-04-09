/**
 * Language filter popover for "Nuovo" candidates.
 *
 * Provides a simple multi-select language matcher used by the "Nuovo"
 * filtering pipeline.
 */
import { Languages } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import type { NewColumnFilters } from "./board-utils"

type LanguageFilterPopoverProps = {
  selectedLanguages: NewColumnFilters["lingueParlate"]
  onToggleLanguageFilter: (languageKey: keyof NewColumnFilters["lingueParlate"]) => void
  onOpenFilterSettings: (event: { preventDefault: () => void }) => void
}

export function LanguageFilterPopover({
  selectedLanguages,
  onToggleLanguageFilter,
  onOpenFilterSettings,
}: LanguageFilterPopoverProps) {
  const isLanguageFilterActive = Object.values(selectedLanguages).some(Boolean)

  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                "rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                isLanguageFilterActive && "bg-accent text-foreground",
              )}
              onContextMenu={onOpenFilterSettings}
              aria-label="Filtra per lingue parlate"
            >
              <Languages className="size-4" />
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Filtra per lingue parlate</TooltipContent>
      </Tooltip>
      <PopoverContent className="w-48 p-3" align="end">
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Lingue</p>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={selectedLanguages.italiano} onCheckedChange={() => onToggleLanguageFilter("italiano")} />
            Italiano
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={selectedLanguages.inglese} onCheckedChange={() => onToggleLanguageFilter("inglese")} />
            Inglese
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={selectedLanguages.altro} onCheckedChange={() => onToggleLanguageFilter("altro")} />
            Altro
          </label>
        </div>
      </PopoverContent>
    </Popover>
  )
}
