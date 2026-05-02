/**
 * Tipi dominio campagne (UI admin), allineati a `public.campaigns` e CAMPAIGNS_CONTRACT.md.
 * La pagina può importare da qui agli step successivi per evitare duplicazioni.
 */
export type CampaignMetrics = {
  pageView: number
  ctaClick: number
  formOpen: number
  careersSubmit: number
  candidatesCreated: number
  careersAbandonTotal: number
  avgRegistrationSeconds: number
  conversionByCity: Record<string, number>
}

export const EMPTY_CAMPAIGN_METRICS: CampaignMetrics = {
  pageView: 0,
  ctaClick: 0,
  formOpen: 0,
  careersSubmit: 0,
  candidatesCreated: 0,
  careersAbandonTotal: 0,
  avgRegistrationSeconds: 0,
  conversionByCity: {},
}

/** Allineato a CAMPAIGNS_CONTRACT.md §2 (No dati | Attiva | Disattiva). */
export type CampaignLifecycle = "waiting_data" | "active" | "inactive"

export type CampaignRecord = {
  id: string
  name: string
  subtitle: string
  startsAt: string
  firstDataAt: string | null
  lastDataAt: string | null
  cid: string
  baseUrl: string
  utmSource: string
  utmMedium: string
  utmCampaign: string
  utmTerm: string
  utmContent: string
  /** Path storage o URL preview; signed URL applicato a livello pagina quando serve. */
  creativePreview: string
  metrics: CampaignMetrics
}
