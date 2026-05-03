import { useState } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { badgeVariants } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TooltipProvider } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { QuickContactIconButtons } from "@/src/components/candidati-board/QuickContactIconButtons"
import type { Cameriere } from "./types"
import { CamerieriTagIconGroup } from "./CamerieriTagIconGroup"

/** Layout aligned with table header (`TableHead` default `h-12`) and compact CRM rows */
const HEADER_HEIGHT_CLASS = "h-12"
const ROW_HEIGHT_CLASS = "h-14"
const STICKY_HEADER_CLASS = "sticky top-0 z-20 bg-background"

type CamerieriTableProps = {
  items: Cameriere[]
  onToggleIsActive?: (item: Cameriere, isActive: boolean) => Promise<void>
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
export function CamerieriTable({ items, onToggleIsActive }: CamerieriTableProps) {
  const [busyStaffId, setBusyStaffId] = useState<string | null>(null)

  async function handleToggle(item: Cameriere) {
    if (!onToggleIsActive || busyStaffId !== null) return
    const next = !item.isActive
    setBusyStaffId(item.id)
    try {
      await onToggleIsActive(item, next)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Impossibile aggiornare lo stato.")
    } finally {
      setBusyStaffId(null)
    }
  }

  return (
    <div className="min-h-full overflow-x-auto overflow-y-visible">
      <TooltipProvider delayDuration={300}>
        <Table className="w-full min-w-[640px] table-fixed">
          <colgroup>
            <col className="w-[52px]" />
            <col />
            <col className="w-[120px]" />
            <col className="w-[108px]" />
            <col className="w-[128px]" />
          </colgroup>
          <TableHeader>
            <TableRow className={`${HEADER_HEIGHT_CLASS} hover:bg-transparent`}>
              <TableHead className={`${HEADER_HEIGHT_CLASS} ${STICKY_HEADER_CLASS} px-2 py-0 align-middle`}> </TableHead>
              <TableHead className={`${HEADER_HEIGHT_CLASS} ${STICKY_HEADER_CLASS} py-0 align-middle`}>Nome</TableHead>
              <TableHead className={`${HEADER_HEIGHT_CLASS} ${STICKY_HEADER_CLASS} py-0 align-middle`}>Contatti</TableHead>
              <TableHead className={`${HEADER_HEIGHT_CLASS} ${STICKY_HEADER_CLASS} py-0 align-middle`}>Stato</TableHead>
              <TableHead className={`${HEADER_HEIGHT_CLASS} ${STICKY_HEADER_CLASS} py-0 align-middle`}>Attributi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className={`${ROW_HEIGHT_CLASS} py-0 text-center text-muted-foreground`}>
                  Nessun cameriere in elenco.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id} className={ROW_HEIGHT_CLASS}>
                  <TableCell className={`${ROW_HEIGHT_CLASS} px-2 py-0 align-middle`}>
                    <Avatar className="size-9 shrink-0">
                      <AvatarImage src={item.avatarUrl} alt={`${item.firstName} ${item.lastName}`} className="object-cover" />
                      <AvatarFallback className="text-xs">{getInitials(item.firstName, item.lastName)}</AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell className={`${ROW_HEIGHT_CLASS} max-w-0 py-0 align-middle`}>
                    <div className="flex h-full min-w-0 items-center gap-2 overflow-hidden whitespace-nowrap" title={`${item.firstName} ${item.lastName}`}>
                      <span className="min-w-0 truncate font-medium text-foreground">
                        {item.firstName} {item.lastName}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">· agg. {formatUpdatedShort(item.updatedAt)}</span>
                    </div>
                  </TableCell>
                  <TableCell className={`${ROW_HEIGHT_CLASS} py-0 align-middle`}>
                    <QuickContactIconButtons phone={item.phone} email={item.email} />
                  </TableCell>
                  <TableCell className={`${ROW_HEIGHT_CLASS} py-0 align-middle`}>
                    {onToggleIsActive ? (
                      <button
                        type="button"
                        className={cn(
                          badgeVariants({ variant: item.isActive ? "default" : "secondary" }),
                          "cursor-pointer shrink-0 gap-1 whitespace-nowrap disabled:pointer-events-none disabled:opacity-60",
                        )}
                        disabled={busyStaffId !== null}
                        aria-busy={busyStaffId === item.id}
                        aria-label={item.isActive ? `Disattiva ${item.firstName} ${item.lastName}` : `Attiva ${item.firstName} ${item.lastName}`}
                        aria-pressed={item.isActive}
                        onClick={() => void handleToggle(item)}
                      >
                        {busyStaffId === item.id ? (
                          <Loader2 className="size-3 shrink-0 animate-spin" aria-hidden />
                        ) : null}
                        <span>{item.isActive ? "Attivo" : "Non attivo"}</span>
                      </button>
                    ) : (
                      <span
                        className={cn(
                          badgeVariants({ variant: item.isActive ? "default" : "secondary" }),
                          "pointer-events-none shrink-0 whitespace-nowrap",
                        )}
                      >
                        {item.isActive ? "Attivo" : "Non attivo"}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className={`${ROW_HEIGHT_CLASS} max-w-0 py-0 align-middle`}>
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
