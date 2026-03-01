import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import TextMarquee from "@/components/TextMarquee";
import ProblemSection from "@/components/ProblemSection";
import SolutionSection from "@/components/SolutionSection";
import ProductShowcase from "@/components/ProductShowcase";
import HowItWorksSection from "@/components/HowItWorksSection";
import BenefitsSection from "@/components/BenefitsSection";
import WhyUnicircleSection from "@/components/WhyUnicircleSection";
import FAQSection from "@/components/FAQSection";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";

const tabs = [
  { id: "product", label: "Product" },
  { id: "how", label: "How It Works" },
  { id: "why", label: "Why Us" },
  { id: "faq", label: "FAQ" },
] as const;

type TabId = (typeof tabs)[number]["id"];

const tabContent: Record<TabId, React.FC[]> = {
  product: [ProductShowcase],
  how: [ProblemSection, SolutionSection, HowItWorksSection],
  why: [BenefitsSection, WhyUnicircleSection],
  faq: [FAQSection],
};

const Index = () => {
  const [activeTab, setActiveTab] = useState<TabId>("product");

  return (
    <main className="min-h-screen bg-background overflow-x-hidden">
      <Header />
      <HeroSection />
      <TextMarquee />

      {/* Section tab nav */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border/30">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center gap-1 py-3 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200 whitespace-nowrap ${
                  activeTab === tab.id
                    ? "text-primary-foreground"
                    : "text-muted-foreground hover:text-primary-foreground/70"
                }`}
              >
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="active-tab-pill"
                    className="absolute inset-0 bg-gold rounded-lg"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                  />
                )}
                <span className="relative z-10">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.3 }}
        >
          {tabContent[activeTab].map((Section, i) => (
            <Section key={i} />
          ))}
        </motion.div>
      </AnimatePresence>

      <CTASection />
      <Footer />
    </main>
  );
};

export default Index;
