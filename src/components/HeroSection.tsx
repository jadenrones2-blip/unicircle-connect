import { Button } from "@/components/ui/button";
import { ArrowRight, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const HeroSection = () => {
  const scrollToContent = () => {
    const problemSection = document.getElementById("problem");
    problemSection?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="min-h-[85vh] sm:min-h-[90vh] flex flex-col items-center justify-center pt-20 sm:pt-20 pb-16 sm:pb-8 relative overflow-hidden">
      {/* Racing stripe accent */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-40 bg-gradient-to-b from-gold via-gold/40 to-transparent -z-10" />
      <div className="absolute top-1/3 right-[15%] w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-gold/4 rounded-full blur-[120px] sm:blur-[160px] -z-10" />

      <div className="container mx-auto px-5 sm:px-6 flex-1 flex items-center">
        <div className="max-w-4xl mx-auto text-center">
          {/* Beta badge */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-gold/30 bg-gold/5 mb-6"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
            <span className="text-xs font-semibold text-gold tracking-[0.15em] uppercase">Beta</span>
          </motion.div>

          {/* Main headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.05] mb-5 sm:mb-7 text-foreground"
          >
            Recruitment infrastructure
            <br />
            <span className="text-gold">for student organizations.</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="text-base sm:text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto mb-10 sm:mb-12 px-2 sm:px-0"
          >
            A structured system for managing intake, evaluation, and transparent applicant tracking — built for scale.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-6 sm:mb-8 px-4 sm:px-0"
          >
            <Button variant="gold" size="lg" className="group px-10 w-full sm:w-auto" asChild>
              <Link to="/clubs">
                Claim your club
                <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="group w-full sm:w-auto" onClick={scrollToContent}>
              See how it works
              <ChevronDown className="w-4 h-4 ml-1 group-hover:translate-y-0.5 transition-transform" />
            </Button>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="text-sm text-muted-foreground tracking-wide"
          >
            Currently available at UC San Diego.
          </motion.p>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.5 }}
        className="hidden sm:flex absolute bottom-8 left-1/2 -translate-x-1/2 flex-col items-center gap-2 cursor-pointer"
        onClick={scrollToContent}
      >
        <span className="text-xs font-semibold text-muted-foreground tracking-[0.2em] uppercase">Scroll</span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="w-px h-8 bg-gradient-to-b from-gold to-transparent"
        />
      </motion.div>
    </section>
  );
};

export default HeroSection;
