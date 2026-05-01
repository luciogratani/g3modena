import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { CalendarIcon, Mail, Phone, Search } from "lucide-react"
import { DISCARD_REASON_LABELS, type Candidate, type CandidateStatus } from "@/src/data/mockCandidates"
import { formatCandidateDate } from "./date-utils"
import {
  getAgeFromBirthYear,
  getCandidateCityLabel,
  getFullName,
  getStatusLabel,
  getWorkflowNote,
} from "./candidate-utils"
import { ScoreBadge } from "./ScoreBadge"
import { cn } from "@/lib/utils"

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  )
}

type CandidateDetailSheetProps = {
  candidate: Candidate | null
  status: CandidateStatus | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onRequestInterview: (candidateId: string) => void
  onRequestTraining: (candidateId: string) => void
  onRequestPostpone: (candidateId: string) => void
  onRestoreFromDiscard: (candidateId: string) => void
  onSaveGeneralNotes: (candidateId: string, notes: string) => void
  onSaveInterviewDetails: (
    candidateId: string,
    payload: { interviewDate: string; interviewTime: string; interviewNote: string },
  ) => void
  onSaveTrainingDetails: (
    candidateId: string,
    payload: { trainingTheoryDate: string; trainingPracticeDate: string; trainingNote: string },
  ) => void
  onSavePostponeDetails: (
    candidateId: string,
    payload: { postponedUntil: string; postponeReason: string },
  ) => void
}

function splitDatetimeLocal(value?: string): { date: string; time: string } {
  if (!value) return { date: "", time: "09:00" }
  const [datePart, timePart = "09:00"] = value.split("T")
  return { date: datePart ?? "", time: timePart.slice(0, 5) || "09:00" }
}

function toLocalDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function fromDateKey(dateKey: string): Date | null {
  const [year, month, day] = dateKey.split("-").map((value) => Number(value))
  if (!year || !month || !day) return null
  const date = new Date(year, month - 1, day, 12, 0, 0, 0)
  if (Number.isNaN(date.getTime())) return null
  return date
}

