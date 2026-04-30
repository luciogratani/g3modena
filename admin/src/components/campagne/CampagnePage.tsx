import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react"
import {
  BarChart3,
  Check,
  Copy,
  Eye,
  FileCheck,
  FileInput,
  MapPinned,
  MousePointerClick,
  Plus,
  Timer,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const INACTIVE_THRESHOLD_DAYS = 5
const HIDE_SCROLLBAR_CLASS =
  "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
const CAMPAIGN_CARD_CLASS = `flex h-full min-h-0 w-[400px] min-w-[400px] flex-col overflow-y-auto overflow-x-hidden ${HIDE_SCROLLBAR_CLASS}`
const BUILDER_CARD_COLLAPSED_CLASS = `flex h-full min-h-0 w-[160px] min-w-[160px] flex-col overflow-y-auto overflow-x-hidden ${HIDE_SCROLLBAR_CLASS}`
const BUILDER_CARD_EXPANDED_CLASS = `flex h-full min-h-0 w-[400px] min-w-[400px] flex-col overflow-y-auto overflow-x-hidden ${HIDE_SCROLLBAR_CLASS}`

type CampaignMetrics = {
  pageView: number
  ctaClick: number
  formOpen: number
  careersSubmit: number
  candidatesCreated: number
  careersAbandonTotal: number
  avgRegistrationSeconds: number
  conversionByCity: Record<string, number>
}

type CampaignLifecycle = "waiting_data" | "active" | "inactive"

type CampaignRecord = {
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
  creativePreview: string
  metrics: CampaignMetrics
}

type BuilderState = {
  name: string
  subtitle: string
  baseUrl: string
  source: string
  medium: string
  campaign: string
  term: string
  content: string
  cid: string
}

type UrlBuilderParams = {
  baseUrl: string
  source: string
  medium: string
  campaign: string
  term: string
  content: string
  cid: string
}

const EMPTY_METRICS: CampaignMetrics = {
  pageView: 0,
  ctaClick: 0,
  formOpen: 0,
  careersSubmit: 0,
  candidatesCreated: 0,
  careersAbandonTotal: 0,
  avgRegistrationSeconds: 0,
  conversionByCity: {},
}

const SEEDED_CAMPAIGNS: CampaignRecord[] = [
  {
    id: "c1a2b3c4-0000-0000-0000-000000000001",
    name: "Estate Modena 2025",
    subtitle: "Campagna recruiting stagionale",
    startsAt: "2025-06-01",
    firstDataAt: "2025-06-02T08:30:00.000Z",
    lastDataAt: "2026-04-28T10:45:00.000Z",
    cid: "a1f2k9z3",
    baseUrl: "https://g3modena.com/lavora-con-noi",
    utmSource: "instagram",
    utmMedium: "paid_social",
    utmCampaign: "estate_modena_2025",
    utmTerm: "barista_modena",
    utmContent: "video_story_a",
    creativePreview: createSvgPlaceholder("Estate Modena", "#EAE4D9", "#6A5F4B"),
    metrics: {
      pageView: 1940,
      ctaClick: 532,
      formOpen: 248,
      careersSubmit: 66,
      candidatesCreated: 62,
      careersAbandonTotal: 120,
      avgRegistrationSeconds: 276,
      conversionByCity: { modena: 49, sassari: 13 },
    },
  },
  {
    id: "c1a2b3c4-0000-0000-0000-000000000002",
    name: "Autunno Sassari 2025",
    subtitle: "Lead generation camerieri",
    startsAt: "2025-09-01",
    firstDataAt: "2025-09-02T09:15:00.000Z",
    lastDataAt: "2026-04-29T07:15:00.000Z",
    cid: "b4n7m2x8",
    baseUrl: "https://g3modena.com/lavora-con-noi",
    utmSource: "instagram",
    utmMedium: "story",
    utmCampaign: "autunno_sassari_2025",
    utmTerm: "cameriere_sassari",
    utmContent: "carousel_1",
    creativePreview: createSvgPlaceholder("Autunno Sassari", "#EFE6D5", "#7D5930"),
    metrics: {
      pageView: 1260,
      ctaClick: 384,
      formOpen: 172,
      careersSubmit: 49,
      candidatesCreated: 47,
      careersAbandonTotal: 82,
      avgRegistrationSeconds: 301,
      conversionByCity: { sassari: 33, modena: 14 },
    },
  },
  {
    id: "c1a2b3c4-0000-0000-0000-000000000003",
    name: "Primavera 2024",
    subtitle: "Test mercato Modena",
    startsAt: "2024-03-01",
    firstDataAt: "2024-03-04T10:00:00.000Z",
    lastDataAt: "2026-03-30T11:10:00.000Z",
    cid: "c8q5r1w4",
    baseUrl: "https://g3modena.com/lavora-con-noi",
    utmSource: "facebook",
    utmMedium: "paid_social",
    utmCampaign: "primavera_2024",
    utmTerm: "part_time_modena",
    utmContent: "image_static_b",
    creativePreview: createSvgPlaceholder("Primavera", "#DDEED8", "#42613A"),
    metrics: {
      pageView: 980,
      ctaClick: 220,
      formOpen: 94,
      careersSubmit: 21,
      candidatesCreated: 20,
      careersAbandonTotal: 52,
      avgRegistrationSeconds: 334,
      conversionByCity: { modena: 17, sassari: 3 },
    },
  },
]

function getDefaultBaseUrl(): string {
  return (import.meta.env.VITE_PUBLIC_SITE_ORIGIN as string | undefined) ?? "https://g3modena.com"
}

function createSvgPlaceholder(title: string, background: string, textColor: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="640" viewBox="0 0 420 640"><rect width="420" height="640" fill="${background}"/><text x="50%" y="44%" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="700" text-anchor="middle" fill="${textColor}">${title}</text><text x="50%" y="53%" font-family="Arial, Helvetica, sans-serif" font-size="18" text-anchor="middle" fill="${textColor}">Creative</text></svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

function random4(): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789"
  const bytes = crypto.getRandomValues(new Uint8Array(4))
  return Array.from(bytes)
    .map((byte) => alphabet[byte % alphabet.length])
    .join("")
}

function time4(): string {
  return Date.now().toString(36).slice(-4).padStart(4, "0")
}

function generateShortCid(): string {
  return `${random4()}${time4()}`
}

function toPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

function getCampaignLifecycle(campaign: CampaignRecord): CampaignLifecycle {
  if (!campaign.firstDataAt || !campaign.lastDataAt) return "waiting_data"
  const diffMs = Date.now() - new Date(campaign.lastDataAt).getTime()
  if (diffMs > INACTIVE_THRESHOLD_DAYS * 24 * 60 * 60 * 1000) return "inactive"
  return "active"
}

function getLifecycleMeta(status: CampaignLifecycle): { label: string; variant: "secondary" | "outline" } {
  switch (status) {
    case "waiting_data":
      return { label: "No dati", variant: "outline" }
    case "active":
      return { label: "Attiva", variant: "secondary" }
    case "inactive":
      return { label: "Disattiva", variant: "outline" }
  }
}

function buildCampaignUrlFromRecord(campaign: CampaignRecord): string {
  return buildUtmUrl({
    baseUrl: campaign.baseUrl,
    source: campaign.utmSource,
    medium: campaign.utmMedium,
    campaign: campaign.utmCampaign,
    term: campaign.utmTerm,
    content: campaign.utmContent,
    cid: campaign.cid,
  })
}

function buildUtmUrl(state: UrlBuilderParams): string {
  const url = new URL(state.baseUrl.startsWith("http") ? state.baseUrl : `https://${state.baseUrl}`)
  if (state.source) url.searchParams.set("utm_source", state.source)
  if (state.medium) url.searchParams.set("utm_medium", state.medium)
  if (state.campaign) url.searchParams.set("utm_campaign", state.campaign)
  if (state.term) url.searchParams.set("utm_term", state.term)
  if (state.content) url.searchParams.set("utm_content", state.content)
  if (state.cid) url.searchParams.set("cid", state.cid)
  return url.toString()
}

function MetricRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: string
}) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-md border bg-background/70 px-2 py-1.5">
      <span className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className="text-xs font-semibold text-foreground">{value}</span>
    </li>
  )
}

