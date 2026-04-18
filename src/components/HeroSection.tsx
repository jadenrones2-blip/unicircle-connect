import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import MagneticButton from "./MagneticButton";
import { useSoundEffects } from "@/hooks/useSoundEffects";

const leftItems = [
  "Brain Hub",
  "AMSA",
  "Rotaract",
  "SIC",
  "Business Leaders Assoc.",
  "Engineers for Social Good",
  "Design Co",
  "Triton Consulting",
  "Data Science Society",
  "Philosophy Club",
  "Prelaw Society",
  "Concrete Canoe",
];

const rightItems = [
  { label: "Applied", color: "text-blue-400 border-blue-400/20" },
  { label: "Under Review", color: "text-purple-400 border-purple-400/20" },
  { label: "Interview", color: "text-gold border-gold/20" },
  { label: "Accepted", color: "text-emerald-400 border-emerald-400/20" },
  { label: "Applied", color: "text-blue-400 border-blue-400/20" },
  { label: "Interview", color: "text-gold border-gold/20" },
  { label: "Under Review", color: "text-purple-400 border-purple-400/20" },
  { label: "Accepted", color: "text-emerald-400 border-emerald-400/20" },
  { label: "Applied", color: "text-blue-400 border-blue-400/20" },
  { label: "Interview", color: "text-gold border-gold/20" },
];

const ScrollTrack = ({
  items,
  direction = "down",
  duration = 32,
  renderItem,
}: {
  items: string[] | { label: string; color: string }[];
  direction?: "up" | "down";
  duration?: number;
  renderItem: (item: any, i: number) => React.ReactNode;
}) => {
  const y = direction === "down" ? ["0%", "-50%"] : ["-50%", "0%"];
  return (
    <div
      className="h-full overflow-hidden"
      style={{ maskImage: "linear-gradient(to bottom, transparent 0%, black 18%, black 82%, transparent 100%)" }}
    >
      <motion.div
        animate={{ y }}
        transition={{ duration, repeat: Infinity, ease: "linear" }}
        className="flex flex-col gap-2.5"
      >
        {[...items, ...items].map((item, i) => renderItem(item, i))}
      </motion.div>
    </div>
  );
};

const HeroSection = () => {
  const { playClick, playHover } = useSoundEffects();

  return (
    <section
      className="min-h-screen flex flex-col items-center justify-center pt-20 pb-16 relative overflow-hidden"
      style={{ background: "#0D0D0D" }}
    >
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-[#C9A84C]/[0.035] rounded-full blur-[140px]" />
      </div>

      {/* Scrolling columns */}
      <div className="absolute inset-0 flex justify-between px-8 lg:px-20 pointer-events-none">
        {/* Left — club names */}
        <div className="hidden lg:block h-full w-52 pt-16">
          <ScrollTrack
            items={leftItems}
            direction="down"
            duration={38}
            renderItem={(name, i) => (
              <div
                key={i}
                className="px-3.5 py-2 rounded-lg border border-white/[0.06] bg-white/[0.02] w-fit"
              >
                <span className="text-[11px] font-medium text-white/35 whitespace-nowrap tracking-wide">
                  {name}
                </span>
              </div>
            )}
          />
        </div>

        {/* Right — stage pills */}
        <div className="hidden lg:block h-full w-44 pt-16">
          <ScrollTrack
            items={rightItems}
            direction="up"
            duration={30}
            renderItem={(item, i) => (
              <div
                key={i}
                className={`px-3.5 py-2 rounded-lg border bg-white/[0.02] w-fit ${item.color}`}
              >
                <span className="text-[11px] font-medium whitespace-nowrap tracking-wide opacity-50">
                  {item.label}
                </span>
              </div>
            )}
          />
        </div>
      </div>

      {/* Center content */}
      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-4xl mx-auto text-center">

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
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
            <MagneticButton>
              <Link
                to="/clubs"
                className="inline-flex items-center gap-2 bg-[#C9A84C] hover:bg-[#C9A84C]/90 text-zinc-900 font-bold px-8 py-3.5 rounded-xl text-sm transition-colors w-full sm:w-auto justify-center"
                onMouseEnter={playHover}
                onClick={playClick}
              >
                Explore clubs
                <ArrowRight className="w-4 h-4" />
              </Link>
            </MagneticButton>
            <MagneticButton>
              <Link
                to="/club-admin/request"
                className="inline-flex items-center gap-2 border border-white/10 text-white/70 hover:text-white hover:border-white/20 font-medium px-8 py-3.5 rounded-xl text-sm transition-colors w-full sm:w-auto justify-center"
                onMouseEnter={playHover}
                onClick={playClick}
              >
                Get your org on UniCircle
                <ArrowRight className="w-4 h-4" />
              </Link>
            </MagneticButton>
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
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="w-px h-8 bg-gradient-to-b from-[#C9A84C]/40 to-transparent mx-auto"
        />
      </motion.div>
    </section>
  );
};

export default HeroSection;
