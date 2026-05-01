/**
 * Mock database candidati – simulazione form Lavora con noi (/web)
 */

export type CandidateStatus =
  | "nuovo"
  | "colloquio"
  | "formazione"
  | "in_attesa"
  | "scartati"
  | "rimandati"
  | "archivio"

export type PostponeReturnStatus = "nuovo" | "colloquio" | "formazione"

export type DiscardReturnStatus =
  | "nuovo"
  | "colloquio"
  | "formazione"
  | "in_attesa"
  | "rimandati"

export type DiscardReasonKey =
  | "not_a_fit"
  | "no_show"
  | "declined_by_candidate"
  | "unreachable"
  | "duplicate"
  | "failed_interview"
  | "failed_training"
  | "other"

export const DISCARD_REASON_KEYS: DiscardReasonKey[] = [
  "not_a_fit",
  "no_show",
  "declined_by_candidate",
  "unreachable",
  "duplicate",
  "failed_interview",
  "failed_training",
  "other",
]

export const DISCARD_REASON_LABELS: Record<DiscardReasonKey, string> = {
  not_a_fit: "Profilo non in linea",
  no_show: "Non si e' presentato/a",
  declined_by_candidate: "Candidato/a ha rifiutato",
  unreachable: "Non raggiungibile",
  duplicate: "Candidatura duplicata",
  failed_interview: "Esito colloquio negativo",
  failed_training: "Esito formazione negativo",
  other: "Altro",
}

export type CandidateCity = "sassari" | "modena"
/**
 * Slug della sede di candidatura. Storicamente union stretta
 * (`CandidateCity`), oggi widened a stringa generica per supportare la
 * board parametrizzata (vedi A3 in `IMPLEMENTATION_ROADMAP.md`) e le
 * sedi dinamiche caricate da `public.cities`.
 */
export type CandidateCitySlug = string
export type InterviewAvailability = "mattina" | "pomeriggio"
export type InterviewOutcome = "da_fare" | "positivo" | "negativo" | "in_attesa_feedback"
export type TrainingTrack = "pratica" | "teoria" | "misto"
export type TrainingSublaneType = "teoria" | "pratica"

export interface Candidate {
  id: string
  created_at: string
  firstName: string
  lastName: string
  candidateCity: CandidateCitySlug
  profileImage: string
  /** Chiave oggetto Storage (`careers-photos`) quando la riga DB ha `profile_photo_path`; la UI puo' usare `profileImage` come URL firmato temporaneo. */
  profilePhotoStoragePath?: string | null
  email: string
  phone: string
  birthYear: number
  educationTitle: string
  residenceCity: string
  isOffsiteStudent: boolean
  referralSource: string
  languages: string[]
  hasDrivingLicense: boolean
  hasExperience: boolean
  futurePlans: string
  jobAttraction: string
  interviewAvailability: InterviewAvailability
  availability: string
  status: CandidateStatus
  score: number
  notes?: string
  interviewDateTime?: string
  interviewNote?: string
  interviewOutcome?: InterviewOutcome
  trainingTrack?: TrainingTrack
  trainingPhase?: TrainingSublaneType
  trainingScheduledDate?: string
  trainingTheoryDate?: string
  trainingPracticeDate?: string
  trainingTheoryCompleted?: boolean
  trainingPracticeCompleted?: boolean
  trainingNote?: string
  trainingSublaneId?: string
  trainingStartDate?: string
  trainingEndDate?: string
  postponedUntil?: string
  postponeReason?: string
  postponeReturnStatus?: PostponeReturnStatus
  discardReasonKey?: DiscardReasonKey
  discardReasonNote?: string
  discardedAt?: string
  discardReturnStatus?: DiscardReturnStatus
  kanbanRank?: number
}

export const KANBAN_COLUMNS: { id: CandidateStatus; label: string }[] = [
  { id: "nuovo", label: "Nuovo" },
  { id: "colloquio", label: "Colloquio" },
  { id: "formazione", label: "Formazione" },
  { id: "in_attesa", label: "In Attesa" },
  { id: "scartati", label: "Scartati" },
  { id: "rimandati", label: "Rimandati" },
  { id: "archivio", label: "Archivio" },
]

