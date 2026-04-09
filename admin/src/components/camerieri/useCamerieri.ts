import { useEffect, useMemo, useState } from "react"
import type { CandidateCity } from "@/src/data/mockCandidates"
import { toSearchableCameriereText } from "./mappers"
import { CAMERIERI_UPDATED_EVENT, ensureDemoCamerieriSeed, getCamerieriForCity } from "./storage"

export type CamerieriActiveFilter = "all" | "active" | "inactive"

/**
 * CRM reader hook for waiters by city.
 * Keeps local list synchronized with localStorage updates and applies lightweight UI filters.
 */
export function useCamerieri(city: CandidateCity) {
  const [items, setItems] = useState(() => getCamerieriForCity(city))
  const [searchQuery, setSearchQuery] = useState("")
  const [activeFilter, setActiveFilter] = useState<CamerieriActiveFilter>("all")

  useEffect(() => {
    function refresh() {
      setItems(getCamerieriForCity(city))
    }

    ensureDemoCamerieriSeed(city)
    refresh()
    window.addEventListener(CAMERIERI_UPDATED_EVENT, refresh)
    window.addEventListener("focus", refresh)
    window.addEventListener("storage", refresh)
    return () => {
      window.removeEventListener(CAMERIERI_UPDATED_EVENT, refresh)
      window.removeEventListener("focus", refresh)
      window.removeEventListener("storage", refresh)
    }
  }, [city])

  const filteredItems = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()
    return items.filter((item) => {
      if (activeFilter === "active" && !item.isActive) return false
      if (activeFilter === "inactive" && item.isActive) return false
      if (!normalizedQuery) return true
      return toSearchableCameriereText(item).includes(normalizedQuery)
    })
  }, [items, searchQuery, activeFilter])

  return {
    items,
    filteredItems,
    searchQuery,
    setSearchQuery,
    activeFilter,
    setActiveFilter,
  }
}
