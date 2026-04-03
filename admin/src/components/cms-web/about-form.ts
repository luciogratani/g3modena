import { asRecord, asString } from "./shared-form-utils"

export type AboutFormState = {
  label: string
  title: string
  paragraph1: string
  paragraph2: string
  paragraph3: string
  imageSrc: string
  imageAlt: string
}

export const ABOUT_FORM_DEFAULTS: AboutFormState = {
  label: "Chi siamo",
  title: "Eccellenza dal 2010 nel servizio di sala",
  paragraph1: "",
  paragraph2: "",
  paragraph3: "",
  imageSrc: "/images/about.jpg",
  imageAlt: "Elegante servizio di sala",
}

export function aboutFormFromContent(content: unknown): AboutFormState {
  const root = asRecord(content)
  if (!root) return { ...ABOUT_FORM_DEFAULTS }
  const image = asRecord(root.image) ?? {}
  const paragraphs = Array.isArray(root.paragraphs)
    ? root.paragraphs.filter((item): item is string => typeof item === "string")
    : []

  return {
    label: asString(root.label, ABOUT_FORM_DEFAULTS.label),
    title: asString(root.title, ABOUT_FORM_DEFAULTS.title),
    paragraph1: asString(paragraphs[0], ABOUT_FORM_DEFAULTS.paragraph1),
    paragraph2: asString(paragraphs[1], ABOUT_FORM_DEFAULTS.paragraph2),
    paragraph3: asString(paragraphs[2], ABOUT_FORM_DEFAULTS.paragraph3),
    imageSrc: asString(image.src, ABOUT_FORM_DEFAULTS.imageSrc),
    imageAlt: asString(image.alt, ABOUT_FORM_DEFAULTS.imageAlt),
  }
}

export function aboutFormToContent(state: AboutFormState): Record<string, unknown> {
  return {
    label: state.label.trim(),
    title: state.title.trim(),
    paragraphs: [state.paragraph1.trim(), state.paragraph2.trim(), state.paragraph3.trim()].filter(Boolean),
    image: {
      src: state.imageSrc.trim(),
      alt: state.imageAlt.trim(),
    },
  }
}

export function validateAboutForm(state: AboutFormState): string[] {
  const errors: string[] = []
  if (!state.label.trim()) errors.push("Inserisci etichetta sezione.")
  if (!state.title.trim()) errors.push("Inserisci titolo sezione.")
  if (!state.imageSrc.trim()) errors.push("Inserisci immagine principale.")
  if (!state.imageAlt.trim()) errors.push("Inserisci testo alternativo immagine.")
  return errors
}

