import { asRecord, asString } from "./shared-form-utils"

export type ClientRow = { name: string; location: string }

export type ClientsFormState = {
  label: string
  title: string
  items: ClientRow[]
}

export const CLIENTS_FORM_DEFAULTS: ClientsFormState = {
  label: "Clienti selezionati",
  title: "La fiducia dei migliori",
  items: [{ name: "", location: "" }],
}

export function clientsFormFromContent(content: unknown): ClientsFormState {
  const root = asRecord(content)
  if (!root) return { ...CLIENTS_FORM_DEFAULTS, items: [...CLIENTS_FORM_DEFAULTS.items] }
  const rawItems = Array.isArray(root.items) ? root.items : []
  const items = rawItems
    .map((row) => {
      const record = asRecord(row)
      if (!record) return null
      return {
        name: asString(record.name, ""),
        location: asString(record.location, ""),
      }
    })
    .filter((row): row is ClientRow => Boolean(row))

  return {
    label: asString(root.label, CLIENTS_FORM_DEFAULTS.label),
    title: asString(root.title, CLIENTS_FORM_DEFAULTS.title),
    items: items.length > 0 ? items : [...CLIENTS_FORM_DEFAULTS.items],
  }
}

export function clientsFormToContent(state: ClientsFormState): Record<string, unknown> {
  return {
    label: state.label.trim(),
    title: state.title.trim(),
    items: state.items
      .map((row) => ({
        name: row.name.trim(),
        location: row.location.trim(),
      }))
      .filter((row) => row.name && row.location),
  }
}

export function validateClientsForm(state: ClientsFormState): string[] {
  const errors: string[] = []
  if (!state.label.trim()) errors.push("Inserisci etichetta sezione.")
  if (!state.title.trim()) errors.push("Inserisci titolo sezione.")
  const completedRows = state.items.filter((row) => row.name.trim() && row.location.trim())
  if (completedRows.length === 0) errors.push("Inserisci almeno un cliente completo (nome + localita).")
  state.items.forEach((row, index) => {
    const hasName = Boolean(row.name.trim())
    const hasLocation = Boolean(row.location.trim())
    if (!hasName && !hasLocation) return
    if (!hasName) errors.push(`Cliente ${index + 1}: nome mancante.`)
    if (!hasLocation) errors.push(`Cliente ${index + 1}: localita mancante.`)
  })
  return errors
}

