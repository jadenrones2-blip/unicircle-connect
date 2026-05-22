import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { ClubAdminSidebar } from '@/components/club-admin/ClubAdminSidebar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { ArrowLeft, Star, Loader2, Trash2, Edit2, Check, X, Mail } from 'lucide-react';
import { toast } from 'sonner';

const STAGES = ['member', 'applied', 'under_review', 'interview', 'accepted', 'rejected'] as const;
type Stage = (typeof STAGES)[number];

const STAGE_COLORS: Record<Stage, string> = {
  member: '#b8860b',
  applied: '#3b82f6',
  under_review: '#eab308',
  interview: '#a855f7',
  accepted: '#22c55e',
  rejected: '#ef4444',
};

const STAGE_LABELS: Record<Stage, string> = {
  member: 'Member',
  applied: 'Applied',
  under_review: 'Under Review',
  interview: 'Interview',
  accepted: 'Accepted',
  rejected: 'Rejected',
};

interface Person {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  year: string | null;
  major: string | null;
  stage: Stage;
  notes: string | null;
  created_at: string;
}

interface Review {
  id: string;
  reviewer_id: string;
  culture_fit: number | null;
  experience: number | null;
  involvement: number | null;
  notes: string | null;
  created_at: string;
  reviewer_name?: string;
}

function StarRating({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-zinc-400 text-xs">{label}</Label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className="transition-transform hover:scale-110"
          >
            <Star className={`w-5 h-5 ${n <= value ? 'text-gold fill-gold' : 'text-zinc-600'}`} />
          </button>
        ))}
      </div>
    </div>
  );
}

