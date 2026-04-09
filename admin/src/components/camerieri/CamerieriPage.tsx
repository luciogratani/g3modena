import { useEffect, useMemo, useRef, useState } from "react"
import { Plus, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { CandidateCity } from "@/src/data/mockCandidates"
import { CreateCameriereDialog } from "./CreateCameriereDialog"
import { CamerieriCrmPanel } from "./CamerieriCrmPanel"
import { CamerieriTimelinePanel } from "./CamerieriTimelinePanel"
import { useCamerieri, type CamerieriActiveFilter } from "./useCamerieri"

type CamerieriPageProps = {
  city: CandidateCity
}

const DEBUG_SCROLL_SYNC = true

/**
 * Desktop split-view container for Camerieri area.
 * Left panel hosts CRM table, right panel is the timeline placeholder shell.
 */
export function CamerieriPage({ city }: CamerieriPageProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const { items, filteredItems, searchQuery, setSearchQuery, activeFilter, setActiveFilter } = useCamerieri(city)
  const activeCount = useMemo(() => items.filter((item) => item.isActive).length, [items])
  const leftScrollRef = useRef<HTMLDivElement | null>(null)
  const rightScrollRef = useRef<HTMLDivElement | null>(null)
  const syncingFromRef = useRef<"left" | "right" | null>(null)

  function logScrollSync(event: string, extra?: Record<string, unknown>) {
    if (!DEBUG_SCROLL_SYNC) return
    const left = leftScrollRef.current
    const right = rightScrollRef.current
    console.info("[camerieri-scroll-sync]", event, {
      leftScrollTop: left?.scrollTop ?? null,
      rightScrollTop: right?.scrollTop ?? null,
      syncingFrom: syncingFromRef.current,
      ...extra,
    })
  }

  function syncVerticalScroll(source: "left" | "right"): void {
    const left = leftScrollRef.current
    const right = rightScrollRef.current
    if (!left || !right) return
    logScrollSync("sync:start", { source })

    if (source === "left") {
      if (syncingFromRef.current === "right") {
        syncingFromRef.current = null
        logScrollSync("sync:skip-loop", { source })
        return
      }
      syncingFromRef.current = "left"
      right.scrollTop = left.scrollTop
      logScrollSync("sync:applied", { source, appliedTo: "right" })
      requestAnimationFrame(() => {
        if (syncingFromRef.current === "left") syncingFromRef.current = null
        logScrollSync("sync:raf-clear", { source })
      })
      return
    }

    if (syncingFromRef.current === "left") {
      syncingFromRef.current = null
      logScrollSync("sync:skip-loop", { source })
      return
    }
    syncingFromRef.current = "right"
    left.scrollTop = right.scrollTop
    logScrollSync("sync:applied", {
      source,
      appliedTo: "left",
      targetScrollTop: right.scrollTop,
      leftClientHeight: left.clientHeight,
      leftScrollHeight: left.scrollHeight,
    })
    requestAnimationFrame(() => {
      if (syncingFromRef.current === "right") syncingFromRef.current = null
      logScrollSync("sync:raf-clear", { source })
    })
  }

  useEffect(() => {
    const left = leftScrollRef.current
    const right = rightScrollRef.current
    if (!left || !right) return

    function onLeftScroll() {
      logScrollSync("event:left-scroll")
      syncVerticalScroll("left")
    }

    function onRightScroll() {
      logScrollSync("event:right-scroll")
      syncVerticalScroll("right")
    }

    left.addEventListener("scroll", onLeftScroll, { passive: true })
    right.addEventListener("scroll", onRightScroll, { passive: true })
    logScrollSync("listeners:attached", {
      leftClientHeight: left.clientHeight,
      leftScrollHeight: left.scrollHeight,
      rightClientHeight: right.clientHeight,
      rightScrollHeight: right.scrollHeight,
    })
    return () => {
      left.removeEventListener("scroll", onLeftScroll)
      right.removeEventListener("scroll", onRightScroll)
      logScrollSync("listeners:detached")
    }
  }, [filteredItems.length])

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
          <ResizablePanelGroup direction="horizontal" className="h-full min-h-0">
            <ResizablePanel defaultSize={70} minSize={50}>
              <div
                ref={leftScrollRef}
                className="h-full min-h-0 overflow-auto border-r border-border"
              >
                <CamerieriCrmPanel items={filteredItems} />
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={30} minSize={20}>
              <div
                ref={rightScrollRef}
                className="h-full min-h-0 overflow-auto"
              >
                <CamerieriTimelinePanel items={filteredItems} />
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>
      <CreateCameriereDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
    </div>
  )
}
