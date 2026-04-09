import type { CandidateCity } from "@/src/data/mockCandidates"

export type CameriereTag = "automunito" | "esperienza" | "multilingue" | "fuori_sede"
export type CameriereAvailabilityKind = "available" | "unavailable"
export type CameriereTimelineScale = "2w" | "1m" | "2m" | "4m"

export type CameriereAvailabilityWindow = {
  id: string
  startDate: string
  endDate: string
  kind: CameriereAvailabilityKind
  note?: string
  source?: "manual" | "import" | "board_event"
  createdAt: string
  updatedAt: string
}

export type Cameriere = {
  id: string
  sourceCandidateId?: string
  city: CandidateCity
  firstName: string
  lastName: string
  avatarUrl?: string
  email?: string
  phone?: string
  isActive: boolean
  tags: CameriereTag[]
  availabilityWindows?: CameriereAvailabilityWindow[]
  createdAt: string
  updatedAt: string
}

export type CameriereCreateInput = {
  city: CandidateCity
  firstName: string
  lastName: string
  avatarUrl?: string
  email?: string
  phone?: string
  isActive?: boolean
  tags?: CameriereTag[]
  sourceCandidateId?: string
}
