import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable"
import { format } from "date-fns"
import { it } from "date-fns/locale"
import { Archive, Calendar as CalendarIcon, Trash2, X } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardHeader } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Drawer, DrawerContent } from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { KANBAN_COLUMNS, type CandidateCity, type TrainingSublaneType } from "@/src/data/mockCandidates"
import { getCandidatesByStatus, MAIN_BOARD_STATUSES } from "@/src/components/candidati-board/board-utils"
import { getAgeFromBirthYear, getFullName, getStatusLabel } from "./candidati-board/candidate-utils"
import { CandidateDetailSheet } from "./candidati-board/CandidateDetailSheet"
import { DailyBoardRecapDialog } from "./candidati-board/DailyBoardRecapDialog"
import { KanbanColumn } from "@/src/components/candidati-board/KanbanColumn"
import { useCandidateBoardState } from "./candidati-board/useCandidateBoardState"
import { WorkflowDrawerLane } from "./candidati-board/WorkflowDrawerLane"

function DatePickerField({
  value,
  placeholder,
  onSelect,
  allowClear = false,
  onClear,
  modifiers,
  legendItems,
}: {
  value: string
  placeholder: string
  onSelect: (nextValue: string) => void
  allowClear?: boolean
  onClear?: () => void
  modifiers?: Record<string, Date[]>
  legendItems?: Array<{ label: string; dotClassName: string }>
}) {
  const selectedDate = value ? new Date(`${value}T00:00:00`) : undefined
  const dotClassByModifier: Record<string, string> = {
    interview: "bg-primary",
    theory: "bg-amber-500",
    practice: "bg-emerald-500",
    activity: "bg-muted-foreground/70",
  }

  return (
    <Popover modal>
      <div className="flex items-center gap-2">
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn("w-full justify-start text-left font-normal", !value && "text-muted-foreground")}
          >
            <CalendarIcon className="mr-2 size-4" />
            {selectedDate ? format(selectedDate, "dd MMM yyyy", { locale: it }) : placeholder}
          </Button>
        </PopoverTrigger>
        {allowClear ? (
          <Button
            type="button"
            size="icon"
            variant="outline"
            aria-label="Cancella data"
            disabled={!value}
            onClick={() => onClear?.()}
          >
            <X className="size-4" />
          </Button>
        ) : null}
      </div>
      <PopoverContent className="z-[70] w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          modifiers={modifiers}
          components={{
            DayContent: (dayProps: any) => {
              const activeModifiers = (dayProps?.activeModifiers ?? {}) as Record<string, boolean>
              const specificModifiers = ["interview", "theory", "practice"].filter(
                (modifierKey) => activeModifiers[modifierKey],
              )
              const fallbackModifiers =
                specificModifiers.length === 0 && activeModifiers.activity ? ["activity"] : []
              const dayModifiers = [...specificModifiers, ...fallbackModifiers]

              return (
                <div className="flex h-full w-full flex-col items-center justify-center leading-none">
                  <span>{dayProps?.date?.getDate?.() ?? ""}</span>
                  <span className="mt-0.5 flex min-h-[4px] items-center gap-0.5">
                    {dayModifiers.map((modifierKey) => (
                      <span
                        key={modifierKey}
                        className={cn("size-1 rounded-full", dotClassByModifier[modifierKey] ?? "bg-muted")}
                      />
                    ))}
                  </span>
                </div>
              )
            },
          }}
          onSelect={(date) => {
            if (!date) return
            const year = date.getFullYear()
            const month = String(date.getMonth() + 1).padStart(2, "0")
            const day = String(date.getDate()).padStart(2, "0")
            onSelect(`${year}-${month}-${day}`)
          }}
          initialFocus
        />
        {legendItems && legendItems.length > 0 ? (
          <div className="border-t px-3 py-2">
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
              {legendItems.map((legendItem) => (
                <span key={legendItem.label} className="inline-flex items-center gap-1.5">
                  <span className={cn("size-2 rounded-full", legendItem.dotClassName)} />
                  {legendItem.label}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  )
}

export function CandidatiBoard({ boardCity = "modena" }: { boardCity?: CandidateCity }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const {
    boardState,
    selectedCandidate,
    selectedCandidateStatus,
    sheetOpen,
    activeCandidate,
    overlayStatus,
    workflowDrawerOpen,
    postponeDialogOpen,
    interviewDialogOpen,
    trainingDialogOpen,
    dailyRecapOpen,
    dailyRecapSkipToday,
    dailyRecap,
    schedulingCalendar,
    postponeCandidate,
    postponeDate,
    postponeReason,
    interviewDate,
    interviewTime,
    interviewNote,
    trainingPhase,
    trainingDate,
    trainingNote,
    trainingSublanes,
    newColumnFilters,
    rimandatiCandidates,
    archivioCandidates,
    setSheetOpen,
    setWorkflowDrawerOpen,
    setPostponeDate,
    setPostponeReason,
    setInterviewDate,
    setInterviewTime,
    setInterviewNote,
    setTrainingPhase,
    setTrainingDate,
    setTrainingNote,
    setDailyRecapSkipToday,
    handleOpenDetail,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    clearActiveDrag,
    handleToggleNewColumnFilter,
    handleToggleLanguageFilter,
    handleClearArchived,
    handleRestoreCandidate,
    handleRestoreArchivedCandidate,
    handleArchiveCandidate,
    handleRequestInterviewCandidate,
    handleRequestTrainingCandidate,
    handleRequestPostponeCandidate,
    handleUpdateGeneralNotes,
    handleUpdateInterviewDetails,
    handleUpdateTrainingDetails,
    handleUpdatePostponeDetails,
    handleConfirmPostponeCandidate,
    handlePostponeDialogOpenChange,
    handleInterviewDialogOpenChange,
    handleConfirmInterviewTransition,
    handleTrainingDialogOpenChange,
    handleConfirmTrainingTransition,
    handleDailyRecapOpenChange,
    handleOpenRimandatiFromRecap,
  } = useCandidateBoardState()

  return (
    <div className="relative flex h-full min-w-0 flex-col overflow-x-auto bg-background p-6">
      <div className="flex-1">
        <div className="flex h-full min-w-max gap-4">
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDragCancel={clearActiveDrag}
          >
            {KANBAN_COLUMNS.filter(({ id }) => MAIN_BOARD_STATUSES.includes(id)).map(({ id, label }) => (
              <KanbanColumn
                key={id}
                status={id}
                label={label}
                candidates={getCandidatesByStatus(boardState, id)}
                boardCity={boardCity}
                filters={newColumnFilters}
                trainingSublanes={id === "formazione" ? trainingSublanes : undefined}
                onToggleFilter={handleToggleNewColumnFilter}
                onToggleLanguageFilter={handleToggleLanguageFilter}
                onOpenDetail={handleOpenDetail}
                onScheduleInterview={handleRequestInterviewCandidate}
                onPlanTraining={handleRequestTrainingCandidate}
                onPostpone={handleRequestPostponeCandidate}
                onArchive={handleArchiveCandidate}
                postponeReminderCounts={
                  id === "in_attesa"
                    ? {
                        overdueCount: dailyRecap.postponeSummary.overdueCount,
                        dueTodayCount: dailyRecap.postponeSummary.dueTodayCount,
                      }
                    : undefined
                }
                trainingTodayCount={id === "formazione" ? dailyRecap.trainingTodayCount : undefined}
                dragMode={id === "formazione" ? Boolean(activeCandidate) : false}
              />
            ))}
            <DragOverlay>
              {activeCandidate ? (
                <div className="relative">
                  <Badge variant="default" className="absolute -left-4 -top-2 z-10">
                    {overlayStatus ? getStatusLabel(overlayStatus) : "In movimento"}
                  </Badge>
                  <Card className="w-72 border shadow-2xl opacity-95">
                    <CardHeader className="pb-6">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{getFullName(activeCandidate)}</p>
                          <p className="text-xs text-muted-foreground">
                            {getAgeFromBirthYear(activeCandidate.birthYear)} anni · {activeCandidate.residenceCity}
                          </p>
                        </div>
                        <Avatar className="size-10 shrink-0">
                          <AvatarImage
                            src={activeCandidate.profileImage}
                            alt={getFullName(activeCandidate)}
                            className="object-cover"
                          />
                          <AvatarFallback>
                            {activeCandidate.firstName[0]}
                            {activeCandidate.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    </CardHeader>
                  </Card>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      </div>

      <div className="pointer-events-none fixed bottom-6 right-6 z-40">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
        <Button
          type="button"
          className="pointer-events-auto h-11 w-11 rounded-full p-0 shadow-lg"
                aria-label="Apri Rimandati e Archivio"
          onClick={() => setWorkflowDrawerOpen(true)}
        >
          <Archive className="size-5" />
        </Button>
            </TooltipTrigger>
            <TooltipContent side="left" align="center" sideOffset={8}>
              Apri Rimandati e Archivio
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <Drawer open={workflowDrawerOpen} onOpenChange={setWorkflowDrawerOpen}>
        <DrawerContent className="max-h-[75vh]">
          <div className="mt-4 overflow-y-auto px-40 pb-6">
            <div className="grid gap-4">
              <WorkflowDrawerLane
                laneType="rimandati"
                title="Rimandati"
                description="Candidature in attesa di ricontatto con data/motivo impostati."
                candidates={rimandatiCandidates}
                onOpenDetail={handleOpenDetail}
                onRestore={handleRestoreCandidate}
                onArchive={handleArchiveCandidate}
              />
              <WorkflowDrawerLane
                laneType="archivio"
                title="Archivio"
                description="Storico candidature non attive."
                candidates={archivioCandidates}
                onOpenDetail={handleOpenDetail}
                onRestore={handleRestoreArchivedCandidate}
                onArchive={handleArchiveCandidate}
                action={(
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button
                        type="button"
                        className={cn(
                          "rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                          archivioCandidates.length === 0 && "pointer-events-none opacity-40",
                        )}
                        aria-label="Svuota archivio"
                        disabled={archivioCandidates.length === 0}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Svuotare Archivio?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Questa azione rimuove tutti i candidati dalla colonna Archivio (mock).
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annulla</AlertDialogCancel>
                        <AlertDialogAction onClick={handleClearArchived}>Svuota</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              />
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      <Dialog open={interviewDialogOpen} onOpenChange={handleInterviewDialogOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pianifica colloquio</DialogTitle>
            <DialogDescription>
              Completa i dettagli del colloquio prima di confermare lo spostamento in colonna Colloquio.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Data colloquio</label>
              <DatePickerField
                value={interviewDate}
                placeholder="Seleziona data colloquio"
                onSelect={setInterviewDate}
                modifiers={{
                  activity: schedulingCalendar.activityDays,
                  interview: schedulingCalendar.interviewDays,
                  theory: schedulingCalendar.trainingTheoryDays,
                  practice: schedulingCalendar.trainingPracticeDays,
                }}
                legendItems={[
                  { label: "Colloqui", dotClassName: "bg-primary" },
                  { label: "Teoria", dotClassName: "bg-amber-500" },
                  { label: "Pratica", dotClassName: "bg-emerald-500" },
                ]}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="interview-time" className="text-sm font-medium">
                Ora
              </label>
              <Input
                id="interview-time"
                type="time"
                value={interviewTime}
                onChange={(event) => setInterviewTime(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="interview-note" className="text-sm font-medium">
                Nota (opzionale)
              </label>
              <Textarea
                id="interview-note"
                value={interviewNote}
                onChange={(event) => setInterviewNote(event.target.value)}
                placeholder="Es. primo contatto positivo, confermare disponibilita."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleInterviewDialogOpenChange(false)}>
              Annulla
            </Button>
            <Button onClick={handleConfirmInterviewTransition} disabled={!interviewDate.trim()}>
              Conferma spostamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={trainingDialogOpen} onOpenChange={handleTrainingDialogOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pianifica formazione</DialogTitle>
            <DialogDescription>
              Seleziona la fase attiva e la relativa data di formazione.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Fase attiva</label>
              <div className="grid grid-cols-2 gap-2">
                {(["teoria", "pratica"] as TrainingSublaneType[]).map((phase) => (
                  <Button
                    key={phase}
                    type="button"
                    variant={trainingPhase === phase ? "default" : "outline"}
                    onClick={() => {
                      setTrainingPhase(phase)
                    }}
                  >
                    {phase === "teoria" ? "Teoria" : "Pratica"}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Data fase attiva</label>
              <DatePickerField
                value={trainingDate}
                placeholder={`Seleziona data ${trainingPhase}`}
                onSelect={setTrainingDate}
                allowClear
                onClear={() => setTrainingDate("")}
                modifiers={{
                  activity: schedulingCalendar.activityDays,
                  interview: schedulingCalendar.interviewDays,
                  theory: schedulingCalendar.trainingTheoryDays,
                  practice: schedulingCalendar.trainingPracticeDays,
                }}
                legendItems={[
                  { label: "Colloqui", dotClassName: "bg-primary" },
                  { label: "Teoria", dotClassName: "bg-amber-500" },
                  { label: "Pratica", dotClassName: "bg-emerald-500" },
                ]}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="training-note" className="text-sm font-medium">
                Nota formazione (opzionale)
              </label>
              <Textarea
                id="training-note"
                value={trainingNote}
                onChange={(event) => setTrainingNote(event.target.value)}
                placeholder="Es. teoria in aula con gruppo A, pratica da calendarizzare."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleTrainingDialogOpenChange(false)}>
              Annulla
            </Button>
            <Button
              onClick={handleConfirmTrainingTransition}
            >
              Conferma spostamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={postponeDialogOpen} onOpenChange={handlePostponeDialogOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rimanda candidatura</DialogTitle>
            <DialogDescription>
              Inserisci data e motivo per rimandare
              {postponeCandidate ? ` ${getFullName(postponeCandidate)}` : " il candidato"}.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Data</label>
              <DatePickerField
                value={postponeDate}
                placeholder="Seleziona data ricontatto"
                onSelect={setPostponeDate}
                modifiers={{
                  activity: schedulingCalendar.activityDays,
                  interview: schedulingCalendar.interviewDays,
                  theory: schedulingCalendar.trainingTheoryDays,
                  practice: schedulingCalendar.trainingPracticeDays,
                }}
                legendItems={[
                  { label: "Colloqui", dotClassName: "bg-primary" },
                  { label: "Teoria", dotClassName: "bg-amber-500" },
                  { label: "Pratica", dotClassName: "bg-emerald-500" },
                  { label: "Altre attività", dotClassName: "bg-muted-foreground/70" },
                ]}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="postpone-reason" className="text-sm font-medium">
                Motivo
              </label>
              <Textarea
                id="postpone-reason"
                value={postponeReason}
                onChange={(event) => setPostponeReason(event.target.value)}
                placeholder="Es. attualmente non disponibile, ricontattare dopo la data indicata."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => handlePostponeDialogOpenChange(false)}>
              Annulla
            </Button>
            <Button onClick={handleConfirmPostponeCandidate} disabled={!postponeDate || !postponeReason.trim()}>
              Conferma rimando
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DailyBoardRecapDialog
        open={dailyRecapOpen}
        skipToday={dailyRecapSkipToday}
        recap={dailyRecap}
        onOpenChange={handleDailyRecapOpenChange}
        onSkipTodayChange={setDailyRecapSkipToday}
        onOpenRimandati={handleOpenRimandatiFromRecap}
      />

      <CandidateDetailSheet
        candidate={selectedCandidate}
        status={selectedCandidateStatus}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onRequestInterview={handleRequestInterviewCandidate}
        onRequestTraining={handleRequestTrainingCandidate}
        onRequestPostpone={handleRequestPostponeCandidate}
        onSaveGeneralNotes={handleUpdateGeneralNotes}
        onSaveInterviewDetails={handleUpdateInterviewDetails}
        onSaveTrainingDetails={handleUpdateTrainingDetails}
        onSavePostponeDetails={handleUpdatePostponeDetails}
      />
    </div>
  )
}
