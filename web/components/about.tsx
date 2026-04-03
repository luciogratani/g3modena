import { motion } from "framer-motion"
import { slideInLeft, slideInRight, luxuryEase } from "@/lib/animations"
import { HeadlineReveal } from "@/components/headline-reveal"
import type { AboutContent } from "@/data/site-content"

interface AboutProps {
  content: AboutContent
}

export function About({ content }: AboutProps) {
  return (
    <section id="about" className="bg-background py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section Label */}
        <HeadlineReveal label={content.label} className="mb-16" />

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
              {content.title}
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
              {content.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
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
              src={content.image.src}
              alt={content.image.alt}
              className="absolute inset-0 h-full w-full object-cover"
            />
          </motion.div>
        </div>
      </div>
    </section>
  )
}
