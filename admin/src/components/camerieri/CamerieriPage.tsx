import { useMemo, useState } from "react"
import { Plus, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { CandidateCity } from "@/src/data/mockCandidates"
import { CreateCameriereDialog } from "./CreateCameriereDialog"
import { CamerieriCrmPanel } from "./CamerieriCrmPanel"
import { useCamerieri, type CamerieriActiveFilter } from "./useCamerieri"

type CamerieriPageProps = {
  city: CandidateCity
}

/**
 * Desktop CRM container for Camerieri area (single pane).
 */
export function CamerieriPage({ city }: CamerieriPageProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const { items, filteredItems, searchQuery, setSearchQuery, activeFilter, setActiveFilter } = useCamerieri(city)
  const activeCount = useMemo(() => items.filter((item) => item.isActive).length, [items])

  return (
    <div className="h-full min-h-0 p-6">
      <div className="flex h-full min-h-0 flex-col gap-3">
        <div className="grid items-center gap-3 md:grid-cols-[1fr_auto_1fr]">
          <div className="flex items-center gap-3">
            <div className="relative w-full max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Cerca per nome, email, telefono o tag..."
                className="pl-9"
              />
            </div>
            <Select value={activeFilter} onValueChange={(value) => setActiveFilter(value as CamerieriActiveFilter)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Stato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti</SelectItem>
                <SelectItem value="active">Attivi</SelectItem>
                <SelectItem value="inactive">Non attivi</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-center gap-2">
            <Badge variant="secondary">Totale: {items.length}</Badge>
            <Badge variant="outline">Attivi: {activeCount}</Badge>
          </div>
          <div className="flex items-center justify-end">
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus data-icon="inline-start" />
              Crea Cameriere
            </Button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card">
          <div className="h-full min-h-0 overflow-auto">
            <CamerieriCrmPanel items={filteredItems} />
          </div>
        </div>
      </div>
      <CreateCameriereDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
    </div>
  )
}
