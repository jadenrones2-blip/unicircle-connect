import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Star, ChevronRight, ArrowRight, X } from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────────

type Vote = 'yes' | 'maybe' | 'no' | null;

type DemoApplicant = {
  id: number;
  name: string;
  initials: string;
  major: string;
  year: string;
  score: number;
  stage: string;
  color: string;
  tag?: string;
  notes: string;
};

// ─── Data ──────────────────────────────────────────────────────────────────────

const STAGES = [
  { id: 'applied',   label: 'Applied',   color: '#6366f1' },
  { id: 'reviewing', label: 'Reviewing', color: '#f59e0b' },
  { id: 'interview', label: 'Interview', color: '#3b82f6' },
  { id: 'accepted',  label: 'Accepted',  color: '#10b981' },
];

const APPLICANTS: DemoApplicant[] = [
  // Applied × 14
  { id: 1,  name: 'Jasmine Lee',       initials: 'JL', major: 'Psychology',   year: 'Sophomore', score: 74, stage: 'applied',   color: '#6366f1', notes: 'Strong interest in peer support. Active campus volunteer.' },
  { id: 2,  name: 'Marcus Torres',     initials: 'MT', major: 'Public Health', year: 'Junior',    score: 68, stage: 'applied',   color: '#6366f1', notes: 'Previous work with mental health advocacy groups.' },
  { id: 3,  name: 'Elena Vásquez',     initials: 'EV', major: 'Biology',       year: 'Sophomore', score: 71, stage: 'applied',   color: '#6366f1', notes: 'Interested in health education and outreach programs.' },
  { id: 4,  name: 'David Kim',         initials: 'DK', major: 'Cog Sci',       year: 'Freshman',  score: 65, stage: 'applied',   color: '#6366f1', notes: 'New to campus, enthusiastic about mental wellness.' },
  { id: 5,  name: 'Amara Okafor',      initials: 'AO', major: 'Human Dev',     year: 'Junior',    score: 79, stage: 'applied',   color: '#6366f1', tag: 'Strong', notes: 'Background in community outreach across three UCSD colleges.' },
  { id: 6,  name: 'Ryan Nguyen',       initials: 'RN', major: 'Sociology',     year: 'Sophomore', score: 63, stage: 'applied',   color: '#6366f1', notes: 'Passionate about reducing mental health stigma on campus.' },
  { id: 7,  name: 'Sofia Reyes',       initials: 'SR', major: 'Pre-Med',       year: 'Junior',    score: 77, stage: 'applied',   color: '#6366f1', notes: 'Volunteers at UCSD Student Health Services.' },
  { id: 8,  name: 'Tyler Johnson',     initials: 'TJ', major: 'Psychology',    year: 'Sophomore', score: 61, stage: 'applied',   color: '#6366f1', notes: 'Interested in crisis intervention and de-escalation training.' },
  { id: 9,  name: 'Neha Sharma',       initials: 'NS', major: 'Biology',       year: 'Junior',    score: 72, stage: 'applied',   color: '#6366f1', notes: 'Research assistant in a behavioral health lab.' },
  { id: 10, name: 'Jason Wu',          initials: 'JW', major: 'Cog Sci',       year: 'Senior',    score: 70, stage: 'applied',   color: '#6366f1', notes: 'Senior looking to give back before graduating.' },
  { id: 11, name: 'Aaliyah Brown',     initials: 'AB', major: 'Comm',          year: 'Sophomore', score: 66, stage: 'applied',   color: '#6366f1', notes: 'Strong skills in social media and awareness campaigns.' },
  { id: 12, name: 'Luis Gonzalez',     initials: 'LG', major: 'Public Health', year: 'Junior',    score: 75, stage: 'applied',   color: '#6366f1', notes: 'Bilingual — can support Spanish-speaking students.' },
  { id: 13, name: 'Maya Singh',        initials: 'MS', major: 'Human Dev',     year: 'Sophomore', score: 69, stage: 'applied',   color: '#6366f1', notes: 'Focused on equity in mental health access and services.' },
  { id: 14, name: 'Chris Park',        initials: 'CP', major: 'Psychology',    year: 'Junior',    score: 73, stage: 'applied',   color: '#6366f1', notes: 'Organized a mental health awareness week on campus.' },
  // Reviewing × 8
  { id: 15, name: 'Emma Chen',         initials: 'EC', major: 'Psychology',    year: 'Senior',    score: 83, stage: 'reviewing', color: '#f59e0b', tag: 'Strong', notes: 'Two years with CAPS volunteer program. Excellent communicator.' },
  { id: 16, name: 'Andre Williams',    initials: 'AW', major: 'Sociology',     year: 'Junior',    score: 78, stage: 'reviewing', color: '#f59e0b', notes: 'Organized campus wellness drives across multiple quarters.' },
  { id: 17, name: 'Isabella Martinez', initials: 'IM', major: 'Public Health', year: 'Senior',    score: 86, stage: 'reviewing', color: '#f59e0b', tag: 'Strong', notes: 'Senior thesis on mental health resource gaps at UCSD.' },
  { id: 18, name: 'Kevin Pham',        initials: 'KP', major: 'Biology',       year: 'Junior',    score: 76, stage: 'reviewing', color: '#f59e0b', notes: 'Active in pre-health and peer wellness communities.' },
  { id: 19, name: 'Zara Ahmed',        initials: 'ZA', major: 'Human Dev',     year: 'Senior',    score: 81, stage: 'reviewing', color: '#f59e0b', notes: 'Interned at a community mental health clinic.' },
  { id: 20, name: 'Noah Campbell',     initials: 'NC', major: 'Poli Sci',      year: 'Junior',    score: 74, stage: 'reviewing', color: '#f59e0b', notes: 'Mental health policy advocate on campus council.' },
  { id: 21, name: 'Destiny Robinson',  initials: 'DR', major: 'Psychology',    year: 'Sophomore', score: 80, stage: 'reviewing', color: '#f59e0b', notes: 'Compelling personal essay on lived experience with anxiety.' },
  { id: 22, name: 'James Liu',         initials: 'JL', major: 'Pre-Med',       year: 'Junior',    score: 77, stage: 'reviewing', color: '#f59e0b', notes: 'Shadowed at the UCSD student counseling center.' },
  // Interview × 5
  { id: 23, name: 'Priya Patel',       initials: 'PP', major: 'Psychology',    year: 'Senior',    score: 91, stage: 'interview', color: '#3b82f6', tag: 'Top Pick', notes: 'Exceptional — peer counselor at CAPS, published in student journal.' },
  { id: 24, name: 'Jordan Hayes',      initials: 'JH', major: 'Human Dev',     year: 'Junior',    score: 85, stage: 'interview', color: '#3b82f6', tag: 'Strong', notes: 'Ran a peer support group for student athletes for two years.' },
  { id: 25, name: 'Simone Davis',      initials: 'SD', major: 'Public Health', year: 'Senior',    score: 88, stage: 'interview', color: '#3b82f6', tag: 'Strong', notes: 'Bilingual. Led SHS outreach for first-generation students.' },
  { id: 26, name: 'Alex Nguyen',       initials: 'AN', major: 'Cog Sci',       year: 'Junior',    score: 82, stage: 'interview', color: '#3b82f6', notes: 'Strong interest in mental health tech and peer support systems.' },
  { id: 27, name: 'Jade Thompson',     initials: 'JT', major: 'Sociology',     year: 'Senior',    score: 84, stage: 'interview', color: '#3b82f6', notes: 'Research on intersectionality in mental health outcomes.' },
  // Accepted × 3
  { id: 28, name: 'Hannah Kim',        initials: 'HK', major: 'Psychology',    year: 'Senior',    score: 94, stage: 'accepted',  color: '#10b981', tag: 'Accepted', notes: 'Outstanding. Former REACH board member returning for a second term.' },
  { id: 29, name: 'Michael Santos',    initials: 'MS', major: 'Human Dev',     year: 'Junior',    score: 90, stage: 'accepted',  color: '#10b981', tag: 'Accepted', notes: 'Led peer support initiatives across three residential colleges.' },
  { id: 30, name: 'Aisha Freeman',     initials: 'AF', major: 'Public Health', year: 'Senior',    score: 92, stage: 'accepted',  color: '#10b981', tag: 'Accepted', notes: 'National mental health advocate. Exceptional culture fit.' },
];

