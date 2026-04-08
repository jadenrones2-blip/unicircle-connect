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
import { Loader2, Link2, Copy, FileText } from 'lucide-react';
import { toast } from 'sonner';

export default function ClubAdminRecruitment() {
  const navigate = useNavigate();
  const { clubId } = useParams<{ clubId: string }>();
  const { user, loading: authLoading } = useAuth();
  const { isOwnerOf, loading: ownershipLoading, ownedClubs } = useClubOwnership();
  const [enabling, setEnabling] = useState(false);
  const [creatingStages, setCreatingStages] = useState(false);
  const [jumpToForm, setJumpToForm] = useState(false);

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
  const applySlug = clubName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const applyUrl = `https://unicircle.app/apply/${applySlug}`;

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
      <div className="min-h-screen flex w-full overflow-hidden" style={{ background: '#0A0A0A' }}>
        <ClubAdminSidebar />
        <main className="flex-1 flex flex-col min-h-screen min-w-0 overflow-hidden">
          <header className="h-14 flex items-center px-4 gap-3 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <SidebarTrigger className="text-zinc-500 hover:text-white transition-colors" />
            <AdminBreadcrumb items={[
              { label: clubName, href: `/club-admin/clubs/${clubId}/events` },
              { label: 'Recruitment' }
            ]} />
          </header>

          <div className="flex-1 flex flex-col p-5 sm:p-7 min-h-0">
            {/* Apply link banner — shown once recruitment is live */}
            {isEnabled && hasStages && (
              <div className="mb-3 flex items-center gap-3 px-4 py-2.5 rounded-xl border border-white/8 bg-white/[0.02]">
                <Link2 className="w-4 h-4 text-gold flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-zinc-600 uppercase tracking-wide mb-0.5">Your Apply Link</p>
                  <span className="text-sm text-zinc-400 font-mono truncate block">{applyUrl}</span>
                </div>
                <button
                  onClick={() => { navigator.clipboard.writeText(applyUrl); toast.success('Apply link copied!'); }}
                  className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white border border-white/10 rounded-lg px-3 py-1.5 transition-colors flex-shrink-0"
                >
                  <Copy className="w-3 h-3" /> Copy
                </button>
              </div>
            )}

            {/* Form builder callout */}
            {isEnabled && hasStages && (
              <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-xl border border-gold/20 bg-gold/5">
                <FileText className="w-4 h-4 text-gold flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">Customize your application form</p>
                  <p className="text-xs text-zinc-500 mt-0.5">Add your own questions before sharing the apply link</p>
                </div>
                <button
                  onClick={() => setJumpToForm(true)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-gold border border-gold/30 rounded-lg px-3 py-1.5 hover:bg-gold/10 transition-colors flex-shrink-0"
                >
                  Build Form →
                </button>
              </div>
            )}

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
                jumpToForm={jumpToForm}
                onJumpToFormHandled={() => setJumpToForm(false)}
              />
            )}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