export const CANDIDATES: Candidate[] = [
  {
    id: "c1",
    created_at: "2025-03-08T10:30:00Z",
    firstName: "Maria",
    lastName: "Rossi",
    candidateCity: "modena",
    profileImage: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=480&q=80",
    email: "maria.rossi@email.it",
    phone: "+39 333 1234567",
    birthYear: 2001,
    educationTitle: "Diploma alberghiero",
    residenceCity: "Carpi",
    isOffsiteStudent: false,
    referralSource: "Instagram",
    languages: ["Italiano", "Inglese B1"],
    hasDrivingLicense: true,
    hasExperience: true,
    futurePlans: "Crescere nel settore ristorazione e specializzarmi nel servizio sala.",
    jobAttraction: "Mi piace il contatto con il pubblico e il ritmo del lavoro in team.",
    interviewAvailability: "mattina",
    availability: "Immediata",
    status: "nuovo",
    score: 4,
    notes: "Primo screening completato: candidatura completa, priorita medio-alta.",
  },
  {
    id: "c2",
    created_at: "2025-03-07T14:20:00Z",
    firstName: "Luca",
    lastName: "Bianchi",
    candidateCity: "sassari",
    profileImage: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=480&q=80",
    email: "luca.bianchi@gmail.com",
    phone: "+39 347 9876543",
    birthYear: 1997,
    educationTitle: "Diploma tecnico commerciale",
    residenceCity: "Bologna",
    isOffsiteStudent: false,
    referralSource: "Sito web",
    languages: ["Italiano", "Inglese C1", "Francese B1"],
    hasDrivingLicense: false,
    hasExperience: false,
    futurePlans: "Lavorare in un contesto stabile e crescere verso un ruolo di responsabilita.",
    jobAttraction: "Cerco un ambiente strutturato dove valorizzare esperienza e precisione.",
    interviewAvailability: "pomeriggio",
    availability: "Dal 1 aprile",
    status: "nuovo",
    score: 5,
    notes: "Profilo con esperienza trasversale e buona conoscenza lingue, da contattare per allineamento ruolo.",
  },
  {
    id: "c3",
    created_at: "2025-03-06T09:15:00Z",
    firstName: "Giulia",
    lastName: "Verdi",
    candidateCity: "modena",
    profileImage: "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=480&q=80",
    email: "giulia.verdi@outlook.it",
    phone: "+39 320 5551234",
    birthYear: 2003,
    educationTitle: "Laurea triennale in Scienze del turismo",
    residenceCity: "Reggio Emilia",
    isOffsiteStudent: true,
    referralSource: "LinkedIn",
    languages: ["Italiano", "Inglese B2", "Spagnolo A2"],
    hasDrivingLicense: false,
    hasExperience: false,
    futurePlans: "Consolidare una prima esperienza lavorativa e completare una specializzazione.",
    jobAttraction: "Mi attrae il dinamismo e la possibilita di imparare da professionisti esperti.",
    interviewAvailability: "mattina",
    availability: "Da settembre",
    status: "nuovo",
    score: 3,
    notes: "Motivazione alta, disponibilita differita; utile valutare per pipeline stagionale.",
  },
  {
    id: "c4",
    created_at: "2025-03-05T16:45:00Z",
    firstName: "Marco",
    lastName: "Ferrara",
    candidateCity: "sassari",
    profileImage: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=480&q=80",
    email: "marco.ferrara@email.it",
    phone: "+39 338 7778899",
    birthYear: 1999,
    educationTitle: "Diploma professionale servizi ristorativi",
    residenceCity: "Parma",
    isOffsiteStudent: false,
    referralSource: "Passaparola",
    languages: ["Italiano", "Inglese B1"],
    hasDrivingLicense: true,
    hasExperience: true,
    futurePlans: "Restare nel settore hospitality e costruire una carriera a lungo termine.",
    jobAttraction: "Mi piace il lavoro operativo e il rapporto diretto con clienti e colleghi.",
    interviewAvailability: "pomeriggio",
    availability: "Immediata",
    status: "nuovo",
    score: 5,
    notes: "Esperienza nel settore solida, candidato adatto a iter rapido di selezione.",
  },
  {
    id: "c5",
    created_at: "2025-03-04T11:00:00Z",
    firstName: "Anna",
    lastName: "Colombo",
    candidateCity: "modena",
    profileImage: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=480&q=80",
    email: "anna.colombo@email.it",
    phone: "+39 333 4445555",
    birthYear: 1995,
    educationTitle: "Laurea magistrale in Management del turismo",
    residenceCity: "Milano",
    isOffsiteStudent: false,
    referralSource: "Indeed",
    languages: ["Italiano", "Inglese C1", "Tedesco B1"],
    hasDrivingLicense: true,
    hasExperience: true,
    futurePlans: "Trasferirmi stabilmente e seguire un percorso di crescita manageriale.",
    jobAttraction: "Mi interessa entrare in un progetto serio con obiettivi chiari e formazione continua.",
    interviewAvailability: "mattina",
    availability: "Dal 15 marzo",
    status: "nuovo",
    score: 5,
    notes: "Seniority elevata e profilo manageriale, da prioritizzare per colloquio conoscitivo.",
  },
  {
    id: "c6",
    created_at: "2025-03-03T08:30:00Z",
    firstName: "Paolo",
    lastName: "Romano",
    candidateCity: "sassari",
    profileImage: "https://images.unsplash.com/photo-1506277886164-e25aa3f4ef7f?auto=format&fit=crop&w=480&q=80",
    email: "paolo.romano@gmail.com",
    phone: "+39 349 6667777",
    birthYear: 2004,
    educationTitle: "Diploma scientifico",
    residenceCity: "Modena",
    isOffsiteStudent: true,
    referralSource: "TikTok",
    languages: ["Italiano", "Inglese B1"],
    hasDrivingLicense: false,
    hasExperience: false,
    futurePlans: "Alternare studio e lavoro, acquisendo autonomia economica e competenze relazionali.",
    jobAttraction: "Cerco un ambiente pratico dove imparare e mettermi alla prova.",
    interviewAvailability: "pomeriggio",
    availability: "Da settembre",
    status: "nuovo",
    score: 2,
    notes: "Profilo junior in ingresso, da valutare su posizioni con onboarding graduale.",
  },
  {
    id: "c7",
    created_at: "2025-03-08T17:45:00Z",
    firstName: "Margherita",
    lastName: "Mandredi",
    candidateCity: "modena",
    profileImage: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=480&q=80",
    email: "elena.martini@email.it",
    phone: "+39 340 1112222",
    birthYear: 1998,
    educationTitle: "Diploma linguistico",
    residenceCity: "Ferrara",
    isOffsiteStudent: false,
    referralSource: "Instagram",
    languages: ["Italiano", "Spagnolo B1"],
    hasDrivingLicense: true,
    hasExperience: true,
    futurePlans: "Specializzarmi in gestione eventi e coordinamento team operativi.",
    jobAttraction: "Mi attira il mix tra organizzazione, clienti e lavoro di squadra.",
    interviewAvailability: "mattina",
    availability: "Immediata",
    status: "nuovo",
    score: 4,
    notes: "Buona esperienza operativa e comunicazione efficace, candidata adatta a colloquio in prima fascia.",
  },
]
