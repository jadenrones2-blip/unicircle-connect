import { useState, useMemo, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Clock,
  Share2,
  ExternalLink,
  Loader2,
  Shield,
  Mail,
  Instagram,
  Globe,
  Settings,
  Star,
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ClaimClubModal from "@/components/ClaimClubModal";
import SaveClubButton from "@/components/SaveClubButton";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useClubs } from "@/hooks/useExternalDB";
import { useClubOwnership } from "@/hooks/useClubOwnership";
import { useAuth } from "@/hooks/useAuth";
import { useSavedClubs } from "@/hooks/useSavedClubs";
import { dataClient, dataClient as supabase } from "@/integrations/supabase/dataClient";
import { ExternalEvent } from "@/hooks/useExternalEvents";
import { EventDetailModal } from "@/components/calendar/EventDetailModal";
import { formatEventDate, formatEventTime } from "@/lib/formatters";

interface ClubReview {
  id: string;
  club_id: string;
  user_id: string;
  rating: number;
  body: string | null;
  created_at: string;
}

const StarRating = ({
  rating,
  onRate,
  readOnly = false,
}: {
  rating: number;
  onRate?: (r: number) => void;
  readOnly?: boolean;
}) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((star) => (
      <button
        key={star}
        type="button"
        disabled={readOnly}
        onClick={() => onRate?.(star)}
        className={`${readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110 transition-transform'}`}
        aria-label={`${star} star${star !== 1 ? 's' : ''}`}
      >
        <Star
          className={`w-5 h-5 ${star <= rating ? 'text-gold' : 'text-zinc-600'}`}
          fill={star <= rating ? 'currentColor' : 'none'}
        />
      </button>
    ))}
  </div>
);

