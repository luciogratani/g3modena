import { type ReactNode } from "react"
import { motion } from "framer-motion"
import { headlineReveal, paragraphFollow } from "@/lib/animations"

interface HeadlineRevealProps {
  /** The label above the heading (e.g. "About Us") */
  label?: string
  /** Optional heading content */
  heading?: ReactNode
  /** Optional paragraph below */
  paragraph?: string
  /** Additional class names for the wrapper */
  className?: string
  /** Heading class names */
  headingClassName?: string
  /** Paragraph class names */
  paragraphClassName?: string
  /** Label class names */
  labelClassName?: string
  /** Center the text */
  center?: boolean
}

export function HeadlineReveal({
  label,
  heading,
  paragraph,
  className = "",
  headingClassName = "",
  paragraphClassName = "",
  labelClassName = "",
  center = false,
}: HeadlineRevealProps) {
  return (
    <div className={`${center ? "text-center" : ""} ${className}`}>
      {label && (
        <motion.span
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.5 }}
          variants={paragraphFollow}
          className={`mb-4 block text-[11px] uppercase tracking-[0.3em] text-gold ${labelClassName}`}
        >
          {label}
        </motion.span>
      )}
      {heading && (
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.5 }}
          variants={headlineReveal}
          className={headingClassName}
        >
          {heading}
        </motion.div>
      )}
      {paragraph && (
        <motion.p
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.5 }}
          variants={paragraphFollow}
          className={`mt-4 text-sm text-muted-foreground ${paragraphClassName}`}
        >
          {paragraph}
        </motion.p>
      )}
    </div>
  )
}
