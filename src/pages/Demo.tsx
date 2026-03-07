import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Users, Star, CheckCircle, Clock,
  Calendar, ArrowRight, TrendingUp,
  FileText, ChevronRight, Eye,
} from 'lucide-react';
import Header from '@/components/Header';

// ─── Data ─────────────────────────────────────────────────────────────────────

const STAGES = [
  { id: 'applied',     label: 'Applied',      color: '#6366f1' },
  { id: 'screening',   label: 'Screening',    color: '#f59e0b' },
  { id: 'coffee_chat', label: 'Coffee Chat',  color: '#3b82f6' },
  { id: 'final',       label: 'Final Round',  color: '#8b5cf6' },
  { id: 'accepted',    label: 'Accepted',     color: '#10b981' },
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
  { name: 'Leadership',   weight: 30, scores: [8, 9, 7] },
  { name: 'Technical',    weight: 25, scores: [7, 8, 9] },
  { name: 'Culture Fit',  weight: 25, scores: [9, 8, 8] },
  { name: 'Communication', weight: 20, scores: [8, 7, 9] },
];

const REVIEWERS = ['Jamie L.', 'Chris M.', 'Sam R.'];
const APPLICANT_STAGES = ['Applied', 'Screening', 'Interview', 'Decision'];

// ─── Pipeline Tab ─────────────────────────────────────────────────────────────

