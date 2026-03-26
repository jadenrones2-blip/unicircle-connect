import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Star, ChevronRight, ArrowRight, X, Sparkles,
  ThumbsUp, ThumbsDown, Minus, BookOpen,
} from 'lucide-react';

// ─── Constants ─────────────────────────────────────────────────────────────────

const STAGES = [
  { id: 'applied',   label: 'Applied',   color: '#6366f1' },
  { id: 'reviewing', label: 'Reviewing', color: '#f59e0b' },
  { id: 'interview', label: 'Interview', color: '#3b82f6' },
  { id: 'accepted',  label: 'Accepted',  color: '#10b981' },
];

const RUBRIC_STRICT = [
  { label: 'Minimum GPA',  value: '2.5+' },
  { label: 'Year',         value: 'Sophomore – Senior' },
  { label: 'Major',        value: 'All majors welcome' },
];

const RUBRIC_AI = [
  { criterion: 'Empathy and peer support experience',     weight: 5 },
  { criterion: 'Communication and active listening',      weight: 4 },
  { criterion: 'Commitment to mental health advocacy',    weight: 4 },
  { criterion: 'Cultural competency and inclusivity',     weight: 3 },
  { criterion: 'Availability (5+ hrs/week)',              weight: 3 },
];

const FORM_QUESTIONS = [
  { id: 'q1', label: 'Why do you want to join REACH?' },
  { id: 'q2', label: 'Describe a time you supported someone through a difficult moment.' },
  { id: 'q3', label: 'Hours per week you can commit?' },
  { id: 'q4', label: 'What does mental health advocacy mean to you personally?' },
];

const HINTS = [
  'AI has scored all 30 REACH applicants against your rubric',
  'Stars mark AI standouts — candidates worth a closer look',
  'Click any applicant to review their application and vote',
];

// ─── Types ─────────────────────────────────────────────────────────────────────

type Vote     = 'yes' | 'no' | 'maybe' | null;
type Decision = 'pending' | 'accepted' | 'waitlisted' | 'rejected';
type Tally    = { yes: number; no: number; maybe: number };
type Responses = { q1: string; q2: string; q3: string; q4: string };

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
  is_standout: boolean;
  ai_summary: string;
  preset_tally: Tally;
  final_decision: Decision;
  responses?: Responses;
};

// ─── Data ──────────────────────────────────────────────────────────────────────

