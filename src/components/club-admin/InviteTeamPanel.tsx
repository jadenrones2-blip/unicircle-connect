import { useState, useEffect, useCallback } from 'react';
import { Link2, Copy, Check, Trash2, Loader2, Users, ShieldCheck, Clock, UserPlus } from 'lucide-react';
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
  email?: string;
}

interface InviteTeamPanelProps {
  clubId: string;
  clubName: string;
  isOwner: boolean;
}

function timeLeft(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return 'Expired';
  const days = Math.floor(ms / 86400000);
  const hrs = Math.floor((ms % 86400000) / 3600000);
  if (days > 0) return `${days}d left`;
  return `${hrs}h left`;
}

function truncateUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname + u.pathname.slice(0, 24) + '…';
  } catch {
    return url.slice(0, 36) + '…';
  }
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
  const usedCount = invites.filter((i) => !!i.used_by).length;

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8">

      {/* Page header */}
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-white tracking-tight">Team</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {isOwner
              ? 'Invite co-admins to help manage recruitment and evaluate applicants.'
              : 'Your team for this club\'s recruitment pipeline.'}
          </p>
        </div>
        {isOwner && (
          <button
            onClick={generateInvite}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gold text-zinc-900 text-sm font-semibold hover:bg-gold/90 transition-colors disabled:opacity-60 shrink-0"
          >
            {generating
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <UserPlus className="w-4 h-4" />}
            Invite Member
          </button>
        )}
      </div>

      {/* Team members */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            Members · {officers.length + 1}
          </h2>
        </div>

        {/* Owner */}
        <div className="flex items-center gap-3 p-4 rounded-xl border border-white/8 bg-zinc-900/60">
          <div className="w-9 h-9 rounded-full bg-gold/15 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4 text-gold" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white">You (Club Owner)</p>
            <p className="text-xs text-zinc-500">Full access · cannot be removed</p>
          </div>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gold/10 text-gold border border-gold/20">
            Owner
          </span>
        </div>

        {/* Officers */}
        {officers.map((officer) => (
          <div key={officer.id} className="flex items-center gap-3 p-4 rounded-xl border border-white/8 bg-zinc-900/60">
            <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center shrink-0 text-sm font-semibold text-zinc-300">
              {(officer.email?.[0] ?? '?').toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{officer.email || 'Team member'}</p>
              <p className="text-xs text-zinc-500">
                Joined {new Date(officer.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-white/5 text-zinc-400 border border-white/8 capitalize">
                {officer.role}
              </span>
              {isOwner && (
                <button
                  onClick={() => removeOfficer(officer.id)}
                  disabled={removing === officer.id}
                  className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  title="Remove member"
                >
                  {removing === officer.id
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Trash2 className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Empty state */}
        {officers.length === 0 && (
          <div className="flex items-center gap-3 p-4 rounded-xl border border-dashed border-white/10">
            <Users className="w-4 h-4 text-zinc-700 shrink-0" />
            <p className="text-sm text-zinc-600">
              No co-admins yet.{isOwner && ' Use Invite Member to add your team.'}
            </p>
          </div>
        )}
      </div>

      {/* Invite links */}
      {isOwner && activeInvites.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Active Invite Links
            </h2>
            {usedCount > 0 && (
              <span className="text-xs text-zinc-600">{usedCount} already used</span>
            )}
          </div>

          {activeInvites.map((invite) => {
            const url = `${window.location.origin}/invite/${invite.token}`;
            const isExpiringSoon = new Date(invite.expires_at).getTime() - Date.now() < 24 * 60 * 60 * 1000;
            return (
              <div key={invite.id} className="flex items-center gap-3 p-4 rounded-xl border border-white/8 bg-zinc-900/60">
                <Link2 className="w-4 h-4 text-zinc-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-300 font-mono truncate">{truncateUrl(url)}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Clock className="w-3 h-3 text-zinc-600" />
                    <span className={`text-xs ${isExpiringSoon ? 'text-amber-400' : 'text-zinc-600'}`}>
                      {timeLeft(invite.expires_at)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => copyLink(invite.token)}
                    className="p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-white/8 transition-colors"
                    title="Copy link"
                  >
                    {copied === invite.token
                      ? <Check className="w-3.5 h-3.5 text-emerald-400" />
                      : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => revokeInvite(invite.id)}
                    className="p-2 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Revoke link"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
