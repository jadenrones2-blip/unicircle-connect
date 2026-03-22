import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useClubOwnership } from '@/hooks/useClubOwnership';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { ClubAdminSidebar } from '@/components/club-admin/ClubAdminSidebar';
import { AdminBreadcrumb } from '@/components/club-admin/AdminBreadcrumb';
import { RecruitmentIntro } from '@/components/recruitment/RecruitmentIntro';
import { RecruitmentSetupWizard } from '@/components/recruitment/RecruitmentSetupWizard';
import { RecruitmentKanban } from '@/components/recruitment/RecruitmentKanban';
import { useRecruitment } from '@/hooks/useRecruitment';
import { Loader2 } from 'lucide-react';

export default function ClubAdminRecruitment() {
  const navigate = useNavigate();
  const { clubId } = useParams<{ clubId: string }>();
  const { user, loading: authLoading } = useAuth();
  const { isOwnerOf, loading: ownershipLoading, ownedClubs } = useClubOwnership();
  const [enabling, setEnabling] = useState(false);
  const [creatingStages, setCreatingStages] = useState(false);

  const {
    settings,
    stages,
    applicants,
    loading: recruitmentLoading,
    isEnabled,
    hasStages,
    enableRecruitment,
    createStages,
    addApplicant,
    bulkAddApplicants,
    updateApplicantStage,
    deleteApplicant,
    fetchForm,
    saveForm,
    updateFinalDecision,
    updateNotes,
    refetch,
  } = useRecruitment(clubId);

  useEffect(() => {
    if (!authLoading && !user) navigate('/login?redirect=/club-admin');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!authLoading && !ownershipLoading && user && clubId && !isOwnerOf(clubId))
      navigate('/club-admin');
  }, [authLoading, ownershipLoading, user, clubId, isOwnerOf, navigate]);

  const clubName = ownedClubs.find(c => c.clubId === clubId)?.clubName || 'Club';

  const handleEnable = async () => {
    setEnabling(true);
    await enableRecruitment();
    setEnabling(false);
  };

  const handleCreateStages = async (stageLabels: string[]) => {
    setCreatingStages(true);
    await createStages(stageLabels);
    setCreatingStages(false);
  };

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
      <div className="min-h-screen flex w-full" style={{ background: '#0A0A0A' }}>
        <ClubAdminSidebar />
        <main className="flex-1 flex flex-col min-h-screen">
          <header className="h-14 flex items-center px-4 gap-3 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <SidebarTrigger className="text-zinc-500 hover:text-white transition-colors" />
            <AdminBreadcrumb items={[
              { label: clubName, href: `/club-admin/clubs/${clubId}/events` },
              { label: 'Recruitment' }
            ]} />
          </header>

          <div className="flex-1 flex flex-col p-5 sm:p-7 min-h-0">
            {!isEnabled ? (
              <RecruitmentIntro onEnable={handleEnable} loading={enabling} />
            ) : !hasStages ? (
              <RecruitmentSetupWizard onComplete={handleCreateStages} loading={creatingStages} />
            ) : (
              <RecruitmentKanban
                clubId={clubId}
                clubName={clubName}
                stages={stages}
                applicants={applicants}
                settings={settings}
                onMoveApplicant={updateApplicantStage}
                onAddApplicant={addApplicant}
                onBulkAddApplicants={bulkAddApplicants}
                onDeleteApplicant={deleteApplicant}
                onRefresh={refetch}
                fetchForm={fetchForm}
                saveForm={saveForm}
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
