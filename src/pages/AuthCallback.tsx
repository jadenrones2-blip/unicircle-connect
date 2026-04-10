import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AuthCallback() {
  const navigate = useNavigate();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const handleCallback = async () => {
      // Wait for Supabase to exchange the OAuth code for a session
      const { data, error } = await supabase.auth.getSession();

      if (error || !data.session) {
        toast.error('Sign-in failed. Please try again.');
        navigate('/login');
        return;
      }

      const userId = data.session.user.id;

      // If Supabase redirected back here from an email confirmation that
      // originated from an invite link, the original URL is in the hash
      // as `next` or embedded in the redirect_to param.
      // Check window.location for an invite path.
      const params = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.replace('#', ''));
      const redirectTo = params.get('redirect_to') || hashParams.get('redirect_to') || '';
      if (redirectTo.includes('/invite/')) {
        navigate(redirectTo);
        return;
      }

      // Also check if the user came from an invite by checking club_officers
      // (no club_owners row but has a club_officers row = they're an officer)
      const { data: officerClubs } = await supabase
        .from('club_officers' as any)
        .select('club_id')
        .eq('user_id', userId)
        .limit(1);
      if (officerClubs && officerClubs.length > 0) {
        navigate(`/club-admin/clubs/${officerClubs[0].club_id}/recruitment`);
        return;
      }

      // Block non-UCSD Google sign-ins
      const provider = data.session.user.app_metadata?.provider;
      const email = data.session.user.email || '';
      if (provider === 'google' && !email.toLowerCase().endsWith('@ucsd.edu')) {
        await supabase.auth.signOut();
        navigate('/login?error=ucsd_only');
        return;
      }

      // Check platform admin role first
      const { data: isAdmin } = await supabase.rpc('has_role', {
        _user_id: userId,
        _role: 'admin',
      });

      if (isAdmin) {
        toast.success('Welcome, Admin!');
        navigate('/admin/events');
        return;
      }

      // Check club ownership
      const { data: ownedClubs } = await supabase
        .from('club_owners')
        .select('id')
        .eq('user_id', userId)
        .limit(1);

      if (ownedClubs && ownedClubs.length > 0) {
        toast.success('Welcome to your Club Admin Portal!');
        navigate('/club-admin');
        return;
      }

      // Check if student has completed onboarding
      const { data: interests } = await supabase
        .from('user_interests')
        .select('id')
        .eq('user_id', userId)
        .limit(1);

      if (interests && interests.length > 0) {
        toast.success('Welcome back!');
        navigate('/dashboard');
      } else {
        navigate('/onboarding');
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
      <Loader2 className="w-8 h-8 text-gold animate-spin" />
      <p className="text-muted-foreground text-sm">Signing you in...</p>
    </div>
  );
}
