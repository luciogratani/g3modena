import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { AboutFormState } from "../about-form"

type AboutSectionEditorProps = {
  value: AboutFormState
  onChange: <K extends keyof AboutFormState>(key: K, value: AboutFormState[K]) => void
}

export function AboutSectionEditor({ value, onChange }: AboutSectionEditorProps) {
  const paragraphs = [value.paragraph1, value.paragraph2, value.paragraph3].filter((paragraph) => paragraph.trim())

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="about-label">Etichetta</Label>
          <Input id="about-label" value={value.label} onChange={(event) => onChange("label", event.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="about-title">Titolo</Label>
          <Input id="about-title" value={value.title} onChange={(event) => onChange("title", event.target.value)} />
        </div>
      </div>

      <section className="rounded-md border bg-muted/20 p-4">
        <p className="text-sm font-medium">Anteprima rapida</p>
        <div className="mt-2 grid gap-3 sm:grid-cols-[220px_1fr]">
          <div className="overflow-hidden rounded-md border bg-background">
            {value.imageSrc ? (
              <img src={value.imageSrc} alt={value.imageAlt || "Anteprima immagine Chi siamo"} className="h-28 w-full object-cover" />
            ) : (
              <div className="flex h-28 items-center justify-center text-xs text-muted-foreground">Nessuna immagine</div>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-xs uppercase text-muted-foreground">{value.label || "Etichetta sezione"}</p>
            <p className="text-sm font-medium">{value.title || "Titolo sezione"}</p>
            <p className="text-xs text-muted-foreground">
              {paragraphs.length > 0
                ? `${paragraphs.length} paragraf${paragraphs.length > 1 ? "i" : "o"} compilat${paragraphs.length > 1 ? "i" : "o"}`
                : "Nessun paragrafo compilato"}
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="about-p1">Paragrafo 1</Label>
          <Textarea id="about-p1" value={value.paragraph1} onChange={(event) => onChange("paragraph1", event.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="about-p2">Paragrafo 2</Label>
          <Textarea id="about-p2" value={value.paragraph2} onChange={(event) => onChange("paragraph2", event.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="about-p3">Paragrafo 3</Label>
          <Textarea id="about-p3" value={value.paragraph3} onChange={(event) => onChange("paragraph3", event.target.value)} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="about-image-src">URL immagine</Label>
          <Input
            id="about-image-src"
            value={value.imageSrc}
            onChange={(event) => onChange("imageSrc", event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="about-image-alt">Testo alternativo immagine</Label>
          <Input
            id="about-image-alt"
            value={value.imageAlt}
            onChange={(event) => onChange("imageAlt", event.target.value)}
          />
        </div>
      </div>
    </div>
  )
}

