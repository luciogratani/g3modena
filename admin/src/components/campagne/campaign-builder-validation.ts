/** Allineamento a migrazione `campaigns_*_length_check` e `campaigns_cid_format_check`. */
export const CAMPAIGN_NAME_MAX = 160
export const CAMPAIGN_SUBTITLE_MAX = 280
export const CAMPAIGN_UTM_CAMPAIGN_MAX = 120

/** `^[A-Za-z0-9_-]{4,32}$` sul DB */
export const CAMPAIGN_CID_PATTERN = /^[A-Za-z0-9_-]{4,32}$/

const CID_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-"

/**
 * CID casuale con entropia adeguata; lunghezza 12 ∈ [4, 32].
 */
export function generateCampaignCid(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12))
  let out = ""
  for (const b of bytes) {
    out += CID_ALPHABET[b % CID_ALPHABET.length]
  }
  return out
}

/** `base_url` deve match `^https?://` (CAMPAIGNS_CONTRACT + CHECK DB). */
export function normalizeBaseUrlForCampaign(
  raw: string,
): { ok: true; value: string } | { ok: false; message: string } {
  const t = raw.trim()
  if (!t) return { ok: false, message: "Indica una base URL (campo obbligatorio)." }
  if (!/^https?:\/\//i.test(t)) {
    return { ok: false, message: 'La base URL deve iniziare con "http://" o "https://".' }
  }
  try {
    const parsed = new URL(t)
    return { ok: true, value: parsed.href }
  } catch {
    return { ok: false, message: "Base URL non valida." }
  }
}

export type CampaignBuilderSubmitPayload = {
  name: string
  subtitle: string
  baseUrlRaw: string
  utmCampaign: string
  cid: string
  creativeFile: File | null
}

/** Messaggio errore UI o null se OK. */
export function validateCampaignBuilderSubmit(input: CampaignBuilderSubmitPayload): string | null {
  const name = input.name.trim()
  const subtitle = input.subtitle.trim()
  const uc = input.utmCampaign.trim()

  if (!name) return "Il nome campagna è obbligatorio."
  if (name.length > CAMPAIGN_NAME_MAX)
    return `Il nome è troppo lungo (massimo ${CAMPAIGN_NAME_MAX} caratteri).`

  if (!subtitle) return "La descrizione breve è obbligatoria."
  if (subtitle.length > CAMPAIGN_SUBTITLE_MAX)
    return `La descrizione è troppo lunga (massimo ${CAMPAIGN_SUBTITLE_MAX} caratteri).`

  if (!uc) return "utm_campaign è obbligatorio."
  if (uc.length > CAMPAIGN_UTM_CAMPAIGN_MAX)
    return `utm_campaign è troppo lungo (massimo ${CAMPAIGN_UTM_CAMPAIGN_MAX} caratteri).`

  const base = normalizeBaseUrlForCampaign(input.baseUrlRaw)
  if (!base.ok) return base.message

  if (!input.creativeFile) return "Carica un'immagine di anteprima (JPEG, PNG o WebP)."

  if (!CAMPAIGN_CID_PATTERN.test(input.cid.trim()))
    return "Il codice cid non è nel formato consentito."

  return null
}
