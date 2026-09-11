import { AccessibilityBar } from "@/components/AccessibilityBar"
import { SiteHeader } from "@/components/SiteHeader"
import { Hero } from "@/components/Hero"
import { ChallengeSolution } from "@/components/ChallengeSolution"
import { FeatureGrid } from "@/components/FeatureGrid"
import { HowItWorks } from "@/components/HowItWorks"
import { TrustSection } from "@/components/TrustSection"
import { Footer } from "@/components/Footer"

export default function Home() {
  return (
    <>
      <AccessibilityBar />
      <SiteHeader />
      <main id="main">
        <Hero />
        <ChallengeSolution />
        <FeatureGrid />
        <HowItWorks />
        <TrustSection />
      </main>
      <Footer />
    </>
  )
}
