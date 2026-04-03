import { Mail, Phone, UserCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { ContactMessageStatusBadge } from "./ContactMessageStatusBadge"
import type { ContactMessage, ContactMessageStatus } from "./types"

function formatDateTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Data non valida"
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

type ContactMessageDetailSheetProps = {
  message: ContactMessage | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdateStatus: (messageId: string, status: ContactMessageStatus) => void
}

export function ContactMessageDetailSheet({
  message,
  open,
  onOpenChange,
  onUpdateStatus,
}: ContactMessageDetailSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl">
        {message ? (
          <div className="flex h-full flex-col gap-6">
            <SheetHeader>
              <div className="flex items-center gap-2">
                <SheetTitle>{message.fullName}</SheetTitle>
                <ContactMessageStatusBadge status={message.status} />
              </div>
              <SheetDescription>
                Ricevuto il {formatDateTime(message.createdAt)} dal form pubblico.
              </SheetDescription>
            </SheetHeader>

            <section className="grid gap-3 rounded-md border p-4 text-sm">
              <div className="flex items-center gap-2">
                <Mail className="size-4 text-muted-foreground" />
                <span>{message.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="size-4 text-muted-foreground" />
                <span>{message.phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <UserCircle2 className="size-4 text-muted-foreground" />
                <span>
                  {message.company ? `${message.company} • ` : ""}
                  {message.city || "Citta non indicata"}
                </span>
              </div>
            </section>

            <section className="rounded-md border p-4">
              <p className="mb-2 text-sm font-medium">Messaggio</p>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{message.message}</p>
            </section>

            <section className="mt-auto flex flex-wrap gap-2 border-t pt-4">
              {message.status !== "nuovo" ? (
                <Button variant="outline" onClick={() => onUpdateStatus(message.id, "nuovo")}>
                  Segna come nuovo
                </Button>
              ) : null}
              {message.status !== "letto" ? (
                <Button variant="outline" onClick={() => onUpdateStatus(message.id, "letto")}>
                  Segna come letto
                </Button>
              ) : null}
              {message.status !== "archiviato" ? (
                <Button onClick={() => onUpdateStatus(message.id, "archiviato")}>Archivia</Button>
              ) : null}
            </section>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
