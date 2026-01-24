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
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useUserInterests } from '@/hooks/useUserInterests';
import { useClubs } from '@/hooks/useExternalDB';
import { toast } from 'sonner';
import logoImage from '@/assets/unicircle-logo-new.png';
import type { Club } from '@/data/mockData';

// Mapping from quiz answers to club categories/tags
const interestToClubMapping: Record<string, string[]> = {
  // Goals
  career: ['Professional', 'Networking', 'Career'],
  skills: ['Workshop', 'Training', 'Academic'],
  friends: ['Social', 'Community', 'Recreation'],
  leadership: ['Leadership', 'Executive', 'Board'],
  community: ['Cultural', 'Identity', 'Community'],
  give_back: ['Service', 'Volunteer', 'Philanthropy'],
  // Interests
  tech: ['Tech / STEM', 'STEM', 'Engineering', 'Computer Science', 'Coding', 'Technology'],
  business: ['Business', 'Consulting', 'Entrepreneurship', 'Finance', 'Marketing'],
  arts: ['Arts', 'Design', 'Creative', 'Music', 'Dance', 'Theater', 'Film'],
  science: ['Science', 'Research', 'Pre-Med', 'Biology', 'Chemistry', 'Physics'],
  culture: ['Cultural', 'Identity', 'International', 'Heritage'],
  health: ['Health', 'Wellness', 'Fitness', 'Sports', 'Recreation'],
  social_impact: ['Social Impact', 'Advocacy', 'Service', 'Sustainability'],
  gaming: ['Gaming', 'Esports', 'Recreation'],
  // Vibe
  competitive: ['Competition', 'Competitive', 'Tournament'],
  chill: ['Casual', 'Drop-in', 'Relaxed'],
  social_vibe: ['Social', 'Events', 'Networking'],
  professional: ['Professional', 'Industry', 'Career'],
  inclusive: ['Inclusive', 'Welcoming', 'Community'],
};

function calculateMatchScore(club: Club, interests: { category: string; value: string }[]): number {
  let score = 0;
  const clubText = [
    club.name,
    club.category,
    club.categoryBucket,
    club.description,
    ...(club.tags || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  interests.forEach(({ value }) => {
    const matchTerms = interestToClubMapping[value] || [value];
    matchTerms.forEach((term) => {
      if (clubText.includes(term.toLowerCase())) {
        score += 1;
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
  const [interests, setInterests] = useState<{ category: string; value: string }[]>([]);
  const [interestsLoading, setInterestsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      setInterestsLoading(true);
      fetchInterests(user.id).then((data) => {
        setInterests(
          data.map((i) => ({ category: i.interest_category, value: i.interest_value }))
        );
        setInterestsLoading(false);
      });
    }
  }, [user, fetchInterests]);

  const recommendedClubs = useMemo(() => {
    if (!clubs.length || !interests.length) return [];

    const scoredClubs = clubs.map((club) => ({
      club,
      score: calculateMatchScore(club, interests),
    }));

    return scoredClubs
      .filter((c) => c.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12);
  }, [clubs, interests]);

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out successfully');
    navigate('/');
  };

  const handleRetakeQuiz = () => {
    navigate('/onboarding');
  };

  const isLoading = authLoading || clubsLoading || interestsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your recommendations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={logoImage} alt="UniCircle" className="h-8" />
          </Link>

          <div className="flex items-center gap-4">
            <Link to="/clubs">
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                <Users className="h-4 w-4 mr-2" />
                All Clubs
              </Button>
            </Link>
            <Link to="/events">
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                <Calendar className="h-4 w-4 mr-2" />
                Events
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Welcome section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Your Club Matches
            </h1>
          </div>
          <p className="text-muted-foreground">
            Based on your interests, here are clubs we think you'll love.
          </p>
        </motion.div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3 mb-8">
          <Button variant="outline" size="sm" onClick={handleRetakeQuiz}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retake Quiz
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Clubs
          </Button>
        </div>

        {/* Recommendations grid */}
        {recommendedClubs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recommendedClubs.map(({ club, score }, index) => (
              <motion.div
                key={club.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link to={`/clubs/${club.id}`}>
                  <div className="group bg-card border border-border rounded-xl overflow-hidden hover:border-primary/50 hover:shadow-lg transition-all duration-300">
                    {/* Image */}
                    <div className="relative h-40 overflow-hidden">
                      <img
                        src={club.imageUrl || '/placeholder.svg'}
                        alt={club.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {/* Match badge */}
                      <div className="absolute top-3 left-3">
                        <Badge className="bg-primary text-primary-foreground">
                          <Sparkles className="h-3 w-3 mr-1" />
                          {score} {score === 1 ? 'match' : 'matches'}
                        </Badge>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                        {club.name}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {club.description}
                      </p>

                      {/* Category badge */}
                      <div className="mt-3 flex items-center justify-between">
                        <Badge variant="secondary" className="text-xs">
                          {club.categoryBucket || club.category}
                        </Badge>
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
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
