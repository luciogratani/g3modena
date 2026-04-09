/**
 * Dedicated state manager for "Nuovo" column filters.
 *
 * Responsibilities:
 * - stores filter values and toolbar visibility preferences;
 * - persists both states to localStorage, scoped by board city;
 * - enforces UX consistency (hidden filter => reset inactive state).
 */
import { useEffect, useState } from "react"
import {
  AGE_FILTER_DEFAULT_MAX,
  AGE_FILTER_DEFAULT_MIN,
  DEFAULT_NEW_COLUMN_FILTER_VISIBILITY,
  getNewColumnFiltersStorageKey,
  getNewColumnFilterVisibilityStorageKey,
  type NewColumnFilters,
  type NewColumnFilterVisibility,
  type NewColumnFilterVisibilityKey,
} from "@/src/components/candidati-board/board-utils"
import type { CandidateCity } from "@/src/data/mockCandidates"

function parseFilterVisibilityStorage(rawValue: string | null): NewColumnFilterVisibility {
  if (!rawValue) return { ...DEFAULT_NEW_COLUMN_FILTER_VISIBILITY }
  try {
    const parsed = JSON.parse(rawValue) as Partial<NewColumnFilterVisibility>
    const defaults = DEFAULT_NEW_COLUMN_FILTER_VISIBILITY
    return {
      auto: typeof parsed.auto === "boolean" ? parsed.auto : defaults.auto,
      eta: typeof parsed.eta === "boolean" ? parsed.eta : defaults.eta,
      esperienza: typeof parsed.esperienza === "boolean" ? parsed.esperienza : defaults.esperienza,
      disponibilitaImmediata:
        typeof parsed.disponibilitaImmediata === "boolean"
          ? parsed.disponibilitaImmediata
          : defaults.disponibilitaImmediata,
      residenzaCittaBoard:
        typeof parsed.residenzaCittaBoard === "boolean"
          ? parsed.residenzaCittaBoard
          : defaults.residenzaCittaBoard,
      lingue: typeof parsed.lingue === "boolean" ? parsed.lingue : defaults.lingue,
    }
  } catch {
    return { ...DEFAULT_NEW_COLUMN_FILTER_VISIBILITY }
  }
}

function getDefaultNewColumnFilters(): NewColumnFilters {
  return {
    auto: false,
    eta: {
      minAge: AGE_FILTER_DEFAULT_MIN,
      maxAge: AGE_FILTER_DEFAULT_MAX,
    },
    esperienza: false,
    disponibilitaImmediata: false,
    residenzaCittaBoard: false,
    lingueParlate: {
      italiano: false,
      inglese: false,
      altro: false,
    },
  }
}

function parseColumnFiltersStorage(rawValue: string | null): NewColumnFilters {
  if (!rawValue) return getDefaultNewColumnFilters()
  const defaults = getDefaultNewColumnFilters()
  try {
    const parsed = JSON.parse(rawValue) as Partial<NewColumnFilters>
    const minAge = parsed.eta?.minAge
    const maxAge = parsed.eta?.maxAge
    return {
      auto: Boolean(parsed.auto),
      eta: {
        minAge: typeof minAge === "number" ? minAge : defaults.eta.minAge,
        maxAge: typeof maxAge === "number" ? maxAge : defaults.eta.maxAge,
      },
      esperienza: Boolean(parsed.esperienza),
      disponibilitaImmediata: Boolean(parsed.disponibilitaImmediata),
      residenzaCittaBoard: Boolean(parsed.residenzaCittaBoard),
      lingueParlate: {
        italiano: Boolean(parsed.lingueParlate?.italiano),
        inglese: Boolean(parsed.lingueParlate?.inglese),
        altro: Boolean(parsed.lingueParlate?.altro),
      },
    }
  } catch {
    return defaults
  }
}

function loadColumnFiltersForCity(boardCity: CandidateCity): NewColumnFilters {
  if (typeof window === "undefined") return getDefaultNewColumnFilters()
  const storageKey = getNewColumnFiltersStorageKey(boardCity)
  return parseColumnFiltersStorage(localStorage.getItem(storageKey))
}

