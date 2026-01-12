import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import HowItWorksSection from "@/components/HowItWorksSection";
import WhyUnicircleSection from "@/components/WhyUnicircleSection";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <main className="min-h-screen bg-background overflow-x-hidden">
      <Header />
      <HeroSection />
      <HowItWorksSection />
      <WhyUnicircleSection />
      <CTASection />
      <Footer />
    </main>
  );
};

export default Index;
