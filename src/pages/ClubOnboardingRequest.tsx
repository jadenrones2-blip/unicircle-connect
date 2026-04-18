import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Loader2, Send } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const CATEGORIES = [
  'Academic',
  'Arts',
  'Athletics',
  'Business',
  'Community Service',
  'Cultural',
  'Greek Life',
  'Hobby',
  'Political',
  'Religious',
  'Social',
  'Technology',
  'Other',
] as const;

export default function ClubOnboardingRequest() {
  const [clubName, setClubName] = useState('');
  const [university, setUniversity] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [proofLink, setProofLink] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!clubName.trim() || !contactEmail.trim() || !category) {
      toast.error('Please fill in club name, contact email, and category.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      toast.error('Please enter a valid email address.');
      return;
    }

    setSubmitting(true);
    try {
      // Insert into new_club_requests table
      const { error: insertError } = await (supabase as any)
        .from('new_club_requests')
        .insert({
          club_name: clubName.trim(),
          user_email: contactEmail.trim().toLowerCase(),
          club_category: category,
          club_description: description.trim() || null,
          proof_link: proofLink.trim() || null,
          additional_notes: additionalNotes.trim() || null,
          status: 'pending',
        });

      if (insertError) {
        console.error('Insert error:', insertError);
        throw insertError;
      }

      // Notify admin via edge function (best-effort)
      try {
        await supabase.functions.invoke('notify-club-request', {
          body: {
            type: 'new_request',
            clubName: clubName.trim(),
            contactEmail: contactEmail.trim().toLowerCase(),
            university: university.trim() || undefined,
            category,
            description: description.trim() || undefined,
            proofLink: proofLink.trim() || undefined,
          },
        });
      } catch { /* non-fatal — admin notification email failed */ }

      setSubmitted(true);
    } catch (err) {
      console.error('Submission error:', err);
      toast.error('Failed to submit request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <main className="min-h-screen bg-background">
        <Header />
        <div className="pt-32 flex flex-col items-center justify-center px-4 text-center">
          <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-6">
            <CheckCircle2 className="w-8 h-8 text-green-500" />
          </div>
          <h1 className="text-3xl font-display font-bold text-white mb-3">Request Submitted!</h1>
          <p className="text-zinc-400 max-w-sm mb-2">
            We've received your request to add <strong className="text-white">{clubName}</strong> to Unicircle.
          </p>
          <p className="text-zinc-500 max-w-sm mb-8 text-sm">
            We'll review your request and reach out to <strong className="text-zinc-300">{contactEmail}</strong> within 48 hours.
          </p>
          <Button variant="outline" asChild>
            <Link to="/clubs">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Browse Clubs
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

      <div className="container mx-auto px-4 pt-28 pb-20 max-w-2xl">
        <Link
          to="/club-admin"
          className="inline-flex items-center text-sm text-zinc-500 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back to Club Admin
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-white mb-2">
            Add Your Club to Unicircle
          </h1>
          <p className="text-zinc-500">
            Fill out this form to request your club be added to the platform. We'll review and respond within 48 hours.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="rounded-xl border border-white/10 bg-zinc-900/40 p-6 space-y-5">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Club Information</p>

            <div className="space-y-1.5">
              <Label className="text-zinc-300">
                Club Name <span className="text-red-400">*</span>
              </Label>
              <Input
                value={clubName}
                onChange={(e) => setClubName(e.target.value)}
                placeholder="e.g. UCSD Computer Science Club"
                className="bg-zinc-900 border-white/10 text-white placeholder:text-zinc-600"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-zinc-300">University</Label>
                <Input
                  value={university}
                  onChange={(e) => setUniversity(e.target.value)}
                  placeholder="UC San Diego"
                  className="bg-zinc-900 border-white/10 text-white placeholder:text-zinc-600"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-300">
                  Category <span className="text-red-400">*</span>
                </Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="bg-zinc-900 border-white/10 text-white">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-950 border-white/10">
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-zinc-300">Short Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Tell us what your club is about in 1-2 sentences…"
                className="bg-zinc-900 border-white/10 text-white placeholder:text-zinc-600 resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-zinc-300">Proof Link</Label>
              <Input
                value={proofLink}
                onChange={(e) => setProofLink(e.target.value)}
                placeholder="Instagram, Linktree, or university page URL"
                className="bg-zinc-900 border-white/10 text-white placeholder:text-zinc-600"
                type="url"
              />
              <p className="text-xs text-zinc-600">A public link that shows this is a real, active club.</p>
            </div>
          </div>

          {/* Contact */}
          <div className="rounded-xl border border-white/10 bg-zinc-900/40 p-6 space-y-5">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Contact</p>

            <div className="space-y-1.5">
              <Label className="text-zinc-300">
                Contact Email <span className="text-red-400">*</span>
              </Label>
              <Input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="officer@ucsd.edu"
                className="bg-zinc-900 border-white/10 text-white placeholder:text-zinc-600"
                required
              />
              <p className="text-xs text-zinc-600">We'll send your approval or any follow-up questions here.</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-zinc-300">Additional Notes</Label>
              <Textarea
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                rows={2}
                placeholder="Anything else we should know?"
                className="bg-zinc-900 border-white/10 text-white placeholder:text-zinc-600 resize-none"
              />
            </div>
          </div>

          <Button
            type="submit"
            variant="gold"
            className="w-full h-12 text-base"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting…
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Submit Request
              </>
            )}
          </Button>
        </form>
      </div>

      <Footer />
    </main>
  );
}
