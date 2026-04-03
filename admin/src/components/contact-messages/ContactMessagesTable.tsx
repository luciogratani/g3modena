import { Archive, Check, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ContactMessageStatusBadge } from "./ContactMessageStatusBadge"
import type { ContactMessage, ContactMessageStatus } from "./types"

function formatDateTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Data non valida"
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

type ContactMessagesTableProps = {
  messages: ContactMessage[]
  onOpenMessage: (message: ContactMessage) => void
  onUpdateStatus: (messageId: string, status: ContactMessageStatus) => void
}

export function ContactMessagesTable({
  messages,
  onOpenMessage,
  onUpdateStatus,
}: ContactMessagesTableProps) {
  if (messages.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-8 text-center">
        <p className="text-sm font-medium">Nessun messaggio per i filtri correnti</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Prova ad allargare la ricerca o cambiare stato.
        </p>
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Mittente</TableHead>
          <TableHead className="hidden lg:table-cell">Contatto</TableHead>
          <TableHead className="hidden xl:table-cell">Anteprima messaggio</TableHead>
          <TableHead>Stato</TableHead>
          <TableHead>Ricevuto</TableHead>
          <TableHead className="w-[140px] text-right">Azioni</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {messages.map((message) => (
          <TableRow key={message.id}>
            <TableCell>
              <div className="flex flex-col">
                <span className="font-medium">{message.fullName}</span>
                <span className="text-xs text-muted-foreground">{message.city || "Citta non indicata"}</span>
              </div>
            </TableCell>
            <TableCell className="hidden lg:table-cell">
              <div className="flex flex-col">
                <span className="text-sm">{message.email}</span>
                <span className="text-xs text-muted-foreground">{message.phone}</span>
              </div>
            </TableCell>
            <TableCell className="hidden max-w-[320px] truncate xl:table-cell text-muted-foreground">
              {message.message}
            </TableCell>
            <TableCell>
              <ContactMessageStatusBadge status={message.status} />
            </TableCell>
            <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{formatDateTime(message.createdAt)}</TableCell>
            <TableCell className="text-right">
              <TooltipProvider>
                <div className="flex justify-end gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => onOpenMessage(message)}
                        aria-label={`Apri dettaglio di ${message.fullName}`}
                      >
                        <Eye className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Apri dettaglio</TooltipContent>
                  </Tooltip>
                  {message.status !== "letto" ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => onUpdateStatus(message.id, "letto")}
                          aria-label={`Segna come letto ${message.fullName}`}
                        >
                          <Check className="size-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Segna letto</TooltipContent>
                    </Tooltip>
                  ) : null}
                  {message.status !== "archiviato" ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => onUpdateStatus(message.id, "archiviato")}
                          aria-label={`Archivia ${message.fullName}`}
                        >
                          <Archive className="size-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Archivia</TooltipContent>
                    </Tooltip>
                  ) : null}
                </div>
              </TooltipProvider>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
