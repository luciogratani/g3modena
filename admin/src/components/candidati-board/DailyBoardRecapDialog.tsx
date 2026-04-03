import { useEffect, useState } from "react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Card, CardHeader } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { formatCandidateDate, parseSafeDate } from "./date-utils"

type DailyBoardRecapItem = {
  id: string
  fullName: string
  postponedUntil: string
}

type DailyBoardRecap = {
  newCount: number
  interviewsTodayCount: number
  trainingTodayCount: number
  postponedCandidates: DailyBoardRecapItem[]
  postponedTotalCount: number
  postponeSummary: {
    overdueCount: number
    dueTodayCount: number
    upcoming7DaysCount: number
  }
}

type DailyBoardRecapDialogProps = {
  open: boolean
  skipToday: boolean
  recap: DailyBoardRecap
  onOpenChange: (open: boolean) => void
  onSkipTodayChange: (value: boolean) => void
  onOpenRimandati: () => void
}

export function DailyBoardRecapDialog({
  open,
  skipToday,
  recap,
  onOpenChange,
  onSkipTodayChange,
  onOpenRimandati,
}: DailyBoardRecapDialogProps) {
  const monitoredPostponedCount =
    recap.postponeSummary.overdueCount + recap.postponeSummary.dueTodayCount + recap.postponeSummary.upcoming7DaysCount
  const hasPostponeAlerts =
    recap.postponeSummary.overdueCount > 0 ||
    recap.postponeSummary.dueTodayCount > 0 ||
    recap.postponeSummary.upcoming7DaysCount > 0
  const postponedCandidatesToMonitor = recap.postponedCandidates.filter((candidate) => {
    const parsedDate = parseSafeDate(candidate.postponedUntil)
    if (!parsedDate) return true
    parsedDate.setHours(0, 0, 0, 0)

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const inSevenDays = new Date(today)
    inSevenDays.setDate(today.getDate() + 7)

    return parsedDate.getTime() <= inSevenDays.getTime()
  })
  const [postponedAccordionValue, setPostponedAccordionValue] = useState<string>(hasPostponeAlerts ? "postponed-monitoring" : "")

  useEffect(() => {
    if (!open) return
    setPostponedAccordionValue(hasPostponeAlerts ? "postponed-monitoring" : "")
  }, [hasPostponeAlerts, open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Riepilogo operativo board</DialogTitle>
          <DialogDescription>
            Situazione rapida della sessione corrente: priorita su colloqui/formazione di oggi e candidati
            rimandati.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-2 py-2">
          <Card className="border bg-muted/30">
            <CardHeader className="space-y-1 p-3">
              <p className="text-xs text-muted-foreground">Nuovi</p>
              <p className="text-xl font-semibold">{recap.newCount}</p>
            </CardHeader>
          </Card>
          <Card className="border bg-muted/30">
            <CardHeader className="space-y-1 p-3">
              <p className="text-xs text-muted-foreground">Colloqui oggi</p>
              <p className="text-xl font-semibold">{recap.interviewsTodayCount}</p>
            </CardHeader>
          </Card>
          <Card className="border bg-muted/30">
            <CardHeader className="space-y-1 p-3">
              <p className="text-xs text-muted-foreground">Formazione oggi</p>
              <p className="text-xl font-semibold">{recap.trainingTodayCount}</p>
            </CardHeader>
          </Card>
        </div>
        <Accordion
          type="single"
          collapsible
          value={postponedAccordionValue}
          onValueChange={setPostponedAccordionValue}
          className="rounded-md border bg-muted/20 px-3"
        >
          <AccordionItem value="postponed-monitoring" className="border-b-0">
            <AccordionTrigger className="py-3 text-sm font-medium hover:no-underline">
              Rimandati da monitorare ({monitoredPostponedCount})
            </AccordionTrigger>
            <AccordionContent className="space-y-2 pb-3">
              <div className="grid grid-cols-3 gap-2">
                <Card className="border bg-muted/30">
                  <CardHeader className="space-y-1 p-3">
                    <p className="text-xs text-muted-foreground">Scaduti</p>
                    <p
                      className={`text-lg font-semibold ${recap.postponeSummary.overdueCount > 0 ? "text-destructive" : ""}`}
                    >
                      {recap.postponeSummary.overdueCount}
                    </p>
                  </CardHeader>
                </Card>
                <Card className="border bg-muted/30">
                  <CardHeader className="space-y-1 p-3">
                    <p className="text-xs text-muted-foreground">Oggi</p>
                    <p className="text-lg font-semibold">{recap.postponeSummary.dueTodayCount}</p>
                  </CardHeader>
                </Card>
                <Card className="border bg-muted/30">
                  <CardHeader className="space-y-1 p-3">
                    <p className="text-xs text-muted-foreground">Prossimi 7gg</p>
                    <p className="text-lg font-semibold">{recap.postponeSummary.upcoming7DaysCount}</p>
                  </CardHeader>
                </Card>
              </div>
              {postponedCandidatesToMonitor.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nessun candidato scaduto, odierno o nei prossimi 7 giorni.
                </p>
              ) : (
                <div className="space-y-1 rounded-md border p-3">
                  {postponedCandidatesToMonitor.map((item) => (
                    <p key={item.id} className="text-sm">
                      <span className="font-medium">{item.fullName}</span>
                      <span className="text-muted-foreground">
                        {" - "}
                        {formatCandidateDate(item.postponedUntil, "dd MMM", item.postponedUntil)}
                      </span>
                    </p>
                  ))}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
        <div className="flex items-center gap-2">
          <Checkbox
            id="daily-recap-hide-today"
            checked={skipToday}
            onCheckedChange={(checked) => onSkipTodayChange(Boolean(checked))}
          />
          <label htmlFor="daily-recap-hide-today" className="text-sm text-muted-foreground">
            Non mostrare piu oggi
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onOpenRimandati}>
            Apri rimandati
          </Button>
          <Button onClick={() => onOpenChange(false)}>Apri board</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
