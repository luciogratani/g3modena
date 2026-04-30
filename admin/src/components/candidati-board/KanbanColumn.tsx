/**
 * Board column renderer.
 *
 * Responsibilities:
 * - applies "Nuovo" filters before rendering cards;
 * - renders shared column header counters;
 * - renders specialized "Formazione" sections (unassigned buckets + sub-lanes).
 *
 * Note:
 * - "Nuovo" toolbar UI is intentionally delegated to `NuovoFiltersToolbar`.
 */
import { useMemo } from "react"
import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { Badge } from "@/components/ui/badge"
import type { Candidate, CandidateStatus } from "@/src/data/mockCandidates"
import { cn } from "@/lib/utils"
import {
  AGE_FILTER_DEFAULT_MAX,
  AGE_FILTER_DEFAULT_MIN,
  type NewColumnFilters,
  type NewColumnFilterVisibility,
  type NewColumnFilterVisibilityKey,
  type TrainingSublane,
} from "./board-utils"
import { getAgeFromBirthYear } from "./candidate-utils"
import { CandidateCard } from "./CandidateCard"
import { formatCandidateDate, getInAttesaCounterClassName } from "./date-utils"
import { NuovoFiltersToolbar } from "./NuovoFiltersToolbar"

type KanbanColumnProps = {
  label: string
  status: CandidateStatus
  candidates: Candidate[]
  boardCity: string
  filters: NewColumnFilters
  filterVisibility: NewColumnFilterVisibility
  trainingSublanes?: TrainingSublane[]
  onToggleFilter: (filterKey: "auto" | "esperienza" | "disponibilitaImmediata" | "residenzaCittaBoard") => void
  onSetAgeRange: (ageRange: { minAge: number | null; maxAge: number | null }) => void
  onToggleLanguageFilter: (languageKey: keyof NewColumnFilters["lingueParlate"]) => void
  onToggleFilterVisibility: (filterKey: NewColumnFilterVisibilityKey) => void
  onOpenDetail: (candidate: Candidate) => void
  onScheduleInterview: (candidateId: string) => void
  onPlanTraining: (candidateId: string) => void
  onPostpone: (candidateId: string) => void
  onArchive: (candidateId: string) => void
  onPromoteToWaiter: (candidateId: string) => void
  postponeReminderCounts?: {
    overdueCount: number
    dueTodayCount: number
  }
  trainingTodayCount?: number
  dragMode?: boolean
}

const MIN_FILTER_AGE = AGE_FILTER_DEFAULT_MIN
const MAX_FILTER_AGE = AGE_FILTER_DEFAULT_MAX

function hasImmediateAvailability(candidate: Candidate): boolean {
  return candidate.availability.toLowerCase().includes("immediata")
}

function hasLanguageMatch(
  candidate: Candidate,
  selectedLanguages: NewColumnFilters["lingueParlate"],
): boolean {
  const normalizedLanguages = candidate.languages.map((language) => language.toLowerCase())
  const languageFilters = Object.entries(selectedLanguages).filter(([_, enabled]) => enabled)
  if (languageFilters.length === 0) return true

  return languageFilters.some(([language]) => {
    if (language === "italiano") return normalizedLanguages.some((value) => value.includes("italiano"))
    if (language === "inglese") {
      return normalizedLanguages.some((value) => value.includes("inglese") || value.includes("english"))
    }
    return normalizedLanguages.some(
      (value) => !value.includes("italiano") && !value.includes("inglese") && !value.includes("english"),
    )
  })
}

function matchesBoardResidence(candidate: Candidate, boardCity: string): boolean {
  return candidate.residenceCity.trim().toLowerCase() === boardCity
}

