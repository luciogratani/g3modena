import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import type { SectionsFormState } from "../sections-form"

type SectionsToggleEditorProps = {
  value: SectionsFormState
  onChange: (next: SectionsFormState) => void
}

export function SectionsToggleEditor({ value, onChange }: SectionsToggleEditorProps) {
  const enabledCount = [value.contactFormEnabled, value.careersFormEnabled].filter(Boolean).length

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-md border bg-muted/20 p-4">
        <p className="text-sm font-medium">Stato pubblicazione moduli</p>
        <p className="text-xs text-muted-foreground">
          {enabledCount} moduli attivi su 2. Le modifiche hanno effetto dopo il salvataggio della sezione.
        </p>
      </section>

      <div className="flex items-center justify-between rounded-md border p-4">
        <div className="flex flex-col gap-1">
          <Label htmlFor="section-contact-toggle">Modulo contatti</Label>
          <p className="text-xs text-muted-foreground">Mostra o nasconde il form contatti nel sito pubblico.</p>
        </div>
        <Switch
          id="section-contact-toggle"
          checked={value.contactFormEnabled}
          onCheckedChange={(checked) => onChange({ ...value, contactFormEnabled: checked })}
        />
      </div>
      <div className="flex items-center justify-between rounded-md border p-4">
        <div className="flex flex-col gap-1">
          <Label htmlFor="section-careers-toggle">Modulo lavora con noi</Label>
          <p className="text-xs text-muted-foreground">Mostra o nasconde il form candidature nel sito pubblico.</p>
        </div>
        <Switch
          id="section-careers-toggle"
          checked={value.careersFormEnabled}
          onCheckedChange={(checked) => onChange({ ...value, careersFormEnabled: checked })}
        />
      </div>
    </div>
  )
}

