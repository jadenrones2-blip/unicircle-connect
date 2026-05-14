import { useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { CheckCircle, ExternalLink, Compass, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

// Swap in the real AS Google Form URL before the event
const GOOGLE_FORM_URL: string | null = null;

export default function JoinComplete() {
  const { clubId } = useParams<{ clubId: string }>();
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) navigate('/login', { replace: true });
  }, [user, loading, navigate]);

  useEffect(() => {
    localStorage.removeItem('unicircle_join_context');
  }, []);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-zinc-100 relative overflow-hidden">
      {/* Subtle glow */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                      w-[600px] h-[600px]
                      bg-[radial-gradient(circle,rgba(124,58,237,0.08)_0%,transparent_70%)]" />

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 py-16">
        <div className="w-full max-w-sm">

          {/* Success icon */}
          <div className="flex justify-center mb-7">
            <div className="w-20 h-20 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-gold" />
            </div>
          </div>

          {/* Heading */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-display font-bold text-white mb-2">
              You're all set!
            </h1>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Your UniCircle profile is live. We'll use your interests to surface the best clubs
              on campus — starting with SIC.
            </p>
          </div>

          {/* Club chip */}
          <div className="flex items-center justify-center gap-2 bg-white/[0.04] border border-white/[0.09]
                          rounded-full px-4 py-2.5 mb-8 mx-auto w-fit">
            <span className="w-2 h-2 rounded-full bg-violet-400" />
            <span className="text-sm font-semibold text-zinc-300">Startup Incubator Club</span>
          </div>

          {/* Event reminder */}
          <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4 mb-8 text-center">
            <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold mb-1">Tonight</p>
            <p className="text-base font-bold text-violet-400">Link Up Networking Mixer</p>
            <p className="text-xs text-zinc-500 mt-0.5">6:30 – 8:30 PM · Seventh College MPR</p>
          </div>

          {/* CTAs */}
          <div className="space-y-3">
            {GOOGLE_FORM_URL ? (
              <a href={GOOGLE_FORM_URL} target="_blank" rel="noopener noreferrer">
                <Button className="w-full h-12 text-base font-bold bg-violet-600 hover:bg-violet-500 rounded-xl">
                  AS Check-In Form
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Button>
              </a>
            ) : (
              <Link to={`/clubs/${clubId}`}>
                <Button className="w-full h-12 text-base font-bold bg-violet-600 hover:bg-violet-500 rounded-xl">
                  View Startup Incubator Club
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            )}

            <Link to="/clubs">
              <Button
                variant="outline"
                className="w-full h-12 border-white/10 text-zinc-300 hover:bg-zinc-800 rounded-xl"
              >
                <Compass className="w-4 h-4 mr-2" /> Explore All Clubs
              </Button>
            </Link>

            <Link to="/dashboard">
              <Button variant="ghost" className="w-full h-11 text-zinc-500 hover:text-zinc-300 text-sm">
                Go to My Dashboard →
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
