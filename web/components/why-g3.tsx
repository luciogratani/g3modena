import { motion } from "framer-motion"
import { fadeInUp, luxuryEase } from "@/lib/animations"
import { AnimatedSection, staggerChildVariants } from "@/components/animated-section"
import { HeadlineReveal } from "@/components/headline-reveal"
import { Clock, Crown, Users, ShieldCheck } from "lucide-react"
import type { WhyG3Content, WhyG3IconKey } from "@/data/site-content"

interface WhyG3Props {
  content: WhyG3Content
}

const iconByKey: Record<WhyG3IconKey, React.ReactNode> = {
  clock: <Clock className="h-6 w-6" strokeWidth={1} />,
  crown: <Crown className="h-6 w-6" strokeWidth={1} />,
  users: <Users className="h-6 w-6" strokeWidth={1} />,
  "shield-check": <ShieldCheck className="h-6 w-6" strokeWidth={1} />,
}

export function WhyG3({ content }: WhyG3Props) {
  return (
    <section id="why-g3" className="bg-foreground py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section Header */}
        <HeadlineReveal
          label={content.label}
          heading={
            <h2 className="mt-4 font-serif text-3xl font-light tracking-wide text-primary-foreground sm:text-4xl text-balance">
              {content.title}
            </h2>
          }
          className="mb-16 max-w-xl"
        />

        {/* Cards */}
        <AnimatedSection stagger viewportAmount={0.2}>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {content.reasons.map((reason) => (
              <motion.div
                key={reason.title}
                variants={staggerChildVariants}
                className="group"
              >
                <div className="mb-5 text-gold">{iconByKey[reason.icon]}</div>
                <motion.div
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, ease: luxuryEase, delay: 0.2 }}
                  className="mb-4 h-px w-8 bg-primary-foreground/15"
                  style={{ originX: 0 }}
                />
                <h3 className="font-serif text-lg font-light tracking-wide text-primary-foreground">
                  {reason.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-primary-foreground/60">
                  {reason.description}
                </p>
              </motion.div>
            ))}
          </div>
        </AnimatedSection>
      </div>
    </section>
  )
}
