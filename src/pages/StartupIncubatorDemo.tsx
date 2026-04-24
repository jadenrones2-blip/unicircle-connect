import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Star, ChevronRight, ArrowRight, X,
  ThumbsUp, ThumbsDown, Minus, Rocket, Megaphone, Mail, Check, BookOpen,
} from 'lucide-react';

// ─── Constants ──────────────────────────────────────────────────────────────

const SI_COLOR = '#ffffff';

const STAGES = [
  { id: 'applied',    label: 'Applied',      color: '#6366f1' },
  { id: 'reviewing',  label: 'Under Review', color: '#f59e0b' },
  { id: 'interview',  label: 'Pitch Night',  color: '#3b82f6' },
  { id: 'accepted',   label: 'Accepted',     color: '#10b981' },
  { id: 'rejected',   label: 'Not Selected', color: '#ef4444' },
];

const RUBRIC_STRICT = [
  { label: 'Minimum GPA',  value: 'None required' },
  { label: 'Year',         value: 'All years welcome' },
  { label: 'Major',        value: 'All majors welcome' },
];

const RUBRIC_AI = [
  { criterion: 'Entrepreneurial mindset and passion for building',  weight: 5 },
  { criterion: 'Prior startup, project, or product experience',     weight: 5 },
  { criterion: 'Technical, business, or design skill set',          weight: 4 },
  { criterion: 'Team collaboration and communication',              weight: 3 },
  { criterion: 'Availability and commitment (5+ hrs/week)',         weight: 3 },
];

const FORM_QUESTIONS = [
  { id: 'q1', label: 'Why do you want to join the Startup Incubator?' },
  { id: 'q2', label: 'Describe a project or startup idea you\'ve worked on or want to build.' },
  { id: 'q3', label: 'What skills do you bring to the table? (technical, business, design, etc.)' },
  { id: 'q4', label: 'How many hours per week can you commit?' },
];

const HINTS = [
  'AI has scored all 28 applicants against your rubric',
  'Stars mark AI standouts — founders worth a closer look',
  'Click any applicant to review their pitch and vote',
];

const COMMS_FLOW = [
  {
    stage: 'applied',
    label: 'Application Received',
    trigger: 'Sent automatically on submission',
    preview: 'Hi [Name], we received your Startup Incubator application! Our team will review it and be in touch shortly. — Startup Incubator @ UCSD',
  },
  {
    stage: 'reviewing',
    label: 'Under Review',
    trigger: 'Sent when card is moved to Under Review',
    preview: 'Hi [Name], your application is currently under review by our team. We\'ll update you on next steps soon.',
  },
  {
    stage: 'interview',
    label: 'Pitch Night Invitation',
    trigger: 'Sent when card is moved to Pitch Night',
    preview: 'Hi [Name], congrats — you\'ve been invited to Startup Incubator Pitch Night! Come share your ideas and meet the team. Details to follow.',
  },
  {
    stage: 'accepted',
    label: 'Welcome to the Incubator',
    trigger: 'Sent when final decision is set to Accepted',
    preview: 'Hi [Name], we\'re excited to welcome you to the Startup Incubator @ UCSD! Check your email for onboarding details and next steps.',
  },
  {
    stage: 'rejected',
    label: 'Thank You for Applying',
    trigger: 'Sent when final decision is set to Not Selected',
    preview: 'Hi [Name], thank you for applying to the Startup Incubator. We had an incredibly competitive pool this cycle and won\'t be moving forward at this time. We encourage you to apply again next cycle.',
  },
];

function getSentComms(stage: string): string[] {
  const order = ['applied', 'reviewing', 'interview', 'accepted', 'rejected'];
  const stageIndex = order.indexOf(stage);
  if (stageIndex === -1) return ['applied'];
  if (stage === 'accepted') return ['applied', 'reviewing', 'interview', 'accepted'];
  if (stage === 'rejected') return ['applied', 'rejected'];
  return order.slice(0, stageIndex + 1);
}

// ─── Types ───────────────────────────────────────────────────────────────────

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

// ─── Applicant Data ──────────────────────────────────────────────────────────

