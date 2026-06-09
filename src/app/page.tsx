import { BentoSection } from "@/components/landing/BentoSection";
import { Footer } from "@/components/landing/Footer";
import { Header } from "@/components/landing/Header";
import { HeroParallax } from "@/components/landing/HeroParallax";
import { HeroSection } from "@/components/landing/HeroSection";
import { PrefetchDashboard } from "@/components/landing/PrefetchDashboard";

export default function HomePage() {
  return (
    <>
      <Header />
      <HeroSection />
      <BentoSection />
      <Footer />
      <HeroParallax />
      <PrefetchDashboard />
    </>
  );
}
