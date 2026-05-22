import { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Calendar,
  MapPin,
  Clock,
  Users,
  ArrowRight,
  Loader2,
  Zap,
  ExternalLink,
  BookmarkPlus,
  CheckCircle,
} from 'lucide-react';
import Header from '@/components/Header';
import { useClubs } from '@/hooks/useExternalDB';
import { useAuth } from '@/hooks/useAuth';
import { useSavedClubs } from '@/hooks/useSavedClubs';
import { useUserInterests } from '@/hooks/useUserInterests';
import { useClubMatchedEvents } from '@/hooks/useClubMatchedEvents';
import { calculateMatchScore, getTopMatchTerm } from '@/lib/clubRecommendations';
import { toast } from 'sonner';
import type { Club } from '@/data/mockData';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatEventDate(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const isToday = d.toDateString() === today.toDateString();
  const isTomorrow = d.toDateString() === tomorrow.toDateString();

  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  if (isToday) return `Today · ${time}`;
  if (isTomorrow) return `Tomorrow · ${time}`;
  return (
    d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) +
    ` · ${time}`
  );
}

export default function Discover() {
  const navigate = useNavigate();
  const { data: clubs, loading: clubsLoading } = useClubs();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !user) navigate('/login?redirect=/discover');
  }, [user, authLoading, navigate]);

  const { savedClubs, saveClub, isSaved, fetchSavedClubs } = useSavedClubs();
  const { fetchInterests, fetchResumeSignals } = useUserInterests();
  const [interestValues, setInterestValues] = useState<string[]>([]);
  const [resumeSignals, setResumeSignals] = useState<string[]>([]);
  const [firstName, setFirstName] = useState('');

  useEffect(() => {
    if (!user) return;
    // Extract first name from email
    const name = user.user_metadata?.full_name || user.email?.split('@')[0] || '';
    setFirstName(name.split(' ')[0]);

    fetchInterests(user.id).then((d) => {
      if (d) setInterestValues(d.map((i) => i.interest_value));
    });
    fetchResumeSignals(user.id).then((s) => setResumeSignals(s));
    fetchSavedClubs(user.id);
  }, [user]);

  const { events, loading: eventsLoading } = useClubMatchedEvents(
    clubs,
    interestValues,
    resumeSignals,
    5
  );

  // Top 5 club picks
  const topClubs = useMemo(() => {
    if (!interestValues.length && !resumeSignals.length) return [];
    const savedIds = new Set(savedClubs.map((s) => s.club_id));
    return clubs
      .map((club) => ({
        club,
        score: calculateMatchScore(club, interestValues, resumeSignals),
        reason: getTopMatchTerm(club, interestValues, resumeSignals),
      }))
      .filter(({ score }) => score >= 40)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [clubs, interestValues, resumeSignals, savedClubs]);

  const handleSave = async (club: Club) => {
    if (!user) return;
    if (isSaved(club.id)) return;
    await saveClub(user.id, club.id, club.name);
    toast.success(`Saved ${club.name}!`);
  };

  const loading = clubsLoading || authLoading;
  const hasSignals = interestValues.length > 0 || resumeSignals.length > 0;
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  if (loading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-gold animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <Header />

      <div className="max-w-2xl mx-auto px-4 pt-24 pb-20">
        {/* Personal greeting */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <p className="text-xs tracking-[0.18em] uppercase text-muted-foreground mb-1">{today}</p>
          <h1 className="text-2xl font-display font-bold text-foreground">
            {getGreeting()}
            {firstName ? `, ${firstName}` : ''}.
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Here's what UniCircle picked for you this week.
          </p>
        </motion.div>

        {/* ── Events this week ─────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-10"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gold" />
              <h2 className="text-sm font-semibold text-foreground">5 Events for You This Week</h2>
            </div>
            <Link
              to="/events"
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              See all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {eventsLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-5 h-5 text-gold animate-spin" />
            </div>
          ) : events.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-6 text-center">
              <Calendar className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-40" />
              <p className="text-sm text-muted-foreground">
                {hasSignals
                  ? 'No upcoming matched events found. Check back soon!'
                  : 'Complete your interest profile to see matched events.'}
              </p>
              {!hasSignals && (
                <Link
                  to="/onboarding"
                  className="mt-3 inline-flex items-center gap-1 text-xs text-gold hover:underline"
                >
                  Set up your profile <ArrowRight className="w-3 h-3" />
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {events.map((event, i) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.12 + i * 0.06 }}
                  className="flex items-start gap-3 p-4 rounded-2xl border border-border bg-card hover:bg-muted/40 transition-colors group"
                >
                  {/* Rank dot */}
                  <div className="w-6 h-6 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[10px] font-bold text-gold">{i + 1}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground leading-snug line-clamp-1">
                      {event.title}
                    </p>
                    {event.club_name && (
                      <p className="text-[11px] text-gold/80 mt-0.5">{event.club_name}</p>
                    )}
                    <div className="flex flex-wrap gap-3 mt-1.5">
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {formatEventDate(event.start_time)}
                      </span>
                      {event.location && (
                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <MapPin className="w-3 h-3" />
                          {event.location}
                        </span>
                      )}
                    </div>
                  </div>

                  {event.source_url && (
                    <a
                      href={event.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0 opacity-0 group-hover:opacity-100"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </motion.section>

        {/* ── Top club picks ───────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-10"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-gold" />
              <h2 className="text-sm font-semibold text-foreground">Your Top Club Picks</h2>
            </div>
            <Link
              to="/clubs"
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              Browse all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {topClubs.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-6 text-center">
              <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-40" />
              <p className="text-sm text-muted-foreground">
                {hasSignals
                  ? 'No strong matches found yet.'
                  : 'Set up your interests to see personalized club picks.'}
              </p>
              {!hasSignals && (
                <Link
                  to="/onboarding"
                  className="mt-3 inline-flex items-center gap-1 text-xs text-gold hover:underline"
                >
                  Get started <ArrowRight className="w-3 h-3" />
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {topClubs.map(({ club, score, reason }, i) => {
                const saved = isSaved(club.id);
                return (
                  <motion.div
                    key={club.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.22 + i * 0.06 }}
                    className="flex items-center gap-3 p-4 rounded-2xl border border-border bg-card hover:bg-muted/40 transition-colors group"
                  >
                    {/* Rank */}
                    <span className="w-6 text-center text-sm font-bold text-muted-foreground shrink-0">
                      {i + 1}
                    </span>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/clubs/${club.id}`}
                        className="text-sm font-semibold text-foreground hover:text-gold transition-colors line-clamp-1"
                      >
                        {club.name}
                      </Link>
                      {reason ? (
                        <p className="text-[11px] text-gold/80 mt-0.5 truncate">{reason}</p>
                      ) : (
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {club.categoryBucket || club.category}
                        </p>
                      )}
                    </div>

                    {/* Match bar + actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gold/60"
                          style={{ width: `${score}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-semibold text-muted-foreground w-7 text-right tabular-nums">
                        {score}%
                      </span>
                      <button
                        onClick={() => handleSave(club)}
                        className={`p-1.5 rounded-lg transition-colors ${saved ? 'text-gold' : 'text-muted-foreground hover:text-gold opacity-0 group-hover:opacity-100'}`}
                        title={saved ? 'Saved' : 'Save club'}
                      >
                        {saved ? (
                          <CheckCircle className="w-3.5 h-3.5" />
                        ) : (
                          <BookmarkPlus className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.section>

        {/* ── CTA row ──────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="grid grid-cols-2 gap-3"
        >
          <Link
            to="/clubs"
            className="flex items-center justify-center gap-2 py-3 rounded-2xl border border-border bg-card hover:bg-muted/40 transition-colors text-sm font-semibold text-foreground"
          >
            <Users className="w-4 h-4" />
            Browse Clubs
          </Link>
          <Link
            to="/events"
            className="flex items-center justify-center gap-2 py-3 rounded-2xl border border-border bg-card hover:bg-muted/40 transition-colors text-sm font-semibold text-foreground"
          >
            <Calendar className="w-4 h-4" />
            All Events
          </Link>
        </motion.div>
      </div>
    </main>
  );
}
