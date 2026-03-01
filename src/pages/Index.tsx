import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import TextMarquee from "@/components/TextMarquee";
import ProblemSection from "@/components/ProblemSection";
import SolutionSection from "@/components/SolutionSection";
import HowItWorksSection from "@/components/HowItWorksSection";
import BenefitsSection from "@/components/BenefitsSection";
import WhyUnicircleSection from "@/components/WhyUnicircleSection";
import FAQSection from "@/components/FAQSection";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <main className="min-h-screen bg-background overflow-x-hidden">
      <Header />
      <HeroSection />
      <TextMarquee />
      <ProblemSection />
      <SolutionSection />
      <HowItWorksSection />
      <BenefitsSection />
      <WhyUnicircleSection />
      <FAQSection />
      <CTASection />
      <Footer />
    </main>
  );
};

export default Index;
