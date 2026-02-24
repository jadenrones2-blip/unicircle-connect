import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Sparkles,
  LogOut,
  RefreshCw,
  ExternalLink,
  Calendar,
  Users,
  Loader2,
  FileText,
  UserCircle,
  Heart,
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
import { getRecommendationsFromSaved, extractClubKeywords } from '@/lib/clubRecommendations';
import type { Club } from '@/data/mockData';

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
  
  const [interests, setInterests] = useState<{ category: string; value: string }[]>([]);
  const [interestsLoading, setInterestsLoading] = useState(true);
  const [applyingClubId, setApplyingClubId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

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
      });
    }
  }, [user, fetchInterests, fetchMemberships, fetchApplications, fetchSavedClubs]);

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
    navigate('/onboarding');
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
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="px-2 sm:px-3 text-xs tracking-wide uppercase">
              <LogOut className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-5 sm:py-8">
        {/* Welcome section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 sm:mb-8"
        >
          <div className="flex items-center gap-3 mb-1 sm:mb-2">
            <UserCircle className="h-5 w-5 sm:h-6 sm:w-6 text-gold" />
            <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-bold text-foreground tracking-tight">
              Your Dashboard
            </h1>
          </div>
          <p className="text-sm sm:text-base text-muted-foreground">
            Manage your clubs, track applications, and discover new communities.
          </p>
        </motion.div>

        {/* Recruitment Tracker Section */}
        <RecruitmentTrackerSection />

        {/* Tabs for My Clubs / Applications */}
        <Tabs defaultValue="my-clubs" className="mb-8 sm:mb-10">
          <TabsList className="mb-4 sm:mb-6 w-full sm:w-auto grid grid-cols-3 sm:flex">
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

        {/* Recommendations section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-3">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-gold" />
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
              <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
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
    </div>
  );
}