const APPLICANTS: DemoApplicant[] = [
  // Applied × 14
  { id: 1,  name: 'Jasmine Lee',       initials: 'JL', major: 'Psychology',   year: 'Sophomore', score: 74, stage: 'applied',   color: '#6366f1', is_standout: false, final_decision: 'pending',  preset_tally: { yes: 0, no: 0, maybe: 0 }, ai_summary: 'Shows genuine interest in peer support with volunteer experience. Communication is solid but direct peer support background is limited. Recommend standard review.' },
  { id: 2,  name: 'Marcus Torres',     initials: 'MT', major: 'Public Health', year: 'Junior',    score: 68, stage: 'applied',   color: '#6366f1', is_standout: false, final_decision: 'pending',  preset_tally: { yes: 0, no: 1, maybe: 0 }, ai_summary: 'Advocacy background is relevant but responses lack specificity on peer support skills. Time commitment answer was vague.' },
  { id: 3,  name: 'Elena Vásquez',     initials: 'EV', major: 'Biology',       year: 'Sophomore', score: 71, stage: 'applied',   color: '#6366f1', is_standout: false, final_decision: 'pending',  preset_tally: { yes: 0, no: 0, maybe: 0 }, ai_summary: 'Health education focus aligns with REACH mission. Responses show empathy but limited direct peer support experience at this stage.' },
  { id: 4,  name: 'David Kim',         initials: 'DK', major: 'Cog Sci',       year: 'Freshman',  score: 65, stage: 'applied',   color: '#6366f1', is_standout: false, final_decision: 'pending',  preset_tally: { yes: 0, no: 0, maybe: 0 }, ai_summary: 'Enthusiastic but responses are brief and underdeveloped. Freshman status limits demonstrated experience at this point.' },
  { id: 5,  name: 'Amara Okafor',      initials: 'AO', major: 'Human Dev',     year: 'Junior',    score: 79, stage: 'applied',   color: '#6366f1', is_standout: false, final_decision: 'pending',  preset_tally: { yes: 1, no: 0, maybe: 0 }, ai_summary: 'Strong community outreach background across multiple UCSD colleges. Responses demonstrate empathy and cultural awareness. Recommend advancing to review.', tag: 'Strong' },
  { id: 6,  name: 'Ryan Nguyen',       initials: 'RN', major: 'Sociology',     year: 'Sophomore', score: 63, stage: 'applied',   color: '#6366f1', is_standout: false, final_decision: 'pending',  preset_tally: { yes: 0, no: 1, maybe: 0 }, ai_summary: 'Passion for reducing stigma is clear but responses are surface-level. No direct peer support or advocacy experience demonstrated.' },
  { id: 7,  name: 'Sofia Reyes',       initials: 'SR', major: 'Pre-Med',       year: 'Junior',    score: 77, stage: 'applied',   color: '#6366f1', is_standout: false, final_decision: 'pending',  preset_tally: { yes: 0, no: 0, maybe: 1 }, ai_summary: 'Student Health volunteer experience is a strong signal. Well-written responses with clear understanding of peer support. Borderline — worth discussing.' },
  { id: 8,  name: 'Tyler Johnson',     initials: 'TJ', major: 'Psychology',    year: 'Sophomore', score: 61, stage: 'applied',   color: '#6366f1', is_standout: false, final_decision: 'pending',  preset_tally: { yes: 0, no: 1, maybe: 0 }, ai_summary: 'Interest in crisis intervention is noted but responses lack depth. No demonstrated experience supporting peers in practice.' },
  { id: 9,  name: 'Neha Sharma',       initials: 'NS', major: 'Biology',       year: 'Junior',    score: 72, stage: 'applied',   color: '#6366f1', is_standout: false, final_decision: 'pending',  preset_tally: { yes: 0, no: 0, maybe: 0 }, ai_summary: 'Research background in behavioral health is relevant. Moderate peer support experience. Solid candidate for standard review pipeline.' },
  { id: 10, name: 'Jason Wu',          initials: 'JW', major: 'Cog Sci',       year: 'Senior',    score: 70, stage: 'applied',   color: '#6366f1', is_standout: false, final_decision: 'pending',  preset_tally: { yes: 0, no: 0, maybe: 1 }, ai_summary: 'Senior motivation to give back is genuine but experience is lighter than expected for a fourth-year applicant.' },
  { id: 11, name: 'Aaliyah Brown',     initials: 'AB', major: 'Comm',          year: 'Sophomore', score: 66, stage: 'applied',   color: '#6366f1', is_standout: false, final_decision: 'pending',  preset_tally: { yes: 0, no: 0, maybe: 0 }, ai_summary: 'Strong communication skills. Responses do not demonstrate direct peer support capability — outreach experience only.' },
  { id: 12, name: 'Luis Gonzalez',     initials: 'LG', major: 'Public Health', year: 'Junior',    score: 75, stage: 'applied',   color: '#6366f1', is_standout: false, final_decision: 'pending',  preset_tally: { yes: 1, no: 0, maybe: 0 }, ai_summary: 'Bilingual capability is a meaningful asset for REACH outreach. Public health background and responses show solid advocacy awareness.' },
  { id: 13, name: 'Maya Singh',        initials: 'MS', major: 'Human Dev',     year: 'Sophomore', score: 69, stage: 'applied',   color: '#6366f1', is_standout: false, final_decision: 'pending',  preset_tally: { yes: 0, no: 0, maybe: 0 }, ai_summary: 'Equity focus in mental health access aligns well with REACH values. Responses are thoughtful but experience is still developing.' },
  { id: 14, name: 'Chris Park',        initials: 'CP', major: 'Psychology',    year: 'Junior',    score: 73, stage: 'applied',   color: '#6366f1', is_standout: false, final_decision: 'pending',  preset_tally: { yes: 0, no: 0, maybe: 1 }, ai_summary: 'Mental health awareness event leadership is a good signal. Initiative and communication ability present, though peer support depth could be stronger.' },

  // Reviewing × 8
  { id: 15, name: 'Emma Chen',         initials: 'EC', major: 'Psychology',    year: 'Senior',    score: 83, stage: 'reviewing', color: '#f59e0b', is_standout: false, final_decision: 'pending',  preset_tally: { yes: 2, no: 0, maybe: 1 }, ai_summary: 'Two-year CAPS volunteer experience is exactly what REACH needs. Responses are articulate and demonstrate real active listening skills. Strong recommend.', tag: 'Strong' },
  { id: 16, name: 'Andre Williams',    initials: 'AW', major: 'Sociology',     year: 'Junior',    score: 78, stage: 'reviewing', color: '#f59e0b', is_standout: false, final_decision: 'pending',  preset_tally: { yes: 1, no: 0, maybe: 1 }, ai_summary: 'Wellness event organization background is solid. Responses reflect genuine commitment, though advocacy experience is campus-level only.' },
  { id: 17, name: 'Isabella Martinez', initials: 'IM', major: 'Public Health', year: 'Senior',    score: 87, stage: 'reviewing', color: '#f59e0b', is_standout: true,  final_decision: 'pending',  preset_tally: { yes: 2, no: 0, maybe: 0 }, ai_summary: 'Senior thesis on UCSD mental health resource gaps demonstrates deep subject matter expertise. Responses are among the most substantive in this cohort. Strong advance.', tag: 'Strong' },
  { id: 18, name: 'Kevin Pham',        initials: 'KP', major: 'Biology',       year: 'Junior',    score: 76, stage: 'reviewing', color: '#f59e0b', is_standout: false, final_decision: 'pending',  preset_tally: { yes: 1, no: 1, maybe: 0 }, ai_summary: 'Pre-health community involvement shows care for others\' wellbeing. Responses are adequate but lack the emotional depth expected at this stage.' },
  { id: 19, name: 'Zara Ahmed',        initials: 'ZA', major: 'Human Dev',     year: 'Senior',    score: 81, stage: 'reviewing', color: '#f59e0b', is_standout: false, final_decision: 'pending',  preset_tally: { yes: 2, no: 0, maybe: 0 }, ai_summary: 'Clinical internship experience gives Zara a practical edge. Responses show empathy and professional maturity. Recommend advancing.' },
  { id: 20, name: 'Noah Campbell',     initials: 'NC', major: 'Poli Sci',      year: 'Junior',    score: 74, stage: 'reviewing', color: '#f59e0b', is_standout: false, final_decision: 'pending',  preset_tally: { yes: 1, no: 0, maybe: 1 }, ai_summary: 'Policy advocacy angle is interesting but peer support skills are not demonstrated. May be better suited for a different REACH role.' },
  { id: 21, name: 'Destiny Robinson',  initials: 'DR', major: 'Psychology',    year: 'Sophomore', score: 80, stage: 'reviewing', color: '#f59e0b', is_standout: false, final_decision: 'pending',  preset_tally: { yes: 2, no: 0, maybe: 0 }, ai_summary: 'Personal essay on lived experience with anxiety is authentic and shows self-awareness — a key quality for effective peer supporters.' },
  { id: 22, name: 'James Liu',         initials: 'JL', major: 'Pre-Med',       year: 'Junior',    score: 77, stage: 'reviewing', color: '#f59e0b', is_standout: false, final_decision: 'pending',  preset_tally: { yes: 1, no: 0, maybe: 1 }, ai_summary: 'Counseling center shadowing shows direct exposure to the field. Responses are professional but could be more personal. Borderline advance.' },

  // Interview × 5
  {
    id: 23, name: 'Priya Patel', initials: 'PP', major: 'Psychology', year: 'Senior',
    score: 91, stage: 'interview', color: '#3b82f6', tag: 'Top Pick', is_standout: true,
    final_decision: 'pending', preset_tally: { yes: 3, no: 0, maybe: 0 },
    ai_summary: 'Exceptional candidate. CAPS peer counselor with a published article on anxiety in first-gen students. Responses reflect clinical-level empathy and communication. Top pick this cycle.',
    responses: {
      q1: "REACH changed how I thought about peer support as a freshman. I want to give that back — especially to first-gen students who don't know these resources exist.",
      q2: 'A close friend came to me during finals week in crisis. I sat with them for three hours, helped them call CAPS, and followed up every day for two weeks.',
      q3: '8–10 hours per week. I have already blocked my schedule.',
      q4: "Advocacy means making support feel approachable before someone hits a breaking point. It's about normalizing the conversation, not waiting for the crisis.",
    },
  },
  {
    id: 24, name: 'Jordan Hayes', initials: 'JH', major: 'Human Dev', year: 'Junior',
    score: 85, stage: 'interview', color: '#3b82f6', tag: 'Strong', is_standout: true,
    final_decision: 'pending', preset_tally: { yes: 2, no: 0, maybe: 1 },
    ai_summary: 'Two-year athlete peer support group leader. Strong communicator with group facilitation skills. Culturally competent responses. Advance with confidence.',
    responses: {
      q1: "Athletes at UCSD face pressure that's invisible to most people. I started a peer group for my team and saw how much a trained ear can change someone's week.",
      q2: 'A teammate was struggling with identity after losing their starting position. I made space for weekly check-ins. By week three, they talked to a counselor on their own.',
      q3: '6–8 hours per week. Committed.',
      q4: "Advocacy is showing up before someone asks. It means making sure people know they're not alone before the moment they need to know it most.",
    },
  },
  {
    id: 25, name: 'Simone Davis', initials: 'SD', major: 'Public Health', year: 'Senior',
    score: 88, stage: 'interview', color: '#3b82f6', tag: 'Strong', is_standout: true,
    final_decision: 'pending', preset_tally: { yes: 2, no: 0, maybe: 1 },
    ai_summary: 'Bilingual SHS outreach leader for first-gen students. Demonstrates strong cultural competency and lived understanding of access barriers. Highly relevant profile.',
    responses: {
      q1: 'I ran SHS outreach for first-gen Latinx students and saw how language and stigma kept people from getting help. REACH is how I want to keep doing that work.',
      q2: 'A student confided they had been struggling for months but felt therapy was "not for people like them." I connected them to a bilingual counselor and checked in weekly.',
      q3: '7+ hours. I structure my quarter around this kind of commitment.',
      q4: "Advocacy is meeting people where they are — linguistically, culturally, emotionally. It's not one-size-fits-all.",
    },
  },
  {
    id: 26, name: 'Alex Nguyen', initials: 'AN', major: 'Cog Sci', year: 'Junior',
    score: 82, stage: 'interview', color: '#3b82f6', is_standout: false,
    final_decision: 'pending', preset_tally: { yes: 2, no: 0, maybe: 1 },
    ai_summary: 'Thoughtful interest in mental health technology and peer systems. Responses are strong on communication but lighter on direct peer support experience. Solid mid-tier candidate.',
    responses: {
      q1: "I've been building a mental health resource app and realized technology isn't enough — human connection is the layer that actually works. REACH is that layer.",
      q2: 'A friend had a panic attack during a study session. I stayed calm, helped them breathe, and talked them through what triggered it afterward.',
      q3: '5–6 hours per week.',
      q4: 'Making mental health support as easy to access as the dining app. Reducing friction is advocacy.',
    },
  },
  {
    id: 27, name: 'Jade Thompson', initials: 'JT', major: 'Sociology', year: 'Senior',
    score: 84, stage: 'interview', color: '#3b82f6', is_standout: false,
    final_decision: 'pending', preset_tally: { yes: 2, no: 0, maybe: 1 },
    ai_summary: 'Intersectionality research background gives Jade a nuanced lens on mental health disparities. Responses are thoughtful and identity-aware. Advance.',
    responses: {
      q1: "My research on mental health outcomes across identities made it clear that representation in peer support isn't optional — it's the point.",
      q2: "A classmate was navigating a panic disorder while hiding it from their family. I helped them reframe seeking help as an act of strength, not weakness.",
      q3: '6 hours per week.',
      q4: "Advocacy means centering the voices most often excluded from mental health conversations — and doing the hard work of showing up for them.",
    },
  },

  // Accepted × 3
  {
    id: 28, name: 'Hannah Kim', initials: 'HK', major: 'Psychology', year: 'Senior',
    score: 94, stage: 'accepted', color: '#10b981', tag: 'Accepted', is_standout: true,
    final_decision: 'accepted', preset_tally: { yes: 3, no: 0, maybe: 0 },
    ai_summary: 'Highest-scoring applicant this cycle. Returning board member with proven REACH leadership. Responses reflect institutional knowledge and deep personal investment. Unanimous accept.',
    responses: {
      q1: 'REACH gave me a community when I needed one most. Coming back as a leader is how I pay that forward.',
      q2: 'I have had hundreds of these conversations over two years on the board. The one I think about most: a student who almost withdrew. We met weekly. They graduated.',
      q3: '10+ hours. This is my priority this quarter.',
      q4: "Advocacy is the difference between someone knowing help exists and actually getting it. That gap is where I work.",
    },
  },
  {
    id: 29, name: 'Michael Santos', initials: 'MS', major: 'Human Dev', year: 'Junior',
    score: 90, stage: 'accepted', color: '#10b981', tag: 'Accepted', is_standout: true,
    final_decision: 'accepted', preset_tally: { yes: 3, no: 0, maybe: 0 },
    ai_summary: 'Peer support leadership across three residential colleges demonstrates scale and consistency. Culturally aware and operationally strong. Accepted with confidence.',
    responses: {
      q1: 'I saw the same mental health deserts in three different colleges at UCSD. REACH is how to address it at a platform level rather than one dorm at a time.',
      q2: 'I trained 12 peer supporters across Muir, Warren, and Sixth. I know what equips people and what does not.',
      q3: '8–10 hours.',
      q4: 'Advocacy is systematic, not reactive. It means building infrastructure so that help is there before anyone has to ask.',
    },
  },
  {
    id: 30, name: 'Aisha Freeman', initials: 'AF', major: 'Public Health', year: 'Senior',
    score: 92, stage: 'accepted', color: '#10b981', tag: 'Accepted', is_standout: true,
    final_decision: 'accepted', preset_tally: { yes: 3, no: 0, maybe: 0 },
    ai_summary: 'National mental health advocate with a UCSD-specific track record. Highest cultural competency score in this cohort. Exceptional fit. Accepted.',
    responses: {
      q1: 'I have done this work at a national scale. I want to root it at UCSD because that is where I can have the most impact per hour.',
      q2: 'I ran a national peer support hotline for two summers. I have learned when to listen, when to guide, and when to escalate.',
      q3: '10+ hours. Non-negotiable.',
      q4: 'Mental health advocacy is the act of refusing to accept that suffering is private. It is inherently collective.',
    },
  },
];

