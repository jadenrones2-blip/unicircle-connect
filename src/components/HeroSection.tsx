import { Button } from "@/components/ui/button";
import { ArrowRight, ChevronDown, UserPlus } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import GoldMeshBackground from "./GoldMeshBackground";
import FloatingParticles from "./FloatingParticles";
import AnimatedWords from "./AnimatedWords";
import { useSoundEffects } from "@/hooks/useSoundEffects";

const HeroSection = () => {
  const { playClick, playHover } = useSoundEffects();

  const scrollToContent = () => {
    window.scrollTo({ top: window.innerHeight, behavior: "smooth" });
  };

  return (
    <section className="min-h-screen flex flex-col items-center justify-center pt-20 sm:pt-20 pb-16 sm:pb-8 relative overflow-hidden bg-primary">
      <GoldMeshBackground />
      <FloatingParticles />

      <div className="container mx-auto px-5 sm:px-6 flex-1 flex items-center">
        <div className="max-w-4xl mx-auto text-center">
          {/* Beta badge */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-gold/30 bg-gold/5 backdrop-blur-sm mb-8"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
            <span className="text-xs font-semibold text-gold tracking-[0.15em] uppercase">Beta</span>
          </motion.div>

          <AnimatedWords
            text="Recruit with precision."
            as="h1"
            className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold leading-[1.0] mb-8 sm:mb-10 text-primary-foreground"
            goldWords={["precision."]}
          />

          {/* CTA buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="flex flex-col items-center gap-4 mb-6 sm:mb-8"
          >
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="gold"
                size="lg"
                className="group px-10 w-full sm:w-auto"
                asChild
                onMouseEnter={playHover}
                onClick={playClick}
              >
                <Link to="/signup">
                  Sign up free
                  <UserPlus className="w-4 h-4 ml-1 group-hover:scale-110 transition-transform" />
                </Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="group w-full sm:w-auto border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10"
                asChild
                onMouseEnter={playHover}
                onClick={playClick}
              >
                <Link to="/clubs">
                  Claim your club
                  <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            </div>
            <button
              className="flex items-center gap-1.5 text-sm text-primary-foreground/40 hover:text-primary-foreground/70 transition-colors"
              onClick={() => { playClick(); scrollToContent(); }}
              onMouseEnter={playHover}
            >
              See how it works
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.5 }}
            className="text-sm text-primary-foreground/40 tracking-wide"
          >
            Currently at UC San Diego.
          </motion.p>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.5 }}
        className="hidden sm:flex absolute bottom-8 left-1/2 -translate-x-1/2 flex-col items-center gap-2 cursor-pointer"
        onClick={scrollToContent}
      >
        <span className="text-xs font-semibold text-primary-foreground/40 tracking-[0.2em] uppercase">Scroll</span>
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
