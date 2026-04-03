import type { ReactNode } from "react"
import { Archive, Reply } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { Candidate } from "@/src/data/mockCandidates"
import { getFullName } from "./candidate-utils"

type WorkflowDrawerLaneProps = {
  laneType: "rimandati" | "archivio"
  title: string
  description: string
  candidates: Candidate[]
  onOpenDetail: (candidate: Candidate) => void
  onRestore: (candidateId: string) => void
  onArchive: (candidateId: string) => void
  action?: ReactNode
}

export function WorkflowDrawerLane({
  laneType,
  title,
  description,
  candidates,
  onOpenDetail,
  onRestore,
  onArchive,
  action,
}: WorkflowDrawerLaneProps) {
  const restoreActionLabel = laneType === "rimandati" ? "Riprendi" : "Ripristina"

  return (
    <section className="rounded-xl border bg-muted/30 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          {action}
          <Badge variant="secondary">{candidates.length}</Badge>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {candidates.map((candidate) => (
          <Card
            key={candidate.id}
            className="cursor-pointer border-border bg-card transition-shadow hover:shadow-md"
            onClick={() => onOpenDetail(candidate)}
          >
            <CardContent className="flex items-center gap-3 p-3">
              <Avatar className="size-14">
                <AvatarImage src={candidate.profileImage} alt={getFullName(candidate)} className="object-cover" />
                <AvatarFallback>
                  {candidate.firstName[0]}
                  {candidate.lastName[0]}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{getFullName(candidate)}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {candidate.residenceCity} • {candidate.availability}
                </p>
              </div>
              <TooltipProvider>
                <div className="flex items-center gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        aria-label={`${restoreActionLabel} candidato`}
                        onClick={(event) => {
                          event.stopPropagation()
                          onRestore(candidate.id)
                        }}
                      >
                        <Reply className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{restoreActionLabel}</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        size="icon"
                        variant="secondary"
                        className="h-8 w-8"
                        aria-label="Archivia candidato"
                        disabled={laneType === "archivio"}
                        onClick={(event) => {
                          event.stopPropagation()
                          onArchive(candidate.id)
                        }}
                      >
                        <Archive className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Archivia</TooltipContent>
                  </Tooltip>
                </div>
              </TooltipProvider>
            </CardContent>
          </Card>
        ))}
        {candidates.length === 0 && (
          <p className="rounded-md border border-dashed py-6 text-center text-sm text-muted-foreground">
            Nessun candidato
          </p>
        )}
      </div>
    </section>
  )
}

