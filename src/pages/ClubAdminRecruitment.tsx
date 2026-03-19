import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useClubOwnership } from '@/hooks/useClubOwnership';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { ClubAdminSidebar } from '@/components/club-admin/ClubAdminSidebar';
import { AdminBreadcrumb } from '@/components/club-admin/AdminBreadcrumb';
import ATSBoard from '@/components/club-admin/ATSBoard';
import { Loader2 } from 'lucide-react';

export default function ClubAdminRecruitment() {
  const navigate = useNavigate();
  const { clubId } = useParams<{ clubId: string }>();
  const { user, loading: authLoading } = useAuth();
  const { isOwnerOf, loading: ownershipLoading, ownedClubs } = useClubOwnership();

  useEffect(() => {
    if (!authLoading && !user) navigate('/login?redirect=/club-admin');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!authLoading && !ownershipLoading && user && clubId && !isOwnerOf(clubId))
      navigate('/club-admin');
  }, [authLoading, ownershipLoading, user, clubId, isOwnerOf, navigate]);

  const clubName = ownedClubs.find(c => c.clubId === clubId)?.clubName || 'Club';

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
      <div className="min-h-screen flex w-full" style={{ background: '#0A0A0A' }}>
        <ClubAdminSidebar />
        <main className="flex-1 flex flex-col">
          <header className="h-14 flex items-center px-4 gap-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <SidebarTrigger className="text-zinc-500 hover:text-white transition-colors" />
            <AdminBreadcrumb items={[
              { label: clubName, href: `/club-admin/clubs/${clubId}/events` },
              { label: 'Recruitment' }
            ]} />
          </header>
          <div className="flex-1 p-5 sm:p-7">
            <ATSBoard />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