// ─── AI Score Badge ────────────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
    score >= 60 ? 'bg-[#C9A84C]/10 text-[#C9A84C] border-[#C9A84C]/20' :
                  'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${color}`}>
      <Sparkles className="w-2.5 h-2.5" />
      {score} AI Score
    </span>
  );
}

// ─── Rubric Popover ────────────────────────────────────────────────────────────

function RubricPopover({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className="absolute top-full right-0 mt-2 w-80 bg-[#111111] border border-white/[0.08] rounded-2xl p-5 shadow-2xl z-50"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs font-semibold text-white/40 uppercase tracking-[0.15em]">AI Rubric — REACH Fall 2025</div>
        <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Strict filters */}
      <div className="mb-4">
        <div className="text-[10px] font-semibold text-white/30 uppercase tracking-[0.12em] mb-2.5">Strict Filters</div>
        <div className="space-y-1.5">
          {RUBRIC_STRICT.map(f => (
            <div key={f.label} className="flex items-center justify-between text-xs">
              <span className="text-white/50">{f.label}</span>
              <span className="text-white/80 font-medium">{f.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-white/[0.06] my-4" />

      {/* AI criteria */}
      <div>
        <div className="text-[10px] font-semibold text-white/30 uppercase tracking-[0.12em] mb-3">AI Scoring Criteria</div>
        <div className="space-y-3">
          {RUBRIC_AI.map(c => (
            <div key={c.criterion}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-white/70">{c.criterion}</span>
                <div className="flex gap-0.5 ml-2 shrink-0">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-2 h-2 rounded-full ${i < c.weight ? 'bg-[#C9A84C]' : 'bg-white/10'}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-white/25 mt-3">Scored by Claude against application responses.</p>
      </div>
    </motion.div>
  );
}

// ─── Applicant Detail Panel ────────────────────────────────────────────────────

function ApplicantPanel({
  applicant,
  userVote,
  userDecision,
  onVote,
  onDecision,
  onClose,
}: {
  applicant: DemoApplicant;
  userVote: Vote;
  userDecision: Decision;
  onVote: (v: Vote) => void;
  onDecision: (d: Decision) => void;
  onClose: () => void;
}) {
  const stage = STAGES.find(s => s.id === applicant.stage);

  // Merge preset tally + user vote for display
  const tally = { ...applicant.preset_tally };
  if (userVote) tally[userVote]++;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="w-80 shrink-0 bg-[#111111] border border-white/[0.08] rounded-2xl flex flex-col self-start overflow-hidden"
      style={{ maxHeight: 'calc(100vh - 160px)' }}
    >
      {/* Standout banner */}
      {applicant.is_standout && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-[#C9A84C]/10 border-b border-[#C9A84C]/20 shrink-0">
          <Star className="w-3.5 h-3.5 text-[#C9A84C] fill-[#C9A84C] shrink-0" />
          <span className="text-xs font-medium text-[#C9A84C]">AI Standout — worth keeping a close eye on</span>
        </div>
      )}

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">

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
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/[0.06] text-white/30 hover:text-white/60 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* AI Score + Stage */}
        <div className="flex items-center gap-2 flex-wrap">
          <ScoreBadge score={applicant.score} />
          <span className="flex items-center gap-1.5 text-[10px] text-white/30">
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: stage?.color }} />
            {stage?.label}
          </span>
          {applicant.tag && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
              applicant.tag === 'Accepted'  ? 'bg-emerald-500/15 text-emerald-400' :
              applicant.tag === 'Top Pick'  ? 'bg-[#C9A84C]/15 text-[#C9A84C]'    :
              'bg-blue-500/15 text-blue-400'
            }`}>
              {applicant.tag}
            </span>
          )}
        </div>

        {/* Application responses */}
        {applicant.responses && (
          <div>
            <div className="text-[10px] font-semibold text-white/30 uppercase tracking-[0.15em] mb-2.5">Application Responses</div>
            <div className="space-y-3">
              {FORM_QUESTIONS.map(q => {
                const answer = applicant.responses![q.id as keyof Responses];
                return (
                  <div key={q.id}>
                    <div className="text-[10px] text-white/35 mb-1">{q.label}</div>
                    <div className="text-xs text-white/70 bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2.5 leading-relaxed">
                      {answer}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* AI Summary */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles className="w-3 h-3 text-[#C9A84C]" />
            <div className="text-[10px] font-semibold text-white/30 uppercase tracking-[0.15em]">AI Summary</div>
          </div>
          <p className="text-xs text-white/60 bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2.5 leading-relaxed">
            {applicant.ai_summary}
          </p>
        </div>

        {/* Deliberation */}
        <div>
          <div className="text-[10px] font-semibold text-white/30 uppercase tracking-[0.15em] mb-3">Deliberation</div>
          <div className="flex gap-2 mb-3">
            {(['yes', 'no', 'maybe'] as const).map(v => {
              const isActive = userVote === v;
              const Icon = v === 'yes' ? ThumbsUp : v === 'no' ? ThumbsDown : Minus;
              const activeClass = v === 'yes' ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' :
                                  v === 'no'  ? 'bg-red-500/15 border-red-500/30 text-red-400' :
                                                'bg-zinc-500/15 border-zinc-500/30 text-zinc-300';
              return (
                <button
                  key={v}
                  onClick={() => onVote(isActive ? null : v)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs font-medium capitalize transition-all ${
                    isActive ? activeClass : 'border-white/10 text-white/40 hover:border-white/20 hover:text-white/70'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {v}
                </button>
              );
            })}
          </div>
          <div className="flex gap-4 text-xs">
            <span className="text-emerald-400 font-medium">{tally.yes} Yes</span>
            <span className="text-white/20">·</span>
            <span className="text-red-400 font-medium">{tally.no} No</span>
            <span className="text-white/20">·</span>
            <span className="text-zinc-400 font-medium">{tally.maybe} Maybe</span>
          </div>
        </div>

        {/* Final Decision */}
        <div>
          <div className="text-[10px] font-semibold text-white/30 uppercase tracking-[0.15em] mb-3">Final Decision</div>
          <div className="grid grid-cols-3 gap-2">
            {(['accepted', 'waitlisted', 'rejected'] as const).map(d => {
              const isActive = userDecision === d;
              const activeClass = d === 'accepted'  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' :
                                  d === 'waitlisted' ? 'bg-[#C9A84C]/20 border-[#C9A84C]/40 text-[#C9A84C]' :
                                                       'bg-red-500/20 border-red-500/40 text-red-400';
              const label = d === 'accepted' ? 'Accept' : d === 'waitlisted' ? 'Waitlist' : 'Reject';
              return (
                <button
                  key={d}
                  onClick={() => onDecision(isActive ? 'pending' : d)}
                  className={`py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                    isActive ? activeClass : 'bg-white/[0.03] border-white/[0.07] text-white/40 hover:text-white/70 hover:border-white/20'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

      </div>
    </motion.div>
  );
}

// ─── Pipeline View ─────────────────────────────────────────────────────────────

function PipelineView({ onBack }: { onBack: () => void }) {
  const [selected, setSelected]     = useState<DemoApplicant | null>(null);
  const [userVotes, setUserVotes]   = useState<Record<number, Vote>>({});
  const [decisions, setDecisions]   = useState<Record<number, Decision>>(
    Object.fromEntries(APPLICANTS.map(a => [a.id, a.final_decision]))
  );
  const [hintIndex, setHintIndex]   = useState(0);
  const [hintsVisible, setHintsVisible] = useState(true);
  const [rubricOpen, setRubricOpen] = useState(false);

  useEffect(() => {
    if (!hintsVisible || hintIndex >= HINTS.length) { setHintsVisible(false); return; }
    const t = setTimeout(() => setHintIndex(i => i + 1), 3800);
    return () => clearTimeout(t);
  }, [hintIndex, hintsVisible]);

  const handleCardClick = (a: DemoApplicant) => {
    setSelected(a);
    setHintsVisible(false);
    setRubricOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col">

      {/* Top bar */}
      <div className="border-b border-white/[0.06] px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="text-xs text-white/30 hover:text-white/60 transition-colors">← Back</button>
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

        <div className="flex items-center gap-4">
          {/* Stats */}
          <div className="hidden sm:flex items-center divide-x divide-white/[0.06]">
            {[
              { label: 'Applicants', value: '30' },
              { label: 'Reviewing',  value: '8'  },
              { label: 'Interview',  value: '5'  },
              { label: 'Accepted',   value: '3'  },
            ].map(s => (
              <div key={s.label} className="px-4 text-center">
                <div className="text-sm font-bold text-white">{s.value}</div>
                <div className="text-[9px] text-white/30 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Rubric button */}
          <div className="relative">
            <button
              onClick={() => setRubricOpen(o => !o)}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all ${
                rubricOpen
                  ? 'bg-[#C9A84C]/10 border-[#C9A84C]/30 text-[#C9A84C]'
                  : 'border-white/[0.08] text-white/40 hover:text-white/70 hover:border-white/20'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              AI Rubric
            </button>
            <AnimatePresence>
              {rubricOpen && <RubricPopover onClose={() => setRubricOpen(false)} />}
            </AnimatePresence>
          </div>
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

      {/* Main */}
      <div className="flex flex-1 gap-5 px-6 pb-6 overflow-hidden min-h-0">

        {/* Kanban */}
        <div className="flex-1 overflow-x-auto">
          <div className="flex gap-5 min-w-max h-full">
            {STAGES.map(stage => {
              const cards = APPLICANTS.filter(a => a.stage === stage.id);
              return (
                <div key={stage.id} className="w-56 flex flex-col">
                  <div className="flex items-center justify-between mb-3 px-1 shrink-0">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: stage.color }} />
                      <span className="text-[11px] font-semibold text-white/50 tracking-widest uppercase">{stage.label}</span>
                    </div>
                    <span className="text-[11px] text-white/25 tabular-nums">{cards.length}</span>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-hide">
                    {cards.map((a, i) => (
                      <motion.div
                        key={a.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03, duration: 0.3 }}
                        onClick={() => handleCardClick(a)}
                        className={`group border rounded-xl p-3 cursor-pointer transition-all ${
                          a.is_standout ? 'ring-1 ring-[#C9A84C]/20' : ''
                        } ${
                          selected?.id === a.id
                            ? 'bg-[#C9A84C]/[0.05] border-[#C9A84C]/30'
                            : a.is_standout
                            ? 'bg-white/[0.03] border-[#C9A84C]/25 hover:border-[#C9A84C]/40'
                            : 'bg-white/[0.03] border-white/[0.07] hover:bg-white/[0.06] hover:border-white/[0.15]'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                              style={{ backgroundColor: a.color + '22', border: `1.5px solid ${a.color}35`, color: a.color }}
                            >
                              {a.initials}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1">
                                {a.is_standout && <Star className="w-3 h-3 text-[#C9A84C] fill-[#C9A84C] shrink-0" />}
                                <span className="text-[12px] font-semibold text-white truncate">{a.name}</span>
                              </div>
                              <div className="text-[10px] text-white/35">{a.year} · {a.major}</div>
                            </div>
                          </div>
                          <ChevronRight className="w-3 h-3 text-white/15 group-hover:text-white/40 mt-0.5 flex-shrink-0 transition-colors" />
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <Sparkles className={`w-2.5 h-2.5 ${a.score >= 80 ? 'text-emerald-400' : a.score >= 60 ? 'text-[#C9A84C]' : 'text-zinc-500'}`} />
                            <span className="text-[11px] font-bold text-white">{a.score}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            {userVotes[a.id] && (
                              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${
                                userVotes[a.id] === 'yes'   ? 'bg-emerald-500/15 text-emerald-400' :
                                userVotes[a.id] === 'no'    ? 'bg-red-500/15 text-red-400' :
                                'bg-zinc-500/15 text-zinc-400'
                              }`}>
                                {userVotes[a.id]}
                              </span>
                            )}
                            {decisions[a.id] !== 'pending' && (
                              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${
                                decisions[a.id] === 'accepted'  ? 'bg-emerald-500/15 text-emerald-400' :
                                decisions[a.id] === 'waitlisted' ? 'bg-[#C9A84C]/15 text-[#C9A84C]' :
                                'bg-red-500/15 text-red-400'
                              }`}>
                                {decisions[a.id]}
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
              userVote={userVotes[selected.id] ?? null}
              userDecision={decisions[selected.id] ?? 'pending'}
              onVote={v => setUserVotes(prev => ({ ...prev, [selected!.id]: v }))}
              onDecision={d => setDecisions(prev => ({ ...prev, [selected!.id]: d }))}
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
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#C9A84C]/20 bg-[#C9A84C]/[0.05] mb-10">
          <div className="w-1.5 h-1.5 rounded-full bg-[#C9A84C] animate-pulse" />
          <span className="text-[11px] font-semibold text-[#C9A84C] tracking-[0.15em] uppercase">REACH · UniCircle Demo</span>
        </div>

        <h1 className="font-display text-4xl sm:text-5xl font-bold text-white leading-[1.05] tracking-tight mb-5">
          Run REACH's entire recruitment<br className="hidden sm:block" /> process in one place.
        </h1>

        <p className="text-white/45 text-base leading-relaxed mb-12 max-w-sm mx-auto">
          Stop juggling forms, spreadsheets, and messages. UniCircle organizes everything into one system.
        </p>

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

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="absolute bottom-8"
      >
        <Link to="/" className="text-xs text-white/20 hover:text-white/40 transition-colors">unicircle.app</Link>
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
