import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import ProblemSection from "@/components/ProblemSection";
import HowItWorksSection from "@/components/HowItWorksSection";
import WhyUnicircleSection from "@/components/WhyUnicircleSection";
import FAQSection from "@/components/FAQSection";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <main className="min-h-screen bg-background overflow-x-hidden">
      <Header />
      <HeroSection />
      <ProblemSection />
      <HowItWorksSection />
      <WhyUnicircleSection />
      <FAQSection />
      <CTASection />
      <Footer />
    </main>
  );
};

export default Index;