function CampaignCard({ campaign }: { campaign: CampaignRecord }) {
  const [linkCopied, setLinkCopied] = useState(false)
  const lifecycle = getCampaignLifecycle(campaign)
  const lifecycleMeta = getLifecycleMeta(lifecycle)
  const campaignUrl = buildCampaignUrlFromRecord(campaign)
  const canCopyCampaignUrl = lifecycle !== "inactive"
  const formConversionRate =
    campaign.metrics.formOpen > 0 ? campaign.metrics.careersSubmit / campaign.metrics.formOpen : 0
  const visitToConversionRate =
    campaign.metrics.pageView > 0 ? campaign.metrics.careersSubmit / campaign.metrics.pageView : 0

  async function handleCopyCampaignUrl() {
    if (!canCopyCampaignUrl) return
    await navigator.clipboard.writeText(campaignUrl)
    setLinkCopied(true)
    window.setTimeout(() => setLinkCopied(false), 1500)
  }

  return (
    <Card className={`${CAMPAIGN_CARD_CLASS} ${lifecycle === "inactive" ? "bg-muted/50" : ""}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <Dialog>
            <DialogTrigger asChild>
              <button
                type="button"
                className="h-28 w-20 shrink-0 overflow-hidden rounded-md border bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`Apri creativita campagna ${campaign.name}`}
              >
                <img
                  src={campaign.creativePreview}
                  alt={`Creativita campagna ${campaign.name}`}
                  className="h-full w-full object-cover"
                />
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>{campaign.name}</DialogTitle>
                <DialogDescription>Anteprima estesa creativita campagna.</DialogDescription>
              </DialogHeader>
              <img
                src={campaign.creativePreview}
                alt={`Anteprima estesa ${campaign.name}`}
                className="max-h-[70vh] w-full rounded-md object-contain"
              />
            </DialogContent>
          </Dialog>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <CardTitle className="truncate text-lg">{campaign.name}</CardTitle>
                <CardDescription className="line-clamp-1">{campaign.subtitle}</CardDescription>
              </div>
              <Badge variant={lifecycleMeta.variant} className="shrink-0">
                {lifecycleMeta.label}
              </Badge>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Inizio: {new Date(campaign.startsAt).toLocaleDateString("it-IT")}
            </p>
            {campaign.lastDataAt ? (
              <p className="text-xs text-muted-foreground">
                Ultimo dato: {new Date(campaign.lastDataAt).toLocaleDateString("it-IT")}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Nessun dato raccolto</p>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col gap-3">
        <ul className="space-y-2">
          <MetricRow
            icon={<Eye className="size-3.5" />}
            label="Visite landing / page_view"
            value={String(campaign.metrics.pageView)}
          />
          <MetricRow
            icon={<MousePointerClick className="size-3.5" />}
            label="Click CTA"
            value={String(campaign.metrics.ctaClick)}
          />
          <MetricRow
            icon={<FileInput className="size-3.5" />}
            label="Aperture form candidature"
            value={String(campaign.metrics.formOpen)}
          />
          <MetricRow
            icon={<FileCheck className="size-3.5" />}
            label="Submit candidature"
            value={`${campaign.metrics.careersSubmit} (${campaign.metrics.candidatesCreated} create)`}
          />
          <MetricRow
            icon={<TrendingUp className="size-3.5" />}
            label="Tasso conversione form"
            value={toPercent(formConversionRate)}
          />
          <MetricRow
            icon={<BarChart3 className="size-3.5" />}
            label="Tasso visita -> conversione"
            value={toPercent(visitToConversionRate)}
          />
          <MetricRow
            icon={<TrendingDown className="size-3.5" />}
            label="Abbandoni funnel"
            value={String(campaign.metrics.careersAbandonTotal)}
          />
          <MetricRow
            icon={<Timer className="size-3.5" />}
            label="Tempo medio compilazione"
            value={`${Math.round(campaign.metrics.avgRegistrationSeconds)} sec`}
          />
        </ul>

        <div className="space-y-2 pt-3 text-xs">
          <p className="text-xs font-semibold text-foreground">Conversioni per città</p>
          <ul className="space-y-2">
            {Object.entries(campaign.metrics.conversionByCity).length === 0 ? (
              <MetricRow icon={<MapPinned className="size-3.5" />} label="Nessuna città" value="0" />
            ) : (
              Object.entries(campaign.metrics.conversionByCity).map(([citySlug, count]) => (
                <MetricRow
                  key={`${campaign.id}-city-${citySlug}`}
                  icon={<MapPinned className="size-3.5" />}
                  label={citySlug}
                  value={String(count)}
                />
              ))
            )}
          </ul>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void handleCopyCampaignUrl()}
          disabled={!canCopyCampaignUrl}
        >
          {linkCopied ? <Check className="mr-2 size-4" /> : <Copy className="mr-2 size-4" />}
          {linkCopied ? "Link copiato" : "Copia link campagna"}
        </Button>
        <div className="space-y-0.5 border-t pt-3 pb-6 text-xs text-muted-foreground">
            <p className="truncate font-mono">cid: {campaign.cid}</p>
            <p className="truncate font-mono">utm_campaign: {campaign.utmCampaign}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function NewCampaignBuilderCard({ onCreateCampaign }: { onCreateCampaign: (campaign: CampaignRecord) => void }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [createdCampaignUrl, setCreatedCampaignUrl] = useState<string | null>(null)
  const [creativePreview, setCreativePreview] = useState<string | null>(null)
  const [isObjectUrl, setIsObjectUrl] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const [state, setState] = useState<BuilderState>({
    name: "",
    subtitle: "",
    baseUrl: getDefaultBaseUrl(),
    source: "",
    medium: "",
    campaign: "",
    term: "",
    content: "",
    cid: generateShortCid(),
  })

  useEffect(() => {
    return () => {
      if (creativePreview && isObjectUrl) {
        URL.revokeObjectURL(creativePreview)
      }
    }
  }, [creativePreview, isObjectUrl])

  let builtUrl = ""
  try {
    builtUrl = buildUtmUrl(state)
  } catch {
    builtUrl = ""
  }
  const hasRequiredName = state.name.trim().length > 0
  const hasRequiredSubtitle = state.subtitle.trim().length > 0
  const hasRequiredImage = Boolean(creativePreview)
  const hasRequiredBaseUrl = state.baseUrl.trim().length > 0
  const hasRequiredCampaign = state.campaign.trim().length > 0
  const hasRequiredFields =
    hasRequiredName &&
    hasRequiredSubtitle &&
    hasRequiredImage &&
    hasRequiredBaseUrl &&
    hasRequiredCampaign

  async function handleCopy() {
    if (!createdCampaignUrl) return
    await navigator.clipboard.writeText(createdCampaignUrl)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  function onCreativeUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    const objectUrl = URL.createObjectURL(file)
    if (creativePreview && isObjectUrl) {
      URL.revokeObjectURL(creativePreview)
    }
    setCreativePreview(objectUrl)
    setIsObjectUrl(true)
    setCreatedCampaignUrl(null)
    setCopied(false)
  }

  function updateBuilderField<K extends keyof BuilderState>(key: K, value: BuilderState[K]) {
    setState((prev) => ({ ...prev, [key]: value }))
    setCreatedCampaignUrl(null)
    setCopied(false)
  }

  function handleCreateCampaign(): boolean {
    if (!creativePreview || !hasRequiredFields) return false
    const now = new Date()
    const normalizedRecord: CampaignRecord = {
      id: crypto.randomUUID(),
      name: state.name.trim(),
      subtitle: state.subtitle.trim(),
      startsAt: now.toISOString(),
      firstDataAt: null,
      lastDataAt: null,
      cid: state.cid,
      baseUrl: state.baseUrl.trim(),
      utmSource: state.source.trim(),
      utmMedium: state.medium.trim(),
      utmCampaign: state.campaign.trim(),
      utmTerm: state.term.trim(),
      utmContent: state.content.trim(),
      creativePreview,
      metrics: { ...EMPTY_METRICS },
    }
    onCreateCampaign(normalizedRecord)
    setCreatedCampaignUrl(buildCampaignUrlFromRecord(normalizedRecord))
    setCopied(false)
    return true
  }

  function handleCreateAndReset() {
    const created = handleCreateCampaign()
    if (!created) return
  }

  function handleCloseBuilder() {
    setOpen(false)
    setCopied(false)
    setCreatedCampaignUrl(null)
    if (creativePreview && isObjectUrl) {
      URL.revokeObjectURL(creativePreview)
    }
    setCreativePreview(null)
    setIsObjectUrl(false)
    if (inputRef.current) inputRef.current.value = ""
    setState({
      name: "",
      subtitle: "",
      baseUrl: getDefaultBaseUrl(),
      source: "",
      medium: "",
      campaign: "",
      term: "",
      content: "",
      cid: generateShortCid(),
    })
  }

  if (!open) {
    return (
      <Card className={`${BUILDER_CARD_COLLAPSED_CLASS} border-dashed`}>
        <CardContent className="flex h-full items-center justify-center p-4">
          <button
            type="button"
            className="flex h-full w-full items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20 text-muted-foreground hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => setOpen(true)}
            aria-label="Apri generazione link UTM"
          >
            <span className="flex size-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Plus className="size-8" />
            </span>
          </button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={BUILDER_CARD_EXPANDED_CLASS}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg">Generazione link / UTM</CardTitle>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleCloseBuilder}
            aria-label="Chiudi card generazione link"
          >
            <X className="size-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col gap-3">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={onCreativeUpload}
          className="hidden"
          aria-label="Carica creativita campagna"
        />

        <div className="grid gap-1.5">
          <Label htmlFor="builder-preview-image">Immagine anteprima campagna *</Label>
          <button
            id="builder-preview-image"
            type="button"
            onClick={() => inputRef.current?.click()}
            className="h-40 overflow-hidden rounded-lg border bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Carica creativita"
          >
            {creativePreview ? (
              <img src={creativePreview} alt="Creativita nuova campagna" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full items-center justify-center text-xs text-muted-foreground">
                Clicca per caricare creativita
              </span>
            )}
          </button>
          {!hasRequiredImage && (
            <p className="text-xs text-muted-foreground">Campo obbligatorio per creare la card campagna.</p>
          )}
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="builder-name">Nome campagna *</Label>
          <Input
            id="builder-name"
            value={state.name}
            onChange={(event) => updateBuilderField("name", event.target.value)}
            placeholder={`es. Modena ${new Date().getFullYear()}`}
       
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="builder-subtitle">Descrizione breve *</Label>
          <Input
            id="builder-subtitle"
            value={state.subtitle}
            onChange={(event) => updateBuilderField("subtitle", event.target.value)}
            placeholder="es. Recruiting stagionale camerieri"
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="builder-campaign">utm_campaign *</Label>
          <Input
            id="builder-campaign"
            value={state.campaign}
            onChange={(event) => updateBuilderField("campaign", event.target.value)}
            placeholder="es. estate_modena_2026"
          />
        </div>

        <Accordion type="single" collapsible className="rounded-md border px-3">
          <AccordionItem value="advanced" className="border-b-0">
            <AccordionTrigger className="py-3 text-sm">Parametri avanzati</AccordionTrigger>
            <AccordionContent className="space-y-3">
              <div className="grid gap-1.5">
                <Label htmlFor="builder-base-url">Base URL *</Label>
                <Input
                  id="builder-base-url"
                  value={state.baseUrl}
                  onChange={(event) => updateBuilderField("baseUrl", event.target.value)}
                  placeholder="https://g3modena.com/lavora-con-noi"
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="builder-source">utm_source</Label>
                <Input
                  id="builder-source"
                  value={state.source}
                  onChange={(event) => updateBuilderField("source", event.target.value)}
                  placeholder="es. instagram"
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="builder-medium">utm_medium</Label>
                <Input
                  id="builder-medium"
                  value={state.medium}
                  onChange={(event) => updateBuilderField("medium", event.target.value)}
                  placeholder="es. paid_social"
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="builder-term">utm_term</Label>
                <Input
                  id="builder-term"
                  value={state.term}
                  onChange={(event) => updateBuilderField("term", event.target.value)}
                  placeholder="es. barista_modena"
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="builder-content">utm_content</Label>
                <Input
                  id="builder-content"
                  value={state.content}
                  onChange={(event) => updateBuilderField("content", event.target.value)}
                  placeholder="es. video_story_a"
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="builder-cid">cid</Label>
                <Input id="builder-cid" value={state.cid} readOnly className="font-mono text-xs" />
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <div className="grid gap-1.5">
          <Label htmlFor="builder-url">URL finale</Label>
          <Input id="builder-url" value={builtUrl} readOnly className="font-mono text-xs" />
        </div>

        <Button type="button" variant="outline" onClick={() => void handleCopy()} disabled={!createdCampaignUrl}>
          {copied ? <Check className="mr-2 size-4" /> : <Copy className="mr-2 size-4" />}
          {copied ? "URL copiato" : "Copia URL campagna"}
        </Button>
        <Button type="button" onClick={handleCreateAndReset} disabled={!hasRequiredFields}>
          Crea campagna
        </Button>
        {!hasRequiredFields && (
          <p className="text-xs text-muted-foreground pb-6">
            Compila i campi obbligatori (*) per creare la campagna.
          </p>
        )}
        {hasRequiredFields && !createdCampaignUrl && (
          <p className="text-xs text-muted-foreground pb-6">
            Crea prima la campagna, poi puoi copiare il link.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export function CampagnePage() {
  // "Table" dedicata in memoria per la milestone UI (simula la tabella campaigns).
  const [campaignsTable, setCampaignsTable] = useState<CampaignRecord[]>(SEEDED_CAMPAIGNS)

  const orderedCampaigns = useMemo(() => {
    const sorted = [...campaignsTable].sort(
      (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    )
    const waiting = sorted.filter((campaign) => getCampaignLifecycle(campaign) === "waiting_data")
    const active = sorted.filter((campaign) => getCampaignLifecycle(campaign) === "active")
    const inactive = sorted.filter((campaign) => getCampaignLifecycle(campaign) === "inactive")
    return [...waiting, ...active, ...inactive]
  }, [campaignsTable])

  function handleCreateCampaign(campaign: CampaignRecord) {
    setCampaignsTable((previous) => [campaign, ...previous])
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background p-6">
      

      <section aria-labelledby="campagne-cards-heading" className="flex min-h-0 flex-1 flex-col">
      
        <div className={`min-h-0 flex-1 overflow-x-auto overflow-y-hidden pb-2 ${HIDE_SCROLLBAR_CLASS}`}>
          <div className="flex h-full min-w-max items-stretch gap-4">
            <NewCampaignBuilderCard onCreateCampaign={handleCreateCampaign} />
            {orderedCampaigns.map((campaign) => (
              <CampaignCard key={campaign.id} campaign={campaign} />
            ))}
          </div>
        </div>
      </section>

      {/* Nota contesto rimossa dalla UI: metriche mock locali fino al wiring DB/analytics. */}
    </div>
  )
}
