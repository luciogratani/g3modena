import { useCallback, useEffect, useMemo, useState } from "react"
import { Loader2, Save, Search } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { cmsTableName, cmsTenantSchema, hasSupabaseConfig, supabase } from "../lib/supabase"

const SEO_SECTION_KEY = "seo"

type SeoSettingsState = {
  metaTitle: string
  metaDescription: string
  canonicalUrl: string
  ogTitle: string
  ogDescription: string
  ogImageUrl: string
  robotsIndex: boolean
  robotsFollow: boolean
}

const SEO_DEFAULTS: SeoSettingsState = {
  metaTitle: "G3 Modena - Servizio premium di sala",
  metaDescription: "Direzione di sala e servizio premium per catering di alto livello.",
  canonicalUrl: "",
  ogTitle: "G3 Modena",
  ogDescription: "Servizio premium di sala per eventi e catering.",
  ogImageUrl: "",
  robotsIndex: true,
  robotsFollow: true,
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null) return null
  return value as Record<string, unknown>
}

function asString(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : fallback
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback
}

function isValidHttpUrl(value: string): boolean {
  if (!value.trim()) return true
  return /^https?:\/\//i.test(value.trim())
}

function validateSeo(settings: SeoSettingsState): string[] {
  const errors: string[] = []
  if (!settings.metaTitle.trim()) errors.push("Inserisci Meta Title.")
  if (!settings.metaDescription.trim()) errors.push("Inserisci Meta Description.")
  if (settings.metaTitle.trim().length > 70) errors.push("Meta Title troppo lungo (consigliato <= 70 caratteri).")
  if (settings.metaDescription.trim().length > 180) errors.push("Meta Description troppo lunga (consigliata <= 180 caratteri).")
  if (!isValidHttpUrl(settings.canonicalUrl)) errors.push("Canonical URL non valido (usa http:// o https://).")
  if (!isValidHttpUrl(settings.ogImageUrl)) errors.push("Open Graph Image URL non valido (usa http:// o https://).")
  return errors
}

