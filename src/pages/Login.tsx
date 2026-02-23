import { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Loader2, ArrowRight, Sparkles, Building2, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { useUserInterests } from '@/hooks/useUserInterests';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import logoImage from '@/assets/unicircle-logo-new.png';
import { cn } from '@/lib/utils';

type LoginMode = 'student' | 'club-owner' | 'admin';

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect');
  const showAdmin = searchParams.get('role') === 'admin';
  const { signIn } = useAuth();
  const { hasCompletedOnboarding } = useUserInterests();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<LoginMode>(
    showAdmin ? 'admin' : redirectTo?.includes('club-admin') ? 'club-owner' : 'student'
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    // Validate UCSD email for student login only
    // TODO: Re-enable for production
    // if (mode === 'student' && !email.toLowerCase().endsWith('@ucsd.edu')) {
    //   toast.error('Students must use a UCSD email address (@ucsd.edu)');
    //   return;
    // }

    setLoading(true);
    try {
      const { data, error } = await signIn(email, password);
      if (error) throw error;

      if (data.user) {
        if (mode === 'admin') {
          // Check if user has platform admin role
          const { data: hasAdmin } = await supabase.rpc('has_role', {
            _user_id: data.user.id,
            _role: 'admin',
          });

          if (hasAdmin) {
            navigate('/admin/events');
            toast.success('Welcome, Admin!');
          } else {
            await supabase.auth.signOut();
            toast.error('This account does not have platform admin access.', { duration: 5000 });
          }
        } else {
          // Auto-detect club ownership regardless of selected mode
          const { data: ownedClubs } = await supabase
            .from('club_owners')
            .select('id')
            .eq('user_id', data.user.id)
            .limit(1);

          if (ownedClubs && ownedClubs.length > 0) {
            // User is a club owner — route to admin portal
            navigate('/club-admin');
            toast.success('Welcome to your Club Admin Portal!');
          } else if (mode === 'club-owner') {
            // Tried club-owner mode but has no clubs
            await supabase.auth.signOut();
            toast.error(
              'No clubs found for this account. You must claim a club first before accessing the admin portal.',
              { duration: 6000 }
            );
            navigate('/clubs');
          } else {
            // Student login flow
            const completed = await hasCompletedOnboarding(data.user.id);
            if (completed) {
              navigate(redirectTo || '/dashboard');
            } else {
              navigate('/onboarding');
            }
            toast.success('Welcome back!');
          }
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-6 sm:mb-8">
          <Link to="/" className="inline-block">
            <img src={logoImage} alt="UniCircle" className="h-10 sm:h-12 mx-auto mb-3 sm:mb-4" />
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Welcome Back</h1>
          <p className="text-muted-foreground mt-2">
            {mode === 'admin'
              ? 'Sign in to review and approve events'
              : mode === 'club-owner' 
                ? 'Sign in to manage your club' 
                : 'Sign in to discover clubs tailored to your interests'}
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="flex gap-1 sm:gap-2 mb-4 sm:mb-6 p-1 bg-muted rounded-lg">
          <button
            type="button"
            onClick={() => setMode('student')}
            className={cn(
              'flex-1 flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-2 sm:py-2.5 rounded-md text-xs sm:text-sm font-medium transition-all',
              mode === 'student'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Sparkles className="h-4 w-4" />
            Student
          </button>
          <button
            type="button"
            onClick={() => setMode('club-owner')}
            className={cn(
              'flex-1 flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-2 sm:py-2.5 rounded-md text-xs sm:text-sm font-medium transition-all',
              mode === 'club-owner'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Building2 className="h-4 w-4" />
            Club Owner
          </button>
          {showAdmin && (
            <button
              type="button"
              onClick={() => setMode('admin')}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-md text-sm font-medium transition-all',
                mode === 'admin'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Shield className="h-4 w-4" />
              Admin
            </button>
          )}
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-2xl p-5 sm:p-8 shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@ucsd.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-foreground">
                  Password
                </Label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  disabled={loading}
                />
              </div>
            </div>

            <Button
              type="submit"
              className={cn(
                'w-full',
                mode === 'admin'
                  ? 'bg-primary hover:bg-primary/90 text-primary-foreground'
                  : mode === 'club-owner' 
                    ? 'bg-gold hover:bg-gold/90 text-primary-foreground' 
                    : 'bg-primary hover:bg-primary/90 text-primary-foreground'
              )}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  {mode === 'admin' ? 'Sign In as Admin' : mode === 'club-owner' ? 'Sign In as Club Owner' : 'Sign In'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{' '}
              <Link
                to="/signup"
                className="text-primary font-medium hover:underline"
              >
                Sign up
              </Link>
            </p>
          </div>
        </div>

        {/* Feature highlight */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-6 text-center"
        >
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-4 py-2 rounded-full">
            {mode === 'admin' ? (
              <>
                <Shield className="h-4 w-4 text-primary" />
                Review and approve scraped events
              </>
            ) : mode === 'club-owner' ? (
              <>
                <Building2 className="h-4 w-4 text-gold" />
                Manage your club's events and profile
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 text-primary" />
                Get personalized club recommendations
              </>
            )}
          </div>
        </motion.div>

        {/* Legal disclaimer */}
        <p className="mt-4 text-xs text-muted-foreground/60 text-center max-w-sm mx-auto">
          UniCircle is not affiliated with, endorsed by, or sponsored by UC San Diego.
        </p>
      </motion.div>
    </div>
  );
}