function applyNewColumnFilters(
  candidates: Candidate[],
  filters: NewColumnFilters,
  boardCity: string,
): Candidate[] {
  const isAgeFilterActive =
    typeof filters.eta.minAge === "number" &&
    typeof filters.eta.maxAge === "number" &&
    (filters.eta.minAge !== MIN_FILTER_AGE || filters.eta.maxAge !== MAX_FILTER_AGE)
  return candidates.filter((candidate) => {
    if (filters.auto && !candidate.hasDrivingLicense) return false
    if (isAgeFilterActive) {
      const candidateAge = getAgeFromBirthYear(candidate.birthYear)
      if (typeof filters.eta.minAge === "number" && candidateAge < filters.eta.minAge) return false
      if (typeof filters.eta.maxAge === "number" && candidateAge > filters.eta.maxAge) return false
    }
    if (filters.esperienza && !candidate.hasExperience) return false
    if (filters.disponibilitaImmediata && !hasImmediateAvailability(candidate)) return false
    if (filters.residenzaCittaBoard && !matchesBoardResidence(candidate, boardCity)) return false
    if (!hasLanguageMatch(candidate, filters.lingueParlate)) return false
    return true
  })
}

function CandidateList({
  status,
  candidates,
  onOpenDetail,
  onScheduleInterview,
  onPlanTraining,
  onPostpone,
  onArchive,
  onPromoteToWaiter,
}: {
  status: CandidateStatus
  candidates: Candidate[]
  onOpenDetail: (candidate: Candidate) => void
  onScheduleInterview: (candidateId: string) => void
  onPlanTraining: (candidateId: string) => void
  onPostpone: (candidateId: string) => void
  onArchive: (candidateId: string) => void
  onPromoteToWaiter: (candidateId: string) => void
}) {
  const sortableIds = useMemo(() => candidates.map((candidate) => candidate.id), [candidates])
  return (
    <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
      <div className="flex flex-col gap-2">
        {candidates.map((candidate) => (
          <CandidateCard
            key={candidate.id}
            candidate={candidate}
            status={status}
            onOpenDetail={onOpenDetail}
            onScheduleInterview={onScheduleInterview}
            onPlanTraining={onPlanTraining}
            onPostpone={onPostpone}
            onArchive={onArchive}
            onPromoteToWaiter={onPromoteToWaiter}
          />
        ))}
      </div>
    </SortableContext>
  )
}

function FormazioneSublane({
  lane,
  candidates,
  onOpenDetail,
  onScheduleInterview,
  onPlanTraining,
  onPostpone,
  onArchive,
  onPromoteToWaiter,
}: {
  lane: TrainingSublane
  candidates: Candidate[]
  onOpenDetail: (candidate: Candidate) => void
  onScheduleInterview: (candidateId: string) => void
  onPlanTraining: (candidateId: string) => void
  onPostpone: (candidateId: string) => void
  onArchive: (candidateId: string) => void
  onPromoteToWaiter: (candidateId: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `training-lane-${lane.id}` })
  const isTeoriaLane = lane.type === "teoria"
  const laneToneClassName = isTeoriaLane
    ? "border-amber-500/30 bg-amber-500/5"
    : "border-emerald-500/30 bg-emerald-500/5"
  const laneCounterClassName = isTeoriaLane
    ? "border-amber-500/40 text-amber-700 dark:text-amber-300"
    : "border-emerald-500/40 text-emerald-700 dark:text-emerald-300"

  return (
    <section
      ref={setNodeRef}
      className={cn("rounded-md border p-2 transition-colors", laneToneClassName, isOver && "ring-1 ring-primary/60")}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {lane.type === "teoria" ? "Teoria" : "Pratica"} ·{" "}
          {formatCandidateDate(lane.date, "dd MMM", lane.date)}
        </p>
        <Badge variant="outline" className={cn("text-[10px]", laneCounterClassName)}>
          {candidates.length}
        </Badge>
      </div>
      {candidates.length === 0 ? (
        <p className="rounded border border-dashed py-4 text-center text-xs text-muted-foreground">
          Assegna dalla pianificazione formazione
        </p>
      ) : (
        <CandidateList
          status="formazione"
          candidates={candidates}
          onOpenDetail={onOpenDetail}
          onScheduleInterview={onScheduleInterview}
          onPlanTraining={onPlanTraining}
          onPostpone={onPostpone}
          onArchive={onArchive}
          onPromoteToWaiter={onPromoteToWaiter}
        />
      )}
    </section>
  )
}

