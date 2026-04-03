import { asBoolean, asRecord } from "./shared-form-utils"

export type SectionsFormState = {
  contactFormEnabled: boolean
  careersFormEnabled: boolean
}

export const SECTIONS_FORM_DEFAULTS: SectionsFormState = {
  contactFormEnabled: true,
  careersFormEnabled: true,
}

export function sectionsFormFromContent(content: unknown): SectionsFormState {
  const root = asRecord(content)
  if (!root) return { ...SECTIONS_FORM_DEFAULTS }
  const contactForm = asRecord(root.contactForm) ?? {}
  const careersForm = asRecord(root.careersForm) ?? {}
  return {
    contactFormEnabled: asBoolean(contactForm.enabled, SECTIONS_FORM_DEFAULTS.contactFormEnabled),
    careersFormEnabled: asBoolean(careersForm.enabled, SECTIONS_FORM_DEFAULTS.careersFormEnabled),
  }
}

export function sectionsFormToContent(state: SectionsFormState): Record<string, unknown> {
  return {
    contactForm: { enabled: state.contactFormEnabled },
    careersForm: { enabled: state.careersFormEnabled },
  }
}

export function validateSectionsForm(): string[] {
  return []
}

