import { motion } from "framer-motion"
import { fadeIn, luxuryEase } from "@/lib/animations"
import { AnimatedSection, staggerChildVariants } from "@/components/animated-section"
import { Mail, Phone } from "lucide-react"

const quickLinks = [
  { label: "Chi siamo", href: "#about" },
  { label: "Clienti", href: "#clients" },
  { label: "Lavora con noi", href: "#careers" },
  { label: "Contatti", href: "#contact" },
]

export function Footer() {
  return (
    <motion.footer
      initial={{ backgroundColor: "hsl(var(--card))" }}
      whileInView={{ backgroundColor: "hsl(var(--foreground))" }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.6, ease: luxuryEase }}
      className="bg-foreground"
    >
      <AnimatedSection
        as="div"
        stagger
        viewportAmount={0.2}
        className="mx-auto max-w-7xl px-6 py-16 lg:px-8 lg:py-20"
      >
        <div className="grid grid-cols-1 gap-12 md:grid-cols-3 lg:grid-cols-4">
          {/* Brand */}
          <motion.div variants={staggerChildVariants} className="md:col-span-1 lg:col-span-2">
            <div className="flex flex-col">
              <span className="font-serif text-2xl font-bold tracking-wider text-primary-foreground">
                G3
              </span>
              <span className="mt-1 text-[10px] uppercase tracking-[0.25em] text-primary-foreground/50">
                Waiters & Experience
              </span>
            </div>
            <div className="mt-6 space-y-1 text-xs leading-relaxed text-primary-foreground/40">
              <p>G3 Waiters & Experience per La Vela SRL</p>
              <p>Viale dell{"'"}Industria 23/A</p>
              <p>35129 Padua</p>
              <p>P. IVA / Codice Fiscale: 05640030283</p>
            </div>
          </motion.div>

          {/* Quick Links */}
          <motion.div variants={staggerChildVariants}>
            <h4 className="mb-4 text-[11px] uppercase tracking-[0.2em] text-primary-foreground/60">
              Link rapidi
            </h4>
            <nav className="flex flex-col gap-3">
              {quickLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="link-luxury text-sm text-primary-foreground/50 transition-colors hover:text-gold"
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </motion.div>

          {/* Contact Info */}
          <motion.div variants={staggerChildVariants}>
            <h4 className="mb-4 text-[11px] uppercase tracking-[0.2em] text-primary-foreground/60">
              Contatti
            </h4>
            <div className="space-y-3">
              <p className="text-sm text-primary-foreground/50">
                Lino Salemme — Amministratore unico
              </p>
              <a
                href="tel:+393491767260"
                className="link-luxury flex items-center gap-2 text-sm text-primary-foreground/50 transition-colors hover:text-gold"
              >
                <Phone className="h-3.5 w-3.5" strokeWidth={1.5} />
                +39 349 1767260
              </a>
              <a
                href="mailto:info@g3modena.com"
                className="link-luxury flex items-center gap-2 text-sm text-primary-foreground/50 transition-colors hover:text-gold"
              >
                <Mail className="h-3.5 w-3.5" strokeWidth={1.5} />
                info@g3modena.com
              </a>
              <a
                href="mailto:mediterraneo@g3modena.com"
                className="link-luxury flex items-center gap-2 text-sm text-primary-foreground/50 transition-colors hover:text-gold"
              >
                <Mail className="h-3.5 w-3.5" strokeWidth={1.5} />
                mediterraneo@g3modena.com
              </a>
            </div>
          </motion.div>
        </div>

        {/* Bottom Bar */}
        <motion.div
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: luxuryEase }}
          style={{ originX: 0 }}
          className="mt-16 border-t border-primary-foreground/10 pt-6"
        >
          <p className="text-center text-[11px] text-primary-foreground/30">
            {new Date().getFullYear()} G3 Waiters & Experience per La Vela SRL. Tutti i diritti sono riservati.
            reserved.
          </p>
        </motion.div>
      </AnimatedSection>
    </motion.footer>
  )
}
