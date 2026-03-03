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
