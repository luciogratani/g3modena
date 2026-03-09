import { motion } from "framer-motion"
import { slideInLeft, slideInRight, luxuryEase } from "@/lib/animations"
import { HeadlineReveal } from "@/components/headline-reveal"

export function About() {
  return (
    <section id="about" className="bg-background py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section Label */}
        <HeadlineReveal
          label="Chi siamo"
          heading={<></>}
          className="mb-16"
        />

        <div className="grid gap-12 lg:grid-cols-2 lg:gap-20">
          {/* Text Column */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={slideInLeft}
            className="flex flex-col justify-center"
            style={{ willChange: "opacity, transform" }}
          >
            <h2 className="font-serif text-3xl font-light leading-snug tracking-wide text-foreground sm:text-4xl lg:text-5xl text-balance">
              Due decenni di eccellenza nel servizio di sala
            </h2>

            <motion.div
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1, ease: luxuryEase, delay: 0.3 }}
              className="mt-8 h-px w-12 bg-gold"
              style={{ originX: 0 }}
            />

            <div className="mt-8 space-y-5 text-sm leading-relaxed text-muted-foreground">
              <p>
                Con sede a Modena, G3 ha costruito oltre vent&apos;anni di esperienza
                nel settore del catering, specializzandosi nella direzione di sala
                e nel servizio premium al tavolo per la clientela piu esigente.
              </p>
              <p>
                Portiamo a ogni evento una pianificazione del servizio accurata e
                strutturata, dalle cene intime alle grandi celebrazioni, operando
                in Italia centrale e settentrionale, oltre che in Sardegna.
              </p>
              <p>
                La nostra forza e il nostro team giovane e affiatato di
                studenti universitari, unito da un impegno condiviso verso
                lavoro di squadra, precisione ed esecuzione impeccabile.
              </p>
            </div>
          </motion.div>

          {/* Image Column */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={slideInRight}
            className="relative aspect-[4/5] overflow-hidden lg:aspect-auto"
            style={{ willChange: "opacity, transform" }}
          >
            <img
              src="/images/about.jpg"
              alt="Elegante servizio di sala"
              className="absolute inset-0 h-full w-full object-cover"
            />
          </motion.div>
        </div>
      </div>
    </section>
  )
}
