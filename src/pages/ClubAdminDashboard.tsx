import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useClubOwnership, VerificationState } from '@/hooks/useClubOwnership';
import { useAdminProfile } from '@/hooks/useAdminProfile';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { ClubAdminSidebar } from '@/components/club-admin/ClubAdminSidebar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Calendar, Users, Shield, AlertTriangle, CheckCircle2, XCircle, Settings } from 'lucide-react';
import { OnboardingChecklist } from '@/components/club-admin/OnboardingChecklist';
import { RecruitmentDashboardCard } from '@/components/club-admin/RecruitmentDashboardCard';

function VerificationBadge({ state }: { state: VerificationState }) {
  switch (state) {
    case 'verified':
      return (
        <Badge variant="outline" className="border-green-500/50 text-green-600 bg-green-500/10 gap-1">
          <CheckCircle2 className="w-3 h-3" />
          Verified
        </Badge>
      );
    case 'provisional':
      return (
        <Badge variant="outline" className="border-yellow-500/50 text-yellow-600 bg-yellow-500/10 gap-1">
          <AlertTriangle className="w-3 h-3" />
          Provisional
        </Badge>
      );
    case 'suspended':
      return (
        <Badge variant="outline" className="border-destructive/50 text-destructive bg-destructive/10 gap-1">
          <XCircle className="w-3 h-3" />
          Suspended
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="border-muted-foreground/50 text-muted-foreground gap-1">
          <Shield className="w-3 h-3" />
          Unverified
        </Badge>
      );
  }
}

export default function ClubAdminDashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { ownedClubs, loading: ownershipLoading, hasProvisionalClub } = useClubOwnership();
  const { loading: profileLoading, isProfileComplete } = useAdminProfile();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login?redirect=/club-admin');
    }
  }, [user, authLoading, navigate]);

  // Redirect to admin onboarding if profile incomplete
  useEffect(() => {
    if (!authLoading && !ownershipLoading && !profileLoading && user && ownedClubs.length > 0 && !isProfileComplete) {
      navigate('/admin-onboarding');
    }
  }, [authLoading, ownershipLoading, profileLoading, user, ownedClubs, isProfileComplete, navigate]);

  if (authLoading || ownershipLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-gold animate-spin" />
      </div>
    );
  }

  if (!user || !isProfileComplete) return null;

  // Redirect users without clubs to the clubs directory
  useEffect(() => {
    if (!authLoading && !ownershipLoading && user && ownedClubs.length === 0) {
      navigate('/clubs');
    }
  }, [authLoading, ownershipLoading, user, ownedClubs.length, navigate]);

  if (ownedClubs.length === 0) {
    // Show loading while redirect happens
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-gold animate-spin" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <ClubAdminSidebar />
        
        <main className="flex-1">
          <header className="h-16 border-b border-border flex items-center px-4 gap-4">
            <SidebarTrigger />
            <h1 className="text-xl font-display font-semibold text-foreground">
              Club Admin Portal
            </h1>
          </header>

          <div className="p-6">
            {/* Provisional Warning Banner */}
            {hasProvisionalClub && (
              <div className="mb-6 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-foreground text-sm mb-1">Provisional Account</h4>
                    <p className="text-sm text-muted-foreground">
                      Some of your clubs have provisional status. This means certain features are restricted until you verify with a .edu email or get confirmed by another verified admin.
                    </p>
                    <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                      <li className="flex items-center gap-2">
                        <XCircle className="w-3 h-3 text-destructive" />
                        Cannot publish events publicly (saved as drafts)
                      </li>
                      <li className="flex items-center gap-2">
                        <XCircle className="w-3 h-3 text-destructive" />
                        Cannot send mass messages
                      </li>
                      <li className="flex items-center gap-2">
                        <XCircle className="w-3 h-3 text-destructive" />
                        External links require review
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            <div className="mb-8">
              <h2 className="text-2xl font-display font-bold text-foreground mb-2">
                Welcome back!
              </h2>
              <p className="text-muted-foreground">
                Manage your clubs and events from this dashboard.
              </p>
            </div>

            {/* Onboarding Checklists */}
            {ownedClubs.map((club) => (
              <OnboardingChecklist key={`checklist-${club.clubId}`} club={club} />
            ))}

            {/* Recruitment Cards - Prominent Section */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-gold" />
                Recruitment
              </h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {ownedClubs.map((club) => (
                  <RecruitmentDashboardCard 
                    key={`recruitment-${club.clubId}`}
                    clubId={club.clubId}
                    clubName={club.clubName}
                  />
                ))}
              </div>
            </div>

            <h3 className="text-lg font-semibold text-foreground mb-4">My Clubs</h3>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {ownedClubs.map((club) => (
                <div
                  key={club.clubId}
                  className={`premium-card p-6 transition-colors ${
                    club.verificationState === 'provisional' 
                      ? 'border-yellow-500/30 hover:border-yellow-500/50' 
                      : 'hover:border-gold/30'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-semibold text-foreground">
                      {club.clubName}
                    </h3>
                    <VerificationBadge state={club.verificationState} />
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-1">
                    Claimed {new Date(club.verifiedAt).toLocaleDateString()}
                  </p>
                  
                  {club.verificationState === 'provisional' && club.provisionalUntil && (
                    <p className="text-xs text-yellow-600 mb-3">
                      Provisional until {new Date(club.provisionalUntil).toLocaleDateString()}
                    </p>
                  )}
                  
                  {club.verificationState === 'verified' && (
                    <div className="flex items-center gap-1 text-xs text-green-600 mb-3">
                      <CheckCircle2 className="w-3 h-3" />
                      Full access enabled
                    </div>
                  )}
                  
                  <div className="flex flex-wrap gap-2 mt-4">
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/club-admin/clubs/${club.clubId}/edit`}>
                        <Settings className="w-4 h-4 mr-1" />
                        Edit Profile
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/club-admin/clubs/${club.clubId}/events`}>
                        <Calendar className="w-4 h-4 mr-1" />
                        Events
                      </Link>
                    </Button>
                    <Button 
                      variant={club.verificationState === 'provisional' ? 'outline' : 'gold'} 
                      size="sm" 
                      asChild
                    >
                      <Link to={`/submit-event?club=${club.clubId}`}>
                        <Plus className="w-4 h-4 mr-1" />
                        {club.verificationState === 'provisional' ? 'Draft Event' : 'New Event'}
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
