import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  Briefcase,
  FileText,
  Image,
  LayoutDashboard,
  Loader2,
  MessageSquare,
  RotateCw,
  Save,
  Users,
  type LucideIcon,
} from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CMS_SECTION, normalizeCmsSectionKey, type CmsSectionKey } from "@g3/content-contract"
import { cmsTableName, cmsTenantSchema, hasSupabaseConfig, supabase } from "../lib/supabase"
import {
  ABOUT_FORM_DEFAULTS,
  aboutFormFromContent,
  aboutFormToContent,
  validateAboutForm,
  type AboutFormState,
} from "./cms-web/about-form"
import {
  CLIENTS_FORM_DEFAULTS,
  clientsFormFromContent,
  clientsFormToContent,
  validateClientsForm,
  type ClientsFormState,
} from "./cms-web/clients-form"
import {
  FOOTER_FORM_DEFAULTS,
  footerFormFromContent,
  footerFormToContent,
  validateFooterForm,
  type FooterFormState,
} from "./cms-web/footer-form"
import {
  HERO_FORM_DEFAULTS,
  heroFormFromContent,
  heroFormToContent,
  validateHeroForm,
  type HeroFormState,
} from "./cms-web/hero-form"
import {
  SECTIONS_FORM_DEFAULTS,
  sectionsFormFromContent,
  sectionsFormToContent,
  validateSectionsForm,
  type SectionsFormState,
} from "./cms-web/sections-form"
import {
  WHYG3_FORM_DEFAULTS,
  whyg3FormFromContent,
  whyg3FormToContent,
  validateWhyg3Form,
  type WhyG3FormState,
} from "./cms-web/whyg3-form"
import { AboutSectionEditor } from "./cms-web/sections/AboutSectionEditor"
import { ClientsSectionEditor } from "./cms-web/sections/ClientsSectionEditor"
import { FooterSectionEditor } from "./cms-web/sections/FooterSectionEditor"
import { HeroSectionEditor } from "./cms-web/sections/HeroSectionEditor"
import { SectionsToggleEditor } from "./cms-web/sections/SectionsToggleEditor"
import { WhyG3SectionEditor } from "./cms-web/sections/WhyG3SectionEditor"

type CmsRow = {
  section_key: string
  content: unknown
  updated_at?: string | null
}

const mediaBucketName = import.meta.env.VITE_SUPABASE_MEDIA_BUCKET ?? "site-media"

const sections = [
  { id: CMS_SECTION.hero, label: "Hero", icon: Image, description: "Apertura pagina, media e CTA principali." },
  { id: CMS_SECTION.about, label: "Chi siamo", icon: FileText, description: "Testi e immagine sezione aziendale." },
  { id: CMS_SECTION.clients, label: "Clienti", icon: Users, description: "Elenco clienti e localita." },
  { id: CMS_SECTION.whyG3, label: "Perche G3", icon: LayoutDashboard, description: "Punti di forza e motivi distintivi." },
  { id: CMS_SECTION.footer, label: "Footer", icon: MessageSquare, description: "Contatti e dati legali nel piede pagina." },
  { id: CMS_SECTION.sections, label: "Sezioni", icon: Briefcase, description: "Attivazione dei moduli sul sito." },
] as const satisfies ReadonlyArray<{
  id: CmsSectionKey
  label: string
  icon: LucideIcon
  description: string
}>

function sanitizeFileName(fileName: string): string {
  return fileName.toLowerCase().replace(/[^a-z0-9.\-_]/g, "-")
}

function inferMediaKind(file: File): "image" | "video" | null {
  if (file.type.startsWith("image/")) return "image"
  if (file.type.startsWith("video/")) return "video"
  return null
}

