import { useState, useRef } from "react"
import { motion } from "framer-motion"
import { fadeInUp, staggerContainer } from "@/lib/animations"
import { AnimatedSection } from "@/components/animated-section"
import { HeadlineReveal } from "@/components/headline-reveal"
import { toast } from "sonner"
import { Upload } from "lucide-react"

interface CareerFormData {
  fullName: string
  email: string
  phone: string
  age: string
  city: string
  availability: string
  profilePhoto: File | null
  cv: File | null
  message: string
}

const initialFormData: CareerFormData = {
  fullName: "",
  email: "",
  phone: "",
  age: "",
  city: "",
  availability: "",
  profilePhoto: null,
  cv: null,
  message: "",
}

export function CareersForm() {
  const [formData, setFormData] = useState<CareerFormData>(initialFormData)
  const [errors, setErrors] = useState<
    Partial<Record<keyof CareerFormData, string>>
  >({})
  const [submitting, setSubmitting] = useState(false)
  const profilePhotoInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof CareerFormData, string>> = {}
    if (!formData.fullName.trim()) newErrors.fullName = "Il nome è obbligatorio"
    if (!formData.email.trim()) {
      newErrors.email = "L'email è obbligatoria"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Formato email non valido"
    }
    if (!formData.phone.trim()) newErrors.phone = "Il telefono è obbligatorio"
    if (!formData.age.trim()) newErrors.age = "L'età è obbligatoria"
    if (!formData.availability.trim())
      newErrors.availability = "La disponibilita è obbligatoria"
    if (!formData.profilePhoto)
      newErrors.profilePhoto = "La foto in primo piano è obbligatoria"
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    try {
      const profilePhotoDataUrl = await fileToDataUrl(formData.profilePhoto)
      const cvPreviewUrl =
        formData.cv && formData.cv.type === "application/pdf"
          ? await fileToDataUrl(formData.cv)
          : ""

      const endpoint = import.meta.env.VITE_CAREER_ENDPOINT as string | undefined
      if (!endpoint) {
        throw new Error("Endpoint candidature non configurato (VITE_CAREER_ENDPOINT)")
      }
      const payload = {
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
        message: formData.message,
      }
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!response.ok) {
        throw new Error("Errore durante l'invio della candidatura")
      }

      toast.success("Candidatura inviata con successo. Grazie!")
      setFormData(initialFormData)
      setErrors({})
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
  }

  const handleProfilePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    setFormData((prev) => ({ ...prev, profilePhoto: file }))
    if (errors.profilePhoto) {
      setErrors((prev) => ({ ...prev, profilePhoto: undefined }))
    }
  }

  const inputClasses =
    "peer w-full border-b border-border bg-transparent px-0 pb-2 pt-6 text-sm text-foreground placeholder:text-transparent outline-none transition-[border-color,box-shadow,color] duration-300 focus:border-gold focus:shadow-[0_10px_30px_-24px_hsl(var(--gold)/0.85)]"
  const floatingLabelClasses =
    "pointer-events-none absolute left-0 top-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground/70 transition-all duration-300 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] peer-placeholder-shown:top-6 peer-placeholder-shown:text-sm peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-placeholder-shown:text-muted-foreground/55 peer-focus:top-1 peer-focus:text-[11px] peer-focus:uppercase peer-focus:tracking-[0.2em] peer-focus:text-gold"
  const errorClasses =
    "mt-1 text-[11px] text-destructive/85 transition-all duration-300"

  return (
    <section
      id="careers"
      className="border-t border-border bg-card py-24 lg:py-32"
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
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
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
                    Nome e cognome *
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
                    Email *
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
                    Telefono *
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
                    Età *
                  </label>
                </div>
                <p
                  className={`${errorClasses} ${
                    errors.age ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0"
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
                    className={inputClasses}
                  />
                  <label htmlFor="career-city" className={floatingLabelClasses}>
                    Città
                  </label>
                </div>
              </motion.div>

              <motion.div variants={fadeInUp}>
                <div className="relative">
                  <input
                    id="career-availability"
                    name="availability"
                    type="text"
                    placeholder=" "
                    value={formData.availability}
                    onChange={handleChange}
                    aria-invalid={Boolean(errors.availability)}
                    className={inputClasses}
                  />
                  <label
                    htmlFor="career-availability"
                    className={floatingLabelClasses}
                  >
                    Disponibilità *
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

              {/* Upload foto primo piano */}
              <motion.div variants={fadeInUp}>
                <label
                  htmlFor="career-profilePhoto"
                  className="flex cursor-pointer items-center gap-3 border-b border-border py-3 transition-[border-color,box-shadow,color] duration-300 hover:border-gold hover:shadow-[0_10px_30px_-24px_hsl(var(--gold)/0.85)]"
                >
                  <Upload className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                  <span className="text-sm text-muted-foreground/60">
                    {formData.profilePhoto
                      ? formData.profilePhoto.name
                      : "Carica foto primo piano * (JPG, PNG)"}
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
                  <span className="text-sm text-muted-foreground/60">
                    {formData.cv ? formData.cv.name : "Carica CV (PDF, DOC)"}
                  </span>
                </label>
                <input
                  ref={fileInputRef}
                  id="career-cv"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileChange}
                  className="sr-only"
                />
              </motion.div>

              <motion.div variants={fadeInUp} className="sm:col-span-2">
                <div className="relative">
                  <textarea
                    id="career-message"
                    name="message"
                    rows={4}
                    placeholder=" "
                    value={formData.message}
                    onChange={handleChange}
                    className={`${inputClasses} resize-none`}
                  />
                  <label htmlFor="career-message" className={floatingLabelClasses}>
                    Messaggio
                  </label>
                </div>
              </motion.div>
            </div>

            <motion.div variants={fadeInUp} className="mt-10 text-center">
              <button
                type="submit"
                disabled={submitting}
                className="button-luxury inline-flex items-center justify-center bg-foreground px-10 py-3.5 text-xs font-medium uppercase tracking-[0.2em] text-primary-foreground transition-all duration-300 hover:bg-foreground/90 disabled:opacity-60"
              >
                {submitting ? "Invio in corso..." : "Invia candidatura"}
              </button>
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
