import { asRecord, asString, isValidHref } from "./shared-form-utils"

export type FooterEntryForm = {
  type: "phone" | "email"
  label: string
  href: string
}

export type FooterFormState = {
  contactName: string
  contactRole: string
  entries: FooterEntryForm[]
  companyName: string
  address: string
  vatId: string
}

export const FOOTER_FORM_DEFAULTS: FooterFormState = {
  contactName: "",
  contactRole: "",
  entries: [{ type: "phone", label: "", href: "" }],
  companyName: "",
  address: "",
  vatId: "",
}

export function footerFormFromContent(content: unknown): FooterFormState {
  const root = asRecord(content)
  if (!root) return { ...FOOTER_FORM_DEFAULTS, entries: [...FOOTER_FORM_DEFAULTS.entries] }
  const contact = asRecord(root.contact) ?? {}
  const legal = asRecord(root.legal) ?? {}
  const entries = Array.isArray(contact.entries) ? contact.entries : []
  const nextEntries = entries
    .map((item) => {
      const record = asRecord(item)
      if (!record) return null
      return {
        type: record.type === "email" ? "email" : "phone",
        label: asString(record.label, ""),
        href: asString(record.href, ""),
      } as FooterEntryForm
    })
    .filter((item): item is FooterEntryForm => Boolean(item))

  return {
    contactName: asString(contact.name, FOOTER_FORM_DEFAULTS.contactName),
    contactRole: asString(contact.role, FOOTER_FORM_DEFAULTS.contactRole),
    entries: nextEntries.length > 0 ? nextEntries : [...FOOTER_FORM_DEFAULTS.entries],
    companyName: asString(legal.companyName, FOOTER_FORM_DEFAULTS.companyName),
    address: asString(legal.address, FOOTER_FORM_DEFAULTS.address),
    vatId: asString(legal.vatId, FOOTER_FORM_DEFAULTS.vatId),
  }
}

export function footerFormToContent(state: FooterFormState): Record<string, unknown> {
  return {
    contact: {
      name: state.contactName.trim(),
      role: state.contactRole.trim(),
      entries: state.entries
        .map((entry) => ({
          type: entry.type,
          label: entry.label.trim(),
          href: entry.href.trim(),
        }))
        .filter((entry) => entry.label && entry.href),
    },
    legal: {
      companyName: state.companyName.trim(),
      address: state.address.trim(),
      vatId: state.vatId.trim(),
    },
  }
}

export function validateFooterForm(state: FooterFormState): string[] {
  const errors: string[] = []
  if (!state.contactName.trim()) errors.push("Inserisci nome contatto footer.")
  if (!state.contactRole.trim()) errors.push("Inserisci ruolo contatto footer.")
  if (!state.companyName.trim()) errors.push("Inserisci ragione sociale.")
  if (!state.address.trim()) errors.push("Inserisci indirizzo legale.")
  if (!state.vatId.trim()) errors.push("Inserisci partita IVA.")
  const completedEntries = state.entries.filter((entry) => entry.label.trim() && entry.href.trim())
  if (completedEntries.length === 0) {
    errors.push("Inserisci almeno un contatto completo (etichetta + link).")
  }
  state.entries.forEach((entry, index) => {
    const hasLabel = Boolean(entry.label.trim())
    const hasHref = Boolean(entry.href.trim())
    if (!hasLabel && !hasHref) return
    if (!hasLabel) errors.push(`Contatto ${index + 1}: etichetta mancante.`)
    if (!hasHref) errors.push(`Contatto ${index + 1}: link mancante.`)
    if (hasHref && !isValidHref(entry.href)) {
      errors.push(`Contatto ${index + 1}: link non valido.`)
    }
  })
  return errors
}

