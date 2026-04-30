export const CTA_KEYS = {
  NAV_LOGO_HOME: "nav_logo_home",
  NAV_ANCHOR_ABOUT: "nav_anchor_about",
  NAV_ANCHOR_CLIENTS: "nav_anchor_clients",
  NAV_ANCHOR_WHY_G3: "nav_anchor_why_g3",
  NAV_ANCHOR_CONTACT: "nav_anchor_contact",
  NAV_ANCHOR_CAREERS: "nav_anchor_careers",
  HERO_PRIMARY_CONTACT: "hero_primary_contact",
  HERO_SECONDARY_CAREERS: "hero_secondary_careers",
  FOOTER_QUICK_ABOUT: "footer_quick_about",
  FOOTER_QUICK_CLIENTS: "footer_quick_clients",
  FOOTER_QUICK_CONTACT: "footer_quick_contact",
  FOOTER_QUICK_CAREERS: "footer_quick_careers",
  FOOTER_TEL_PRIMARY: "footer_tel_primary",
  FOOTER_MAIL_INFO: "footer_mail_info",
  FOOTER_MAIL_MEDITERRANEO: "footer_mail_mediterraneo",
} as const

export type CtaKey = (typeof CTA_KEYS)[keyof typeof CTA_KEYS]

const NAV_ANCHOR_CTA_KEYS_BY_HREF: Record<string, CtaKey> = {
  "#about": CTA_KEYS.NAV_ANCHOR_ABOUT,
  "#clients": CTA_KEYS.NAV_ANCHOR_CLIENTS,
  "#why-g3": CTA_KEYS.NAV_ANCHOR_WHY_G3,
  "#contact": CTA_KEYS.NAV_ANCHOR_CONTACT,
  "#careers": CTA_KEYS.NAV_ANCHOR_CAREERS,
}

const FOOTER_QUICK_CTA_KEYS_BY_HREF: Record<string, CtaKey> = {
  "#about": CTA_KEYS.FOOTER_QUICK_ABOUT,
  "#clients": CTA_KEYS.FOOTER_QUICK_CLIENTS,
  "#contact": CTA_KEYS.FOOTER_QUICK_CONTACT,
  "#careers": CTA_KEYS.FOOTER_QUICK_CAREERS,
}

const FOOTER_CONTACT_CTA_KEYS_BY_HREF: Record<string, CtaKey> = {
  "tel:+393491767260": CTA_KEYS.FOOTER_TEL_PRIMARY,
  "mailto:info@g3modena.com": CTA_KEYS.FOOTER_MAIL_INFO,
  "mailto:mediterraneo@g3modena.com": CTA_KEYS.FOOTER_MAIL_MEDITERRANEO,
}

export function getNavAnchorCtaKeyByHref(href: string): CtaKey | null {
  return NAV_ANCHOR_CTA_KEYS_BY_HREF[href] ?? null
}

export function getFooterQuickCtaKeyByHref(href: string): CtaKey | null {
  return FOOTER_QUICK_CTA_KEYS_BY_HREF[href] ?? null
}

export function getFooterContactCtaKeyByHref(href: string): CtaKey | null {
  return FOOTER_CONTACT_CTA_KEYS_BY_HREF[href] ?? null
}
