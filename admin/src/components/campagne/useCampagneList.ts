import { useCallback, useEffect, useRef, useState } from "react"
import { loadCampaignsForAdmin } from "./campaigns-repository"
import type { CampaignRecord } from "./types"

function loadErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Impossibile caricare le campagne."
}

/**
 * Lista campagne da `public.campaigns` + signed URL anteprime storage (pattern staff/camerieri).
 */
export function useCampagneList() {
  const [items, setItems] = useState<CampaignRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const loadSeqRef = useRef(0)

  const loadFromRepository = useCallback(async () => {
    const mySeq = ++loadSeqRef.current
    setLoading(true)
    setError(null)
    try {
      const data = await loadCampaignsForAdmin()
      if (mySeq !== loadSeqRef.current) return
      setItems(data)
    } catch (err) {
      if (mySeq !== loadSeqRef.current) return
      setError(loadErrorMessage(err))
      setItems([])
    } finally {
      if (mySeq === loadSeqRef.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadFromRepository()
  }, [loadFromRepository])

  useEffect(() => {
    function notifyReload() {
      void loadFromRepository()
    }
    window.addEventListener("focus", notifyReload)
    return () => window.removeEventListener("focus", notifyReload)
  }, [loadFromRepository])

  const reload = useCallback(() => loadFromRepository(), [loadFromRepository])

  return { items, loading, error, reload }
}
