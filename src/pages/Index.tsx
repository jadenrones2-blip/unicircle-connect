import { useLenis } from "@/hooks/useLenis";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import TextMarquee from "@/components/TextMarquee";
import ProblemSection from "@/components/ProblemSection";
import ProductShowcase from "@/components/ProductShowcase";
import HowItWorksSection from "@/components/HowItWorksSection";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";

const Index = () => {
  useLenis();

  return (
    <main className="min-h-screen dark bg-[#0A0A0A] overflow-x-hidden">
      <Header />
      <HeroSection />
      <TextMarquee />
      <ProblemSection />
      <ProductShowcase />
      <HowItWorksSection />
      <CTASection />
      <Footer />
    </main>
  );
};

export default Index;
