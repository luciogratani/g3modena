export const formClassNames = {
  input:
    "peer w-full border-b border-border bg-transparent px-0 pb-2 pt-6 text-sm text-foreground placeholder:text-transparent outline-none transition-[border-color,box-shadow,color] duration-300 focus:border-gold focus:shadow-[0_10px_30px_-24px_hsl(var(--gold)/0.85)]",
  floatingLabel:
    "pointer-events-none absolute left-0 top-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground/70 transition-all duration-300 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] peer-placeholder-shown:top-6 peer-placeholder-shown:text-sm peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-placeholder-shown:text-muted-foreground/55 peer-focus:top-1 peer-focus:text-[11px] peer-focus:uppercase peer-focus:tracking-[0.2em] peer-focus:text-gold",
  error: "mt-1 text-[11px] text-destructive/85 transition-all duration-300",
  radioCard:
    "inline-flex cursor-pointer items-center justify-center border border-border px-4 py-2 text-xs uppercase tracking-[0.15em] text-muted-foreground transition-all duration-300 hover:border-gold hover:text-foreground",
  radioCardActive:
    "border-gold text-foreground shadow-[0_10px_30px_-24px_hsl(var(--gold)/0.85)]",
} as const

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}
