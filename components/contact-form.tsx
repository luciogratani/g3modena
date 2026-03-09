import { useState } from "react"
import { motion } from "framer-motion"
import { fadeInUp, staggerContainer } from "@/lib/animations"
import { AnimatedSection } from "@/components/animated-section"
import { HeadlineReveal } from "@/components/headline-reveal"
import { toast } from "sonner"

interface FormData {
  fullName: string
  company: string
  email: string
  phone: string
  city: string
  message: string
}

const initialFormData: FormData = {
  fullName: "",
  company: "",
  email: "",
  phone: "",
  city: "",
  message: "",
}

export function ContactForm() {
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>(
    {}
  )
  const [submitting, setSubmitting] = useState(false)

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {}
    if (!formData.fullName.trim()) newErrors.fullName = "Il nome e obbligatorio"
    if (!formData.email.trim()) {
      newErrors.email = "L'email e obbligatoria"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Formato email non valido"
    }
    if (!formData.phone.trim()) newErrors.phone = "Il telefono è obbligatorio"
    if (!formData.message.trim()) newErrors.message = "Il messaggio è obbligatorio"
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    try {
      const endpoint = import.meta.env.VITE_CONTACT_ENDPOINT as string | undefined
      if (!endpoint) {
        throw new Error("Endpoint contatti non configurato (VITE_CONTACT_ENDPOINT)")
      }
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
      if (!response.ok) {
        throw new Error("Errore durante l'invio della richiesta")
      }
      toast.success("Grazie. Ti contatteremo a breve.")
      setFormData(initialFormData)
      setErrors({})
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Impossibile inviare la richiesta"
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
    if (errors[name as keyof FormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  const inputClasses =
    "peer w-full border-b border-border bg-transparent px-0 pb-2 pt-6 text-sm text-foreground placeholder:text-transparent outline-none transition-[border-color,box-shadow,color] duration-300 focus:border-gold focus:shadow-[0_10px_30px_-24px_hsl(var(--gold)/0.85)]"
  const floatingLabelClasses =
    "pointer-events-none absolute left-0 top-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground/70 transition-all duration-300 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] peer-placeholder-shown:top-6 peer-placeholder-shown:text-sm peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-placeholder-shown:text-muted-foreground/55 peer-focus:top-1 peer-focus:text-[11px] peer-focus:uppercase peer-focus:tracking-[0.2em] peer-focus:text-gold"
  const errorClasses =
    "mt-1 text-[11px] text-destructive/85 transition-all duration-300"

  return (
    <section id="contact" className="bg-background py-24 lg:py-32">
      <div className="mx-auto max-w-3xl px-6 lg:px-8">
        {/* Section Header */}
        <HeadlineReveal
          label="Contatti"
          heading={
            <h2 className="mt-4 font-serif text-3xl font-light tracking-wide text-foreground sm:text-4xl text-balance">
              Richiedi un incontro
            </h2>
          }
          paragraph="Raccontaci il tuo evento e costruiremo un servizio su misura."
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
                    id="contact-fullName"
                    name="fullName"
                    type="text"
                    placeholder=" "
                    value={formData.fullName}
                    onChange={handleChange}
                    aria-invalid={Boolean(errors.fullName)}
                    className={inputClasses}
                  />
                  <label
                    htmlFor="contact-fullName"
                    className={floatingLabelClasses}
                  >
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
                    id="contact-company"
                    name="company"
                    type="text"
                    placeholder=" "
                    value={formData.company}
                    onChange={handleChange}
                    className={inputClasses}
                  />
                  <label htmlFor="contact-company" className={floatingLabelClasses}>
                    Azienda
                  </label>
                </div>
              </motion.div>

              <motion.div variants={fadeInUp}>
                <div className="relative">
                  <input
                    id="contact-email"
                    name="email"
                    type="email"
                    placeholder=" "
                    value={formData.email}
                    onChange={handleChange}
                    aria-invalid={Boolean(errors.email)}
                    className={inputClasses}
                  />
                  <label htmlFor="contact-email" className={floatingLabelClasses}>
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
                    id="contact-phone"
                    name="phone"
                    type="tel"
                    placeholder=" "
                    value={formData.phone}
                    onChange={handleChange}
                    aria-invalid={Boolean(errors.phone)}
                    className={inputClasses}
                  />
                  <label htmlFor="contact-phone" className={floatingLabelClasses}>
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

              <motion.div variants={fadeInUp} className="sm:col-span-2">
                <div className="relative">
                  <input
                    id="contact-city"
                    name="city"
                    type="text"
                    placeholder=" "
                    value={formData.city}
                    onChange={handleChange}
                    className={inputClasses}
                  />
                  <label htmlFor="contact-city" className={floatingLabelClasses}>
                    Città
                  </label>
                </div>
              </motion.div>

              <motion.div variants={fadeInUp} className="sm:col-span-2">
                <div className="relative">
                  <textarea
                    id="contact-message"
                    name="message"
                    rows={4}
                    placeholder=" "
                    value={formData.message}
                    onChange={handleChange}
                    aria-invalid={Boolean(errors.message)}
                    className={`${inputClasses} resize-none`}
                  />
                  <label htmlFor="contact-message" className={floatingLabelClasses}>
                    Messaggio *
                  </label>
                </div>
                <p
                  className={`${errorClasses} ${
                    errors.message
                      ? "translate-y-0 opacity-100"
                      : "-translate-y-1 opacity-0"
                  }`}
                >
                  {errors.message ?? "\u00A0"}
                </p>
              </motion.div>
            </div>

            <motion.div variants={fadeInUp} className="mt-10 text-center">
              <button
                type="submit"
                disabled={submitting}
                className="button-luxury inline-flex items-center justify-center bg-foreground px-10 py-3.5 text-xs font-medium uppercase tracking-[0.2em] text-primary-foreground transition-all duration-300 hover:bg-foreground/90 disabled:opacity-60"
              >
                {submitting ? "Invio in corso..." : "Invia richiesta"}
              </button>
            </motion.div>
          </motion.form>
        </AnimatedSection>
      </div>
    </section>
  )
}