export function CmsWebEditor() {
  const rootRef = useRef<HTMLDivElement>(null)
  const [activeSection, setActiveSection] = useState<CmsSectionKey>(CMS_SECTION.hero)
  const [heroForm, setHeroForm] = useState<HeroFormState>(HERO_FORM_DEFAULTS)
  const [aboutForm, setAboutForm] = useState<AboutFormState>(ABOUT_FORM_DEFAULTS)
  const [clientsForm, setClientsForm] = useState<ClientsFormState>(CLIENTS_FORM_DEFAULTS)
  const [whyg3Form, setWhyg3Form] = useState<WhyG3FormState>(WHYG3_FORM_DEFAULTS)
  const [footerForm, setFooterForm] = useState<FooterFormState>(FOOTER_FORM_DEFAULTS)
  const [sectionsForm, setSectionsForm] = useState<SectionsFormState>(SECTIONS_FORM_DEFAULTS)

  const [dirtyMap, setDirtyMap] = useState<Record<CmsSectionKey, boolean>>({
    [CMS_SECTION.hero]: false,
    [CMS_SECTION.about]: false,
    [CMS_SECTION.clients]: false,
    [CMS_SECTION.whyG3]: false,
    [CMS_SECTION.footer]: false,
    [CMS_SECTION.sections]: false,
  })
  const [lastSavedAt, setLastSavedAt] = useState<Record<CmsSectionKey, string | null>>({
    [CMS_SECTION.hero]: null,
    [CMS_SECTION.about]: null,
    [CMS_SECTION.clients]: null,
    [CMS_SECTION.whyG3]: null,
    [CMS_SECTION.footer]: null,
    [CMS_SECTION.sections]: null,
  })
  const [validationErrors, setValidationErrors] = useState<Record<CmsSectionKey, string[]>>({
    [CMS_SECTION.hero]: [],
    [CMS_SECTION.about]: [],
    [CMS_SECTION.clients]: [],
    [CMS_SECTION.whyG3]: [],
    [CMS_SECTION.footer]: [],
    [CMS_SECTION.sections]: [],
  })

  const [syncStatus, setSyncStatus] = useState<"idle" | "loading" | "saving">("idle")
  const [syncMessage, setSyncMessage] = useState("Editor contenuti pronto.")
  const [uploadStatus, setUploadStatus] = useState<"idle" | "media" | "poster">("idle")
  const [confirmTabLeaveOpen, setConfirmTabLeaveOpen] = useState(false)
  const [pendingSection, setPendingSection] = useState<CmsSectionKey | null>(null)
  const [confirmReloadOpen, setConfirmReloadOpen] = useState(false)

  const hasUnsavedChanges = useMemo(() => Object.values(dirtyMap).some(Boolean), [dirtyMap])

  const setDirty = (section: CmsSectionKey, next: boolean) => {
    setDirtyMap((previous) => ({ ...previous, [section]: next }))
  }

  const setErrorsForSection = (section: CmsSectionKey, errors: string[]) => {
    setValidationErrors((previous) => ({ ...previous, [section]: errors }))
  }

  const loadFromSupabase = useCallback(async () => {
    if (!supabase || !hasSupabaseConfig) return

    setSyncStatus("loading")
    setSyncMessage("Caricamento contenuti...")

    let query = supabase.from(cmsTableName).select("section_key, content, updated_at")
    if (cmsTenantSchema) query = query.eq("tenant_schema", cmsTenantSchema)

    const { data, error } = await query
    if (error) {
      setSyncMessage("Caricamento non riuscito. Riprova.")
      setSyncStatus("idle")
      return
    }

    const rows = (data ?? []) as CmsRow[]
    const rowMap = new Map<CmsSectionKey, CmsRow>()
    for (const row of rows) {
      const key = normalizeCmsSectionKey(row.section_key)
      if (!key) continue
      rowMap.set(key, row)
    }

    setHeroForm(heroFormFromContent(rowMap.get(CMS_SECTION.hero)?.content))
    setAboutForm(aboutFormFromContent(rowMap.get(CMS_SECTION.about)?.content))
    setClientsForm(clientsFormFromContent(rowMap.get(CMS_SECTION.clients)?.content))
    setWhyg3Form(whyg3FormFromContent(rowMap.get(CMS_SECTION.whyG3)?.content))
    setFooterForm(footerFormFromContent(rowMap.get(CMS_SECTION.footer)?.content))
    setSectionsForm(sectionsFormFromContent(rowMap.get(CMS_SECTION.sections)?.content))

    setDirtyMap({
      [CMS_SECTION.hero]: false,
      [CMS_SECTION.about]: false,
      [CMS_SECTION.clients]: false,
      [CMS_SECTION.whyG3]: false,
      [CMS_SECTION.footer]: false,
      [CMS_SECTION.sections]: false,
    })
    setValidationErrors({
      [CMS_SECTION.hero]: [],
      [CMS_SECTION.about]: [],
      [CMS_SECTION.clients]: [],
      [CMS_SECTION.whyG3]: [],
      [CMS_SECTION.footer]: [],
      [CMS_SECTION.sections]: [],
    })
    setLastSavedAt({
      [CMS_SECTION.hero]: rowMap.get(CMS_SECTION.hero)?.updated_at ?? null,
      [CMS_SECTION.about]: rowMap.get(CMS_SECTION.about)?.updated_at ?? null,
      [CMS_SECTION.clients]: rowMap.get(CMS_SECTION.clients)?.updated_at ?? null,
      [CMS_SECTION.whyG3]: rowMap.get(CMS_SECTION.whyG3)?.updated_at ?? null,
      [CMS_SECTION.footer]: rowMap.get(CMS_SECTION.footer)?.updated_at ?? null,
      [CMS_SECTION.sections]: rowMap.get(CMS_SECTION.sections)?.updated_at ?? null,
    })

    setSyncMessage("Contenuti caricati.")
    setSyncStatus("idle")
  }, [])

  useEffect(() => {
    void loadFromSupabase()
  }, [loadFromSupabase])

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) return
      event.preventDefault()
      event.returnValue = ""
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [hasUnsavedChanges])

  const uploadToStorage = async (file: File, kind: "media" | "poster"): Promise<string | null> => {
    if (!supabase || !hasSupabaseConfig) {
      setSyncMessage("Upload media non disponibile in questa demo.")
      return null
    }

    const tenant = cmsTenantSchema ?? "public"
    const storagePath = `${tenant}/hero/${kind}-${Date.now()}-${sanitizeFileName(file.name)}`
    const { error } = await supabase.storage
      .from(mediaBucketName)
      .upload(storagePath, file, { upsert: true, contentType: file.type || undefined })

    if (error) {
      setSyncMessage(`Upload non riuscito: ${error.message}`)
      return null
    }

    return supabase.storage.from(mediaBucketName).getPublicUrl(storagePath).data.publicUrl
  }

  const onHeroUploadMedia = async (file: File | undefined) => {
    if (!file) return
    const kind = inferMediaKind(file)
    if (!kind) {
      setSyncMessage("File non supportato: carica immagine o video.")
      return
    }
    setUploadStatus("media")
    const url = await uploadToStorage(file, "media")
    setUploadStatus("idle")
    if (!url) return
    setHeroForm((previous) => ({
      ...previous,
      mediaType: kind,
      mediaSrc: url,
      mediaPoster: kind === "image" ? "" : previous.mediaPoster,
    }))
    setDirty(CMS_SECTION.hero, true)
    setSyncMessage("Media caricata. Salva per confermare.")
  }

  const onHeroUploadPoster = async (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith("image/")) {
      setSyncMessage("Il poster deve essere un'immagine.")
      return
    }
    setUploadStatus("poster")
    const url = await uploadToStorage(file, "poster")
    setUploadStatus("idle")
    if (!url) return
    setHeroForm((previous) => ({ ...previous, mediaPoster: url }))
    setDirty(CMS_SECTION.hero, true)
    setSyncMessage("Poster caricato. Salva per confermare.")
  }

  const validateSection = (section: CmsSectionKey): string[] => {
    switch (section) {
      case CMS_SECTION.hero:
        return validateHeroForm(heroForm)
      case CMS_SECTION.about:
        return validateAboutForm(aboutForm)
      case CMS_SECTION.clients:
        return validateClientsForm(clientsForm)
      case CMS_SECTION.whyG3:
        return validateWhyg3Form(whyg3Form)
      case CMS_SECTION.footer:
        return validateFooterForm(footerForm)
      case CMS_SECTION.sections:
        return validateSectionsForm()
    }
  }

  const payloadForSection = (section: CmsSectionKey): Record<string, unknown> => {
    switch (section) {
      case CMS_SECTION.hero:
        return heroFormToContent(heroForm)
      case CMS_SECTION.about:
        return aboutFormToContent(aboutForm)
      case CMS_SECTION.clients:
        return clientsFormToContent(clientsForm)
      case CMS_SECTION.whyG3:
        return whyg3FormToContent(whyg3Form)
      case CMS_SECTION.footer:
        return footerFormToContent(footerForm)
      case CMS_SECTION.sections:
        return sectionsFormToContent(sectionsForm)
    }
  }

  const saveSection = async (section: CmsSectionKey) => {
    const errors = validateSection(section)
    setErrorsForSection(section, errors)
    if (errors.length > 0) {
      setSyncMessage("Correggi i campi obbligatori prima di salvare.")
      return
    }

    if (!supabase || !hasSupabaseConfig) {
      setSyncMessage("Salvataggio remoto non disponibile in questa demo.")
      return
    }

    setSyncStatus("saving")
    setSyncMessage("Salvataggio in corso...")

    const payload: Record<string, unknown> = {
      section_key: section,
      content: payloadForSection(section),
      updated_at: new Date().toISOString(),
    }
    if (cmsTenantSchema) payload.tenant_schema = cmsTenantSchema

    const onConflict = cmsTenantSchema ? "tenant_schema,section_key" : "section_key"
    const { error } = await supabase.from(cmsTableName).upsert(payload, { onConflict })
    if (error) {
      setSyncMessage("Salvataggio non riuscito. Riprova.")
      setSyncStatus("idle")
      return
    }

    setDirty(section, false)
    setLastSavedAt((previous) => ({ ...previous, [section]: new Date().toISOString() }))
    setSyncMessage("Modifiche salvate.")
    setSyncStatus("idle")
  }

  const onTabChange = (nextValue: string) => {
    const next = nextValue as CmsSectionKey
    if (next === activeSection) return
    if (dirtyMap[activeSection]) {
      setPendingSection(next)
      setConfirmTabLeaveOpen(true)
      return
    }
    setActiveSection(next)
    const scrollContainer = rootRef.current?.closest("main")
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: "auto" })
    }
  }

  const confirmTabLeave = () => {
    if (!pendingSection) return
    setActiveSection(pendingSection)
    setPendingSection(null)
    setConfirmTabLeaveOpen(false)
    const scrollContainer = rootRef.current?.closest("main")
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: "auto" })
    }
  }

  const cancelTabLeave = () => {
    setPendingSection(null)
    setConfirmTabLeaveOpen(false)
  }

  const handleReloadRequest = () => {
    if (hasUnsavedChanges) {
      setConfirmReloadOpen(true)
      return
    }
    void loadFromSupabase()
  }

  const handleConfirmReload = () => {
    setConfirmReloadOpen(false)
    void loadFromSupabase()
  }

  const handleCancelReload = () => {
    setConfirmReloadOpen(false)
  }

  return (
    <div ref={rootRef} className="min-h-full bg-background p-6 ">
      <Tabs value={activeSection} onValueChange={onTabChange} className="flex flex-col">
        <TabsList className="flex h-auto flex-wrap gap-2 p-1 mb-6">
          {sections.map(({ id, label, icon: Icon }) => (
            <TabsTrigger key={id} value={id} className="gap-2">
              <Icon />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        {sections.map(({ id, label, icon: Icon, description }) => (
          <TabsContent key={id} value={id} className="mt-0 flex flex-col gap-4">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Icon className="size-5 text-muted-foreground" />
                  <CardTitle>{label}</CardTitle>
                  {dirtyMap[id] ? <Badge variant="secondary">Modifiche non salvate</Badge> : null}
                </div>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-6">
                {id === CMS_SECTION.hero ? (
                  <HeroSectionEditor
                    value={heroForm}
                    onChange={(key, value) => {
                      setHeroForm((previous) => ({ ...previous, [key]: value }))
                      setDirty(CMS_SECTION.hero, true)
                    }}
                    hasStorage={hasSupabaseConfig}
                    uploadStatus={uploadStatus}
                    onUploadMedia={onHeroUploadMedia}
                    onUploadPoster={onHeroUploadPoster}
                  />
                ) : null}
                {id === CMS_SECTION.about ? (
                  <AboutSectionEditor
                    value={aboutForm}
                    onChange={(key, value) => {
                      setAboutForm((previous) => ({ ...previous, [key]: value }))
                      setDirty(CMS_SECTION.about, true)
                    }}
                  />
                ) : null}
                {id === CMS_SECTION.clients ? (
                  <ClientsSectionEditor
                    value={clientsForm}
                    onChange={(next) => {
                      setClientsForm(next)
                      setDirty(CMS_SECTION.clients, true)
                    }}
                  />
                ) : null}
                {id === CMS_SECTION.whyG3 ? (
                  <WhyG3SectionEditor
                    value={whyg3Form}
                    onChange={(next) => {
                      setWhyg3Form(next)
                      setDirty(CMS_SECTION.whyG3, true)
                    }}
                  />
                ) : null}
                {id === CMS_SECTION.footer ? (
                  <FooterSectionEditor
                    value={footerForm}
                    onChange={(next) => {
                      setFooterForm(next)
                      setDirty(CMS_SECTION.footer, true)
                    }}
                  />
                ) : null}
                {id === CMS_SECTION.sections ? (
                  <SectionsToggleEditor
                    value={sectionsForm}
                    onChange={(next) => {
                      setSectionsForm(next)
                      setDirty(CMS_SECTION.sections, true)
                    }}
                  />
                ) : null}

                {validationErrors[id].length > 0 ? (
                  <Alert variant="destructive">
                    <AlertTitle>Controlla i campi obbligatori</AlertTitle>
                    <AlertDescription>
                      <ul className="list-disc pl-4">
                        {validationErrors[id].map((error) => (
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
                    onClick={handleReloadRequest}
                    disabled={!hasSupabaseConfig || syncStatus !== "idle"}
                  >
                    <RotateCw data-icon="inline-start" />
                    Ricarica contenuti
                  </Button>
                  <Button type="button" onClick={() => void saveSection(id)} disabled={syncStatus !== "idle" || !dirtyMap[id]}>
                    {syncStatus === "saving" ? (
                      <Loader2 data-icon="inline-start" className="animate-spin" />
                    ) : (
                      <Save data-icon="inline-start" />
                    )}
                    Salva modifiche
                  </Button>
                  <span className="text-xs text-muted-foreground pl-1">
                    Ultimo salvataggio: {lastSavedAt[id] ? new Date(lastSavedAt[id]).toLocaleString("it-IT") : "mai"}
                  </span>
                </div>

                <p className="text-xs text-muted-foreground">{syncMessage}</p>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      <AlertDialog open={confirmTabLeaveOpen} onOpenChange={setConfirmTabLeaveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Modifiche non salvate</AlertDialogTitle>
            <AlertDialogDescription>
              Hai modifiche non salvate in questa sezione. Se continui, le modifiche andranno perse.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelTabLeave}>Resta qui</AlertDialogCancel>
            <AlertDialogAction onClick={confirmTabLeave}>Cambia sezione</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmReloadOpen} onOpenChange={setConfirmReloadOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ricaricare i contenuti dal database?</AlertDialogTitle>
            <AlertDialogDescription>
              Ci sono modifiche non salvate in una o piu sezioni. Se continui, verranno sovrascritte.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelReload}>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmReload}>Ricarica</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

