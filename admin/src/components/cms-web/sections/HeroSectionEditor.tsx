import { useRef } from "react"
import { Loader2, Upload } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { HeroFormState } from "../hero-form"

type HeroSectionEditorProps = {
  value: HeroFormState
  onChange: <K extends keyof HeroFormState>(key: K, value: HeroFormState[K]) => void
  hasStorage: boolean
  uploadStatus: "idle" | "media" | "poster"
  onUploadMedia: (file: File | undefined) => Promise<void>
  onUploadPoster: (file: File | undefined) => Promise<void>
}

export function HeroSectionEditor({
  value,
  onChange,
  hasStorage,
  uploadStatus,
  onUploadMedia,
  onUploadPoster,
}: HeroSectionEditorProps) {
  const mediaInputRef = useRef<HTMLInputElement>(null)
  const posterInputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-4 rounded-lg border p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Label className="text-sm font-medium">Media Hero</Label>
          <Badge variant="outline">{value.mediaType === "video" ? "Video" : "Immagine"}</Badge>
          <Badge variant={hasStorage ? "secondary" : "outline"}>
            {hasStorage ? "Storage attivo" : "Storage non configurato"}
          </Badge>
        </div>

        <div className="overflow-hidden rounded-md border bg-muted/30 max-w-md">
          {value.mediaSrc ? (
            value.mediaType === "video" ? (
              <video key={value.mediaSrc} src={value.mediaSrc} controls className="aspect-video w-full object-cover" />
            ) : (
              <img src={value.mediaSrc} alt="Anteprima media Hero" className="aspect-video w-full object-cover" />
            )
          ) : (
            <div className="flex aspect-video items-center justify-center text-sm text-muted-foreground">
              Nessun media selezionato
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={mediaInputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={(event) => void onUploadMedia(event.target.files?.[0])}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => mediaInputRef.current?.click()}
            disabled={!hasStorage || uploadStatus !== "idle"}
          >
            {uploadStatus === "media" ? (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            ) : (
              <Upload data-icon="inline-start" />
            )}
            Carica immagine o video
          </Button>
          <span className="text-xs text-muted-foreground break-all">{value.mediaSrc}</span>
        </div>

        {value.mediaType === "video" ? (
          <div className="flex flex-col gap-3 rounded-md border bg-background p-3">
            <Label className="text-sm font-medium">Poster video (opzionale)</Label>
            {value.mediaPoster ? (
              <img src={value.mediaPoster} alt="Anteprima poster video" className="h-32 w-full rounded-md border object-cover sm:w-56" />
            ) : (
              <p className="text-xs text-muted-foreground">Nessun poster impostato.</p>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={posterInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => void onUploadPoster(event.target.files?.[0])}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => posterInputRef.current?.click()}
                disabled={!hasStorage || uploadStatus !== "idle"}
              >
                {uploadStatus === "poster" ? (
                  <Loader2 data-icon="inline-start" className="animate-spin" />
                ) : (
                  <Upload data-icon="inline-start" />
                )}
                Carica poster
              </Button>
              <span className="text-xs text-muted-foreground break-all">
                {value.mediaPoster || "Nessun URL poster"}
              </span>
            </div>
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="hero-title">Titolo principale</Label>
          <Input id="hero-title" value={value.title} onChange={(event) => onChange("title", event.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="hero-subtitle">Sottotitolo</Label>
          <Textarea
            id="hero-subtitle"
            value={value.subtitle}
            onChange={(event) => onChange("subtitle", event.target.value)}
            className="h-10 min-h-10 resize-y"
          />
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="hero-primary-label">Testo bottone principale</Label>
          <Input
            id="hero-primary-label"
            value={value.primaryCtaLabel}
            onChange={(event) => onChange("primaryCtaLabel", event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="hero-primary-href">Link bottone principale</Label>
          <Input
            id="hero-primary-href"
            value={value.primaryCtaHref}
            onChange={(event) => onChange("primaryCtaHref", event.target.value)}
            placeholder="#contact"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="hero-secondary-label">Testo bottone secondario</Label>
          <Input
            id="hero-secondary-label"
            value={value.secondaryCtaLabel}
            onChange={(event) => onChange("secondaryCtaLabel", event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="hero-secondary-href">Link bottone secondario</Label>
          <Input
            id="hero-secondary-href"
            value={value.secondaryCtaHref}
            onChange={(event) => onChange("secondaryCtaHref", event.target.value)}
            placeholder="#careers"
          />
        </div>
      </section>
    </div>
  )
}

