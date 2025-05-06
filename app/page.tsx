import HeroSection from "@/components/landing/hero-section"
import FeaturesSection from "@/components/landing/features-section"
import ArchitectureSection from "@/components/landing/architecture-section"
import UseCasesSection from "@/components/landing/use-cases-section"
import CTASection from "@/components/landing/cta-section"
import FooterSection from "@/components/landing/footer-section"
import { Suspense } from "react"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white overflow-hidden">
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center bg-gray-950">
            <div className="h-8 w-8 rounded-full border-4 border-t-green-400 border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
          </div>
        }
      >
        <HeroSection />
      </Suspense>

      <Suspense
        fallback={
          <div className="py-24 bg-gray-950 flex items-center justify-center">
            <div className="h-8 w-8 rounded-full border-4 border-t-green-400 border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
          </div>
        }
      >
        <FeaturesSection />
      </Suspense>

      <Suspense
        fallback={
          <div className="py-24 bg-gray-950 flex items-center justify-center">
            <div className="h-8 w-8 rounded-full border-4 border-t-green-400 border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
          </div>
        }
      >
        <ArchitectureSection />
      </Suspense>

      <Suspense
        fallback={
          <div className="py-24 bg-gray-950 flex items-center justify-center">
            <div className="h-8 w-8 rounded-full border-4 border-t-green-400 border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
          </div>
        }
      >
        <UseCasesSection />
      </Suspense>

      <Suspense
        fallback={
          <div className="py-24 bg-gray-950 flex items-center justify-center">
            <div className="h-8 w-8 rounded-full border-4 border-t-green-400 border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
          </div>
        }
      >
        <CTASection />
      </Suspense>

      <Suspense
        fallback={
          <div className="py-12 bg-gray-950 flex items-center justify-center">
            <div className="h-8 w-8 rounded-full border-4 border-t-green-400 border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
          </div>
        }
      >
        <FooterSection />
      </Suspense>
    </div>
  )
}
