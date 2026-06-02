import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LogOut,
  RefreshCw,
  Calendar,
  Users,
  Loader2,
  UserCircle,
  ChevronRight,
  X,
  Menu,
  Settings,
  LayoutDashboard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { useUserInterests } from '@/hooks/useUserInterests';
import { useClubs } from '@/hooks/useExternalDB';
import { useClubMemberships } from '@/hooks/useClubMemberships';
import { useSavedClubs } from '@/hooks/useSavedClubs';
import { toast } from 'sonner';
import logoImage from '@/assets/unicircle-logo-new.png';
import RecruitmentTrackerSection from '@/components/dashboard/RecruitmentTrackerSection';
import ClubCard from '@/components/ClubCard';
import { calculateMatchScore, getTopMatchTerm } from '@/lib/clubRecommendations';
import { dataClient } from '@/integrations/supabase/dataClient';
import { supabase } from '@/integrations/supabase/client';
import type { ExternalEvent } from '@/hooks/useExternalEvents';
import { EventDetailModal } from '@/components/calendar/EventDetailModal';
import { formatEventTime } from '@/lib/formatters';
import { useRecommendedEvents } from '@/hooks/useRecommendedEvents';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { fetchInterests } = useUserInterests();
  const { data: clubs, loading: clubsLoading, refetch } = useClubs();
  const { applications, fetchApplications, withdrawApplication } = useClubMemberships();
  const {
    savedClubs,
    fetchSavedClubs,
    saveClub,
    unsaveClub,
    isSaved: isClubSaved,
  } = useSavedClubs();

  const [profile, setProfile] = useState<{
    display_name: string | null;
    avatar_url: string | null;
  } | null>(null);
  const [interests, setInterests] = useState<{ category: string; value: string }[]>([]);
  const [interestsLoading, setInterestsLoading] = useState(true);
  const [topView, setTopView] = useState<'clubs' | 'events'>('clubs');
  const [upcomingEvents, setUpcomingEvents] = useState<ExternalEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<ExternalEvent | null>(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);

  const interestValues = useMemo(() => interests.map((i) => i.value), [interests]);
  const resumeSignalValues = useMemo(
    () => interests.filter((i) => i.category.startsWith('resume')).map((i) => i.value),
    [interests]
  );
  const { events: clubEvents } = useRecommendedEvents(clubs, interestValues, 8);

  useEffect(() => {
    if (!authLoading && !user) navigate('/login');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      (supabase as any)
        .from('profiles')
        .select('display_name, avatar_url')
        .eq('user_id', user.id)
        .maybeSingle()
        .then(({ data }: any) => setProfile(data ?? null));
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setInterestsLoading(true);
    Promise.all([fetchInterests(user.id), fetchApplications(user.id), fetchSavedClubs(user.id)])
      .then(([interestsData, , savedData]) => {
        setInterests(
          interestsData.map((i) => ({ category: i.interest_category, value: i.interest_value }))
        );
        setInterestsLoading(false);
        // Kick off events fetch — match by club_id OR club_handle (some events store club UUID there)
        if (savedData?.length) {
          const savedIds = savedData.map((s) => s.club_id);
          const _d = new Date();
          const now = `${_d.getFullYear()}-${String(_d.getMonth()+1).padStart(2,'0')}-${String(_d.getDate()).padStart(2,'0')}T00:00:00`;
          Promise.all([
            dataClient
              .from('events')
              .select('*')
              .in('club_id', savedIds)
              .gte('start_time', now)
              .order('start_time', { ascending: true })
              .limit(6),
            dataClient
              .from('events')
              .select('*')
              .in('club_handle', savedIds)
              .gte('start_time', now)
              .order('start_time', { ascending: true })
              .limit(6),
          ]).then(([byId, byHandle]) => {
            const seen = new Set<string>();
            const merged: ExternalEvent[] = [];
            for (const ev of [...(byId.data || []), ...(byHandle.data || [])]) {
              if (!seen.has(ev.id)) { seen.add(ev.id); merged.push(ev as ExternalEvent); }
            }
            setUpcomingEvents(merged.slice(0, 6));
          });
        }
      })
      .catch(() => setInterestsLoading(false));
  }, [user, fetchInterests, fetchApplications, fetchSavedClubs]);

  // Realtime: re-fetch applications when the applicants table changes for this user
  // (club admins move stages / set final decisions on the applicants table)
  const refreshApplications = useCallback(() => {
    if (user) fetchApplications(user.id);
  }, [user, fetchApplications]);

  useEffect(() => {
    if (!user?.email) return;
    const channel = supabase
      .channel(`applicant-status-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'applicants',
          filter: `email=eq.${user.email}`,
        },
        () => refreshApplications()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refreshApplications]);

  // ── Top 10: proper 60/40 interest+resume scoring ──
  const topMatches = useMemo(() => {
    if (!clubs.length || !interestValues.length) return [];
    return clubs
      .map((club) => ({
        club,
        score: calculateMatchScore(club, interestValues, resumeSignalValues),
        reason: getTopMatchTerm(club, interestValues, resumeSignalValues) ?? undefined,
      }))
      .filter((c) => c.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }, [clubs, interestValues, resumeSignalValues]);

  // ── Happening Soon: club-interest events + saved-club events, deduped ──
  const combinedEvents = useMemo(() => {
    const seen = new Set<string | number>();
    const all: ExternalEvent[] = [];
    for (const e of [...(clubEvents as unknown as ExternalEvent[]), ...upcomingEvents]) {
      if (!seen.has(e.id)) {
        seen.add(e.id);
        all.push(e);
      }
    }
    return all
      .sort((a, b) =>
        (a.corrected_start_time || a.start_time || '').localeCompare(
          b.corrected_start_time || b.start_time || ''
        )
      )
      .slice(0, 6);
  }, [clubEvents, upcomingEvents]);

  const activeApplications = useMemo(
    () => applications.filter((a) => a.status !== 'withdrawn'),
    [applications]
  );

  const handleToggleSave = async (clubId: string) => {
    if (!user) return;
    if (isClubSaved(clubId)) {
      await unsaveClub(user.id, clubId);
    } else {
      await (saveClub as any)(user.id, clubId);
    }
  };

  const handleWithdraw = async (applicationId: string) => {
    const result = await withdrawApplication(applicationId);
    if (!result.success) toast.error(result.error || 'Failed to withdraw');
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out');
    navigate('/');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-7 w-7 animate-spin text-gold" />
      </div>
    );
  }

  const displayName = profile?.display_name?.split(' ')[0] ?? user?.email?.split('@')[0] ?? '';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ── */}
      <header className="border-b border-border bg-background/95 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2">
            <img src={logoImage} alt="UniCircle" className="h-7" />
          </Link>
          <div className="flex items-center gap-1">
            <Link to="/clubs">
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground px-2 sm:px-3 text-xs tracking-wide uppercase"
              >
                <Users className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Clubs</span>
              </Button>
            </Link>
            <Link to="/events">
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground px-2 sm:px-3 text-xs tracking-wide uppercase"
              >
                <Calendar className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Events</span>
              </Button>
            </Link>
            <Link to="/profile">
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground px-2 sm:px-3 text-xs tracking-wide uppercase"
              >
                <UserCircle className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Profile</span>
              </Button>
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="px-2 sm:px-3">
                  <Menu className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="cursor-pointer">
                    <Settings className="w-4 h-4 mr-2" />
                    Profile Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 pb-24 max-w-5xl">
        {/* ── 1. Greeting ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-10"
        >
          <div>
            <p className="text-[11px] font-bold tracking-[0.18em] uppercase text-zinc-600 mb-1">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white leading-tight">
              {greeting}
              {displayName ? `, ${displayName}` : ''} 👋
            </h1>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <div className="hidden sm:flex items-center gap-5 text-right">
              <div>
                <p className="text-xl font-black text-white leading-none">{savedClubs.length}</p>
                <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Saved</p>
              </div>
              <div>
                <p className="text-xl font-black text-white leading-none">
                  {activeApplications.length}
                </p>
                <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Applied</p>
              </div>
            </div>
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="Profile"
                className="w-10 h-10 rounded-xl object-cover ring-2 ring-gold/30"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center text-sm font-black text-gold">
                {(displayName[0] ?? '?').toUpperCase()}
              </div>
            )}
          </div>
        </motion.div>

        {/* ── 2. Recruitment tracker (from club officer side) ── */}
        <RecruitmentTrackerSection />

        {/* ── 3 + 4. Top 10 / Events — togglable ── */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-14"
        >
          {/* Section header with Clubs / Events pill toggle */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 p-1 rounded-xl bg-zinc-900 border border-white/[0.07]">
                <button
                  onClick={() => setTopView('clubs')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    topView === 'clubs'
                      ? 'bg-white/10 text-white'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <Users className="w-3 h-3" />
                  Clubs
                </button>
                <button
                  onClick={() => setTopView('events')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    topView === 'events'
                      ? 'bg-white/10 text-white'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <Calendar className="w-3 h-3" />
                  Events
                </button>
              </div>
              <p className="text-xs text-zinc-600 hidden sm:block">
                {topView === 'clubs'
                  ? resumeSignalValues.length > 0
                    ? 'Ranked by interests & resume'
                    : 'Ranked by quiz answers'
                  : 'Upcoming from your interests'}
              </p>
            </div>
            {topView === 'clubs' ? (
              <button
                onClick={() => navigate('/onboarding?retake=true')}
                className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <RefreshCw className="w-3 h-3" /> Update taste
              </button>
            ) : (
              <Link
                to="/events"
                className="flex items-center gap-1 text-xs text-zinc-500 hover:text-gold transition-colors"
              >
                See all <ChevronRight className="w-3 h-3" />
              </Link>
            )}
          </div>

          {/* ── Clubs view ── */}
          {topView === 'clubs' && (
            <>
              {interestsLoading || clubsLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-64 rounded-2xl bg-zinc-900 animate-pulse" />
                  ))}
                </div>
              ) : interestValues.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-zinc-900 p-10 text-center">
                  <p className="text-zinc-400 text-sm mb-5">
                    Take the quiz so we can rank the best clubs for you.
                  </p>
                  <Button onClick={() => navigate('/onboarding')}>Take the Quiz</Button>
                </div>
              ) : topMatches.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-zinc-900 p-10 text-center">
                  <p className="text-zinc-400 text-sm mb-5">
                    No matches yet — try updating your preferences.
                  </p>
                  <Button onClick={() => navigate('/onboarding?retake=true')}>Update Quiz</Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {topMatches.map(({ club, score, reason }, index) => (
                    <div key={club.id} className="relative">
                      <div
                        className="absolute top-3 left-3 z-10 w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-black select-none"
                        style={{
                          background:
                            index === 0
                              ? 'rgba(196,150,28,0.92)'
                              : index === 1
                                ? 'rgba(168,168,188,0.85)'
                                : 'rgba(0,0,0,0.78)',
                          color: index <= 1 ? '#0a0a0a' : '#9ca3af',
                          border: '1px solid rgba(255,255,255,0.12)',
                          backdropFilter: 'blur(4px)',
                        }}
                      >
                        {index + 1}
                      </div>
                      <ClubCard
                        club={club}
                        matchScore={Math.round(score)}
                        reason={reason}
                        isSaved={isClubSaved(club.id)}
                        onToggleSave={handleToggleSave}
                      />
                    </div>
                  ))}
                </div>
              )}
              {topMatches.length > 0 && (
                <div className="mt-6 text-center">
                  <Link
                    to="/clubs"
                    className="text-xs text-zinc-500 hover:text-gold transition-colors"
                  >
                    Explore all clubs →
                  </Link>
                </div>
              )}
            </>
          )}

          {/* ── Events view ── */}
          {topView === 'events' && (
            <>
              {combinedEvents.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-zinc-900 p-10 text-center">
                  <p className="text-zinc-400 text-sm mb-5">
                    No upcoming events yet — save some clubs to see their events here.
                  </p>
                  <Button onClick={() => navigate('/clubs')}>Browse Clubs</Button>
                </div>
              ) : (
                <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
                  {combinedEvents.map((event) => (
                    <DashboardEventCard
                      key={event.id}
                      event={event}
                      onClick={() => {
                        setSelectedEvent(event);
                        setIsEventModalOpen(true);
                      }}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </motion.section>

        {/* ── 5. Applications (only when active) ── */}
        {activeApplications.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-14"
          >
            <h2 className="font-display text-xl font-bold text-white mb-4">Your Applications</h2>
            <div className="space-y-2">
              {activeApplications.map((app: any) => (
                <div
                  key={app.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-zinc-900 border border-white/[0.07] group"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white truncate">
                      {app.club_name || app.club_id}
                    </p>
                    <p className="text-[11px] text-zinc-500 mt-0.5 capitalize">
                      {app.stage || app.status}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                        app.status === 'accepted'
                          ? 'bg-green-500/10 text-green-400 border-green-500/20'
                          : app.status === 'rejected'
                            ? 'bg-red-500/10 text-red-400 border-red-500/20'
                            : 'bg-gold/10 text-gold border-gold/20'
                      }`}
                    >
                      {app.status === 'pending'
                        ? 'Under Review'
                        : (app.status as string).charAt(0).toUpperCase() +
                          (app.status as string).slice(1)}
                    </span>
                    {app.status === 'pending' && (
                      <button
                        onClick={() => handleWithdraw(app.id)}
                        title="Withdraw application"
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-white/5 text-zinc-600 hover:text-red-400"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.section>
        )}

        {/* ── 6. Footer nav ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="pt-6 border-t border-white/5 flex items-center justify-between flex-wrap gap-3"
        >
          <p className="text-xs text-zinc-600 tracking-[0.12em] uppercase">Keep exploring</p>
          <div className="flex gap-2 flex-wrap">
            <Link to="/clubs">
              <Button variant="outline" size="sm" className="text-xs">
                All Clubs
              </Button>
            </Link>
            <Link to="/events">
              <Button variant="outline" size="sm" className="text-xs">
                All Events
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-zinc-600"
              onClick={() => {
                refetch();
              }}
            >
              <RefreshCw className="w-3 h-3 mr-1" /> Refresh
            </Button>
          </div>
        </motion.div>
      </main>

      <EventDetailModal
        event={selectedEvent}
        isOpen={isEventModalOpen}
        onClose={() => {
          setIsEventModalOpen(false);
          setSelectedEvent(null);
        }}
      />
    </div>
  );
}

/* ── Compact event card for "Happening Soon" ── */
function DashboardEventCard({ event, onClick }: { event: ExternalEvent; onClick: () => void }) {
  const rawDate = event.corrected_start_time || event.start_time;
  const d = rawDate ? new Date(rawDate) : null;
  const dayNum = d ? d.toLocaleDateString('en-US', { day: 'numeric' }) : '—';
  const month = d ? d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase() : '';
  const time = rawDate ? formatEventTime(rawDate) : '';
  const title = event.corrected_title || event.title || 'Event';
  const loc = event.corrected_location || event.location;

  return (
    <button
      onClick={onClick}
      className="shrink-0 w-52 text-left bg-zinc-900 border border-white/[0.07] rounded-2xl overflow-hidden hover:border-gold/30 hover:bg-zinc-800 transition-all group"
    >
      {/* Date header */}
      <div
        className="h-16 px-4 flex items-center gap-3"
        style={{
          background: 'linear-gradient(135deg, rgba(196,150,28,0.15), rgba(196,150,28,0.05))',
          borderBottom: '1px solid rgba(196,150,28,0.12)',
        }}
      >
        <div className="text-center shrink-0">
          <span className="text-xl font-black text-gold leading-none block">{dayNum}</span>
          <span className="text-[9px] font-bold text-gold/60 tracking-wider">{month}</span>
        </div>
        <div className="w-px h-6 bg-white/10 shrink-0" />
        <div className="min-w-0">
          {event.club_handle && (
            <p className="text-[11px] font-semibold text-gold/80 truncate">@{event.club_handle}</p>
          )}
          {time && <p className="text-[10px] text-zinc-500">{time}</p>}
        </div>
      </div>
      {/* Content */}
      <div className="p-3">
        <p className="text-sm font-semibold text-zinc-100 line-clamp-2 leading-snug mb-2 group-hover:text-white transition-colors">
          {title}
        </p>
        {loc && (
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="line-clamp-1">{loc}</span>
          </div>
        )}
      </div>
    </button>
  );
}
