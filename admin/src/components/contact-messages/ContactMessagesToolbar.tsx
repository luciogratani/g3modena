import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { ContactMessageStatus } from "./types"

export type StatusFilter = "all" | ContactMessageStatus

type ContactMessagesToolbarProps = {
  query: string
  onQueryChange: (value: string) => void
  statusFilter: StatusFilter
  onStatusFilterChange: (value: StatusFilter) => void
}

export function ContactMessagesToolbar({
  query,
  onQueryChange,
  statusFilter,
  onStatusFilterChange,
}: ContactMessagesToolbarProps) {
  return (
    <div className="grid gap-3 md:grid-cols-[1fr_220px]">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Cerca per nome, email, citta, azienda o testo messaggio..."
          className="pl-9"
        />
      </div>
      <Select value={statusFilter} onValueChange={(value) => onStatusFilterChange(value as StatusFilter)}>
        <SelectTrigger>
          <SelectValue placeholder="Filtra per stato" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tutti gli stati</SelectItem>
          <SelectItem value="nuovo">Solo nuovi</SelectItem>
          <SelectItem value="letto">Solo letti</SelectItem>
          <SelectItem value="archiviato">Solo archiviati</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
