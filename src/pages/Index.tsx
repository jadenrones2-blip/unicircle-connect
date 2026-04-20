import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLenis } from "@/hooks/useLenis";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import TextMarquee from "@/components/TextMarquee";
import ProblemSection from "@/components/ProblemSection";
import ProductShowcase from "@/components/ProductShowcase";
import HowItWorksSection from "@/components/HowItWorksSection";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";
import StatsSection from "@/components/StatsSection";

const Index = () => {
  useLenis();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, loading, navigate]);

  return (
    <main className="min-h-screen dark bg-[#0A0A0A] overflow-x-hidden">
      <Header />
      <HeroSection />
      <StatsSection />
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
