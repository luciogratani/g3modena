import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { List, LayoutGrid, Calendar, Table2, Filter, BarChart3 } from "lucide-react"

export function LavoraConNoiKanban() {
  return (
    <div className="min-h-screen bg-background p-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Lavora con noi – Gestionale</h1>
        <p className="text-muted-foreground mt-1">
          Board Kanban per le candidature del form “Lavora con noi”, con filtri, badge e viste multiple.
        </p>
      </header>

      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>Board candidature</CardTitle>
              <Badge variant="secondary">In arrivo</Badge>
            </div>
            <CardDescription>
              Backoffice stile Trello per gestire le submission del form: drag-and-drop tra colonne,
              filtri smart, badge (auto, diploma, disponibilità, score), viste Kanban / Calendar /
              raggruppata / tabella.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <div>
              <h3 className="text-sm font-medium mb-2">Funzionalità previste</h3>
              <ul className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                <li className="flex items-center gap-2">
                  <LayoutGrid className="shrink-0" />
                  Vista Kanban (board principale)
                </li>
                <li className="flex items-center gap-2">
                  <Calendar className="shrink-0" />
                  Vista Calendar (date disponibilità)
                </li>
                <li className="flex items-center gap-2">
                  <List className="shrink-0" />
                  Vista raggruppata (formazione, fascia età, mese)
                </li>
                <li className="flex items-center gap-2">
                  <Table2 className="shrink-0" />
                  Vista tabella
                </li>
                <li className="flex items-center gap-2">
                  <Filter className="shrink-0" />
                  Filtri: auto, diploma, età, disponibilità, score, ricerca
                </li>
                <li className="flex items-center gap-2">
                  <BarChart3 className="shrink-0" />
                  Analytics aggregate (conversioni, source UTM, metriche giornaliere)
                </li>
              </ul>
            </div>
            <p className="text-sm text-muted-foreground">
              Stack: React, dnd-kit (drag-and-drop), Supabase (DB + Storage + Realtime).
              Score candidato da regole su form (auto, diploma, età, disponibilità). File e immagini
              ottimizzati in browser prima dell’upload.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