const HINTS = [
  'All 30 REACH applicants appear here automatically',
  'Click any applicant to review, score, and vote',
  'Move candidates through stages as your team decides',
];

// ─── Applicant Detail Panel ────────────────────────────────────────────────────

function ApplicantPanel({
  applicant,
  vote,
  onVote,
  onClose,
}: {
  applicant: DemoApplicant;
  vote: Vote;
  onVote: (v: Vote) => void;
  onClose: () => void;
}) {
  const stage = STAGES.find(s => s.id === applicant.stage);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="w-72 shrink-0 bg-[#111111] border border-white/[0.08] rounded-2xl p-5 flex flex-col gap-5 self-start"
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ backgroundColor: applicant.color + '22', border: `1.5px solid ${applicant.color}40`, color: applicant.color }}
          >
            {applicant.initials}
          </div>
          <div>
            <div className="text-sm font-bold text-white leading-tight">{applicant.name}</div>
            <div className="text-[11px] text-white/40">{applicant.year} · {applicant.major}</div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-white/[0.06] text-white/30 hover:text-white/60 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Score */}
      <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
        <Star className="w-4 h-4 fill-[#C9A84C] text-[#C9A84C]" />
        <span className="text-2xl font-bold text-white">{applicant.score}</span>
        <span className="text-xs text-white/30">/ 100</span>
        {applicant.tag && (
          <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-semibold ${
            applicant.tag === 'Accepted'  ? 'bg-emerald-500/15 text-emerald-400' :
            applicant.tag === 'Top Pick'  ? 'bg-[#C9A84C]/15 text-[#C9A84C]'    :
            'bg-blue-500/15 text-blue-400'
          }`}>
            {applicant.tag}
          </span>
        )}
      </div>

      {/* Notes */}
      <div>
        <div className="text-[10px] font-semibold text-white/30 uppercase tracking-[0.15em] mb-2">Notes</div>
        <p className="text-sm text-white/60 leading-relaxed">{applicant.notes}</p>
      </div>

      {/* Stage */}
      <div>
        <div className="text-[10px] font-semibold text-white/30 uppercase tracking-[0.15em] mb-2">Stage</div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stage?.color }} />
          <span className="text-sm text-white capitalize">{stage?.label}</span>
        </div>
      </div>

      {/* Vote */}
      <div>
        <div className="text-[10px] font-semibold text-white/30 uppercase tracking-[0.15em] mb-3">Your Vote</div>
        <div className="grid grid-cols-3 gap-2">
          {(['yes', 'maybe', 'no'] as const).map((v) => (
            <button
              key={v}
              onClick={() => onVote(vote === v ? null : v)}
              className={`py-2.5 rounded-xl border text-xs font-semibold capitalize transition-all ${
                vote === v
                  ? v === 'yes'   ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                  : v === 'maybe' ? 'bg-[#C9A84C]/20 border-[#C9A84C]/40 text-[#C9A84C]'
                  :                 'bg-red-500/20 border-red-500/40 text-red-400'
                  : 'bg-white/[0.03] border-white/[0.07] text-white/40 hover:text-white/70 hover:border-white/20'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Pipeline View ─────────────────────────────────────────────────────────────

function PipelineView({ onBack }: { onBack: () => void }) {
  const [selected, setSelected] = useState<DemoApplicant | null>(null);
  const [votes, setVotes] = useState<Record<number, Vote>>({});
  const [hintIndex, setHintIndex] = useState(0);
  const [hintsVisible, setHintsVisible] = useState(true);

  useEffect(() => {
    if (!hintsVisible) return;
    if (hintIndex >= HINTS.length) { setHintsVisible(false); return; }
    const t = setTimeout(() => setHintIndex(i => i + 1), 3800);
    return () => clearTimeout(t);
  }, [hintIndex, hintsVisible]);

  const handleCardClick = (applicant: DemoApplicant) => {
    setSelected(applicant);
    setHintsVisible(false);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col">
      {/* Top bar */}
      <div className="border-b border-white/[0.06] px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="text-xs text-white/30 hover:text-white/60 transition-colors"
          >
            ← Back
          </button>
          <div className="w-px h-4 bg-white/[0.08]" />
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#C9A84C]/15 border border-[#C9A84C]/30 flex items-center justify-center">
              <span className="text-[10px] font-bold text-[#C9A84C]">R</span>
            </div>
            <div>
              <div className="text-sm font-semibold text-white">REACH</div>
              <div className="text-[10px] text-white/35">Fall 2025 Recruitment</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#C9A84C]/[0.08] border border-[#C9A84C]/20">
            <div className="w-1.5 h-1.5 rounded-full bg-[#C9A84C] animate-pulse" />
            <span className="text-[10px] font-semibold text-[#C9A84C]">Active</span>
          </div>
        </div>

        {/* Stats */}
        <div className="hidden sm:flex items-center divide-x divide-white/[0.06]">
          {[
            { label: 'Applicants', value: '30' },
            { label: 'Reviewing',  value: '8'  },
            { label: 'Interview',  value: '5'  },
            { label: 'Accepted',   value: '3'  },
          ].map(s => (
            <div key={s.label} className="px-5 text-center">
              <div className="text-sm font-bold text-white">{s.value}</div>
              <div className="text-[9px] text-white/30 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Guided hint */}
      <div className="h-10 flex items-center justify-center shrink-0">
        <AnimatePresence mode="wait">
          {hintsVisible && hintIndex < HINTS.length && (
            <motion.div
              key={hintIndex}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.25 }}
              className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#C9A84C]/[0.07] border border-[#C9A84C]/20"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-[#C9A84C]/60" />
              <span className="text-[11px] text-[#C9A84C]/80">{HINTS[hintIndex]}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main content */}
      <div className="flex flex-1 gap-5 px-6 pb-6 overflow-hidden">
        {/* Kanban */}
        <div className="flex-1 overflow-x-auto">
          <div className="flex gap-5 min-w-max h-full">
            {STAGES.map(stage => {
              const cards = APPLICANTS.filter(a => a.stage === stage.id);
              return (
                <div key={stage.id} className="w-56 flex flex-col">
                  {/* Column header */}
                  <div className="flex items-center justify-between mb-3 px-1">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: stage.color }} />
                      <span className="text-[11px] font-semibold text-white/50 tracking-widest uppercase">{stage.label}</span>
                    </div>
                    <span className="text-[11px] text-white/25 tabular-nums">{cards.length}</span>
                  </div>

                  {/* Cards */}
                  <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 scrollbar-hide">
                    {cards.map((a, i) => (
                      <motion.div
                        key={a.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.035, duration: 0.3 }}
                        onClick={() => handleCardClick(a)}
                        className={`group border rounded-xl p-3.5 cursor-pointer transition-all ${
                          selected?.id === a.id
                            ? 'bg-[#C9A84C]/[0.05] border-[#C9A84C]/30'
                            : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/[0.07] hover:border-white/[0.15]'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                              style={{ backgroundColor: a.color + '22', border: `1.5px solid ${a.color}35`, color: a.color }}
                            >
                              {a.initials}
                            </div>
                            <div>
                              <div className="text-[12px] font-semibold text-white leading-tight">{a.name}</div>
                              <div className="text-[10px] text-white/35 mt-0.5">{a.year} · {a.major}</div>
                            </div>
                          </div>
                          <ChevronRight className="w-3 h-3 text-white/15 group-hover:text-white/40 mt-0.5 flex-shrink-0 transition-colors" />
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3 fill-[#C9A84C] text-[#C9A84C]" />
                            <span className="text-[12px] font-bold text-white">{a.score}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {votes[a.id] && (
                              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${
                                votes[a.id] === 'yes'   ? 'bg-emerald-500/15 text-emerald-400' :
                                votes[a.id] === 'maybe' ? 'bg-[#C9A84C]/15 text-[#C9A84C]'    :
                                'bg-red-500/15 text-red-400'
                              }`}>
                                {votes[a.id]}
                              </span>
                            )}
                            {a.tag && (
                              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${
                                a.tag === 'Accepted'  ? 'bg-emerald-500/15 text-emerald-400' :
                                a.tag === 'Top Pick'  ? 'bg-[#C9A84C]/15 text-[#C9A84C]'    :
                                'bg-blue-500/15 text-blue-400'
                              }`}>
                                {a.tag}
                              </span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detail panel */}
        <AnimatePresence>
          {selected && (
            <ApplicantPanel
              key={selected.id}
              applicant={selected}
              vote={votes[selected.id] ?? null}
              onVote={(v) => setVotes(prev => ({ ...prev, [selected!.id]: v }))}
              onClose={() => setSelected(null)}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Landing View ──────────────────────────────────────────────────────────────

function LandingView({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center px-6 relative">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="max-w-lg w-full text-center"
      >
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#C9A84C]/20 bg-[#C9A84C]/[0.05] mb-10">
          <div className="w-1.5 h-1.5 rounded-full bg-[#C9A84C] animate-pulse" />
          <span className="text-[11px] font-semibold text-[#C9A84C] tracking-[0.15em] uppercase">
            REACH · UniCircle Demo
          </span>
        </div>

        {/* Headline */}
        <h1 className="font-display text-4xl sm:text-5xl font-bold text-white leading-[1.05] tracking-tight mb-5">
          Run REACH's entire recruitment<br className="hidden sm:block" /> process in one place.
        </h1>

        {/* Subtext */}
        <p className="text-white/45 text-base leading-relaxed mb-12 max-w-sm mx-auto">
          Stop juggling forms, spreadsheets, and messages. UniCircle organizes everything into one system.
        </p>

        {/* CTA */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onEnter}
          className="inline-flex items-center gap-2.5 bg-[#C9A84C] hover:bg-[#C9A84C]/90 text-black font-bold px-8 py-4 rounded-xl text-sm transition-colors"
        >
          Enter Demo
          <ArrowRight className="w-4 h-4" />
        </motion.button>
      </motion.div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="absolute bottom-8"
      >
        <Link to="/" className="text-xs text-white/20 hover:text-white/40 transition-colors">
          unicircle.app
        </Link>
      </motion.div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function ReachDemo() {
  const [started, setStarted] = useState(false);

  return (
    <AnimatePresence mode="wait">
      {!started ? (
        <motion.div key="landing" exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
          <LandingView onEnter={() => setStarted(true)} />
        </motion.div>
      ) : (
        <motion.div key="pipeline" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }}>
          <PipelineView onBack={() => setStarted(false)} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
