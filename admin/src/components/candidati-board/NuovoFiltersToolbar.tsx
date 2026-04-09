/**
 * Toolbar for "Nuovo" column filters.
 *
 * Responsibilities:
 * - renders quick filter buttons;
 * - exposes filter-visibility settings via context-menu entry point;
 * - composes dedicated popovers (age, language, settings).
 *
 * Note:
 * - this component is UI-focused; filter state/persistence lives in hooks.
 */
import { useState } from "react"
import { Award, Car, MapPin, Zap } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import {
  AGE_FILTER_DEFAULT_MAX,
  AGE_FILTER_DEFAULT_MIN,
  type NewColumnFilters,
  type NewColumnFilterVisibility,
  type NewColumnFilterVisibilityKey,
} from "./board-utils"
import { AgeFilterPopover } from "./AgeFilterPopover"
import { LanguageFilterPopover } from "./LanguageFilterPopover"
import { NuovoFilterSettingsPopover } from "./NuovoFilterSettingsPopover"

type NuovoFiltersToolbarProps = {
  filters: NewColumnFilters
  filterVisibility: NewColumnFilterVisibility
  onToggleFilter: (filterKey: "auto" | "esperienza" | "disponibilitaImmediata" | "residenzaCittaBoard") => void
  onSetAgeRange: (ageRange: { minAge: number | null; maxAge: number | null }) => void
  onToggleLanguageFilter: (languageKey: keyof NewColumnFilters["lingueParlate"]) => void
  onToggleFilterVisibility: (filterKey: NewColumnFilterVisibilityKey) => void
}

const MIN_FILTER_AGE = AGE_FILTER_DEFAULT_MIN
const MAX_FILTER_AGE = AGE_FILTER_DEFAULT_MAX

export function NuovoFiltersToolbar({
  filters,
  filterVisibility,
  onToggleFilter,
  onSetAgeRange,
  onToggleLanguageFilter,
  onToggleFilterVisibility,
}: NuovoFiltersToolbarProps) {
  const [filterSettingsOpen, setFilterSettingsOpen] = useState(false)
  const showLanguageFilter = filterVisibility.lingue
  const selectedMinAge = typeof filters.eta.minAge === "number" ? filters.eta.minAge : MIN_FILTER_AGE
  const selectedMaxAge = typeof filters.eta.maxAge === "number" ? filters.eta.maxAge : MAX_FILTER_AGE
  const isAgeFilterActive = selectedMinAge !== MIN_FILTER_AGE || selectedMaxAge !== MAX_FILTER_AGE

  function handleFilterSettingsContextMenu(event: { preventDefault: () => void }) {
    event.preventDefault()
    setFilterSettingsOpen(true)
  }

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1 pr-1">
        <NuovoFilterSettingsPopover
          open={filterSettingsOpen}
          onOpenChange={setFilterSettingsOpen}
          filterVisibility={filterVisibility}
          onToggleFilterVisibility={onToggleFilterVisibility}
        />
        {filterVisibility.auto ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className={cn(
                  "rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                  filters.auto && "bg-accent text-foreground",
                )}
                onClick={() => onToggleFilter("auto")}
                onContextMenu={handleFilterSettingsContextMenu}
                aria-label="Filtra candidati con auto"
              >
                <Car className="size-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Candidati con auto</TooltipContent>
          </Tooltip>
        ) : null}
        {filterVisibility.eta ? (
          <AgeFilterPopover
            minAge={selectedMinAge}
            maxAge={selectedMaxAge}
            defaultMinAge={MIN_FILTER_AGE}
            defaultMaxAge={MAX_FILTER_AGE}
            isActive={isAgeFilterActive}
            onSetAgeRange={onSetAgeRange}
            onOpenFilterSettings={handleFilterSettingsContextMenu}
          />
        ) : null}
        {filterVisibility.esperienza ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className={cn(
                  "rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                  filters.esperienza && "bg-accent text-foreground",
                )}
                onClick={() => onToggleFilter("esperienza")}
                onContextMenu={handleFilterSettingsContextMenu}
                aria-label="Filtra candidati con esperienza"
              >
                <Award className="size-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Candidati con esperienza</TooltipContent>
          </Tooltip>
        ) : null}
        {filterVisibility.disponibilitaImmediata ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className={cn(
                  "rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                  filters.disponibilitaImmediata && "bg-accent text-foreground",
                )}
                onClick={() => onToggleFilter("disponibilitaImmediata")}
                onContextMenu={handleFilterSettingsContextMenu}
                aria-label="Filtra candidati con disponibilita immediata"
              >
                <Zap className="size-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Disponibilita immediata</TooltipContent>
          </Tooltip>
        ) : null}
        {filterVisibility.residenzaCittaBoard ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className={cn(
                  "rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                  filters.residenzaCittaBoard && "bg-accent text-foreground",
                )}
                onClick={() => onToggleFilter("residenzaCittaBoard")}
                onContextMenu={handleFilterSettingsContextMenu}
                aria-label="Filtra residenti nella citta della board"
              >
                <MapPin className="size-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Residenti nella citta della board</TooltipContent>
          </Tooltip>
        ) : null}
        {showLanguageFilter && (
          <LanguageFilterPopover
            selectedLanguages={filters.lingueParlate}
            onToggleLanguageFilter={onToggleLanguageFilter}
            onOpenFilterSettings={handleFilterSettingsContextMenu}
          />
        )}
      </div>
    </TooltipProvider>
  )
}
