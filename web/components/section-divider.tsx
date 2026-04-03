import { motion } from "framer-motion"
import { dividerScale, luxuryEase } from "@/lib/animations"

interface SectionDividerProps {
  className?: string
  /** Max width of the divider line */
  maxWidth?: string
}

export function SectionDivider({
  className = "",
  maxWidth = "120px",
}: SectionDividerProps) {
  return (
    <div className={`flex justify-center ${className}`}>
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.5 }}
        variants={dividerScale}
        className="h-px bg-gold/50"
        style={{ width: maxWidth, originX: 0, willChange: "transform" }}
      />
    </div>
  )
}
