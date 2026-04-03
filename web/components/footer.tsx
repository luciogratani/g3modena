import { Mail, Phone } from "lucide-react"
import type { FooterContent } from "@/data/site-content"
import { Logo } from "@/components/logo"
import { navigationLinks } from "@/data/navigation"

const contactIcon = {
  phone: <Phone className="h-3.5 w-3.5" strokeWidth={1.5} />,
  email: <Mail className="h-3.5 w-3.5" strokeWidth={1.5} />,
}

interface FooterProps {
  content: FooterContent
}

export function Footer({ content }: FooterProps) {
  const quickLinks = navigationLinks.filter((link) => link.showInFooter !== false)

  return (
    <footer className="bg-foreground">
      <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8 lg:py-20">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-3 lg:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-1 lg:col-span-2 lg:flex lg:items-start lg:gap-6">
            <div className="flex items-start gap-6 text-primary-foreground/60">
              <Logo
                variant="full"
                className="h-36 w-auto shrink-0 fill-current"
              />
            </div>
          </div>

          {/* Quick Links */}
          <div>
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
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="mb-4 text-[11px] uppercase tracking-[0.2em] text-primary-foreground/60">
              Contatti
            </h4>
            <div className="space-y-3">
              <p className="text-sm text-primary-foreground/50">
                {content.contact.name} — {content.contact.role}
              </p>
              {content.contact.entries.map((entry) => (
                <a
                  key={entry.href}
                  href={entry.href}
                  className="link-luxury flex items-center gap-2 text-sm text-primary-foreground/50 transition-colors hover:text-gold"
                >
                  {contactIcon[entry.type]}
                  {entry.label}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-16 border-t border-primary-foreground/10 pt-6 text-center text-[11px] text-primary-foreground/30">
          <p>{content.legal.address} | P. IVA / Codice Fiscale: {content.legal.vatId}</p>
          <p>{content.legal.companyName}. {new Date().getFullYear()} - Tutti i diritti sono riservati.</p>
        </div>
      </div>
    </footer>
  )
}
