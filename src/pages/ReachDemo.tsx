import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Star, ChevronRight, ArrowRight, X, Sparkles,
  ThumbsUp, ThumbsDown, Minus, BookOpen, Megaphone,
} from 'lucide-react';

// ─── Constants ─────────────────────────────────────────────────────────────────

const REACH_YELLOW = '#F5C518';

const STAGES = [
  { id: 'applied',   label: 'Applied',   color: '#6366f1' },
  { id: 'reviewing', label: 'Reviewing', color: '#f59e0b' },
  { id: 'interview', label: 'Interview', color: '#3b82f6' },
  { id: 'accepted',  label: 'Accepted',  color: '#10b981' },
  { id: 'rejected',  label: 'Rejected',  color: '#ef4444' },
];

const RUBRIC_STRICT = [
  { label: 'Minimum GPA',  value: 'None required' },
  { label: 'Year',         value: 'Sophomore – Senior' },
  { label: 'Major',        value: 'All majors welcome' },
];

const RUBRIC_AI = [
  { criterion: 'Social media content creation skills',      weight: 5 },
  { criterion: 'Brand partnerships & outreach experience',  weight: 4 },
  { criterion: 'Creative vision and aesthetic',             weight: 4 },
  { criterion: 'Campus community impact',                   weight: 3 },
  { criterion: 'Availability (5+ hrs/week)',                weight: 3 },
];

const FORM_QUESTIONS = [
  { id: 'q1', label: 'Why do you want to join REACH?' },
  { id: 'q2', label: 'Describe a successful piece of content you\'ve created or contributed to.' },
  { id: 'q3', label: 'Hours per week you can commit?' },
  { id: 'q4', label: 'What platforms are you most experienced with and why?' },
];

