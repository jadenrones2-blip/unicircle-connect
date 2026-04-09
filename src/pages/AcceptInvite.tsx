import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, ShieldCheck, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface InviteInfo {
  id: string;
  token: string;
  club_id: string;
  club_name: string;
  role: string;
  expires_at: string;
  used_by: string | null;
}

type PageState = 'loading' | 'invalid' | 'expired' | 'already_used' | 'already_member' | 'ready' | 'signing_in' | 'claiming' | 'done';

export default function AcceptInvite() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [pageState, setPageState] = useState<PageState>('loading');
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');

  // Sign in form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [authError, setAuthError] = useState('');

  // 1. Fetch invite on mount
  useEffect(() => {
    if (!token) { setPageState('invalid'); return; }

    (async () => {
      const { data, error } = await (supabase as any)
        .from('club_invites')
        .select('id, token, club_id, club_name, role, expires_at, used_by')
        .eq('token', token)
        .maybeSingle();

      if (error || !data) { setPageState('invalid'); return; }
      if (data.used_by) { setPageState('already_used'); setInvite(data); return; }
      if (new Date(data.expires_at) <= new Date()) { setPageState('expired'); setInvite(data); return; }

      setInvite(data);
      setPageState('ready');
    })();
  }, [token]);

  // 2. Once user is authenticated and invite is ready → auto-claim
  useEffect(() => {
    if (authLoading || !invite || !user) return;
    if (pageState === 'loading' || pageState === 'signing_in') return;
    if (invite.used_by) return;

    claimInvite();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, invite]);

  const claimInvite = async () => {
    if (!invite || !user) return;
    setPageState('claiming');

    try {
      // Check if already an officer for this club
      const { data: existing } = await (supabase as any)
        .from('club_officers')
        .select('id')
        .eq('club_id', invite.club_id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        setPageState('already_member');
        return;
      }

      // Mark invite used
      const { error: inviteErr } = await (supabase as any)
        .from('club_invites')
        .update({ used_by: user.id, used_at: new Date().toISOString() })
        .eq('id', invite.id)
        .is('used_by', null);

      if (inviteErr) throw inviteErr;

      // Insert club_officers row
      const { error: officerErr } = await (supabase as any)
        .from('club_officers')
        .insert({
          club_id: invite.club_id,
          club_name: invite.club_name,
          user_id: user.id,
          invited_by: (await (supabase as any).from('club_invites').select('created_by').eq('id', invite.id).single()).data?.created_by,
          role: invite.role,
        });

      if (officerErr) throw officerErr;

      setPageState('done');
    } catch (err) {
      console.error(err);
      toast.error('Failed to accept invite. Please try again.');
      setPageState('ready');
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setPageState('signing_in');

    try {
      if (authMode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } },
        });
        if (error) throw error;
      }
      // useEffect above will fire claimInvite once user resolves
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed');
      setPageState('ready');
    }
  };

  // Redirect once done
  useEffect(() => {
    if (pageState === 'done' || pageState === 'already_member') {
      const timer = setTimeout(() => {
        navigate(`/club-admin/clubs/${invite?.club_id}/recruitment`);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [pageState, invite, navigate]);

  /* ─── Render ─── */

  if (pageState === 'loading') {
    return <Screen><Loader2 className="w-8 h-8 text-gold animate-spin" /></Screen>;
  }

  if (pageState === 'invalid') {
    return (
      <Screen>
        <AlertTriangle className="w-10 h-10 text-red-400 mb-3" />
        <h2 className="text-xl font-semibold text-white mb-1">Invalid invite link</h2>
        <p className="text-sm text-zinc-500">This link doesn't exist or may have been removed.</p>
        <Link to="/" className="mt-6 text-sm text-gold hover:underline">Go home</Link>
      </Screen>
    );
  }

  if (pageState === 'expired') {
    return (
      <Screen>
        <AlertTriangle className="w-10 h-10 text-amber-400 mb-3" />
        <h2 className="text-xl font-semibold text-white mb-1">Invite expired</h2>
        <p className="text-sm text-zinc-500">
          This invite to <span className="text-white font-medium">{invite?.club_name}</span> has expired.
          Ask the club owner to generate a new link.
        </p>
      </Screen>
    );
  }

  if (pageState === 'already_used') {
    return (
      <Screen>
        <AlertTriangle className="w-10 h-10 text-amber-400 mb-3" />
        <h2 className="text-xl font-semibold text-white mb-1">Invite already used</h2>
        <p className="text-sm text-zinc-500">
          This invite to <span className="text-white font-medium">{invite?.club_name}</span> has already been claimed.
        </p>
        {user && (
          <Button variant="gold" size="sm" className="mt-6" onClick={() => navigate(`/club-admin/clubs/${invite?.club_id}/recruitment`)}>
            Go to Dashboard
          </Button>
        )}
      </Screen>
    );
  }

  if (pageState === 'done' || pageState === 'already_member') {
    return (
      <Screen>
        <CheckCircle2 className="w-10 h-10 text-green-400 mb-3" />
        <h2 className="text-xl font-semibold text-white mb-1">
          {pageState === 'already_member' ? 'Already a team member' : 'You\'re in!'}
        </h2>
        <p className="text-sm text-zinc-500">
          {pageState === 'already_member'
            ? `You already have access to ${invite?.club_name}.`
            : `Welcome to the ${invite?.club_name} team. Redirecting to your dashboard…`}
        </p>
        <Loader2 className="w-4 h-4 text-zinc-600 animate-spin mt-4" />
      </Screen>
    );
  }

  if (pageState === 'claiming') {
    return (
      <Screen>
        <Loader2 className="w-8 h-8 text-gold animate-spin mb-3" />
        <p className="text-sm text-zinc-400">Setting up your access…</p>
      </Screen>
    );
  }

  /* ─── ready state ─── */
  return (
    <Screen>
      {/* Club badge */}
      <div className="w-14 h-14 rounded-2xl bg-gold/15 flex items-center justify-center mb-4">
        <ShieldCheck className="w-7 h-7 text-gold" />
      </div>

      <h2 className="text-xl font-bold text-white mb-1 text-center">
        You've been invited to join
      </h2>
      <p className="text-gold font-semibold text-lg mb-5 text-center">{invite?.club_name}</p>

      {/* If logged in → just claim */}
      {user ? (
        <div className="w-full max-w-sm flex flex-col items-center gap-3">
          <p className="text-sm text-zinc-400 text-center">
            Signed in as <span className="text-white">{user.email}</span>
          </p>
          <Button variant="gold" className="w-full" onClick={claimInvite}>
            Accept Invite & Access Dashboard
          </Button>
          <button
            onClick={async () => { await supabase.auth.signOut(); }}
            className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            Sign in with a different account
          </button>
        </div>
      ) : (
        /* Not logged in → auth form */
        <div className="w-full max-w-sm">
          {/* Toggle */}
          <div className="flex mb-5 rounded-lg border border-white/10 overflow-hidden">
            {(['signin', 'signup'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => { setAuthMode(mode); setAuthError(''); }}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${authMode === mode ? 'bg-gold/15 text-gold' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                {mode === 'signin' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          <form onSubmit={handleAuth} className="space-y-3">
            {authMode === 'signup' && (
              <Input
                placeholder="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="bg-zinc-900 border-white/10 text-white placeholder:text-zinc-600"
              />
            )}
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-zinc-900 border-white/10 text-white placeholder:text-zinc-600"
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-zinc-900 border-white/10 text-white placeholder:text-zinc-600"
            />
            {authError && <p className="text-xs text-red-400">{authError}</p>}
            <Button
              type="submit"
              variant="gold"
              className="w-full"
              disabled={pageState === 'signing_in'}
            >
              {pageState === 'signing_in'
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Please wait…</>
                : authMode === 'signin' ? 'Sign In & Accept Invite' : 'Create Account & Accept Invite'
              }
            </Button>
          </form>

          <p className="text-xs text-zinc-600 mt-4 text-center">
            By accepting, you'll get dashboard access to help manage {invite?.club_name}.
          </p>
        </div>
      )}
    </Screen>
  );
}

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ background: '#0A0A0A' }}
    >
      <div className="w-full max-w-md flex flex-col items-center">
        {children}
      </div>
    </div>
  );
}
