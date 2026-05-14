import { useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowRight, Calendar, Clock, MapPin, Camera, Utensils, Rocket, Handshake } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

const PERKS = [
  { icon: Camera,    title: 'LinkedIn Headshots', body: 'Professional headshots, on the house' },
  { icon: Utensils,  title: 'Mendocino Farms',    body: 'Real food, not pizza' },
  { icon: Rocket,    title: 'Real Founders',       body: 'Meet the people building things' },
  { icon: Handshake, title: 'Opportunities',       body: 'Internships, team-joins, side projects' },
];

export default function JoinEvent() {
  const { clubId } = useParams<{ clubId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading || !user) return;
    // Already logged in — skip the landing, send straight to done
    navigate(`/join/${clubId}/done`, { replace: true });
  }, [user, authLoading, clubId, navigate]);

  const storeContextAndGo = (path: string) => {
    localStorage.setItem(
      'unicircle_join_context',
      JSON.stringify({ clubId, googleFormUrl: null }),
    );
    navigate(path);
  };

  if (authLoading) return null;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-zinc-100 relative overflow-hidden">
      {/* Ambient glows */}
      <div className="pointer-events-none absolute top-0 right-0 w-[500px] h-[500px]
                      bg-[radial-gradient(circle,rgba(124,58,237,0.15)_0%,transparent_70%)]
                      -translate-y-1/4 translate-x-1/4" />
      <div className="pointer-events-none absolute bottom-0 left-0 w-[400px] h-[400px]
                      bg-[radial-gradient(circle,rgba(196,150,28,0.12)_0%,transparent_70%)]
                      translate-y-1/4 -translate-x-1/4" />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px)',
          backgroundSize: '72px 72px',
        }}
      />

      {/* Top accent bar */}
      <div className="h-[3px] bg-gradient-to-r from-[#7C3AED] via-[hsl(43,74%,56%)] to-[#7C3AED]" />

      <div className="relative z-10 max-w-lg mx-auto px-6 pt-12 pb-24">

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

        {/* Event badge */}
        <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/25 rounded-full px-4 py-1.5 mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
          <span className="text-[11px] font-bold tracking-[0.14em] uppercase text-violet-400">
            Networking Mixer · UCSD
          </span>
        </div>

        {/* Headline */}
        <h1 className="font-display text-7xl font-black leading-[0.88] mb-4 tracking-tight">
          LINK<br />
          <span className="text-gold">UP.</span>
        </h1>
        <p className="text-zinc-400 text-lg leading-relaxed mb-10">
          UCSD's startup community is getting together. Free food, LinkedIn headshots, and real
          conversations with founders. Come meet your people.
        </p>

        {/* Event details */}
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5 mb-8 grid grid-cols-3 gap-4">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-zinc-600 mb-1.5 flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Date
            </p>
            <p className="text-sm font-bold text-violet-400">Friday</p>
            <p className="text-xs text-zinc-500 mt-0.5">May 15</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-zinc-600 mb-1.5 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Time
            </p>
            <p className="text-sm font-bold text-violet-400">6:30 PM</p>
            <p className="text-xs text-zinc-500 mt-0.5">Until 8:30</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-zinc-600 mb-1.5 flex items-center gap-1">
              <MapPin className="w-3 h-3" /> Where
            </p>
            <p className="text-sm font-bold text-zinc-100">7th College</p>
            <p className="text-xs text-zinc-500 mt-0.5">MPR</p>
          </div>
        </div>

        {/* What to expect */}
        <div className="mb-10">
          <p className="text-[10px] font-bold tracking-[0.16em] uppercase text-zinc-700 mb-4">
            What to expect
          </p>
          <div className="grid grid-cols-2 gap-3">
            {PERKS.map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4"
              >
                <div className="w-8 h-8 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center mb-3">
                  <Icon className="w-4 h-4 text-gold" />
                </div>
                <p className="font-semibold text-zinc-100 text-sm mb-0.5">{title}</p>
                <p className="text-xs text-zinc-500 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA card */}
        <div className="bg-gradient-to-br from-violet-500/10 to-gold/5 border border-violet-500/20 rounded-2xl p-7 text-center">
          <h2 className="text-xl font-bold text-zinc-100 mb-1.5">
            Build your campus profile
          </h2>
          <p className="text-sm text-zinc-500 mb-5 max-w-xs mx-auto">
            Takes 2 minutes. Tell us what you're into — we'll match you with the right clubs and
            people at UCSD.
          </p>
          <Button
            onClick={() => storeContextAndGo('/signup')}
            className="w-full h-12 text-base font-bold rounded-xl bg-violet-600 hover:bg-violet-500 transition-colors"
          >
            Create Your Free Profile
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          <p className="text-xs text-zinc-700 mt-4">
            Already have an account?{' '}
            <button
              onClick={() => storeContextAndGo('/login')}
              className="text-violet-500 hover:text-violet-400 underline"
            >
              Sign in →
            </button>
          </p>
        </div>

        {/* Dress code note */}
        <p className="mt-6 text-center text-xs text-zinc-600 uppercase tracking-widest">
          Business Casual · Open to All UCSD Students
        </p>

        {/* Footer */}
        <div className="mt-14 pt-6 border-t border-white/[0.04] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-gold" />
            <span className="text-xs font-bold tracking-widest text-zinc-700 uppercase">unicircle.app</span>
          </div>
          <p className="text-xs text-zinc-700">@startupincubatorucsd · @seventhcsc</p>
        </div>
      </div>
    </div>
  );
}