const HINTS = [
  'AI has scored all 34 REACH applicants against your rubric',
  'Stars mark AI standouts — candidates worth a closer look',
  'Click any applicant to review their portfolio and vote',
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
  { id: 1,  name: 'Jasmine Lee',       initials: 'JL', major: 'Communication',     year: 'Sophomore', score: 74, stage: 'applied',   color: '#6366f1', is_standout: false, final_decision: 'pending',  preset_tally: { yes: 0, no: 0, maybe: 0 }, ai_summary: 'Instagram creator with 5k followers. Engagement-focused content and a solid aesthetic eye. Lacks brand partnership experience, but creative instincts are strong. Good potential.' },
  { id: 2,  name: 'Marcus Torres',     initials: 'MT', major: 'Business Economics',year: 'Junior',    score: 68, stage: 'applied',   color: '#6366f1', is_standout: false, final_decision: 'pending',  preset_tally: { yes: 0, no: 1, maybe: 0 }, ai_summary: 'Has one brand deal (local restaurant). Marketing coursework is relevant but social media skills are underdeveloped in the application. Needs more demonstrated output.' },
  { id: 3,  name: 'Elena Vásquez',     initials: 'EV', major: 'Visual Arts',        year: 'Sophomore', score: 71, stage: 'applied',   color: '#6366f1', is_standout: false, final_decision: 'pending',  preset_tally: { yes: 0, no: 0, maybe: 0 }, ai_summary: 'Graphic designer with a strong portfolio. Content creation skews design-over-social, but visual quality is immediately apparent. Solid for static content roles.' },
  { id: 4,  name: 'David Kim',         initials: 'DK', major: 'Computer Science',   year: 'Freshman',  score: 65, stage: 'applied',   color: '#6366f1', is_standout: false, final_decision: 'pending',  preset_tally: { yes: 0, no: 0, maybe: 0 }, ai_summary: 'Data-curious with interest in social media analytics. No demonstrated content creation yet. Freshman status limits track record — revisit next cycle with a portfolio.' },
  { id: 5,  name: 'Amara Okafor',      initials: 'AO', major: 'Communication',      year: 'Junior',    score: 79, stage: 'applied',   color: '#6366f1', is_standout: false, final_decision: 'pending',  preset_tally: { yes: 1, no: 0, maybe: 0 }, ai_summary: 'Campus event photographer with a strong visual portfolio and demonstrated campus reach. Platform growth understanding is limited. Recommend advancing to review.', tag: 'Strong' },
  { id: 6,  name: 'Ryan Nguyen',       initials: 'RN', major: 'Cognitive Science',  year: 'Sophomore', score: 63, stage: 'applied',   color: '#6366f1', is_standout: false, final_decision: 'pending',  preset_tally: { yes: 0, no: 1, maybe: 0 }, ai_summary: 'UX/interaction design background is interesting but social-media-specific skills are light. No platform growth or brand experience demonstrated in the application.' },
  { id: 7,  name: 'Sofia Reyes',       initials: 'SR', major: 'MCS',                year: 'Junior',    score: 77, stage: 'applied',   color: '#6366f1', is_standout: false, final_decision: 'pending',  preset_tally: { yes: 0, no: 0, maybe: 1 }, ai_summary: 'Has coordinated influencer outreach for a UCSD org. Understands brand voice and audience targeting. Borderline — the execution track record is thin but the instincts are there.' },
  { id: 8,  name: 'Tyler Johnson',     initials: 'TJ', major: 'Sociology',          year: 'Sophomore', score: 61, stage: 'applied',   color: '#6366f1', is_standout: false, final_decision: 'pending',  preset_tally: { yes: 0, no: 1, maybe: 0 }, ai_summary: 'Social media for a local nonprofit. Growth metrics are minimal. Passion for impact-driven content is genuine but platform skills need significant development.' },
  { id: 9,  name: 'Neha Sharma',       initials: 'NS', major: 'Business Economics', year: 'Junior',    score: 72, stage: 'applied',   color: '#6366f1', is_standout: false, final_decision: 'pending',  preset_tally: { yes: 0, no: 0, maybe: 0 }, ai_summary: 'Marketing analytics internship provides a data-driven lens. Creative social media output is limited in the application. Solid pipeline candidate for a strategy-adjacent role.' },
  { id: 10, name: 'Jason Wu',          initials: 'JW', major: 'Computer Science',   year: 'Senior',    score: 70, stage: 'applied',   color: '#6366f1', is_standout: false, final_decision: 'pending',  preset_tally: { yes: 0, no: 0, maybe: 1 }, ai_summary: 'Built social media analytics tools used by campus orgs. Technical depth is a differentiator but creative output is limited. Senior perspective and tooling skills add unique value.' },
  { id: 11, name: 'Aaliyah Brown',     initials: 'AB', major: 'Communication',      year: 'Sophomore', score: 66, stage: 'applied',   color: '#6366f1', is_standout: false, final_decision: 'pending',  preset_tally: { yes: 0, no: 0, maybe: 0 }, ai_summary: 'TikTok creator with 12k followers. Organic growth is promising but content strategy appears largely unplanned. Strong raw potential — would benefit from REACH\'s structure.' },
  { id: 12, name: 'Luis Gonzalez',     initials: 'LG', major: 'Film Studies',       year: 'Junior',    score: 75, stage: 'applied',   color: '#6366f1', is_standout: false, final_decision: 'pending',  preset_tally: { yes: 1, no: 0, maybe: 0 }, ai_summary: 'Video production background and reel quality are strong assets. Social media native skills are less evident — his work reads more cinematic than platform-optimized. Bilingual advantage.' },
  { id: 13, name: 'Maya Singh',        initials: 'MS', major: 'MCS',                year: 'Sophomore', score: 69, stage: 'applied',   color: '#6366f1', is_standout: false, final_decision: 'pending',  preset_tally: { yes: 0, no: 0, maybe: 0 }, ai_summary: 'Brand voice and copywriting samples are polished for a sophomore. Content strategy understanding is emerging. Thoughtful, well-organized application overall.' },
  { id: 14, name: 'Chris Park',        initials: 'CP', major: 'Business Economics', year: 'Junior',    score: 73, stage: 'applied',   color: '#6366f1', is_standout: false, final_decision: 'pending',  preset_tally: { yes: 0, no: 0, maybe: 1 }, ai_summary: 'Ran a campus Instagram account from 0 to 3k. Understands growth mechanics. Needs broader platform experience and evidence of brand collaboration to advance further.' },

  // Reviewing × 8
  { id: 15, name: 'Emma Chen',         initials: 'EC', major: 'Communication',      year: 'Senior',    score: 83, stage: 'reviewing', color: '#f59e0b', is_standout: false, final_decision: 'pending',  preset_tally: { yes: 2, no: 0, maybe: 1 }, ai_summary: 'Former marketing intern at a consumer brand. Managed social calendar and brand partnerships. Content quality and strategic thinking are both present. Strong recommend.', tag: 'Strong' },
  { id: 16, name: 'Andre Williams',    initials: 'AW', major: 'Political Science',  year: 'Junior',    score: 78, stage: 'reviewing', color: '#f59e0b', is_standout: false, final_decision: 'pending',  preset_tally: { yes: 1, no: 0, maybe: 1 }, ai_summary: 'Runs a campus advocacy account with consistent engagement. Content strategy is strong but brand partnership experience is limited. Advance conditionally.' },
  { id: 17, name: 'Isabella Martinez', initials: 'IM', major: 'Communication',      year: 'Senior',    score: 87, stage: 'reviewing', color: '#f59e0b', is_standout: true,  final_decision: 'pending',  preset_tally: { yes: 2, no: 0, maybe: 0 }, ai_summary: 'Viral TikTok series on UCSD life (200k+ views). Actively negotiating her third brand deal. Responses demonstrate both creative and commercial fluency. Top candidate in this cohort.', tag: 'Strong' },
  { id: 18, name: 'Kevin Pham',        initials: 'KP', major: 'Computer Science',   year: 'Junior',    score: 76, stage: 'reviewing', color: '#f59e0b', is_standout: false, final_decision: 'pending',  preset_tally: { yes: 1, no: 1, maybe: 0 }, ai_summary: 'Built analytics dashboards for social media teams. Strong data skills but creative portfolio is thin. Mixed signals — technical depth without a matching creative output.' },
  { id: 19, name: 'Zara Ahmed',        initials: 'ZA', major: 'Cognitive Science',  year: 'Senior',    score: 81, stage: 'reviewing', color: '#f59e0b', is_standout: false, final_decision: 'pending',  preset_tally: { yes: 2, no: 0, maybe: 0 }, ai_summary: 'UX/product design skills translate well to platform-native content. Work on design-forward social accounts is polished and intentional. Recommend advancing.' },
  { id: 20, name: 'Noah Campbell',     initials: 'NC', major: 'Business Economics', year: 'Junior',    score: 74, stage: 'reviewing', color: '#f59e0b', is_standout: false, final_decision: 'pending',  preset_tally: { yes: 1, no: 0, maybe: 1 }, ai_summary: 'Has connected two campus orgs with local brand sponsors. Emerging partnerships track record is promising. Partnerships skills are ahead of content creation skills at this stage.' },
  { id: 21, name: 'Destiny Robinson',  initials: 'DR', major: 'Film Studies',       year: 'Sophomore', score: 80, stage: 'reviewing', color: '#f59e0b', is_standout: false, final_decision: 'pending',  preset_tally: { yes: 2, no: 0, maybe: 0 }, ai_summary: 'Documentary-style video content is unique, high quality, and consistent. Posting discipline and format consistency signal a creator who treats this seriously. Advance.' },
  { id: 22, name: 'James Liu',         initials: 'JL', major: 'MCS',                year: 'Junior',    score: 77, stage: 'reviewing', color: '#f59e0b', is_standout: false, final_decision: 'pending',  preset_tally: { yes: 1, no: 0, maybe: 1 }, ai_summary: 'Managed social media for a campus org — grew from 2.1k to 6.8k followers in one quarter. Platform growth track record is a strong signal. Advance with confidence.' },

  // Interview × 5
  {
    id: 23, name: 'Priya Patel', initials: 'PP', major: 'Communication', year: 'Senior',
    score: 91, stage: 'interview', color: '#3b82f6', tag: 'Top Pick', is_standout: true,
    final_decision: 'pending', preset_tally: { yes: 3, no: 0, maybe: 0 },
    ai_summary: 'Manages a UCSD lifestyle account with 53k followers. Has executed 5+ paid brand deals. Exceptional strategic and creative output — she understands both the algorithm and the audience. Top pick this cycle.',
    responses: {
      q1: "I built my account from zero to 53k by being intentional about UCSD's specific culture and what resonates here. REACH operates at a scale I want to learn how to sustain — and contribute to.",
      q2: 'A 3-part reel series on underrated UCSD spots hit 180k views in a week. Two brands reached out the next day. I turned one into a paid deal within 48 hours.',
      q3: '8–10 hours. I block this in my schedule before anything else.',
      q4: "Instagram for community building and brand activations, TikTok for reach and discovery. I treat each platform as its own language and don't cross-post without adapting the format.",
    },
  },
  {
    id: 24, name: 'Jordan Hayes', initials: 'JH', major: 'Visual Arts', year: 'Junior',
    score: 85, stage: 'interview', color: '#3b82f6', tag: 'Strong', is_standout: true,
    final_decision: 'pending', preset_tally: { yes: 2, no: 0, maybe: 1 },
    ai_summary: 'Viral design work — a single post hit 240k views. Deep knowledge of platform algorithms and aesthetic trends. Creative vision is strong and platform-native. Advance with confidence.',
    responses: {
      q1: "I see REACH doing things visually that most campus orgs can't. I want to be part of the team that raises the bar even higher.",
      q2: 'An infographic on UCSD housing costs went viral — 240k views, 18k shares. It was picked up by a local news account and sparked a campus-wide conversation.',
      q3: '6–8 hours. Committed.',
      q4: "Instagram for design-forward content. TikTok for rapid iteration and testing new formats. I use engagement data to inform aesthetics, not the other way around.",
    },
  },
  {
    id: 25, name: 'Simone Davis', initials: 'SD', major: 'MCS', year: 'Senior',
    score: 88, stage: 'interview', color: '#3b82f6', tag: 'Strong', is_standout: true,
    final_decision: 'pending', preset_tally: { yes: 2, no: 0, maybe: 1 },
    ai_summary: 'Has negotiated brand deals for three UCSD orgs. Bilingual content reaches English and Spanish-speaking audiences. Commercially aware and creatively versatile. Highly relevant profile.',
    responses: {
      q1: "I want REACH's brand partnerships to represent UCSD's full student body — that requires bilingual content and I can deliver it.",
      q2: 'A bilingual back-to-school campaign I produced reached 40k students across English and Spanish audiences. Both brand sponsors renewed the following quarter.',
      q3: '7+ hours. I structure my schedule around commitments like this.',
      q4: 'Instagram for brand activation, TikTok for student reach, LinkedIn for sponsor credibility. Platform selection is a strategic decision, not a preference.',
    },
  },
  {
    id: 26, name: 'Alex Nguyen', initials: 'AN', major: 'Computer Science', year: 'Junior',
    score: 82, stage: 'interview', color: '#3b82f6', is_standout: false,
    final_decision: 'pending', preset_tally: { yes: 2, no: 0, maybe: 1 },
    ai_summary: 'Built automation tools for social media scheduling used by 12 UCSD orgs. Strong technical differentiator. Content strategy is solid but creative output is secondary. Solid mid-tier candidate.',
    responses: {
      q1: "I built tools that save social media teams hours a week — now I want to use those tools alongside a team that actually creates great content.",
      q2: 'A scheduling + analytics tool I built was adopted by 12 UCSD orgs. Orgs using it averaged 34% higher engagement over one quarter.',
      q3: '5–6 hours per week.',
      q4: "My technical background covers all major platforms at the API level. Creatively, I'm strongest on Twitter/X and LinkedIn for text-native content.",
    },
  },
  {
    id: 27, name: 'Jade Thompson', initials: 'JT', major: 'Communication', year: 'Senior',
    score: 84, stage: 'interview', color: '#3b82f6', is_standout: false,
    final_decision: 'pending', preset_tally: { yes: 2, no: 0, maybe: 1 },
    ai_summary: 'Led a 4-person content team. Grew a campus org account from 1.2k to 9.4k in two quarters with consistent format and execution. Cross-platform strategy background. Advance.',
    responses: {
      q1: "I've led content teams and I know what good execution looks like. REACH has the vision — I can help build the systems to scale it.",
      q2: 'Managed a 4-person content team that grew a campus org from 1.2k to 9.4k followers in two quarters. Consistent format, consistent posting, consistent results.',
      q3: '6 hours per week.',
      q4: "Instagram and TikTok for primary distribution. Pinterest for content planning and moodboarding. I think about platform ecosystems, not individual posts.",
    },
  },

  // Accepted × 3
  {
    id: 28, name: 'Hannah Kim', initials: 'HK', major: 'Communication', year: 'Senior',
    score: 94, stage: 'accepted', color: '#10b981', tag: 'Accepted', is_standout: true,
    final_decision: 'accepted', preset_tally: { yes: 3, no: 0, maybe: 0 },
    ai_summary: 'Brand partnerships director for a national student org with 80k following across platforms. $45k in sponsorships secured. Unanimous accept — highest-scoring applicant this cycle.',
    responses: {
      q1: 'I have run brand partnerships at a national level. REACH is where I want to apply that experience to something local and deeply meaningful.',
      q2: 'A brand campaign I led generated $45k in sponsorships for a national student org across 14 universities. It started as a deck I built in a weekend.',
      q3: '10+ hours. This is my top priority this quarter.',
      q4: "Instagram, TikTok, LinkedIn, and YouTube. I think about brand presence holistically — not just posts but entire platform identities and content ecosystems.",
    },
  },
  {
    id: 29, name: 'Michael Santos', initials: 'MS', major: 'MCS', year: 'Junior',
    score: 90, stage: 'accepted', color: '#10b981', tag: 'Accepted', is_standout: true,
    final_decision: 'accepted', preset_tally: { yes: 3, no: 0, maybe: 0 },
    ai_summary: 'Viral TikTok creator (150k followers). Has secured $15k in brand deals for campus orgs. Platform mastery and commercial instincts are both exceptional. Accepted with confidence.',
    responses: {
      q1: 'I have 150k followers on TikTok. I have never been part of a team. REACH is how I take what I have built alone and make it mean something at scale.',
      q2: 'A video on UCSD\'s hidden study spots hit 2.1M views and brought in 8k new followers in 72 hours. Two brands reached out for deals within a week.',
      q3: '8–10 hours.',
      q4: "TikTok for organic reach, Instagram for brand activation. I understand the algorithm cycles on both platforms and use that knowledge deliberately, not by accident.",
    },
  },
  {
    id: 30, name: 'Aisha Freeman', initials: 'AF', major: 'Communication', year: 'Senior',
    score: 92, stage: 'accepted', color: '#10b981', tag: 'Accepted', is_standout: true,
    final_decision: 'accepted', preset_tally: { yes: 3, no: 0, maybe: 0 },
    ai_summary: 'Contributed strategy to an 8-figure national campaign as a student consultant. Content she scripted reached 12M people. Highest commercial impact score in this cohort. Accepted.',
    responses: {
      q1: 'REACH is the premier social media org at UCSD and I want to be part of building it into something that sets the standard nationally.',
      q2: 'I contributed strategy to an 8-figure national campaign as a student consultant. The content I scripted was seen by 12 million people.',
      q3: '10+ hours. I do not commit to things I cannot fully show up for.',
      q4: "Every platform at a professional level. My edge is knowing which platform to prioritize for which objective — and executing without guessing.",
    },
  },

  // Rejected × 4
  { id: 31, name: 'Brandon Lee',    initials: 'BL', major: 'Undeclared',         year: 'Freshman',  score: 52, stage: 'rejected', color: '#ef4444', is_standout: false, final_decision: 'rejected', preset_tally: { yes: 0, no: 2, maybe: 0 }, ai_summary: 'Application was incomplete and responses were one to two sentences each. No demonstrated content creation, platform experience, or campus involvement. Does not meet the bar for this cycle.' },
  { id: 32, name: 'Tanya Morris',   initials: 'TM', major: 'Economics',           year: 'Sophomore', score: 48, stage: 'rejected', color: '#ef4444', is_standout: false, final_decision: 'rejected', preset_tally: { yes: 0, no: 3, maybe: 0 }, ai_summary: 'Responses did not address the application questions — answers appeared copied from a generic template. No social media presence or brand-adjacent experience provided.' },
  { id: 33, name: 'Jake Miller',    initials: 'JM', major: 'Computer Science',    year: 'Junior',    score: 55, stage: 'rejected', color: '#ef4444', is_standout: false, final_decision: 'rejected', preset_tally: { yes: 0, no: 2, maybe: 1 }, ai_summary: 'Technical background only — no creative output, no social media presence, and no brand experience. Stated availability of 2 hours per week is below the minimum needed to contribute.' },
  { id: 34, name: 'Chloe Anderson', initials: 'CA', major: 'Communication',       year: 'Sophomore', score: 58, stage: 'rejected', color: '#ef4444', is_standout: false, final_decision: 'rejected', preset_tally: { yes: 0, no: 2, maybe: 1 }, ai_summary: 'Responses show a surface-level understanding of social media without evidence of execution. No portfolio, no growth metrics, and no brand partnership context. Not ready for this cycle.' },
];