const APPLICANTS: DemoApplicant[] = [
  // Applied × 12
  { id: 1,  name: 'Kevin Zhang',      initials: 'KZ', major: 'Computer Science',    year: 'Sophomore', score: 74, stage: 'applied',   color: '#6366f1', is_standout: false, final_decision: 'pending',  preset_tally: { yes: 0, no: 0, maybe: 0 }, ai_summary: 'Built a campus food delivery app with a small team. Execution track record is early but promising. Technical ability is strong — needs more evidence of business thinking and team leadership.' },
  { id: 2,  name: 'Priya Nair',       initials: 'PN', major: 'Business Economics',  year: 'Junior',    score: 70, stage: 'applied',   color: '#6366f1', is_standout: false, final_decision: 'pending',  preset_tally: { yes: 0, no: 1, maybe: 0 }, ai_summary: 'Interned at a VC firm last summer. Good market analysis instincts. Application lacks a concrete project or startup idea — primarily business experience without builder credentials yet.' },
  { id: 3,  name: 'Marcus Webb',      initials: 'MW', major: 'Cognitive Science',   year: 'Junior',    score: 68, stage: 'applied',   color: '#6366f1', is_standout: false, final_decision: 'pending',  preset_tally: { yes: 0, no: 0, maybe: 0 }, ai_summary: 'UX design background with freelance clients. Thoughtful product thinker but startup experience is light. Would be a strong designer resource inside a team but needs business context.' },
  { id: 4,  name: 'Ava Thompson',     initials: 'AT', major: 'Computer Science',    year: 'Freshman',  score: 65, stage: 'applied',   color: '#6366f1', is_standout: false, final_decision: 'pending',  preset_tally: { yes: 0, no: 0, maybe: 0 }, ai_summary: 'Passionate about AI and machine learning. No demonstrated startup experience yet — freshman year limits track record. Application shows intellectual curiosity. Revisit next cycle with a project.' },
  { id: 5,  name: 'Daniel Osei',      initials: 'DO', major: 'Global Health',       year: 'Junior',    score: 77, stage: 'applied',   color: '#6366f1', is_standout: false, final_decision: 'pending',  preset_tally: { yes: 1, no: 0, maybe: 0 }, ai_summary: 'Launched a nonprofit initiative that raised $12k for health clinics in Ghana. Execution and impact orientation are strong. Pivot to for-profit startup thinking would be a growth edge.', tag: 'Strong' },
  { id: 6,  name: 'Sophie Cheng',     initials: 'SC', major: 'MCS',                 year: 'Sophomore', score: 71, stage: 'applied',   color: '#6366f1', is_standout: false, final_decision: 'pending',  preset_tally: { yes: 0, no: 0, maybe: 1 }, ai_summary: 'Contributed to an open-source project with 800 GitHub stars. Strong technical depth. Application essay is vague on business ambitions — unclear what startup problem she wants to solve.' },
  { id: 7,  name: 'Eli Morales',      initials: 'EM', major: 'Economics',           year: 'Senior',    score: 73, stage: 'applied',   color: '#6366f1', is_standout: false, final_decision: 'pending',  preset_tally: { yes: 0, no: 0, maybe: 1 }, ai_summary: 'Sold handmade goods online via Etsy, scaled to $8k ARR. Bootstrapping experience and customer empathy are evident. Senior perspective brings maturity — limited runway in the program though.' },
  { id: 8,  name: 'Mia Johansson',    initials: 'MJ', major: 'Bioengineering',      year: 'Junior',    score: 69, stage: 'applied',   color: '#6366f1', is_standout: false, final_decision: 'pending',  preset_tally: { yes: 0, no: 1, maybe: 0 }, ai_summary: 'Research lab experience in synthetic biology. High scientific aptitude but no commercialization or business development experience. Gap between technical depth and startup readiness is significant.' },
  { id: 9,  name: 'Caleb Ross',       initials: 'CR', major: 'Business Economics',  year: 'Sophomore', score: 75, stage: 'applied',   color: '#6366f1', is_standout: false, final_decision: 'pending',  preset_tally: { yes: 1, no: 0, maybe: 0 }, ai_summary: 'Ran a campus merchandise brand for two semesters, reached profitability. Customer acquisition and operations instincts are impressive for his year. Solid pipeline candidate.' },
  { id: 10, name: 'Fatima Al-Hassan', initials: 'FA', major: 'Computer Science',    year: 'Junior',    score: 72, stage: 'applied',   color: '#6366f1', is_standout: false, final_decision: 'pending',  preset_tally: { yes: 0, no: 0, maybe: 1 }, ai_summary: 'Co-built a tutoring marketplace prototype with a classmate. MVP shipped but user traction was limited. Good first step at product thinking — execution speed is a question mark.' },
  { id: 11, name: 'Tyler Nguyen',     initials: 'TN', major: 'Mechanical Engineering', year: 'Junior', score: 66, stage: 'applied',   color: '#6366f1', is_standout: false, final_decision: 'pending',  preset_tally: { yes: 0, no: 0, maybe: 0 }, ai_summary: 'Hardware hacker with robotics competition experience. Strong builder instincts but application does not connect technical projects to startup or commercial opportunities.' },
  { id: 12, name: 'Jess Park',        initials: 'JP', major: 'Communication',       year: 'Sophomore', score: 63, stage: 'applied',   color: '#6366f1', is_standout: false, final_decision: 'pending',  preset_tally: { yes: 0, no: 1, maybe: 0 }, ai_summary: 'Interested in media startups and content platforms. Application is enthusiastic but short on specifics. No demonstrated product, project, or business experience to evaluate yet.' },

  // Under Review × 7
  { id: 13, name: 'Arjun Kapoor',    initials: 'AK', major: 'Computer Science',    year: 'Senior',    score: 83, stage: 'reviewing', color: '#f59e0b', is_standout: false, final_decision: 'pending',  preset_tally: { yes: 2, no: 0, maybe: 1 }, ai_summary: 'Co-founded a SaaS analytics tool used by 3 UCSD student orgs. Technical architecture and product ownership are both evident. Strong recommend — senior timeline may limit full program participation.', tag: 'Strong' },
  { id: 14, name: 'Leila Rashidi',   initials: 'LR', major: 'Business Economics',  year: 'Junior',    score: 80, stage: 'reviewing', color: '#f59e0b', is_standout: false, final_decision: 'pending',  preset_tally: { yes: 2, no: 0, maybe: 0 }, ai_summary: 'Pitched at UCSD\'s annual business plan competition — placed top 5. Market research and pitch deck quality are both strong. Business acumen well above average for a junior.' },
  { id: 15, name: 'Noah Kim',        initials: 'NK', major: 'MCS',                 year: 'Sophomore', score: 78, stage: 'reviewing', color: '#f59e0b', is_standout: false, final_decision: 'pending',  preset_tally: { yes: 1, no: 0, maybe: 1 }, ai_summary: 'Built a chrome extension that automates UCSD course registration — 400+ active users. Product instincts and execution are both strong. User acquisition without any marketing is especially impressive.' },
  { id: 16, name: 'Sara Okonkwo',    initials: 'SO', major: 'Global Policy',       year: 'Junior',    score: 76, stage: 'reviewing', color: '#f59e0b', is_standout: false, final_decision: 'pending',  preset_tally: { yes: 1, no: 0, maybe: 1 }, ai_summary: 'Developed a climate tech policy proposal that won a national student competition. Systems thinking and mission-driven approach are strong. Unclear on technical or product path — advance to assess fit.' },
  { id: 17, name: 'Ben Nakamura',    initials: 'BN', major: 'Electrical Engineering', year: 'Senior',  score: 81, stage: 'reviewing', color: '#f59e0b', is_standout: false, final_decision: 'pending',  preset_tally: { yes: 2, no: 0, maybe: 0 }, ai_summary: 'Filed a provisional patent for a wireless charging innovation. Deep technical domain expertise. Needs business co-founder mindset development but raw inventor credibility is compelling.', tag: 'Strong' },
  { id: 18, name: 'Zoe Martinez',    initials: 'ZM', major: 'Design',              year: 'Junior',    score: 74, stage: 'reviewing', color: '#f59e0b', is_standout: false, final_decision: 'pending',  preset_tally: { yes: 1, no: 1, maybe: 0 }, ai_summary: 'Freelance product designer with 6 startup clients. Understands founder pain points from direct client work. Business model thinking is still developing — design-led but not yet strategy-led.' },
  { id: 19, name: 'Dante Lewis',     initials: 'DL', major: 'Computer Science',    year: 'Junior',    score: 79, stage: 'reviewing', color: '#f59e0b', is_standout: false, final_decision: 'pending',  preset_tally: { yes: 1, no: 0, maybe: 1 }, ai_summary: 'Grew a programming Discord community to 2.1k members and monetized with a paid cohort course. Community-led growth and creator economy instincts are unique differentiators.' },

  // Pitch Night × 5
  {
    id: 20, name: 'Maya Patel', initials: 'MP', major: 'Computer Science', year: 'Junior',
    score: 94, stage: 'interview', color: '#3b82f6', tag: 'Top Pick', is_standout: true,
    final_decision: 'pending', preset_tally: { yes: 3, no: 0, maybe: 0 },
    ai_summary: 'Co-founded a mental health app that reached 1,200 active users before pivoting. Led engineering and product — raised $15k in non-dilutive grants. Exceptional execution track record and founder mindset. Top candidate this cycle.',
    responses: {
      q1: "I've been building for two years and I want to be around people who take that as seriously as I do. The Incubator is where I can pressure-test my next idea before spending another year on the wrong thing.",
      q2: 'MindBridge — a peer mental health matching app. We hit 1,200 users in 3 months, secured $15k in grants, then pivoted after realizing the core loop wasn\'t sticky. The pivot taught me more than the launch.',
      q3: 'Full-stack engineering (React, Node, Postgres), product strategy, and user research. I can move from zero to deployed MVP in a weekend.',
      q4: '10–12 hours. This is my main extracurricular — I treat it like a part-time job.',
    },
  },
  {
    id: 21, name: 'James Obi', initials: 'JO', major: 'Business Economics', year: 'Senior',
    score: 89, stage: 'interview', color: '#3b82f6', tag: 'Strong', is_standout: true,
    final_decision: 'pending', preset_tally: { yes: 3, no: 0, maybe: 0 },
    ai_summary: 'Launched a B2B SaaS tool for student org treasurers — currently at $400 MRR. Identified a real pain point and charged from day one. Strong commercial instincts and execution discipline. Advance confidently.',
    responses: {
      q1: 'I already have a product with paying customers. I\'m looking for structured feedback, a network of operators, and access to the mentors the Incubator connects founders with.',
      q2: 'TreasuryOS — finance automation for student org treasurers. 12 paying orgs, $400 MRR. Roadmap includes multi-org billing and bank integrations.',
      q3: 'Sales, financial modeling, customer discovery. I find my first customers before I write the first line of code.',
      q4: '8 hours minimum. Product is already live so I can be selective about where I invest time.',
    },
  },
  {
    id: 22, name: 'Lin Chen', initials: 'LC', major: 'MCS', year: 'Junior',
    score: 86, stage: 'interview', color: '#3b82f6', tag: 'Strong', is_standout: true,
    final_decision: 'pending', preset_tally: { yes: 2, no: 0, maybe: 1 },
    ai_summary: 'Built and shipped two iOS apps — one reached #12 in the App Store productivity chart. Self-taught in mobile development. Creative ideation and shipping velocity are exceptional. Needs business model depth.',
    responses: {
      q1: "I ship fast but I've been building in a vacuum. I want structured feedback on whether I'm solving real problems and access to people who've built businesses, not just products.",
      q2: 'FocusBlocks — a time-blocking app that hit #12 in App Store productivity. 80k downloads, $0 revenue. That last part is what I\'m working to fix.',
      q3: 'iOS development, rapid prototyping, and user retention mechanics. Weakest in pricing and monetization strategy — actively working on it.',
      q4: '6–8 hours. I also maintain two live apps so my time is split but intentional.',
    },
  },
  {
    id: 23, name: 'Anika Sharma', initials: 'AS', major: 'Bioengineering', year: 'Junior',
    score: 84, stage: 'interview', color: '#3b82f6', is_standout: true,
    final_decision: 'pending', preset_tally: { yes: 2, no: 0, maybe: 1 },
    ai_summary: 'Developing a low-cost diagnostic device with a faculty advisor — two provisional patents pending. Rare combination of deep scientific credibility and commercialization ambition. Advance to assess team-building skills.',
    responses: {
      q1: 'My work lives in a lab. I want to build the business muscle to bring it out of the lab and into the world.',
      q2: 'A portable diagnostic strip for early-stage sepsis detection. Two patents pending. Working with a faculty advisor on FDA pathway.',
      q3: 'Biochemical engineering, regulatory research, and scientific writing. Zero sales experience — that\'s exactly why I\'m here.',
      q4: '5–6 hours. Research is my primary commitment but I protect time for the business side.',
    },
  },
  {
    id: 24, name: 'Ravi Gupta', initials: 'RG', major: 'Computer Science', year: 'Sophomore',
    score: 88, stage: 'interview', color: '#3b82f6', tag: 'Strong', is_standout: true,
    final_decision: 'pending', preset_tally: { yes: 3, no: 0, maybe: 0 },
    ai_summary: 'Sophomore who won UCSD\'s hackathon three times and shipped a B2C fintech tool with 300 users in 6 weeks. Exceptional velocity for his year. Coachability and long runway make him one of the highest-upside candidates.',
    responses: {
      q1: "I've proven I can build fast. Now I want to learn how to build the right thing. The Incubator has the mentors who can teach me what hackathons can't.",
      q2: 'SplitWise for roommate utilities — 300 users in 6 weeks, no marketing. Won 3 hackathons last year. Current idea: AI-powered lease review tool for college students.',
      q3: 'Full-stack development, rapid prototyping, pitching. I can ship a working MVP in 72 hours and present it the same day.',
      q4: '10+ hours. I treat side projects as seriously as my coursework — usually more seriously.',
    },
  },

  // Accepted × 2
  {
    id: 25, name: 'Diana Wu', initials: 'DW', major: 'Computer Science', year: 'Senior',
    score: 96, stage: 'accepted', color: '#10b981', tag: 'Top Pick', is_standout: true,
    final_decision: 'accepted', preset_tally: { yes: 3, no: 0, maybe: 0 },
    ai_summary: 'Founded a legal tech startup now generating $2.1k MRR with two enterprise pilots in progress. Led product, fundraising, and sales. The strongest all-around founder we have seen this cycle.',
    responses: {
      q1: 'I want the Incubator\'s network for my Series A prep and to give back by mentoring the next generation of UCSD founders.',
      q2: 'ClauseAI — contract review automation for small law firms. $2.1k MRR, 2 enterprise pilots, exploring seed raise.',
      q3: 'Full-stack, GTM strategy, investor relations. I\'ve closed 4 paying clients and pitched 12 VCs.',
      q4: '6 hours. Company comes first but I protect dedicated Incubator time.',
    },
  },
  {
    id: 26, name: 'Chris Adeyemi', initials: 'CA', major: 'Business Economics', year: 'Junior',
    score: 91, stage: 'accepted', color: '#10b981', tag: 'Strong', is_standout: true,
    final_decision: 'accepted', preset_tally: { yes: 3, no: 0, maybe: 0 },
    ai_summary: 'Built and exited a campus print-on-demand business (sold to a classmate for $3k). Now building a B2B gifting platform. Serial builder with clear commercial instincts and a bias for action.',
    responses: {
      q1: 'I\'ve sold one business and I\'m building another. I want rigorous feedback from people who\'ve done it at scale.',
      q2: 'Currently building GiftDrop — a B2B employee gifting platform targeting startups. Pre-launch, 3 LOIs signed.',
      q3: 'Operations, sales, and supplier management. I can sell and run a business. Still developing technical knowledge.',
      q4: '8 hours. This is my main priority outside class.',
    },
  },

  // Rejected × 2
  { id: 27, name: 'Sam Torres',    initials: 'ST', major: 'History',              year: 'Junior', score: 42, stage: 'rejected', color: '#ef4444', is_standout: false, final_decision: 'rejected', preset_tally: { yes: 0, no: 3, maybe: 0 }, ai_summary: 'Application expresses general interest in entrepreneurship without demonstrating any concrete project, business, or execution experience. Rubric criteria not met across the board. Does not advance.' },
  { id: 28, name: 'Amy Ford',      initials: 'AF', major: 'Political Science',    year: 'Sophomore', score: 38, stage: 'rejected', color: '#ef4444', is_standout: false, final_decision: 'rejected', preset_tally: { yes: 0, no: 3, maybe: 0 }, ai_summary: 'Essay focuses on wanting to \'learn about startups\' without any demonstrated initiative, project, or builder experience. Interest is genuine but not yet actionable at the Incubator level.' },
];

