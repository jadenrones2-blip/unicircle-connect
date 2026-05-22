import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Send, Building2, Flag } from 'lucide-react';
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

const ROLES = ['President', 'Vice President', 'Officer', 'Advisor', 'Other'] as const;

type FlowType = null | 'apply' | 'claim';

export default function ClubOnboardingRequest() {
  const navigate = useNavigate();
  const [flow, setFlow] = useState<FlowType>(null);

  // Shared fields
  const [clubName, setClubName] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  // Apply for Approval fields
  const [university, setUniversity] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [proofLink, setProofLink] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');

  // Claim Your Club fields
  const [claimRole, setClaimRole] = useState('');
  const [claimProof, setClaimProof] = useState('');
  const [claimNotes, setClaimNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!clubName.trim() || !contactEmail.trim()) {
      toast.error('Club name and contact email are required.');
      return;
    }
    if (flow === 'apply' && !category) {
      toast.error('Please select a category.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      toast.error('Please enter a valid email address.');
      return;
    }

    setSubmitting(true);
    try {
      const claimTypePrefix =
        flow === 'claim'
          ? `[CLAIM REQUEST]\nRole: ${claimRole}\nProof: ${claimProof}\n\n`
          : '[NEW CLUB REQUEST]\n\n';

      const { error: insertError } = await (supabase as any).from('new_club_requests').insert({
        club_name: clubName.trim(),
        user_email: contactEmail.trim().toLowerCase(),
        club_category: flow === 'apply' ? category : 'Other',
        club_description: flow === 'apply' ? description.trim() || null : null,
        proof_link: flow === 'apply' ? proofLink.trim() || null : claimProof.trim() || null,
        additional_notes:
          claimTypePrefix + (flow === 'apply' ? additionalNotes.trim() : claimNotes.trim()),
        status: 'pending',
      });

      if (insertError) throw insertError;

      // Notify admin (best-effort)
      try {
        await supabase.functions.invoke('notify-club-request', {
          body: {
            type: 'new_request',
            clubName: clubName.trim(),
            contactEmail: contactEmail.trim().toLowerCase(),
            university: university.trim() || undefined,
            category: flow === 'apply' ? category : 'Claim',
            description:
              flow === 'claim'
                ? `CLAIM REQUEST — Role: ${claimRole}`
                : description.trim() || undefined,
            proofLink: (flow === 'apply' ? proofLink : claimProof).trim() || undefined,
          },
        });
      } catch {
        /* non-fatal */
      }

      navigate(`/approval-pending?club=${encodeURIComponent(clubName.trim())}&type=${flow}`);
    } catch (err) {
      console.error('Submission error:', err);
      toast.error('Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Step 1: Choose flow ──
  if (!flow) {
    return (
      <main className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 pt-28 pb-20 max-w-2xl">
          <Link
            to="/clubs"
            className="inline-flex items-center text-sm text-zinc-500 hover:text-white transition-colors mb-10"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Clubs
          </Link>

          <div className="mb-10">
            <h1 className="text-3xl font-display font-bold text-white mb-2">Get on UniCircle</h1>
            <p className="text-zinc-500">
              All clubs are manually reviewed and approved before going live.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {/* Apply for Approval */}
            <button
              onClick={() => setFlow('apply')}
              className="group text-left rounded-2xl border border-white/10 bg-zinc-900/50 p-6 hover:border-violet-500/40 hover:bg-zinc-900 transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-4 group-hover:bg-violet-500/20 transition-colors">
                <Building2 className="w-5 h-5 text-violet-400" />
              </div>
              <h2 className="text-lg font-bold text-white mb-1">Apply for Approval</h2>
              <p className="text-sm text-zinc-500 leading-relaxed">
                Your club isn't on UniCircle yet. Submit details and we'll review your request
                within 48 hours.
              </p>
              <div className="mt-4 text-xs font-semibold text-violet-400 flex items-center gap-1">
                Start application →
              </div>
            </button>

            {/* Claim Your Club */}
            <button
              onClick={() => setFlow('claim')}
              className="group text-left rounded-2xl border border-white/10 bg-zinc-900/50 p-6 hover:border-[hsl(43,74%,56%)]/40 hover:bg-zinc-900 transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-[hsl(43,74%,56%)]/10 border border-[hsl(43,74%,56%)]/20 flex items-center justify-center mb-4 group-hover:bg-[hsl(43,74%,56%)]/20 transition-colors">
                <Flag className="w-5 h-5 text-[hsl(43,74%,56%)]" />
              </div>
              <h2 className="text-lg font-bold text-white mb-1">Claim Your Club</h2>
              <p className="text-sm text-zinc-500 leading-relaxed">
                Your club is already listed but not claimed. Verify you're an officer and take
                control of your page.
              </p>
              <div className="mt-4 text-xs font-semibold text-[hsl(43,74%,56%)] flex items-center gap-1">
                Claim ownership →
              </div>
            </button>
          </div>

          <p className="text-xs text-zinc-600 text-center mt-8">
            All requests are reviewed manually by the UniCircle team for security.
          </p>
        </div>
        <Footer />
      </main>
    );
  }

  // ── Step 2: Form ──
  const isApply = flow === 'apply';

  return (
    <main className="min-h-screen bg-background">
      <Header />

      <div className="container mx-auto px-4 pt-28 pb-20 max-w-2xl">
        <button
          onClick={() => setFlow(null)}
          className="inline-flex items-center text-sm text-zinc-500 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          {isApply ? 'Apply for Approval' : 'Claim Your Club'}
        </button>

        <div className="mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            {isApply ? (
              <Building2 className="w-5 h-5 text-violet-400" />
            ) : (
              <Flag className="w-5 h-5 text-[hsl(43,74%,56%)]" />
            )}
            <span
              className={`text-xs font-bold tracking-widest uppercase ${isApply ? 'text-violet-400' : 'text-[hsl(43,74%,56%)]'}`}
            >
              {isApply ? 'New Club Application' : 'Club Ownership Claim'}
            </span>
          </div>
          <h1 className="text-3xl font-display font-bold text-white mb-2">
            {isApply ? 'Apply for Approval' : 'Claim Your Club'}
          </h1>
          <p className="text-zinc-500">
            {isApply
              ? 'Submit your club details. Every request is manually reviewed before going live.'
              : "Verify you represent this club. We'll review and grant access once confirmed."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Club name + email (shared) */}
          <div className="rounded-xl border border-white/10 bg-zinc-900/40 p-6 space-y-5">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">
              Club Info
            </p>

            <div className="space-y-1.5">
              <Label className="text-zinc-300">
                Club Name <span className="text-red-400">*</span>
              </Label>
              <Input
                value={clubName}
                onChange={(e) => setClubName(e.target.value)}
                placeholder={
                  isApply ? 'e.g. UCSD Computer Science Club' : 'Exact name as listed on UniCircle'
                }
                className="bg-zinc-900 border-white/10 text-white placeholder:text-zinc-600"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-zinc-300">
                Your Contact Email <span className="text-red-400">*</span>
              </Label>
              <Input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="your@email.edu"
                className="bg-zinc-900 border-white/10 text-white placeholder:text-zinc-600"
                required
              />
              <p className="text-xs text-zinc-600">
                We'll reach out to this address with your approval status.
              </p>
            </div>
          </div>

          {/* Apply-specific fields */}
          {isApply && (
            <div className="rounded-xl border border-white/10 bg-zinc-900/40 p-6 space-y-5">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">
                Details
              </p>

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
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/10">
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c} className="text-white hover:bg-white/5">
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-zinc-300">Club Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What does your club do? Who is it for?"
                  className="bg-zinc-900 border-white/10 text-white placeholder:text-zinc-600 min-h-[100px]"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-zinc-300">Proof Link</Label>
                <Input
                  value={proofLink}
                  onChange={(e) => setProofLink(e.target.value)}
                  placeholder="Instagram, website, or official university page"
                  className="bg-zinc-900 border-white/10 text-white placeholder:text-zinc-600"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-zinc-300">Additional Notes</Label>
                <Textarea
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  placeholder="Anything else we should know?"
                  className="bg-zinc-900 border-white/10 text-white placeholder:text-zinc-600 min-h-[80px]"
                />
              </div>
            </div>
          )}

          {/* Claim-specific fields */}
          {!isApply && (
            <div className="rounded-xl border border-white/10 bg-zinc-900/40 p-6 space-y-5">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">
                Verification
              </p>

              <div className="space-y-1.5">
                <Label className="text-zinc-300">
                  Your Role <span className="text-red-400">*</span>
                </Label>
                <Select value={claimRole} onValueChange={setClaimRole}>
                  <SelectTrigger className="bg-zinc-900 border-white/10 text-white">
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/10">
                    {ROLES.map((r) => (
                      <SelectItem key={r} value={r} className="text-white hover:bg-white/5">
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-zinc-300">
                  Proof of Affiliation <span className="text-red-400">*</span>
                </Label>
                <Input
                  value={claimProof}
                  onChange={(e) => setClaimProof(e.target.value)}
                  placeholder="Link to Instagram bio, university directory, or org page listing you"
                  className="bg-zinc-900 border-white/10 text-white placeholder:text-zinc-600"
                />
                <p className="text-xs text-zinc-600">
                  We verify every claim manually — please provide something that shows you're an
                  officer.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-zinc-300">Additional Context</Label>
                <Textarea
                  value={claimNotes}
                  onChange={(e) => setClaimNotes(e.target.value)}
                  placeholder="Anything that helps us verify your claim faster"
                  className="bg-zinc-900 border-white/10 text-white placeholder:text-zinc-600 min-h-[80px]"
                />
              </div>
            </div>
          )}

          {/* Security note */}
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
            <div className="w-1.5 h-1.5 rounded-full bg-zinc-600 mt-2 shrink-0" />
            <p className="text-xs text-zinc-600 leading-relaxed">
              All {isApply ? 'applications' : 'claims'} are manually reviewed by the UniCircle team
              before any access is granted. This process typically takes 24–48 hours.
            </p>
          </div>

          <Button
            type="submit"
            disabled={submitting}
            className="w-full h-12 font-bold rounded-xl bg-violet-600 hover:bg-violet-500"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting…
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" /> Submit for Approval
              </>
            )}
          </Button>
        </form>
      </div>
      <Footer />
    </main>
  );
}
