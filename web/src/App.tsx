import { useEffect, useState } from "react"
import { Toaster } from "sonner"
import { Navbar } from "@/components/navbar"
import { Hero } from "@/components/hero"
import { About } from "@/components/about"
import { Clients } from "@/components/clients"
import { WhyG3 } from "@/components/why-g3"
import { ContactForm } from "@/components/contact-form"
import { CareersForm } from "@/components/careers-form"
import { Footer } from "@/components/footer"
import { Logo } from "@/components/logo"
import { SectionDivider } from "@/components/section-divider"
import { CustomCursor } from "@/components/custom-cursor"
import { siteContent } from "@/data/site-content"
import { hasSiteModeRemoteConfig, loadSiteMode, type SiteMode } from "@/data/site-mode"
import { captureCampaignAttributionFromLocation } from "@/lib/campaign-attribution"
import { trackAnalyticsEvent } from "@/lib/analytics"
import { startAnalyticsIngestAdapter } from "@/lib/analytics-ingest"

function SectionGate({
  enabled,
  children,
}: {
  enabled: boolean
  children: React.ReactNode
}) {
  if (enabled) return <>{children}</>
  return (
    <div className="relative select-none pointer-events-none">
      {children}
      <div className="absolute inset-0 bg-foreground/10" />
    </div>
  )
}

function upsertMetaTag(attribute: "name" | "property", key: string, content: string) {
  const selector = `meta[${attribute}="${key}"]`
  let tag = document.head.querySelector(selector) as HTMLMetaElement | null
  if (!tag) {
    tag = document.createElement("meta")
    tag.setAttribute(attribute, key)
    document.head.appendChild(tag)
  }
  tag.setAttribute("content", content)
}

function upsertCanonicalTag(href: string) {
  let tag = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null
  if (!tag) {
    tag = document.createElement("link")
    tag.setAttribute("rel", "canonical")
    document.head.appendChild(tag)
  }
  tag.setAttribute("href", href)
}

function SiteModeLoadingPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
      <div className="flex flex-col items-center gap-4 text-center">
        <Logo variant="mark" className="h-14 w-auto fill-current" decorative />
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
          Caricamento sito
        </p>
      </div>
    </main>
  )
}

function MaintenancePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
      <section className="mx-auto flex max-w-xl flex-col items-center gap-6 text-center">
        <Logo variant="mark" className="h-16 w-auto fill-current text-gold" decorative />
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
          G3 Waiters & Experience
        </p>
        <h1 className="font-serif text-4xl font-light tracking-wide sm:text-5xl">
          Sito in manutenzione
        </h1>
        <p className="text-base leading-relaxed text-muted-foreground">
          Stiamo aggiornando il sito. Torna tra poco per scoprire esperienze,
          servizi e candidature G3.
        </p>
      </section>
    </main>
  )
}

function SiteToaster() {
  return (
    <Toaster
      position="bottom-center"
      toastOptions={{
        style: {
          background: "hsl(var(--foreground))",
          color: "hsl(var(--background))",
          border: "1px solid hsl(var(--gold) / 0.3)",
        },
      }}
    />
  )
}

export default function App() {
  const [siteMode, setSiteMode] = useState<SiteMode>("normal")
  const [siteModeStatus, setSiteModeStatus] = useState<"loading" | "ready">(
    hasSiteModeRemoteConfig ? "loading" : "ready",
  )

  useEffect(() => {
    const seo = siteContent.seo
    document.title = seo.metaTitle
    upsertMetaTag("name", "description", seo.metaDescription)
    upsertMetaTag("name", "robots", `${seo.robotsIndex ? "index" : "noindex"},${seo.robotsFollow ? "follow" : "nofollow"}`)
    upsertMetaTag("property", "og:title", seo.ogTitle)
    upsertMetaTag("property", "og:description", seo.ogDescription)
    upsertMetaTag("property", "og:image", seo.ogImageUrl)
    if (seo.canonicalUrl.trim()) {
      upsertCanonicalTag(seo.canonicalUrl.trim())
    }
  }, [])

  useEffect(() => {
    captureCampaignAttributionFromLocation()
    startAnalyticsIngestAdapter()
    trackAnalyticsEvent({ eventType: "page_view" })
  }, [])

  useEffect(() => {
    if (!hasSiteModeRemoteConfig) return

    let active = true
    loadSiteMode()
      .then((nextSiteMode) => {
        if (!active) return
        setSiteMode(nextSiteMode)
      })
      .finally(() => {
        if (active) setSiteModeStatus("ready")
      })

    return () => {
      active = false
    }
  }, [])

  if (siteModeStatus === "loading") {
    return (
      <>
        <SiteModeLoadingPage />
        <CustomCursor />
        <SiteToaster />
      </>
    )
  }

  if (siteMode === "maintenance") {
    return (
      <>
        <MaintenancePage />
        <CustomCursor />
        <SiteToaster />
      </>
    )
  }

  if (siteMode === "careers_only") {
    return (
      <>
        <main className="min-h-screen bg-card">
          <CareersForm />
        </main>
        <CustomCursor />
        <SiteToaster />
      </>
    )
  }

  return (
    <>
      <main>
        <Navbar />
        <Hero content={siteContent.hero} />
        <SectionDivider className="py-4" maxWidth="120px" />
        <About content={siteContent.about} />
        <SectionDivider className="py-4" maxWidth="80px" />
        <Clients content={siteContent.clients} />
        <SectionDivider className="py-4" maxWidth="100px" />
        <WhyG3 content={siteContent.whyG3} />
        <SectionGate enabled={siteContent.sections.contactForm.enabled}>
          <SectionDivider className="py-4" maxWidth="80px" />
          <ContactForm />
        </SectionGate>
        <SectionGate enabled={siteContent.sections.careersForm.enabled}>
          <SectionDivider className="py-4" maxWidth="60px" />
          <CareersForm />
        </SectionGate>
        <Footer content={siteContent.footer} />
      </main>
      <CustomCursor />
      <SiteToaster />
    </>
  )
}
