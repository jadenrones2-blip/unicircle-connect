import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import AnimatedWords from "./AnimatedWords";
import pipelineScreenshot from "@/assets/showcase/pipeline-screenshot.png";
import analyticsScreenshot from "@/assets/showcase/analytics-screenshot.png";
import applicantScreenshot from "@/assets/showcase/applicant-screenshot.png";

const tabs = [
  { 
    id: "pipeline", 
    label: "Recruitment Pipeline", 
    description: "Drag-and-drop applicants through custom stages. Score, review, and decide — all in one view.",
    image: pipelineScreenshot,
  },
  { 
    id: "analytics", 
    label: "Analytics Dashboard", 
    description: "Track applications, acceptance rates, and scoring trends across recruitment cycles.",
    image: analyticsScreenshot,
  },
  { 
    id: "applicant", 
    label: "Applicant View", 
    description: "Students see real-time status, progress bars, and timeline updates for every application.",
    image: applicantScreenshot,
  },
];

const ProductShowcase = () => {
  const [activeTab, setActiveTab] = useState("pipeline");
  const { playClick } = useSoundEffects();

  const activeTabData = tabs.find(t => t.id === activeTab);

  return (
    <section className="py-16 md:py-24 bg-primary text-primary-foreground relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-32 bg-gradient-to-b from-transparent via-gold/20 to-transparent" />

      <div className="container mx-auto px-4 md:px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-10 md:mb-12"
          >
            <span className="text-gold text-sm font-medium tracking-wide uppercase mb-4 block">
              Product
            </span>
            <AnimatedWords
              text="See it in action."
              as="h2"
              className="font-display text-3xl md:text-5xl font-semibold text-primary-foreground mb-4"
              goldWords={["action."]}
            />
            <p className="text-primary-foreground/50 text-base max-w-lg mx-auto">
              Built for clubs that take recruitment seriously.
            </p>
          </motion.div>

          {/* Tab switcher */}
          <div className="flex justify-center mb-6 md:mb-8 gap-1 p-1 rounded-xl bg-primary-foreground/5 border border-border/20 max-w-fit mx-auto overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); playClick(); }}
                className={`px-3 md:px-4 py-2 rounded-lg text-[10px] md:text-xs font-semibold tracking-wide transition-all duration-200 whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-gold text-primary shadow-md"
                    : "text-primary-foreground/50 hover:text-primary-foreground/80"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Description */}
          <AnimatePresence mode="wait">
            <motion.p
              key={activeTab}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="text-center text-sm text-primary-foreground/50 mb-6 md:mb-8 max-w-md mx-auto"
            >
              {activeTabData?.description}
            </motion.p>
          </AnimatePresence>

          {/* Screenshot with browser chrome */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`mockup-${activeTab}`}
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ duration: 0.4 }}
              className="max-w-4xl mx-auto"
            >
              <div className="rounded-xl border border-border/30 overflow-hidden shadow-2xl bg-primary">
                {/* Browser chrome */}
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/20 bg-primary/80">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-destructive/60" />
                    <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-gold/60" />
                    <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-emerald-500/60" />
                  </div>
                  <div className="flex-1 flex justify-center">
                    <div className="px-3 md:px-4 py-0.5 md:py-1 rounded-md bg-primary-foreground/5 text-[9px] md:text-[10px] text-primary-foreground/40 font-mono">
                      {activeTab === "pipeline" && "unicircle.app/admin/recruitment"}
                      {activeTab === "analytics" && "unicircle.app/admin/analytics"}
                      {activeTab === "applicant" && "unicircle.app/dashboard"}
                    </div>
                  </div>
                </div>

                {/* Screenshot image */}
                <div className="relative overflow-hidden">
                  <img
                    src={activeTabData?.image}
                    alt={`${activeTabData?.label} screenshot`}
                    className="w-full h-auto block"
                    loading="lazy"
                  />
                  {/* Subtle gradient overlay at bottom for polish */}
                  <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-primary/40 to-transparent pointer-events-none" />
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
};

export default ProductShowcase;