function loadFilterVisibilityForCity(boardCity: CandidateCity): NewColumnFilterVisibility {
  if (typeof window === "undefined") return { ...DEFAULT_NEW_COLUMN_FILTER_VISIBILITY }
  const storageKey = getNewColumnFilterVisibilityStorageKey(boardCity)
  return parseFilterVisibilityStorage(localStorage.getItem(storageKey))
}

export function useNewColumnFilters(boardCity: CandidateCity) {
  const [newColumnFilters, setNewColumnFilters] = useState<NewColumnFilters>(() => loadColumnFiltersForCity(boardCity))
  const [newColumnFilterVisibility, setNewColumnFilterVisibility] = useState<NewColumnFilterVisibility>(
    () => loadFilterVisibilityForCity(boardCity),
  )

  useEffect(() => {
    if (typeof window === "undefined") return
    setNewColumnFilters(loadColumnFiltersForCity(boardCity))
    setNewColumnFilterVisibility(loadFilterVisibilityForCity(boardCity))
  }, [boardCity])

  useEffect(() => {
    if (typeof window === "undefined") return
    const filtersStorageKey = getNewColumnFiltersStorageKey(boardCity)
    localStorage.setItem(filtersStorageKey, JSON.stringify(newColumnFilters))
  }, [boardCity, newColumnFilters])

  useEffect(() => {
    if (typeof window === "undefined") return
    const storageKey = getNewColumnFilterVisibilityStorageKey(boardCity)
    localStorage.setItem(storageKey, JSON.stringify(newColumnFilterVisibility))
  }, [boardCity, newColumnFilterVisibility])

  function handleToggleNewColumnFilter(
    filterKey: "auto" | "esperienza" | "disponibilitaImmediata" | "residenzaCittaBoard",
  ) {
    setNewColumnFilters((currentFilters) => ({
      ...currentFilters,
      [filterKey]: !currentFilters[filterKey],
    }))
  }

  function handleToggleLanguageFilter(languageKey: keyof NewColumnFilters["lingueParlate"]) {
    setNewColumnFilters((currentFilters) => ({
      ...currentFilters,
      lingueParlate: {
        ...currentFilters.lingueParlate,
        [languageKey]: !currentFilters.lingueParlate[languageKey],
      },
    }))
  }

  function handleSetAgeRange(ageRange: { minAge: number | null; maxAge: number | null }) {
    setNewColumnFilters((currentFilters) => ({
      ...currentFilters,
      eta: {
        ...currentFilters.eta,
        minAge: ageRange.minAge,
        maxAge: ageRange.maxAge,
      },
    }))
  }

  function handleToggleFilterVisibility(filterKey: NewColumnFilterVisibilityKey) {
    setNewColumnFilterVisibility((currentVisibility) => {
      const isLastVisibleFilter = currentVisibility[filterKey] && Object.values(currentVisibility).filter(Boolean).length === 1
      const nextValue = isLastVisibleFilter ? true : !currentVisibility[filterKey]
      const nextVisibility = {
        ...currentVisibility,
        [filterKey]: nextValue,
      }

      if (!nextValue) {
        setNewColumnFilters((currentFilters) => {
          if (filterKey === "eta") {
            return {
              ...currentFilters,
              eta: {
                minAge: AGE_FILTER_DEFAULT_MIN,
                maxAge: AGE_FILTER_DEFAULT_MAX,
              },
            }
          }
          if (filterKey === "lingue") {
            return {
              ...currentFilters,
              lingueParlate: {
                italiano: false,
                inglese: false,
                altro: false,
              },
            }
          }
          if (
            filterKey === "auto" ||
            filterKey === "esperienza" ||
            filterKey === "disponibilitaImmediata" ||
            filterKey === "residenzaCittaBoard"
          ) {
            return {
              ...currentFilters,
              [filterKey]: false,
            }
          }
          return currentFilters
        })
      }

      return nextVisibility
    })
  }

  return {
    newColumnFilters,
    newColumnFilterVisibility,
    handleToggleNewColumnFilter,
    handleToggleLanguageFilter,
    handleSetAgeRange,
    handleToggleFilterVisibility,
  }
}
