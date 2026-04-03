import { Badge } from "@/components/ui/badge"
import type { ContactMessageStatus } from "./types"

const STATUS_LABEL: Record<ContactMessageStatus, string> = {
  nuovo: "Nuovo",
  letto: "Letto",
  archiviato: "Archiviato",
}

const STATUS_CLASSNAME: Record<ContactMessageStatus, string> = {
  nuovo: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  letto: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  archiviato: "border-muted-foreground/20 bg-muted text-muted-foreground",
}

type ContactMessageStatusBadgeProps = {
  status: ContactMessageStatus
}

export function ContactMessageStatusBadge({ status }: ContactMessageStatusBadgeProps) {
  return (
    <Badge variant="outline" className={STATUS_CLASSNAME[status]}>
      {STATUS_LABEL[status]}
    </Badge>
  )
}