function InlineDatePickerField({
  id,
  label,
  value,
  onChange,
}: {
  id: string
  label: string
  value: string
  onChange: (nextValue: string) => void
}) {
  const selectedDate = value ? (fromDateKey(value) ?? undefined) : undefined
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Popover modal>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            className={cn("w-full justify-start text-left font-normal", !value && "text-muted-foreground")}
          >
            <CalendarIcon className="mr-2 size-4" />
            {value ? formatCandidateDate(value, "d MMM yyyy", "Seleziona data") : "Seleziona data"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="z-[70] w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(nextDate) => onChange(nextDate ? toLocalDateKey(nextDate) : "")}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}

export function CandidateDetailSheet({
  candidate,
  status,
  open,
  onOpenChange,
  onRequestInterview,
  onRequestTraining,
  onRequestPostpone,
  onRestoreFromDiscard,
  onSaveGeneralNotes,
  onSaveInterviewDetails,
  onSaveTrainingDetails,
  onSavePostponeDetails,
}: CandidateDetailSheetProps) {
  const [photoPreviewOpen, setPhotoPreviewOpen] = useState(false)
  const [notesDraft, setNotesDraft] = useState(candidate?.notes ?? "")
  const [isEditingInterview, setIsEditingInterview] = useState(false)
  const [isEditingTraining, setIsEditingTraining] = useState(false)
  const [isEditingPostpone, setIsEditingPostpone] = useState(false)
  const [interviewDateDraft, setInterviewDateDraft] = useState("")
  const [interviewTimeDraft, setInterviewTimeDraft] = useState("09:00")
  const [interviewNoteDraft, setInterviewNoteDraft] = useState("")
  const [trainingTheoryDateDraft, setTrainingTheoryDateDraft] = useState("")
  const [trainingPracticeDateDraft, setTrainingPracticeDateDraft] = useState("")
  const [trainingNoteDraft, setTrainingNoteDraft] = useState("")
  const [postponeDateDraft, setPostponeDateDraft] = useState("")
  const [postponeReasonDraft, setPostponeReasonDraft] = useState("")
  const notesDirty = notesDraft.trim() !== (candidate?.notes ?? "").trim()

  useEffect(() => {
    if (!candidate) return
    setNotesDraft(candidate.notes ?? "")
    const interviewParts = splitDatetimeLocal(candidate.interviewDateTime)
    setInterviewDateDraft(interviewParts.date)
    setInterviewTimeDraft(interviewParts.time)
    setInterviewNoteDraft(candidate.interviewNote ?? "")
    setTrainingTheoryDateDraft(candidate.trainingTheoryDate ?? "")
    setTrainingPracticeDateDraft(candidate.trainingPracticeDate ?? "")
    setTrainingNoteDraft(candidate.trainingNote ?? "")
    setPostponeDateDraft(candidate.postponedUntil ?? "")
    setPostponeReasonDraft(candidate.postponeReason ?? "")
    setIsEditingInterview(false)
    setIsEditingTraining(false)
    setIsEditingPostpone(false)
  }, [
    candidate?.id,
    candidate?.notes,
    candidate?.interviewDateTime,
    candidate?.interviewNote,
    candidate?.trainingTheoryDate,
    candidate?.trainingPracticeDate,
    candidate?.trainingNote,
    candidate?.postponedUntil,
    candidate?.postponeReason,
  ])

  useEffect(() => {
    const candidateId = candidate?.id
    if (!candidateId || !open || !notesDirty) return
    const debounceTimer = window.setTimeout(() => {
      onSaveGeneralNotes(candidateId, notesDraft)
    }, 900)
    return () => window.clearTimeout(debounceTimer)
  }, [candidate?.id, notesDraft, notesDirty, onSaveGeneralNotes, open])

  if (!candidate) return null
  const activeCandidateId = candidate.id
  const workflowNote = status ? getWorkflowNote(candidate, status) : null

  function handleSheetOpenChange(nextOpen: boolean) {
    if (!nextOpen && notesDirty) {
      onSaveGeneralNotes(activeCandidateId, notesDraft)
    }
    onOpenChange(nextOpen)
  }

  return (
    <Sheet open={open} onOpenChange={handleSheetOpenChange}>
      <SheetContent className="flex flex-col overflow-y-auto sm:max-w-xl"> 
        <SheetHeader>
          <SheetTitle>{getFullName(candidate)}</SheetTitle>
          <SheetDescription>
            Candidatura del {formatCandidateDate(candidate.created_at, "d MMMM yyyy")}
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-4">
          <div className="flex items-start gap-4">
            <button
              type="button"
              onClick={() => setPhotoPreviewOpen(true)}
              className="group relative h-28 w-32 overflow-hidden rounded-md border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="Apri anteprima foto profilo"
            >
              <img
                src={candidate.profileImage}
                alt={`Profilo ${getFullName(candidate)}`}
                className="h-full w-full cursor-zoom-in object-cover transition-opacity group-hover:opacity-90"
              />
              <span className="pointer-events-none absolute bottom-1 right-1 inline-flex items-center justify-center rounded-full bg-black/70 p-1 text-white">
                <Search className="size-3" />
              </span>
            </button>
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <ScoreBadge score={candidate.score} />
                {status ? <Badge variant="secondary">Stato: {getStatusLabel(status)}</Badge> : null}
                <Badge variant="outline">Citta candidatura: {getCandidateCityLabel(candidate)}</Badge>
                <Badge variant="outline">Colloquio: {candidate.interviewAvailability}</Badge>
              </div>
              <p className="flex items-center gap-2 text-sm">
                <Mail className="size-4 text-muted-foreground" />
                <a href={`mailto:${candidate.email}`} className="text-primary underline-offset-4 hover:underline">
                  {candidate.email}
                </a>
              </p>
              <p className="flex items-center gap-2 text-sm">
                <Phone className="size-4 text-muted-foreground" />
                {candidate.phone}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {status !== "scartati" ? (
              <>
                <Button type="button" size="sm" variant="outline" onClick={() => onRequestInterview(candidate.id)}>
                  Pianifica colloquio
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => onRequestTraining(candidate.id)}>
                  Pianifica formazione
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => onRequestPostpone(candidate.id)}>
                  Rimanda candidatura
                </Button>
              </>
            ) : (
              <Button type="button" size="sm" onClick={() => onRestoreFromDiscard(candidate.id)}>
                Ripristina candidatura
              </Button>
            )}
          </div>
          <Separator />
          <section className="rounded-lg border bg-muted/30 p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-sm font-medium">Bio</p>
              <Badge variant="secondary">{getAgeFromBirthYear(candidate.birthYear)} anni</Badge>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <DetailRow label="Titolo di studio" value={candidate.educationTitle} />
              <DetailRow label="Citta di residenza" value={candidate.residenceCity} />
              <DetailRow label="Disponibilita lavorativa" value={candidate.availability} />
              <DetailRow label="Lingue parlate" value={candidate.languages.join(", ")} />
            </div>
            <Accordion type="single" collapsible className="mt-3 border-t">
              <AccordionItem value="bio-expanded" className="border-b-0">
                <AccordionTrigger className="py-3 text-sm">Mostra approfondimenti profilo</AccordionTrigger>
                <AccordionContent className="pb-0">
                  <div className="grid gap-4 md:grid-cols-2">
                    <DetailRow
                      label="Studente/studentessa fuori sede"
                      value={candidate.isOffsiteStudent ? "Si" : "No"}
                    />
                    <DetailRow label="Patente" value={candidate.hasDrivingLicense ? "Si" : "No"} />
                    <DetailRow label="Esperienza nel ruolo" value={candidate.hasExperience ? "Si" : "No"} />
                    <DetailRow label="Programmi futuri" value={candidate.futurePlans} />
                    <DetailRow label="Cosa lo/la attira di questo lavoro" value={candidate.jobAttraction} />
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </section>
          {workflowNote ? (
            <>
              <Separator />
              <DetailRow label="Sintesi workflow" value={workflowNote} />
            </>
          ) : null}
          {status === "colloquio" && (
            <section className="rounded-lg border bg-muted/30 p-4">
              <Accordion type="single" collapsible>
                <AccordionItem value="workflow-colloquio" className="border-b-0">
                  <AccordionTrigger className="py-0 text-sm">Dettagli colloquio</AccordionTrigger>
                  <AccordionContent className="pt-3">
                    {!isEditingInterview ? (
                      <>
                        <div className="mb-3 grid gap-4 md:grid-cols-2">
                          <DetailRow
                            label="Data colloquio"
                            value={
                              candidate.interviewDateTime
                                ? formatCandidateDate(candidate.interviewDateTime, "d MMMM yyyy HH:mm")
                                : "Da fissare"
                            }
                          />
                          <DetailRow
                            label="Nota colloquio"
                            value={candidate.interviewNote?.trim() ? candidate.interviewNote : "Nessuna nota"}
                          />
                        </div>
                        <Button type="button" size="sm" variant="outline" onClick={() => setIsEditingInterview(true)}>
                          Modifica dettagli colloquio
                        </Button>
                      </>
                    ) : (
                      <div className="space-y-3">
                        <div className="grid gap-3 md:grid-cols-2">
                          <InlineDatePickerField
                            id="workflow-interview-date"
                            label="Data colloquio"
                            value={interviewDateDraft}
                            onChange={setInterviewDateDraft}
                          />
                          <div className="space-y-2">
                            <Label htmlFor="workflow-interview-time">Ora colloquio</Label>
                            <Input
                              id="workflow-interview-time"
                              type="time"
                              value={interviewTimeDraft}
                              onChange={(event) => setInterviewTimeDraft(event.target.value)}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="workflow-interview-note">Nota colloquio</Label>
                          <Textarea
                            id="workflow-interview-note"
                            value={interviewNoteDraft}
                            onChange={(event) => setInterviewNoteDraft(event.target.value)}
                            rows={3}
                            placeholder="Annota eventuali dettagli del colloquio."
                            className="bg-background"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            disabled={!interviewDateDraft.trim()}
                            onClick={() => {
                              onSaveInterviewDetails(activeCandidateId, {
                                interviewDate: interviewDateDraft,
                                interviewTime: interviewTimeDraft,
                                interviewNote: interviewNoteDraft,
                              })
                              setIsEditingInterview(false)
                            }}
                          >
                            Salva dettagli
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const interviewParts = splitDatetimeLocal(candidate.interviewDateTime)
                              setInterviewDateDraft(interviewParts.date)
                              setInterviewTimeDraft(interviewParts.time)
                              setInterviewNoteDraft(candidate.interviewNote ?? "")
                              setIsEditingInterview(false)
                            }}
                          >
                            Annulla
                          </Button>
                        </div>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </section>
          )}
          {status === "formazione" && (
            <section className="rounded-lg border bg-muted/30 p-4">
              <Accordion type="single" collapsible>
                <AccordionItem value="workflow-formazione" className="border-b-0">
                  <AccordionTrigger className="py-0 text-sm">Dettagli formazione</AccordionTrigger>
                  <AccordionContent className="pt-3">
                    {!isEditingTraining ? (
                      <>
                        <div className="mb-3 grid gap-4 md:grid-cols-2">
                          <DetailRow
                            label="Teoria"
                            value={
                              candidate.trainingTheoryDate
                                ? formatCandidateDate(candidate.trainingTheoryDate, "d MMMM yyyy")
                                : "Da definire"
                            }
                          />
                          <DetailRow
                            label="Pratica"
                            value={
                              candidate.trainingPracticeDate
                                ? formatCandidateDate(candidate.trainingPracticeDate, "d MMMM yyyy")
                                : "Da definire"
                            }
                          />
                          <DetailRow
                            label="Nota formazione"
                            value={candidate.trainingNote?.trim() ? candidate.trainingNote : "Nessuna nota"}
                          />
                        </div>
                        <Button type="button" size="sm" variant="outline" onClick={() => setIsEditingTraining(true)}>
                          Modifica dettagli formazione
                        </Button>
                      </>
                    ) : (
                      <div className="space-y-3">
                        <div className="grid gap-3 md:grid-cols-2">
                          <InlineDatePickerField
                            id="workflow-training-theory"
                            label="Data teoria"
                            value={trainingTheoryDateDraft}
                            onChange={setTrainingTheoryDateDraft}
                          />
                          <InlineDatePickerField
                            id="workflow-training-practice"
                            label="Data pratica"
                            value={trainingPracticeDateDraft}
                            onChange={setTrainingPracticeDateDraft}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="workflow-training-note">Nota formazione</Label>
                          <Textarea
                            id="workflow-training-note"
                            value={trainingNoteDraft}
                            onChange={(event) => setTrainingNoteDraft(event.target.value)}
                            rows={3}
                            placeholder="Annota teoria/pratica o note operative."
                            className="bg-background"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            disabled={!trainingTheoryDateDraft.trim() && !trainingPracticeDateDraft.trim()}
                            onClick={() => {
                              onSaveTrainingDetails(activeCandidateId, {
                                trainingTheoryDate: trainingTheoryDateDraft,
                                trainingPracticeDate: trainingPracticeDateDraft,
                                trainingNote: trainingNoteDraft,
                              })
                              setIsEditingTraining(false)
                            }}
                          >
                            Salva dettagli
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setTrainingTheoryDateDraft(candidate.trainingTheoryDate ?? "")
                              setTrainingPracticeDateDraft(candidate.trainingPracticeDate ?? "")
                              setTrainingNoteDraft(candidate.trainingNote ?? "")
                              setIsEditingTraining(false)
                            }}
                          >
                            Annulla
                          </Button>
                        </div>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </section>
          )}
          {status === "scartati" && (
            <section className="rounded-lg border bg-muted/30 p-4">
              <p className="mb-3 text-sm font-medium">Dettagli scarto</p>
              <div className="grid gap-4 md:grid-cols-2">
                <DetailRow
                  label="Motivo"
                  value={candidate.discardReasonKey ? DISCARD_REASON_LABELS[candidate.discardReasonKey] : "Non indicato"}
                />
                <DetailRow
                  label="Data scarto"
                  value={candidate.discardedAt ? formatCandidateDate(candidate.discardedAt, "d MMMM yyyy") : "Non indicata"}
                />
                <DetailRow
                  label="Nota"
                  value={candidate.discardReasonNote?.trim() ? candidate.discardReasonNote : "Nessuna nota"}
                />
                <DetailRow label="Ritorno previsto" value={candidate.discardReturnStatus ?? "Nuovo"} />
              </div>
            </section>
          )}
          {(status === "rimandati" || status === "in_attesa") && candidate.postponedUntil && (
            <section className="rounded-lg border bg-muted/30 p-4">
              <Accordion type="single" collapsible>
                <AccordionItem value="workflow-rimando" className="border-b-0">
                  <AccordionTrigger className="py-0 text-sm">Dettagli rimando</AccordionTrigger>
                  <AccordionContent className="pt-3">
                    {!isEditingPostpone ? (
                      <>
                        <div className="mb-3 grid gap-4 md:grid-cols-2">
                          <DetailRow
                            label="Data ricontatto"
                            value={formatCandidateDate(candidate.postponedUntil, "d MMMM yyyy")}
                          />
                          <DetailRow
                            label="Motivo rimando"
                            value={candidate.postponeReason?.trim() ? candidate.postponeReason : "Non indicato"}
                          />
                        </div>
                        <Button type="button" size="sm" variant="outline" onClick={() => setIsEditingPostpone(true)}>
                          Modifica dettagli rimando
                        </Button>
                      </>
                    ) : (
                      <div className="space-y-3">
                        <InlineDatePickerField
                          id="workflow-postpone-date"
                          label="Data ricontatto"
                          value={postponeDateDraft}
                          onChange={setPostponeDateDraft}
                        />
                        <div className="space-y-2">
                          <Label htmlFor="workflow-postpone-reason">Motivo rimando</Label>
                          <Textarea
                            id="workflow-postpone-reason"
                            value={postponeReasonDraft}
                            onChange={(event) => setPostponeReasonDraft(event.target.value)}
                            rows={3}
                            placeholder="Descrivi il motivo del rimando."
                            className="bg-background"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            disabled={!postponeDateDraft.trim() || !postponeReasonDraft.trim()}
                            onClick={() => {
                              onSavePostponeDetails(activeCandidateId, {
                                postponedUntil: postponeDateDraft,
                                postponeReason: postponeReasonDraft,
                              })
                              setIsEditingPostpone(false)
                            }}
                          >
                            Salva dettagli
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setPostponeDateDraft(candidate.postponedUntil ?? "")
                              setPostponeReasonDraft(candidate.postponeReason ?? "")
                              setIsEditingPostpone(false)
                            }}
                          >
                            Annulla
                          </Button>
                        </div>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </section>
          )}
          <Separator />
          <section className="rounded-lg border bg-muted/30 p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-sm font-medium">Note generali</p>
              <p className="text-xs text-muted-foreground">
                {notesDirty ? "Salvataggio automatico..." : "Salvato"}
              </p>
            </div>
            <Textarea
              value={notesDraft}
              onChange={(event) => setNotesDraft(event.target.value)}
              placeholder="Aggiungi note interne generali sul candidato."
              rows={4}
              className="bg-background"
            />
          </section>
        </div>
      </SheetContent>
      <Dialog open={photoPreviewOpen} onOpenChange={setPhotoPreviewOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{getFullName(candidate)}</DialogTitle>
          </DialogHeader>
          <img
            src={candidate.profileImage}
            alt={`Anteprima ${getFullName(candidate)}`}
            className="max-h-[70vh] w-full rounded-md object-contain"
          />
        </DialogContent>
      </Dialog>
    </Sheet>
  )
}

