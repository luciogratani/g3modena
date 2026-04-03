import { Suspense, lazy, useRef, useState } from "react"
import { motion } from "framer-motion"
import { fadeInUp, staggerContainer } from "@/lib/animations"
import { AnimatedSection } from "@/components/animated-section"
import { HeadlineReveal } from "@/components/headline-reveal"
import { toast } from "sonner"
import { CalendarDays, Check, ChevronsUpDown, Upload } from "lucide-react"
import { formClassNames, isValidEmail } from "@/lib/form-helpers"
import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { compressProfilePhoto } from "@/lib/image-compression"

const LazyCalendar = lazy(async () => {
  const module = await import("@/components/ui/calendar")
  return { default: module.Calendar }
})

let calendarPreloadPromise: Promise<unknown> | null = null
function preloadCalendar(): void {
  if (calendarPreloadPromise) return
  calendarPreloadPromise = import("@/components/ui/calendar")
}

type YesNo = "yes" | "no" | ""
type PrivacyChoice = "accepted" | "declined" | ""

function getTodayDate(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

function formatDateLabel(date: Date): string {
  const today = getTodayDate().getTime()
  const selected = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  ).getTime()
  if (selected === today) return "Immediata"
  return `Dal ${new Intl.DateTimeFormat("it-IT").format(date)}`
}

interface CareerFormData {
  fullName: string
  email: string
  phone: string
  age: string
  city: string
  availability: string
  profilePhoto: File | null
  cv: File | null
  educationLevel: string
  isAwayStudent: YesNo
  languages: string[]
  hasDriverLicense: YesNo
  plansNextTwoYears: string
  jobAttraction: string
  hasRelevantExperience: YesNo
  privacyConsent: PrivacyChoice
}

const initialFormData: CareerFormData = {
  fullName: "",
  email: "",
  phone: "",
  age: "",
  city: "",
  availability: "Immediata",
  profilePhoto: null,
  cv: null,
  educationLevel: "",
  isAwayStudent: "",
  languages: [],
  hasDriverLicense: "",
  plansNextTwoYears: "",
  jobAttraction: "",
  hasRelevantExperience: "",
  privacyConsent: "",
}

const TOTAL_STEPS = 4
const educationOptions = [
  "Liceo",
  "Diploma tecnico/professionale",
  "Laurea triennale",
  "Laurea magistrale",
  "Master",
  "Altro",
]
const languageOptions = ["Inglese", "Francese", "Spagnolo", "Tedesco", "Altro"]
const maxProfilePhotoSizeBytes = 5 * 1024 * 1024
const maxCvSizeBytes = 10 * 1024 * 1024
const allowFreeStepNavigation =
  import.meta.env.DEV && import.meta.env.VITE_ALLOW_FREE_STEP_NAVIGATION === "true"
const preferMultipartSubmission =
  import.meta.env.VITE_CAREER_SUBMIT_FORMAT === "multipart"

