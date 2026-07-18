import { HeroSection } from "@/components/landing/HeroSection";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { LiveStatsActivity } from "@/components/landing/LiveStatsActivity";
import { TrustBentoGrid } from "@/components/landing/TrustBentoGrid";
import { FaqSection } from "@/components/landing/FaqSection";

export default function LandingPage() {
  return (
    <div className="relative flex flex-col w-full overflow-hidden bg-grid-pattern">
      {/* Ambient background glows */}
      <div className="absolute top-0 left-1/4 -z-10 h-[500px] w-[500px] rounded-full bg-white/[0.03] opacity-60 blur-[140px] pointer-events-none" />
      <div className="absolute top-[25%] right-1/10 -z-10 h-[450px] w-[450px] rounded-full bg-white/[0.03] opacity-50 blur-[135px] pointer-events-none" />
      <div className="absolute top-[55%] left-1/10 -z-10 h-[500px] w-[500px] rounded-full bg-white/[0.02] opacity-40 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[10%] right-1/4 -z-10 h-[480px] w-[480px] rounded-full bg-white/[0.02] opacity-50 blur-[130px] pointer-events-none" />
      <HeroSection />
      <LiveStatsActivity />
      <TrustBentoGrid />
      <HowItWorks />
      <FaqSection />
    </div>
  );
}
