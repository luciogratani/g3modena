export type ThemePreference = "light" | "dark" | "auto"
export type ResolvedThemeMode = "light" | "dark"

export const THEME_PREFERENCE_STORAGE_KEY = "admin-theme-preference"
const LEGACY_THEME_STORAGE_KEY = "admin-theme"

function isThemePreference(value: string | null): value is ThemePreference {
  return value === "light" || value === "dark" || value === "auto"
}

function isResolvedTheme(value: string | null): value is ResolvedThemeMode {
  return value === "light" || value === "dark"
}

export function getSystemThemeMode(): ResolvedThemeMode {
  if (typeof window === "undefined") return "light"
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

export function getInitialThemePreference(): ThemePreference {
  if (typeof window === "undefined") return "auto"

  const storedPreference = localStorage.getItem(THEME_PREFERENCE_STORAGE_KEY)
  if (isThemePreference(storedPreference)) return storedPreference

  const legacyTheme = localStorage.getItem(LEGACY_THEME_STORAGE_KEY)
  if (isResolvedTheme(legacyTheme)) {
    // One-time migration from legacy key used by the old quick sidebar toggle.
    localStorage.setItem(THEME_PREFERENCE_STORAGE_KEY, legacyTheme)
    return legacyTheme
  }

  return "auto"
}

export function resolveThemeMode(preference: ThemePreference): ResolvedThemeMode {
  return preference === "auto" ? getSystemThemeMode() : preference
}

export function applyResolvedThemeMode(mode: ResolvedThemeMode): void {
  if (typeof document === "undefined") return
  document.documentElement.classList.toggle("dark", mode === "dark")
}

