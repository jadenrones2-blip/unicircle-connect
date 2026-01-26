import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send, Calendar, MapPin, CheckCircle2, ArrowLeft, Plus, Shield, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useClubOwnership } from '@/hooks/useClubOwnership';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
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
});

type EventSubmission = z.infer<typeof eventSubmissionSchema>;

interface SubmittedEventDetails {
  title: string;
  date: string;
  time?: string;
  location: string;
  clubName: string;
}

export default function SubmitEvent() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { ownedClubs, loading: ownershipLoading } = useClubOwnership();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedDetails, setSubmittedDetails] = useState<SubmittedEventDetails | null>(null);
  
  const form = useForm<EventSubmission>({
    resolver: zodResolver(eventSubmissionSchema),
    defaultValues: {
      event_title: '',
      club_id: '',
      event_date: '',
      event_time: '',
      location: '',
      description: '',
    },
  });

  // Set default club if user only owns one
  useEffect(() => {
    if (ownedClubs.length === 1) {
      form.setValue('club_id', ownedClubs[0].clubId);
    }
  }, [ownedClubs, form]);

  const selectedClub = ownedClubs.find(c => c.clubId === form.watch('club_id'));

  const onSubmit = async (data: EventSubmission) => {
    if (!selectedClub) return;
    
    setSubmitting(true);

    try {
      // Construct start_time from date and time
      const startDateTime = data.event_time 
        ? `${data.event_date}T${data.event_time}:00`
        : `${data.event_date}T18:00:00`;

      const eventRecord = {
        title: data.event_title.trim(),
        start_time: new Date(startDateTime).toISOString(),
        location: data.location?.trim() || 'UCSD Campus',
        club_handle: selectedClub.clubId,
        source: 'club_owner',
        caption: data.description?.trim() || null,
        verified: true, // Auto-verify since submitted by owner
        posted_at: new Date().toISOString(),
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
        <div className="container mx-auto px-4 max-w-2xl">
          {isLoading ? (
            /* Loading State */
            <div className="text-center py-16">
              <Loader2 className="w-8 h-8 text-gold animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading...</p>
            </div>
          ) : !user ? (
            /* Not Logged In */
            <div className="text-center py-16">
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
            /* No Club Ownership */
            <div className="text-center py-16">
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
            /* Success Confirmation */
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 mb-6">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
              <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-3">
                Event Published!
              </h1>
              <p className="text-muted-foreground max-w-md mx-auto mb-8">
                Your event is now live on the UniCircle calendar.
              </p>

              {/* Submitted Event Details */}
              <div className="premium-card p-6 md:p-8 text-left mb-8">
                <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-gold" />
                  Event Details
                </h2>
                
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
                </div>
              </div>

              {/* Action Buttons */}
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
            <>
              {/* Header */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gold/10 border border-gold/20 text-gold mb-4">
                  <Shield className="w-4 h-4" />
                  <span className="text-sm font-medium">Verified Club Owner</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-3">
                  Submit an Event
                </h1>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Add an event to the UniCircle calendar for your club.
                </p>
              </div>

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
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Choose a club" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {ownedClubs.map((club) => (
                                <SelectItem key={club.clubId} value={club.clubId}>
                                  {club.clubName}
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
                    <div className="p-3 rounded-lg bg-gold/10 border border-gold/20">
                      <p className="text-sm text-foreground">
                        Submitting for: <span className="font-medium text-gold">{ownedClubs[0].clubName}</span>
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

                  {/* Submit Button */}
                  <Button 
                    type="submit" 
                    variant="gold" 
                    className="w-full"
                    disabled={submitting || !selectedClub}
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 mr-2" />
                    )}
                    {submitting ? 'Publishing...' : 'Publish Event'}
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    Events from verified owners are published immediately.
                  </p>
                </form>
              </Form>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
