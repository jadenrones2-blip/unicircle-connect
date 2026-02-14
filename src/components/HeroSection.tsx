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
      {/* Subtle gradient background */}
      <div className="absolute top-1/4 right-1/4 w-[200px] sm:w-[400px] h-[200px] sm:h-[400px] bg-gold/8 rounded-full blur-[80px] sm:blur-[120px] -z-10" />
      <div className="absolute bottom-1/3 left-1/3 w-[150px] sm:w-[300px] h-[150px] sm:h-[300px] bg-primary/5 rounded-full blur-[60px] sm:blur-[100px] -z-10" />

      <div className="container mx-auto px-5 sm:px-6 flex-1 flex items-center">
        <div className="max-w-4xl mx-auto text-center">
          {/* Beta badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold/10 border border-gold/20 mb-5"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
            <span className="text-xs font-medium text-gold tracking-wide uppercase">Beta</span>
          </motion.div>

          {/* Main headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.1] mb-4 sm:mb-6 text-foreground tracking-tight"
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
            className="text-base sm:text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto mb-8 sm:mb-10 px-2 sm:px-0"
          >
            A structured system for managing intake, evaluation, and transparent applicant tracking — built for scale.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-6 sm:mb-8 px-4 sm:px-0"
          >
            <Button variant="gold" size="lg" className="group px-8 w-full sm:w-auto" asChild>
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
            className="text-sm text-muted-foreground"
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
        <span className="text-sm text-muted-foreground">Scroll</span>
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