export function KanbanColumn({
  label,
  status,
  candidates,
  boardCity,
  filters,
  filterVisibility,
  trainingSublanes,
  onToggleFilter,
  onSetAgeRange,
  onToggleLanguageFilter,
  onToggleFilterVisibility,
  onOpenDetail,
  onScheduleInterview,
  onPlanTraining,
  onPostpone,
  onArchive,
  onPromoteToWaiter,
  postponeReminderCounts,
  trainingTodayCount,
  dragMode = false,
}: KanbanColumnProps) {
  const visibleCandidates = useMemo(
    () => (status === "nuovo" ? applyNewColumnFilters(candidates, filters, boardCity) : candidates),
    [status, candidates, filters, boardCity],
  )
  const { setNodeRef, isOver } = useDroppable({ id: `column-${status}` })

  const sortedTrainingSublanes = useMemo(() => {
    if (status !== "formazione") return []
    return [...(trainingSublanes ?? [])].sort((a, b) => {
      if (a.date === b.date) return a.type.localeCompare(b.type)
      return a.date.localeCompare(b.date)
    })
  }, [status, trainingSublanes])

  const formazioneCandidatesBySublane = useMemo(() => {
    const bucket = new Map<string, Candidate[]>()
    for (const lane of sortedTrainingSublanes) bucket.set(lane.id, [])
    for (const candidate of visibleCandidates) {
      const laneId = candidate.trainingSublaneId
      if (laneId && bucket.has(laneId)) {
        bucket.get(laneId)?.push(candidate)
      }
    }
    return bucket
  }, [sortedTrainingSublanes, visibleCandidates])

  const formazioneUnassignedCandidates = useMemo(() => {
    if (status !== "formazione") return []
    const validLaneIds = new Set(sortedTrainingSublanes.map((lane) => lane.id))
    return visibleCandidates.filter((candidate) => !candidate.trainingSublaneId || !validLaneIds.has(candidate.trainingSublaneId))
  }, [status, sortedTrainingSublanes, visibleCandidates])

  const formazioneUnassignedTeoriaCandidates = useMemo(
    () =>
      formazioneUnassignedCandidates.filter((candidate) => {
        if (candidate.trainingPhase === "pratica") return false
        if (!candidate.trainingPhase) return !candidate.trainingPracticeDate
        return true
      }),
    [formazioneUnassignedCandidates],
  )

  const formazioneUnassignedPraticaCandidates = useMemo(
    () =>
      formazioneUnassignedCandidates.filter((candidate) => {
        if (candidate.trainingPhase === "pratica") return true
        return Boolean(candidate.trainingPracticeDate) && !candidate.trainingTheoryDate
      }),
    [formazioneUnassignedCandidates],
  )

  return (
    <div className="flex h-full w-72 shrink-0 flex-col rounded-lg border bg-muted/30">
      <div className="relative flex shrink-0 items-center justify-between gap-2 border-b px-4 py-3">
        <h3 className="font-semibold text-foreground">{label}</h3>
        <div className="ml-auto flex items-center gap-1">
          {status === "nuovo" && (
            <NuovoFiltersToolbar
              filters={filters}
              filterVisibility={filterVisibility}
              onToggleFilter={onToggleFilter}
              onSetAgeRange={onSetAgeRange}
              onToggleLanguageFilter={onToggleLanguageFilter}
              onToggleFilterVisibility={onToggleFilterVisibility}
            />
          )}
          <Badge
            variant="secondary"
            className={cn(status === "in_attesa" && getInAttesaCounterClassName(candidates))}
          >
            {visibleCandidates.length}
          </Badge>
          {status === "in_attesa" && postponeReminderCounts && (
            <Badge
              variant="outline"
              className={cn(
                "text-[10px]",
                postponeReminderCounts.overdueCount > 0 && "border-destructive text-destructive",
              )}
            >
              {postponeReminderCounts.overdueCount > 0
                ? `${postponeReminderCounts.overdueCount} scaduti`
                : `${postponeReminderCounts.dueTodayCount} oggi`}
            </Badge>
          )}
          {status === "formazione" && typeof trainingTodayCount === "number" && (
            <Badge
              variant="outline"
              className={cn("text-[10px]", trainingTodayCount > 0 && "border-primary text-primary")}
            >
              {trainingTodayCount} oggi
            </Badge>
          )}
        </div>
      </div>
      <div ref={setNodeRef} className={cn("flex-1 overflow-y-auto px-2 py-3", isOver && "bg-accent/20")}>
        {status !== "formazione" ? (
          <div className="flex flex-col gap-2">
            <CandidateList
              status={status}
              candidates={visibleCandidates}
              onOpenDetail={onOpenDetail}
              onScheduleInterview={onScheduleInterview}
              onPlanTraining={onPlanTraining}
              onPostpone={onPostpone}
              onArchive={onArchive}
              onPromoteToWaiter={onPromoteToWaiter}
            />
            {candidates.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">Nessun elemento</p>}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {dragMode ? (
              <section
                className={cn(
                  "rounded-md border border-dashed bg-background/70 p-4 min-h-20 transition-colors",
                  isOver && "border-primary/60 bg-primary/5",
                )}
              >
                <p className="text-center text-xs text-muted-foreground">
                  Trascina qui per rimuovere l&apos;assegnazione alla sub-lane
                </p>
              </section>
            ) : null}

            {formazioneUnassignedTeoriaCandidates.length > 0 ? (
              <section className="rounded-md border border-dashed bg-background/70 p-2">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Teoria da assegnare
                  </p>
                  <Badge variant="outline" className="text-[10px]">
                    {formazioneUnassignedTeoriaCandidates.length}
                  </Badge>
                </div>
                <CandidateList
                  status="formazione"
                  candidates={formazioneUnassignedTeoriaCandidates}
                  onOpenDetail={onOpenDetail}
                  onScheduleInterview={onScheduleInterview}
                  onPlanTraining={onPlanTraining}
                  onPostpone={onPostpone}
                  onArchive={onArchive}
                  onPromoteToWaiter={onPromoteToWaiter}
                />
              </section>
            ) : null}

            {formazioneUnassignedPraticaCandidates.length > 0 ? (
              <section className="rounded-md border border-dashed bg-background/70 p-2">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Pratica da assegnare
                  </p>
                  <Badge variant="outline" className="text-[10px]">
                    {formazioneUnassignedPraticaCandidates.length}
                  </Badge>
                </div>
                <CandidateList
                  status="formazione"
                  candidates={formazioneUnassignedPraticaCandidates}
                  onOpenDetail={onOpenDetail}
                  onScheduleInterview={onScheduleInterview}
                  onPlanTraining={onPlanTraining}
                  onPostpone={onPostpone}
                  onArchive={onArchive}
                  onPromoteToWaiter={onPromoteToWaiter}
                />
              </section>
            ) : null}

            {sortedTrainingSublanes.map((lane) => (
              <FormazioneSublane
                key={lane.id}
                lane={lane}
                candidates={formazioneCandidatesBySublane.get(lane.id) ?? []}
                onOpenDetail={onOpenDetail}
                onScheduleInterview={onScheduleInterview}
                onPlanTraining={onPlanTraining}
                onPostpone={onPostpone}
                onArchive={onArchive}
                onPromoteToWaiter={onPromoteToWaiter}
              />
            ))}

            {visibleCandidates.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">Nessun elemento</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
