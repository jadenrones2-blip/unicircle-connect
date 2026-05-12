import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LogOut,
  RefreshCw,
  ExternalLink,
  Calendar,
  Users,
  Loader2,
  FileText,
  UserCircle,
  Heart,
  MapPin,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useUserInterests } from '@/hooks/useUserInterests';
import { useClubs } from '@/hooks/useExternalDB';
import { useClubMemberships } from '@/hooks/useClubMemberships';
import { useSavedClubs } from '@/hooks/useSavedClubs';
import { toast } from 'sonner';
import logoImage from '@/assets/unicircle-logo-new.png';
import MyClubsSection from '@/components/dashboard/MyClubsSection';
import ApplicationsSection from '@/components/dashboard/ApplicationsSection';
import SavedClubsSection from '@/components/dashboard/SavedClubsSection';
import RecommendedClubCard from '@/components/dashboard/RecommendedClubCard';
import RecruitmentTrackerSection from '@/components/dashboard/RecruitmentTrackerSection';
import ActivityFeed from '@/components/dashboard/ActivityFeed';
import SpotlightCarousel from '@/components/dashboard/SpotlightCarousel';
import { getRecommendationsFromSaved, extractClubKeywords } from '@/lib/clubRecommendations';
import type { Club } from '@/data/mockData';
import { dataClient } from '@/integrations/supabase/dataClient';
import { supabase } from '@/integrations/supabase/client';
import { ExternalEvent } from '@/hooks/useExternalEvents';
import { EventDetailModal } from '@/components/calendar/EventDetailModal';
import { formatEventDateTimeShort } from '@/lib/formatters';
import { useUCSDEvents } from '@/hooks/useUCSDEvents';
import { useClubMatchedEvents } from '@/hooks/useClubMatchedEvents';

// Mapping from quiz answers to club categories/tags
const interestToClubMapping: Record<string, string[]> = {
  // Superpower (goals)
  network: ['Professional', 'Networking', 'Career', 'Industry'],
  skills: ['Workshop', 'Training', 'Academic', 'Bootcamp'],
  squad: ['Social', 'Community', 'Recreation', 'Friends'],
  confidence: ['Leadership', 'Executive', 'Board', 'Public Speaking'],
  purpose: ['Service', 'Volunteer', 'Philanthropy', 'Social Impact', 'Advocacy'],
  fun: ['Social', 'Recreation', 'Events', 'Casual'],
  
  // Career goals
  tech_career: ['Tech / STEM', 'STEM', 'Engineering', 'Computer Science', 'Coding', 'Technology', 'Software'],
  finance_career: ['Finance', 'Business', 'Investment', 'Banking', 'Consulting'],
  startup_career: ['Entrepreneurship', 'Startup', 'Business', 'Innovation'],
  consulting_career: ['Consulting', 'Strategy', 'Business', 'Professional'],
  healthcare_career: ['Pre-Med', 'Health', 'Healthcare', 'Biology', 'Medicine'],
  research_career: ['Research', 'Science', 'Academic', 'PhD', 'Lab'],
  creative_career: ['Arts', 'Design', 'Creative', 'Media', 'Film', 'Music'],
  nonprofit_career: ['Nonprofit', 'Social Impact', 'Public Policy', 'Advocacy', 'Service'],
  undecided_career: ['Exploration', 'General', 'Community'],
  
  // Interests
  tech: ['Tech / STEM', 'STEM', 'Engineering', 'Computer Science', 'Coding', 'Technology'],
  business: ['Business', 'Consulting', 'Entrepreneurship', 'Finance', 'Marketing'],
  arts: ['Arts', 'Design', 'Creative', 'Music', 'Dance', 'Theater', 'Film'],
  science: ['Science', 'Research', 'Pre-Med', 'Biology', 'Chemistry', 'Physics'],
  culture: ['Cultural', 'Identity', 'International', 'Heritage'],
  fitness: ['Health', 'Wellness', 'Fitness', 'Sports', 'Recreation'],
  social_impact: ['Social Impact', 'Advocacy', 'Service', 'Sustainability'],
  gaming: ['Gaming', 'Esports', 'Recreation'],
  
  // Energy level
  explorer: ['Casual', 'Drop-in', 'Open'],
  committed: ['Active', 'Member', 'Regular'],
  all_in: ['Leadership', 'Executive', 'Board', 'Officers'],
  
  // Vibe
  competitive: ['Competition', 'Competitive', 'Tournament', 'Ambitious'],
  chill: ['Casual', 'Drop-in', 'Relaxed', 'Low-key'],
  party: ['Social', 'Events', 'Networking', 'Parties'],
  professional: ['Professional', 'Industry', 'Career', 'Corporate'],
  creative_vibe: ['Creative', 'Arts', 'Experimental', 'Unique'],
  inclusive: ['Inclusive', 'Welcoming', 'Community', 'Supportive'],

  // Resume-extracted keywords (direct matching)
  // These are dynamically matched, but we include common ones
  Tech: ['Tech / STEM', 'STEM', 'Engineering', 'Technology'],
  Finance: ['Finance', 'Business', 'Investment', 'Banking'],
  Consulting: ['Consulting', 'Strategy', 'Business', 'Professional'],
  Healthcare: ['Pre-Med', 'Health', 'Healthcare', 'Medicine'],
  Startup: ['Entrepreneurship', 'Startup', 'Business', 'Innovation'],
  Research: ['Research', 'Science', 'Academic', 'Lab'],
  Creative: ['Arts', 'Design', 'Creative', 'Media'],
  Nonprofit: ['Nonprofit', 'Social Impact', 'Service', 'Advocacy'],
  leadership: ['Leadership', 'Executive', 'Board', 'Officers'],
  coding: ['Tech / STEM', 'Engineering', 'Coding', 'Software'],
  design: ['Arts', 'Design', 'Creative', 'UX'],
  marketing: ['Marketing', 'Business', 'Communications'],
  resume_competitive: ['Competition', 'Competitive', 'Tournament'],
  collaborative: ['Community', 'Team', 'Collaborative'],
};

