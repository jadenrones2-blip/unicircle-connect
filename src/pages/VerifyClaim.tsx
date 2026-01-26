import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2, ArrowRight } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

type VerificationStatus = 'loading' | 'success' | 'error';

interface VerificationResult {
  clubName?: string;
  clubId?: string;
  errorMessage?: string;
}

export default function VerifyClaim() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [status, setStatus] = useState<VerificationStatus>('loading');
  const [result, setResult] = useState<VerificationResult>({});

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setStatus('error');
        setResult({ errorMessage: 'No verification token provided' });
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('verify-club-claim', {
          body: {
            action: 'verify-token',
            token,
          },
        });

        if (error || data?.error) {
          setStatus('error');
          setResult({ errorMessage: data?.error || error?.message || 'Verification failed' });
          return;
        }

        setStatus('success');
        setResult({
          clubName: data.clubName,
          clubId: data.clubId,
        });
      } catch (err: any) {
        setStatus('error');
        setResult({ errorMessage: err.message || 'An unexpected error occurred' });
      }
    };

    verifyToken();
  }, [token]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 pt-24 pb-16 flex items-center justify-center">
        <div className="container mx-auto px-4 max-w-md text-center">
          {status === 'loading' && (
            <div className="space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gold/10 border border-gold/20">
                <Loader2 className="w-8 h-8 text-gold animate-spin" />
              </div>
              <h1 className="text-2xl font-display font-bold text-foreground">
                Verifying your claim...
              </h1>
              <p className="text-muted-foreground">
                Please wait while we verify your ownership.
              </p>
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
              <div>
                <h1 className="text-2xl font-display font-bold text-foreground mb-2">
                  Ownership Verified!
                </h1>
                <p className="text-muted-foreground">
                  You are now the verified owner of <span className="text-gold font-medium">{result.clubName}</span>.
                </p>
              </div>

              <div className="premium-card p-6 text-left space-y-3">
                <h3 className="font-semibold text-foreground">What you can do now:</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-gold shrink-0 mt-0.5" />
                    Submit events for your club
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-gold shrink-0 mt-0.5" />
                    Manage your club's calendar
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-gold shrink-0 mt-0.5" />
                    Update your club's information
                  </li>
                </ul>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  variant="outline"
                  onClick={() => navigate(`/clubs/${result.clubId}`)}
                >
                  View Club Profile
                </Button>
                <Button
                  variant="gold"
                  onClick={() => navigate('/submit-event')}
                  className="gap-2"
                >
                  Submit an Event
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 border border-destructive/20">
                <XCircle className="w-8 h-8 text-destructive" />
              </div>
              <div>
                <h1 className="text-2xl font-display font-bold text-foreground mb-2">
                  Verification Failed
                </h1>
                <p className="text-muted-foreground">
                  {result.errorMessage || 'Unable to verify your claim.'}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  variant="outline"
                  onClick={() => navigate('/clubs')}
                >
                  Browse Clubs
                </Button>
                <Button
                  variant="gold"
                  onClick={() => navigate('/')}
                >
                  Go Home
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
