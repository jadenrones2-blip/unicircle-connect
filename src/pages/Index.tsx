import { useLenis } from "@/hooks/useLenis";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import TextMarquee from "@/components/TextMarquee";
import ProductShowcase from "@/components/ProductShowcase";
import ProblemSection from "@/components/ProblemSection";
import HowItWorksSection from "@/components/HowItWorksSection";
import BenefitsSection from "@/components/BenefitsSection";
import FAQSection from "@/components/FAQSection";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";

const Index = () => {
  useLenis();

  return (
    <main className="min-h-screen bg-background overflow-x-hidden">
      <Header />
      <HeroSection />
      <TextMarquee />
      <ProductShowcase />
      <ProblemSection />
      <HowItWorksSection />
      <BenefitsSection />
      <FAQSection />
      <CTASection />
      <Footer />
    </main>
  );
};

export default Index;
