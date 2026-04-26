import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useClubOwnership } from '@/hooks/useClubOwnership';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { ClubAdminSidebar } from '@/components/club-admin/ClubAdminSidebar';
import { AdminBreadcrumb } from '@/components/club-admin/AdminBreadcrumb';
import { InviteTeamPanel } from '@/components/club-admin/InviteTeamPanel';
import { Loader2 } from 'lucide-react';

export default function ClubAdminTeam() {
  const navigate = useNavigate();
  const { clubId } = useParams<{ clubId: string }>();
  const { user, loading: authLoading } = useAuth();
  const { isOwnerOf, isOfficerOf, loading: ownershipLoading, ownedClubs } = useClubOwnership();

  useEffect(() => {
    if (!authLoading && !user) navigate('/login?redirect=/club-admin');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!authLoading && !ownershipLoading && user && clubId) {
      if (!isOwnerOf(clubId) && !isOfficerOf(clubId)) navigate('/club-admin');
    }
  }, [authLoading, ownershipLoading, user, clubId, isOwnerOf, isOfficerOf, navigate]);

  const club = ownedClubs.find((c) => c.clubId?.trim().toLowerCase() === clubId?.trim().toLowerCase());
  const clubName = club?.clubName || 'Club';
  const isOwner = !!club?.isOwner;

  if (authLoading || ownershipLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0A0A0A' }}>
        <Loader2 className="w-6 h-6 text-gold animate-spin" />
      </div>
    );
  }

  if (!user || !clubId) return null;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full overflow-hidden" style={{ background: '#0A0A0A' }}>
        <ClubAdminSidebar />
        <main className="flex-1 flex flex-col min-h-screen min-w-0 overflow-hidden">
          <header
            className="h-14 flex items-center px-4 gap-3 shrink-0"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
          >
            <SidebarTrigger className="text-zinc-500 hover:text-white transition-colors" />
            <AdminBreadcrumb
              items={[
                { label: clubName, href: `/club-admin/clubs/${clubId}/recruitment` },
                { label: 'Team' },
              ]}
            />
          </header>

          <div className="flex-1 p-6 sm:p-10 max-w-xl">
            <InviteTeamPanel clubId={clubId} clubName={clubName} isOwner={isOwner} />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
