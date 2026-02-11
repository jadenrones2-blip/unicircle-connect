import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import ProblemSection from "@/components/ProblemSection";
import HowItWorksSection from "@/components/HowItWorksSection";
import RecruitmentSection from "@/components/RecruitmentSection";
import WhyUnicircleSection from "@/components/WhyUnicircleSection";
import FAQSection from "@/components/FAQSection";
import SurveySection from "@/components/SurveySection";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <main className="min-h-screen bg-background overflow-x-hidden">
      <Header />
      <HeroSection />
      <ProblemSection />
      <HowItWorksSection />
      <RecruitmentSection />
      <WhyUnicircleSection />
      <FAQSection />
      <SurveySection />
      <CTASection />
      <Footer />
    </main>
  );
};

export default Index;
