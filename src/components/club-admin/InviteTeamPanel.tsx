import { useState, useEffect, useCallback } from 'react';
import { Link2, Copy, Check, Trash2, Loader2, Users, ShieldCheck, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface ClubInvite {
  id: string;
  token: string;
  club_id: string;
  used_by: string | null;
  used_at: string | null;
  expires_at: string;
  created_at: string;
}

interface ClubOfficer {
  id: string;
  user_id: string;
  club_id: string;
  role: string;
  created_at: string;
  // joined via auth.users email — we store it separately
  email?: string;
}

interface InviteTeamPanelProps {
  clubId: string;
  clubName: string;
  isOwner: boolean; // only owners can generate links / remove officers
}

function timeLeft(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return 'Expired';
  const days = Math.floor(ms / 86400000);
  const hrs  = Math.floor((ms % 86400000) / 3600000);
  if (days > 0) return `${days}d left`;
  return `${hrs}h left`;
}

export function InviteTeamPanel({ clubId, clubName, isOwner }: InviteTeamPanelProps) {
  const { user } = useAuth();
  const [invites, setInvites] = useState<ClubInvite[]>([]);
  const [officers, setOfficers] = useState<ClubOfficer[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [invRes, offRes] = await Promise.all([
        (supabase as any).from('club_invites').select('*').eq('club_id', clubId).order('created_at', { ascending: false }),
        (supabase as any).from('club_officers').select('*').eq('club_id', clubId).order('created_at', { ascending: true }),
      ]);
      setInvites((invRes.data || []) as ClubInvite[]);
      setOfficers((offRes.data || []) as ClubOfficer[]);
    } catch {
      // tables may not exist yet
    } finally {
      setLoading(false);
    }
  }, [clubId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const generateInvite = async () => {
    if (!user) return;
    setGenerating(true);
    try {
      // Generate token on the frontend — avoids pgcrypto/base64url dependency
      const token = Array.from(crypto.getRandomValues(new Uint8Array(24)))
        .map(b => b.toString(36).padStart(2, '0')).join('').slice(0, 32);
      const { data, error } = await (supabase as any)
        .from('club_invites')
        .insert({
          club_id: clubId,
          club_name: clubName,
          created_by: user.id,
          role: 'officer',
          token,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .select()
        .single();
      if (error) throw error;
      setInvites((prev) => [data, ...prev]);
      copyLink(data.token);
      toast.success('Invite link generated and copied!');
    } catch {
      toast.error('Failed to generate invite link');
    } finally {
      setGenerating(false);
    }
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(url).catch(() => {});
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  };

  const revokeInvite = async (id: string) => {
    try {
      await (supabase as any).from('club_invites').delete().eq('id', id);
      setInvites((prev) => prev.filter((i) => i.id !== id));
      toast.success('Invite revoked');
    } catch {
      toast.error('Failed to revoke invite');
    }
  };

  const removeOfficer = async (officerId: string) => {
    setRemoving(officerId);
    try {
      await (supabase as any).from('club_officers').delete().eq('id', officerId);
      setOfficers((prev) => prev.filter((o) => o.id !== officerId));
      toast.success('Officer removed');
    } catch {
      toast.error('Failed to remove officer');
    } finally {
      setRemoving(null);
    }
  };

  const activeInvites = invites.filter((i) => !i.used_by && new Date(i.expires_at) > new Date());
  const usedInvites  = invites.filter((i) => !!i.used_by);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-zinc-200">Team Access</h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            Invite co-admins to help evaluate applicants and manage the recruitment pipeline.
            {!isOwner && ' Only the club owner can invite new members.'}
          </p>
        </div>
        {isOwner && (
          <Button
            variant="gold"
            size="sm"
            onClick={generateInvite}
            disabled={generating}
            className="shrink-0"
          >
            {generating
              ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              : <Link2 className="w-4 h-4 mr-1.5" />}
            Generate Invite Link
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
        </div>
      ) : (
        <>
          {/* Current officers */}
          <section className="space-y-2">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">
              Team Members ({officers.length + 1})
            </p>

            {/* Owner row */}
            <div className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-white/10 bg-zinc-900/60">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gold/15 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4 text-gold" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">You (Club Owner)</p>
                  <p className="text-xs text-zinc-500">Full access · cannot be removed</p>
                </div>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-gold/10 text-gold border border-gold/20">Owner</span>
            </div>

            {officers.length === 0 && (
              <div className="text-center py-6 border border-dashed border-white/10 rounded-xl">
                <Users className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                <p className="text-sm text-zinc-500">No co-admins yet.</p>
                {isOwner && (
                  <p className="text-xs text-zinc-600 mt-1">Generate an invite link above to add your team.</p>
                )}
              </div>
            )}

            {officers.map((officer) => (
              <div key={officer.id} className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-white/10 bg-zinc-900/60">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center shrink-0 text-sm font-semibold text-zinc-400">
                    {(officer.email?.[0] ?? '?').toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm text-zinc-200">{officer.email || 'Team member'}</p>
                    <p className="text-xs text-zinc-500">
                      Joined {new Date(officer.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-zinc-400 border border-white/10 capitalize">
                    {officer.role}
                  </span>
                  {isOwner && (
                    <button
                      onClick={() => removeOfficer(officer.id)}
                      disabled={removing === officer.id}
                      className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Remove officer"
                    >
                      {removing === officer.id
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </section>

          {/* Active invite links */}
          {isOwner && (activeInvites.length > 0 || usedInvites.length > 0) && (
            <section className="space-y-2">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">
                Invite Links
              </p>

              {activeInvites.map((invite) => {
                const url = `${window.location.origin}/invite/${invite.token}`;
                return (
                  <div key={invite.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-white/10 bg-zinc-900/60">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-zinc-400 font-mono truncate">{url}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Clock className="w-3 h-3 text-zinc-600" />
                        <span className="text-xs text-zinc-600">{timeLeft(invite.expires_at)}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => copyLink(invite.token)}
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/10 transition-colors shrink-0"
                      title="Copy link"
                    >
                      {copied === invite.token
                        ? <Check className="w-4 h-4 text-green-400" />
                        : <Copy className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => revokeInvite(invite.id)}
                      className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
                      title="Revoke link"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}

              {usedInvites.length > 0 && (
                <p className="text-xs text-zinc-600">
                  {usedInvites.length} invite{usedInvites.length !== 1 ? 's' : ''} already used
                </p>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
