import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import AnimatedWords from "./AnimatedWords";
import HeroCanvas from "./HeroCanvas";
import { useSoundEffects } from "@/hooks/useSoundEffects";

const HeroSection = () => {
  const { playClick, playHover } = useSoundEffects();

  return (
    <section
      className="min-h-screen flex flex-col justify-end pb-20 sm:pb-28 relative overflow-hidden"
      style={{ background: '#0D0D0D' }}
    >
      <HeroCanvas />

      <div className="max-w-7xl mx-auto w-full px-6 sm:px-8 lg:px-14 relative z-10 pointer-events-none [&_a]:pointer-events-auto">

        {/* Label */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-3 mb-10"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse flex-shrink-0" />
          <span className="text-[11px] font-semibold text-white/35 tracking-[0.25em] uppercase">
            UCSD · Beta · 2025
          </span>
        </motion.div>

        {/* Headline */}
        <AnimatedWords
          text="Recruit with precision."
          as="h1"
          className="font-display text-[clamp(3.2rem,9vw,7.5rem)] font-bold leading-[0.92] tracking-tight text-white mb-10 sm:mb-14"
          goldWords={["precision."]}
        />

        {/* Description + CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="flex flex-col sm:flex-row sm:items-end gap-6 sm:gap-20"
        >
          <p className="text-base sm:text-lg text-white/40 max-w-xs leading-relaxed">
            Replace spreadsheets, Google Forms, and Instagram DMs with one platform your entire club will actually use.
          </p>

          <div className="flex items-center gap-8">
            <Link
              to="/signup"
              className="group flex items-center gap-2 text-sm font-semibold text-white hover:text-gold transition-colors duration-200"
              onClick={playClick}
              onMouseEnter={playHover}
            >
              Get started
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
            </Link>
            <Link
              to="/demo"
              className="text-sm font-medium text-white/30 hover:text-white/60 transition-colors duration-200"
              onClick={playClick}
              onMouseEnter={playHover}
            >
              See demo
            </Link>
          </div>
        </motion.div>

      </div>
    </section>
  );
};

export default HeroSection;
