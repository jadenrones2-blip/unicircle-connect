import { Link } from 'react-router-dom';
import { ArrowRight, MapPin, Clock, Calendar, Users, Compass, Network } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PERKS = [
  {
    icon: Compass,
    title: 'Discover Your Community',
    body: 'Find clubs, orgs, and people that actually match your interests and goals.',
  },
  {
    icon: Network,
    title: 'Meet Your Co-Founders',
    body: 'SIC is where campus ideas get built. UniCircle is where builders find each other.',
  },
  {
    icon: Users,
    title: 'Scale Your Student Org',
    body: 'See the tools UCSD clubs use to run recruitment, events, and member ops.',
  },
];

const PROMPTS = [
  'What would you automate if you had an engineer for one day?',
  "What's one thing your org runs on a Google Form that should be a product?",
  'Who on your e-board spends hours on tasks a 10-line prompt could replace?',
];

export default function TablingLanding() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-zinc-100 relative overflow-hidden">
      {/* Ambient glows */}
      <div
        className="pointer-events-none absolute top-0 right-0 w-[500px] h-[500px]
                      bg-[radial-gradient(circle,rgba(124,58,237,0.18)_0%,transparent_70%)] -translate-y-1/4 translate-x-1/4"
      />
      <div
        className="pointer-events-none absolute bottom-0 left-0 w-[400px] h-[400px]
                      bg-[radial-gradient(circle,rgba(196,150,28,0.13)_0%,transparent_70%)] translate-y-1/4 -translate-x-1/4"
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.022) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.022) 1px,transparent 1px)',
          backgroundSize: '72px 72px',
        }}
      />

      {/* Top accent bar */}
      <div className="h-[3px] bg-gradient-to-r from-[#7C3AED] via-[hsl(43,74%,56%)] to-[#7C3AED]" />

      <div className="relative z-10 max-w-2xl mx-auto px-6 pt-14 pb-24">
        {/* Club chips */}
        <div className="flex items-center gap-3 flex-wrap mb-10">
          <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.09] rounded-full px-4 py-2">
            <span className="w-2 h-2 rounded-full bg-violet-400 flex-shrink-0" />
            <span className="text-sm font-semibold text-zinc-400">Startup Incubator Club</span>
          </div>
          <span className="text-zinc-700 font-bold">×</span>
          <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.09] rounded-full px-4 py-2">
            <span className="w-2 h-2 rounded-full bg-[hsl(43,74%,56%)] flex-shrink-0" />
            <span className="text-sm font-semibold text-zinc-400">UniCircle</span>
          </div>
        </div>

        {/* Eyebrow */}
        <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/25 rounded-full px-4 py-1.5 mb-5">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
          <span className="text-[11px] font-bold tracking-[0.14em] uppercase text-violet-400">
            Tabling Event · Library Walk · UCSD
          </span>
        </div>

        {/* Headline */}
        <h1 className="font-display text-5xl sm:text-6xl font-black leading-[0.95] mb-5 tracking-tight">
          THE CAMPUS
          <br />
          <span className="text-violet-400">IS UNFINISHED.</span>
        </h1>
        <p className="text-zinc-400 text-lg leading-relaxed mb-10">
          We're bringing together builders, org leaders, and founders-in-training at Library Walk.
          Come find your circle, see what's being built on campus, and connect with people who are
          actually doing things.
        </p>

        {/* Event details card */}
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6 mb-10 grid grid-cols-3 gap-4">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-zinc-700 mb-2 flex items-center gap-1.5">
              <Calendar className="w-3 h-3" /> Date
            </p>
            <p className="text-base font-bold text-violet-400">Wednesday</p>
            <p className="text-xs text-zinc-600 mt-0.5">May 14, 2026</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-zinc-700 mb-2 flex items-center gap-1.5">
              <Clock className="w-3 h-3" /> Time
            </p>
            <p className="text-base font-bold text-violet-400">2:00 PM</p>
            <p className="text-xs text-zinc-600 mt-0.5">Come anytime</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-zinc-700 mb-2 flex items-center gap-1.5">
              <MapPin className="w-3 h-3" /> Location
            </p>
            <p className="text-base font-bold text-zinc-100">Library Walk</p>
            <p className="text-xs text-zinc-600 mt-0.5">UC San Diego</p>
          </div>
        </div>

        {/* What you'll find */}
        <div className="mb-12">
          <p className="text-[10px] font-bold tracking-[0.16em] uppercase text-zinc-700 mb-4">
            What you'll find at the table
          </p>
          <div className="flex flex-col gap-3">
            {PERKS.map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="flex items-start gap-4 bg-white/[0.02] border border-white/[0.05] rounded-xl p-4"
              >
                <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon className="w-4 h-4 text-violet-400" />
                </div>
                <div>
                  <p className="font-semibold text-zinc-100 text-sm mb-0.5">{title}</p>
                  <p className="text-xs text-zinc-500 leading-relaxed">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Primary CTA */}
        <div
          className="bg-gradient-to-br from-violet-500/10 to-[hsl(43,74%,56%)]/5
                        border border-violet-500/20 rounded-2xl p-8 mb-10 text-center"
        >
          <h2 className="text-2xl font-bold text-zinc-100 mb-2">Create your UniCircle account</h2>
          <p className="text-sm text-zinc-500 mb-6 max-w-sm mx-auto">
            Discover clubs, connect with builders, and track everything happening on campus — all in
            one place.
          </p>
          <Link to="/signup">
            <Button className="h-13 px-10 text-base font-bold rounded-xl bg-violet-600 hover:bg-violet-500 transition-colors">
              Get Started — It's Free
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
          <p className="text-xs text-zinc-700 mt-4">
            Already have an account?{' '}
            <Link to="/login" className="text-violet-500 hover:text-violet-400">
              Sign in →
            </Link>
          </p>
        </div>

        {/* Lovable sponsor note — subtle, at the bottom */}
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl px-5 py-4 flex items-center gap-4 mb-12">
          <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center flex-shrink-0 text-base">
            ⚡
          </div>
          <div>
            <p className="text-xs font-semibold text-zinc-400">Supported by Lovable</p>
            <p className="text-xs text-zinc-600 mt-0.5">
              Attendees receive free Lovable AI credits — courtesy of our partners at Lovable.
            </p>
          </div>
        </div>

        {/* Building prompts */}
        <div className="border-t border-white/[0.05] pt-10">
          <p className="text-[10px] font-bold tracking-[0.16em] uppercase text-zinc-700 mb-5">
            Come with an answer to one of these
          </p>
          <div className="flex flex-col gap-4">
            {PROMPTS.map((q, i) => (
              <div key={i} className="flex items-start gap-3">
                <span
                  className="text-[10px] font-bold text-violet-500 bg-violet-500/10
                                 border border-violet-500/20 rounded px-2 py-1 flex-shrink-0 mt-0.5 tracking-widest"
                >
                  0{i + 1}
                </span>
                <p className="text-zinc-400 text-sm leading-relaxed">{q}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-14 pt-6 border-t border-white/[0.04] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[hsl(43,74%,56%)]" />
            <span className="text-xs font-bold tracking-widest text-zinc-700 uppercase">
              unicircle.app
            </span>
          </div>
          <p className="text-xs text-zinc-700">@unicircle.ucsd · @ucsd.sic</p>
        </div>
      </div>
    </div>
  );
}
