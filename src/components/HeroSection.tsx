import { ArrowRight, Check, ChevronRight, MoreHorizontal } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import MagneticButton from "./MagneticButton";
import { useSoundEffects } from "@/hooks/useSoundEffects";

const columns = [
  {
    title: "Applied", count: 24, color: "bg-blue-500/20 text-blue-400",
    cards: [
      { name: "Sarah Chen", major: "CS · 3.8 GPA" },
      { name: "James Park", major: "Data Sci · 3.6 GPA" },
    ]
  },
  {
    title: "Under Review", count: 12, color: "bg-[#F5C842]/20 text-[#F5C842]",
    cards: [
      { name: "Alex Kim", major: "CS · 3.7 GPA", score: "87" },
      { name: "Maya Patel", major: "Econ · 3.5 GPA", score: "72" },
    ]
  },
  {
    title: "Interview", count: 6, color: "bg-emerald-500/20 text-emerald-400",
    cards: [
      { name: "Jordan Lee", major: "CS · 3.9 GPA", score: "94" },
    ]
  },
  {
    title: "Accepted", count: 3, color: "bg-purple-500/20 text-purple-400",
    cards: [
      { name: "Taylor Nguyen", major: "CS · 4.0 GPA" },
    ]
  },
];

const KanbanPreview = () => (
  <div className="bg-[#111111] rounded-xl border border-white/[0.08] overflow-hidden shadow-2xl">
    {/* Browser chrome */}
    <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] bg-[#0E0E0E]">
      <div className="flex gap-1.5">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
        <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
      </div>
      <div className="flex-1 flex justify-center">
        <div className="px-4 py-1 rounded-md bg-white/[0.04] text-[10px] text-white/30 font-mono">
          unicircle.app/recruitment
        </div>
      </div>
    </div>

    {/* Toolbar */}
    <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
      <div className="flex items-center gap-3">
        <span className="text-sm font-bold text-white">Fall 2025 Recruitment</span>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F5C842]/15 text-[#F5C842] font-semibold">Active</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-[10px] text-white/30">45 applicants</span>
        <MoreHorizontal className="w-4 h-4 text-white/20" />
      </div>
    </div>

    {/* Kanban board */}
    <div className="p-4 grid grid-cols-4 gap-3 min-h-[220px]">
      {columns.map((col, colIdx) => (
        <motion.div
          key={col.title}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 + colIdx * 0.1, duration: 0.5 }}
          className="flex flex-col"
        >
          <div className="flex items-center gap-1.5 mb-2.5 px-0.5">
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${col.color}`}>{col.count}</span>
            <span className="text-[11px] font-medium text-white/50">{col.title}</span>
          </div>
          <div className="flex-1 space-y-2 p-2 rounded-lg bg-white/[0.02] border border-white/[0.05]">
            {col.cards.map((card, cardIdx) => (
              <motion.div
                key={card.name}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9 + colIdx * 0.1 + cardIdx * 0.08 }}
                className="p-2.5 rounded-md bg-white/[0.04] border border-white/[0.07]"
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-4 h-4 rounded-full bg-[#F5C842]/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-[7px] font-bold text-[#F5C842]">{card.name[0]}</span>
                  </div>
                  <span className="text-[10px] font-semibold text-white/80">{card.name}</span>
                </div>
                <p className="text-[9px] text-white/30">{card.major}</p>
                {"score" in card && (
                  <span className="text-[8px] mt-1 px-1.5 py-0.5 rounded bg-[#F5C842]/10 text-[#F5C842]/70 font-medium inline-block">
                    Score: {card.score}
                  </span>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  </div>
);

const HeroSection = () => {
  const { playClick, playHover } = useSoundEffects();

  return (
    <section
      className="min-h-screen flex flex-col items-center justify-center pt-24 pb-16 relative overflow-hidden"
      style={{ background: "#0D0D0D" }}
    >
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-[#F5C842]/[0.03] rounded-full blur-[160px]" />
      </div>

      <div className="container mx-auto px-6 relative z-10 max-w-6xl">

        {/* Headline */}
        <div className="text-center mb-8">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
            className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black leading-[1.0] tracking-tight text-white mb-5"
          >
            Find your people.<br />
            <span className="text-[#F5C842]">Build your team.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.5 }}
            className="text-zinc-500 text-lg max-w-lg mx-auto mb-8"
          >
            Club discovery and recruitment for UCSD — built for students and orgs.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <MagneticButton>
              <Link
                to="/clubs"
                className="inline-flex items-center gap-2 bg-[#F5C842] hover:bg-[#F5C842]/90 text-zinc-900 font-bold px-7 py-3 rounded-xl text-sm transition-colors w-full sm:w-auto justify-center"
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
                className="inline-flex items-center gap-2 border border-white/10 text-white/60 hover:text-white hover:border-white/20 font-medium px-7 py-3 rounded-xl text-sm transition-colors w-full sm:w-auto justify-center"
                onMouseEnter={playHover}
                onClick={playClick}
              >
                Get your org on UniCircle
                <ArrowRight className="w-4 h-4" />
              </Link>
            </MagneticButton>
          </motion.div>
        </div>

        {/* Product mockup */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="relative mt-12"
        >
          {/* Glow under mockup */}
          <div className="absolute -inset-x-10 -bottom-10 h-40 bg-[#F5C842]/[0.04] blur-3xl rounded-full pointer-events-none" />
          <KanbanPreview />
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.5 }}
          className="text-center text-xs text-zinc-700 mt-8 tracking-wide"
        >
          Free for student orgs. Always.
        </motion.p>

      </div>
    </section>
  );
};

export default HeroSection;
