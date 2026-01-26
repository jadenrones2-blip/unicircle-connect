import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send, Instagram, Calendar, MapPin, Users } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const eventSubmissionSchema = z.object({
  event_title: z.string().trim().min(1, 'Event title is required').max(200, 'Title must be under 200 characters'),
  club_name: z.string().trim().min(1, 'Club name is required').max(200, 'Club name must be under 200 characters'),
  instagram_handle: z.string().max(100, 'Handle must be under 100 characters').optional().or(z.literal('')),
  event_date: z.string().min(1, 'Event date is required'),
  event_time: z.string().optional().or(z.literal('')),
  location: z.string().max(300, 'Location must be under 300 characters').optional().or(z.literal('')),
  description: z.string().max(2000, 'Description must be under 2000 characters').optional().or(z.literal('')),
  instagram_post_url: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  submitter_email: z.string().email('Please enter a valid email').optional().or(z.literal('')),
});

type EventSubmission = z.infer<typeof eventSubmissionSchema>;

export default function SubmitEvent() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  
  const form = useForm<EventSubmission>({
    resolver: zodResolver(eventSubmissionSchema),
    defaultValues: {
      event_title: '',
      club_name: '',
      instagram_handle: '',
      event_date: '',
      event_time: '',
      location: '',
      description: '',
      instagram_post_url: '',
      submitter_email: '',
    },
  });

  const onSubmit = async (data: EventSubmission) => {
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
        club_handle: data.instagram_handle?.replace('@', '').trim() || null,
        source: 'user_submission',
        source_url: data.instagram_post_url?.trim() || null,
        caption: data.description?.trim() || null,
        verified: false,
        posted_at: new Date().toISOString(),
      };

      // Use query params approach for POST
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

      toast.success('Event submitted! It will appear on the calendar after review.');
      form.reset();

    } catch (err) {
      console.error('Submission error:', err);
      toast.error('Failed to submit event. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gold/10 border border-gold/20 text-gold mb-4">
              <Instagram className="w-4 h-4" />
              <span className="text-sm font-medium">Community Submissions</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-3">
              Submit an Event
            </h1>
            <p className="text-muted-foreground max-w-md mx-auto">
              Saw an event on Instagram? Help the UCSD community by adding it to our calendar.
            </p>
          </div>

          {/* Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="premium-card p-6 md:p-8 space-y-6">
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
                            placeholder="6:00 PM"
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

              {/* Club Info */}
              <div className="space-y-4 pt-4 border-t border-border">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Users className="w-5 h-5 text-gold" />
                  Club Information
                </h2>

                <FormField
                  control={form.control}
                  name="club_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Club Name *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Triton Engineering Student Council"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="instagram_handle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1">
                        <Instagram className="w-4 h-4" />
                        Club's Instagram Handle
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="@ucsd_tesc"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Source (Optional) */}
              <div className="space-y-4 pt-4 border-t border-border">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Instagram className="w-5 h-5 text-gold" />
                  Instagram Source
                  <span className="text-sm font-normal text-muted-foreground">(optional)</span>
                </h2>

                <FormField
                  control={form.control}
                  name="instagram_post_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Link to Instagram Post</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://instagram.com/p/..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                      <p className="text-xs text-muted-foreground">
                        Helps us verify the event details
                      </p>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="submitter_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your Email (optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="your@ucsd.edu"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                      <p className="text-xs text-muted-foreground">
                        We'll notify you when your submission is approved
                      </p>
                    </FormItem>
                  )}
                />
              </div>

              {/* Submit Button */}
              <Button 
                type="submit" 
                variant="gold" 
                className="w-full"
                disabled={submitting}
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                {submitting ? 'Submitting...' : 'Submit Event'}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Submissions are reviewed before appearing on the calendar.
              </p>
            </form>
          </Form>
        </div>
      </main>

      <Footer />
    </div>
  );
}
