import { motion } from "framer-motion";
import { useState } from "react";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import AnimatedWords from "./AnimatedWords";
import { 
  Users, Star, MoreHorizontal, ArrowRight, Check, X, 
  Mail, FileText, GripVertical, BarChart3, Clock, ChevronRight,
  TrendingUp, UserCheck, Send, MoveHorizontal
} from "lucide-react";

// Mock Kanban Board
const KanbanMockup = () => {
  const columns = [
    { 
      title: "Applied", count: 24, color: "bg-blue-500/20 text-blue-400",
      cards: [
        { name: "Sarah Chen", major: "CS · 3.8 GPA", tags: ["Resume ✓"] },
        { name: "James Park", major: "Data Sci · 3.6 GPA", tags: ["Resume ✓"] },
        { name: "Emily Rodriguez", major: "Math · 3.9 GPA", tags: [] },
      ]
    },
    { 
      title: "Under Review", count: 12, color: "bg-gold/20 text-gold",
      cards: [
        { name: "Alex Kim", major: "CS · 3.7 GPA", tags: ["Score: 87"] },
        { name: "Maya Patel", major: "Econ · 3.5 GPA", tags: ["Score: 72"] },
      ]
    },
    { 
      title: "Interview", count: 6, color: "bg-emerald-500/20 text-emerald-400",
      cards: [
        { name: "Jordan Lee", major: "CS · 3.9 GPA", tags: ["Score: 94"] },
      ]
    },
    { 
      title: "Accepted", count: 3, color: "bg-purple-500/20 text-purple-400",
      cards: [
        { name: "Taylor Nguyen", major: "CS · 4.0 GPA", tags: ["✓ Accepted"] },
      ]
    },
  ];

  return (
    <div className="bg-[#111111] rounded-xl border border-border/30 overflow-hidden shadow-2xl">
      {/* Window chrome */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/20 bg-[#111111]/80">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/60" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
          <div className="w-3 h-3 rounded-full bg-green-500/60" />
        </div>
        <div className="flex-1 flex justify-center">
          <div className="px-4 py-1 rounded-md bg-white/[0.05] text-[10px] text-white/40 font-mono">
            unicircle.app/admin/recruitment
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/20">
        <div className="flex items-center gap-3">
          <span className="text-sm font-display font-semibold text-white">Fall 2025 Recruitment</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gold/20 text-gold font-semibold">Active</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-[10px] text-white/40">45 applicants</div>
          <MoreHorizontal className="w-4 h-4 text-white/30" />
        </div>
      </div>

      {/* Kanban */}
      <div className="p-3 md:p-4 flex md:grid md:grid-cols-4 gap-3 min-h-[220px] md:min-h-[280px] overflow-x-auto snap-x snap-mandatory scrollbar-hide">
        {columns.map((col, colIdx) => (
          <motion.div
            key={col.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 + colIdx * 0.1, duration: 0.5 }}
            className="flex flex-col min-w-[140px] md:min-w-0 snap-start"
          >
            <div className="flex items-center justify-between mb-2.5 px-1">
              <div className="flex items-center gap-1.5">
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${col.color}`}>
                  {col.count}
                </span>
                <span className="text-[11px] font-medium text-white/70">{col.title}</span>
              </div>
            </div>
            <div className="flex-1 space-y-2 p-1.5 rounded-lg bg-white/[0.02] border border-border/10">
              {col.cards.map((card, cardIdx) => (
                <motion.div
                  key={card.name}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.5 + colIdx * 0.1 + cardIdx * 0.08 }}
                  className="p-2.5 rounded-md bg-white/[0.05] border border-border/20 hover:border-gold/30 transition-colors cursor-default group"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-5 h-5 rounded-full bg-gold/20 flex items-center justify-center">
                      <span className="text-[8px] font-bold text-gold">{card.name[0]}</span>
                    </div>
                    <span className="text-[11px] font-medium text-white">{card.name}</span>
                  </div>
                  <p className="text-[9px] text-white/40 mb-1.5">{card.major}</p>
                  {card.tags.map((tag) => (
                    <span key={tag} className="text-[8px] px-1.5 py-0.5 rounded bg-gold/10 text-gold/70 font-medium">
                      {tag}
                    </span>
                  ))}
                </motion.div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Mobile swipe hint */}
      <motion.div
        className="flex md:hidden items-center justify-center gap-2 pt-3 pb-1"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 1.2 }}
      >
        <motion.div
          animate={{ x: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
          className="flex items-center gap-1.5 text-white/30"
        >
          <MoveHorizontal className="w-3.5 h-3.5" />
          <span className="text-[10px] font-medium tracking-wide">Swipe to explore</span>
        </motion.div>
      </motion.div>
    </div>
  );
};

// Mock Analytics Dashboard
const AnalyticsMockup = () => {
  const barHeights = [40, 65, 55, 80, 70, 95, 85];
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="bg-[#111111] rounded-xl border border-border/30 overflow-hidden shadow-2xl">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/20 bg-[#111111]/80">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/60" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
          <div className="w-3 h-3 rounded-full bg-green-500/60" />
        </div>
        <div className="flex-1 flex justify-center">
          <div className="px-4 py-1 rounded-md bg-white/[0.05] text-[10px] text-white/40 font-mono">
            unicircle.app/admin/analytics
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 mb-5">
          {[
            { label: "Total Applied", value: "247", change: "+18%", icon: Users },
            { label: "Under Review", value: "84", change: "+12%", icon: Clock },
            { label: "Acceptance Rate", value: "23%", change: "+2%", icon: TrendingUp },
            { label: "Avg Score", value: "76.4", change: "+5.1", icon: Star },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 + i * 0.08 }}
              className="p-3 rounded-lg bg-white/[0.03] border border-border/15"
            >
              <div className="flex items-center justify-between mb-2">
                <stat.icon className="w-3.5 h-3.5 text-white/30" />
                <span className="text-[9px] text-emerald-400 font-medium">{stat.change}</span>
              </div>
              <div className="text-lg font-display font-bold text-white">{stat.value}</div>
              <div className="text-[9px] text-white/40">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Chart */}
        <div className="p-3 rounded-lg bg-white/[0.03] border border-border/15">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-medium text-white/70">Applications this week</span>
            <span className="text-[10px] text-white/30">Last 7 days</span>
          </div>
          <div className="flex items-end gap-2 h-24">
            {barHeights.map((h, i) => (
              <motion.div
                key={i}
                className="flex-1 flex flex-col items-center gap-1"
                initial={{ height: 0 }}
                whileInView={{ height: "auto" }}
                viewport={{ once: true }}
              >
                <motion.div
                  className="w-full rounded-sm bg-gradient-to-t from-gold/60 to-gold/20"
                  style={{ height: `${h}%` }}
                  initial={{ scaleY: 0 }}
                  whileInView={{ scaleY: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.6 + i * 0.05, duration: 0.5, ease: "easeOut" }}
                />
                <span className="text-[8px] text-white/30">{days[i]}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Mock Applicant View (student perspective)
const ApplicantViewMockup = () => {
  const stages = [
    { label: "Applied", done: true },
    { label: "Review", done: true },
    { label: "Interview", done: false, active: true },
    { label: "Decision", done: false },
  ];

  return (
    <div className="bg-[#111111] rounded-xl border border-border/30 overflow-hidden shadow-2xl">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/20 bg-[#111111]/80">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/60" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
          <div className="w-3 h-3 rounded-full bg-green-500/60" />
        </div>
        <div className="flex-1 flex justify-center">
          <div className="px-4 py-1 rounded-md bg-white/[0.05] text-[10px] text-white/40 font-mono">
            unicircle.app/dashboard
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="text-sm font-display font-semibold text-white mb-4">Your Applications</div>

        {/* Application cards */}
        {[
          { club: "Triton Consulting Group", status: "Interview Stage", color: "text-gold", progress: 75 },
          { club: "Design Co", status: "Under Review", color: "text-blue-400", progress: 50 },
          { club: "Data Science Society", status: "Applied", color: "text-white/40", progress: 25 },
        ].map((app, i) => (
          <motion.div
            key={app.club}
            initial={{ opacity: 0, x: -15 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 + i * 0.12 }}
            className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.03] border border-border/15 mb-2.5 hover:border-gold/20 transition-colors cursor-default"
          >
            <div className="w-9 h-9 rounded-lg bg-gold/15 flex items-center justify-center flex-shrink-0">
              <span className="text-[10px] font-bold text-gold">{app.club[0]}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-semibold text-white truncate">{app.club}</div>
              <div className={`text-[9px] font-medium ${app.color}`}>{app.status}</div>
            </div>
            <div className="w-16 flex-shrink-0">
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gold"
                  initial={{ width: 0 }}
                  whileInView={{ width: `${app.progress}%` }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.7 + i * 0.1, duration: 0.8 }}
                />
              </div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-white/20 flex-shrink-0" />
          </motion.div>
        ))}

        {/* Timeline for selected app */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.9 }}
          className="mt-4 p-3 rounded-lg bg-white/[0.03] border border-border/15"
        >
          <div className="text-[10px] font-medium text-white/50 mb-3">Triton Consulting Group · Timeline</div>
          <div className="flex items-center gap-1">
            {stages.map((stage, i) => (
              <div key={stage.label} className="flex items-center gap-1 flex-1">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                  stage.done ? "bg-gold text-primary" : stage.active ? "border-2 border-gold bg-gold/10" : "border border-border/30 bg-transparent"
                }`}>
                  {stage.done ? <Check className="w-2.5 h-2.5" /> : <span className="w-1.5 h-1.5 rounded-full bg-gold/50" />}
                </div>
                <span className={`text-[8px] font-medium ${stage.done || stage.active ? "text-white/70" : "text-white/30"}`}>
                  {stage.label}
                </span>
                {i < stages.length - 1 && (
                  <div className={`flex-1 h-px ${stage.done ? "bg-gold/50" : "bg-border/30"}`} />
                )}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

const tabs = [
  { id: "pipeline", label: "Recruitment Pipeline", description: "Drag-and-drop applicants through custom stages. Score, review, and decide — all in one view." },
  { id: "analytics", label: "Analytics Dashboard", description: "Track applications, acceptance rates, and scoring trends across recruitment cycles." },
  { id: "applicant", label: "Applicant View", description: "Students see real-time status, progress bars, and timeline updates for every application." },
];

const ProductShowcase = () => {
  const [activeTab, setActiveTab] = useState("pipeline");
  const { playClick } = useSoundEffects();

  return (
    <section className="py-16 md:py-24 border-t border-white/[0.07]">

      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-14">
        <div className="mb-8 md:mb-10">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-[11px] font-semibold text-gold tracking-[0.25em] uppercase mb-8"
          >
            Product
          </motion.p>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
            <AnimatedWords
              text="See it in action."
              as="h2"
              className="font-display text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.0] tracking-tight text-white/70"
              goldWords={["action."]}
            />
            <p className="text-white text-base max-w-xs leading-relaxed">
              Built for clubs that take recruitment seriously.
            </p>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex flex-wrap gap-1 mb-8 border-b border-white/[0.08]">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); playClick(); }}
              className={`relative pb-3 pr-8 text-left transition-all ${
                activeTab === tab.id ? 'text-white/70' : 'text-white/60 hover:text-white/80'
              }`}
            >
              <span className="text-sm font-semibold tracking-wide">{tab.label}</span>
              {activeTab === tab.id && (
                <motion.div
                  layoutId="product-tab-underline"
                  className="absolute bottom-0 left-0 right-8 h-px bg-gold"
                  transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Description */}
        <motion.p
          key={activeTab}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm text-white mb-10 max-w-md"
        >
          {tabs.find(t => t.id === activeTab)?.description}
        </motion.p>

        {/* Mockup */}
        <motion.div
          key={`mockup-${activeTab}`}
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          {activeTab === "pipeline" && <KanbanMockup />}
          {activeTab === "analytics" && <AnalyticsMockup />}
          {activeTab === "applicant" && <ApplicantViewMockup />}
        </motion.div>

      </div>
    </section>
  );
};

export default ProductShowcase;
