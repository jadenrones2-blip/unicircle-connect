import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useClubOwnership } from '@/hooks/useClubOwnership';
import { useClubBoard } from '@/hooks/useClubBoard';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { ClubAdminSidebar } from '@/components/club-admin/ClubAdminSidebar';
import { AdminBreadcrumb } from '@/components/club-admin/AdminBreadcrumb';
import { InviteTeamPanel } from '@/components/club-admin/InviteTeamPanel';
import { TeamMemberCard } from '@/components/club-admin/TeamMemberCard';
import { Loader2, Users } from 'lucide-react';

export default function ClubAdminTeam() {
  const navigate = useNavigate();
  const { clubId } = useParams<{ clubId: string }>();
  const { user, loading: authLoading } = useAuth();
  const { isOwnerOf, isOfficerOf, loading: ownershipLoading, ownedClubs } = useClubOwnership();
  const { members, loading: boardLoading } = useClubBoard(clubId);

  useEffect(() => {
    if (!authLoading && !user) navigate('/login?redirect=/club-admin');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!authLoading && !ownershipLoading && user && clubId) {
      if (!isOwnerOf(clubId) && !isOfficerOf(clubId)) navigate('/club-admin');
    }
  }, [authLoading, ownershipLoading, user, clubId, isOwnerOf, isOfficerOf, navigate]);

  const club = ownedClubs.find(
    (c) => c.clubId?.trim().toLowerCase() === clubId?.trim().toLowerCase()
  );
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
        <main className="flex-1 flex flex-col min-h-screen min-w-0 overflow-auto">
          <header
            className="h-14 flex items-center px-4 gap-3 shrink-0 sticky top-0 z-10"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: '#0A0A0A' }}
          >
            <SidebarTrigger className="text-zinc-500 hover:text-white transition-colors" />
            <AdminBreadcrumb
              items={[
                { label: clubName, href: `/club-admin/clubs/${clubId}/recruitment` },
                { label: 'Team' },
              ]}
            />
          </header>

          <div className="flex-1 p-6 sm:p-8 space-y-12 max-w-5xl">

            {/* ── Board directory ── */}
            <section>
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-gold" />
                <h2 className="text-lg font-display font-bold text-white">Board Directory</h2>
              </div>
              <p className="text-sm text-zinc-500 mb-6">
                Your team's profiles — visible internally and on your public club page.
              </p>

              {boardLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="rounded-2xl border border-white/[0.07] bg-zinc-900/60 p-5 animate-pulse">
                      <div className="w-24 h-24 rounded-2xl bg-white/10 mx-auto mb-4" />
                      <div className="h-3 bg-white/10 rounded w-3/4 mx-auto mb-2" />
                      <div className="h-2.5 bg-white/[0.06] rounded w-1/2 mx-auto" />
                    </div>
                  ))}
                </div>
              ) : members.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/[0.07] p-10 text-center">
                  <Users className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
                  <p className="text-sm text-zinc-500">
                    No profiles yet. Invite your team and ask them to fill out their profile.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {members.map((member) => (
                    <TeamMemberCard key={member.user_id} member={member} variant="internal" />
                  ))}
                </div>
              )}
            </section>

            {/* ── Invite management ── */}
            <section>
              <div
                className="pt-10"
                style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
              >
                <InviteTeamPanel clubId={clubId} clubName={clubName} isOwner={isOwner} />
              </div>
            </section>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
