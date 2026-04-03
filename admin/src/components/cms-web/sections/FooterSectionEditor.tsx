import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { FooterFormState } from "../footer-form"

type FooterSectionEditorProps = {
  value: FooterFormState
  onChange: (next: FooterFormState) => void
}

export function FooterSectionEditor({ value, onChange }: FooterSectionEditorProps) {
  const filledEntries = value.entries.filter((entry) => entry.label.trim() && entry.href.trim()).length

  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-md border bg-muted/20 p-4">
        <p className="text-sm font-medium">Anteprima rapida</p>
        <p className="text-xs text-muted-foreground">
          {filledEntries} contatt{filledEntries === 1 ? "o" : "i"} complet{filledEntries === 1 ? "o" : "i"} su {value.entries.length}.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="footer-contact-name">Nome referente</Label>
          <Input
            id="footer-contact-name"
            value={value.contactName}
            onChange={(event) => onChange({ ...value, contactName: event.target.value })}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="footer-contact-role">Ruolo referente</Label>
          <Input
            id="footer-contact-role"
            value={value.contactRole}
            onChange={(event) => onChange({ ...value, contactRole: event.target.value })}
          />
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-md border p-3">
        <Label className="text-sm font-medium">Contatti</Label>
        {value.entries.map((entry, index) => (
          <div key={`${index}-${entry.label}`} className="grid gap-3 sm:grid-cols-[180px_1fr_1fr_auto]">
            <Select
              value={entry.type}
              onValueChange={(nextType) => {
                const next = [...value.entries]
                next[index] = { ...next[index], type: nextType as "phone" | "email" }
                onChange({ ...value, entries: next })
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="phone">Telefono</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <Input
              value={entry.label}
              placeholder="Etichetta contatto"
              onChange={(event) => {
                const next = [...value.entries]
                next[index] = { ...next[index], label: event.target.value }
                onChange({ ...value, entries: next })
              }}
            />
            <Input
              value={entry.href}
              placeholder={entry.type === "email" ? "mailto:nome@dominio.it" : "tel:+39..."}
              onChange={(event) => {
                const next = [...value.entries]
                next[index] = { ...next[index], href: event.target.value }
                onChange({ ...value, entries: next })
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => onChange({ ...value, entries: value.entries.filter((_, i) => i !== index) })}
              disabled={value.entries.length <= 1}
            >
              <Trash2 data-icon="inline-start" />
              Rimuovi
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            onChange({
              ...value,
              entries: [...value.entries, { type: "phone", label: "", href: "" }],
            })
          }
        >
          <Plus data-icon="inline-start" />
          Aggiungi contatto
        </Button>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="footer-company">Ragione sociale</Label>
          <Input
            id="footer-company"
            value={value.companyName}
            onChange={(event) => onChange({ ...value, companyName: event.target.value })}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="footer-vat">Partita IVA</Label>
          <Input
            id="footer-vat"
            value={value.vatId}
            onChange={(event) => onChange({ ...value, vatId: event.target.value })}
          />
        </div>
      </section>
      <div className="flex flex-col gap-2">
        <Label htmlFor="footer-address">Indirizzo legale</Label>
        <Input
          id="footer-address"
          value={value.address}
          onChange={(event) => onChange({ ...value, address: event.target.value })}
        />
      </div>
    </div>
  )
}

