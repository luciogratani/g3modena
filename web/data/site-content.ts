export type HeroMediaType = "image" | "video"

export interface HeroMedia {
  type: HeroMediaType
  src: string
  poster?: string
}

export interface HeroContent {
  media: HeroMedia
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

export interface AboutContent {
  label: string
  title: string
  paragraphs: string[]
  image: {
    src: string
    alt: string
  }
}

export interface ClientItem {
  name: string
  location: string
}

export interface ClientsContent {
  label: string
  title: string
  items: ClientItem[]
}

export type WhyG3IconKey = "clock" | "crown" | "users" | "shield-check"

export interface WhyG3Reason {
  icon: WhyG3IconKey
  title: string
  description: string
}

export interface WhyG3Content {
  label: string
  title: string
  reasons: WhyG3Reason[]
}

export interface ContactEntry {
  type: "phone" | "email"
  label: string
  href: string
}

export interface FooterContent {
  contact: {
    name: string
    role: string
    entries: ContactEntry[]
  }
  legal: {
    companyName: string
    address: string
    vatId: string
  }
}

export interface SectionToggle {
  enabled: boolean
}

export interface SeoContent {
  metaTitle: string
  metaDescription: string
  canonicalUrl: string
  ogTitle: string
  ogDescription: string
  ogImageUrl: string
  robotsIndex: boolean
  robotsFollow: boolean
}

export interface SiteContent {
  hero: HeroContent
  about: AboutContent
  clients: ClientsContent
  whyG3: WhyG3Content
  footer: FooterContent
  seo: SeoContent
  sections: {
    contactForm: SectionToggle
    careersForm: SectionToggle
  }
}

/**
 * NOTE multi-tenant (Supabase):
 * unico database condiviso tra clienti, separazione logica per schema cliente.
 * Questo file resta l'adapter/fallback locale, mentre in produzione i dati
 * andranno risolti da query per tenant + sezione.
 */
export const siteContent: SiteContent = {
  hero: {
    media: {
      type: "video",
      src: "/hero-rubamatic.mp4",
      poster: "/images/hero.jpg",
    },
    title: "Il nostro team. Il vostro stile.",
    subtitle: "Direzione di sala e servizio premium per catering di alto livello",
    primaryCta: {
      label: "Richiedi un incontro",
      href: "#contact",
    },
    secondaryCta: {
      label: "Lavora con noi",
      href: "#careers",
    },
  },
  about: {
    label: "Chi siamo",
    title: "Eccellenza dal 2010 nel servizio di sala",
    paragraphs: [
      "Dal 2010, con sede a Modena, G3 opera nel settore del catering, specializzandosi nella direzione di sala e nel servizio premium al tavolo per la clientela piu esigente.",
      "Portiamo a ogni evento una pianificazione del servizio accurata e strutturata, dalle cene intime alle grandi celebrazioni, operando in Italia centrale e settentrionale, oltre che in Sardegna.",
      "La nostra forza e il nostro team giovane e affiatato di studenti universitari, unito da un impegno condiviso verso lavoro di squadra, precisione ed esecuzione impeccabile.",
    ],
    image: {
      src: "/images/about.jpg",
      alt: "Elegante servizio di sala",
    },
  },
  clients: {
    label: "Clienti selezionati",
    title: "La fiducia dei migliori",
    items: [
      { name: "Massimo Bottura", location: "Casa Maria Luigia, Modena" },
      { name: "Domenico Stile", location: "Enoteca La Torre, Roma" },
      { name: "Alajmo Group", location: "Padova" },
      { name: "ALMA", location: "Scuola Int. di Cucina Italiana, Parma" },
      { name: "Zerobriciole", location: "Milano" },
      { name: "Viola Morlino", location: "Milano" },
      { name: "Roots", location: "Modena" },
      { name: "AKitchen", location: "Sassari" },
      { name: "Tavola della Signoria", location: "Bologna" },
    ],
  },
  whyG3: {
    label: "Perche G3",
    title: "Lo standard del servizio",
    reasons: [
      {
        icon: "clock",
        title: "Eccellenza dal 2010",
        description:
          "Dal 2010 offriamo esperienza consolidata nel servizio di sala di alto livello e nella gestione eventi.",
      },
      {
        icon: "crown",
        title: "Direzione professionale",
        description:
          "Una direzione di sala esperta che garantisce che ogni dettaglio rispetti i piu alti standard dell'ospitalita di lusso.",
      },
      {
        icon: "users",
        title: "Team qualificato",
        description:
          "Professionisti selezionati e formati con cura, capaci di unire eleganza, precisione e attenzione al dettaglio.",
      },
      {
        icon: "shield-check",
        title: "Eccellenza operativa",
        description:
          "Pianificazione strutturata e alti standard operativi garantiscono un'esperienza fluida e impeccabile.",
      },
    ],
  },
  footer: {
    contact: {
      name: "Lino Salemme",
      role: "Amministratore unico",
      entries: [
        { type: "phone", label: "+39 349 1767260", href: "tel:+393491767260" },
        { type: "email", label: "info@g3modena.com", href: "mailto:info@g3modena.com" },
        { type: "email", label: "mediterraneo@g3modena.com", href: "mailto:mediterraneo@g3modena.com" },
      ],
    },
    legal: {
      companyName: "G3 Waiters & Experience per La Vela SRL",
      address: "Viale dell'Industria 23/A - 35129 Padova",
      vatId: "05640030283",
    },
  },
  seo: {
    metaTitle: "G3 - Waiters & Experience",
    metaDescription:
      "Direzione di sala e servizio premium per catering di alto livello. Oltre 20 anni di esperienza in Italia centrale, settentrionale e in Sardegna.",
    canonicalUrl: "",
    ogTitle: "G3 - Waiters & Experience",
    ogDescription:
      "Direzione di sala e servizio premium per catering di alto livello.",
    ogImageUrl: "/images/hero.jpg",
    robotsIndex: true,
    robotsFollow: true,
  },
  sections: {
    contactForm: { enabled: true },
    careersForm: { enabled: true },
  },
}