export default function OrgPersonProfile() {
  const { clubId, personId } = useParams<{ clubId: string; personId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [person, setPerson] = useState<Person | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit person fields
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Person>>({});
  const [saving, setSaving] = useState(false);

  // Review form
  const [myReview, setMyReview] = useState<Review | null>(null);
  const [reviewForm, setReviewForm] = useState({
    culture_fit: 0,
    experience: 0,
    involvement: 0,
    notes: '',
  });
  const [submittingReview, setSubmittingReview] = useState(false);

  // Email
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailForm, setEmailForm] = useState({ subject: '', body: '' });
  const [sendingEmail, setSendingEmail] = useState(false);

  // Delete confirm
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchData = async () => {
    if (!personId) return;
    setLoading(true);

    const [personRes, reviewsRes] = await Promise.all([
      (supabase as any).from('people').select('*').eq('id', personId).single(),
      (supabase as any)
        .from('reviews')
        .select('*')
        .eq('person_id', personId)
        .order('created_at', { ascending: false }),
    ]);

    if (personRes.error || !personRes.data) {
      toast.error('Person not found');
      navigate(`/club-admin/clubs/${clubId}/people`);
      return;
    }

    setPerson(personRes.data);
    setEditForm(personRes.data);

    const reviewList: Review[] = reviewsRes.data || [];

    // Fetch display names for reviewers from profiles
    if (reviewList.length > 0) {
      const reviewerIds = [...new Set(reviewList.map((r) => r.reviewer_id))];
      const { data: profiles } = await (supabase as any)
        .from('admin_profiles')
        .select('user_id, display_name')
        .in('user_id', reviewerIds);

      const nameMap: Record<string, string> = {};
      (profiles || []).forEach((p: any) => {
        nameMap[p.user_id] = p.display_name;
      });

      const enriched = reviewList.map((r) => ({
        ...r,
        reviewer_name: nameMap[r.reviewer_id] || 'Anonymous',
      }));
      setReviews(enriched);

      const mine = enriched.find((r) => r.reviewer_id === user?.id);
      if (mine) {
        setMyReview(mine);
        setReviewForm({
          culture_fit: mine.culture_fit ?? 0,
          experience: mine.experience ?? 0,
          involvement: mine.involvement ?? 0,
          notes: mine.notes ?? '',
        });
      }
    } else {
      setReviews([]);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [personId]);

  const handleSave = async () => {
    if (!personId || !editForm.first_name?.trim() || !editForm.last_name?.trim()) {
      toast.error('First and last name required');
      return;
    }
    setSaving(true);
    const { error } = await (supabase as any)
      .from('people')
      .update({
        first_name: editForm.first_name?.trim(),
        last_name: editForm.last_name?.trim(),
        email: editForm.email?.trim() || null,
        year: editForm.year || null,
        major: editForm.major?.trim() || null,
        stage: editForm.stage,
        notes: editForm.notes?.trim() || null,
      })
      .eq('id', personId);

    if (error) {
      toast.error('Failed to save');
      setSaving(false);
      return;
    }
    toast.success('Saved');
    setEditing(false);
    fetchData();
    setSaving(false);
  };

  const handleStageChange = async (stage: Stage) => {
    if (!personId) return;
    const { error } = await (supabase as any).from('people').update({ stage }).eq('id', personId);
    if (error) {
      toast.error('Failed to update stage');
      return;
    }
    setPerson((p) => (p ? { ...p, stage } : p));
  };

  const handleSubmitReview = async () => {
    if (!personId || !user) return;
    if (!reviewForm.culture_fit && !reviewForm.experience && !reviewForm.involvement) {
      toast.error('Rate at least one dimension');
      return;
    }
    setSubmittingReview(true);

    const payload = {
      person_id: personId,
      reviewer_id: user.id,
      culture_fit: reviewForm.culture_fit || null,
      experience: reviewForm.experience || null,
      involvement: reviewForm.involvement || null,
      notes: reviewForm.notes.trim() || null,
    };

    const { error } = myReview
      ? await (supabase as any).from('reviews').update(payload).eq('id', myReview.id)
      : await (supabase as any).from('reviews').insert(payload);

    if (error) {
      toast.error('Failed to save review');
      setSubmittingReview(false);
      return;
    }
    toast.success(myReview ? 'Review updated' : 'Review submitted');
    fetchData();
    setSubmittingReview(false);
  };

  const handleSendEmail = async () => {
    if (!person?.email) return;
    if (!emailForm.subject.trim() || !emailForm.body.trim()) {
      toast.error('Subject and message are required');
      return;
    }
    setSendingEmail(true);
    const { error } = await supabase.functions.invoke('send-person-email', {
      body: {
        to: person.email,
        toName: `${person.first_name} ${person.last_name}`,
        subject: emailForm.subject.trim(),
        body: emailForm.body.trim(),
      },
    });
    if (error) {
      toast.error('Failed to send email');
      setSendingEmail(false);
      return;
    }
    toast.success('Email sent');
    setEmailOpen(false);
    setEmailForm({ subject: '', body: '' });
    setSendingEmail(false);
  };

  const handleDelete = async () => {
    if (!personId) return;
    setDeleting(true);
    const { error } = await (supabase as any).from('people').delete().eq('id', personId);
    if (error) {
      toast.error('Failed to delete');
      setDeleting(false);
      return;
    }
    toast.success('Person deleted');
    navigate(`/club-admin/clubs/${clubId}/people`);
  };

  const avgScore =
    reviews.length > 0
      ? (() => {
          const all: number[] = [];
          reviews.forEach((r) => {
            [r.culture_fit, r.experience, r.involvement]
              .filter(Boolean)
              .forEach((s) => all.push(s as number));
          });
          return all.length ? all.reduce((a, b) => a + b, 0) / all.length : null;
        })()
      : null;

  if (loading) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full" style={{ background: '#0A0A0A' }}>
          <ClubAdminSidebar />
          <main className="flex-1 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-gold animate-spin" />
          </main>
        </div>
      </SidebarProvider>
    );
  }

  if (!person) return null;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full" style={{ background: '#0A0A0A' }}>
        <ClubAdminSidebar />
        <main className="flex-1 p-6 overflow-auto max-w-4xl">
          <SidebarTrigger className="mb-4" />

          {/* Back + header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <Link
                to={`/club-admin/clubs/${clubId}/people`}
                className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-white transition-colors mb-3"
              >
                <ArrowLeft className="w-4 h-4" /> People
              </Link>
              <h1 className="text-2xl font-display font-bold text-white">
                {person.first_name} {person.last_name}
              </h1>
              {person.email && <p className="text-zinc-500 text-sm mt-0.5">{person.email}</p>}
            </div>
            <div className="flex gap-2">
              {person.email && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEmailOpen(true)}
                  className="border-white/10 text-zinc-300 hover:bg-white/5"
                >
                  <Mail className="w-3.5 h-3.5 mr-1.5" /> Send Email
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditing(!editing)}
                className="border-white/10 text-zinc-300 hover:bg-white/5"
              >
                <Edit2 className="w-3.5 h-3.5 mr-1.5" />
                {editing ? 'Cancel' : 'Edit'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteOpen(true)}
                className="border-red-500/20 text-red-400 hover:bg-red-500/10"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left: person info + stage */}
            <div className="lg:col-span-1 space-y-4">
              {/* Stage card */}
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                  Stage
                </p>
                <Select value={person.stage} onValueChange={handleStageChange}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#111] border-white/10">
                    {STAGES.map((s) => (
                      <SelectItem key={s} value={s} className="text-white">
                        {STAGE_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {avgScore != null && (
                  <div className="mt-4 pt-4 border-t border-white/5">
                    <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                      Avg Score
                    </p>
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-gold fill-gold" />
                      <span className="text-xl font-bold text-white">{avgScore.toFixed(1)}</span>
                      <span className="text-zinc-500 text-xs">/ 5</span>
                    </div>
                    <p className="text-zinc-600 text-xs mt-1">
                      {reviews.length} review{reviews.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                )}
              </div>

              {/* Person details */}
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                  Details
                </p>
                {editing ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-zinc-400 text-xs">First Name</Label>
                        <Input
                          value={editForm.first_name || ''}
                          onChange={(e) =>
                            setEditForm((f) => ({ ...f, first_name: e.target.value }))
                          }
                          className="bg-white/5 border-white/10 text-white mt-1 h-8 text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-zinc-400 text-xs">Last Name</Label>
                        <Input
                          value={editForm.last_name || ''}
                          onChange={(e) =>
                            setEditForm((f) => ({ ...f, last_name: e.target.value }))
                          }
                          className="bg-white/5 border-white/10 text-white mt-1 h-8 text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-zinc-400 text-xs">Email</Label>
                      <Input
                        value={editForm.email || ''}
                        onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                        className="bg-white/5 border-white/10 text-white mt-1 h-8 text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-zinc-400 text-xs">Major</Label>
                        <Input
                          value={editForm.major || ''}
                          onChange={(e) => setEditForm((f) => ({ ...f, major: e.target.value }))}
                          className="bg-white/5 border-white/10 text-white mt-1 h-8 text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-zinc-400 text-xs">Year</Label>
                        <Select
                          value={editForm.year || ''}
                          onValueChange={(v) => setEditForm((f) => ({ ...f, year: v }))}
                        >
                          <SelectTrigger className="bg-white/5 border-white/10 text-white mt-1 h-8 text-sm">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent className="bg-[#111] border-white/10">
                            {['Freshman', 'Sophomore', 'Junior', 'Senior', 'Graduate'].map((y) => (
                              <SelectItem key={y} value={y} className="text-white">
                                {y}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label className="text-zinc-400 text-xs">Notes</Label>
                      <Textarea
                        value={editForm.notes || ''}
                        onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                        className="bg-white/5 border-white/10 text-white mt-1 text-sm resize-none"
                        rows={3}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={handleSave}
                        disabled={saving}
                        size="sm"
                        className="bg-gold text-zinc-900 font-semibold hover:bg-gold/90 flex-1"
                      >
                        {saving ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5 mr-1" /> Save
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={() => {
                          setEditing(false);
                          setEditForm(person);
                        }}
                        size="sm"
                        variant="ghost"
                        className="text-zinc-400"
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <dl className="space-y-2.5">
                    {[
                      { label: 'Major', value: person.major },
                      { label: 'Year', value: person.year },
                      { label: 'Notes', value: person.notes },
                    ].map(({ label, value }) =>
                      value ? (
                        <div key={label}>
                          <dt className="text-zinc-600 text-xs">{label}</dt>
                          <dd className="text-zinc-300 text-sm mt-0.5">{value}</dd>
                        </div>
                      ) : null
                    )}
                    <div>
                      <dt className="text-zinc-600 text-xs">Added</dt>
                      <dd className="text-zinc-300 text-sm mt-0.5">
                        {new Date(person.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </dd>
                    </div>
                  </dl>
                )}
              </div>
            </div>

            {/* Right: review form + all reviews */}
            <div className="lg:col-span-2 space-y-4">
              {/* My review */}
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">
                  {myReview ? 'My Review' : 'Add Review'}
                </p>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <StarRating
                    label="Culture Fit"
                    value={reviewForm.culture_fit}
                    onChange={(v) => setReviewForm((f) => ({ ...f, culture_fit: v }))}
                  />
                  <StarRating
                    label="Experience"
                    value={reviewForm.experience}
                    onChange={(v) => setReviewForm((f) => ({ ...f, experience: v }))}
                  />
                  <StarRating
                    label="Involvement"
                    value={reviewForm.involvement}
                    onChange={(v) => setReviewForm((f) => ({ ...f, involvement: v }))}
                  />
                </div>
                <div className="mb-3">
                  <Label className="text-zinc-400 text-xs">Notes (optional)</Label>
                  <Textarea
                    value={reviewForm.notes}
                    onChange={(e) => setReviewForm((f) => ({ ...f, notes: e.target.value }))}
                    className="bg-white/5 border-white/10 text-white mt-1 text-sm resize-none"
                    rows={2}
                    placeholder="Add any comments..."
                  />
                </div>
                <Button
                  onClick={handleSubmitReview}
                  disabled={submittingReview}
                  size="sm"
                  className="bg-gold text-zinc-900 font-semibold hover:bg-gold/90"
                >
                  {submittingReview ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : myReview ? (
                    'Update Review'
                  ) : (
                    'Submit Review'
                  )}
                </Button>
              </div>

              {/* All reviews */}
              {reviews.filter((r) => r.reviewer_id !== user?.id).length > 0 && (
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">
                    Team Reviews
                  </p>
                  <div className="space-y-4">
                    {reviews
                      .filter((r) => r.reviewer_id !== user?.id)
                      .map((r) => (
                        <div
                          key={r.id}
                          className="pb-4 border-b border-white/5 last:border-0 last:pb-0"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-zinc-300">
                              {r.reviewer_name}
                            </span>
                            <span className="text-xs text-zinc-600">
                              {new Date(r.created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          </div>
                          <div className="flex gap-4 text-xs text-zinc-500 mb-2">
                            {r.culture_fit != null && (
                              <span className="flex items-center gap-1">
                                <Star className="w-3 h-3 text-gold fill-gold" /> {r.culture_fit}{' '}
                                Culture
                              </span>
                            )}
                            {r.experience != null && (
                              <span className="flex items-center gap-1">
                                <Star className="w-3 h-3 text-gold fill-gold" /> {r.experience}{' '}
                                Experience
                              </span>
                            )}
                            {r.involvement != null && (
                              <span className="flex items-center gap-1">
                                <Star className="w-3 h-3 text-gold fill-gold" /> {r.involvement}{' '}
                                Involvement
                              </span>
                            )}
                          </div>
                          {r.notes && <p className="text-sm text-zinc-400">{r.notes}</p>}
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Send Email Dialog */}
      <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
        <DialogContent className="bg-[#111] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Send Email to {person?.first_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-zinc-400 text-xs">To</Label>
              <p className="text-zinc-300 text-sm mt-1">{person?.email}</p>
            </div>
            <div>
              <Label className="text-zinc-400 text-xs">Subject</Label>
              <Input
                value={emailForm.subject}
                onChange={(e) => setEmailForm((f) => ({ ...f, subject: e.target.value }))}
                className="bg-white/5 border-white/10 text-white mt-1"
                placeholder="e.g. Interview Invitation"
              />
            </div>
            <div>
              <Label className="text-zinc-400 text-xs">Message</Label>
              <Textarea
                value={emailForm.body}
                onChange={(e) => setEmailForm((f) => ({ ...f, body: e.target.value }))}
                className="bg-white/5 border-white/10 text-white mt-1 resize-none"
                rows={6}
                placeholder="Write your message..."
              />
            </div>
          </div>
          <DialogFooter className="mt-2">
            <Button variant="ghost" onClick={() => setEmailOpen(false)} className="text-zinc-400">
              Cancel
            </Button>
            <Button
              onClick={handleSendEmail}
              disabled={sendingEmail}
              className="bg-gold text-zinc-900 font-semibold hover:bg-gold/90"
            >
              {sendingEmail ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Mail className="w-3.5 h-3.5 mr-1.5" />
                  Send Email
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="bg-[#111] border-white/10 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Person</DialogTitle>
          </DialogHeader>
          <p className="text-zinc-400 text-sm">
            Are you sure you want to delete{' '}
            <span className="text-white font-medium">
              {person.first_name} {person.last_name}
            </span>
            ? This will also delete all their reviews.
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)} className="text-zinc-400">
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-500 hover:bg-red-600 text-white font-semibold"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
