import { useEffect } from "react"
import { Toaster } from "sonner"
import { Navbar } from "@/components/navbar"
import { Hero } from "@/components/hero"
import { About } from "@/components/about"
import { Clients } from "@/components/clients"
import { WhyG3 } from "@/components/why-g3"
import { ContactForm } from "@/components/contact-form"
import { CareersForm } from "@/components/careers-form"
import { Footer } from "@/components/footer"
import { SectionDivider } from "@/components/section-divider"
import { CustomCursor } from "@/components/custom-cursor"
import { siteContent } from "@/data/site-content"
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

export default function App() {
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
    </>
  )
}
