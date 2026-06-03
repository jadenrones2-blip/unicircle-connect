import { useState, useEffect, useCallback } from 'react';
import {
  Link2,
  Copy,
  Check,
  Trash2,
  Loader2,
  Users,
  Clock,
  UserPlus,
  Mail,
  X,
  ShieldCheck,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface ClubInvite {
  id: string;
  token: string;
  club_id: string;
  invited_email: string | null;
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
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [invRes, offRes] = await Promise.all([
        (supabase as any)
          .from('club_invites')
          .select('*')
          .eq('club_id', clubId)
          .order('created_at', { ascending: false }),
        (supabase as any)
          .from('club_officers')
          .select('*')
          .eq('club_id', clubId)
          .order('created_at', { ascending: true }),
      ]);
      setInvites((invRes.data || []) as ClubInvite[]);
      setOfficers((offRes.data || []) as ClubOfficer[]);
    } catch {
      // tables may not exist yet
    } finally {
      setLoading(false);
    }
  }, [clubId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const generateInvite = async (email: string) => {
    if (!user) return;
    const emailLower = email.trim().toLowerCase();
    if (!emailLower || !/\S+@\S+\.\S+/.test(emailLower)) {
      toast.error('Enter a valid email address');
      return;
    }
    setGenerating(true);
    try {
      const token = Array.from(crypto.getRandomValues(new Uint8Array(24)))
        .map((b) => b.toString(36).padStart(2, '0'))
        .join('')
        .slice(0, 32);
      const { data, error } = await (supabase as any)
        .from('club_invites')
        .insert({
          club_id: clubId,
          club_name: clubName,
          created_by: user.id,
          role: 'officer',
          token,
          invited_email: emailLower,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .select()
        .single();
      if (error) throw error;
      setInvites((prev) => [data, ...prev]);
      copyLink(data.token);
      setShowEmailForm(false);
      setInviteEmail('');
      toast.success(`Invite sent to ${email} — link copied!`);
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
              : "Your team for this club's recruitment pipeline."}
          </p>
        </div>
        {isOwner && (
          <div className="flex flex-col items-end gap-2 shrink-0">
            {!showEmailForm ? (
              <button
                onClick={() => setShowEmailForm(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.06] border border-white/10 text-zinc-200 text-sm font-semibold hover:bg-white/10 hover:border-white/20 transition-all shrink-0"
              >
                <UserPlus className="w-4 h-4" />
                Invite Member
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
                  <Input
                    type="email"
                    placeholder="their@email.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && generateInvite(inviteEmail)}
                    className="pl-9 pr-3 h-9 w-52 bg-zinc-900 border-white/10 text-white text-sm placeholder:text-zinc-600 focus:border-white/30"
                    autoFocus
                  />
                </div>
                <button
                  onClick={() => generateInvite(inviteEmail)}
                  disabled={generating}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gold/15 border border-gold/30 text-gold text-sm font-semibold hover:bg-gold/25 transition-all disabled:opacity-50"
                >
                  {generating ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Link2 className="w-3.5 h-3.5" />
                  )}
                  Generate
                </button>
                <button
                  onClick={() => {
                    setShowEmailForm(false);
                    setInviteEmail('');
                  }}
                  className="p-2 text-zinc-600 hover:text-zinc-400 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Members', value: officers.length + 1, icon: Users },
          { label: 'Active Links', value: activeInvites.length, icon: Link2 },
          { label: 'Used Invites', value: usedCount, icon: ShieldCheck },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-xl border border-white/[0.07] bg-zinc-900/40 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Icon className="w-3.5 h-3.5 text-zinc-600" />
              <span className="text-[11px] font-semibold text-zinc-600 uppercase tracking-wider">
                {label}
              </span>
            </div>
            <p className="text-2xl font-bold text-white">{value}</p>
          </div>
        ))}
      </div>


      {/* Current team members */}
      <div className="space-y-2">
        <h2 className="text-[11px] font-semibold text-zinc-600 uppercase tracking-wider mb-3">
          Team Members ({officers.length + 1})
        </h2>

        {/* Owner row (always shown) */}
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gold/20 bg-gold/[0.04]">
          <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-3.5 h-3.5 text-gold" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-zinc-200 font-medium truncate">You (Owner)</p>
            <p className="text-[11px] text-gold/70">Admin · Full access</p>
          </div>
        </div>

        {officers.map((officer) => (
          <div
            key={officer.id}
            className="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/[0.07] bg-zinc-900/40 group hover:bg-zinc-900/70 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-white/[0.04] border border-white/[0.07] flex items-center justify-center shrink-0">
              <Users className="w-3.5 h-3.5 text-zinc-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-zinc-300 font-medium truncate">
                {officer.email || `Officer (${officer.user_id?.slice(0, 8) ?? 'unknown'})`}
              </p>
              <p className="text-[11px] text-zinc-600 capitalize">{officer.role || 'Officer'}</p>
            </div>
            {isOwner && (
              <button
                onClick={() => removeOfficer(officer.id)}
                disabled={removing === officer.id}
                className="p-2 rounded-lg text-zinc-700 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                title="Remove officer"
              >
                {removing === officer.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
              </button>
            )}
          </div>
        ))}

        {officers.length === 0 && (
          <p className="text-xs text-zinc-600 py-2 pl-1">
            No officers yet — invite someone below to build your team.
          </p>
        )}
      </div>

      {/* Active invite links */}
      {isOwner && activeInvites.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[11px] font-semibold text-zinc-600 uppercase tracking-wider">
              Active Invite Links
            </h2>
            {usedCount > 0 && (
              <span className="text-xs text-zinc-600">{usedCount} already used</span>
            )}
          </div>

          {activeInvites.map((invite) => {
            const url = `${window.location.origin}/invite/${invite.token}`;
            const isExpiringSoon =
              new Date(invite.expires_at).getTime() - Date.now() < 24 * 60 * 60 * 1000;
            return (
              <div
                key={invite.id}
                className="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/[0.07] bg-zinc-900/40 group hover:bg-zinc-900/70 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.07] flex items-center justify-center shrink-0">
                  <Link2 className="w-3.5 h-3.5 text-zinc-500" />
                </div>
                <div className="flex-1 min-w-0">
                  {invite.invited_email && (
                    <p className="text-xs text-zinc-300 font-medium truncate">
                      {invite.invited_email}
                    </p>
                  )}
                  <p className="text-[11px] text-zinc-600 font-mono truncate">{truncateUrl(url)}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Clock className="w-3 h-3 text-zinc-700" />
                    <span
                      className={`text-[11px] font-medium ${isExpiringSoon ? 'text-amber-400' : 'text-zinc-600'}`}
                    >
                      {timeLeft(invite.expires_at)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => copyLink(invite.token)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] transition-all"
                    title="Copy link"
                  >
                    {copied === invite.token ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" /> Copy
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => revokeInvite(invite.id)}
                    className="p-2 rounded-lg text-zinc-700 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
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
