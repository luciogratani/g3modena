import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { ClientsFormState } from "../clients-form"

type ClientsSectionEditorProps = {
  value: ClientsFormState
  onChange: (next: ClientsFormState) => void
}

export function ClientsSectionEditor({ value, onChange }: ClientsSectionEditorProps) {
  const filledClients = value.items.filter((item) => item.name.trim() && item.location.trim()).length

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="clients-label">Etichetta</Label>
          <Input
            id="clients-label"
            value={value.label}
            onChange={(event) => onChange({ ...value, label: event.target.value })}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="clients-title">Titolo</Label>
          <Input
            id="clients-title"
            value={value.title}
            onChange={(event) => onChange({ ...value, title: event.target.value })}
          />
        </div>
      </div>

      <section className="rounded-md border bg-muted/20 p-4">
        <p className="text-sm font-medium">Anteprima rapida</p>
        <p className="text-xs text-muted-foreground">
          {filledClients > 0
            ? `${filledClients} client${filledClients > 1 ? "i" : "e"} pront${filledClients > 1 ? "i" : "o"} per il sito pubblico.`
            : "Nessun cliente completo: aggiungi almeno nome e localita."}
        </p>
      </section>

      <div className="flex flex-col gap-3">
        {value.items.map((item, index) => (
          <div key={`${index}-${item.name}`} className="grid gap-3 rounded-md border p-3 sm:grid-cols-[1fr_1fr_auto]">
            <Input
              value={item.name}
              placeholder="Nome cliente"
              onChange={(event) => {
                const next = [...value.items]
                next[index] = { ...next[index], name: event.target.value }
                onChange({ ...value, items: next })
              }}
            />
            <Input
              value={item.location}
              placeholder="Localita"
              onChange={(event) => {
                const next = [...value.items]
                next[index] = { ...next[index], location: event.target.value }
                onChange({ ...value, items: next })
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => onChange({ ...value, items: value.items.filter((_, i) => i !== index) })}
              disabled={value.items.length <= 1}
            >
              <Trash2 data-icon="inline-start" />
              Rimuovi
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          onClick={() => onChange({ ...value, items: [...value.items, { name: "", location: "" }] })}
        >
          <Plus data-icon="inline-start" />
          Aggiungi cliente
        </Button>
      </div>
    </div>
  )
}

