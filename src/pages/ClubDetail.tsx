import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  Calendar, 
  MapPin, 
  Clock, 
  Share2, 
  Heart,
  ExternalLink,
  Loader2,
  Shield,
  Mail,
  Instagram,
  Globe
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ExpressInterestModal from "@/components/ExpressInterestModal";
import ClaimClubModal from "@/components/ClaimClubModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useClubs, useEvents } from "@/hooks/useExternalDB";

const ClubDetail = () => {
  const { id } = useParams();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const { data: clubs, loading: clubsLoading } = useClubs();
  const { data: events, loading: eventsLoading } = useEvents(clubs);

  const club = useMemo(() => clubs.find(c => c.id === id), [clubs, id]);
  const clubEvents = useMemo(() => events.filter(e => e.clubId === id), [events, id]);

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
            src={club.imageUrl}
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
                <Button 
                  variant="gold" 
                  size="lg" 
                  className="w-full"
                  onClick={() => setIsModalOpen(true)}
                >
                  I'm Interested
                </Button>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="lg" 
                    className="flex-1"
                    onClick={() => setIsSaved(!isSaved)}
                  >
                    <Heart className={`w-4 h-4 mr-2 ${isSaved ? "fill-red-500 text-red-500" : ""}`} />
                    {isSaved ? "Saved" : "Save"}
                  </Button>
                  <Button variant="outline" size="lg">
                    <Share2 className="w-4 h-4" />
                  </Button>
                </div>
                {/* Claim Club Button */}
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => setIsClaimModalOpen(true)}
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Claim this club
                </Button>
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
                      <span>Express your interest using the button above</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gold text-primary-foreground flex items-center justify-center text-sm font-semibold">2</span>
                      <span>Attend one of our open events or info sessions</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gold text-primary-foreground flex items-center justify-center text-sm font-semibold">3</span>
                      <span>Complete the membership application</span>
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
                  {clubEvents.map((event, index) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="premium-card p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div>
                        <h4 className="font-display font-semibold text-foreground">{event.title}</h4>
                        <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(event.date).toLocaleDateString('en-US', { 
                              month: 'long', 
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {event.time}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {event.location}
                          </span>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Details
                      </Button>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-display text-lg font-semibold">No upcoming events</h3>
                  <p className="text-muted-foreground">Check back soon for new events!</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </section>

      <Footer />

      {/* Express Interest Modal */}
      <ExpressInterestModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        clubName={club.name}
        clubId={club.id}
      />

      {/* Claim Club Modal */}
      <ClaimClubModal
        isOpen={isClaimModalOpen}
        onClose={() => setIsClaimModalOpen(false)}
        clubName={club.name}
        clubId={club.id}
      />
    </main>
  );
};

export default ClubDetail;
