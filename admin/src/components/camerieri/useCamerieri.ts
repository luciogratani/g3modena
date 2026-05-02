import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { CandidateCitySlug } from "@/src/data/mockCandidates"
import { CITIES_UPDATED_EVENT } from "../cities/storage"
import type { Cameriere } from "./types"
import { toSearchableCameriereText } from "./mappers"
import { STAFF_LIST_INVALIDATION_EVENT } from "./staff-events"
import { listByCitySlug } from "./staff-repository"

export type CamerieriActiveFilter = "all" | "active" | "inactive"

function loadErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Impossibile caricare i camerieri."
}

/**
 * CRM reader hook: lista da `public.staff` tramite repository.
 * Risposta anche a `STAFF_LIST_INVALIDATION_EVENT` (promozioni / migrazioni su `staff`).
 */
export function useCamerieri(city: CandidateCitySlug) {
  const [items, setItems] = useState<Cameriere[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeFilter, setActiveFilter] = useState<CamerieriActiveFilter>("all")

  const loadSeqRef = useRef(0)

  const loadFromRepository = useCallback(async () => {
    const mySeq = ++loadSeqRef.current
    setLoading(true)
    setError(null)
    try {
      const data = await listByCitySlug(city)
      if (mySeq !== loadSeqRef.current) return
      setItems(data)
    } catch (err) {
      if (mySeq !== loadSeqRef.current) return
      setError(loadErrorMessage(err))
      setItems([])
    } finally {
      if (mySeq === loadSeqRef.current) setLoading(false)
    }
  }, [city])

  useEffect(() => {
    void loadFromRepository()
  }, [loadFromRepository])

  useEffect(() => {
    function notifyReload() {
      void loadFromRepository()
    }
    window.addEventListener(STAFF_LIST_INVALIDATION_EVENT, notifyReload)
    window.addEventListener(CITIES_UPDATED_EVENT, notifyReload)
    window.addEventListener("focus", notifyReload)
    window.addEventListener("storage", notifyReload)
    return () => {
      window.removeEventListener(STAFF_LIST_INVALIDATION_EVENT, notifyReload)
      window.removeEventListener(CITIES_UPDATED_EVENT, notifyReload)
      window.removeEventListener("focus", notifyReload)
      window.removeEventListener("storage", notifyReload)
    }
  }, [loadFromRepository])

  const reload = useCallback(() => loadFromRepository(), [loadFromRepository])

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
    loading,
    error,
    reload,
    searchQuery,
    setSearchQuery,
    activeFilter,
    setActiveFilter,
  }
}
