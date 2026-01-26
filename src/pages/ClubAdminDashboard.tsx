import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useClubOwnership } from '@/hooks/useClubOwnership';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { ClubAdminSidebar } from '@/components/club-admin/ClubAdminSidebar';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, Calendar, Users } from 'lucide-react';

export default function ClubAdminDashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { ownedClubs, loading: ownershipLoading } = useClubOwnership();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login?redirect=/club-admin');
    }
  }, [user, authLoading, navigate]);

  if (authLoading || ownershipLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-gold animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  if (ownedClubs.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center max-w-md">
          <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-display font-bold text-foreground mb-2">
            No Clubs Yet
          </h1>
          <p className="text-muted-foreground mb-6">
            You haven't claimed any clubs yet. Visit a club's page and click "Claim this club" to get started.
          </p>
          <Button variant="gold" asChild>
            <Link to="/clubs">Browse Clubs</Link>
          </Button>
        </div>
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
            <div className="mb-8">
              <h2 className="text-2xl font-display font-bold text-foreground mb-2">
                Welcome back!
              </h2>
              <p className="text-muted-foreground">
                Manage your clubs and events from this dashboard.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {ownedClubs.map((club) => (
                <div
                  key={club.clubId}
                  className="premium-card p-6 hover:border-gold/30 transition-colors"
                >
                  <h3 className="text-lg font-semibold text-foreground mb-1">
                    {club.clubName}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Verified {new Date(club.verifiedAt).toLocaleDateString()}
                  </p>
                  
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/club-admin/clubs/${club.clubId}/events`}>
                        <Calendar className="w-4 h-4 mr-1" />
                        Events
                      </Link>
                    </Button>
                    <Button variant="gold" size="sm" asChild>
                      <Link to={`/submit-event?club=${club.clubId}`}>
                        <Plus className="w-4 h-4 mr-1" />
                        New Event
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
