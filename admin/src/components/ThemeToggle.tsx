import { useEffect, useState } from "react"
import { Moon, Sun } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useSidebar } from "@/components/ui/sidebar"

const STORAGE_KEY = "admin-theme"

function parseStoredTheme(): "light" | "dark" {
  if (typeof document === "undefined") return "light"
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === "dark" || stored === "light") return stored
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

function applyTheme(root: HTMLElement, mode: "light" | "dark") {
  if (mode === "dark") {
    root.classList.add("dark")
  } else {
    root.classList.remove("dark")
  }
}

export function ThemeToggle() {
  const [mode, setMode] = useState<"light" | "dark">(parseStoredTheme)
  const { state } = useSidebar()
  const collapsed = state === "collapsed"

  useEffect(() => {
    const root = document.documentElement
    applyTheme(root, mode)
    localStorage.setItem(STORAGE_KEY, mode)
  }, [mode])

  const toggle = () => setMode((m) => (m === "dark" ? "light" : "dark"))

  if (collapsed) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 shrink-0 rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              onClick={toggle}
              aria-label={mode === "dark" ? "Tema chiaro" : "Tema scuro"}
            >
              {mode === "dark" ? (
                <Sun className="size-4" />
              ) : (
                <Moon className="size-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>
            {mode === "dark" ? "Tema chiaro" : "Tema scuro"}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Sun className="size-4 text-muted-foreground" />
      <Switch
        id="theme-switch"
        checked={mode === "dark"}
        onCheckedChange={(checked) => setMode(checked ? "dark" : "light")}
        aria-label="Attiva dark mode"
      />
      <Moon className="size-4 text-muted-foreground" />
      <Label htmlFor="theme-switch" className="sr-only">
        Dark mode
      </Label>
    </div>
  )
}
