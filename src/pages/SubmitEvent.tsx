import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send, Instagram, Calendar, MapPin, Clock, Users } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface EventSubmission {
  event_title: string;
  club_name: string;
  instagram_handle: string;
  event_date: string;
  event_time: string;
  location: string;
  description: string;
  instagram_post_url: string;
  submitter_email: string;
}

export default function SubmitEvent() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<EventSubmission>({
    event_title: '',
    club_name: '',
    instagram_handle: '',
    event_date: '',
    event_time: '',
    location: '',
    description: '',
    instagram_post_url: '',
    submitter_email: '',
  });

  const handleInputChange = (field: keyof EventSubmission, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.event_title.trim() || !formData.club_name.trim() || !formData.event_date) {
      toast.error('Please fill in required fields');
      return;
    }

    setSubmitting(true);

    try {
      // Construct start_time from date and time
      const startDateTime = formData.event_time 
        ? `${formData.event_date}T${formData.event_time}:00`
        : `${formData.event_date}T18:00:00`;

      const eventRecord = {
        title: formData.event_title.trim(),
        start_time: new Date(startDateTime).toISOString(),
        location: formData.location.trim() || 'UCSD Campus',
        club_handle: formData.instagram_handle.replace('@', '').trim() || null,
        source: 'user_submission',
        source_url: formData.instagram_post_url.trim() || null,
        caption: formData.description.trim() || null,
        verified: false,
        posted_at: new Date().toISOString(),
      };

      const { error } = await supabase.functions.invoke('external-db-proxy', {
        body: { record: eventRecord },
        method: 'POST',
      });

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
      
      // Reset form
      setFormData({
        event_title: '',
        club_name: '',
        instagram_handle: '',
        event_date: '',
        event_time: '',
        location: '',
        description: '',
        instagram_post_url: '',
        submitter_email: '',
      });

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
          <form onSubmit={handleSubmit} className="premium-card p-6 md:p-8 space-y-6">
            {/* Event Details */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Calendar className="w-5 h-5 text-gold" />
                Event Details
              </h2>
              
              <div className="space-y-2">
                <Label htmlFor="event_title">Event Title *</Label>
                <Input
                  id="event_title"
                  value={formData.event_title}
                  onChange={(e) => handleInputChange('event_title', e.target.value)}
                  placeholder="e.g. Spring Info Session"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="event_date">Date *</Label>
                  <Input
                    id="event_date"
                    type="date"
                    value={formData.event_date}
                    onChange={(e) => handleInputChange('event_date', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="event_time">Time</Label>
                  <Input
                    id="event_time"
                    type="time"
                    value={formData.event_time}
                    onChange={(e) => handleInputChange('event_time', e.target.value)}
                    placeholder="6:00 PM"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location" className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  Location
                </Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  placeholder="e.g. Price Center East Ballroom"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="What's this event about?"
                  rows={3}
                />
              </div>
            </div>

            {/* Club Info */}
            <div className="space-y-4 pt-4 border-t border-border">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Users className="w-5 h-5 text-gold" />
                Club Information
              </h2>

              <div className="space-y-2">
                <Label htmlFor="club_name">Club Name *</Label>
                <Input
                  id="club_name"
                  value={formData.club_name}
                  onChange={(e) => handleInputChange('club_name', e.target.value)}
                  placeholder="e.g. Triton Engineering Student Council"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="instagram_handle" className="flex items-center gap-1">
                  <Instagram className="w-4 h-4" />
                  Club's Instagram Handle
                </Label>
                <Input
                  id="instagram_handle"
                  value={formData.instagram_handle}
                  onChange={(e) => handleInputChange('instagram_handle', e.target.value)}
                  placeholder="@ucsd_tesc"
                />
              </div>
            </div>

            {/* Source (Optional) */}
            <div className="space-y-4 pt-4 border-t border-border">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Instagram className="w-5 h-5 text-gold" />
                Instagram Source
                <span className="text-sm font-normal text-muted-foreground">(optional)</span>
              </h2>

              <div className="space-y-2">
                <Label htmlFor="instagram_post_url">Link to Instagram Post</Label>
                <Input
                  id="instagram_post_url"
                  value={formData.instagram_post_url}
                  onChange={(e) => handleInputChange('instagram_post_url', e.target.value)}
                  placeholder="https://instagram.com/p/..."
                />
                <p className="text-xs text-muted-foreground">
                  Helps us verify the event details
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="submitter_email">Your Email (optional)</Label>
                <Input
                  id="submitter_email"
                  type="email"
                  value={formData.submitter_email}
                  onChange={(e) => handleInputChange('submitter_email', e.target.value)}
                  placeholder="your@ucsd.edu"
                />
                <p className="text-xs text-muted-foreground">
                  We'll notify you when your submission is approved
                </p>
              </div>
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
        </div>
      </main>

      <Footer />
    </div>
  );
}
