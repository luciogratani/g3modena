import { FormEvent, useMemo, useState } from "react"
import { AlertTriangle, KeyRound, Loader2, LogIn, ShieldCheck } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { hasSupabaseConfig, supabase } from "@/src/lib/supabase"

type AdminLoginPageProps = {
  mode: "login" | "misconfigured"
}

export function AdminLoginPage({ mode }: AdminLoginPageProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSendingReset, setIsSendingReset] = useState(false)

  const isReady = mode === "login" && hasSupabaseConfig && Boolean(supabase)

  const disabledReason = useMemo(() => {
    if (isReady) return null
    return "Config Supabase mancante: imposta VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY."
  }, [isReady])

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!isReady || !supabase) return

    setStatusMessage(null)
    setErrorMessage(null)
    setIsSubmitting(true)
    try {
      const normalizedEmail = email.trim()
      const { error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      })
      if (error) {
        setErrorMessage(error.message || "Login non riuscito.")
        return
      }
      setStatusMessage("Accesso riuscito. Reindirizzamento in corso...")
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Errore inatteso durante il login.")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handlePasswordReset() {
    if (!isReady || !supabase) return
    const normalizedEmail = email.trim()
    if (!normalizedEmail) {
      setErrorMessage("Inserisci l'email prima di richiedere il reset password.")
      return
    }

    setStatusMessage(null)
    setErrorMessage(null)
    setIsSendingReset(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: window.location.origin,
      })
      if (error) {
        setErrorMessage(error.message || "Invio reset password non riuscito.")
        return
      }
      setStatusMessage("Email di reset inviata. Controlla la tua casella di posta.")
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Errore inatteso durante il reset password.",
      )
    } finally {
      setIsSendingReset(false)
    }
  }

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto flex w-full max-w-md flex-col gap-4">
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <ShieldCheck className="size-4" />
          <span className="text-sm font-medium">G3 Backoffice - Accesso amministratore</span>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Login</CardTitle>
            <CardDescription>
              Accedi con credenziali Supabase Auth per usare il backoffice con policy RLS
              `authenticated`.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {disabledReason ? (
              <Alert variant="destructive">
                <AlertTriangle className="size-4" />
                <AlertTitle>Configurazione non pronta</AlertTitle>
                <AlertDescription>{disabledReason}</AlertDescription>
              </Alert>
            ) : null}

            <form className="space-y-3" onSubmit={handleSignIn}>
              <div className="space-y-1.5">
                <Label htmlFor="admin-login-email">Email</Label>
                <Input
                  id="admin-login-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={!isReady || isSubmitting}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="admin-login-password">Password</Label>
                <Input
                  id="admin-login-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={!isReady || isSubmitting}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={!isReady || isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Accesso in corso...
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2 size-4" />
                    Accedi
                  </>
                )}
              </Button>
            </form>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={!isReady || isSendingReset}
              onClick={() => void handlePasswordReset()}
            >
              {isSendingReset ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Invio in corso...
                </>
              ) : (
                <>
                  <KeyRound className="mr-2 size-4" />
                  Ho dimenticato la password
                </>
              )}
            </Button>

            {statusMessage ? (
              <Alert>
                <AlertTitle>Operazione completata</AlertTitle>
                <AlertDescription>{statusMessage}</AlertDescription>
              </Alert>
            ) : null}
            {errorMessage ? (
              <Alert variant="destructive">
                <AlertTitle>Errore</AlertTitle>
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
