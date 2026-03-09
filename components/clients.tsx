import { motion } from "framer-motion"
import { scaleIn, luxuryEase } from "@/lib/animations"
import { AnimatedSection, staggerChildVariants } from "@/components/animated-section"
import { HeadlineReveal } from "@/components/headline-reveal"

interface Client {
  name: string
  location: string
}

const clients: Client[] = [
  { name: "Massimo Bottura", location: "Casa Maria Luigia, Modena" },
  { name: "Domenico Stile", location: "Enoteca La Torre, Roma" },
  { name: "Alajmo Group", location: "Padova" },
  { name: "ALMA", location: "Scuola Int. di Cucina Italiana, Parma" },
  { name: "Zerobriciole", location: "Milano" },
  { name: "Viola Morlino", location: "Milano" },
  { name: "Roots", location: "Modena" },
  { name: "AKitchen", location: "Sassari" },
  { name: "Tavola della Signoria", location: "Bologna" },
]

export function Clients() {
  return (
    <section
      id="clients"
      className="border-t border-border bg-card py-24 lg:py-32"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section Header */}
        <HeadlineReveal
          label="Clienti selezionati"
          heading={
            <h2 className="mt-4 font-serif text-3xl font-light tracking-wide text-foreground sm:text-4xl text-balance">
              La fiducia dei migliori
            </h2>
          }
          className="mb-16 max-w-xl"
        />

        {/* Client Grid */}
        <AnimatedSection stagger viewportAmount={0.15}>
          <div className="grid grid-cols-1 gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
            {clients.map((client) => (
              <motion.div
                key={client.name}
                variants={scaleIn}
                className="group flex flex-col items-center justify-center bg-card px-6 py-10 text-center transition-colors duration-500 hover:bg-background"
              >
                <h3 className="font-serif text-lg font-light tracking-wide text-foreground">
                  {client.name}
                </h3>
                <p className="mt-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                  {client.location}
                </p>
              </motion.div>
            ))}
          </div>
        </AnimatedSection>
      </div>
    </section>
  )
}
