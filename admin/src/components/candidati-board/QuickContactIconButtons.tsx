import { Mail, MessageCircle, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { toWhatsAppNumber } from "@/src/components/candidati-board/candidate-utils"

type QuickContactIconButtonsProps = {
  phone?: string
  email?: string
  className?: string
}

/**
 * Icon-only call / WhatsApp / email (tel: / wa.me / mailto:), aligned with CandidateCard context menu.
 */
export function QuickContactIconButtons({ phone, email, className }: QuickContactIconButtonsProps) {
  const hasPhone = Boolean(phone?.trim())
  const hasEmail = Boolean(email?.trim())
  const telHref = hasPhone ? `tel:${phone!.trim()}` : undefined
  const whatsappHref = hasPhone ? `https://wa.me/${toWhatsAppNumber(phone!)}` : undefined
  const mailHref = hasEmail ? `mailto:${email!.trim()}` : undefined

  return (
    <div className={cn("flex shrink-0 items-center gap-1", className)}>
      <Tooltip>
        <TooltipTrigger asChild>
          {telHref ? (
            <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" asChild>
              <a href={telHref} aria-label="Chiama">
                <Phone />
              </a>
            </Button>
          ) : (
            <Button type="button" variant="outline" size="icon" className="h-8 w-8 shrink-0" disabled aria-label="Telefono non disponibile">
              <Phone />
            </Button>
          )}
        </TooltipTrigger>
        <TooltipContent side="top">{telHref ? "Chiama" : "Telefono non inserito"}</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          {whatsappHref ? (
            <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" asChild>
              <a href={whatsappHref} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
                <MessageCircle />
              </a>
            </Button>
          ) : (
            <Button type="button" variant="outline" size="icon" className="h-8 w-8 shrink-0" disabled aria-label="WhatsApp non disponibile">
              <MessageCircle />
            </Button>
          )}
        </TooltipTrigger>
        <TooltipContent side="top">{whatsappHref ? "WhatsApp" : "Telefono non inserito"}</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          {mailHref ? (
            <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" asChild>
              <a href={mailHref} aria-label="Invia email">
                <Mail />
              </a>
            </Button>
          ) : (
            <Button type="button" variant="outline" size="icon" className="h-8 w-8 shrink-0" disabled aria-label="Email non disponibile">
              <Mail />
            </Button>
          )}
        </TooltipTrigger>
        <TooltipContent side="top">{mailHref ? "Email" : "Email non inserita"}</TooltipContent>
      </Tooltip>
    </div>
  )
}