function calculateMatchScore(club: Club, interests: { category: string; value: string }[], clubKeywords: Set<string>): number {
  let score = 0;
  const clubText = [club.name, club.category, club.categoryBucket, club.description, ...(club.tags || [])]
    .filter(Boolean).join(' ').toLowerCase();

  interests.forEach(({ value }) => {
    const matchTerms = interestToClubMapping[value] || [value];
    matchTerms.forEach((term) => {
      if (clubText.includes(term.toLowerCase())) {
        score += 1;
      }
    });
    // Bonus: cluster-level match
    matchTerms.forEach((term) => {
      if (clubKeywords.has(term.toLowerCase())) {
        score += 0.5;
      }
    });
  });

  return score;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { fetchInterests } = useUserInterests();
  const { data: clubs, loading: clubsLoading, refetch } = useClubs();
  const {
    memberships,
    applications,
    fetchMemberships,
    fetchApplications,
    applyToClub,
    withdrawApplication,
    removeMembership,
    hasApplied,
    isMember,
  } = useClubMemberships();
  const {
    savedClubs,
    loading: savedLoading,
    fetchSavedClubs,
    saveClub,
    unsaveClub,
    isSaved: isClubSaved,
  } = useSavedClubs();
  
  const [profile, setProfile] = useState<{ display_name: string | null; avatar_url: string | null } | null>(null);
  const [interests, setInterests] = useState<{ category: string; value: string }[]>([]);
  const [interestsLoading, setInterestsLoading] = useState(true);
  const interestValues = useMemo(() => interests.map(i => i.value), [interests]);
  const resumeSignalValues = useMemo(() => interests.filter(i => i.category.startsWith('resume')).map(i => i.value), [interests]);
  const { events: ucsdEvents, loading: ucsdEventsLoading } = useUCSDEvents(interestValues, 6);
  const { events: clubEvents, loading: clubEventsLoading } = useClubMatchedEvents(clubs, interestValues, resumeSignalValues, 6);
  const [applyingClubId, setApplyingClubId] = useState<string | null>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<ExternalEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<ExternalEvent | null>(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
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
    if (user) {
      setInterestsLoading(true);
      Promise.all([
        fetchInterests(user.id),
        fetchMemberships(user.id),
        fetchApplications(user.id),
        fetchSavedClubs(user.id),
      ]).then(([interestsData]) => {
        setInterests(
          interestsData.map((i) => ({ category: i.interest_category, value: i.interest_value }))
        );
        setInterestsLoading(false);
      }).catch((err) => {
        console.error('Failed to load dashboard data:', err);
        setInterestsLoading(false);
      });
    }
  }, [user, fetchInterests, fetchMemberships, fetchApplications, fetchSavedClubs]);

  useEffect(() => {
    if (!savedClubs.length) { setUpcomingEvents([]); return; }
    const fetchUpcoming = async () => {
      setEventsLoading(true);
      try {
        const savedIds = savedClubs.map((s) => s.club_id);
        const now = new Date().toISOString();
        const { data } = await dataClient
          .from('events')
          .select('*')
          .eq('verified', true)
          .in('club_id', savedIds)
          .gte('start_time', now)
          .order('start_time', { ascending: true })
          .limit(10);
        setUpcomingEvents((data || []) as ExternalEvent[]);
      } catch (err) {
        console.error('Failed to load upcoming events:', err);
      } finally {
        setEventsLoading(false);
      }
    };
    fetchUpcoming();
  }, [savedClubs]);

  const recommendedClubs = useMemo(() => {
    if (!clubs.length || !interests.length) return [];

    const scoredClubs = clubs.map((club) => {
      const clubKeywords = extractClubKeywords(club);
      return {
        club,
        score: calculateMatchScore(club, interests, clubKeywords),
      };
    });

    return scoredClubs
      .filter((c) => c.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12);
  }, [clubs, interests]);

  // Recommendations based on saved clubs' categories + user interests
  const savedClubRecommendations = useMemo(() => {
    if (!clubs.length || !savedClubs.length) return [];
    const savedIds = new Set(savedClubs.map((s) => s.club_id));
    return getRecommendationsFromSaved(clubs, savedIds, interests, interestToClubMapping, 9);
  }, [clubs, savedClubs, interests]);

  const handleUnsaveFromDashboard = async (clubId: string) => {
    if (!user) return;
    const result = await unsaveClub(user.id, clubId);
    if (result.success) toast.success('Club unsaved');
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out successfully');
    navigate('/');
  };

  const handleRetakeQuiz = () => {
    navigate('/onboarding?retake=true');
  };

  const handleApply = async (club: Club) => {
    if (!user) return;
    
    setApplyingClubId(club.id);
    const result = await applyToClub(user.id, club.id, club.name);
    setApplyingClubId(null);
    
    if (result.success) {
      toast.success(`Applied to ${club.name}!`);
    } else {
      toast.error(result.error || 'Failed to apply');
    }
  };

  const handleWithdraw = async (applicationId: string) => {
    const result = await withdrawApplication(applicationId);
    if (result.success) {
      toast.success('Application withdrawn');
    } else {
      toast.error(result.error || 'Failed to withdraw');
    }
  };

  const handleRemoveMembership = async (membershipId: string) => {
    const result = await removeMembership(membershipId);
    if (result.success) {
      toast.success('Left club successfully');
    } else {
      toast.error(result.error || 'Failed to leave club');
    }
  };

  const isLoading = authLoading || clubsLoading || interestsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 h-14 sm:h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={logoImage} alt="UniCircle" className="h-7 sm:h-8" />
          </Link>

          <div className="flex items-center gap-1 sm:gap-4">
            <Link to="/clubs">
              <Button variant="ghost" size="sm" className="text-muted-foreground px-2 sm:px-3 text-xs tracking-wide uppercase">
                <Users className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Clubs</span>
              </Button>
            </Link>
            <Link to="/events">
              <Button variant="ghost" size="sm" className="text-muted-foreground px-2 sm:px-3 text-xs tracking-wide uppercase">
                <Calendar className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Events</span>
              </Button>
            </Link>
            <Link to="/profile">
              <Button variant="ghost" size="sm" className="text-muted-foreground px-2 sm:px-3 text-xs tracking-wide uppercase">
                <UserCircle className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Profile</span>
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="px-2 sm:px-3 text-xs tracking-wide uppercase">
              <LogOut className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-5 sm:py-8 pb-24 sm:pb-8">
        {/* Personalized welcome hero */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative rounded-2xl overflow-hidden mb-6 sm:mb-8 p-6 sm:p-8"
          style={{ background: 'linear-gradient(135deg, rgba(196,150,28,0.08) 0%, rgba(124,58,237,0.06) 100%)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          {/* Glow */}
          <div className="pointer-events-none absolute top-0 right-0 w-64 h-64 rounded-full opacity-30"
            style={{ background: 'radial-gradient(circle, rgba(196,150,28,0.25) 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />

          <div className="relative z-10 flex items-center gap-5">
            {/* Avatar */}
            <div className="shrink-0">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Profile"
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover ring-2 ring-gold/30"
                />
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center text-2xl sm:text-3xl font-black text-gold">
                  {(profile?.display_name?.[0] ?? user?.email?.[0] ?? '?').toUpperCase()}
                </div>
              )}
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold tracking-[0.18em] uppercase text-zinc-600 mb-1">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight leading-tight">
                {(() => {
                  const h = new Date().getHours();
                  const name = profile?.display_name?.split(' ')[0] ?? user?.email?.split('@')[0] ?? '';
                  const greeting = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
                  return name ? `${greeting}, ${name} 👋` : `${greeting} 👋`;
                })()}
              </h1>
              <p className="text-sm text-zinc-500 mt-1">Here's what's happening on campus today.</p>
            </div>

            {/* Quick stats */}
            <div className="hidden sm:flex flex-col gap-2 shrink-0 text-right">
              <div>
                <p className="text-2xl font-black text-white leading-none">{savedClubs.length}</p>
                <p className="text-[10px] text-zinc-600 font-semibold uppercase tracking-wider">Saved</p>
              </div>
              <div>
                <p className="text-2xl font-black text-white leading-none">{applications.filter(a => a.status !== 'withdrawn').length}</p>
                <p className="text-[10px] text-zinc-600 font-semibold uppercase tracking-wider">Applied</p>
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="relative z-10 flex gap-2 mt-5 flex-wrap">
            <Link to="/clubs" className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-xs font-semibold text-zinc-400 hover:text-white hover:border-white/20 transition-all">
              <Users className="w-3 h-3" /> Browse Clubs
            </Link>
            <Link to="/events" className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-xs font-semibold text-zinc-400 hover:text-white hover:border-white/20 transition-all">
              <Calendar className="w-3 h-3" /> Events
            </Link>
            <Link to="/discover" className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gold/10 border border-gold/20 text-xs font-semibold text-gold hover:bg-gold/20 transition-all">
              <Heart className="w-3 h-3" /> Discover
            </Link>
            <Link to="/profile" className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-xs font-semibold text-zinc-400 hover:text-white hover:border-white/20 transition-all">
              <UserCircle className="w-3 h-3" /> Edit Profile
            </Link>
          </div>
        </motion.div>

        {/* Recruitment Tracker Section */}
        <RecruitmentTrackerSection />

        {/* Tabs for My Clubs / Applications */}
        <Tabs defaultValue="feed" className="mb-8 sm:mb-10">
          <TabsList className="mb-4 sm:mb-6 w-full sm:w-auto grid grid-cols-4 sm:flex">
            <TabsTrigger value="feed" className="gap-1 sm:gap-2 text-xs sm:text-sm tracking-wide uppercase font-semibold">
              <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Feed
            </TabsTrigger>
            <TabsTrigger value="my-clubs" className="gap-1 sm:gap-2 text-xs sm:text-sm tracking-wide uppercase font-semibold">
              <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">My </span>Clubs ({memberships.length})
            </TabsTrigger>
            <TabsTrigger value="applications" className="gap-1 sm:gap-2 text-xs sm:text-sm tracking-wide uppercase font-semibold">
              <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Applications</span><span className="sm:hidden">Apps</span> ({applications.filter(a => a.status !== 'withdrawn').length})
            </TabsTrigger>
            <TabsTrigger value="saved" className="gap-1 sm:gap-2 text-xs sm:text-sm tracking-wide uppercase font-semibold">
              <Heart className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Saved ({savedClubs.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="feed">
            <SpotlightCarousel />
            <ActivityFeed clubs={clubs} />
          </TabsContent>

          <TabsContent value="my-clubs">
            <MyClubsSection
              memberships={memberships} 
              onRemoveMembership={handleRemoveMembership}
            />
          </TabsContent>
          
          <TabsContent value="applications">
            <ApplicationsSection 
              applications={applications} 
              onWithdraw={handleWithdraw}
            />
          </TabsContent>

          <TabsContent value="saved">
            <SavedClubsSection
              savedClubIds={savedClubs.map((s) => s.club_id)}
              clubs={clubs}
              recommendedClubs={savedClubRecommendations}
              onUnsave={handleUnsaveFromDashboard}
            />
          </TabsContent>
        </Tabs>

        {/* Club Events Feed — from clubs matching student interests */}
        {(clubEvents.length > 0 || clubEventsLoading) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.02 }}
            className="mb-8 sm:mb-10"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-gold" />
                <h2 className="font-display text-lg sm:text-xl font-bold text-foreground tracking-tight">
                  Club Events For You
                </h2>
              </div>
            </div>
            {clubEventsLoading ? (
              <div className="flex items-center gap-2 py-4 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Finding club events…</span>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {clubEvents.map(event => {
                  const title = event.title;
                  const dateStr = event.start_time
                    ? new Date(event.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
                    : null;
                  return (
                    <div
                      key={event.id}
                      className="flex flex-col gap-2 p-4 rounded-xl border border-white/8 bg-zinc-900/60 hover:border-gold/30 hover:bg-zinc-900 transition-all"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-white text-sm leading-snug line-clamp-2 flex-1">{title}</p>
                        {event.isNative && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-gold/10 text-gold border border-gold/20 shrink-0">Posted</span>
                        )}
                      </div>
                      {event.club_name && (
                        <p className="text-[11px] text-zinc-500">{event.club_name}</p>
                      )}
                      <div className="flex flex-wrap gap-2 text-xs text-zinc-500">
                        {dateStr && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />{dateStr}
                          </span>
                        )}
                        {event.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            <span className="truncate max-w-[140px]">{event.location}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* Personalized UCSD Events Feed */}
        {(ucsdEvents.length > 0 || ucsdEventsLoading) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="mb-8 sm:mb-10"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-gold" />
                <h2 className="font-display text-lg sm:text-xl font-bold text-foreground tracking-tight">
                  Events For You
                </h2>
              </div>
              <a
                href="https://calendar.ucsd.edu"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-zinc-500 hover:text-gold transition-colors flex items-center gap-1"
              >
                UCSD Calendar <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            {ucsdEventsLoading ? (
              <div className="flex items-center gap-2 py-4 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Finding events for you...</span>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {ucsdEvents.map((event) => (
                  <a
                    key={event.id}
                    href={event.url || `https://calendar.ucsd.edu/event/${event.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col gap-2 p-4 rounded-xl border border-white/8 bg-zinc-900/60 hover:border-gold/30 hover:bg-zinc-900 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-white text-sm leading-snug line-clamp-2 flex-1">{event.title}</p>
                      {event.free && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">Free</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-zinc-500">
                      {event.date && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(event.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                      {event.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          <span className="truncate max-w-[140px]">{event.location}</span>
                        </span>
                      )}
                    </div>
                    {event.matchReason && (
                      <p className="text-[11px] text-gold/80">✦ {event.matchReason}</p>
                    )}
                    {event.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {event.tags.slice(0, 3).map(tag => (
                          <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/5 text-zinc-600 border border-white/6">{tag}</span>
                        ))}
                      </div>
                    )}
                  </a>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Upcoming Events from Saved Clubs */}
        {(upcomingEvents.length > 0 || eventsLoading) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8 sm:mb-10"
          >
            <div className="flex items-center gap-3 mb-4">
              <Calendar className="h-5 w-5 text-gold" />
              <h2 className="font-display text-lg sm:text-xl font-bold text-foreground tracking-tight">
                Upcoming from Your Clubs
              </h2>
            </div>
            {eventsLoading ? (
              <div className="flex items-center gap-2 py-4 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Loading events...</span>
              </div>
            ) : (
              <div className="grid gap-3">
                {upcomingEvents.map((event) => {
                  const title = event.corrected_title || event.title;
                  const startTime = event.corrected_start_time || event.start_time;
                  const location = event.corrected_location || event.location;
                  return (
                    <div
                      key={event.id}
                      className="flex items-start justify-between gap-4 p-4 rounded-xl border border-border bg-card hover:border-gold/30 transition-colors cursor-pointer"
                      onClick={() => { setSelectedEvent(event); setIsEventModalOpen(true); }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{title}</p>
                        <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatEventDateTimeShort(startTime)}
                          </span>
                          {location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              <span className="truncate max-w-[160px]">{location}</span>
                            </span>
                          )}
                        </div>
                      </div>
                      <Calendar className="w-4 h-4 text-gold flex-shrink-0 mt-0.5" />
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* Recommendations section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-3">
            <div className="flex items-center gap-3">
              <h2 className="font-display text-lg sm:text-xl font-bold text-foreground tracking-tight">
                Recommended for You
              </h2>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleRetakeQuiz}>
                <RefreshCw className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Retake Quiz</span>
              </Button>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
            </div>
          </div>

          {recommendedClubs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recommendedClubs.map(({ club, score }, index) => (
                <RecommendedClubCard
                  key={club.id}
                  club={club}
                  score={score}
                  index={index}
                  hasApplied={hasApplied(club.id)}
                  isMember={isMember(club.id)}
                  onApply={() => handleApply(club)}
                  isApplying={applyingClubId === club.id}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-muted/30 rounded-xl">
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No matches yet
              </h3>
              <p className="text-muted-foreground mb-4">
                We couldn't find clubs matching your interests. Try updating your preferences.
              </p>
              <Button onClick={handleRetakeQuiz}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Retake Quiz
              </Button>
            </div>
          )}
        </motion.div>

        {/* Browse all CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 text-center"
        >
          <p className="text-muted-foreground mb-4">
            Want to explore more options?
          </p>
          <Link to="/clubs">
            <Button variant="outline" size="lg">
              Browse All Clubs
              <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </motion.div>
      </main>

      <EventDetailModal
        event={selectedEvent}
        isOpen={isEventModalOpen}
        onClose={() => { setIsEventModalOpen(false); setSelectedEvent(null); }}
      />
    </div>
  );
}
