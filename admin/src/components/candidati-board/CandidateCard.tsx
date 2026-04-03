import { useState } from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  Archive,
  Award,
  Calendar,
  GraduationCap,
  Car,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Reply,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { Candidate, CandidateStatus } from "@/src/data/mockCandidates"
import { cn } from "@/lib/utils"
import { formatCandidateDate, getPostponeBadge } from "./date-utils"
import {
  getAgeFromBirthYear,
  getFullName,
  getWorkflowNote,
  toWhatsAppNumber,
} from "./candidate-utils"

type CandidateCardProps = {
  candidate: Candidate
  status: CandidateStatus
  onOpenDetail: (candidate: Candidate) => void
  onScheduleInterview: (candidateId: string) => void
  onPlanTraining: (candidateId: string) => void
  onPostpone: (candidateId: string) => void
  onArchive: (candidateId: string) => void
}

export function CandidateCard({
  candidate,
  status,
  onOpenDetail,
  onScheduleInterview,
  onPlanTraining,
  onPostpone,
  onArchive,
}: CandidateCardProps) {
  const [sideImageFailed, setSideImageFailed] = useState(false)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: candidate.id,
    data: { status, type: "candidate" },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const hasPhone = Boolean(candidate.phone?.trim())
  const hasEmail = Boolean(candidate.email?.trim())
  const telHref = hasPhone ? `tel:${candidate.phone}` : undefined
  const emailHref = hasEmail ? `mailto:${candidate.email}` : undefined
  const whatsappHref = hasPhone ? `https://wa.me/${toWhatsAppNumber(candidate.phone)}` : undefined
  const cardNote = getWorkflowNote(candidate, status)
  const postponeBadge = getPostponeBadge(candidate)

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          ref={setNodeRef}
          style={style}
          {...attributes}
          {...listeners}
          role="button"
          tabIndex={0}
          onClick={() => onOpenDetail(candidate)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault()
              onOpenDetail(candidate)
            }
          }}
          className={cn(
            "cursor-grab rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            isDragging && "opacity-50",
          )}
        >
          <Card className="shrink-0 border-border bg-card transition-shadow hover:shadow-md">
            <div className="grid min-h-[136px] grid-cols-[65%_35%]">
              <CardContent className="flex flex-col p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{getFullName(candidate)}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {getAgeFromBirthYear(candidate.birthYear)} anni
                    </p>
                  </div>
                  <p className="shrink-0 text-[10px] text-muted-foreground">
                    {formatCandidateDate(candidate.created_at, "d MMM")}
                  </p>
                </div>
                {status !== "formazione" ? (
                  <div className="mb-2 mt-2 flex flex-wrap gap-1">
                    <Badge variant="outline" className="max-w-[105px] gap-1 text-xs">
                      <MapPin className="size-3 shrink-0" />
                      <span className="min-w-0 truncate">{candidate.residenceCity}</span>
                    </Badge>
                    {candidate.hasDrivingLicense && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge
                              variant="outline"
                              aria-label="Patente disponibile"
                              className="h-6 w-6 p-0 justify-center"
                            >
                              <Car className="size-3.5 shrink-0" />
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>Patente</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    {candidate.hasExperience && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge
                              variant="outline"
                              aria-label="Esperienza nel ruolo"
                              className="h-6 w-6 p-0 justify-center"
                            >
                              <Award className="size-3.5 shrink-0" />
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>Esperienza</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    <Badge variant="outline" className="max-w-[115px] gap-1 text-xs">
                      <Calendar className="size-3 shrink-0" />
                      <span className="min-w-0 truncate">{candidate.availability}</span>
                    </Badge>
                  </div>
                ) : null}
                {postponeBadge ? (
                  <Badge variant="secondary" className={cn("mb-2 w-fit gap-1 text-xs", postponeBadge.className)}>
                    <Reply className="size-3 shrink-0" />
                    {postponeBadge.label}
                  </Badge>
                ) : null}
                {cardNote?.trim() ? (
                  <p className="line-clamp-2 text-xs text-muted-foreground">{cardNote}</p>
                ) : null}
              </CardContent>
              {!candidate.profileImage || sideImageFailed ? (
                <div className="flex h-full w-full items-center justify-center rounded-r-lg border-l bg-muted text-4xl font-semibold text-muted-foreground">
                  {candidate.firstName[0]}
                  {candidate.lastName[0]}
                </div>
              ) : (
                <img
                  src={candidate.profileImage}
                  alt={getFullName(candidate)}
                  className="h-full w-full rounded-r-lg object-cover"
                  onError={() => setSideImageFailed(true)}
                />
              )}
            </div>
          </Card>
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent className="w-56">
        <ContextMenuLabel>Azioni rapide</ContextMenuLabel>
        <ContextMenuItem
          className="flex items-center gap-2"
          disabled={!telHref}
          onSelect={() => {
            if (telHref) window.location.href = telHref
          }}
        >
          <Phone className="size-4" />
          Chiama
        </ContextMenuItem>
        <ContextMenuItem
          className="flex items-center gap-2"
          disabled={!whatsappHref}
          onSelect={() => {
            if (whatsappHref) window.open(whatsappHref, "_blank", "noopener,noreferrer")
          }}
        >
          <MessageCircle className="size-4" />
          WhatsApp
        </ContextMenuItem>
        <ContextMenuItem
          className="flex items-center gap-2"
          disabled={!emailHref}
          onSelect={() => {
            if (emailHref) window.location.href = emailHref
          }}
        >
          <Mail className="size-4" />
          Email
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem className="flex items-center gap-2" onSelect={() => onScheduleInterview(candidate.id)}>
          <Calendar className="size-4" />
          Pianifica colloquio
        </ContextMenuItem>
        <ContextMenuItem className="flex items-center gap-2" onSelect={() => onPlanTraining(candidate.id)}>
          <GraduationCap className="size-4" />
          Pianifica formazione
        </ContextMenuItem>
        <ContextMenuItem className="flex items-center gap-2" onSelect={() => onPostpone(candidate.id)}>
          <Reply className="size-4" />
          Rimanda
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem className="flex items-center gap-2" onSelect={() => onArchive(candidate.id)}>
          <Archive className="size-4" />
          Archivia
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}