// ─── Sub-components ──────────────────────────────────────────────────────────

function ScoreBadge({ score, is_standout }: { score: number; is_standout: boolean }) {
  const color = score >= 85 ? '#10b981' : score >= 70 ? '#f59e0b' : '#ef4444';
  return (
    <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full"
      style={{ background: color + '22', color }}>
      {is_standout && <Star className="w-2.5 h-2.5 fill-current" />}
      {score}
    </span>
  );
}

function VoteButton({ icon: Icon, label, active, color, onClick }: {
  icon: React.ElementType; label: string; active: boolean; color: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all"
      style={active
        ? { background: color + '22', borderColor: color + '66', color }
        : { background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)', color: '#71717a' }}
    >
      <Icon className="w-3.5 h-3.5" /> {label}
    </button>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function StartupIncubatorDemo() {
  const [applicants, setApplicants] = useState<DemoApplicant[]>(APPLICANTS);
  const [selected, setSelected] = useState<DemoApplicant | null>(null);
  const [votes, setVotes] = useState<Record<number, Vote>>({});
  const [activeTab, setActiveTab] = useState<'pipeline' | 'rubric' | 'form' | 'comms'>('pipeline');
  const [hintIndex, setHintIndex] = useState(0);

  const handleVote = (id: number, v: Vote) => {
    setVotes(prev => ({ ...prev, [id]: prev[id] === v ? null : v }));
  };

  const handleMove = (id: number, newStage: string) => {
    setApplicants(prev => prev.map(a => a.id === id ? { ...a, stage: newStage } : a));
    setSelected(prev => prev && prev.id === id ? { ...prev, stage: newStage } : prev);
  };

  const stageApplicants = (stageId: string) => applicants.filter(a => a.stage === stageId);

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>

      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/6">
        <div className="flex items-center gap-3">
          <img src="https://startupincubatorsd.com/SIClogo.jpg" alt="SIC" className="w-8 h-8 rounded-lg object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          <div>
            <p className="text-sm font-semibold text-white leading-none">Startup Incubator @ UCSD</p>
            <p className="text-xs text-zinc-500 mt-0.5">Spring 2026 Recruitment</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-500 bg-white/5 border border-white/8 rounded-full px-3 py-1">Demo Mode</span>
          <Link to="/" className="text-xs text-zinc-400 hover:text-white transition-colors">← Back to UniCircle</Link>
        </div>
      </div>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <div className="px-6 pt-10 pb-8 max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/20 text-xs font-medium mb-5 text-zinc-400">
            AI-Powered Recruitment Pipeline
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-3 leading-tight">
            Turn your Problems<br />into Companies.
          </h1>
          <p className="text-zinc-400 text-lg max-w-xl">
            Everything your team needs to find the next generation of UCSD founders — all in one place.
          </p>
        </motion.div>
      </div>

      {/* ── Stats ───────────────────────────────────────────────────────────── */}
      <div className="px-6 pb-8 max-w-6xl mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Applicants', value: '28' },
            { label: 'AI Standouts', value: applicants.filter(a => a.is_standout).length.toString() },
            { label: 'At Pitch Night', value: stageApplicants('interview').length.toString() },
            { label: 'Accepted', value: stageApplicants('accepted').length.toString() },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
              <p className="text-2xl font-bold text-white">{s.value}</p>
              <p className="text-xs text-zinc-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────────── */}
      <div className="px-6 max-w-6xl mx-auto">
        <div className="flex gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/8 w-fit mb-6">
          {[
            { id: 'pipeline', label: 'Pipeline', icon: Rocket },
            { id: 'rubric',   label: 'AI Rubric', icon: Star },
            { id: 'form',     label: 'Application Form', icon: BookOpen },
            { id: 'comms',    label: 'Comms', icon: Megaphone },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={activeTab === tab.id
                ? { background: '#ffffff', color: '#000' }
                : { color: '#71717a' }}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Pipeline Tab ──────────────────────────────────────────────────── */}
        {activeTab === 'pipeline' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* Hint bar */}
            <div
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-white/8 bg-white/[0.02] mb-5 cursor-pointer select-none"
              onClick={() => setHintIndex(i => (i + 1) % HINTS.length)}
            >
              <p className="text-sm text-zinc-400">{HINTS[hintIndex]}</p>
              <ChevronRight className="w-3.5 h-3.5 text-zinc-600 ml-auto flex-shrink-0" />
            </div>

            {/* Kanban */}
            <div className="overflow-x-auto pb-6">
              <div className="flex gap-4" style={{ minWidth: 900 }}>
                {STAGES.map(stage => {
                  const cards = stageApplicants(stage.id);
                  return (
                    <div key={stage.id} className="flex-1 min-w-[170px]">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: stage.color }} />
                        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">{stage.label}</span>
                        <span className="ml-auto text-xs text-zinc-600 bg-white/5 rounded-full px-1.5">{cards.length}</span>
                      </div>
                      <div className="space-y-2">
                        {cards.map(a => (
                          <motion.div
                            key={a.id}
                            layoutId={`card-${a.id}`}
                            onClick={() => setSelected(a)}
                            className="rounded-xl border border-white/8 bg-white/[0.03] p-3 cursor-pointer hover:border-white/20 hover:bg-white/[0.05] transition-all"
                          >
                            <div className="flex items-center gap-2 mb-1.5">
                              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                                style={{ background: a.color + '22', color: a.color }}>
                                {a.initials}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-white truncate">{a.name}</p>
                                <p className="text-[10px] text-zinc-500 truncate">{a.year}</p>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-zinc-600 truncate">{a.major}</span>
                              <ScoreBadge score={a.score} is_standout={a.is_standout} />
                            </div>
                            {a.tag && (
                              <span className="inline-block mt-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
                                style={{ background: stage.color + '22', color: stage.color }}>
                                {a.tag}
                              </span>
                            )}
                          </motion.div>
                        ))}
                        {cards.length === 0 && (
                          <div className="rounded-xl border border-dashed border-white/8 p-4 text-center">
                            <p className="text-xs text-zinc-700">Empty</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Rubric Tab ────────────────────────────────────────────────────── */}
        {activeTab === 'rubric' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl space-y-5 pb-10">
            <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-6">
              <h3 className="text-sm font-semibold text-zinc-300 mb-4">Hard Filters</h3>
              <div className="space-y-3">
                {RUBRIC_STRICT.map(r => (
                  <div key={r.label} className="flex items-center justify-between">
                    <span className="text-sm text-zinc-500">{r.label}</span>
                    <span className="text-sm font-medium text-white">{r.value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-6">
              <h3 className="text-sm font-semibold text-zinc-300 mb-4">AI Scoring Criteria</h3>
              <div className="space-y-4">
                {RUBRIC_AI.map(r => (
                  <div key={r.criterion}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm text-zinc-300">{r.criterion}</span>
                      <span className="text-xs text-zinc-500">Weight {r.weight}/5</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${(r.weight / 5) * 100}%`, background: SI_COLOR }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Form Tab ──────────────────────────────────────────────────────── */}
        {activeTab === 'form' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl pb-10">
            <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-6 space-y-5">
              <h3 className="text-sm font-semibold text-zinc-300">Application Questions</h3>
              <p className="text-xs text-zinc-500 -mt-2">Your custom form — students see these after filling in their basic info.</p>
              <div className="space-y-4">
                {FORM_QUESTIONS.map((q, i) => (
                  <div key={q.id} className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
                    <p className="text-xs text-zinc-500 mb-1">Q{i + 1}</p>
                    <p className="text-sm text-white">{q.label}</p>
                    <div className="mt-3 h-16 rounded-lg border border-dashed border-white/8 bg-white/[0.02]" />
                  </div>
                ))}
              </div>
              <div className="pt-2">
                <button
                  className="w-full py-2.5 rounded-xl text-sm font-semibold text-zinc-900 transition-colors"
                  style={{ background: SI_COLOR }}
                >
                  Submit Application
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Comms Tab ─────────────────────────────────────────────────────── */}
        {activeTab === 'comms' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl space-y-3 pb-10">
            <p className="text-xs text-zinc-500 mb-4">Every email fires automatically — no manual follow-ups needed.</p>
            {COMMS_FLOW.map(c => {
              const stage = STAGES.find(s => s.id === c.stage);
              return (
                <div key={c.stage} className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Mail className="w-3.5 h-3.5 text-zinc-500" />
                    <span className="text-sm font-semibold text-white">{c.label}</span>
                    <span className="ml-auto text-xs px-2 py-0.5 rounded-full"
                      style={{ background: (stage?.color || '#6366f1') + '22', color: stage?.color || '#6366f1' }}>
                      {stage?.label}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 mb-3">{c.trigger}</p>
                  <div className="rounded-lg border border-white/8 bg-white/[0.02] p-3">
                    <p className="text-xs text-zinc-400 italic">"{c.preview}"</p>
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}
      </div>

      {/* ── CTA ─────────────────────────────────────────────────────────────── */}
      <div className="px-6 py-12 max-w-6xl mx-auto">
        <div className="rounded-2xl border border-white/8 p-8 text-center bg-white/[0.02]">
          <h2 className="text-2xl font-bold text-white mb-2">Ready to run your recruitment here?</h2>
          <p className="text-zinc-400 mb-6">Set up takes less than 10 minutes. We'll walk you through it.</p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link to="/club-admin/request">
              <button className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-zinc-900 bg-gold hover:bg-gold/90 transition-colors">
                Get Started <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
            <Link to="/clubs">
              <button className="px-6 py-3 rounded-xl text-sm font-semibold text-zinc-300 border border-white/10 hover:bg-white/5 transition-colors">
                Explore UniCircle
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Applicant Drawer ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40"
              onClick={() => setSelected(null)}
            />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed right-0 top-0 h-full w-full max-w-lg z-50 overflow-y-auto"
              style={{ background: '#111118', borderLeft: '1px solid rgba(255,255,255,0.08)' }}
            >
              <div className="p-6 space-y-5">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold"
                      style={{ background: (STAGES.find(s => s.id === selected.stage)?.color || SI_COLOR) + '22', color: STAGES.find(s => s.id === selected.stage)?.color || SI_COLOR }}>
                      {selected.initials}
                    </div>
                    <div>
                      <p className="font-semibold text-white">{selected.name}</p>
                      <p className="text-xs text-zinc-500">{selected.major} · {selected.year}</p>
                    </div>
                  </div>
                  <button onClick={() => setSelected(null)} className="text-zinc-500 hover:text-white transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Score */}
                <div className="flex items-center gap-3 p-4 rounded-xl border border-white/8 bg-white/[0.02]">
                  <ScoreBadge score={selected.score} is_standout={selected.is_standout} />
                  <div className="flex-1">
                    <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${selected.score}%`, background: selected.score >= 85 ? '#10b981' : selected.score >= 70 ? '#f59e0b' : '#ef4444' }} />
                    </div>
                  </div>
                  {selected.is_standout && (
                    <span className="text-xs font-semibold text-yellow-400 flex items-center gap-1">
                      <Star className="w-3 h-3 fill-current" /> Standout
                    </span>
                  )}
                </div>

                {/* AI Summary */}
                <div className="p-4 rounded-xl border border-white/8 bg-white/[0.02]">
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">AI Summary</p>
                  <p className="text-sm text-zinc-300 leading-relaxed">{selected.ai_summary}</p>
                </div>

                {/* Responses */}
                {selected.responses && (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Application Responses</p>
                    {FORM_QUESTIONS.map(q => (
                      <div key={q.id} className="p-4 rounded-xl border border-white/8 bg-white/[0.02]">
                        <p className="text-xs text-zinc-500 mb-1.5">{q.label}</p>
                        <p className="text-sm text-zinc-200">{selected.responses?.[q.id as keyof Responses]}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Vote */}
                <div>
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Your Vote</p>
                  <div className="flex gap-2">
                    <VoteButton icon={ThumbsUp}   label="Yes"   active={votes[selected.id] === 'yes'}   color="#10b981" onClick={() => handleVote(selected.id, 'yes')} />
                    <VoteButton icon={Minus}       label="Maybe" active={votes[selected.id] === 'maybe'} color="#f59e0b" onClick={() => handleVote(selected.id, 'maybe')} />
                    <VoteButton icon={ThumbsDown}  label="No"    active={votes[selected.id] === 'no'}    color="#ef4444" onClick={() => handleVote(selected.id, 'no')} />
                  </div>
                </div>

                {/* Team tally */}
                <div className="p-4 rounded-xl border border-white/8 bg-white/[0.02]">
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Team Votes</p>
                  <div className="flex gap-4">
                    {[
                      { label: 'Yes', count: selected.preset_tally.yes + (votes[selected.id] === 'yes' ? 1 : 0), color: '#10b981' },
                      { label: 'Maybe', count: selected.preset_tally.maybe + (votes[selected.id] === 'maybe' ? 1 : 0), color: '#f59e0b' },
                      { label: 'No', count: selected.preset_tally.no + (votes[selected.id] === 'no' ? 1 : 0), color: '#ef4444' },
                    ].map(t => (
                      <div key={t.label} className="flex-1 text-center">
                        <p className="text-xl font-bold" style={{ color: t.color }}>{t.count}</p>
                        <p className="text-xs text-zinc-600">{t.label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Move stage */}
                <div>
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Move to Stage</p>
                  <div className="flex flex-wrap gap-2">
                    {STAGES.filter(s => s.id !== selected.stage).map(s => (
                      <button
                        key={s.id}
                        onClick={() => handleMove(selected.id, s.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all hover:opacity-90"
                        style={{ background: s.color + '15', borderColor: s.color + '40', color: s.color }}
                      >
                        <Check className="w-3 h-3" /> {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Comms sent */}
                <div>
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Emails Sent</p>
                  <div className="space-y-2">
                    {COMMS_FLOW.map(c => {
                      const sent = getSentComms(selected.stage).includes(c.stage);
                      return (
                        <div key={c.stage} className="flex items-center gap-3">
                          <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ background: sent ? '#10b98122' : 'rgba(255,255,255,0.04)', border: `1px solid ${sent ? '#10b98144' : 'rgba(255,255,255,0.08)'}` }}>
                            {sent && <Check className="w-2.5 h-2.5 text-emerald-400" />}
                          </div>
                          <span className="text-xs" style={{ color: sent ? '#d4d4d8' : '#52525b' }}>{c.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
