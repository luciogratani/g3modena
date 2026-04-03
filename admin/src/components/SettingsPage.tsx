import { useCallback, useEffect, useState } from "react"
import { Activity, CircleUserRound, LogOut, Monitor, Moon, RotateCw, Sun } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import type { ThemePreference } from "../lib/theme-preference"
import { hasSupabaseConfig, supabase, supabaseUrl } from "../lib/supabase"

type SettingsPageProps = {
  themePreference: ThemePreference
  onThemePreferenceChange: (preference: ThemePreference) => void
}

type SupabaseStatus = "checking" | "online" | "offline" | "misconfigured"

type SupabaseMonitorState = {
  status: SupabaseStatus
  latencyMs: number | null
  checkedAt: string | null
  detail: string
}

const STATUS_BADGE_VARIANT: Record<SupabaseStatus, "secondary" | "destructive" | "outline"> = {
  checking: "secondary",
  online: "secondary",
  offline: "destructive",
  misconfigured: "outline",
}

const STATUS_LABEL: Record<SupabaseStatus, string> = {
  checking: "Verifica in corso",
  online: "Online",
  offline: "Offline",
  misconfigured: "Configurazione mancante",
}

export function SettingsPage({
  themePreference,
  onThemePreferenceChange,
}: SettingsPageProps) {
  const [logoutClicked, setLogoutClicked] = useState(false)
  const [monitorState, setMonitorState] = useState<SupabaseMonitorState>({
    status: hasSupabaseConfig ? "checking" : "misconfigured",
    latencyMs: null,
    checkedAt: null,
    detail: hasSupabaseConfig
      ? "Eseguo la prima verifica di connettivita..."
      : "Configura VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY per abilitare il monitor.",
  })

  const handleThemeChange = (value: string) => {
    if (value === "light" || value === "dark" || value === "auto") {
      onThemePreferenceChange(value)
    }
  }

  const runSupabaseCheck = useCallback(async () => {
    if (!hasSupabaseConfig || !supabase) {
      setMonitorState({
        status: "misconfigured",
        latencyMs: null,
        checkedAt: new Date().toISOString(),
        detail: "Variabili ambiente Supabase mancanti o non valide.",
      })
      return
    }

    setMonitorState((previous) => ({
      ...previous,
      status: "checking",
      detail: "Controllo stato client Supabase...",
    }))

    const startTime = performance.now()
    try {
      const { error } = await supabase.auth.getSession()
      const latencyMs = Math.round(performance.now() - startTime)

      if (error) {
        const message = error.message || "Errore sconosciuto durante il check Supabase."
        const isConfigurationError = /invalid api key|invalid jwt|missing/i.test(message)
        setMonitorState({
          status: isConfigurationError ? "misconfigured" : "offline",
          latencyMs,
          checkedAt: new Date().toISOString(),
          detail: message,
        })
        return
      }

      setMonitorState({
        status: "online",
        latencyMs,
        checkedAt: new Date().toISOString(),
        detail: "Client Supabase raggiungibile e operativo.",
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Errore di rete durante il check."
      setMonitorState({
        status: "offline",
        latencyMs: Math.round(performance.now() - startTime),
        checkedAt: new Date().toISOString(),
        detail: message,
      })
    }
  }, [])

  useEffect(() => {
    void runSupabaseCheck()
  }, [runSupabaseCheck])

  return (
    <div className="min-h-full bg-background p-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Impostazioni</h1>
        <p className="mt-1 text-muted-foreground">
          Personalizza aspetto e opzioni account del backoffice.
        </p>
      </header>

      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sun className="size-4 text-muted-foreground" />
              <CardTitle>Aspetto</CardTitle>
            </div>
            <CardDescription>
              Scegli come visualizzare il tema dell&apos;interfaccia admin.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <fieldset className="flex flex-col gap-3" aria-labelledby="theme-preference-label">
              <Label id="theme-preference-label">Tema</Label>
              <RadioGroup
                value={themePreference}
                onValueChange={handleThemeChange}
                aria-label="Seleziona tema admin"
              >
                <div className="flex items-center gap-2 rounded-md border px-3 py-2">
                  <RadioGroupItem value="light" id="theme-light" />
                  <Label htmlFor="theme-light" className="flex cursor-pointer items-center gap-2">
                    <Sun className="size-4 text-muted-foreground" />
                    Chiaro
                  </Label>
                </div>
                <div className="flex items-center gap-2 rounded-md border px-3 py-2">
                  <RadioGroupItem value="dark" id="theme-dark" />
                  <Label htmlFor="theme-dark" className="flex cursor-pointer items-center gap-2">
                    <Moon className="size-4 text-muted-foreground" />
                    Scuro
                  </Label>
                </div>
                <div className="flex items-center gap-2 rounded-md border px-3 py-2">
                  <RadioGroupItem value="auto" id="theme-auto" />
                  <Label htmlFor="theme-auto" className="flex cursor-pointer items-center gap-2">
                    <Monitor className="size-4 text-muted-foreground" />
                    Auto (segue sistema)
                  </Label>
                </div>
              </RadioGroup>
            </fieldset>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Activity className="size-4 text-muted-foreground" />
              <CardTitle>Monitor Supabase</CardTitle>
              <Badge variant={STATUS_BADGE_VARIANT[monitorState.status]}>
                {STATUS_LABEL[monitorState.status]}
              </Badge>
            </div>
            <CardDescription>
              Stato client/server Supabase per diagnosi rapida in sviluppo.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid gap-2 text-sm text-muted-foreground">
              <p>
                Endpoint:{" "}
                <span className="font-medium text-foreground">
                  {supabaseUrl ?? "Non configurato"}
                </span>
              </p>
              <p>
                Latenza ultima verifica:{" "}
                <span className="font-medium text-foreground">
                  {monitorState.latencyMs !== null ? `${monitorState.latencyMs} ms` : "n/d"}
                </span>
              </p>
              <p>
                Ultimo controllo:{" "}
                <span className="font-medium text-foreground">
                  {monitorState.checkedAt
                    ? new Date(monitorState.checkedAt).toLocaleTimeString("it-IT")
                    : "mai"}
                </span>
              </p>
            </div>

            <Alert>
              <AlertTitle>Dettaglio stato</AlertTitle>
              <AlertDescription>{monitorState.detail}</AlertDescription>
            </Alert>

            <Button
              type="button"
              variant="outline"
              className="w-full justify-center sm:w-auto"
              onClick={() => void runSupabaseCheck()}
              disabled={monitorState.status === "checking"}
              aria-label="Riprova verifica Supabase"
            >
              <RotateCw
                data-icon="inline-start"
                className={monitorState.status === "checking" ? "animate-spin" : undefined}
              />
              Riprova verifica
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CircleUserRound className="size-4 text-muted-foreground" />
              <CardTitle>Account</CardTitle>
            </div>
            <CardDescription>
              Azioni sessione utente (UI placeholder finché auth non è collegata).
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Button
              type="button"
              variant="outline"
              className="w-full justify-center sm:w-auto"
              aria-label="Esegui logout"
              onClick={() => {
                setLogoutClicked(true)
                console.info("[SettingsPage] Logout UI only: auth backend non ancora integrata.")
              }}
            >
              <LogOut data-icon="inline-start" />
              Logout
            </Button>
            {logoutClicked ? (
              <Alert>
                <AlertTitle>Logout non attivo</AlertTitle>
                <AlertDescription>
                  Questa azione è solo UI al momento. L&apos;integrazione auth sarà aggiunta in seguito.
                </AlertDescription>
              </Alert>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

