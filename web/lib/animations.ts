import type { Variants } from "framer-motion"

/* ─── Shared easing curve ─── */
export const luxuryEase: [number, number, number, number] = [0.22, 1, 0.36, 1]

/* ─── Section reveal (y: 40 → 0) ─── */
export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: luxuryEase },
  },
}

/* ─── Simple opacity fade ─── */
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 1, ease: "easeOut" },
  },
}

/* ─── Stagger container ─── */
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.1,
    },
  },
}

/* ─── Scale in ─── */
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.6, ease: luxuryEase },
  },
}

/* ─── Slide left ─── */
export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -40 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.8, ease: luxuryEase },
  },
}

/* ─── Slide right ─── */
export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 40 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.8, ease: luxuryEase },
  },
}

/* ─── Headline reveal (y: 20 → 0, subtle letter-spacing) ─── */
export const headlineReveal: Variants = {
  hidden: { opacity: 0, y: 20, letterSpacing: "0.08em" },
  visible: {
    opacity: 1,
    y: 0,
    letterSpacing: "0.04em",
    transition: { duration: 0.8, ease: luxuryEase },
  },
}

/* ─── Paragraph follow (delayed after headline) ─── */
export const paragraphFollow: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: luxuryEase, delay: 0.15 },
  },
}

/* ─── Divider line scale ─── */
export const dividerScale: Variants = {
  hidden: { scaleX: 0 },
  visible: {
    scaleX: 1,
    transition: { duration: 1, ease: luxuryEase },
  },
}
