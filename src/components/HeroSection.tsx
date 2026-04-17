import { ArrowRight, UserPlus } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const HeroSection = () => {
  return (
    <section className="min-h-screen flex flex-col items-center justify-center pt-20 pb-16 relative overflow-hidden" style={{ background: '#0D0D0D' }}>

      {/* Subtle ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-[#C9A84C]/[0.04] rounded-full blur-[120px]" />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-4xl mx-auto text-center">

          <motion.p
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-xs tracking-[0.25em] uppercase text-[#C9A84C] font-semibold mb-10"
          >
            UC San Diego · Coming to SDSU
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold leading-[1.0] tracking-tight text-white mb-6"
          >
            Find your people.<br />
            <span className="text-[#C9A84C]">Build your team.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.5 }}
            className="text-zinc-400 text-lg sm:text-xl max-w-xl mx-auto mb-12 leading-relaxed"
          >
            For students: one place to find every club that's recruiting right now and actually apply.
            For orgs: a real pipeline — no spreadsheets, no group chat chaos.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <Link
              to="/clubs"
              className="inline-flex items-center gap-2 bg-[#C9A84C] hover:bg-[#C9A84C]/90 text-zinc-900 font-bold px-8 py-3.5 rounded-xl text-sm transition-colors w-full sm:w-auto justify-center"
            >
              Explore clubs
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/club-admin/request"
              className="inline-flex items-center gap-2 border border-white/10 text-white/70 hover:text-white hover:border-white/20 font-medium px-8 py-3.5 rounded-xl text-sm transition-colors w-full sm:w-auto justify-center"
            >
              Get your org on UniCircle
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.65, duration: 0.5 }}
            className="text-xs text-zinc-600 mt-8 tracking-wide"
          >
            Free for student orgs. Always.
          </motion.p>

        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="w-px h-8 bg-gradient-to-b from-[#C9A84C]/40 to-transparent"
        />
      </motion.div>

    </section>
  );
};

export default HeroSection;
