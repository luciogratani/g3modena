import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TooltipProvider } from "@/components/ui/tooltip"
import { QuickContactIconButtons } from "@/src/components/candidati-board/QuickContactIconButtons"
import type { Cameriere } from "./types"
import { CamerieriTagIconGroup } from "./CamerieriTagIconGroup"
import { TIMELINE_HEADER_HEIGHT_CLASS, TIMELINE_ROW_HEIGHT_CLASS } from "./timeline-constants"

const STICKY_HEADER_CLASS = "sticky top-0 z-20 bg-background"

type CamerieriTableProps = {
  items: Cameriere[]
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase()
}

function formatUpdatedShort(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" })
  } catch {
    return "—"
  }
}

/**
 * CRM table: one fixed-height row per waiter; horizontal scroll when the panel is narrow.
 */
export function CamerieriTable({ items }: CamerieriTableProps) {
  return (
    <div className="min-h-full overflow-x-auto overflow-y-visible">
      <TooltipProvider delayDuration={300}>
        <Table containerClassName="overflow-visible" className="w-full min-w-[640px] table-fixed">
          <colgroup>
            <col className="w-[52px]" />
            <col />
            <col className="w-[120px]" />
            <col className="w-[108px]" />
            <col className="w-[128px]" />
          </colgroup>
          <TableHeader>
            <TableRow className={`${TIMELINE_HEADER_HEIGHT_CLASS} hover:bg-transparent`}>
              <TableHead className={`${TIMELINE_HEADER_HEIGHT_CLASS} ${STICKY_HEADER_CLASS} px-2 py-0 align-middle`}> </TableHead>
              <TableHead className={`${TIMELINE_HEADER_HEIGHT_CLASS} ${STICKY_HEADER_CLASS} py-0 align-middle`}>Nome</TableHead>
              <TableHead className={`${TIMELINE_HEADER_HEIGHT_CLASS} ${STICKY_HEADER_CLASS} py-0 align-middle`}>Contatti</TableHead>
              <TableHead className={`${TIMELINE_HEADER_HEIGHT_CLASS} ${STICKY_HEADER_CLASS} py-0 align-middle`}>Stato</TableHead>
              <TableHead className={`${TIMELINE_HEADER_HEIGHT_CLASS} ${STICKY_HEADER_CLASS} py-0 align-middle`}>Attributi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className={`${TIMELINE_ROW_HEIGHT_CLASS} py-0 text-center text-muted-foreground`}>
                  Nessun cameriere in elenco.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id} className={TIMELINE_ROW_HEIGHT_CLASS}>
                  <TableCell className={`${TIMELINE_ROW_HEIGHT_CLASS} px-2 py-0 align-middle`}>
                    <Avatar className="size-9 shrink-0">
                      <AvatarImage src={item.avatarUrl} alt={`${item.firstName} ${item.lastName}`} className="object-cover" />
                      <AvatarFallback className="text-xs">{getInitials(item.firstName, item.lastName)}</AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell className={`${TIMELINE_ROW_HEIGHT_CLASS} max-w-0 py-0 align-middle`}>
                    <div className="flex h-full min-w-0 items-center gap-2 overflow-hidden whitespace-nowrap" title={`${item.firstName} ${item.lastName}`}>
                      <span className="min-w-0 truncate font-medium text-foreground">
                        {item.firstName} {item.lastName}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">· agg. {formatUpdatedShort(item.updatedAt)}</span>
                    </div>
                  </TableCell>
                  <TableCell className={`${TIMELINE_ROW_HEIGHT_CLASS} py-0 align-middle`}>
                    <QuickContactIconButtons phone={item.phone} email={item.email} />
                  </TableCell>
                  <TableCell className={`${TIMELINE_ROW_HEIGHT_CLASS} py-0 align-middle`}>
                    <Badge variant={item.isActive ? "default" : "secondary"} className="shrink-0 whitespace-nowrap">
                      {item.isActive ? "Attivo" : "Non attivo"}
                    </Badge>
                  </TableCell>
                  <TableCell className={`${TIMELINE_ROW_HEIGHT_CLASS} max-w-0 py-0 align-middle`}>
                    <CamerieriTagIconGroup tags={item.tags} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TooltipProvider>
    </div>
  )
}
