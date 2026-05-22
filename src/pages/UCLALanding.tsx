import { Link } from 'react-router-dom';
import { ArrowRight, Users, Calendar, Zap, Flag, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

const UCLA_BLUE = '#2774AE';
const UCLA_GOLD = '#FFD100';

const FEATURES = [
  {
    icon: Users,
    title: 'Club Directory',
    body: 'Every UCLA student org in one place — searchable, filterable, and linked to their real events.',
  },
  {
    icon: Calendar,
    title: 'Campus Events',
    body: "See what's happening this week across all clubs. RSVP, get reminders, never miss free food.",
  },
  {
    icon: Zap,
    title: 'AI-Powered Discovery',
    body: 'Tell us your interests once. We surface the clubs and events that actually match you.',
  },
  {
    icon: Flag,
    title: 'Club Admin Tools',
    body: "Run your club's recruitment pipeline, manage members, and message applicants — all in one portal.",
  },
];

export default function UCLALanding() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-zinc-100 overflow-hidden">
      {/* ── Ambient glows ── */}
      <div className="pointer-events-none fixed top-0 left-0 w-full h-full overflow-hidden">
        <div
          className="absolute top-0 right-0 w-[600px] h-[600px] -translate-y-1/3 translate-x-1/4 rounded-full"
          style={{ background: `radial-gradient(circle, ${UCLA_BLUE}22 0%, transparent 70%)` }}
        />
        <div
          className="absolute bottom-0 left-0 w-[500px] h-[500px] translate-y-1/3 -translate-x-1/4 rounded-full"
          style={{ background: `radial-gradient(circle, ${UCLA_GOLD}18 0%, transparent 70%)` }}
        />
      </div>

      {/* ── Top bar ── */}
      <div
        className="h-[3px]"
        style={{ background: `linear-gradient(90deg, ${UCLA_BLUE}, ${UCLA_GOLD}, ${UCLA_BLUE})` }}
      />

      {/* ── Nav ── */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 max-w-5xl mx-auto">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm"
            style={{ background: UCLA_BLUE, color: '#fff' }}
          >
            U
          </div>
          <div>
            <span className="font-bold text-white text-sm">UniCircle</span>
            <span className="text-xs text-zinc-600 ml-1.5">for UCLA</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login" className="text-sm text-zinc-500 hover:text-white transition-colors">
            Sign in
          </Link>
          <Link to="/signup">
            <Button
              size="sm"
              className="font-bold rounded-xl text-black"
              style={{ background: UCLA_GOLD }}
            >
              Join Free
            </Button>
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 pt-16 pb-20 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* University badge */}
          <div
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-6 text-xs font-bold tracking-widest uppercase"
            style={{
              background: `${UCLA_BLUE}18`,
              border: `1px solid ${UCLA_BLUE}35`,
              color: UCLA_BLUE,
            }}
          >
            🐻 UC Los Angeles
          </div>

          <h1 className="font-display text-5xl sm:text-7xl font-black leading-[0.92] tracking-tight mb-6 text-white">
            YOUR CAMPUS.
            <br />
            <span style={{ color: UCLA_GOLD }}>YOUR CIRCLE.</span>
          </h1>

          <p className="text-zinc-400 text-lg max-w-xl mx-auto mb-10 leading-relaxed">
            UniCircle is the platform UCLA students use to discover clubs, find their people, and
            never miss what's happening on campus.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/signup">
              <Button
                className="h-13 px-8 text-base font-bold rounded-xl text-black"
                style={{ background: UCLA_GOLD }}
              >
                Join as a UCLA Student
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link to="/club-admin/request">
              <Button
                variant="outline"
                className="h-13 px-8 text-base font-semibold rounded-xl border-white/10 text-zinc-300 hover:bg-white/5"
              >
                Claim Your Club Page
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>

      {/* ── Featured Club: Girls Into VC ── */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 mb-20">
        <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-zinc-600 mb-4">
          First on UniCircle at UCLA
        </p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-2xl border overflow-hidden"
          style={{
            borderColor: `${UCLA_BLUE}30`,
            background: `linear-gradient(135deg, ${UCLA_BLUE}10, ${UCLA_GOLD}06)`,
          }}
        >
          <div className="p-6 sm:p-8 flex flex-col sm:flex-row items-start gap-6">
            {/* Avatar */}
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black flex-shrink-0 text-white"
              style={{ background: UCLA_BLUE }}
            >
              G
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h3 className="text-xl font-bold text-white">Girls Into VC at UCLA</h3>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{
                    background: `${UCLA_GOLD}20`,
                    color: UCLA_GOLD,
                    border: `1px solid ${UCLA_GOLD}30`,
                  }}
                >
                  Recruiting
                </span>
              </div>
              <p className="text-sm text-zinc-500 mb-1">Professional · UC Los Angeles</p>
              <p className="text-sm text-zinc-400 leading-relaxed max-w-lg">
                Empowering women and underrepresented students to break into venture capital, tech
                investing, and startups. Connecting members with industry professionals and building
                the next generation of investors.
              </p>
              <div className="flex items-center gap-4 mt-4">
                <a
                  href="https://www.instagram.com/girlsintovc.ucla/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-zinc-500 hover:text-white transition-colors flex items-center gap-1"
                >
                  @girlsintovc.ucla <ChevronRight className="w-3 h-3" />
                </a>
                <a
                  href="https://www.linkedin.com/company/girls-into-vc-at-ucla/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-zinc-500 hover:text-white transition-colors flex items-center gap-1"
                >
                  LinkedIn <ChevronRight className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── Features ── */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 mb-20">
        <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-zinc-600 mb-4">
          What you get
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {FEATURES.map(({ icon: Icon, title, body }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.07 }}
              className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5"
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
                style={{ background: `${UCLA_BLUE}15`, border: `1px solid ${UCLA_BLUE}30` }}
              >
                <Icon className="w-4 h-4" style={{ color: UCLA_BLUE }} />
              </div>
              <h4 className="font-semibold text-white text-sm mb-1">{title}</h4>
              <p className="text-xs text-zinc-500 leading-relaxed">{body}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── CTA ── */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 mb-20">
        <div
          className="rounded-2xl p-8 sm:p-12 text-center"
          style={{
            background: `linear-gradient(135deg, ${UCLA_BLUE}15, ${UCLA_GOLD}08)`,
            border: `1px solid ${UCLA_BLUE}25`,
          }}
        >
          <h2 className="font-display text-3xl sm:text-4xl font-black text-white mb-3">
            Is your club on UniCircle?
          </h2>
          <p className="text-zinc-400 mb-8 max-w-md mx-auto text-sm leading-relaxed">
            Claim your club's page, manage recruitment, message students, and post events — all in
            one place. Free for all UCLA student organizations.
          </p>
          <Link to="/club-admin/request">
            <Button
              className="h-12 px-8 font-bold rounded-xl text-black text-base"
              style={{ background: UCLA_GOLD }}
            >
              Claim Your Club →
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 pb-16 flex items-center justify-between border-t border-white/[0.04] pt-8">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: UCLA_GOLD }} />
          <span className="text-xs font-bold tracking-widest uppercase text-zinc-700">
            unicircle.app
          </span>
        </div>
        <p className="text-xs text-zinc-700">Also at UCSD · Expanding to more campuses</p>
      </div>
    </div>
  );
}
