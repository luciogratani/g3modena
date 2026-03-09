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

export default function App() {
  return (
    <>
      <main>
        <Navbar />
        <Hero />
        <SectionDivider className="py-4" maxWidth="120px" />
        <About />
        <SectionDivider className="py-4" maxWidth="80px" />
        <Clients />
        <SectionDivider className="py-4" maxWidth="100px" />
        <WhyG3 />
        <SectionDivider className="py-4" maxWidth="80px" />
        <ContactForm />
        <SectionDivider className="py-4" maxWidth="60px" />
        <CareersForm />
        <Footer />
      </main>
      <CustomCursor />
      <Toaster
        position="bottom-center"
        toastOptions={{
          style: {
            background: "hsl(0 0% 6%)",
            color: "hsl(40 20% 98%)",
            border: "1px solid hsl(40 55% 50% / 0.3)",
          },
        }}
      />
    </>
  )
}
