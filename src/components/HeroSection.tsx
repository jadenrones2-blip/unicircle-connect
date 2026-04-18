import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import MagneticButton from "./MagneticButton";
import { useSoundEffects } from "@/hooks/useSoundEffects";

const clubs = [
  { name: "Brain Hub", category: "Science" },
  { name: "AMSA", category: "Pre-Med" },
  { name: "Rotaract", category: "Service" },
  { name: "SIC", category: "Entrepreneurship" },
  { name: "Business Leaders Assoc.", category: "Business" },
  { name: "Engineers for Social Good", category: "Changemaking" },
  { name: "Design Co", category: "Design" },
  { name: "Triton Consulting", category: "Consulting" },
  { name: "Data Science Society", category: "Technology" },
  { name: "Philosophy Club", category: "Humanities" },
  { name: "Prelaw Society", category: "Law" },
  { name: "Concrete Canoe", category: "Engineering" },
];

const pipeline = [
  { name: "Sarah Chen", stage: "Interview", color: "text-gold bg-gold/10" },
  { name: "James Park", stage: "Applied", color: "text-blue-400 bg-blue-400/10" },
  { name: "Maya Patel", stage: "Under Review", color: "text-purple-400 bg-purple-400/10" },
  { name: "Alex Kim", stage: "Accepted", color: "text-emerald-400 bg-emerald-400/10" },
  { name: "Emily Rodriguez", stage: "Interview", color: "text-gold bg-gold/10" },
  { name: "Jordan Lee", stage: "Applied", color: "text-blue-400 bg-blue-400/10" },
  { name: "Taylor Nguyen", stage: "Accepted", color: "text-emerald-400 bg-emerald-400/10" },
  { name: "Chris Wang", stage: "Under Review", color: "text-purple-400 bg-purple-400/10" },
  { name: "Priya Sharma", stage: "Interview", color: "text-gold bg-gold/10" },
  { name: "Marcus Johnson", stage: "Applied", color: "text-blue-400 bg-blue-400/10" },
];

const ClubCard = ({ name, category }: { name: string; category: string }) => (
  <div className="mb-3 px-3 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.07] w-44 backdrop-blur-sm">
    <div className="text-[11px] font-semibold text-white/70 truncate">{name}</div>
    <div className="text-[9px] text-white/30 mt-0.5">{category}</div>
  </div>
);

const PipelineCard = ({ name, stage, color }: { name: string; stage: string; color: string }) => (
  <div className="mb-3 px-3 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.07] w-44 backdrop-blur-sm">
    <div className="text-[11px] font-semibold text-white/70 truncate">{name}</div>
    <div className={`text-[9px] mt-1 px-1.5 py-0.5 rounded font-medium inline-block ${color}`}>{stage}</div>
  </div>
);

const ScrollColumn = ({
  children,
  direction = "down",
  duration = 30,
}: {
  children: React.ReactNode;
  direction?: "up" | "down";
  duration?: number;
}) => {
  const y = direction === "down" ? ["0%", "-50%"] : ["-50%", "0%"];
  return (
    <div className="relative overflow-hidden h-full">
      <motion.div
        animate={{ y }}
        transition={{ duration, repeat: Infinity, ease: "linear" }}
        className="flex flex-col"
      >
        {children}
        {children}
      </motion.div>
    </div>
  );
};

const HeroSection = () => {
  const { playClick, playHover } = useSoundEffects();

  return (
    <section className="min-h-screen flex flex-col items-center justify-center pt-20 pb-16 relative overflow-hidden" style={{ background: '#0D0D0D' }}>

      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-[#C9A84C]/[0.04] rounded-full blur-[120px]" />
      </div>

      {/* Scrolling columns — left and right */}
      <div className="absolute inset-0 flex justify-between px-6 md:px-16 pointer-events-none">
        {/* Left column — clubs, scrolling down */}
        <div className="hidden md:block h-full w-48 opacity-60" style={{ maskImage: 'linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)' }}>
          <ScrollColumn direction="down" duration={35}>
            {clubs.map((c) => <ClubCard key={c.name} {...c} />)}
          </ScrollColumn>
        </div>

        {/* Right column — pipeline, scrolling up */}
        <div className="hidden md:block h-full w-48 opacity-60" style={{ maskImage: 'linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)' }}>
          <ScrollColumn direction="up" duration={28}>
            {pipeline.map((p) => <PipelineCard key={p.name} {...p} />)}
          </ScrollColumn>
        </div>
      </div>

      {/* Center content */}
      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-4xl mx-auto text-center">

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
