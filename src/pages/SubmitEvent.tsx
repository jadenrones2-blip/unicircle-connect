import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send, Calendar, MapPin, CheckCircle2, ArrowLeft, Plus, Shield, Lock, AlertTriangle, FileText, Instagram, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useClubOwnership, ClubOwnership } from '@/hooks/useClubOwnership';
import { EventImageUpload } from '@/components/club-admin/EventImageUpload';
import { EventPreviewCard } from '@/components/club-admin/EventPreviewCard';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const eventSubmissionSchema = z.object({
  event_title: z.string().trim().min(1, 'Event title is required').max(200, 'Title must be under 200 characters'),
  club_id: z.string().min(1, 'Please select a club'),
  event_date: z.string().min(1, 'Event date is required'),
  event_time: z.string().optional().or(z.literal('')),
  location: z.string().max(300, 'Location must be under 300 characters').optional().or(z.literal('')),
  description: z.string().max(2000, 'Description must be under 2000 characters').optional().or(z.literal('')),
  instagram_url: z.string()
    .optional()
    .or(z.literal(''))
    .refine(
      (val) => !val || val.match(/^https?:\/\/(www\.)?(instagram\.com|instagr\.am)\/.+/i),
      'Please enter a valid Instagram URL'
    ),
  image_url: z.string().nullable().optional(),
});

type EventSubmission = z.infer<typeof eventSubmissionSchema>;

interface SubmittedEventDetails {
  title: string;
  date: string;
  time?: string;
  location: string;
  clubName: string;
  isDraft: boolean;
  imageUrl?: string | null;
  instagramUrl?: string;
}

