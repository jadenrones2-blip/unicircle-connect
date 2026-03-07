import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Users, Star, CheckCircle, Clock, ChevronRight,
  Calendar, ArrowRight, Zap, TrendingUp, BarChart3,
  FileText, MessageSquare, Award, Eye, Filter,
} from 'lucide-react';
import logoImage from '@/assets/unicircle-logo-new.png';

// ─── Fake Data ────────────────────────────────────────────────────────────────

const STAGES = [
  { id: 'applied',     label: 'Applied',      color: '#6366f1', bg: 'rgba(99,102,241,0.15)' },
  { id: 'screening',   label: 'Screening',    color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  { id: 'coffee_chat', label: 'Coffee Chat',  color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
  { id: 'final',       label: 'Final Round',  color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)' },
  { id: 'accepted',    label: 'Accepted',     color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
];

const APPLICANTS = [
  { id: 1,  name: 'Sarah Chen',      major: 'CS',        year: 'Junior',    score: 87, stage: 'applied',     initials: 'SC', tag: 'Strong',   color: '#6366f1' },
  { id: 2,  name: 'Marcus Johnson',  major: 'Business',  year: 'Sophomore', score: 72, stage: 'applied',     initials: 'MJ', tag: null,       color: '#6366f1' },
  { id: 3,  name: 'Tyler Brooks',    major: 'ECE',       year: 'Junior',    score: 65, stage: 'applied',     initials: 'TB', tag: null,       color: '#6366f1' },
  { id: 4,  name: 'Priya Patel',     major: 'Cog Sci',   year: 'Senior',    score: 91, stage: 'screening',   initials: 'PP', tag: 'Top Pick', color: '#f59e0b' },
  { id: 5,  name: 'Alex Kim',        major: 'Math-CS',   year: 'Junior',    score: 78, stage: 'screening',   initials: 'AK', tag: null,       color: '#f59e0b' },
  { id: 6,  name: 'Jordan Lee',      major: 'Economics', year: 'Sophomore', score: 84, stage: 'coffee_chat', initials: 'JL', tag: 'Strong',   color: '#3b82f6' },
  { id: 7,  name: 'Maya Rodriguez',  major: 'Biology',   year: 'Junior',    score: 76, stage: 'coffee_chat', initials: 'MR', tag: null,       color: '#3b82f6' },
  { id: 8,  name: 'Kevin Zhang',     major: 'CS',        year: 'Senior',    score: 93, stage: 'final',       initials: 'KZ', tag: 'Top Pick', color: '#8b5cf6' },
  { id: 9,  name: 'Aisha Williams',  major: 'Poli Sci',  year: 'Junior',    score: 88, stage: 'accepted',    initials: 'AW', tag: 'Accepted', color: '#10b981' },
  { id: 10, name: 'Daniel Park',     major: 'Math',      year: 'Sophomore', score: 85, stage: 'accepted',    initials: 'DP', tag: 'Accepted', color: '#10b981' },
];

const CATEGORIES = [
  { name: 'Leadership Experience', weight: 30, scores: [8, 9, 7] },
  { name: 'Technical Skills',      weight: 25, scores: [7, 8, 9] },
  { name: 'Culture Fit',           weight: 25, scores: [9, 8, 8] },
  { name: 'Communication',         weight: 20, scores: [8, 7, 9] },
];

const REVIEWERS = ['Jamie L.', 'Chris M.', 'Sam R.'];

const APPLICANT_STAGES = ['Applied', 'Screening', 'Interview', 'Decision'];

// ─── Sub-components ───────────────────────────────────────────────────────────

function ApplicantCard({
  applicant,
  onClick,
  delay = 0,
}: {
  applicant: typeof APPLICANTS[0];
  onClick: () => void;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      onClick={onClick}
      className="group bg-white/[0.04] border border-white/[0.08] rounded-xl p-3 cursor-pointer hover:border-white/20 hover:bg-white/[0.07] transition-all"
    >
      <div className="flex items-start justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold"
            style={{ backgroundColor: applicant.color + '30', border: `1.5px solid ${applicant.color}50`, color: applicant.color }}
          >
            {applicant.initials}
          </div>
          <div>
            <div className="text-[13px] font-semibold text-white leading-none">{applicant.name}</div>
            <div className="text-[11px] text-white/40 mt-0.5">{applicant.year} · {applicant.major}</div>
          </div>
        </div>
        <ChevronRight className="w-3.5 h-3.5 text-white/20 group-hover:text-white/50 transition-colors mt-0.5" />
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Star className="w-3 h-3 fill-[#C9A84C] text-[#C9A84C]" />
          <span className="text-[12px] font-bold text-white">{applicant.score}</span>
          <span className="text-[11px] text-white/30">/100</span>
        </div>
        {applicant.tag && (
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
            applicant.tag === 'Accepted' ? 'bg-emerald-500/20 text-emerald-400' :
            applicant.tag === 'Top Pick' ? 'bg-[#C9A84C]/20 text-[#C9A84C]' :
            'bg-blue-500/20 text-blue-400'
          }`}>
            {applicant.tag}
          </span>
        )}
      </div>
    </motion.div>
  );
}

function PipelineTab({ onSelectApplicant }: { onSelectApplicant: (a: typeof APPLICANTS[0]) => void }) {
  return (
    <motion.div
      key="pipeline"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35 }}
    >
      {/* Stats row */}
      <div className="flex flex-wrap gap-3 mb-6">
        {[
          { label: 'Total Applicants', value: '10', icon: Users,      color: '#6366f1' },
          { label: 'Avg Score',        value: '81.9', icon: Star,     color: '#C9A84C' },
          { label: 'Acceptance Rate',  value: '20%',  icon: TrendingUp, color: '#10b981' },
          { label: 'Under Review',     value: '5',    icon: Eye,      color: '#8b5cf6' },
        ].map((s) => (
          <div key={s.label} className="flex items-center gap-3 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3">
            <s.icon className="w-4 h-4" style={{ color: s.color }} />
            <div>
              <div className="text-white font-bold text-sm leading-none">{s.value}</div>
              <div className="text-white/40 text-[11px] mt-0.5">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Kanban board */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max">
          {STAGES.map((stage, si) => {
            const cards = APPLICANTS.filter(a => a.stage === stage.id);
            return (
              <div key={stage.id} className="w-56">
                <div className="flex items-center justify-between mb-3 px-0.5">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color }} />
                    <span className="text-[13px] font-semibold text-white/80">{stage.label}</span>
                  </div>
                  <span className="text-[11px] text-white/40 bg-white/[0.06] rounded-full px-2 py-0.5 font-medium">
                    {cards.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {cards.map((a, ai) => (
                    <ApplicantCard
                      key={a.id}
                      applicant={a}
                      delay={si * 0.04 + ai * 0.04}
                      onClick={() => onSelectApplicant(a)}
                    />
                  ))}
                  {cards.length === 0 && (
                    <div className="border border-dashed border-white/[0.08] rounded-xl p-5 text-center">
                      <div className="text-[11px] text-white/25">Empty</div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

function EvaluateTab({ selected, onSelect }: { selected: typeof APPLICANTS[0]; onSelect: (a: typeof APPLICANTS[0]) => void }) {
  const compositeScore = CATEGORIES.reduce((total, cat) => {
    const avg = cat.scores.reduce((a, b) => a + b, 0) / cat.scores.length;
    return total + (avg / 10) * cat.weight;
  }, 0).toFixed(1);

  return (
    <motion.div
      key="evaluate"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35 }}
      className="grid grid-cols-1 lg:grid-cols-3 gap-5"
    >
      {/* Sidebar: applicant list */}
      <div className="space-y-2">
        <div className="text-[11px] font-semibold text-white/40 uppercase tracking-widest mb-3">Applicants</div>
        {APPLICANTS.slice(0, 7).map((a) => (
          <div
            key={a.id}
            onClick={() => onSelect(a)}
            className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
              selected.id === a.id
                ? 'border-[#C9A84C]/50 bg-[#C9A84C]/[0.06]'
                : 'border-white/[0.07] bg-white/[0.03] hover:border-white/15'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold"
                style={{ backgroundColor: a.color + '25', color: a.color, border: `1.5px solid ${a.color}40` }}
              >
                {a.initials}
              </div>
              <div>
                <div className="text-[13px] font-semibold text-white leading-none">{a.name}</div>
                <div className="text-[11px] text-white/40">{a.major}</div>
              </div>
            </div>
            <div className="text-[13px] font-bold text-[#C9A84C]">{a.score}</div>
          </div>
        ))}
      </div>

      {/* Scorecard */}
      <div className="lg:col-span-2">
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                style={{ backgroundColor: selected.color + '25', color: selected.color, border: `1.5px solid ${selected.color}40` }}
              >
                {selected.initials}
              </div>
              <div>
                <div className="text-lg font-bold text-white">{selected.name}</div>
                <div className="text-sm text-white/50">{selected.year} · {selected.major}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-[#C9A84C]">{compositeScore}</div>
              <div className="text-[11px] text-white/40 mt-0.5">Composite Score</div>
            </div>
          </div>

          {/* Reviewer legend */}
          <div className="flex gap-4 mb-5 pb-5 border-b border-white/[0.06]">
            {REVIEWERS.map((r, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-semibold text-white/60">
                  {r[0]}
                </div>
                <span className="text-[11px] text-white/40">{r}</span>
              </div>
            ))}
          </div>

          {/* Categories */}
          <div className="space-y-5">
            {CATEGORIES.map((cat, i) => {
              const avg = cat.scores.reduce((a, b) => a + b, 0) / cat.scores.length;
              const variance = Math.max(...cat.scores) - Math.min(...cat.scores);
              const weighted = ((avg / 10) * cat.weight).toFixed(1);

              return (
                <div key={cat.name}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold text-white">{cat.name}</span>
                      <span className="text-[11px] text-white/30 bg-white/[0.05] px-1.5 py-0.5 rounded-md">
                        {cat.weight}%
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {variance > 1 && (
                        <span className="text-[11px] text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full">
                          ±{variance} variance
                        </span>
                      )}
                      <span className="text-[13px] font-bold text-white">
                        {avg.toFixed(1)}<span className="text-white/30 font-normal">/10</span>
                      </span>
                      <span className="text-[11px] text-[#C9A84C] font-semibold w-10 text-right">+{weighted}</span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="h-1.5 bg-white/[0.07] rounded-full overflow-hidden mb-2">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${avg * 10}%` }}
                      transition={{ duration: 0.9, delay: i * 0.1, ease: 'easeOut' }}
                      className="h-full rounded-full bg-gradient-to-r from-[#C9A84C] to-[#E8C96D]"
                    />
                  </div>

                  {/* Per-reviewer dots */}
                  <div className="flex gap-4">
                    {cat.scores.map((score, ri) => (
                      <div key={ri} className="flex items-center gap-1.5">
                        <div className="w-4 h-4 rounded-full bg-white/[0.08] flex items-center justify-center text-[9px] font-semibold text-white/50">
                          {REVIEWERS[ri][0]}
                        </div>
                        <span className="text-[12px] text-white/50 font-medium">{score}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-3 gap-3 mt-6 pt-5 border-t border-white/[0.06]">
            <button className="py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[13px] font-semibold hover:bg-emerald-500/20 transition-colors">
              Accept
            </button>
            <button className="py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white/60 text-[13px] font-semibold hover:bg-white/10 transition-colors">
              Move Forward
            </button>
            <button className="py-2.5 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-[13px] font-semibold hover:bg-red-500/20 transition-colors">
              Reject
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ApplicantViewTab() {
  const currentStage = 1; // 0-indexed, so "Screening"

  return (
    <motion.div
      key="applicant"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35 }}
      className="max-w-md mx-auto"
    >
      <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6">
        {/* Applicant header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-[#C9A84C]/20 border border-[#C9A84C]/30 flex items-center justify-center text-sm font-bold text-[#C9A84C]">
            PP
          </div>
          <div>
            <div className="text-white font-bold">Priya Patel</div>
            <div className="text-white/50 text-sm">Applied to Triton Software Engineering</div>
          </div>
        </div>

        {/* Stage tracker */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[13px] font-semibold text-white">Application Status</span>
            <span className="text-[11px] text-[#C9A84C] bg-[#C9A84C]/10 px-2.5 py-1 rounded-full font-medium">
              Under Review
            </span>
          </div>

          <div className="relative">
            {/* Track line */}
            <div className="absolute top-4 left-4 right-4 h-[2px] bg-white/[0.08]" />
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(currentStage / (APPLICANT_STAGES.length - 1)) * calc}%` }}
              style={{ left: '1rem', top: '0.9375rem', position: 'absolute', height: '2px', backgroundColor: '#C9A84C' }}
              className="rounded-full"
            />
            <div className="relative flex justify-between">
              {APPLICANT_STAGES.map((stage, i) => {
                const done = i <= currentStage;
                return (
                  <motion.div
                    key={stage}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex flex-col items-center gap-2"
                  >
                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center z-10 transition-all ${
                      done
                        ? 'border-[#C9A84C] bg-[#C9A84C] text-black'
                        : 'border-white/20 bg-[#0F0F0F] text-white/30'
                    }`}>
                      {done ? <CheckCircle className="w-4 h-4" /> : <Clock className="w-3.5 h-3.5" />}
                    </div>
                    <span className={`text-[11px] font-medium ${done ? 'text-white' : 'text-white/30'}`}>
                      {stage}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Timeline estimate */}
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] mb-5">
          <Calendar className="w-4 h-4 text-[#C9A84C]" />
          <span className="text-[13px] text-white/70">Interview slots open <span className="text-white font-medium">March 14–16</span></span>
        </div>

        {/* Activity feed */}
        <div className="space-y-2">
          <div className="text-[11px] font-semibold text-white/30 uppercase tracking-widest mb-3">Updates</div>
          {[
            { icon: CheckCircle, color: 'text-emerald-400', label: 'Application received',         time: '2 days ago',         done: true },
            { icon: FileText,    color: 'text-blue-400',    label: 'Resume reviewed by the team',  time: '1 day ago',          done: true },
            { icon: Users,       color: 'text-[#C9A84C]',   label: 'Moved to Screening round',     time: '18 hours ago',       done: true },
            { icon: Calendar,    color: 'text-white/30',    label: 'Interview scheduling opens soon', time: 'Expected Mar 14', done: false },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className={`flex items-start gap-3 p-3 rounded-xl ${item.done ? 'bg-white/[0.04]' : 'bg-white/[0.02] border border-dashed border-white/[0.06]'}`}
            >
              <item.icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${item.color}`} />
              <div className="flex-1 min-w-0">
                <div className={`text-[13px] ${item.done ? 'text-white' : 'text-white/35'}`}>{item.label}</div>
                <div className="text-[11px] text-white/30 mt-0.5">{item.time}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// Hack to make the animated width work in JSX
const calc = 100;

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = 'pipeline' | 'evaluate' | 'applicant';

const TABS: { id: Tab; label: string; icon: React.ElementType; description: string }[] = [
  { id: 'pipeline',  label: 'Recruitment Pipeline',  icon: Users,    description: 'Drag applicants through every stage of your process' },
  { id: 'evaluate',  label: 'Evaluation Engine',     icon: Star,     description: 'Weighted scoring with reviewer variance detection' },
  { id: 'applicant', label: 'Applicant View',        icon: Eye,      description: 'Real-time transparency for every candidate' },
];

export default function Demo() {
  const [activeTab, setActiveTab] = useState<Tab>('pipeline');
  const [selectedApplicant, setSelectedApplicant] = useState(APPLICANTS[3]);

  const handleSelectApplicant = (a: typeof APPLICANTS[0]) => {
    setSelectedApplicant(a);
    setActiveTab('evaluate');
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A]">

      {/* Minimal nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06] bg-[#0A0A0A]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/">
            <img src={logoImage} alt="UniCircle" className="h-8" />
          </Link>
          <Link
            to="/"
            className="bg-[#C9A84C] hover:bg-[#C9A84C]/90 text-black font-semibold text-sm px-4 py-2 rounded-lg flex items-center gap-1.5 transition-colors"
          >
            Join Waitlist
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="pt-32 pb-10 text-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="inline-flex items-center gap-2 bg-[#C9A84C]/10 border border-[#C9A84C]/20 rounded-full px-4 py-1.5 mb-5"
        >
          <Zap className="w-3.5 h-3.5 text-[#C9A84C]" />
          <span className="text-[#C9A84C] text-sm font-medium">Coming Soon — Limited Beta</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold text-white mb-4 leading-tight"
        >
          Recruitment Infrastructure<br />
          <span className="text-[#C9A84C]">Built for Campus.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14 }}
          className="text-white/50 text-lg max-w-lg mx-auto leading-relaxed"
        >
          Replace Google Forms, spreadsheets, and Instagram DMs with one platform your entire club will actually use.
        </motion.p>
      </div>

      {/* Tab bar */}
      <div className="max-w-7xl mx-auto px-4 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-wrap gap-2 justify-center"
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-[#C9A84C] text-black shadow-lg shadow-[#C9A84C]/20'
                  : 'bg-white/[0.05] text-white/50 hover:text-white hover:bg-white/[0.09] border border-white/[0.06]'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </motion.div>

        {/* Tab description */}
        <AnimatePresence mode="wait">
          <motion.p
            key={activeTab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center text-white/35 text-sm mt-3"
          >
            {TABS.find(t => t.id === activeTab)?.description}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Demo content */}
      <div className="max-w-7xl mx-auto px-4 pb-36">
        <AnimatePresence mode="wait">
          {activeTab === 'pipeline' && (
            <PipelineTab key="pipeline" onSelectApplicant={handleSelectApplicant} />
          )}
          {activeTab === 'evaluate' && (
            <EvaluateTab key="evaluate" selected={selectedApplicant} onSelect={setSelectedApplicant} />
          )}
          {activeTab === 'applicant' && (
            <ApplicantViewTab key="applicant" />
          )}
        </AnimatePresence>
      </div>

      {/* Sticky CTA bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#0A0A0A]/95 backdrop-blur-lg border-t border-white/[0.08]">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <div className="text-white font-semibold text-sm">This is what's coming to UniCircle.</div>
            <div className="text-white/40 text-xs mt-0.5">Be a founding club — get early access and shape the product.</div>
          </div>
          <Link
            to="/"
            className="bg-[#C9A84C] hover:bg-[#C9A84C]/90 text-black font-bold px-6 py-2.5 rounded-xl text-sm flex items-center gap-2 whitespace-nowrap transition-colors shadow-lg shadow-[#C9A84C]/25"
          >
            Join Waitlist
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
