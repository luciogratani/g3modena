import type { CandidateCity } from "@/src/data/mockCandidates"

export type CameriereTag = "automunito" | "esperienza" | "multilingue" | "fuori_sede"

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