// ─── AI Score Badge ────────────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
    score >= 60 ? `bg-[${REACH_YELLOW}]/10 border-[${REACH_YELLOW}]/20` :
                  'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
  const textColor = score >= 80 ? '' : score >= 60 ? `text-[${REACH_YELLOW}]` : '';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${color} ${textColor}`}>
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
      className="absolute top-full right-0 mt-2 w-80 bg-[#152236] border border-white/[0.08] rounded-2xl p-5 shadow-2xl z-50"
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
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: i < c.weight ? REACH_YELLOW : 'rgba(255,255,255,0.1)' }}
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
      className="w-80 shrink-0 bg-[#152236] border border-white/[0.08] rounded-2xl flex flex-col self-start overflow-hidden"
      style={{ maxHeight: 'calc(100vh - 160px)' }}
    >
      {/* Standout banner */}
      {applicant.is_standout && (
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/[0.08] shrink-0" style={{ backgroundColor: `${REACH_YELLOW}15` }}>
          <Star className="w-3.5 h-3.5 shrink-0" style={{ color: REACH_YELLOW, fill: REACH_YELLOW }} />
          <span className="text-xs font-medium" style={{ color: REACH_YELLOW }}>AI Standout — worth keeping a close eye on</span>
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
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                applicant.tag === 'Accepted' ? 'bg-emerald-500/15 text-emerald-400' :
                applicant.tag === 'Top Pick' ? '' :
                'bg-blue-500/15 text-blue-400'
              }`}
              style={applicant.tag === 'Top Pick' ? { backgroundColor: `${REACH_YELLOW}22`, color: REACH_YELLOW } : {}}
            >
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
            <Sparkles className="w-3 h-3" style={{ color: REACH_YELLOW }} />
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
              const activeStyle = d === 'waitlisted' && isActive
                ? { backgroundColor: `${REACH_YELLOW}33`, borderColor: `${REACH_YELLOW}66`, color: REACH_YELLOW }
                : {};
              const activeClass =
                d === 'accepted'  ? (isActive ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : '') :
                d === 'waitlisted' ? (isActive ? '' : '') :
                                    (isActive ? 'bg-red-500/20 border-red-500/40 text-red-400' : '');
              const label = d === 'accepted' ? 'Accept' : d === 'waitlisted' ? 'Waitlist' : 'Reject';
              return (
                <button
                  key={d}
                  onClick={() => onDecision(isActive ? 'pending' : d)}
                  className={`py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                    isActive ? activeClass : 'bg-white/[0.03] border-white/[0.07] text-white/40 hover:text-white/70 hover:border-white/20'
                  }`}
                  style={activeStyle}
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
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#0D1B2E' }}>

      {/* Top bar */}
      <div className="border-b border-white/[0.06] px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="text-xs text-white/30 hover:text-white/60 transition-colors">← Back</button>
          <div className="w-px h-4 bg-white/[0.08]" />
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${REACH_YELLOW}20`, border: `1.5px solid ${REACH_YELLOW}40` }}
            >
              <Megaphone className="w-3.5 h-3.5" style={{ color: REACH_YELLOW }} />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">REACH</div>
              <div className="text-[10px] text-white/35">Fall 2025 Recruitment</div>
            </div>
          </div>
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border"
            style={{ backgroundColor: `${REACH_YELLOW}0D`, borderColor: `${REACH_YELLOW}33` }}
          >
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: REACH_YELLOW }} />
            <span className="text-[10px] font-semibold" style={{ color: REACH_YELLOW }}>Active</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Stats */}
          <div className="hidden sm:flex items-center divide-x divide-white/[0.06]">
            {[
              { label: 'Applicants', value: '34' },
              { label: 'Reviewing',  value: '8'  },
              { label: 'Interview',  value: '5'  },
              { label: 'Accepted',   value: '3'  },
              { label: 'Rejected',   value: '4'  },
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
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all"
              style={rubricOpen
                ? { backgroundColor: `${REACH_YELLOW}1A`, borderColor: `${REACH_YELLOW}4D`, color: REACH_YELLOW }
                : { borderColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }
              }
              onMouseEnter={e => { if (!rubricOpen) (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.7)'; }}
              onMouseLeave={e => { if (!rubricOpen) (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.4)'; }}
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
              className="flex items-center gap-2 px-4 py-1.5 rounded-full border"
              style={{ backgroundColor: `${REACH_YELLOW}0D`, borderColor: `${REACH_YELLOW}33` }}
            >
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: `${REACH_YELLOW}99` }} />
              <span className="text-[11px]" style={{ color: `${REACH_YELLOW}CC` }}>{HINTS[hintIndex]}</span>
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
                    {cards.map((a, i) => {
                      const isSelected = selected?.id === a.id;
                      return (
                        <motion.div
                          key={a.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.03, duration: 0.3 }}
                          onClick={() => handleCardClick(a)}
                          className="group rounded-xl p-3 cursor-pointer transition-all border"
                          style={{
                            backgroundColor: isSelected
                              ? `${REACH_YELLOW}0D`
                              : a.is_standout
                              ? 'rgba(255,255,255,0.03)'
                              : 'rgba(255,255,255,0.03)',
                            borderColor: isSelected
                              ? `${REACH_YELLOW}4D`
                              : a.is_standout
                              ? `${REACH_YELLOW}3D`
                              : 'rgba(255,255,255,0.07)',
                            boxShadow: a.is_standout && !isSelected ? `0 0 0 1px ${REACH_YELLOW}33` : 'none',
                          }}
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
                                  {a.is_standout && (
                                    <Star className="w-3 h-3 shrink-0" style={{ color: REACH_YELLOW, fill: REACH_YELLOW }} />
                                  )}
                                  <span className="text-[12px] font-semibold text-white truncate">{a.name}</span>
                                </div>
                                <div className="text-[10px] text-white/35">{a.year} · {a.major}</div>
                              </div>
                            </div>
                            <ChevronRight className="w-3 h-3 text-white/15 group-hover:text-white/40 mt-0.5 flex-shrink-0 transition-colors" />
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1">
                              <Sparkles
                                className="w-2.5 h-2.5"
                                style={{ color: a.score >= 80 ? '#34d399' : a.score >= 60 ? REACH_YELLOW : '#71717a' }}
                              />
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
                                <span
                                  className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${
                                    decisions[a.id] === 'accepted'  ? 'bg-emerald-500/15 text-emerald-400' :
                                    decisions[a.id] === 'rejected'  ? 'bg-red-500/15 text-red-400' : ''
                                  }`}
                                  style={decisions[a.id] === 'waitlisted'
                                    ? { backgroundColor: `${REACH_YELLOW}22`, color: REACH_YELLOW }
                                    : {}
                                  }
                                >
                                  {decisions[a.id]}
                                </span>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
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
    <div className="min-h-screen flex flex-col items-center justify-center px-6 relative" style={{ backgroundColor: '#0D1B2E' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="max-w-lg w-full text-center"
      >
        {/* Logo mark */}
        <div className="flex justify-center mb-8">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ backgroundColor: `${REACH_YELLOW}20`, border: `1.5px solid ${REACH_YELLOW}40` }}
          >
            <Megaphone className="w-7 h-7" style={{ color: REACH_YELLOW }} />
          </div>
        </div>

        <div
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border mb-10"
          style={{ borderColor: `${REACH_YELLOW}33`, backgroundColor: `${REACH_YELLOW}0D` }}
        >
          <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: REACH_YELLOW }} />
          <span className="text-[11px] font-semibold tracking-[0.15em] uppercase" style={{ color: REACH_YELLOW }}>
            REACH @ UCSD · UniCircle Demo
          </span>
        </div>

        <h1 className="font-display text-4xl sm:text-5xl font-bold text-white leading-[1.05] tracking-tight mb-5">
          Run REACH's entire recruitment<br className="hidden sm:block" /> pipeline in one place.
        </h1>

        <p className="text-white/45 text-base leading-relaxed mb-12 max-w-sm mx-auto">
          Stop juggling Google Forms, spreadsheets, and DMs. UniCircle organizes everything into one system — intake, AI review, and decisions.
        </p>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onEnter}
          className="inline-flex items-center gap-2.5 font-bold px-8 py-4 rounded-xl text-sm transition-colors"
          style={{ backgroundColor: REACH_YELLOW, color: '#0D1B2E' }}
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
