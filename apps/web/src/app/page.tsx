import { HeroSection } from "@/components/landing/HeroSection";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { LiveStatsActivity } from "@/components/landing/LiveStatsActivity";
import { TrustBentoGrid } from "@/components/landing/TrustBentoGrid";
import { FaqSection } from "@/components/landing/FaqSection";

export default function LandingPage() {
  return (
    <div className="flex flex-col w-full">
      <HeroSection />
      <LiveStatsActivity />
      <TrustBentoGrid />
      <HowItWorks />
      <FaqSection />
    </div>
  );
}
