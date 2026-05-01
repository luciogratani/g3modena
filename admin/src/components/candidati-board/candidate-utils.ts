import type { Candidate, CandidateStatus, InterviewOutcome, TrainingTrack } from "@/src/data/mockCandidates"
import { formatCandidateDate } from "./date-utils"

export function toWhatsAppNumber(phone: string): string {
  return phone.replace(/\D/g, "")
}

export function getFullName(candidate: Candidate): string {
  return `${candidate.firstName} ${candidate.lastName}`
}

export function getAgeFromBirthYear(birthYear: number): number {
  return new Date().getFullYear() - birthYear
}

export function getCandidateCityLabel(candidate: Candidate): string {
  const slug = candidate.candidateCity.trim()
  if (!slug) return "N/D"
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ")
}

export function getStatusLabel(status: CandidateStatus): string {
  const statusLabels: Record<CandidateStatus, string> = {
    nuovo: "Nuovo",
    colloquio: "Colloquio",
    formazione: "Formazione",
    in_attesa: "In Attesa",
    scartati: "Scartati",
    rimandati: "Rimandati",
    archivio: "Archivio",
  }
  return statusLabels[status]
}

export function getInterviewOutcomeLabel(outcome: InterviewOutcome | undefined): string {
  const labels: Record<InterviewOutcome, string> = {
    da_fare: "Da fare",
    positivo: "Positivo",
    negativo: "Negativo",
    in_attesa_feedback: "In attesa feedback",
  }
  if (!outcome) return "Non definito"
  return labels[outcome]
}

export function getTrainingTrackLabel(track: TrainingTrack | undefined): string {
  const labels: Record<TrainingTrack, string> = {
    pratica: "Pratica",
    teoria: "Teoria",
    misto: "Misto",
  }
  if (!track) return "Non definito"
  return labels[track]
}

export function getWorkflowNote(candidate: Candidate, status: CandidateStatus): string | null {
  if (status === "colloquio") {
    if (!candidate.interviewDateTime && !candidate.interviewNote?.trim()) return candidate.notes?.trim() ?? null
    const when = candidate.interviewDateTime
      ? formatCandidateDate(candidate.interviewDateTime, "d MMM HH:mm", "Data colloquio non valida")
      : "Data da fissare"
    const note = candidate.interviewNote?.trim()
    return note ? `Colloquio ${when} · ${note}` : `Colloquio ${when}`
  }

  if (status === "formazione") {
    if (candidate.trainingPhase && candidate.trainingScheduledDate) {
      const phaseLabel = candidate.trainingPhase === "teoria" ? "Teoria" : "Pratica"
      const when = formatCandidateDate(candidate.trainingScheduledDate, "d MMM", "Data non valida")
      const completionSummary = [
        candidate.trainingTheoryCompleted ? "teoria completata" : null,
        candidate.trainingPracticeCompleted ? "pratica completata" : null,
      ]
        .filter(Boolean)
        .join(" · ")
      const note = candidate.trainingNote?.trim()
      const base = `Formazione · ${phaseLabel} ${when}`
      if (completionSummary && note) return `${base} · ${completionSummary} · ${note}`
      if (completionSummary) return `${base} · ${completionSummary}`
      if (note) return `${base} · ${note}`
      return base
    }
    if (
      !candidate.trainingTheoryDate &&
      !candidate.trainingPracticeDate &&
      !candidate.trainingStartDate &&
      !candidate.trainingEndDate
    ) {
      return candidate.notes?.trim() ?? null
    }
    const theoryDateRaw = candidate.trainingTheoryDate ?? candidate.trainingStartDate
    const practiceDateRaw = candidate.trainingPracticeDate ?? candidate.trainingEndDate
    const theory = theoryDateRaw
      ? formatCandidateDate(theoryDateRaw, "d MMM", "Teoria non valida")
      : "da definire"
    const practice = practiceDateRaw
      ? formatCandidateDate(practiceDateRaw, "d MMM", "Pratica non valida")
      : "da definire"
    const note = candidate.trainingNote?.trim()
    return note
      ? `Formazione · Teoria ${theory} · Pratica ${practice} · ${note}`
      : `Formazione · Teoria ${theory} · Pratica ${practice}`
  }

  if ((status === "in_attesa" || status === "rimandati") && candidate.postponedUntil) {
    const dueDate = formatCandidateDate(candidate.postponedUntil, "d MMM", "Data ricontatto non valida")
    const reason = candidate.postponeReason?.trim()
    return reason ? `Ricontatto ${dueDate} · ${reason}` : `Ricontatto ${dueDate}`
  }

  return candidate.notes?.trim() ?? null
}

export function matchesBoardResidence(candidate: Candidate, boardCity: string): boolean {
  const normalizedResidence = candidate.residenceCity.trim().toLowerCase()
  return normalizedResidence === boardCity
}