function PipelineTab({ onSelectApplicant }: { onSelectApplicant: (a: typeof APPLICANTS[0]) => void }) {
  return (
    <motion.div
      key="pipeline"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-white/[0.06] border border-white/[0.06] rounded-2xl overflow-hidden mb-10">
        {[
          { label: 'Applicants', value: '10',   icon: Users,       color: '#6366f1' },
          { label: 'Avg Score',  value: '81.9', icon: Star,        color: '#C9A84C' },
          { label: 'Accepted',   value: '20%',  icon: TrendingUp,  color: '#10b981' },
          { label: 'In Review',  value: '5',    icon: Eye,         color: '#8b5cf6' },
        ].map((s) => (
          <div key={s.label} className="bg-[#0A0A0A] px-6 py-5 flex items-center gap-4">
            <s.icon className="w-5 h-5 flex-shrink-0" style={{ color: s.color }} />
            <div>
              <div className="text-xl font-bold text-white">{s.value}</div>
              <div className="text-xs text-white/35 mt-0.5 tracking-wide">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Kanban */}
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-5 min-w-max">
          {STAGES.map((stage) => {
            const cards = APPLICANTS.filter(a => a.stage === stage.id);
            return (
              <div key={stage.id} className="w-52">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: stage.color }} />
                    <span className="text-xs font-semibold text-white/60 tracking-wide uppercase">{stage.label}</span>
                  </div>
                  <span className="text-xs text-white/30 tabular-nums">{cards.length}</span>
                </div>
                <div className="space-y-2.5">
                  {cards.map((a, i) => (
                    <motion.div
                      key={a.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => onSelectApplicant(a)}
                      className="group bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.07] hover:border-white/[0.15] rounded-xl p-3.5 cursor-pointer transition-all"
                    >
                      <div className="flex items-start justify-between mb-2.5">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                            style={{ backgroundColor: a.color + '25', border: `1.5px solid ${a.color}40`, color: a.color }}
                          >
                            {a.initials}
                          </div>
                          <div>
                            <div className="text-[13px] font-semibold text-white leading-none">{a.name}</div>
                            <div className="text-[11px] text-white/35 mt-0.5">{a.year} · {a.major}</div>
                          </div>
                        </div>
                        <ChevronRight className="w-3 h-3 text-white/15 group-hover:text-white/40 mt-0.5 transition-colors" />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 fill-[#C9A84C] text-[#C9A84C]" />
                          <span className="text-[12px] font-bold text-white">{a.score}</span>
                        </div>
                        {a.tag && (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                            a.tag === 'Accepted' ? 'bg-emerald-500/15 text-emerald-400' :
                            a.tag === 'Top Pick' ? 'bg-[#C9A84C]/15 text-[#C9A84C]' :
                            'bg-blue-500/15 text-blue-400'
                          }`}>
                            {a.tag}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  ))}
                  {cards.length === 0 && (
                    <div className="border border-dashed border-white/[0.06] rounded-xl p-6 text-center">
                      <div className="text-[11px] text-white/20">Empty</div>
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

// ─── Evaluate Tab ─────────────────────────────────────────────────────────────

function EvaluateTab({ selected, onSelect }: { selected: typeof APPLICANTS[0]; onSelect: (a: typeof APPLICANTS[0]) => void }) {
  const compositeScore = CATEGORIES.reduce((total, cat) => {
    const avg = cat.scores.reduce((a, b) => a + b, 0) / cat.scores.length;
    return total + (avg / 10) * cat.weight;
  }, 0).toFixed(1);

  return (
    <motion.div
      key="evaluate"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="grid grid-cols-1 lg:grid-cols-3 gap-6"
    >
      {/* Applicant list */}
      <div>
        <p className="text-[11px] font-semibold text-white/30 uppercase tracking-[0.15em] mb-4">Applicants</p>
        <div className="space-y-1.5">
          {APPLICANTS.slice(0, 7).map((a) => (
            <div
              key={a.id}
              onClick={() => onSelect(a)}
              className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                selected.id === a.id
                  ? 'border-[#C9A84C]/40 bg-[#C9A84C]/[0.05]'
                  : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold"
                  style={{ backgroundColor: a.color + '20', color: a.color, border: `1.5px solid ${a.color}35` }}
                >
                  {a.initials}
                </div>
                <div>
                  <div className="text-[13px] font-medium text-white">{a.name}</div>
                  <div className="text-[11px] text-white/35">{a.major}</div>
                </div>
              </div>
              <div className="text-[13px] font-bold text-[#C9A84C]">{a.score}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Scorecard */}
      <div className="lg:col-span-2 bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6">
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
              style={{ backgroundColor: selected.color + '20', color: selected.color, border: `1.5px solid ${selected.color}35` }}
            >
              {selected.initials}
            </div>
            <div>
              <div className="text-base font-bold text-white">{selected.name}</div>
              <div className="text-sm text-white/40">{selected.year} · {selected.major}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold text-[#C9A84C] leading-none">{compositeScore}</div>
            <div className="text-[11px] text-white/30 mt-1 tracking-wide">Composite</div>
          </div>
        </div>

        <div className="flex gap-5 mb-6 pb-5 border-b border-white/[0.06]">
          {REVIEWERS.map((r, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full bg-white/[0.08] flex items-center justify-center text-[10px] font-semibold text-white/50">
                {r[0]}
              </div>
              <span className="text-[11px] text-white/35">{r}</span>
            </div>
          ))}
        </div>

        <div className="space-y-6">
          {CATEGORIES.map((cat, i) => {
            const avg = cat.scores.reduce((a, b) => a + b, 0) / cat.scores.length;
            const variance = Math.max(...cat.scores) - Math.min(...cat.scores);
            return (
              <div key={cat.name}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">{cat.name}</span>
                    <span className="text-[11px] text-white/25 bg-white/[0.04] px-1.5 py-0.5 rounded">{cat.weight}%</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    {variance > 1 && (
                      <span className="text-[10px] text-amber-400/80 bg-amber-400/[0.08] px-2 py-0.5 rounded-full">
                        ±{variance}
                      </span>
                    )}
                    <span className="text-sm font-bold text-white tabular-nums">{avg.toFixed(1)}<span className="text-white/25 font-normal text-xs">/10</span></span>
                  </div>
                </div>
                <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden mb-2.5">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${avg * 10}%` }}
                    transition={{ duration: 1, delay: i * 0.1, ease: 'easeOut' }}
                    className="h-full rounded-full bg-gradient-to-r from-[#C9A84C] to-[#E8C96D]"
                  />
                </div>
                <div className="flex gap-4">
                  {cat.scores.map((score, ri) => (
                    <div key={ri} className="flex items-center gap-1.5">
                      <div className="w-4 h-4 rounded-full bg-white/[0.06] flex items-center justify-center text-[9px] font-semibold text-white/40">
                        {REVIEWERS[ri][0]}
                      </div>
                      <span className="text-[11px] text-white/40 tabular-nums">{score}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-3 gap-3 mt-8 pt-6 border-t border-white/[0.06]">
          <button className="py-2.5 rounded-xl bg-emerald-500/[0.08] border border-emerald-500/20 text-emerald-400 text-sm font-medium hover:bg-emerald-500/[0.15] transition-colors">
            Accept
          </button>
          <button className="py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.07] text-white/50 text-sm font-medium hover:bg-white/[0.08] transition-colors">
            Advance
          </button>
          <button className="py-2.5 rounded-xl bg-red-500/[0.08] border border-red-500/20 text-red-400 text-sm font-medium hover:bg-red-500/[0.15] transition-colors">
            Reject
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Applicant View Tab ────────────────────────────────────────────────────────

function ApplicantViewTab() {
  const currentStage = 1;

  return (
    <motion.div
      key="applicant"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-lg mx-auto"
    >
      <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-7">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-full bg-[#C9A84C]/15 border border-[#C9A84C]/25 flex items-center justify-center text-sm font-bold text-[#C9A84C]">
            PP
          </div>
          <div>
            <div className="text-base font-bold text-white">Priya Patel</div>
            <div className="text-sm text-white/40">Applied to Triton Software Engineering</div>
          </div>
        </div>

        {/* Stage tracker */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-5">
            <span className="text-sm font-medium text-white">Application Status</span>
            <span className="text-[11px] text-[#C9A84C] bg-[#C9A84C]/[0.08] px-2.5 py-1 rounded-full font-medium">
              Under Review
            </span>
          </div>
          <div className="relative">
            <div className="absolute top-4 left-4 right-4 h-px bg-white/[0.07]" />
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(currentStage / (APPLICANT_STAGES.length - 1)) * 100}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              style={{ left: '1rem', top: '0.9375rem', position: 'absolute', height: '1px', backgroundColor: '#C9A84C' }}
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
                    className="flex flex-col items-center gap-2.5"
                  >
                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center z-10 transition-all ${
                      done ? 'border-[#C9A84C] bg-[#C9A84C] text-black' : 'border-white/15 bg-[#0A0A0A] text-white/25'
                    }`}>
                      {done ? <CheckCircle className="w-4 h-4" /> : <Clock className="w-3.5 h-3.5" />}
                    </div>
                    <span className={`text-[11px] font-medium ${done ? 'text-white' : 'text-white/25'}`}>
                      {stage}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Next date */}
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] mb-6">
          <Calendar className="w-4 h-4 text-[#C9A84C]" />
          <span className="text-sm text-white/60">
            Interview slots open <span className="text-white font-medium">March 14–16</span>
          </span>
        </div>

        {/* Activity feed */}
        <p className="text-[11px] font-semibold text-white/25 uppercase tracking-[0.15em] mb-3">Updates</p>
        <div className="space-y-2">
          {[
            { icon: CheckCircle, color: 'text-emerald-400', label: 'Application received',         time: '2 days ago',      done: true },
            { icon: FileText,    color: 'text-blue-400',    label: 'Resume reviewed by the team',  time: '1 day ago',       done: true },
            { icon: Users,       color: 'text-[#C9A84C]',   label: 'Moved to Screening round',     time: '18 hours ago',    done: true },
            { icon: Calendar,    color: 'text-white/25',    label: 'Interview scheduling opens soon', time: 'Expected Mar 14', done: false },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.07 }}
              className={`flex items-start gap-3 p-3 rounded-xl ${
                item.done ? 'bg-white/[0.03]' : 'border border-dashed border-white/[0.05]'
              }`}
            >
              <item.icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${item.color}`} />
              <div>
                <div className={`text-sm ${item.done ? 'text-white/80' : 'text-white/25'}`}>{item.label}</div>
                <div className="text-[11px] text-white/25 mt-0.5">{item.time}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

type Tab = 'pipeline' | 'evaluate' | 'applicant';

const TABS: { id: Tab; label: string; sub: string }[] = [
  { id: 'pipeline',  label: 'Recruitment Pipeline',  sub: 'Move applicants through every stage' },
  { id: 'evaluate',  label: 'Evaluation Engine',     sub: 'Weighted scoring, reviewer consensus' },
  { id: 'applicant', label: 'Applicant View',        sub: 'Real-time status for every candidate' },
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
      <Header />

      {/* Hero */}
      <section className="pt-36 pb-24 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs tracking-[0.25em] uppercase text-[#C9A84C] font-semibold mb-8"
          >
            Interactive Demo
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 }}
            className="font-display text-6xl sm:text-7xl lg:text-[88px] font-bold text-white leading-[0.95] tracking-tight mb-8"
          >
            Recruitment<br />
            <span className="text-[#C9A84C]">built for</span><br />
            campus.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="text-white/45 text-lg max-w-md leading-relaxed"
          >
            Replace spreadsheets, Google Forms, and Instagram DMs with one platform clubs actually use.
          </motion.p>
        </div>
      </section>

      {/* Numbers bar */}
      <section className="border-y border-white/[0.06]">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-3 divide-x divide-white/[0.06]">
            {[
              { value: '10+',   label: 'Pipeline stages' },
              { value: '4×',    label: 'Faster decisions' },
              { value: '100%',  label: 'Transparent to applicants' },
            ].map((s) => (
              <div key={s.label} className="py-10 px-8 first:pl-0 last:pr-0">
                <div className="text-4xl font-bold text-white mb-1">{s.value}</div>
                <div className="text-sm text-white/35">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo area */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-32">

        {/* Tab nav */}
        <div className="flex flex-col sm:flex-row gap-0 border-b border-white/[0.08] mb-14">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative pb-4 pr-10 text-left transition-all group ${
                activeTab === tab.id ? '' : 'opacity-40 hover:opacity-70'
              }`}
            >
              <div className={`text-sm font-semibold tracking-wide mb-0.5 ${
                activeTab === tab.id ? 'text-white' : 'text-white'
              }`}>
                {tab.label}
              </div>
              <div className="text-xs text-white/35">{tab.sub}</div>
              {activeTab === tab.id && (
                <motion.div
                  layoutId="tab-underline"
                  className="absolute bottom-0 left-0 right-10 h-px bg-[#C9A84C]"
                  transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
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
      </section>

      {/* Bottom CTA */}
      <section className="border-t border-white/[0.06] py-28 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-end justify-between gap-10">
          <div>
            <p className="text-xs tracking-[0.25em] uppercase text-[#C9A84C] font-semibold mb-5">Early Access</p>
            <h2 className="font-display text-4xl sm:text-5xl font-bold text-white leading-tight">
              Be a founding club.<br />
              <span className="text-white/35">Shape the product.</span>
            </h2>
          </div>
          <Link
            to="/signup"
            className="flex items-center gap-2.5 bg-[#C9A84C] hover:bg-[#C9A84C]/90 text-black font-bold px-7 py-4 rounded-xl text-sm transition-colors whitespace-nowrap"
          >
            Get early access
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