const ClubDetail = () => {
  const { id } = useParams();
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<ExternalEvent | null>(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const { user } = useAuth();
  const { savedClubs, fetchSavedClubs, saveClub, unsaveClub, isSaved } = useSavedClubs();

  const { data: clubs, loading: clubsLoading } = useClubs();
  const { isOwnerOf, loading: ownershipLoading } = useClubOwnership();

  const [clubEvents, setClubEvents] = useState<ExternalEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);

  // Reviews state
  const [reviews, setReviews] = useState<ClubReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewBody, setReviewBody] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [userReview, setUserReview] = useState<ClubReview | null>(null);

  useEffect(() => {
    if (user) fetchSavedClubs(user.id);
  }, [user, fetchSavedClubs]);

  const club = useMemo(() => clubs.find(c => c.id === id), [clubs, id]);
  const isOwner = id ? isOwnerOf(id) : false;

  // Extract bare instagram handle (strip URL prefix and @)
  const instagramHandle = useMemo(() => {
    if (!club?.instagram) return null;
    const ig = club.instagram;
    const match = ig.match(/(?:instagram\.com\/)?@?([A-Za-z0-9_.]+)\/?$/);
    return match ? match[1].toLowerCase() : null;
  }, [club]);

  const fetchClubEvents = useCallback(async () => {
    if (!id) return;
    setEventsLoading(true);
    try {
      const now = new Date().toISOString();

      // Fetch by club_id
      const { data: byId } = await dataClient
        .from('events')
        .select('*')
        .eq('verified', true)
        .eq('club_id', id)
        .gte('start_time', now)
        .order('start_time', { ascending: true })
        .limit(20);

      let results: ExternalEvent[] = (byId || []) as ExternalEvent[];

      // Also fetch by instagram handle if we have one
      if (instagramHandle) {
        const { data: byHandle } = await dataClient
          .from('events')
          .select('*')
          .eq('verified', true)
          .ilike('club_handle', instagramHandle)
          .gte('start_time', now)
          .order('start_time', { ascending: true })
          .limit(20);

        const handleResults = (byHandle || []) as ExternalEvent[];
        // Merge, dedup by id
        const seen = new Set(results.map((e) => e.id));
        for (const e of handleResults) {
          if (!seen.has(e.id)) results.push(e);
        }
        results.sort((a, b) => a.start_time.localeCompare(b.start_time));
      }

      setClubEvents(results);
    } catch (err) {
      console.error('Error fetching club events:', err);
    } finally {
      setEventsLoading(false);
    }
  }, [id, instagramHandle]);

  useEffect(() => {
    if (club !== undefined) fetchClubEvents();
  }, [club, fetchClubEvents]);

  const fetchReviews = useCallback(async () => {
    if (!id) return;
    setReviewsLoading(true);
    try {
      const { data, error } = await supabase
        .from('club_reviews')
        .select('*')
        .eq('club_id', id)
        .order('created_at', { ascending: false });

      if (error) { setReviews([]); return; }

      const fetched = (data || []) as ClubReview[];
      setReviews(fetched);

      if (user) {
        const mine = fetched.find((r) => r.user_id === user.id) || null;
        setUserReview(mine);
        if (mine) { setReviewRating(mine.rating); setReviewBody(mine.body || ''); }
      }
    } catch {
      setReviews([]);
    } finally {
      setReviewsLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    if (club !== undefined) fetchReviews();
  }, [club, fetchReviews]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast.error('Please log in to write a review'); return; }
    if (reviewRating === 0) { toast.error('Please select a star rating'); return; }
    if (!id) return;
    setReviewSubmitting(true);
    try {
      const { error } = await supabase
        .from('club_reviews')
        .upsert(
          { club_id: id, user_id: user.id, rating: reviewRating, body: reviewBody.trim() || null },
          { onConflict: 'club_id,user_id' }
        );
      if (error) throw error;
      toast.success(userReview ? 'Review updated!' : 'Review submitted!');
      await fetchReviews();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to submit review';
      toast.error(message);
    } finally {
      setReviewSubmitting(false);
    }
  };

  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  // Refetch events when user returns to this tab
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && club !== undefined) {
        fetchClubEvents();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [fetchClubEvents, club]);

  // Check if club has real contact info
  const hasContactInfo = club?.email || club?.instagram || club?.website;

  if (clubsLoading) {
    return (
      <main className="min-h-screen bg-background">
        <Header />
        <div className="pt-32 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-gold animate-spin mb-4" />
          <p className="text-muted-foreground">Loading club details...</p>
        </div>
        <Footer />
      </main>
    );
  }

  if (!club) {
    return (
      <main className="min-h-screen bg-background">
        <Header />
        <div className="pt-32 text-center">
          <h1 className="text-2xl font-display font-bold">Club not found</h1>
          <Button variant="outline" className="mt-4" asChild>
            <Link to="/clubs">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Clubs
            </Link>
          </Button>
        </div>
        <Footer />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <Header />
      
      {/* Hero */}
      <section className="pt-24 md:pt-28">
        {/* Cover Image */}
        <div className="relative h-64 md:h-80 overflow-hidden">
          <img
            src={(club as any).cover_image || club.imageUrl}
            alt={club.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        </div>

        {/* Club Info */}
        <div className="container mx-auto px-4 -mt-20 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-lg"
          >
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
              <div className="flex-1">
                {/* Back Link */}
                <Link 
                  to="/clubs" 
                  className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Back to Clubs
                </Link>

                {/* Title & Status */}
                <div className="flex items-start gap-3 mb-4">
                  <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">
                    {club.name}
                  </h1>
                  {/* Only show Open/Upcoming status, hide Closed */}
                  {club.recruitingStatus !== 'closed' && (
                    <Badge 
                      variant="outline"
                      className={`mt-2 ${
                        club.recruitingStatus === 'open' 
                          ? 'bg-green-500/10 text-green-600 border-green-500/20' 
                          : 'bg-gold/10 text-gold border-gold/20'
                      }`}
                    >
                      {club.recruitingStatus === 'open' ? 'Open' : 'Upcoming'}
                    </Badge>
                  )}
                </div>

                {/* Category - only show if exists */}
                {club.category && (
                  <Badge variant="secondary" className="mb-4">{club.category}</Badge>
                )}

                {/* Description with fallback */}
                <p className="text-muted-foreground text-lg leading-relaxed max-w-2xl">
                  {club.description || "This club profile is community-maintained. Leaders can claim and update it."}
                </p>

                {/* Tags - only show if there are non-empty tags */}
                {club.tags.filter(t => t && t.trim()).length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-6">
                    {club.tags.filter(t => t && t.trim()).map((tag) => (
                      <Badge key={tag} variant="outline" className="text-sm">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Contact Info - only show if available */}
                {hasContactInfo && (
                  <div className="flex flex-wrap gap-4 mt-6">
                    {club.email && (
                      <a 
                        href={`mailto:${club.email}`}
                        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Mail className="w-4 h-4" />
                        {club.email}
                      </a>
                    )}
                    {club.instagram && (
                      <a 
                        href={club.instagram.startsWith('http') ? club.instagram : `https://instagram.com/${club.instagram.replace('@', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Instagram className="w-4 h-4" />
                        Instagram
                      </a>
                    )}
                    {club.website && (
                      <a 
                        href={club.website.startsWith('http') ? club.website : `https://${club.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Globe className="w-4 h-4" />
                        Website
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3 min-w-[200px]">
                {/* Apply Now — only when actively recruiting */}
                {club.recruitingStatus === 'open' && (
                  <Button variant="gold" size="lg" className="w-full" asChild>
                    <Link to={`/clubs/${id}/apply`}>
                      Apply Now
                    </Link>
                  </Button>
                )}
                <Button
                  variant={club.recruitingStatus === 'open' ? 'outline' : 'gold'}
                  size="lg"
                  className="w-full"
                  onClick={() => {
                    if (club.email) {
                      window.location.href = `mailto:${club.email}?subject=Interest in ${encodeURIComponent(club.name)}`;
                    } else {
                      toast.info("No email available for this club yet. Check their social links or try again later.");
                    }
                  }}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Express Interest
                </Button>
                <div className="flex gap-2">
                  <SaveClubButton
                    clubId={club.id}
                    clubName={club.name}
                    isSaved={isSaved(club.id)}
                    onSave={saveClub}
                    onUnsave={unsaveClub}
                    variant="button"
                  />
                  <Button variant="outline" size="lg">
                    <Share2 className="w-4 h-4" />
                  </Button>
                </div>
                {/* Claim Club Button - only show if not owner */}
                {!ownershipLoading && !isOwner && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => setIsClaimModalOpen(true)}
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    Claim this club
                  </Button>
                )}
                
                {/* Manage Club Button - only show if owner */}
                {!ownershipLoading && isOwner && (
                  <Button 
                    variant="gold" 
                    size="sm"
                    asChild
                  >
                    <Link to={`/club-admin/clubs/${id}/edit`}>
                      <Settings className="w-4 h-4 mr-2" />
                      Manage Club
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Tabs Section */}
      <section className="py-12 px-4">
        <div className="container mx-auto">
          <Tabs defaultValue="about" className="w-full">
            <TabsList className="mb-8">
              <TabsTrigger value="about">About</TabsTrigger>
              <TabsTrigger value="events">
                Events ({eventsLoading ? "..." : clubEvents.length})
              </TabsTrigger>
              <TabsTrigger value="reviews">
                Reviews{reviews.length > 0 ? ` (${reviews.length})` : ''}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="about">
              <div className="grid md:grid-cols-2 gap-8">
                {club.description ? (
                  <div className="premium-card p-6">
                    <h3 className="font-display text-xl font-semibold mb-4">What We Do</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {club.description}
                    </p>
                  </div>
                ) : (
                  <div className="premium-card p-6 border-dashed">
                    <h3 className="font-display text-xl font-semibold mb-4">About This Club</h3>
                    <p className="text-muted-foreground leading-relaxed mb-4">
                      This club profile is community-maintained and doesn't have detailed information yet.
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setIsClaimModalOpen(true)}
                    >
                      <Shield className="w-4 h-4 mr-2" />
                      Are you a leader? Claim to update
                    </Button>
                  </div>
                )}
                <div className="premium-card p-6">
                  <h3 className="font-display text-xl font-semibold mb-4">How to Join</h3>
                  <ol className="space-y-3 text-muted-foreground">
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gold text-primary-foreground flex items-center justify-center text-sm font-semibold">1</span>
                      <span>Click "Express Interest" to email the club directly</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gold text-primary-foreground flex items-center justify-center text-sm font-semibold">2</span>
                      <span>Attend one of their open events or info sessions</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gold text-primary-foreground flex items-center justify-center text-sm font-semibold">3</span>
                      <span>Follow their social media for updates on applications</span>
                    </li>
                  </ol>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="events">
              {eventsLoading ? (
                <div className="flex flex-col items-center py-12">
                  <Loader2 className="w-8 h-8 text-gold animate-spin mb-4" />
                  <p className="text-muted-foreground">Loading events...</p>
                </div>
              ) : clubEvents.length > 0 ? (
                <div className="grid gap-4">
                  {clubEvents.map((event, index) => {
                    const title = event.corrected_title || event.title;
                    const startTime = event.corrected_start_time || event.start_time;
                    const location = event.corrected_location || event.location;
                    return (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="premium-card p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:border-gold/30 transition-colors"
                        onClick={() => { setSelectedEvent(event); setIsEventModalOpen(true); }}
                      >
                        <div>
                          <h4 className="font-display font-semibold text-foreground">{title}</h4>
                          <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {formatEventDate(startTime)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {formatEventTime(startTime)}
                            </span>
                            {location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                {location}
                              </span>
                            )}
                          </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedEvent(event); setIsEventModalOpen(true); }}>
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Details
                        </Button>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-display text-lg font-semibold">No upcoming events</h3>
                  <p className="text-muted-foreground">Check back soon for new events!</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="reviews">
              <div className="max-w-2xl mx-auto space-y-6">
                {/* Average rating */}
                {averageRating && (
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-zinc-900 border border-white/10">
                    <span className="text-4xl font-display font-bold text-gold">{averageRating}</span>
                    <div>
                      <StarRating rating={Math.round(Number(averageRating))} readOnly />
                      <p className="text-sm text-zinc-400 mt-1">
                        {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Review list */}
                {reviewsLoading ? (
                  <div className="flex flex-col items-center py-8">
                    <Loader2 className="w-6 h-6 text-gold animate-spin mb-3" />
                    <p className="text-zinc-400 text-sm">Loading reviews...</p>
                  </div>
                ) : reviews.length === 0 ? (
                  <div className="text-center py-8 border border-white/10 rounded-xl bg-zinc-900">
                    <Star className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
                    <p className="text-zinc-300 font-medium">No reviews yet</p>
                    <p className="text-zinc-500 text-sm mt-1">Be the first to review this club</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reviews.map((review) => (
                      <div key={review.id} className="p-4 rounded-xl bg-zinc-900 border border-white/10">
                        <div className="flex items-center justify-between mb-2">
                          <StarRating rating={review.rating} readOnly />
                          <span className="text-xs text-zinc-500">
                            {new Date(review.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                        <p className="text-sm text-zinc-400 font-medium mb-1">Anonymous</p>
                        {review.body && (
                          <p className="text-sm text-zinc-300 leading-relaxed">{review.body}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Write / Edit review form */}
                <div className="p-5 rounded-xl bg-zinc-900 border border-white/10">
                  <h3 className="font-display font-semibold text-zinc-100 mb-4">
                    {userReview ? 'Edit your review' : 'Write a Review'}
                  </h3>
                  {!user ? (
                    <p className="text-zinc-400 text-sm">
                      <Link to="/login" className="text-gold hover:underline">Log in</Link> to write a review.
                    </p>
                  ) : (
                    <form onSubmit={handleSubmitReview} className="space-y-4">
                      <div>
                        <label className="block text-sm text-zinc-400 mb-2">Rating</label>
                        <StarRating rating={reviewRating} onRate={setReviewRating} />
                      </div>
                      <div>
                        <label className="block text-sm text-zinc-400 mb-2">Review (optional)</label>
                        <textarea
                          value={reviewBody}
                          onChange={(e) => setReviewBody(e.target.value)}
                          rows={3}
                          placeholder="Share your experience with this club..."
                          className="w-full rounded-lg bg-zinc-800 border border-white/10 text-zinc-100 placeholder-zinc-500 px-3 py-2 text-sm focus:outline-none focus:border-gold/50 resize-none"
                        />
                      </div>
                      <Button
                        type="submit"
                        variant="gold"
                        size="sm"
                        disabled={reviewSubmitting || reviewRating === 0}
                        className="gap-2"
                      >
                        {reviewSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                        {userReview ? 'Update Review' : 'Submit Review'}
                      </Button>
                    </form>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      <Footer />

      {/* Claim Club Modal */}
      <ClaimClubModal
        isOpen={isClaimModalOpen}
        onClose={() => setIsClaimModalOpen(false)}
        clubName={club.name}
        clubId={club.id}
      />

      {/* Event Detail Modal */}
      <EventDetailModal
        event={selectedEvent}
        isOpen={isEventModalOpen}
        onClose={() => { setIsEventModalOpen(false); setSelectedEvent(null); }}
      />
    </main>
  );
};

export default ClubDetail;
