/**
 * Headers richiesti dal gateway Supabase per invocare Edge Functions da browser
 * (evita 401 `UNAUTHORIZED_NO_AUTH_HEADER`). La anon key è già pubblica nel client.
 */
export function requireSupabaseEdgeInvokeHeaders(): HeadersInit {
  const apiKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()
  if (!apiKey) {
    throw new Error(
      "Chiave anon Supabase mancante (VITE_SUPABASE_ANON_KEY): necessaria per inviare il modulo alle Edge Functions.",
    )
  }
  return {
    apikey: apiKey,
    Authorization: `Bearer ${apiKey}`,
  }
}
