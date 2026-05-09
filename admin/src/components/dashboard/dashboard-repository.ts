/**
 * Repository read-only per la home dashboard admin.
 *
 * Tutte le query sono best-effort: se Supabase non e' configurato o una
 * sezione fallisce, i grafici si degradano in "Nessun dato disponibile"
 * senza rompere la pagina.
 */
import type { SupabaseClient } from "@supabase/supabase-js"
import { hasSupabaseConfig, supabase } from "../../lib/supabase"

const ITALIAN_SHORT_MONTHS = [
  "Gen",
  "Feb",
  "Mar",
  "Apr",
  "Mag",
  "Giu",
  "Lug",
  "Ago",
  "Set",
  "Ott",
  "Nov",
  "Dic",
]

const SOURCE_FALLBACK_LABEL = "Diretto/Sconosciuto"
const ACTIVE_FUNNEL_STAGES = ["nuovo", "colloquio", "formazione"] as const
type ActiveFunnelStage = (typeof ACTIVE_FUNNEL_STAGES)[number]

export type DashboardStats = {
  newMessagesCount: number
  candidatesTotal: number
  ingestEvents30d: number
}

export type CandidatesPerMonthBucket = {
  monthLabel: string
  monthIso: string
  candidates: number
}

export type CandidateSourceBucket = {
  name: string
  value: number
}

export type CityPipelineBucket = {
  city: string
  nuovo: number
  colloquio: number
  formazione: number
  altro: number
}

export type TrafficMonthBucket = {
  monthLabel: string
  monthIso: string
  visite: number
  ctaClick: number
  formInviati: number
}

export type DashboardData = {
  stats: DashboardStats
  candidatesPerMonth: CandidatesPerMonthBucket[]
  sourceDistribution: CandidateSourceBucket[]
  cityPipeline: CityPipelineBucket[]
  trafficLast3Months: TrafficMonthBucket[]
}

function getSupabaseClient(): SupabaseClient {
  if (!hasSupabaseConfig || !supabase) {
    throw new Error("Supabase admin non configurato. Verifica VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.")
  }
  return supabase
}

function startOfMonthUtc(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
}

function addMonths(date: Date, months: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1))
}

function monthLabel(date: Date): string {
  return ITALIAN_SHORT_MONTHS[date.getUTCMonth()]
}

function monthIsoKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-01`
}

function buildMonthlyBuckets<T>(
  monthsBack: number,
  initial: () => T,
): Array<T & { monthLabel: string; monthIso: string }> {
  const today = startOfMonthUtc(new Date())
  const buckets: Array<T & { monthLabel: string; monthIso: string }> = []
  for (let offset = monthsBack - 1; offset >= 0; offset -= 1) {
    const monthDate = addMonths(today, -offset)
    buckets.push({
      monthLabel: monthLabel(monthDate),
      monthIso: monthIsoKey(monthDate),
      ...initial(),
    })
  }
  return buckets
}

function findBucketForDateIso<T extends { monthIso: string }>(buckets: T[], iso: string): T | undefined {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return undefined
  const key = monthIsoKey(startOfMonthUtc(date))
  return buckets.find((b) => b.monthIso === key)
}

async function loadDashboardStats(client: SupabaseClient): Promise<DashboardStats> {
  const since30dIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [messagesRes, candidatesRes, eventsRes] = await Promise.all([
    client
      .from("contact_messages")
      .select("id", { count: "exact", head: true })
      .eq("status", "nuovo"),
    client
      .from("candidates")
      .select("id", { count: "exact", head: true }),
    client
      .from("analytics_events")
      .select("id", { count: "exact", head: true })
      .gte("occurred_at", since30dIso),
  ])

  return {
    newMessagesCount: messagesRes.error ? 0 : messagesRes.count ?? 0,
    candidatesTotal: candidatesRes.error ? 0 : candidatesRes.count ?? 0,
    ingestEvents30d: eventsRes.error ? 0 : eventsRes.count ?? 0,
  }
}

async function loadCandidatesAggregates(
  client: SupabaseClient,
): Promise<{
  candidatesPerMonth: CandidatesPerMonthBucket[]
  sourceDistribution: CandidateSourceBucket[]
  cityPipeline: CityPipelineBucket[]
}> {
  const sixMonthsAgoIso = addMonths(startOfMonthUtc(new Date()), -5).toISOString()

  // Una sola lettura: serve a tre aggregazioni diverse e mantiene il payload bounded.
  const [candidatesRes, citiesRes] = await Promise.all([
    client
      .from("candidates")
      .select("id, created_at, utm_source, pipeline_stage, city_id")
      .gte("created_at", sixMonthsAgoIso),
    client
      .from("cities")
      .select("id, display_name, is_active, sort_order")
      .order("sort_order", { ascending: true }),
  ])

  const candidates = (candidatesRes.error ? [] : candidatesRes.data ?? []) as Array<{
    id: string
    created_at: string
    utm_source: string | null
    pipeline_stage: string
    city_id: string | null
  }>
  const cities = (citiesRes.error ? [] : citiesRes.data ?? []) as Array<{
    id: string
    display_name: string
    is_active: boolean
    sort_order: number
  }>

  // Aggregato 1 — candidature per mese (ultimi 6 mesi).
  const candidatesPerMonth = buildMonthlyBuckets(6, () => ({ candidates: 0 }))
  for (const c of candidates) {
    const bucket = findBucketForDateIso(candidatesPerMonth, c.created_at)
    if (bucket) bucket.candidates += 1
  }

  // Aggregato 2 — fonte traffico candidature (utm_source) con fallback "Diretto/Sconosciuto".
  const sourceMap = new Map<string, number>()
  for (const c of candidates) {
    const raw = c.utm_source?.trim()
    const key = raw && raw.length > 0 ? raw : SOURCE_FALLBACK_LABEL
    sourceMap.set(key, (sourceMap.get(key) ?? 0) + 1)
  }
  const sourceDistribution = Array.from(sourceMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  // Aggregato 3 — pipeline candidature per citta (dinamica su `cities`).
  const cityIndex = new Map<string, { display_name: string; sort_order: number; is_active: boolean }>()
  for (const city of cities) {
    cityIndex.set(city.id, {
      display_name: city.display_name,
      sort_order: city.sort_order,
      is_active: city.is_active,
    })
  }

  const cityCounters = new Map<
    string,
    { city: string; sortOrder: number; nuovo: number; colloquio: number; formazione: number; altro: number; total: number }
  >()
  for (const c of candidates) {
    if (!c.city_id) continue
    const cityMeta = cityIndex.get(c.city_id)
    if (!cityMeta) continue
    let counter = cityCounters.get(c.city_id)
    if (!counter) {
      counter = {
        city: cityMeta.display_name,
        sortOrder: cityMeta.sort_order,
        nuovo: 0,
        colloquio: 0,
        formazione: 0,
        altro: 0,
        total: 0,
      }
      cityCounters.set(c.city_id, counter)
    }
    counter.total += 1
    if ((ACTIVE_FUNNEL_STAGES as readonly string[]).includes(c.pipeline_stage)) {
      counter[c.pipeline_stage as ActiveFunnelStage] += 1
    } else {
      counter.altro += 1
    }
  }
  const cityPipeline: CityPipelineBucket[] = Array.from(cityCounters.values())
    .filter((c) => c.total > 0)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.city.localeCompare(b.city, "it"))
    .map(({ city, nuovo, colloquio, formazione, altro }) => ({ city, nuovo, colloquio, formazione, altro }))

  return { candidatesPerMonth, sourceDistribution, cityPipeline }
}

async function loadTrafficLast3Months(client: SupabaseClient): Promise<TrafficMonthBucket[]> {
  const buckets = buildMonthlyBuckets(3, () => ({ visite: 0, ctaClick: 0, formInviati: 0 }))
  const sinceIso = buckets[0]?.monthIso ?? new Date().toISOString()

  const { data, error } = await client
    .from("analytics_events")
    .select("event_type, occurred_at")
    .gte("occurred_at", sinceIso)
    .in("event_type", ["page_view", "cta_click", "careers_submit"])

  if (error) return buckets

  for (const row of (data ?? []) as Array<{ event_type: string; occurred_at: string }>) {
    const bucket = findBucketForDateIso(buckets, row.occurred_at)
    if (!bucket) continue
    if (row.event_type === "page_view") bucket.visite += 1
    else if (row.event_type === "cta_click") bucket.ctaClick += 1
    else if (row.event_type === "careers_submit") bucket.formInviati += 1
  }

  return buckets
}

export async function loadDashboardData(): Promise<DashboardData> {
  const client = getSupabaseClient()
  const [stats, candidatesAggs, trafficLast3Months] = await Promise.all([
    loadDashboardStats(client),
    loadCandidatesAggregates(client),
    loadTrafficLast3Months(client),
  ])
  return { stats, ...candidatesAggs, trafficLast3Months }
}