function getStepErrors(
  step: number,
  formData: CareerFormData
): Partial<Record<keyof CareerFormData, string>> {
  const newErrors: Partial<Record<keyof CareerFormData, string>> = {}

  if (step === 1) {
    const fullName = formData.fullName.trim()
    if (!fullName) {
      newErrors.fullName = "Il nome è obbligatorio"
    } else if (fullName.length < 2 || fullName.length > 100) {
      newErrors.fullName = "Il nome deve avere tra 2 e 100 caratteri"
    } else if (!/^[A-Za-zÀ-ÖØ-öø-ÿ' -]+$/.test(fullName)) {
      newErrors.fullName = "Il nome contiene caratteri non validi"
    }

    if (!formData.email.trim()) {
      newErrors.email = "L'email è obbligatoria"
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = "Formato email non valido"
    }
    const phone = formData.phone.trim()
    if (!phone) {
      newErrors.phone = "Il telefono è obbligatorio"
    } else {
      const digitsCount = phone.replace(/\D/g, "").length
      if (digitsCount < 8 || digitsCount > 15) {
        newErrors.phone = "Inserisci un numero di telefono valido"
      }
    }

    const ageRaw = formData.age.trim()
    if (!ageRaw) {
      newErrors.age = "L'età è obbligatoria"
    } else {
      const age = Number.parseInt(ageRaw, 10)
      if (Number.isNaN(age) || age < 16 || age > 99) {
        newErrors.age = "Età non valida"
      }
    }

    const city = formData.city.trim()
    if (!city) {
      newErrors.city = "La residenza è obbligatoria"
    } else if (city.length < 2 || city.length > 80) {
      newErrors.city = "La residenza non è valida"
    }

    if (!formData.availability.trim()) {
      newErrors.availability = "La disponibilità è obbligatoria"
    }
    if (!formData.profilePhoto) {
      newErrors.profilePhoto = "La foto in primo piano è obbligatoria"
    } else {
      const allowedPhotoTypes = ["image/jpeg", "image/png", "image/webp"]
      if (!allowedPhotoTypes.includes(formData.profilePhoto.type)) {
        newErrors.profilePhoto = "Formato foto non valido (JPG, PNG, WEBP)"
      } else if (formData.profilePhoto.size > maxProfilePhotoSizeBytes) {
        newErrors.profilePhoto = "La foto supera la dimensione massima (5MB)"
      }
    }

    if (formData.cv) {
      if (formData.cv.type !== "application/pdf") {
        newErrors.cv = "Il CV deve essere in formato PDF"
      } else if (formData.cv.size > maxCvSizeBytes) {
        newErrors.cv = "Il CV supera la dimensione massima (10MB)"
      }
    }
  }

  if (step === 2) {
    if (!formData.educationLevel) {
      newErrors.educationLevel = "Seleziona un titolo di studio"
    } else if (!educationOptions.includes(formData.educationLevel)) {
      newErrors.educationLevel = "Titolo di studio non valido"
    }
    if (formData.languages.length === 0) {
      newErrors.languages = "Seleziona almeno una lingua"
    } else if (formData.languages.some((item) => !languageOptions.includes(item))) {
      newErrors.languages = "Lingue non valide"
    }
    if (!formData.isAwayStudent) {
      newErrors.isAwayStudent = "Seleziona una risposta"
    }
    if (!formData.hasDriverLicense) {
      newErrors.hasDriverLicense = "Seleziona una risposta"
    }
    if (!formData.hasRelevantExperience) {
      newErrors.hasRelevantExperience = "Seleziona una risposta"
    }
  }

  if (step === 4 && formData.privacyConsent !== "accepted") {
    newErrors.privacyConsent =
      "Per inviare la candidatura è necessario accettare il trattamento dati"
  }

  return newErrors
}

export function CareersForm() {
  const [formData, setFormData] = useState<CareerFormData>(initialFormData)
  const [errors, setErrors] = useState<
    Partial<Record<keyof CareerFormData, string>>
  >({})
  const [currentStep, setCurrentStep] = useState(1)
  const [educationPopoverOpen, setEducationPopoverOpen] = useState(false)
  const [languagesPopoverOpen, setLanguagesPopoverOpen] = useState(false)
  const [availabilityPopoverOpen, setAvailabilityPopoverOpen] = useState(false)
  const [availabilityDate, setAvailabilityDate] = useState<Date>(() => getTodayDate())
  const [submitting, setSubmitting] = useState(false)
  const profilePhotoInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateStep = (step: number): boolean => {
    const newErrors = getStepErrors(step, formData)
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateAllSteps = (): boolean => {
    const mergedErrors = {
      ...getStepErrors(1, formData),
      ...getStepErrors(2, formData),
      ...getStepErrors(3, formData),
      ...getStepErrors(4, formData),
    }
    setErrors(mergedErrors)
    return Object.keys(mergedErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateAllSteps()) return
    setSubmitting(true)
    try {
      const endpoint = import.meta.env.VITE_CAREER_ENDPOINT as string | undefined
      if (!endpoint) {
        throw new Error("Endpoint candidature non configurato (VITE_CAREER_ENDPOINT)")
      }

      const response = preferMultipartSubmission
        ? await fetch(endpoint, {
            method: "POST",
            body: buildCareerMultipartPayload(formData),
          })
        : await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(await buildCareerJsonPayload(formData)),
          })
      if (!response.ok) {
        throw new Error("Errore durante l'invio della candidatura")
      }

      toast.success("Candidatura inviata con successo. Grazie!")
      setFormData(initialFormData)
      setAvailabilityDate(getTodayDate())
      setErrors({})
      setCurrentStep(1)
      if (profilePhotoInputRef.current) profilePhotoInputRef.current.value = ""
      if (fileInputRef.current) fileInputRef.current.value = ""
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Impossibile inviare la candidatura"
      )
    } finally {
      setSubmitting(false)
    }
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name as keyof CareerFormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    setFormData((prev) => ({ ...prev, cv: file }))
    if (errors.cv) {
      setErrors((prev) => ({ ...prev, cv: undefined }))
    }
  }

  const handleLanguageToggle = (language: string) => {
    setFormData((prev) => {
      const exists = prev.languages.includes(language)
      const languages = exists
        ? prev.languages.filter((item) => item !== language)
        : [...prev.languages, language]
      return { ...prev, languages }
    })
  }

  const nextStep = () => {
    if (!allowFreeStepNavigation && !validateStep(currentStep)) return
    setCurrentStep((prev) => Math.min(prev + 1, TOTAL_STEPS))
  }

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1))
  }

  const handleProfilePhotoChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0] ?? null
    if (!file) {
      setFormData((prev) => ({ ...prev, profilePhoto: null }))
      return
    }

    try {
      const compressed = await compressProfilePhoto(file)
      setFormData((prev) => ({ ...prev, profilePhoto: compressed }))
    } catch {
      setFormData((prev) => ({ ...prev, profilePhoto: file }))
      toast.error("Impossibile comprimere la foto. Verrà usato il file originale.")
    }

    if (errors.profilePhoto) {
      setErrors((prev) => ({ ...prev, profilePhoto: undefined }))
    }
  }

  const inputClasses = formClassNames.input
  const floatingLabelClasses = formClassNames.floatingLabel
  const errorClasses = formClassNames.error
  const radioCardClasses = formClassNames.radioCard
  const radioCardActiveClasses = formClassNames.radioCardActive

  return (
    <section
      id="careers"
      className="border-t border-border bg-card py-32 "
    >
      <div className="mx-auto max-w-3xl px-6 lg:px-8">
        {/* Section Header */}
        <HeadlineReveal
          label="Lavora con noi"
          heading={
            <h2 className="mt-4 font-serif text-3xl font-light tracking-wide text-foreground sm:text-4xl text-balance">
              Lavora con noi
            </h2>
          }
          paragraph="Unisciti al nostro team e partecipa alle migliori esperienze di servizio in Italia."
          center
          className="mb-16"
        />

        <AnimatedSection viewportAmount={0.15}>
          <motion.form
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            variants={staggerContainer}
            onSubmit={handleSubmit}
            noValidate
          >
            <p className="sr-only" aria-live="polite">
              Step {currentStep} di {TOTAL_STEPS}
            </p>
            {currentStep === 1 && (
              <motion.div
                initial="hidden"
                animate="visible"
                variants={staggerContainer}
                className="grid grid-cols-1 gap-8 sm:grid-cols-2"
              >
                <motion.div variants={fadeInUp}>
                  <div className="relative">
                    <input
                      id="career-fullName"
                      name="fullName"
                      type="text"
                      placeholder=" "
                      value={formData.fullName}
                      onChange={handleChange}
                      aria-invalid={Boolean(errors.fullName)}
                      className={inputClasses}
                    />
                    <label htmlFor="career-fullName" className={floatingLabelClasses}>
                      Nome e cognome
                    </label>
                  </div>
                  <p
                    className={`${errorClasses} ${
                      errors.fullName
                        ? "translate-y-0 opacity-100"
                        : "-translate-y-1 opacity-0"
                    }`}
                  >
                    {errors.fullName ?? "\u00A0"}
                  </p>
                </motion.div>

                <motion.div variants={fadeInUp}>
                  <div className="relative">
                    <input
                      id="career-email"
                      name="email"
                      type="email"
                      placeholder=" "
                      value={formData.email}
                      onChange={handleChange}
                      aria-invalid={Boolean(errors.email)}
                      className={inputClasses}
                    />
                    <label htmlFor="career-email" className={floatingLabelClasses}>
                      Email
                    </label>
                  </div>
                  <p
                    className={`${errorClasses} ${
                      errors.email
                        ? "translate-y-0 opacity-100"
                        : "-translate-y-1 opacity-0"
                    }`}
                  >
                    {errors.email ?? "\u00A0"}
                  </p>
                </motion.div>

                <motion.div variants={fadeInUp}>
                  <div className="relative">
                    <input
                      id="career-phone"
                      name="phone"
                      type="tel"
                      placeholder=" "
                      value={formData.phone}
                      onChange={handleChange}
                      aria-invalid={Boolean(errors.phone)}
                      className={inputClasses}
                    />
                    <label htmlFor="career-phone" className={floatingLabelClasses}>
                      Telefono
                    </label>
                  </div>
                  <p
                    className={`${errorClasses} ${
                      errors.phone
                        ? "translate-y-0 opacity-100"
                        : "-translate-y-1 opacity-0"
                    }`}
                  >
                    {errors.phone ?? "\u00A0"}
                  </p>
                </motion.div>

                <motion.div variants={fadeInUp}>
                  <div className="relative">
                    <input
                      id="career-age"
                      name="age"
                      type="text"
                      placeholder=" "
                      value={formData.age}
                      onChange={handleChange}
                      aria-invalid={Boolean(errors.age)}
                      className={inputClasses}
                    />
                    <label htmlFor="career-age" className={floatingLabelClasses}>
                      Età
                    </label>
                  </div>
                  <p
                    className={`${errorClasses} ${
                      errors.age
                        ? "translate-y-0 opacity-100"
                        : "-translate-y-1 opacity-0"
                    }`}
                  >
                    {errors.age ?? "\u00A0"}
                  </p>
                </motion.div>

                <motion.div variants={fadeInUp}>
                  <div className="relative">
                    <input
                      id="career-city"
                      name="city"
                      type="text"
                      placeholder=" "
                      value={formData.city}
                      onChange={handleChange}
                      aria-invalid={Boolean(errors.city)}
                      className={inputClasses}
                    />
                    <label htmlFor="career-city" className={floatingLabelClasses}>
                      Città di residenza
                    </label>
                  </div>
                  <p
                    className={`${errorClasses} ${
                      errors.city ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0"
                    }`}
                  >
                    {errors.city ?? "\u00A0"}
                  </p>
                </motion.div>

                <motion.div variants={fadeInUp}>
                  <div className="relative">
                    <Popover
                      open={availabilityPopoverOpen}
                      onOpenChange={setAvailabilityPopoverOpen}
                    >
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          onPointerEnter={preloadCalendar}
                          onFocus={preloadCalendar}
                          className="flex w-full cursor-pointer items-center justify-between border-b border-border bg-transparent px-0 pb-2 pt-6 text-left text-sm text-foreground outline-none transition-[border-color,box-shadow,color] duration-300 focus:border-gold focus:shadow-[0_10px_30px_-24px_hsl(var(--gold)/0.85)]"
                        >
                          <span>{formData.availability}</span>
                          <CalendarDays className="h-4 w-4 shrink-0 opacity-60" strokeWidth={1.5} />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-auto border-border bg-card p-0 text-foreground shadow-xl"
                        align="start"
                      >
                        <Suspense
                          fallback={
                            <div className="p-4 text-sm text-muted-foreground">
                              Caricamento calendario...
                            </div>
                          }
                        >
                          <LazyCalendar
                            mode="single"
                            selected={availabilityDate}
                            onSelect={(date) => {
                              if (!date) return
                              const normalized = new Date(
                                date.getFullYear(),
                                date.getMonth(),
                                date.getDate()
                              )
                              setAvailabilityDate(normalized)
                              setFormData((prev) => ({
                                ...prev,
                                availability: formatDateLabel(normalized),
                              }))
                              setAvailabilityPopoverOpen(false)
                              if (errors.availability) {
                                setErrors((prev) => ({ ...prev, availability: undefined }))
                              }
                            }}
                            disabled={(date) => {
                              const day = new Date(
                                date.getFullYear(),
                                date.getMonth(),
                                date.getDate()
                              ).getTime()
                              return day < getTodayDate().getTime()
                            }}
                            initialFocus
                          />
                        </Suspense>
                      </PopoverContent>
                    </Popover>
                    <label className="pointer-events-none absolute left-0 top-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground/70">
                      Disponibilità
                    </label>
                  </div>
                  <p
                    className={`${errorClasses} ${
                      errors.availability
                        ? "translate-y-0 opacity-100"
                        : "-translate-y-1 opacity-0"
                    }`}
                  >
                    {errors.availability ?? "\u00A0"}
                  </p>
                </motion.div>

                <motion.div variants={fadeInUp}>
                  <label
                    htmlFor="career-profilePhoto"
                    className="flex cursor-pointer items-center gap-3 border-b border-border py-3 transition-[border-color,box-shadow,color] duration-300 hover:border-gold hover:shadow-[0_10px_30px_-24px_hsl(var(--gold)/0.85)]"
                  >
                    <Upload className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                    <span className="text-sm text-muted-foreground/60 truncate">
                      {formData.profilePhoto
                        ? formData.profilePhoto.name
                        : "Carica foto primo piano (JPG, PNG)"}
                    </span>
                  </label>
                  <input
                    ref={profilePhotoInputRef}
                    id="career-profilePhoto"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleProfilePhotoChange}
                    className="sr-only"
                  />
                  <p
                    className={`${errorClasses} ${
                      errors.profilePhoto
                        ? "translate-y-0 opacity-100"
                        : "-translate-y-1 opacity-0"
                    }`}
                  >
                    {errors.profilePhoto ?? "\u00A0"}
                  </p>
                </motion.div>

                <motion.div variants={fadeInUp}>
                  <label
                    htmlFor="career-cv"
                    className="flex cursor-pointer items-center gap-3 border-b border-border py-3 transition-[border-color,box-shadow,color] duration-300 hover:border-gold hover:shadow-[0_10px_30px_-24px_hsl(var(--gold)/0.85)]"
                  >
                    <Upload className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                    <span className="text-sm text-muted-foreground/60 truncate">
                      {formData.cv ? formData.cv.name : "Carica CV (PDF, facoltativo)"}
                    </span>
                  </label>
                  <input
                    ref={fileInputRef}
                    id="career-cv"
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={handleFileChange}
                    className="sr-only"
                  />
                  <p
                    className={`${errorClasses} ${
                      errors.cv ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0"
                    }`}
                  >
                    {errors.cv ?? "\u00A0"}
                  </p>
                </motion.div>

              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div
                initial="hidden"
                animate="visible"
                variants={staggerContainer}
                className="grid grid-cols-1 gap-8 sm:grid-cols-2"
              >
                <motion.div variants={fadeInUp}>
                  <div className="relative">
                    <Popover
                      open={educationPopoverOpen}
                      onOpenChange={setEducationPopoverOpen}
                    >
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          role="combobox"
                          aria-expanded={educationPopoverOpen}
                          className="flex w-full cursor-pointer items-center justify-between border-b border-border bg-transparent px-0 pb-2 pt-6 text-left text-sm text-foreground outline-none transition-[border-color,box-shadow,color] duration-300 focus:border-gold focus:shadow-[0_10px_30px_-24px_hsl(var(--gold)/0.85)]"
                        >
                          <span
                            className={cn(
                              "truncate pr-2",
                              !formData.educationLevel && "text-muted-foreground/60"
                            )}
                          >
                            {formData.educationLevel || "Seleziona titolo di studio"}
                          </span>
                          <ChevronsUpDown
                            className="h-4 w-4 shrink-0 opacity-50"
                            strokeWidth={1.5}
                          />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-[var(--radix-popover-trigger-width)] border-border bg-card p-0 text-foreground shadow-xl"
                        align="start"
                      >
                        <div className="max-h-[280px] overflow-y-auto p-1">
                          {educationOptions.map((option) => (
                            <button
                              key={option}
                              type="button"
                              onClick={() => {
                                setFormData((prev) => ({
                                  ...prev,
                                  educationLevel: option,
                                }))
                                setEducationPopoverOpen(false)
                              }}
                              className="flex w-full items-center rounded-sm px-2 py-2 text-left text-sm transition-colors hover:bg-accent"
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4 shrink-0",
                                  formData.educationLevel === option
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                                strokeWidth={1.5}
                              />
                              {option}
                            </button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                    <label className="pointer-events-none absolute left-0 top-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground/70">
                      Titolo di studio
                    </label>
                  </div>
                  <p
                    className={`${errorClasses} ${
                      errors.educationLevel
                        ? "translate-y-0 opacity-100"
                        : "-translate-y-1 opacity-0"
                    }`}
                  >
                    {errors.educationLevel ?? "\u00A0"}
                  </p>
                </motion.div>

                <motion.div variants={fadeInUp}>
                  <div className="relative">
                    <Popover
                      open={languagesPopoverOpen}
                      onOpenChange={setLanguagesPopoverOpen}
                    >
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          role="combobox"
                          aria-expanded={languagesPopoverOpen}
                          className="flex w-full cursor-pointer items-center justify-between border-b border-border bg-transparent px-0 pb-2 pt-6 text-left text-sm text-foreground outline-none transition-[border-color,box-shadow,color] duration-300 focus:border-gold focus:shadow-[0_10px_30px_-24px_hsl(var(--gold)/0.85)]"
                        >
                          <span
                            className={cn(
                              "truncate pr-2",
                              formData.languages.length === 0 &&
                                "text-muted-foreground/60"
                            )}
                          >
                            {formData.languages.length > 0
                              ? formData.languages.join(", ")
                              : "Seleziona una o piu lingue"}
                          </span>
                          <ChevronsUpDown
                            className="h-4 w-4 shrink-0 opacity-50"
                            strokeWidth={1.5}
                          />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-[var(--radix-popover-trigger-width)] border-border bg-card p-0 text-foreground shadow-xl"
                        align="start"
                      >
                        <div className="max-h-[280px] overflow-y-auto p-1">
                          {languageOptions.map((language) => (
                            <button
                              key={language}
                              type="button"
                              onClick={() => {
                                handleLanguageToggle(language)
                              }}
                              className="flex w-full items-center rounded-sm px-2 py-2 text-left text-sm transition-colors hover:bg-accent"
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4 shrink-0",
                                  formData.languages.includes(language)
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                                strokeWidth={1.5}
                              />
                              {language}
                            </button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                    <label className="pointer-events-none absolute left-0 top-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground/70">
                      Parli qualche lingua straniera?
                    </label>
                  </div>
                  <p
                    className={`${errorClasses} ${
                      errors.languages
                        ? "translate-y-0 opacity-100"
                        : "-translate-y-1 opacity-0"
                    }`}
                  >
                    {errors.languages ?? "\u00A0"}
                  </p>
                </motion.div>

                <motion.div variants={fadeInUp}>
                  <p
                    id="away-student-label"
                    className="mb-3 text-[11px] uppercase tracking-[0.2em] text-muted-foreground"
                  >
                    Sei uno studente fuori sede?
                  </p>
                  <div
                    role="radiogroup"
                    aria-labelledby="away-student-label"
                    className="flex flex-wrap gap-2"
                  >
                    {(["yes", "no"] as const).map((option) => {
                      const active = formData.isAwayStudent === option
                      return (
                        <button
                          key={option}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          onClick={() =>
                            setFormData((prev) => ({ ...prev, isAwayStudent: option }))
                          }
                          className={`${radioCardClasses} ${
                            active ? radioCardActiveClasses : ""
                          }`}
                        >
                          {option === "yes" ? "Si" : "No"}
                        </button>
                      )
                    })}
                  </div>
                  <p
                    className={`${errorClasses} ${
                      errors.isAwayStudent
                        ? "translate-y-0 opacity-100"
                        : "-translate-y-1 opacity-0"
                    }`}
                  >
                    {errors.isAwayStudent ?? "\u00A0"}
                  </p>
                </motion.div>

                <motion.div variants={fadeInUp}>
                  <p
                    id="driver-license-label"
                    className="mb-3 text-[11px] uppercase tracking-[0.2em] text-muted-foreground"
                  >
                    Hai la patente?
                  </p>
                  <div
                    role="radiogroup"
                    aria-labelledby="driver-license-label"
                    className="flex flex-wrap gap-2"
                  >
                    {(["yes", "no"] as const).map((option) => {
                      const active = formData.hasDriverLicense === option
                      return (
                        <button
                          key={option}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          onClick={() =>
                            setFormData((prev) => ({ ...prev, hasDriverLicense: option }))
                          }
                          className={`${radioCardClasses} ${
                            active ? radioCardActiveClasses : ""
                          }`}
                        >
                          {option === "yes" ? "Si" : "No"}
                        </button>
                      )
                    })}
                  </div>
                  <p
                    className={`${errorClasses} ${
                      errors.hasDriverLicense
                        ? "translate-y-0 opacity-100"
                        : "-translate-y-1 opacity-0"
                    }`}
                  >
                    {errors.hasDriverLicense ?? "\u00A0"}
                  </p>
                </motion.div>

                <motion.div variants={fadeInUp} className="sm:col-span-2">
                  <p
                    id="experience-label"
                    className="mb-3 text-[11px] uppercase tracking-[0.2em] text-muted-foreground"
                  >
                    Hai esperienza di questo tipo di lavoro?
                  </p>
                  <div
                    role="radiogroup"
                    aria-labelledby="experience-label"
                    className="flex flex-wrap gap-2"
                  >
                    {(["yes", "no"] as const).map((option) => {
                      const active = formData.hasRelevantExperience === option
                      return (
                        <button
                          key={option}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              hasRelevantExperience: option,
                            }))
                          }
                          className={`${radioCardClasses} ${
                            active ? radioCardActiveClasses : ""
                          }`}
                        >
                          {option === "yes" ? "Si" : "No"}
                        </button>
                      )
                    })}
                  </div>
                  <p
                    className={`${errorClasses} ${
                      errors.hasRelevantExperience
                        ? "translate-y-0 opacity-100"
                        : "-translate-y-1 opacity-0"
                    }`}
                  >
                    {errors.hasRelevantExperience ?? "\u00A0"}
                  </p>
                </motion.div>
              </motion.div>
            )}

            {currentStep === 3 && (
              <motion.div
                initial="hidden"
                animate="visible"
                variants={staggerContainer}
                className="grid grid-cols-1 gap-8"
              >
                <motion.div variants={fadeInUp}>
                  <div className="relative">
                    <textarea
                      id="career-plansNextTwoYears"
                      name="plansNextTwoYears"
                      rows={4}
                      placeholder=" "
                      value={formData.plansNextTwoYears}
                      onChange={handleChange}
                      aria-invalid={Boolean(errors.plansNextTwoYears)}
                      className={`${inputClasses} resize-none`}
                    />
                    <label
                      htmlFor="career-plansNextTwoYears"
                      className={floatingLabelClasses}
                    >
                      Quali sono i tuoi programmi per i prossimi due anni? (facoltativo)
                    </label>
                  </div>
                  <p
                    className={`${errorClasses} ${
                      errors.plansNextTwoYears
                        ? "translate-y-0 opacity-100"
                        : "-translate-y-1 opacity-0"
                    }`}
                  >
                    {errors.plansNextTwoYears ?? "\u00A0"}
                  </p>
                </motion.div>

                <motion.div variants={fadeInUp}>
                  <div className="relative">
                    <textarea
                      id="career-jobAttraction"
                      name="jobAttraction"
                      rows={4}
                      placeholder=" "
                      value={formData.jobAttraction}
                      onChange={handleChange}
                      aria-invalid={Boolean(errors.jobAttraction)}
                      className={`${inputClasses} resize-none`}
                    />
                    <label htmlFor="career-jobAttraction" className={floatingLabelClasses}>
                      Cosa ti attira di questo lavoro? (facoltativo)
                    </label>
                  </div>
                  <p
                    className={`${errorClasses} ${
                      errors.jobAttraction
                        ? "translate-y-0 opacity-100"
                        : "-translate-y-1 opacity-0"
                    }`}
                  >
                    {errors.jobAttraction ?? "\u00A0"}
                  </p>
                </motion.div>
              </motion.div>
            )}

            {currentStep === 4 && (
              <motion.div
                initial="hidden"
                animate="visible"
                variants={staggerContainer}
                className="grid grid-cols-1 gap-8"
              >
                <motion.div variants={fadeInUp} className="border border-border p-6">
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Autorizzo il trattamento dei miei dati personali ai sensi del
                    D.Lgs. 196/2003, come modificato dal D.Lgs. 101/2018, e del
                    Regolamento UE 2016/679 (GDPR). Per inviare la candidatura è
                    necessario selezionare "Accetto".
                  </p>
                </motion.div>

                <motion.div variants={fadeInUp}>
                  <p
                    id="privacy-consent-label"
                    className="mb-3 text-[11px] uppercase tracking-[0.2em] text-muted-foreground"
                  >
                    Consenso privacy
                  </p>
                  <div
                    role="radiogroup"
                    aria-labelledby="privacy-consent-label"
                    className="flex flex-wrap gap-2"
                  >
                    <button
                      type="button"
                      role="radio"
                      aria-checked={formData.privacyConsent === "accepted"}
                      onClick={() =>
                        setFormData((prev) => ({ ...prev, privacyConsent: "accepted" }))
                      }
                      className={`${radioCardClasses} ${
                        formData.privacyConsent === "accepted"
                          ? radioCardActiveClasses
                          : ""
                      }`}
                    >
                      Accetto
                    </button>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={formData.privacyConsent === "declined"}
                      onClick={() =>
                        setFormData((prev) => ({ ...prev, privacyConsent: "declined" }))
                      }
                      className={`${radioCardClasses} ${
                        formData.privacyConsent === "declined"
                          ? radioCardActiveClasses
                          : ""
                      }`}
                    >
                      Non accetto
                    </button>
                  </div>
                  <p
                    className={`${errorClasses} ${
                      errors.privacyConsent
                        ? "translate-y-0 opacity-100"
                        : "-translate-y-1 opacity-0"
                    }`}
                  >
                    {errors.privacyConsent ?? "\u00A0"}
                  </p>
                </motion.div>
              </motion.div>
            )}

            <motion.div
              variants={fadeInUp}
              className="mt-10 px-5 flex flex-col items-center justify-between gap-4 sm:flex-row"
            >
              <button
                type="button"
                onClick={prevStep}
                disabled={currentStep === 1 || submitting}
                className="button-luxury inline-flex w-full items-center justify-center border border-border px-8 py-3.5 text-xs font-medium uppercase tracking-[0.2em] text-foreground transition-all duration-300 hover:border-gold disabled:opacity-40 sm:w-auto"
              >
                Indietro
              </button>

              {currentStep < TOTAL_STEPS ? (
                <button
                  type="button"
                  onClick={nextStep}
                  disabled={submitting}
                  className="button-luxury inline-flex w-full items-center justify-center bg-foreground px-10 py-3.5 text-xs font-medium uppercase tracking-[0.2em] text-primary-foreground transition-all duration-300 hover:bg-foreground/90 disabled:opacity-60 sm:w-auto"
                >
                  Avanti
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={submitting || formData.privacyConsent !== "accepted"}
                  className="button-luxury inline-flex w-full items-center justify-center bg-foreground px-10 py-3.5 text-xs font-medium uppercase tracking-[0.2em] text-primary-foreground transition-all duration-300 hover:bg-foreground/90 disabled:opacity-60 sm:w-auto"
                >
                  {submitting ? "Invio in corso..." : "Invia candidatura"}
                </button>
              )}
            </motion.div>
          </motion.form>
        </AnimatedSection>
      </div>
    </section>
  )
}