export default function SubmitEvent() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedClubId = searchParams.get('club');
  
  const { user, loading: authLoading } = useAuth();
  const { ownedClubs, loading: ownershipLoading, canPerformAction, getClubOwnership } = useClubOwnership();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedDetails, setSubmittedDetails] = useState<SubmittedEventDetails | null>(null);
  
  const form = useForm<EventSubmission>({
    resolver: zodResolver(eventSubmissionSchema),
    defaultValues: {
      event_title: '',
      club_id: preselectedClubId || '',
      event_date: '',
      event_time: '',
      location: '',
      description: '',
      instagram_url: '',
      image_url: null,
    },
  });

  // Set default club if user only owns one or if preselected
  useEffect(() => {
    if (preselectedClubId && ownedClubs.some(c => c.clubId === preselectedClubId)) {
      form.setValue('club_id', preselectedClubId);
    } else if (ownedClubs.length === 1) {
      form.setValue('club_id', ownedClubs[0].clubId);
    }
  }, [ownedClubs, preselectedClubId, form]);

  const selectedClubId = form.watch('club_id');
  const selectedClub = ownedClubs.find(c => c.clubId === selectedClubId);
  const canPublish = selectedClub ? canPerformAction(selectedClub.clubId, 'can_publish_events') : false;
  const isProvisional = selectedClub?.verificationState === 'provisional';

  // Watch form values for live preview
  const watchedValues = form.watch();

  const onSubmit = async (data: EventSubmission) => {
    if (!selectedClub) return;
    
    setSubmitting(true);

    try {
      // Construct start_time from date and time
      const startDateTime = data.event_time 
        ? `${data.event_date}T${data.event_time}:00`
        : `${data.event_date}T18:00:00`;

      // If provisional, save as unverified draft
      const eventRecord = {
        title: data.event_title.trim(),
        start_time: new Date(startDateTime).toISOString(),
        location: data.location?.trim() || 'UCSD Campus',
        club_handle: selectedClub.clubId,
        source: 'club_owner',
        caption: data.description?.trim() || null,
        verified: canPublish, // Only verified if can_publish_events
        posted_at: canPublish ? new Date().toISOString() : null, // Only post if verified
        post_link: data.instagram_url?.trim() || null,
        image_url: data.image_url || null,
      };

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/external-db-proxy?table=events&action=insert`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ record: eventRecord }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to submit event');
      }

      setSubmittedDetails({
        title: data.event_title,
        date: data.event_date,
        time: data.event_time || undefined,
        location: data.location || 'UCSD Campus',
        clubName: selectedClub.clubName,
        isDraft: !canPublish,
        imageUrl: data.image_url,
        instagramUrl: data.instagram_url || undefined,
      });
      setSubmitted(true);
      form.reset();

    } catch (err) {
      console.error('Submission error:', err);
      toast.error('Failed to submit event. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const isLoading = authLoading || ownershipLoading;
  const hasAccess = user && ownedClubs.length > 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-4">
          {isLoading ? (
            <div className="text-center py-16">
              <Loader2 className="w-8 h-8 text-gold animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading...</p>
            </div>
          ) : !user ? (
            <div className="text-center py-16 max-w-2xl mx-auto">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/50 border border-border mb-6">
                <Lock className="w-8 h-8 text-muted-foreground" />
              </div>
              <h1 className="text-2xl font-display font-bold text-foreground mb-3">
                Sign In Required
              </h1>
              <p className="text-muted-foreground max-w-md mx-auto mb-6">
                You need to be signed in to submit events. Only verified club owners can add events to the calendar.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button variant="outline" onClick={() => navigate('/clubs')}>
                  Browse Clubs
                </Button>
                <Button variant="gold" onClick={() => navigate('/login')}>
                  Sign In
                </Button>
              </div>
            </div>
          ) : !hasAccess ? (
            <div className="text-center py-16 max-w-2xl mx-auto">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gold/10 border border-gold/20 mb-6">
                <Shield className="w-8 h-8 text-gold" />
              </div>
              <h1 className="text-2xl font-display font-bold text-foreground mb-3">
                Club Ownership Required
              </h1>
              <p className="text-muted-foreground max-w-md mx-auto mb-6">
                Only verified club owners can submit events. Claim your club to start adding events to the calendar.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button variant="outline" onClick={() => navigate('/events')}>
                  View Calendar
                </Button>
                <Button variant="gold" onClick={() => navigate('/clubs')}>
                  Find Your Club
                </Button>
              </div>
            </div>
          ) : submitted && submittedDetails ? (
            <div className="max-w-2xl mx-auto text-center">
              <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-6 ${
                submittedDetails.isDraft 
                  ? 'bg-yellow-500/10 border border-yellow-500/20' 
                  : 'bg-green-500/10 border border-green-500/20'
              }`}>
                {submittedDetails.isDraft ? (
                  <FileText className="w-8 h-8 text-yellow-600" />
                ) : (
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                )}
              </div>
              <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-3">
                {submittedDetails.isDraft ? 'Event Saved as Draft!' : 'Event Published!'}
              </h1>
              <p className="text-muted-foreground max-w-md mx-auto mb-8">
                {submittedDetails.isDraft 
                  ? 'Your event has been saved but is pending review. It will be published once your account is fully verified.'
                  : 'Your event is now live on the UniCircle calendar.'
                }
              </p>

              {submittedDetails.isDraft && (
                <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-left mb-6 max-w-md mx-auto">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-foreground text-sm mb-1">Provisional Account</h4>
                      <p className="text-sm text-muted-foreground">
                        Your account is provisional. Events you submit are saved as drafts and won't be publicly visible until:
                      </p>
                      <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                        <li>• You verify with a .edu email, or</li>
                        <li>• Another verified admin confirms you</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              <div className="premium-card p-6 md:p-8 text-left mb-8">
                <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-gold" />
                  Event Details
                  {submittedDetails.isDraft && (
                    <Badge variant="outline" className="border-yellow-500/50 text-yellow-600 bg-yellow-500/10 ml-auto">
                      Draft
                    </Badge>
                  )}
                </h2>
                
                {submittedDetails.imageUrl && (
                  <div className="mb-4 rounded-lg overflow-hidden">
                    <img 
                      src={submittedDetails.imageUrl} 
                      alt={submittedDetails.title}
                      className="w-full h-40 object-cover"
                    />
                  </div>
                )}
                
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="text-muted-foreground w-24 shrink-0">Title:</span>
                    <span className="text-foreground font-medium">{submittedDetails.title}</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-muted-foreground w-24 shrink-0">Date:</span>
                    <span className="text-foreground">{new Date(submittedDetails.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  </div>
                  {submittedDetails.time && (
                    <div className="flex items-start gap-3">
                      <span className="text-muted-foreground w-24 shrink-0">Time:</span>
                      <span className="text-foreground">{submittedDetails.time}</span>
                    </div>
                  )}
                  <div className="flex items-start gap-3">
                    <span className="text-muted-foreground w-24 shrink-0">Location:</span>
                    <span className="text-foreground">{submittedDetails.location}</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-muted-foreground w-24 shrink-0">Club:</span>
                    <span className="text-foreground">{submittedDetails.clubName}</span>
                  </div>
                  {submittedDetails.instagramUrl && (
                    <div className="flex items-start gap-3">
                      <span className="text-muted-foreground w-24 shrink-0">Instagram:</span>
                      <a 
                        href={submittedDetails.instagramUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-pink-500 hover:underline flex items-center gap-1"
                      >
                        <Instagram className="w-4 h-4" />
                        View Post
                      </a>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  variant="outline"
                  onClick={() => navigate('/events')}
                  className="gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  View Calendar
                </Button>
                <Button
                  variant="gold"
                  onClick={() => {
                    setSubmitted(false);
                    setSubmittedDetails(null);
                  }}
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Submit Another Event
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid lg:grid-cols-5 gap-8 max-w-6xl mx-auto">
              {/* Form Column */}
              <div className="lg:col-span-3">
                {/* Header */}
                <div className="text-center lg:text-left mb-8">
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4 ${
                    isProvisional 
                      ? 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-600'
                      : 'bg-gold/10 border border-gold/20 text-gold'
                  }`}>
                    {isProvisional ? <AlertTriangle className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                    <span className="text-sm font-medium">
                      {isProvisional ? 'Provisional Club Owner' : 'Verified Club Owner'}
                    </span>
                  </div>
                  <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-3">
                    {isProvisional ? 'Draft an Event' : 'Submit an Event'}
                  </h1>
                  <p className="text-muted-foreground max-w-md">
                    {isProvisional 
                      ? 'Your events will be saved as drafts until your account is fully verified.'
                      : 'Add an event to the UniCircle calendar for your club.'
                    }
                  </p>
                </div>

                {/* Provisional Warning */}
                {isProvisional && (
                  <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30 mb-6">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-foreground text-sm mb-1">Provisional Account Restrictions</h4>
                        <p className="text-sm text-muted-foreground">
                          Events you submit will be saved as drafts and won't appear publicly until your account is fully verified. 
                          Verify with a .edu email to get full publishing access.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Form */}
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="premium-card p-6 md:p-8 space-y-6">
                    {/* Club Selection */}
                    {ownedClubs.length > 1 && (
                      <FormField
                        control={form.control}
                        name="club_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Select Club *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Choose a club" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {ownedClubs.map((club) => (
                                  <SelectItem key={club.clubId} value={club.clubId}>
                                    <span className="flex items-center gap-2">
                                      {club.clubName}
                                      {club.verificationState === 'provisional' && (
                                        <Badge variant="outline" className="border-yellow-500/50 text-yellow-600 bg-yellow-500/10 text-xs">
                                          Provisional
                                        </Badge>
                                      )}
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {ownedClubs.length === 1 && (
                      <div className={`p-3 rounded-lg ${
                        isProvisional 
                          ? 'bg-yellow-500/10 border border-yellow-500/20'
                          : 'bg-gold/10 border border-gold/20'
                      }`}>
                        <p className="text-sm text-foreground flex items-center gap-2">
                          Submitting for: <span className={`font-medium ${isProvisional ? 'text-yellow-600' : 'text-gold'}`}>{ownedClubs[0].clubName}</span>
                          {isProvisional && (
                            <Badge variant="outline" className="border-yellow-500/50 text-yellow-600 bg-yellow-500/10 text-xs">
                              Provisional
                            </Badge>
                          )}
                        </p>
                      </div>
                    )}

                    {/* Event Details */}
                    <div className="space-y-4">
                      <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-gold" />
                        Event Details
                      </h2>
                      
                      <FormField
                        control={form.control}
                        name="event_title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Event Title *</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g. Spring Info Session"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="event_date"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Date *</FormLabel>
                              <FormControl>
                                <Input
                                  type="date"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="event_time"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Time</FormLabel>
                              <FormControl>
                                <Input
                                  type="time"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="location"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              Location
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g. Price Center East Ballroom"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="What's this event about?"
                                rows={3}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Media Section */}
                    <div className="space-y-4">
                      <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                        <ImageIcon className="w-5 h-5 text-gold" />
                        Media
                      </h2>

                      <FormField
                        control={form.control}
                        name="image_url"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Event Image</FormLabel>
                            <FormControl>
                              <EventImageUpload
                                clubId={selectedClubId || 'default'}
                                value={field.value || null}
                                onChange={field.onChange}
                                disabled={!selectedClubId}
                              />
                            </FormControl>
                            <FormDescription>
                              Upload a flyer or promotional image for your event
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="instagram_url"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-1">
                              <Instagram className="w-4 h-4 text-pink-500" />
                              Instagram Post Link
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="https://instagram.com/p/..."
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              Link to the Instagram post for this event (optional)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Submit Button */}
                    <Button 
                      type="submit" 
                      variant={isProvisional ? 'outline' : 'gold'}
                      className={`w-full ${isProvisional ? 'border-yellow-500/50 text-yellow-600 hover:bg-yellow-500/10' : ''}`}
                      disabled={submitting || !selectedClub}
                    >
                      {submitting ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : isProvisional ? (
                        <FileText className="w-4 h-4 mr-2" />
                      ) : (
                        <Send className="w-4 h-4 mr-2" />
                      )}
                      {submitting 
                        ? (isProvisional ? 'Saving Draft...' : 'Publishing...') 
                        : (isProvisional ? 'Save as Draft' : 'Publish Event')
                      }
                    </Button>

                    <p className="text-xs text-center text-muted-foreground">
                      {isProvisional 
                        ? 'Drafts are saved but not publicly visible until verified.'
                        : 'Events from verified owners are published immediately.'
                      }
                    </p>
                  </form>
                </Form>
              </div>

              {/* Preview Column */}
              <div className="lg:col-span-2">
                <div className="sticky top-24">
                  <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    Live Preview
                  </h2>
                  <EventPreviewCard
                    title={watchedValues.event_title}
                    clubName={selectedClub?.clubId || selectedClubId || ''}
                    date={watchedValues.event_date}
                    time={watchedValues.event_time}
                    location={watchedValues.location}
                    description={watchedValues.description}
                    imageUrl={watchedValues.image_url}
                    instagramUrl={watchedValues.instagram_url}
                    isDraft={isProvisional}
                  />
                  <p className="text-xs text-muted-foreground text-center mt-3">
                    This is how your event will appear in the calendar
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
