import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { WHY_G3_ICONS, type WhyG3FormState, type WhyG3Icon } from "../whyg3-form"

const WHY_G3_ICON_LABELS: Record<WhyG3Icon, string> = {
  clock: "Velocita / puntualita",
  crown: "Qualita premium",
  users: "Team",
  "shield-check": "Affidabilita",
}

type WhyG3SectionEditorProps = {
  value: WhyG3FormState
  onChange: (next: WhyG3FormState) => void
}

export function WhyG3SectionEditor({ value, onChange }: WhyG3SectionEditorProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="whyg3-label">Etichetta</Label>
          <Input
            id="whyg3-label"
            value={value.label}
            onChange={(event) => onChange({ ...value, label: event.target.value })}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="whyg3-title">Titolo</Label>
          <Input
            id="whyg3-title"
            value={value.title}
            onChange={(event) => onChange({ ...value, title: event.target.value })}
          />
        </div>
      </div>

      <section className="rounded-md border bg-muted/20 p-4">
        <p className="text-sm font-medium">Anteprima rapida</p>
        <p className="text-xs text-muted-foreground">
          {value.reasons.filter((reason) => reason.title.trim() && reason.description.trim()).length} punti di forza completi.
        </p>
      </section>

      <div className="flex flex-col gap-3">
        {value.reasons.map((reason, index) => (
          <div key={`${index}-${reason.title}`} className="flex flex-col gap-3 rounded-md border p-3">
            <div className="grid gap-3 sm:grid-cols-[220px_1fr_auto]">
              <Select
                value={reason.icon}
                onValueChange={(nextIcon) => {
                  const next = [...value.reasons]
                  next[index] = { ...next[index], icon: nextIcon as WhyG3Icon }
                  onChange({ ...value, reasons: next })
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Icona" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {WHY_G3_ICONS.map((icon) => (
                      <SelectItem key={icon} value={icon}>
                        {WHY_G3_ICON_LABELS[icon]}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <Input
                value={reason.title}
                placeholder="Titolo punto di forza"
                onChange={(event) => {
                  const next = [...value.reasons]
                  next[index] = { ...next[index], title: event.target.value }
                  onChange({ ...value, reasons: next })
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => onChange({ ...value, reasons: value.reasons.filter((_, i) => i !== index) })}
                disabled={value.reasons.length <= 1}
              >
                <Trash2 data-icon="inline-start" />
                Rimuovi
              </Button>
            </div>
            <Textarea
              value={reason.description}
              placeholder="Descrizione"
              onChange={(event) => {
                const next = [...value.reasons]
                next[index] = { ...next[index], description: event.target.value }
                onChange({ ...value, reasons: next })
              }}
            />
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          onClick={() =>
            onChange({
              ...value,
              reasons: [...value.reasons, { icon: "clock", title: "", description: "" }],
            })
          }
        >
          <Plus data-icon="inline-start" />
          Aggiungi punto
        </Button>
      </div>
    </div>
  )
}