function fileToDataUrl(file: File | null): Promise<string> {
  if (!file) return Promise.resolve("")

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ""))
    reader.onerror = () => reject(new Error("Impossibile leggere la foto selezionata"))
    reader.readAsDataURL(file)
  })
}

async function buildCareerJsonPayload(formData: CareerFormData) {
  const profilePhotoDataUrl = await fileToDataUrl(formData.profilePhoto)
  const cvPreviewUrl =
    formData.cv && formData.cv.type === "application/pdf"
      ? await fileToDataUrl(formData.cv)
      : ""

  return {
    fullName: formData.fullName,
    email: formData.email,
    phone: formData.phone,
    age: formData.age,
    city: formData.city,
    availability: formData.availability,
    profilePhotoFileName: formData.profilePhoto?.name ?? "",
    profilePhotoDataUrl,
    cvFileName: formData.cv?.name ?? "",
    cvPreviewUrl,
    educationLevel: formData.educationLevel,
    isAwayStudent: formData.isAwayStudent,
    languages: formData.languages,
    hasDriverLicense: formData.hasDriverLicense,
    plansNextTwoYears: formData.plansNextTwoYears,
    jobAttraction: formData.jobAttraction,
    hasRelevantExperience: formData.hasRelevantExperience,
    privacyConsentAccepted: formData.privacyConsent === "accepted",
  }
}

function buildCareerMultipartPayload(formData: CareerFormData): FormData {
  const payload = new FormData()
  payload.set("fullName", formData.fullName)
  payload.set("email", formData.email)
  payload.set("phone", formData.phone)
  payload.set("age", formData.age)
  payload.set("city", formData.city)
  payload.set("availability", formData.availability)
  payload.set("educationLevel", formData.educationLevel)
  payload.set("isAwayStudent", formData.isAwayStudent)
  payload.set("languages", JSON.stringify(formData.languages))
  payload.set("hasDriverLicense", formData.hasDriverLicense)
  payload.set("plansNextTwoYears", formData.plansNextTwoYears)
  payload.set("jobAttraction", formData.jobAttraction)
  payload.set("hasRelevantExperience", formData.hasRelevantExperience)
  payload.set(
    "privacyConsentAccepted",
    String(formData.privacyConsent === "accepted")
  )

  if (formData.profilePhoto) {
    payload.set("profilePhoto", formData.profilePhoto, formData.profilePhoto.name)
  }
  if (formData.cv) {
    payload.set("cv", formData.cv, formData.cv.name)
  }

  return payload
}
