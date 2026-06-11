import { useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useClubOwnership } from '@/hooks/useClubOwnership';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { ClubAdminSidebar } from '@/components/club-admin/ClubAdminSidebar';
import { AdminBreadcrumb } from '@/components/club-admin/AdminBreadcrumb';
import { RecruitmentKanban } from '@/components/recruitment/RecruitmentKanban';
import { useRecruitment } from '@/hooks/useRecruitment';
import { Loader2 } from 'lucide-react';

const DEFAULT_STAGES = ['Screening', 'Interview', 'Decision'];

export default function ClubAdminRecruitment() {
  const navigate = useNavigate();
  const { clubId } = useParams<{ clubId: string }>();
  const { user, loading: authLoading } = useAuth();
  const { isOwnerOf, isOfficerOf, loading: ownershipLoading, ownedClubs } = useClubOwnership();
  const autoSetupRan = useRef(false);

  const {
    settings,
    stages,
    applicants,
    loading: recruitmentLoading,
    hasStages,
    enableRecruitment,
    createStages,
    updateApplicantStage,
    bulkMoveApplicants,
    deleteApplicant,
    updateStage,
    addStage,
    deleteStage,
    fetchForm,
    updateFinalDecision,
    updateNotes,
    refetch,
  } = useRecruitment(clubId);

  useEffect(() => {
    if (!authLoading && !user) navigate('/login?redirect=/club-admin');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (
      !authLoading &&
      !ownershipLoading &&
      user &&
      clubId &&
      !isOwnerOf(clubId) &&
      !isOfficerOf(clubId)
    )
      navigate('/club-admin');
  }, [authLoading, ownershipLoading, user, clubId, isOwnerOf, isOfficerOf, navigate]);

  // On first load: auto-enable + create full default pipeline if missing or incomplete
  useEffect(() => {
    // "complete" means more than just the single intake stage
    const pipelineComplete = stages.length > 1;
    if (recruitmentLoading || pipelineComplete || autoSetupRan.current) return;
    autoSetupRan.current = true;
    enableRecruitment().catch(() => {}).finally(() => {
      createStages(DEFAULT_STAGES).catch(() => {});
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recruitmentLoading, stages.length]);

  const clubName =
    ownedClubs.find((c) => c.clubId?.trim().toLowerCase() === clubId?.trim().toLowerCase())
      ?.clubName || 'Club';

  const isLoading = authLoading || ownershipLoading || recruitmentLoading;

  if (isLoading) {
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
                { label: clubName, href: `/club-admin/clubs/${clubId}/events` },
                { label: 'Recruitment' },
              ]}
            />
          </header>

          <div className="flex-1 flex flex-col p-5 sm:p-7 min-h-0">
            {stages.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-gold animate-spin" />
              </div>
            ) : (
              <RecruitmentKanban
                clubId={clubId}
                clubName={clubName}
                stages={stages}
                applicants={applicants}
                settings={settings}
                onMoveApplicant={updateApplicantStage}
                onBulkMoveApplicants={bulkMoveApplicants}
                onDeleteApplicant={deleteApplicant}
                onUpdateStage={updateStage}
                onAddStage={addStage}
                onDeleteStage={deleteStage}
                onRefresh={refetch}
                fetchForm={fetchForm}
                onUpdateFinalDecision={updateFinalDecision}
                onUpdateNotes={updateNotes}
              />
            )}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
