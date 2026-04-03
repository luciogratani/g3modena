import { type ReactNode } from "react"
import { motion } from "framer-motion"
import { luxuryEase } from "@/lib/animations"

interface AnimatedSectionProps {
  children: ReactNode
  className?: string
  /** Enable staggered children animation */
  stagger?: boolean
  /** Custom viewport amount, default 0.3 */
  viewportAmount?: number
  /** HTML element to render as, default "div" */
  as?: "div" | "section" | "footer"
}

const containerVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      ease: luxuryEase,
    },
  },
}

const staggerContainerVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      ease: luxuryEase,
      staggerChildren: 0.12,
    },
  },
}

export const staggerChildVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: luxuryEase },
  },
}

export function AnimatedSection({
  children,
  className,
  stagger = false,
  viewportAmount = 0.3,
  as = "div",
}: AnimatedSectionProps) {
  const Component =
    as === "section" ? motion.section : as === "footer" ? motion.footer : motion.div

  return (
    <Component
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: viewportAmount }}
      variants={stagger ? staggerContainerVariants : containerVariants}
      className={className}
      style={{ willChange: "opacity, transform" }}
    >
      {children}
    </Component>
  )
}
