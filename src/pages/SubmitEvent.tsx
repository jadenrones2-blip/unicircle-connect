import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { dataClient } from '@/integrations/supabase/dataClient';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send, Calendar, MapPin, Shield, AlertTriangle, Instagram, Image as ImageIcon, FileText, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useClubOwnership } from '@/hooks/useClubOwnership';
import { EventImageUpload } from '@/components/club-admin/EventImageUpload';
import { EventPreviewCard } from '@/components/club-admin/EventPreviewCard';
import { FlyerAutoFill, ExtractedEventData } from '@/components/club-admin/FlyerAutoFill';
import { AdminBreadcrumb } from '@/components/club-admin/AdminBreadcrumb';
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
  co_hosts: z.string().optional().or(z.literal('')),
});

type EventSubmission = z.infer<typeof eventSubmissionSchema>;

export default function SubmitEvent() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedClubId = searchParams.get('club');
  
  const { user, loading: authLoading } = useAuth();
  const { ownedClubs, loading: ownershipLoading, canPerformAction } = useClubOwnership();
  const [submitting, setSubmitting] = useState(false);
  
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
      co_hosts: '',
    },
  });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      const redirectPath = preselectedClubId 
        ? `/submit-event?club=${preselectedClubId}` 
        : '/submit-event';
      toast.error('Please log in to submit events');
      navigate(`/login?redirect=${encodeURIComponent(redirectPath)}`);
    }
  }, [authLoading, user, preselectedClubId, navigate]);

  // Redirect to clubs page if authenticated but no club ownership
  useEffect(() => {
    if (!authLoading && !ownershipLoading && user && ownedClubs.length === 0) {
      toast.error('You need to claim a club before submitting events');
      navigate('/clubs');
    }
  }, [authLoading, ownershipLoading, user, ownedClubs, navigate]);

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

  // Handle AI extraction from flyer
  const handleFlyerExtracted = (data: ExtractedEventData) => {
    if (data.title) {
      form.setValue('event_title', data.title);
    }
    if (data.date) {
      form.setValue('event_date', data.date);
    }
    if (data.time) {
      form.setValue('event_time', data.time);
    }
    if (data.location) {
      form.setValue('location', data.location);
    }
    if (data.description) {
      form.setValue('description', data.description);
    }
  };

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
        source_url: data.instagram_url?.trim() || null, // Use source_url which exists in schema
      };

      const { error: dbError } = await dataClient
        .from('events')
        .insert(eventRecord);

      if (dbError) {
        throw new Error(dbError.message || 'Failed to submit event');
      }

      // Save co-hosts if any (best-effort, don't block on failure)
      if (data.co_hosts?.trim() && !dbError) {
        const coHostNames = data.co_hosts.split(',').map((s) => s.trim()).filter(Boolean);
        // We use a placeholder event_id since dataClient doesn't return the inserted id easily
        // Store using club_handle + start_time as a composite key
        const eventKey = `${eventRecord.club_handle}_${eventRecord.start_time}`;
        const coHostRecords = coHostNames.map((name) => ({
          event_id: eventKey,
          club_id: name.toLowerCase().replace(/\s+/g, '-'),
          club_name: name,
        }));
        supabase.from('event_cohosts').insert(coHostRecords).then(() => {});
      }

      // Success - show toast and redirect to club admin events page
      toast.success(canPublish ? 'Event published!' : 'Event saved as draft');
      navigate(`/club-admin/clubs/${selectedClub.clubId}/events`);

    } catch (err) {
      console.error('Submission error:', err);
      toast.error('Failed to submit event. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const isLoading = authLoading || ownershipLoading;
  
  // Don't render form content if not authenticated or no club ownership - redirects will handle it
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 pt-24 pb-16">
          <div className="container mx-auto px-4">
            <div className="text-center py-16">
              <Loader2 className="w-8 h-8 text-gold animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading...</p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Show loading while redirect is happening (useEffect will redirect)
  if (!user || ownedClubs.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 pt-24 pb-16">
          <div className="container mx-auto px-4">
            <div className="text-center py-16">
              <Loader2 className="w-8 h-8 text-gold animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Redirecting...</p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-5 gap-8 max-w-6xl mx-auto">
              {/* Form Column */}
              <div className="lg:col-span-3">
              {/* Breadcrumb */}
                <AdminBreadcrumb 
                  items={[
                    ...(selectedClub ? [{ label: selectedClub.clubName, href: `/club-admin/clubs/${selectedClub.clubId}/events` }] : []),
                    { label: isProvisional ? 'Draft Event' : 'Submit Event' }
                  ]} 
                  className="mb-6"
                />

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

                    {/* AI Auto-fill from Flyer */}
                    <div className="space-y-2">
                      <FlyerAutoFill 
                        onExtracted={handleFlyerExtracted}
                        disabled={!selectedClubId}
                      />
                    </div>

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

                    {/* Co-hosts */}
                    <div className="space-y-4">
                      <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                        <Users className="w-5 h-5 text-gold" />
                        Co-hosts
                      </h2>
                      <FormField
                        control={form.control}
                        name="co_hosts"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Co-hosting Clubs</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g. ACM UCSD, TESC, Design Co"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              Comma-separated list of other clubs co-hosting this event (optional)
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
          </div>
        </main>

      <Footer />
    </div>
  );
}
