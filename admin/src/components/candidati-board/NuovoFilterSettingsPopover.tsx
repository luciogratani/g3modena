/**
 * Visibility settings popover for "Nuovo" toolbar filters.
 *
 * Provides a compact checklist used to show/hide filter controls in the
 * toolbar, while keeping behavior consistent with persisted preferences.
 */
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { NewColumnFilterVisibility, NewColumnFilterVisibilityKey } from "./board-utils"

type NuovoFilterSettingsPopoverProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  filterVisibility: NewColumnFilterVisibility
  onToggleFilterVisibility: (filterKey: NewColumnFilterVisibilityKey) => void
}

export function NuovoFilterSettingsPopover({
  open,
  onOpenChange,
  filterVisibility,
  onToggleFilterVisibility,
}: NuovoFilterSettingsPopoverProps) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="pointer-events-none absolute left-3 top-3 size-0 opacity-0"
          aria-hidden="true"
          tabIndex={-1}
        />
      </PopoverTrigger>
      <PopoverContent className="w-72 space-y-4 p-3" align="start">
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Mostra in toolbar</p>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={filterVisibility.auto} onCheckedChange={() => onToggleFilterVisibility("auto")} />
            Candidati con auto
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={filterVisibility.eta} onCheckedChange={() => onToggleFilterVisibility("eta")} />
            Età
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={filterVisibility.esperienza} onCheckedChange={() => onToggleFilterVisibility("esperienza")} />
            Esperienza
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={filterVisibility.disponibilitaImmediata}
              onCheckedChange={() => onToggleFilterVisibility("disponibilitaImmediata")}
            />
            Disponibilità immediata
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={filterVisibility.residenzaCittaBoard}
              onCheckedChange={() => onToggleFilterVisibility("residenzaCittaBoard")}
            />
            Residenza città board
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={filterVisibility.lingue} onCheckedChange={() => onToggleFilterVisibility("lingue")} />
            Lingue
          </label>
        </div>
      </PopoverContent>
    </Popover>
  )
}
