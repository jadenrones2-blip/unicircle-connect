import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useClubOwnership } from '@/hooks/useClubOwnership';
import { useRecruitment } from '@/hooks/useRecruitment';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { ClubAdminSidebar } from '@/components/club-admin/ClubAdminSidebar';
import { AdminBreadcrumb } from '@/components/club-admin/AdminBreadcrumb';
import { RecruitmentIntro } from '@/components/recruitment/RecruitmentIntro';
import { RecruitmentSetupWizard } from '@/components/recruitment/RecruitmentSetupWizard';
import { RecruitmentKanban } from '@/components/recruitment/RecruitmentKanban';
import { Loader2 } from 'lucide-react';

export default function ClubAdminRecruitment() {
  const navigate = useNavigate();
  const { clubId } = useParams<{ clubId: string }>();
  const { user, loading: authLoading } = useAuth();
  const { isOwnerOf, loading: ownershipLoading, ownedClubs } = useClubOwnership();
  const { 
    isEnabled, 
    hasStages, 
    stages, 
    applicants, 
    loading: recruitmentLoading,
    enableRecruitment,
    createStages,
    addApplicant,
    bulkAddApplicants,
    updateApplicantStage,
    deleteApplicant,
    refetch,
  } = useRecruitment(clubId);

  const [enabling, setEnabling] = useState(false);
  const [creatingStages, setCreatingStages] = useState(false);

  // Auth redirect
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login?redirect=/club-admin');
    }
  }, [user, authLoading, navigate]);

  // Permission check
  useEffect(() => {
    if (!authLoading && !ownershipLoading && user && clubId) {
      if (!isOwnerOf(clubId)) {
        navigate('/club-admin');
      }
    }
  }, [authLoading, ownershipLoading, user, clubId, isOwnerOf, navigate]);

  const clubName = ownedClubs.find(c => c.clubId === clubId)?.clubName || 'Club';

  const handleEnable = async () => {
    setEnabling(true);
    await enableRecruitment();
    setEnabling(false);
  };

  const handleSetupComplete = async (stageLabels: string[]) => {
    setCreatingStages(true);
    await createStages(stageLabels);
    setCreatingStages(false);
  };

  if (authLoading || ownershipLoading || recruitmentLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-gold animate-spin" />
      </div>
    );
  }

  if (!user || !clubId) return null;

  const renderContent = () => {
    if (!isEnabled) {
      return <RecruitmentIntro onEnable={handleEnable} loading={enabling} />;
    }

    if (!hasStages) {
      return <RecruitmentSetupWizard onComplete={handleSetupComplete} loading={creatingStages} />;
    }

    return (
      <RecruitmentKanban
        clubId={clubId}
        stages={stages}
        applicants={applicants}
        onMoveApplicant={updateApplicantStage}
        onAddApplicant={addApplicant}
        onBulkAddApplicants={bulkAddApplicants}
        onDeleteApplicant={deleteApplicant}
        onRefresh={async () => {
          await Promise.all([fetchSettings(), fetchStages(), fetchApplicants()]);
        }}
      />
    );
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <ClubAdminSidebar />

        <main className="flex-1 flex flex-col">
          <header className="h-16 border-b border-border flex items-center px-4 gap-4">
            <SidebarTrigger />
            <AdminBreadcrumb items={[
              { label: clubName, href: `/club-admin/clubs/${clubId}/events` },
              { label: 'Recruitment' }
            ]} />
          </header>

          <div className="flex-1 p-6 overflow-hidden">
            {renderContent()}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
