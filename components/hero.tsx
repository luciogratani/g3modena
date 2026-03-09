import { useRef } from "react"
import { motion, useScroll, useTransform } from "framer-motion"
import { fadeIn, fadeInUp, staggerContainer, luxuryEase } from "@/lib/animations"

export function Hero() {
  const sectionRef = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  })

  /* Soft parallax: the background moves up by 80px as you scroll past */
  const bgY = useTransform(scrollYProgress, [0, 1], ["0px", "-80px"])

  return (
    <section
      ref={sectionRef}
      className="relative flex min-h-screen items-center justify-center overflow-hidden"
    >
      {/* Background Image with Parallax */}
      <motion.div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url(/hero-rubamatic.mp4)",
          y: bgY,
          willChange: "transform",
        }}
      />
      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-foreground/60" />

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="relative z-10 mx-auto max-w-4xl px-6 text-center"
      >
        {/* Decorative Line */}
        <motion.div
          variants={fadeIn}
          className="mx-auto mb-8 h-px w-16 bg-gold"
        />

        <motion.h1
          variants={fadeInUp}
          className="font-serif text-4xl font-light leading-tight tracking-wide text-background sm:text-5xl md:text-6xl lg:text-7xl text-balance"
        >
          Il nostro team. Il tuo stile.
        </motion.h1>

        <motion.p
          variants={fadeInUp}
          className="mx-auto mt-6 max-w-xl text-sm leading-relaxed tracking-wider text-background/75 sm:text-base"
        >
          Direzione di sala e servizio premium per catering di alto livello
        </motion.p>

        <motion.div
          variants={fadeInUp}
          className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
        >
          <a
            href="#contact"
            className="button-luxury inline-flex items-center justify-center bg-gold px-8 py-3.5 text-xs font-medium uppercase tracking-[0.2em] text-gold-foreground transition-all duration-300 hover:bg-gold/90"
          >
            Richiedi un incontro
          </a>
          <a
            href="#careers"
            className="button-luxury inline-flex items-center justify-center border border-background/40 px-8 py-3.5 text-xs font-medium uppercase tracking-[0.2em] text-background transition-all duration-300 hover:border-background hover:bg-background/10"
          >
            Lavora con noi
          </a>
        </motion.div>
      </motion.div>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 1 }}
        className="absolute bottom-8 left-1/2"
        style={{ x: "-50%", y: bgY }}
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          className="flex flex-col items-center gap-2"
        >
          <span className="text-[10px] uppercase tracking-[0.2em] text-background/70">
            Scorri
          </span>
          <div className="h-8 w-px bg-background/40" />
        </motion.div>
      </motion.div>
    </section>
  )
}
