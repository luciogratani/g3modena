import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Menu, X } from "lucide-react"
import { Logo } from "@/components/logo"
import { navigationLinks } from "@/data/navigation"
import { useIsMobile } from "@/hooks/use-mobile"

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const isMobile = useIsMobile()

  const scrollToSectionCentered = (href: string) => {
    if (typeof window === "undefined") return
    if (!href.startsWith("#")) return

    const target = document.querySelector<HTMLElement>(href)
    if (!target) return

    const rect = target.getBoundingClientRect()
    const absoluteTop = rect.top + window.scrollY
    const navHeight =
      document.querySelector<HTMLElement>("nav")?.getBoundingClientRect().height ??
      0
    const centeredTop =
      absoluteTop - (window.innerHeight - rect.height) / 2 - navHeight / 2
    const maxTop = Math.max(
      0,
      document.documentElement.scrollHeight - window.innerHeight
    )
    const nextTop = Math.min(Math.max(0, centeredTop), maxTop)

    window.scrollTo({ top: nextTop, behavior: "smooth" })
  }

  const handleDesktopNavClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    href: string
  ) => {
    if (!isMobile) {
      e.preventDefault()
      scrollToSectionCentered(href)
    }
  }

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  useEffect(() => {
    if (!mobileOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpen(false)
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [mobileOpen])

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-background/95 backdrop-blur-md border-b border-border/50"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
        <a
          href="#"
          aria-label="G3 Waiters & Experience"
          className={`transition-colors duration-500 ${
            scrolled ? "text-foreground" : "text-background"
          }`}
        >
          <Logo variant="mark" className="h-10 w-auto fill-current" decorative />
        </a>

        {/* Desktop Nav */}
        <div className="hidden items-center gap-8 md:flex">
          {navigationLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={(e) => handleDesktopNavClick(e, link.href)}
              className={`link-luxury text-xs uppercase tracking-[0.15em] transition-colors duration-300 hover:text-gold ${
                scrolled ? "text-foreground" : "text-background/90"
              }`}
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Mobile Toggle */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className={`md:hidden transition-colors duration-500 ${
            scrolled ? "text-foreground" : "text-background"
          }`}
          aria-label={mobileOpen ? "Chiudi menu" : "Apri menu"}
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav-menu"
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            id="mobile-nav-menu"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-b border-border/50 bg-background/98 backdrop-blur-md md:hidden"
          >
            <div className="flex flex-col gap-4 px-6 py-6">
              {navigationLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="link-luxury text-xs uppercase tracking-[0.15em] text-foreground transition-colors hover:text-gold"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  )
}