export function SeoSettingsPage() {
  const [settings, setSettings] = useState<SeoSettingsState>(SEO_DEFAULTS)
  const [dirty, setDirty] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
  const [status, setStatus] = useState<"idle" | "loading" | "saving">("idle")
  const [message, setMessage] = useState(
    hasSupabaseConfig
      ? "Configura i metadata SEO e salva manualmente."
      : "Supabase non configurato: puoi modificare ma non salvare in database."
  )
  const [showValidation, setShowValidation] = useState(false)

  const validationErrors = useMemo(() => validateSeo(settings), [settings])

  const loadSeo = useCallback(async () => {
    if (!supabase || !hasSupabaseConfig) return
    setStatus("loading")
    setMessage("Caricamento configurazione SEO...")

    let query = supabase
      .from(cmsTableName)
      .select("section_key, content, updated_at")
      .eq("section_key", SEO_SECTION_KEY)
    if (cmsTenantSchema) {
      query = query.eq("tenant_schema", cmsTenantSchema)
    }
    query = query.limit(1)

    const { data, error } = await query.maybeSingle()
    if (error) {
      setMessage("Impossibile caricare la configurazione SEO. Riprova.")
      setStatus("idle")
      return
    }

    const content = asRecord(data?.content) ?? {}
    setSettings({
      metaTitle: asString(content.metaTitle, SEO_DEFAULTS.metaTitle),
      metaDescription: asString(content.metaDescription, SEO_DEFAULTS.metaDescription),
      canonicalUrl: asString(content.canonicalUrl, SEO_DEFAULTS.canonicalUrl),
      ogTitle: asString(content.ogTitle, SEO_DEFAULTS.ogTitle),
      ogDescription: asString(content.ogDescription, SEO_DEFAULTS.ogDescription),
      ogImageUrl: asString(content.ogImageUrl, SEO_DEFAULTS.ogImageUrl),
      robotsIndex: asBoolean(content.robotsIndex, SEO_DEFAULTS.robotsIndex),
      robotsFollow: asBoolean(content.robotsFollow, SEO_DEFAULTS.robotsFollow),
    })
    setDirty(false)
    setShowValidation(false)
    setLastSavedAt(data?.updated_at ?? null)
    setMessage("Configurazione SEO caricata.")
    setStatus("idle")
  }, [])

  useEffect(() => {
    void loadSeo()
  }, [loadSeo])

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) return
      event.preventDefault()
      event.returnValue = ""
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [dirty])

  const updateField = <K extends keyof SeoSettingsState>(key: K, value: SeoSettingsState[K]) => {
    setSettings((previous) => ({ ...previous, [key]: value }))
    setDirty(true)
  }

  const saveSeo = async () => {
    const errors = validateSeo(settings)
    if (errors.length > 0) {
      setShowValidation(true)
      setMessage("Controlla i campi SEO evidenziati prima di salvare.")
      return
    }
    if (!supabase || !hasSupabaseConfig) {
      setMessage("Supabase non configurato: salvataggio non disponibile.")
      return
    }

    setStatus("saving")
    setMessage("Salvataggio SEO in corso...")

    const payload: Record<string, unknown> = {
      section_key: SEO_SECTION_KEY,
      content: {
        metaTitle: settings.metaTitle.trim(),
        metaDescription: settings.metaDescription.trim(),
        canonicalUrl: settings.canonicalUrl.trim(),
        ogTitle: settings.ogTitle.trim(),
        ogDescription: settings.ogDescription.trim(),
        ogImageUrl: settings.ogImageUrl.trim(),
        robotsIndex: settings.robotsIndex,
        robotsFollow: settings.robotsFollow,
      },
      updated_at: new Date().toISOString(),
    }
    if (cmsTenantSchema) payload.tenant_schema = cmsTenantSchema

    const onConflict = cmsTenantSchema ? "tenant_schema,section_key" : "section_key"
    const { error } = await supabase.from(cmsTableName).upsert(payload, { onConflict })
    if (error) {
      setMessage("Errore nel salvataggio SEO. Verifica connessione e riprova.")
      setStatus("idle")
      return
    }

    setDirty(false)
    setShowValidation(false)
    setLastSavedAt(new Date().toISOString())
    setMessage("Impostazioni SEO salvate.")
    setStatus("idle")
  }

  return (
    <div className="min-h-full bg-background p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Search className="size-5 text-muted-foreground" />
            <CardTitle>SEO</CardTitle>
            {dirty ? <Badge variant="secondary">Modifiche non salvate</Badge> : null}
          </div>
          <CardDescription>
            Impostazioni SEO globali del sito pubblico. Salvataggio sempre manuale.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <section className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="seo-meta-title">Meta Title</Label>
              <Input
                id="seo-meta-title"
                value={settings.metaTitle}
                onChange={(event) => updateField("metaTitle", event.target.value)}
              />
              <p className="text-xs text-muted-foreground">{settings.metaTitle.length}/70 consigliati</p>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="seo-canonical-url">Canonical URL</Label>
              <Input
                id="seo-canonical-url"
                value={settings.canonicalUrl}
                onChange={(event) => updateField("canonicalUrl", event.target.value)}
                placeholder="https://www.tuosito.it/"
              />
            </div>
          </section>

          <div className="flex flex-col gap-2">
            <Label htmlFor="seo-meta-description">Meta Description</Label>
            <Textarea
              id="seo-meta-description"
              value={settings.metaDescription}
              onChange={(event) => updateField("metaDescription", event.target.value)}
            />
            <p className="text-xs text-muted-foreground">{settings.metaDescription.length}/180 consigliati</p>
          </div>

          <section className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="seo-og-title">Open Graph Title</Label>
              <Input
                id="seo-og-title"
                value={settings.ogTitle}
                onChange={(event) => updateField("ogTitle", event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="seo-og-image">Open Graph Image URL</Label>
              <Input
                id="seo-og-image"
                value={settings.ogImageUrl}
                onChange={(event) => updateField("ogImageUrl", event.target.value)}
                placeholder="https://..."
              />
            </div>
          </section>

          <div className="flex flex-col gap-2">
            <Label htmlFor="seo-og-description">Open Graph Description</Label>
            <Textarea
              id="seo-og-description"
              value={settings.ogDescription}
              onChange={(event) => updateField("ogDescription", event.target.value)}
            />
          </div>

          <section className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-md border p-3">
              <div className="flex flex-col gap-1">
                <Label htmlFor="seo-robots-index">Indicizzazione motori</Label>
                <p className="text-xs text-muted-foreground">Attivo = index</p>
              </div>
              <Switch
                id="seo-robots-index"
                checked={settings.robotsIndex}
                onCheckedChange={(checked) => updateField("robotsIndex", checked)}
              />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div className="flex flex-col gap-1">
                <Label htmlFor="seo-robots-follow">Follow link</Label>
                <p className="text-xs text-muted-foreground">Attivo = follow</p>
              </div>
              <Switch
                id="seo-robots-follow"
                checked={settings.robotsFollow}
                onCheckedChange={(checked) => updateField("robotsFollow", checked)}
              />
            </div>
          </section>

          {showValidation && validationErrors.length > 0 ? (
            <Alert variant="destructive">
              <AlertTitle>Controlla i campi SEO</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-4">
                  {validationErrors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => void loadSeo()}
              disabled={!hasSupabaseConfig || status !== "idle"}
            >
              <Search data-icon="inline-start" />
              Ricarica SEO
            </Button>
            <Button type="button" onClick={() => void saveSeo()} disabled={status !== "idle"}>
              {status === "saving" ? (
                <Loader2 data-icon="inline-start" className="animate-spin" />
              ) : (
                <Save data-icon="inline-start" />
              )}
              Salva modifiche
            </Button>
            <span className="text-xs text-muted-foreground">
              Ultimo salvataggio: {lastSavedAt ? new Date(lastSavedAt).toLocaleString("it-IT") : "mai"}
            </span>
          </div>

          <p className="text-xs text-muted-foreground">{message}</p>
        </CardContent>
      </Card>
    </div>
  )
}

