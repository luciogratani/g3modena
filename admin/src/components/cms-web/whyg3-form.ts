import { asRecord, asString } from "./shared-form-utils"

export type WhyG3Icon = "clock" | "crown" | "users" | "shield-check"
export const WHY_G3_ICONS: WhyG3Icon[] = ["clock", "crown", "users", "shield-check"]

export type WhyReasonForm = {
  icon: WhyG3Icon
  title: string
  description: string
}

export type WhyG3FormState = {
  label: string
  title: string
  reasons: WhyReasonForm[]
}

export const WHYG3_FORM_DEFAULTS: WhyG3FormState = {
  label: "Perche G3",
  title: "Lo standard del servizio",
  reasons: [{ icon: "clock", title: "", description: "" }],
}

export function whyg3FormFromContent(content: unknown): WhyG3FormState {
  const root = asRecord(content)
  if (!root) return { ...WHYG3_FORM_DEFAULTS, reasons: [...WHYG3_FORM_DEFAULTS.reasons] }
  const reasons = Array.isArray(root.reasons) ? root.reasons : []
  const nextReasons = reasons
    .map((row) => {
      const record = asRecord(row)
      if (!record) return null
      const icon = WHY_G3_ICONS.includes(record.icon as WhyG3Icon)
        ? (record.icon as WhyG3Icon)
        : WHY_G3_ICONS[0]
      return {
        icon,
        title: asString(record.title, ""),
        description: asString(record.description, ""),
      }
    })
    .filter((row): row is WhyReasonForm => Boolean(row))

  return {
    label: asString(root.label, WHYG3_FORM_DEFAULTS.label),
    title: asString(root.title, WHYG3_FORM_DEFAULTS.title),
    reasons: nextReasons.length > 0 ? nextReasons : [...WHYG3_FORM_DEFAULTS.reasons],
  }
}

export function whyg3FormToContent(state: WhyG3FormState): Record<string, unknown> {
  return {
    label: state.label.trim(),
    title: state.title.trim(),
    reasons: state.reasons
      .map((row) => ({
        icon: row.icon,
        title: row.title.trim(),
        description: row.description.trim(),
      }))
      .filter((row) => row.title && row.description),
  }
}

export function validateWhyg3Form(state: WhyG3FormState): string[] {
  const errors: string[] = []
  if (!state.label.trim()) errors.push("Inserisci etichetta sezione.")
  if (!state.title.trim()) errors.push("Inserisci titolo sezione.")
  const completedReasons = state.reasons.filter((row) => row.title.trim() && row.description.trim())
  if (completedReasons.length === 0) errors.push("Inserisci almeno un punto di forza completo.")
  state.reasons.forEach((row, index) => {
    const hasTitle = Boolean(row.title.trim())
    const hasDescription = Boolean(row.description.trim())
    if (!hasTitle && !hasDescription) return
    if (!hasTitle) errors.push(`Punto ${index + 1}: titolo mancante.`)
    if (!hasDescription) errors.push(`Punto ${index + 1}: descrizione mancante.`)
  })
  return errors
}

