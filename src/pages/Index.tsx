import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import ProblemSection from "@/components/ProblemSection";
import SolutionSection from "@/components/SolutionSection";
import BenefitsSection from "@/components/BenefitsSection";
import HowItWorksSection from "@/components/HowItWorksSection";
import UIPreviewSection from "@/components/UIPreviewSection";
import FAQSection from "@/components/FAQSection";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <main className="min-h-screen bg-background overflow-x-hidden">
      <Header />
      <HeroSection />
      <ProblemSection />
      <SolutionSection />
      <UIPreviewSection />
      <BenefitsSection />
      <HowItWorksSection />
      <FAQSection />
      <CTASection />
      <Footer />
    </main>
  );
};

export default Index;