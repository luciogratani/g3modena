import { asRecord, asString, isValidHref } from "./shared-form-utils"

export type HeroMediaType = "image" | "video"

export type HeroContentPayload = {
  media: {
    type: HeroMediaType
    src: string
    poster?: string
  }
  title: string
  subtitle: string
  primaryCta: {
    label: string
    href: string
  }
  secondaryCta: {
    label: string
    href: string
  }
}

export type HeroFormState = {
  title: string
  subtitle: string
  mediaType: HeroMediaType
  mediaSrc: string
  mediaPoster: string
  primaryCtaLabel: string
  primaryCtaHref: string
  secondaryCtaLabel: string
  secondaryCtaHref: string
}

export const HERO_FORM_DEFAULTS: HeroFormState = {
  title: "Il nostro team. Il vostro stile.",
  subtitle: "Direzione di sala e servizio premium per catering di alto livello",
  mediaType: "video",
  mediaSrc: "/hero-rubamatic.mp4",
  mediaPoster: "/images/hero.jpg",
  primaryCtaLabel: "Richiedi un incontro",
  primaryCtaHref: "#contact",
  secondaryCtaLabel: "Lavora con noi",
  secondaryCtaHref: "#careers",
}

export function heroFormFromContent(content: unknown): HeroFormState {
  const root = asRecord(content)
  if (!root) return { ...HERO_FORM_DEFAULTS }

  const media = asRecord(root.media) ?? {}
  const primaryCta = asRecord(root.primaryCta) ?? {}
  const secondaryCta = asRecord(root.secondaryCta) ?? {}
  const mediaType = media.type === "image" || media.type === "video" ? media.type : HERO_FORM_DEFAULTS.mediaType

  return {
    title: asString(root.title, HERO_FORM_DEFAULTS.title),
    subtitle: asString(root.subtitle, HERO_FORM_DEFAULTS.subtitle),
    mediaType,
    mediaSrc: asString(media.src, HERO_FORM_DEFAULTS.mediaSrc),
    mediaPoster: asString(media.poster, HERO_FORM_DEFAULTS.mediaPoster),
    primaryCtaLabel: asString(primaryCta.label, HERO_FORM_DEFAULTS.primaryCtaLabel),
    primaryCtaHref: asString(primaryCta.href, HERO_FORM_DEFAULTS.primaryCtaHref),
    secondaryCtaLabel: asString(secondaryCta.label, HERO_FORM_DEFAULTS.secondaryCtaLabel),
    secondaryCtaHref: asString(secondaryCta.href, HERO_FORM_DEFAULTS.secondaryCtaHref),
  }
}

export function heroFormToContent(state: HeroFormState): HeroContentPayload {
  return {
    media: {
      type: state.mediaType,
      src: state.mediaSrc.trim(),
      poster: state.mediaType === "video" ? state.mediaPoster.trim() : undefined,
    },
    title: state.title.trim(),
    subtitle: state.subtitle.trim(),
    primaryCta: {
      label: state.primaryCtaLabel.trim(),
      href: state.primaryCtaHref.trim(),
    },
    secondaryCta: {
      label: state.secondaryCtaLabel.trim(),
      href: state.secondaryCtaHref.trim(),
    },
  }
}

export function validateHeroForm(state: HeroFormState): string[] {
  const errors: string[] = []
  if (!state.title.trim()) errors.push("Inserisci un titolo Hero.")
  if (!state.subtitle.trim()) errors.push("Inserisci un sottotitolo Hero.")
  if (!state.mediaSrc.trim()) errors.push("Inserisci URL media.")
  if (state.mediaType === "video" && !state.mediaPoster.trim()) {
    errors.push("Inserisci URL poster per il video.")
  }
  if (!state.primaryCtaLabel.trim()) errors.push("Inserisci testo del bottone principale.")
  if (!state.primaryCtaHref.trim()) errors.push("Inserisci link del bottone principale.")
  if (!state.secondaryCtaLabel.trim()) errors.push("Inserisci testo del bottone secondario.")
  if (!state.secondaryCtaHref.trim()) errors.push("Inserisci link del bottone secondario.")
  if (state.primaryCtaHref.trim() && !isValidHref(state.primaryCtaHref)) {
    errors.push("Link bottone principale non valido. Usa #sezione, /percorso, https://..., mailto: o tel:.")
  }
  if (state.secondaryCtaHref.trim() && !isValidHref(state.secondaryCtaHref)) {
    errors.push("Link bottone secondario non valido. Usa #sezione, /percorso, https://..., mailto: o tel:.")
  }
  return errors
}

