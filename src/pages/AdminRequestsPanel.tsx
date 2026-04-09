import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, X, ExternalLink, Loader2, Clock, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface ClubRequest {
  id: string;
  club_name: string;
  user_id: string | null;
  user_email: string;
  club_category: string | null;
  club_description: string | null;
  proof_link: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_at: string | null;
  reviewer_notes: string | null;
  additional_notes: string | null;
  created_at: string;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', label: 'Pending' },
  approved: { bg: 'bg-green-500/10', text: 'text-green-400', label: 'Approved' },
  rejected: { bg: 'bg-red-500/10', text: 'text-red-400', label: 'Rejected' },
};

export default function AdminRequestsPanel() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [requests, setRequests] = useState<ClubRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Approve dialog
  const [approveTarget, setApproveTarget] = useState<ClubRequest | null>(null);
  const [approveNote, setApproveNote] = useState('');
  const [approving, setApproving] = useState(false);

  // Reject dialog
  const [rejectTarget, setRejectTarget] = useState<ClubRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  // Filter
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  // Check admin access
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/login?redirect=/admin/requests');
      return;
    }
    (async () => {
      try {
        const { data } = await (supabase as any)
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .maybeSingle();
        if (!data) {
          toast.error('Admin access required');
          navigate('/');
          return;
        }
        setIsAdmin(true);
      } catch {
        toast.error('Failed to verify admin access');
        navigate('/');
      }
    })();
  }, [user, authLoading, navigate]);

  // Fetch requests
  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await (supabase as any)
          .from('new_club_requests')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        setRequests(data || []);
      } catch (err) {
        console.error(err);
        toast.error('Failed to load requests');
      } finally {
        setLoading(false);
      }
    })();
  }, [isAdmin]);

  const handleApprove = async () => {
    if (!approveTarget) return;
    setApproving(true);
    try {
      const { error } = await (supabase as any)
        .from('new_club_requests')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewer_notes: approveNote.trim() || null,
        })
        .eq('id', approveTarget.id);
      if (error) throw error;

      // Send approval email
      try {
        await supabase.functions.invoke('notify-club-request', {
          body: {
            type: 'approved',
            clubName: approveTarget.club_name,
            contactEmail: approveTarget.user_email,
            reviewerNotes: approveNote.trim() || undefined,
          },
        });
      } catch (notifyErr) {
        console.warn('Approval notification failed:', notifyErr);
      }

      setRequests((prev) =>
        prev.map((r) =>
          r.id === approveTarget.id
            ? { ...r, status: 'approved', reviewed_at: new Date().toISOString(), reviewer_notes: approveNote.trim() || null }
            : r
        )
      );
      toast.success(`${approveTarget.club_name} approved!`);
      setApproveTarget(null);
      setApproveNote('');
    } catch (err) {
      console.error(err);
      toast.error('Failed to approve request');
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (!rejectTarget || !rejectReason.trim()) {
      toast.error('Please provide a reason for rejection.');
      return;
    }
    setRejecting(true);
    try {
      const { error } = await (supabase as any)
        .from('new_club_requests')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewer_notes: rejectReason.trim(),
        })
        .eq('id', rejectTarget.id);
      if (error) throw error;

      // Send rejection email
      try {
        await supabase.functions.invoke('notify-club-request', {
          body: {
            type: 'rejected',
            clubName: rejectTarget.club_name,
            contactEmail: rejectTarget.user_email,
            rejectionReason: rejectReason.trim(),
          },
        });
      } catch (notifyErr) {
        console.warn('Rejection notification failed:', notifyErr);
      }

      setRequests((prev) =>
        prev.map((r) =>
          r.id === rejectTarget.id
            ? { ...r, status: 'rejected', reviewed_at: new Date().toISOString(), reviewer_notes: rejectReason.trim() }
            : r
        )
      );
      toast.success('Request rejected.');
      setRejectTarget(null);
      setRejectReason('');
    } catch (err) {
      console.error(err);
      toast.error('Failed to reject request');
    } finally {
      setRejecting(false);
    }
  };

  const filtered = statusFilter === 'all' ? requests : requests.filter((r) => r.status === statusFilter);

  const counts = {
    pending: requests.filter((r) => r.status === 'pending').length,
    approved: requests.filter((r) => r.status === 'approved').length,
    rejected: requests.filter((r) => r.status === 'rejected').length,
  };

  if (authLoading || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-gold animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 pt-12 pb-20 max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Admin Panel</p>
          <h1 className="text-3xl font-display font-bold text-white">Club Requests</h1>
          <p className="text-zinc-500 mt-1">Review and approve or reject new club submissions.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Pending', value: counts.pending, color: 'text-yellow-400' },
            { label: 'Approved', value: counts.approved, color: 'text-green-400' },
            { label: 'Rejected', value: counts.rejected, color: 'text-red-400' },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-white/10 bg-zinc-900/40 p-4 text-center">
              <p className={`text-2xl font-bold font-display ${s.color}`}>{s.value}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filter pills */}
        <div className="flex gap-2 mb-5">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-all ${
                statusFilter === f
                  ? 'bg-gold text-zinc-900'
                  : 'bg-transparent text-zinc-500 border border-white/10 hover:border-white/20'
              }`}
            >
              {f === 'all' ? `All (${requests.length})` : `${f.charAt(0).toUpperCase() + f.slice(1)} (${counts[f]})`}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-gold animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-zinc-500">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No {statusFilter !== 'all' ? statusFilter : ''} requests found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((req) => {
              const style = STATUS_STYLES[req.status];
              return (
                <div
                  key={req.id}
                  className="rounded-xl border border-white/10 bg-zinc-900/40 p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-white font-semibold truncate">{req.club_name}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
                          {style.label}
                        </span>
                        {req.club_category && (
                          <span className="text-xs text-zinc-500">{req.club_category}</span>
                        )}
                      </div>
                      <p className="text-sm text-zinc-400 mb-1">{req.user_email}</p>
                      {req.club_description && (
                        <p className="text-sm text-zinc-500 line-clamp-2 mb-2">{req.club_description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-zinc-600">
                        <span>Submitted {new Date(req.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        {req.proof_link && (
                          <a
                            href={req.proof_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-gold hover:underline"
                          >
                            <ExternalLink className="w-3 h-3" />
                            View proof
                          </a>
                        )}
                        {req.reviewed_at && (
                          <span>Reviewed {new Date(req.reviewed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                        )}
                      </div>
                      {req.reviewer_notes && (
                        <p className="mt-2 text-xs text-zinc-500 italic">Note: {req.reviewer_notes}</p>
                      )}
                      {req.additional_notes && (
                        <p className="mt-1 text-xs text-zinc-600">Applicant notes: {req.additional_notes}</p>
                      )}
                    </div>

                    {req.status === 'pending' && (
                      <div className="flex gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/50"
                          onClick={() => { setRejectTarget(req); setRejectReason(''); }}
                        >
                          <X className="w-3.5 h-3.5 mr-1" />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => { setApproveTarget(req); setApproveNote(''); }}
                        >
                          <Check className="w-3.5 h-3.5 mr-1" />
                          Approve
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Approve Dialog */}
      <Dialog open={!!approveTarget} onOpenChange={(o) => { if (!o) setApproveTarget(null); }}>
        <DialogContent className="sm:max-w-md bg-zinc-950 border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white font-display">
              Approve {approveTarget?.club_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-zinc-400">
              This will approve the request and send a welcome email to <strong className="text-zinc-200">{approveTarget?.user_email}</strong>.
            </p>
            <div className="space-y-1.5">
              <Label className="text-zinc-300 text-sm">Welcome note (optional)</Label>
              <Textarea
                value={approveNote}
                onChange={(e) => setApproveNote(e.target.value)}
                placeholder="Add a personal note to include in the welcome email…"
                rows={3}
                className="bg-zinc-900 border-white/10 text-white placeholder:text-zinc-600 resize-none text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveTarget(null)} disabled={approving}>
              Cancel
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={handleApprove}
              disabled={approving}
            >
              {approving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
              Approve & Notify
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={(o) => { if (!o) setRejectTarget(null); }}>
        <DialogContent className="sm:max-w-md bg-zinc-950 border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white font-display">
              Reject {rejectTarget?.club_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-zinc-400">
              Provide a reason — this will be included in the rejection email to <strong className="text-zinc-200">{rejectTarget?.user_email}</strong>.
            </p>
            <div className="space-y-1.5">
              <Label className="text-zinc-300 text-sm">
                Rejection reason <span className="text-red-400">*</span>
              </Label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. We already have a similar club listed, or unable to verify the club's existence…"
                rows={3}
                className="bg-zinc-900 border-white/10 text-white placeholder:text-zinc-600 resize-none text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)} disabled={rejecting}>
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleReject}
              disabled={rejecting || !rejectReason.trim()}
            >
              {rejecting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <X className="w-4 h-4 mr-2" />}
              Reject & Notify
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
