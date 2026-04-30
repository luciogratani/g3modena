import { useEffect, useMemo, useState, type FormEvent } from "react"
import { ArrowDown, ArrowUp, Building2, Pencil, Plus, Trash2 } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  CITIES_UPDATED_EVENT,
  canDeleteCity,
  createCity,
  deleteCity,
  loadCities,
  moveCity,
  setCityActive,
  updateCity,
} from "./storage"
import type { OfficeCity } from "./types"

type FormState = {
  displayName: string
  slug: string
  isActive: boolean
}

const INITIAL_FORM: FormState = {
  displayName: "",
  slug: "",
  isActive: true,
}

function normalizeSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function CitiesPage() {
  const [cities, setCities] = useState<OfficeCity[]>(() => loadCities())
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCity, setEditingCity] = useState<OfficeCity | null>(null)
  const [formState, setFormState] = useState<FormState>(INITIAL_FORM)
  const [deleteTarget, setDeleteTarget] = useState<OfficeCity | null>(null)
  const [confirmSlugChange, setConfirmSlugChange] = useState(false)

  const orderedCities = useMemo(
    () =>
      [...cities].sort((a, b) => {
        if (a.sortOrder === b.sortOrder) return a.displayName.localeCompare(b.displayName, "it")
        return a.sortOrder - b.sortOrder
      }),
    [cities],
  )

  useEffect(() => {
    function refreshCities() {
      setCities(loadCities())
    }

    window.addEventListener(CITIES_UPDATED_EVENT, refreshCities)
    window.addEventListener("storage", refreshCities)
    window.addEventListener("focus", refreshCities)
    return () => {
      window.removeEventListener(CITIES_UPDATED_EVENT, refreshCities)
      window.removeEventListener("storage", refreshCities)
      window.removeEventListener("focus", refreshCities)
    }
  }, [])

  function resetFormState() {
    setFormState(INITIAL_FORM)
    setEditingCity(null)
    setConfirmSlugChange(false)
  }

  function openCreateDialog() {
    resetFormState()
    setDialogOpen(true)
    setErrorMessage(null)
  }

  function openEditDialog(city: OfficeCity) {
    setEditingCity(city)
    setFormState({
      displayName: city.displayName,
      slug: city.slug,
      isActive: city.isActive,
    })
    setConfirmSlugChange(false)
    setDialogOpen(true)
    setErrorMessage(null)
  }

  function closeDialog() {
    setDialogOpen(false)
    resetFormState()
  }

  function persistForm(forceSlugChange: boolean) {
    const normalizedSlug = normalizeSlug(formState.slug)
    if (!normalizedSlug) {
      setErrorMessage("La slug non e valida. Usa lettere, numeri e trattini.")
      return false
    }

    if (editingCity && editingCity.slug !== normalizedSlug && !forceSlugChange) {
      setConfirmSlugChange(true)
      return false
    }

    try {
      if (editingCity) {
        updateCity(editingCity.id, {
          displayName: formState.displayName,
          slug: normalizedSlug,
          isActive: formState.isActive,
        })
      } else {
        createCity({
          displayName: formState.displayName,
          slug: normalizedSlug,
          isActive: formState.isActive,
        })
      }
      setCities(loadCities())
      setErrorMessage(null)
      closeDialog()
      return true
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Operazione non completata.")
      return false
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void persistForm(false)
  }

  function handleToggleActive(city: OfficeCity, checked: boolean) {
    try {
      setCityActive(city.id, checked)
      setCities(loadCities())
      setErrorMessage(null)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Impossibile aggiornare lo stato.")
    }
  }

  function handleMove(city: OfficeCity, direction: "up" | "down") {
    try {
      moveCity(city.id, direction)
      setCities(loadCities())
      setErrorMessage(null)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Impossibile riordinare la sede.")
    }
  }

  function handleDelete(city: OfficeCity) {
    const result = deleteCity(city.id)
    if (!result.deleted) {
      setErrorMessage(result.reason ?? "Eliminazione non consentita.")
      return
    }
    setDeleteTarget(null)
    setCities(loadCities())
    setErrorMessage(null)
  }

  return (
    <div className="min-h-full bg-background p-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Sedi</h1>
        <p className="mt-1 text-muted-foreground">
          Source of truth locale delle citta operative del backoffice (pre-DB).
        </p>
      </header>

      <Card>
        <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Building2 className="size-4 text-muted-foreground" />
              <CardTitle>Citta / sedi attive e storiche</CardTitle>
            </div>
            <CardDescription>
              Le sedi disattivate restano nello storico admin ma non verranno usate nei nuovi flussi.
            </CardDescription>
          </div>
          <Button type="button" onClick={openCreateDialog} aria-label="Crea nuova sede">
            <Plus className="mr-2 size-4" />
            Crea sede
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {errorMessage ? (
            <Alert variant="destructive">
              <AlertTitle>Operazione non completata</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          ) : null}

          {orderedCities.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="text-sm font-medium text-foreground">Nessuna sede configurata</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Crea la prima sede per alimentare i prossimi step del wiring candidature.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ordine</TableHead>
                  <TableHead>Nome sede</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orderedCities.map((city, index) => {
                  const deleteGate = canDeleteCity(city)
                  const canMoveUp = index > 0
                  const canMoveDown = index < orderedCities.length - 1
                  return (
                    <TableRow key={city.id}>
                      <TableCell>{city.sortOrder}</TableCell>
                      <TableCell className="font-medium">{city.displayName}</TableCell>
                      <TableCell>
                        <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{city.slug}</code>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={city.isActive}
                            onCheckedChange={(checked) => handleToggleActive(city, checked)}
                            aria-label={`Attiva o disattiva la sede ${city.displayName}`}
                          />
                          <Badge variant={city.isActive ? "secondary" : "outline"}>
                            {city.isActive ? "Attiva" : "Disattiva"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => handleMove(city, "up")}
                            disabled={!canMoveUp}
                            aria-label={`Sposta in alto ${city.displayName}`}
                          >
                            <ArrowUp className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => handleMove(city, "down")}
                            disabled={!canMoveDown}
                            aria-label={`Sposta in basso ${city.displayName}`}
                          >
                            <ArrowDown className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => openEditDialog(city)}
                            aria-label={`Modifica ${city.displayName}`}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => setDeleteTarget(city)}
                            disabled={!deleteGate.deleted}
                            aria-label={`Elimina ${city.displayName}`}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={(open) => (open ? setDialogOpen(true) : closeDialog())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCity ? "Modifica sede" : "Nuova sede"}</DialogTitle>
            <DialogDescription>
              Compila i campi principali. La slug deve restare univoca nel sistema.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-1.5">
              <Label htmlFor="city-display-name">Nome sede</Label>
              <Input
                id="city-display-name"
                value={formState.displayName}
                onChange={(event) => setFormState((previous) => ({ ...previous, displayName: event.target.value }))}
                placeholder="es. Bologna"
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="city-slug">Slug</Label>
              <Input
                id="city-slug"
                value={formState.slug}
                onChange={(event) => {
                  setConfirmSlugChange(false)
                  setFormState((previous) => ({ ...previous, slug: event.target.value }))
                }}
                placeholder="es. bologna"
                required
              />
              <p className="text-xs text-muted-foreground">Usa un identificatore stabile, minuscolo e senza spazi.</p>
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label htmlFor="city-is-active">Sede attiva</Label>
                <p className="text-xs text-muted-foreground">
                  Se disattiva, non viene proposta nei nuovi flussi operativi.
                </p>
              </div>
              <Switch
                id="city-is-active"
                checked={formState.isActive}
                onCheckedChange={(checked) => setFormState((previous) => ({ ...previous, isActive: checked }))}
                aria-label="Sede attiva"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Annulla
              </Button>
              <Button type="submit">{editingCity ? "Salva modifiche" : "Crea sede"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmSlugChange} onOpenChange={setConfirmSlugChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confermare modifica slug?</AlertDialogTitle>
            <AlertDialogDescription>
              La slug e un identificatore stabile usato da filtri e integrazioni future. Cambiala solo se necessario.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Torna indietro</AlertDialogCancel>
            <AlertDialogAction onClick={() => void persistForm(true)}>Conferma slug</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => (!open ? setDeleteTarget(null) : undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare sede?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `Questa azione rimuove ${deleteTarget.displayName} dal localStorage admin.`
                : "Questa azione rimuove la sede dal localStorage admin."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTarget) handleDelete(deleteTarget)
              }}
            >
              Elimina sede
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
