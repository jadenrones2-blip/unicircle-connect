import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';

import { toast } from 'sonner';
import logoImage from '@/assets/unicircle-logo-new.png';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;

    const clearUrl = () => {
      // Clear hash/query so refresh/back doesn't re-process a one-time link
      window.history.replaceState(null, '', window.location.pathname);
    };

    const setValid = () => {
      if (!isMounted) return;
      setError(null);
      setIsValidSession(true);
    };

    const setInvalid = (message: string) => {
      if (!isMounted) return;
      setError(message);
      setIsValidSession(false);
      clearUrl();
    };

    // Listen for auth state changes - reliable for implicit recovery links
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth event:', event, 'Session:', !!session);

      if (event === 'PASSWORD_RECOVERY') {
        setValid();
        clearUrl();
        return;
      }

      if (event === 'SIGNED_IN' && session) {
        setValid();
      }
    });

    const checkInitialState = async () => {
      const hash = window.location.hash.startsWith('#')
        ? window.location.hash.substring(1)
        : window.location.hash;
      const hashParams = new URLSearchParams(hash);
      const searchParams = new URLSearchParams(window.location.search);

      // If there's a code param, exchange it (legacy PKCE links)
      const code = searchParams.get('code');
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          console.error('Code exchange error:', exchangeError);
          // Don't block — fall through to check for existing session
        } else {
          setValid();
          clearUrl();
          return;
        }
      }

      // 2) If we already have a session, prefer it over any URL error params.
      // This prevents back/forward or a double-opened link from incorrectly blocking the reset form.
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        setValid();
        clearUrl();
        return;
      }

      // 3) Surface URL errors (expired/used token) only if we *don't* have a session
      const errorDescription =
        hashParams.get('error_description') ?? searchParams.get('error_description');
      const errorCode = hashParams.get('error_code') ?? searchParams.get('error_code');

      if (errorDescription || errorCode) {
        const message =
          errorDescription ||
          (errorCode === 'otp_expired'
            ? 'This reset link has expired. Please request a new one.'
            : 'This reset link is invalid or has already been used. Please request a new one.');
        setInvalid(message);
        return;
      }

      // 4) If there are tokens in the URL, wait briefly for the auth listener to process them.
      // If nothing arrives, fail gracefully instead of spinning forever.
      const hasRecoveryTokensInUrl =
        hashParams.has('access_token') ||
        hashParams.get('type') === 'recovery' ||
        hash.includes('type=recovery');

      if (!hasRecoveryTokensInUrl) {
        setInvalid('Invalid or expired reset link. Please request a new one.');
        return;
      }

      // Wait for onAuthStateChange to fire; fallback after 2 seconds
      setTimeout(async () => {
        if (!isMounted) return;
        const {
          data: { session: delayedSession },
        } = await supabase.auth.getSession();

        if (delayedSession) {
          setValid();
          clearUrl();
        } else {
          setInvalid('This reset link is invalid or has already been used. Please request a new one.');
        }
      }, 2000);
    };

    checkInitialState();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      // Verify we still have a valid session before attempting update
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession) {
        setError('Your session has expired. Please request a new password reset link.');
        setIsValidSession(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({ password });
      
      if (error) throw error;
      
      setSuccess(true);
      toast.success('Password updated successfully!');
      
      // Sign out to clear the recovery session, then redirect to login
      await supabase.auth.signOut();
      
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update password';
      if (message.toLowerCase().includes('session') || message.toLowerCase().includes('token') || message.toLowerCase().includes('not authenticated')) {
        setError('Your session has expired. Please request a new password reset link.');
        setIsValidSession(false);
      } else {
        toast.error(message);
      }
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (isValidSession === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <img src={logoImage} alt="UniCircle" className="h-12 mx-auto mb-4" />
          </Link>
          <h1 className="text-2xl font-bold text-foreground">
            {success ? 'Password Updated!' : error ? 'Link Expired' : 'Set New Password'}
          </h1>
          <p className="text-muted-foreground mt-2">
            {success 
              ? 'Redirecting you to login...'
              : error 
                ? 'Please request a new password reset link'
                : 'Enter your new password below'
            }
          </p>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-2xl p-8 shadow-lg">
          {success ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-4"
            >
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Success!</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Your password has been updated. You can now log in with your new password.
                </p>
              </div>
            </motion.div>
          ) : error ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-4"
            >
              <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Reset Link Invalid</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {error}
                </p>
              </div>
              <Button
                onClick={() => navigate('/forgot-password')}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                Request New Link
              </Button>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground">
                  New Password
                </Label>
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

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-foreground">
                  Confirm New Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10"
                    disabled={loading}
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Update Password'
                )}
              </Button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
