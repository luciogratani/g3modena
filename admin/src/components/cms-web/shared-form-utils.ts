export function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null) return null
  return value as Record<string, unknown>
}

export function asString(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : fallback
}

export function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback
}

export function isValidHref(href: string): boolean {
  const value = href.trim()
  if (!value) return false
  return /^(#|\/|https?:\/\/|mailto:|tel:)/i.test(value)
}

