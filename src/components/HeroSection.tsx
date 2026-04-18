import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useSoundEffects } from "@/hooks/useSoundEffects";

const HeroSection = () => {
  const { playClick, playHover } = useSoundEffects();

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">

      {/* Background video — drop your .mp4 into /public and update the src */}
      <video
        className="absolute inset-0 w-full h-full object-cover"
        src="/hero-bg.mp4"
        autoPlay
        muted
        loop
        playsInline
      />

      {/* Dark overlay — adjust opacity to control how much video shows through */}
      <div className="absolute inset-0 bg-black/55" />

      {/* Subtle vignette */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-6 text-center max-w-4xl pt-20">

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black leading-[1.0] tracking-tight text-white mb-6"
        >
          Find your people.<br />
          Build your team.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="text-white/70 text-lg sm:text-xl max-w-xl mx-auto mb-10"
        >
          Club discovery and recruitment for UCSD.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.6 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          <Link
            to="/clubs"
            className="inline-flex items-center gap-2 bg-white hover:bg-white/90 text-zinc-900 font-bold px-8 py-3.5 rounded-full text-sm transition-colors w-full sm:w-auto justify-center"
            onMouseEnter={playHover}
            onClick={playClick}
          >
            Explore clubs
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/club-admin/request"
            className="inline-flex items-center gap-2 border border-white/30 text-white hover:bg-white/10 font-medium px-8 py-3.5 rounded-full text-sm transition-colors w-full sm:w-auto justify-center"
            onMouseEnter={playHover}
            onClick={playClick}
          >
            Get your org on UniCircle
          </Link>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="text-white/30 text-xs mt-8 tracking-wide"
        >
          Free for student orgs. Always.
        </motion.p>

      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="w-px h-8 bg-gradient-to-b from-white/40 to-transparent mx-auto"
        />
      </motion.div>

    </section>
  );
};

export default HeroSection;
