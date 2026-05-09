import { useMemo, useState } from "react"
import { AlertTriangle, Inbox, Loader2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ContactMessageDetailSheet } from "./ContactMessageDetailSheet"
import { ContactMessagesTable } from "./ContactMessagesTable"
import { ContactMessagesToolbar, type StatusFilter } from "./ContactMessagesToolbar"
import type { ContactMessage } from "./types"
import { useContactMessages } from "./useContactMessages"

function messageMatchesQuery(message: ContactMessage, query: string): boolean {
  if (!query.trim()) return true
  const normalized = query.trim().toLowerCase()
  return (
    message.fullName.toLowerCase().includes(normalized) ||
    message.email.toLowerCase().includes(normalized) ||
    message.phone.toLowerCase().includes(normalized) ||
    message.city.toLowerCase().includes(normalized) ||
    message.company.toLowerCase().includes(normalized) ||
    message.message.toLowerCase().includes(normalized)
  )
}

export function ContactMessagesPage() {
  const { messages, loading, error, refresh, selectedMessage, setSelectedMessageId, counters, setStatus } =
    useContactMessages()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [query, setQuery] = useState("")

  const filteredMessages = useMemo(() => {
    return messages.filter((message) => {
      if (statusFilter !== "all" && message.status !== statusFilter) return false
      return messageMatchesQuery(message, query)
    })
  }, [messages, statusFilter, query])

  return (
    <div className="min-h-full bg-background p-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Totale</CardDescription>
            <CardTitle className="text-xl">{counters.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Nuovi</CardDescription>
            <CardTitle className="text-xl">{counters.newCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Letti</CardDescription>
            <CardTitle className="text-xl">{counters.readCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Archiviati</CardDescription>
            <CardTitle className="text-xl">{counters.archivedCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Inbox className="size-5 text-muted-foreground" />
            <CardTitle className="text-lg">Inbox messaggi</CardTitle>
          </div>
          <CardDescription>
            Lista messaggi con ricerca, filtro stato, dettaglio e aggiornamento rapido.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ContactMessagesToolbar
            query={query}
            onQueryChange={setQuery}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
          />
          {loading ? (
            <div className="rounded-md border p-8">
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Caricamento messaggi in corso...
              </div>
            </div>
          ) : error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-6">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 size-4 text-destructive" />
                <div className="space-y-2">
                  <p className="text-sm font-medium text-destructive">Errore caricamento inbox</p>
                  <p className="text-sm text-muted-foreground">{error}</p>
                  <Button variant="outline" size="sm" onClick={() => void refresh()}>
                    <RefreshCw className="mr-2 size-4" />
                    Riprova
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <ContactMessagesTable
              messages={filteredMessages}
              onOpenMessage={(message) => setSelectedMessageId(message.id)}
              onUpdateStatus={setStatus}
            />
          )}
        </CardContent>
      </Card>

      <ContactMessageDetailSheet
        message={selectedMessage}
        open={Boolean(selectedMessage)}
        onOpenChange={(open) => {
          if (!open) setSelectedMessageId(null)
        }}
        onUpdateStatus={setStatus}
      />
    </div>
  )
}
