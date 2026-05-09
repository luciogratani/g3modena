import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react"
import {
  BarChart3,
  Check,
  Copy,
  Eye,
  FileCheck,
  FileInput,
  Loader2,
  MapPinned,
  MousePointerClick,
  Plus,
  Timer,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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
import { Skeleton } from "@/components/ui/skeleton"
import {
  generateCampaignCid,
  normalizeBaseUrlForCampaign,
  validateCampaignBuilderSubmit,
} from "./campaign-builder-validation"
import {
  getCampaignLifecycle,
  insertCampaign,
  isCampaignCidConflictError,
  uploadCampaignCreative,
} from "./campaigns-repository"
import type { CampaignLifecycle, CampaignRecord } from "./types"
import { useCampagneList } from "./useCampagneList"

const HIDE_SCROLLBAR_CLASS =
  "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
const CAMPAIGN_CARD_CLASS = `flex h-full min-h-0 w-[400px] min-w-[400px] flex-col overflow-y-auto overflow-x-hidden ${HIDE_SCROLLBAR_CLASS}`
const BUILDER_CARD_COLLAPSED_CLASS = `flex h-full min-h-0 w-[160px] min-w-[160px] flex-col overflow-y-auto overflow-x-hidden ${HIDE_SCROLLBAR_CLASS}`
const BUILDER_CARD_EXPANDED_CLASS = `flex h-full min-h-0 w-[400px] min-w-[400px] flex-col overflow-y-auto overflow-x-hidden ${HIDE_SCROLLBAR_CLASS}`

const CAMPAIGNS_SKELETON_KEYS = ["campagne-sk-1", "campagne-sk-2", "campagne-sk-3"] as const

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

function getDefaultBaseUrl(): string {
  return (import.meta.env.VITE_PUBLIC_SITE_ORIGIN as string | undefined) ?? "https://g3modena.com"
}

function toPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`
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
  const url = new URL(state.baseUrl)
  if (state.source) url.searchParams.set("utm_source", state.source)
  if (state.medium) url.searchParams.set("utm_medium", state.medium)
  if (state.campaign) url.searchParams.set("utm_campaign", state.campaign)
  if (state.term) url.searchParams.set("utm_term", state.term)
  if (state.content) url.searchParams.set("utm_content", state.content)
  if (state.cid) url.searchParams.set("cid", state.cid)
  return url.toString()
}

function buildUtmUrlFromBuilderState(state: BuilderState): string {
  const base = normalizeBaseUrlForCampaign(state.baseUrl)
  if (!base.ok) return ""
  try {
    return buildUtmUrl({
      baseUrl: base.value,
      source: state.source.trim(),
      medium: state.medium.trim(),
      campaign: state.campaign.trim(),
      term: state.term.trim(),
      content: state.content.trim(),
      cid: state.cid.trim(),
    })
  } catch {
    return ""
  }
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
  const lifecycle = getCampaignLifecycle(campaign.firstDataAt, campaign.lastDataAt)
  const lifecycleMeta = getLifecycleMeta(lifecycle)
  const campaignUrl = buildCampaignUrlFromRecord(campaign)
  const canCopyCampaignUrl = lifecycle !== "inactive"
  const formConversionRate =
    campaign.metrics.formOpen > 0 ? campaign.metrics.careersSubmit / campaign.metrics.formOpen : 0
  const visitToConversionRate =
    campaign.metrics.pageView > 0 ? campaign.metrics.careersSubmit / campaign.metrics.pageView : 0
  const hasAnyKpiEvent =
    campaign.metrics.pageView +
      campaign.metrics.ctaClick +
      campaign.metrics.formOpen +
      campaign.metrics.careersSubmit +
      campaign.metrics.careersAbandonTotal >
    0
  const showWaitingDataNotice = lifecycle === "waiting_data" || !hasAnyKpiEvent

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
        {showWaitingDataNotice ? (
          <p className="rounded-md border border-dashed border-muted-foreground/30 bg-muted/30 px-2 py-1.5 text-xs text-muted-foreground">
            In attesa dati: nessun evento ancora attribuito a questa campagna.
          </p>
        ) : null}
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

const CID_RETRY_MAX = 12

function NewCampaignBuilderCard({
  onPersistSuccess,
}: {
  onPersistSuccess: () => void | Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [createdCampaignUrl, setCreatedCampaignUrl] = useState<string | null>(null)
  const [creativePreview, setCreativePreview] = useState<string | null>(null)
  const [creativeFile, setCreativeFile] = useState<File | null>(null)
  const [isObjectUrl, setIsObjectUrl] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  /** Cid confermato in DB dall’ultimo insert riuscito (link copiabile allineato a questo token). */
  const [persistedCampaignCid, setPersistedCampaignCid] = useState<string | null>(null)
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
    cid: generateCampaignCid(),
  })

  useEffect(() => {
    return () => {
      if (creativePreview && isObjectUrl) {
        URL.revokeObjectURL(creativePreview)
      }
    }
  }, [creativePreview, isObjectUrl])

  const draftUrl = buildUtmUrlFromBuilderState(state)
  const builtUrl = createdCampaignUrl ?? draftUrl
  const hasRequiredName = state.name.trim().length > 0
  const hasRequiredSubtitle = state.subtitle.trim().length > 0
  const hasRequiredImage = Boolean(creativePreview && creativeFile)
  const hasRequiredBaseUrl = state.baseUrl.trim().length > 0
  const hasRequiredCampaign = state.campaign.trim().length > 0
  const hasRequiredFields =
    hasRequiredName &&
    hasRequiredSubtitle &&
    hasRequiredImage &&
    hasRequiredBaseUrl &&
    hasRequiredCampaign

  async function handleCopy() {
    const target = builtUrl
    if (!target) return
    await navigator.clipboard.writeText(target)
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
    setCreativeFile(file)
    setIsObjectUrl(true)
    setCreatedCampaignUrl(null)
    setCopied(false)
    setSubmitError(null)
  }

  function updateBuilderField<K extends keyof BuilderState>(key: K, value: BuilderState[K]) {
    setState((prev) => ({ ...prev, [key]: value }))
    setCopied(false)
    setSubmitError(null)
  }

  async function handlePersistCampaign() {
    const msg = validateCampaignBuilderSubmit({
      name: state.name,
      subtitle: state.subtitle,
      baseUrlRaw: state.baseUrl,
      utmCampaign: state.campaign,
      cid: state.cid,
      creativeFile,
    })
    if (msg) {
      setSubmitError(msg)
      return
    }
    const base = normalizeBaseUrlForCampaign(state.baseUrl)
    if (!base.ok || !creativeFile) return

    setSubmitting(true)
    setSubmitError(null)

    try {
      const creativePath = await uploadCampaignCreative(creativeFile)
      let cidAttempt = state.cid.trim()
      let inserted: CampaignRecord | null = null

      for (let attempt = 0; attempt < CID_RETRY_MAX; attempt++) {
        try {
          inserted = await insertCampaign({
            name: state.name,
            subtitle: state.subtitle,
            cid: cidAttempt,
            baseUrl: base.value,
            utmCampaign: state.campaign.trim(),
            creativeImagePath: creativePath,
            utmSource: state.source.trim() || null,
            utmMedium: state.medium.trim() || null,
            utmTerm: state.term.trim() || null,
            utmContent: state.content.trim() || null,
          })
          break
        } catch (err) {
          if (!isCampaignCidConflictError(err)) throw err
          cidAttempt = generateCampaignCid()
        }
      }

      if (!inserted) throw new Error("Impossibile assegnare un cid univoco. Riprova tra poco.")

      setPersistedCampaignCid(inserted.cid)
      setCreatedCampaignUrl(buildCampaignUrlFromRecord(inserted))

      if (creativePreview && isObjectUrl) {
        URL.revokeObjectURL(creativePreview)
      }
      setCreativePreview(null)
      setCreativeFile(null)
      setIsObjectUrl(false)
      setCopied(false)
      if (inputRef.current) inputRef.current.value = ""

      setState((prev) => ({
        ...prev,
        name: "",
        subtitle: "",
        campaign: "",
        term: "",
        content: "",
        cid: generateCampaignCid(),
        baseUrl: prev.baseUrl,
        source: prev.source,
        medium: prev.medium,
      }))

      await onPersistSuccess()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Salvataggio campagna non riuscito.")
    } finally {
      setSubmitting(false)
    }
  }

  function handleCloseBuilder() {
    setOpen(false)
    setCopied(false)
    setCreatedCampaignUrl(null)
    setSubmitError(null)
    setPersistedCampaignCid(null)
    if (creativePreview && isObjectUrl) {
      URL.revokeObjectURL(creativePreview)
    }
    setCreativePreview(null)
    setCreativeFile(null)
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
      cid: generateCampaignCid(),
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
          accept="image/jpeg,image/png,image/webp"
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
                <Label htmlFor="builder-cid">cid (generato automaticamente)</Label>
                <Input id="builder-cid" value={state.cid} readOnly className="font-mono text-xs" />
                {persistedCampaignCid ? (
                  <p className="break-all text-xs font-mono text-muted-foreground">
                    <span className="font-sans font-normal">Ultimo cid salvato su DB:</span> {persistedCampaignCid}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    In caso di conflitto su <span className="font-mono">cid</span> univoco viene rigenerato prima
                    del salvataggio.
                  </p>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <div className="grid gap-1.5">
          <Label htmlFor="builder-url">URL finale</Label>
          <Input id="builder-url" value={builtUrl} readOnly className="font-mono text-xs" />
          {persistedCampaignCid && createdCampaignUrl ? (
            <p className="text-xs text-muted-foreground">
              Link allineato al record Supabase (<span className="font-mono">cid={persistedCampaignCid}</span>).
            </p>
          ) : null}
        </div>

        {submitError ? (
          <Alert variant="destructive">
            <AlertTitle>Impossibile salvare</AlertTitle>
            <AlertDescription className="whitespace-pre-wrap">{submitError}</AlertDescription>
          </Alert>
        ) : null}

        <Button type="button" variant="outline" onClick={() => void handleCopy()} disabled={!builtUrl || submitting}>
          {copied ? <Check className="mr-2 size-4" /> : <Copy className="mr-2 size-4" />}
          {copied ? "URL copiato" : "Copia URL campagna"}
        </Button>
        <Button type="button" onClick={() => void handlePersistCampaign()} disabled={!hasRequiredFields || submitting}>
          {submitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
          {submitting ? "Salvataggio…" : "Crea campagna"}
        </Button>
        {!hasRequiredFields && (
          <p className="text-xs text-muted-foreground pb-6">
            Compila i campi obbligatori (*) per creare la campagna sul database.
          </p>
        )}
        {hasRequiredFields && !createdCampaignUrl && !submitError && (
          <p className="text-xs text-muted-foreground pb-6">
            Salva sul server per generare il link definitivo copiabile.
          </p>
        )}
        {createdCampaignUrl ? (
          <p className="text-xs text-muted-foreground pb-6">
            Campagna salvata su <span className="font-mono">public.campaigns</span>. Elenco aggiornato in
            automatico.
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}

export function CampagnePage() {
  const { items: remoteCampaigns, loading, error, reload } = useCampagneList()

  const orderedCampaigns = useMemo(() => {
    const sorted = [...remoteCampaigns].sort(
      (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    )
    const waiting = sorted.filter(
      (c) => getCampaignLifecycle(c.firstDataAt, c.lastDataAt) === "waiting_data",
    )
    const active = sorted.filter((c) => getCampaignLifecycle(c.firstDataAt, c.lastDataAt) === "active")
    const inactive = sorted.filter((c) => getCampaignLifecycle(c.firstDataAt, c.lastDataAt) === "inactive")
    return [...waiting, ...active, ...inactive]
  }, [remoteCampaigns])

  const showInitialSkeleton = loading && remoteCampaigns.length === 0 && !error
  const refreshing = loading && remoteCampaigns.length > 0
  const listEmpty = !loading && !error && orderedCampaigns.length === 0

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background p-6">
      <section className="flex min-h-0 flex-1 flex-col gap-4">
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Caricamento non riuscito</AlertTitle>
            <AlertDescription className="whitespace-pre-wrap">{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="flex shrink-0 items-center justify-end gap-2 empty:hidden">
          {refreshing ? (
            <>
              <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" aria-hidden />
              <span className="text-xs text-muted-foreground">Aggiornamento elenco…</span>
            </>
          ) : null}
        </div>

        <div className={`min-h-0 flex-1 overflow-x-auto overflow-y-hidden pb-2 ${HIDE_SCROLLBAR_CLASS}`}>
          <div className="flex h-full min-w-max items-stretch gap-4">
            <NewCampaignBuilderCard onPersistSuccess={() => void reload()} />

            {error ? (
              <div className="flex w-[min(400px,90vw)] shrink-0 flex-col justify-start gap-3 pt-1">
                <Button type="button" variant="outline" disabled={loading} onClick={() => void reload()}>
                  {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                  Riprova
                </Button>
              </div>
            ) : showInitialSkeleton ? (
              CAMPAIGNS_SKELETON_KEYS.map((key) => (
                <Skeleton key={key} className={`${CAMPAIGN_CARD_CLASS} h-[520px] shrink-0`} />
              ))
            ) : (
              <>
                {orderedCampaigns.map((campaign) => (
                  <CampaignCard key={campaign.id} campaign={campaign} />
                ))}
                {listEmpty ? (
                  <div className="flex w-[340px] max-w-[85vw] shrink-0 items-center rounded-lg border border-dashed px-6 py-8">
                    <p className="text-sm text-muted-foreground">
                      Nessuna riga in <span className="font-mono">public.campaigns</span>: crea una campagna dalla
                      card a sinistra o aggiungi righe dalla Table Editor su Supabase. Le KPI restano a zero finché
                      non sono collegate agli eventi.
                    </p>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
