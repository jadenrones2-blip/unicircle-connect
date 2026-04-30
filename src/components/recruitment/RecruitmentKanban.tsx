import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { dataClient } from '@/integrations/supabase/dataClient';
import { useAuth } from '@/hooks/useAuth';
import { useRecruitmentRequirements } from '@/hooks/useRecruitmentRequirements';
import { calcWeightedScore } from '@/hooks/useRubricScoring';
import { LayoutGrid, Users, Star as StarIcon, FileText, Settings2, Mail, Download } from 'lucide-react';
import { toast } from 'sonner';
import { ApplicantDetailDrawer } from './ApplicantDetailDrawer';
import { FormBuilder } from './FormBuilder';
import { MessageComposer } from './MessageComposer';
import { PipelineView } from './views/PipelineView';
import { ApplicantsView } from './views/ApplicantsView';
import { ScoringView } from './views/ScoringView';
import { SettingsView } from './views/SettingsView';
import type { RecruitmentStage, Applicant, RecruitmentSettings, FormQuestion } from '@/hooks/useRecruitment';

// ── Props ─────────────────────────────────────────────────────────────────────

interface RecruitmentKanbanProps {
  clubId: string;
  clubName: string;
  stages: RecruitmentStage[];
  applicants: Applicant[];
  settings: RecruitmentSettings | null;
  onMoveApplicant: (applicantId: string, newStageId: string, clubName?: string) => Promise<boolean>;
  onBulkMoveApplicants: (ids: string[], stageId: string, clubName: string) => Promise<boolean>;
  onDeleteApplicant: (id: string) => Promise<boolean>;
  onUpdateStage: (stageId: string, label: string) => Promise<boolean>;
  onAddStage: (label: string) => Promise<boolean>;
  onDeleteStage: (stageId: string) => Promise<boolean>;
  onRefresh: () => Promise<void>;
  fetchForm: () => Promise<FormQuestion[]>;
  onUpdateFinalDecision: (id: string, decision: string) => Promise<boolean>;
  onUpdateNotes: (id: string, notes: string) => Promise<boolean>;
}

type View = 'pipeline' | 'applicants' | 'scoring' | 'form' | 'settings';

const NAV: { view: View; label: string; icon: React.ReactNode }[] = [
  { view: 'pipeline',   label: 'Pipeline',   icon: <LayoutGrid className="w-4 h-4" /> },
  { view: 'applicants', label: 'Applicants', icon: <Users className="w-4 h-4" /> },
  { view: 'scoring',    label: 'Scoring',    icon: <StarIcon className="w-4 h-4" /> },
  { view: 'form',       label: 'Form',       icon: <FileText className="w-4 h-4" /> },
  { view: 'settings',   label: 'Settings',   icon: <Settings2 className="w-4 h-4" /> },
];

export function RecruitmentKanban({
  clubId, clubName, stages, applicants, settings,
  onMoveApplicant, onBulkMoveApplicants, onDeleteApplicant,
  onUpdateStage, onAddStage, onDeleteStage,
  onRefresh, fetchForm,
  onUpdateFinalDecision, onUpdateNotes,
}: RecruitmentKanbanProps) {
  const { user } = useAuth();
  const { aiCriteria } = useRecruitmentRequirements(clubId);
  const [activeView, setActiveView] = useState<View>('pipeline');
  const [officerScoreMap, setOfficerScoreMap] = useState<Record<string, number>>({});
  const [voteMap, setVoteMap] = useState<Record<string, { yes: number; no: number; maybe: number }>>({});
  const [attendanceMap, setAttendanceMap] = useState<Record<string, { id: string; title: string; rsvpEmails: Set<string> }[]>>({});
  const [formQuestions, setFormQuestions] = useState<FormQuestion[]>([]);
  const [drawerApplicant, setDrawerApplicant] = useState<Applicant | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const applyUrl = `${window.location.origin}/clubs/${clubId}/apply`;

  // ── Data fetching ────────────────────────────────────────────────────────────

  const refreshVoteMap = useCallback(async () => {
    if (applicants.length === 0) return;
    const ids = applicants.map(a => a.id);
    try {
      const { data } = await (supabase as any)
        .from('deliberation_votes').select('applicant_id, vote').in('applicant_id', ids);
      if (!data) return;
      const map: Record<string, { yes: number; no: number; maybe: number }> = {};
      for (const row of data) {
        if (!map[row.applicant_id]) map[row.applicant_id] = { yes: 0, no: 0, maybe: 0 };
        if (row.vote === 'yes') map[row.applicant_id].yes++;
        else if (row.vote === 'no') map[row.applicant_id].no++;
        else if (row.vote === 'maybe') map[row.applicant_id].maybe++;
      }
      setVoteMap(map);
    } catch { /* deliberation_votes might not exist */ }
  }, [applicants]);

  useEffect(() => { refreshVoteMap(); }, [refreshVoteMap]);

  const fetchAttendanceData = useCallback(async () => {
    if (!clubId) return;
    try {
      const { data: eventRows } = await (dataClient as any)
        .from('events').select('id,title,corrected_title,recruitment_stage_id')
        .eq('club_handle', clubId).eq('is_recruitment_event', true);
      if (!eventRows || eventRows.length === 0) return;
      const eventsByStage: Record<string, { id: string; title: string }[]> = {};
      for (const ev of eventRows) {
        if (!ev.recruitment_stage_id) continue;
        if (!eventsByStage[ev.recruitment_stage_id]) eventsByStage[ev.recruitment_stage_id] = [];
        eventsByStage[ev.recruitment_stage_id].push({ id: ev.id, title: ev.corrected_title || ev.title || 'Event' });
      }
      const allIds = eventRows.map((e: any) => e.id);
      const { data: rsvpRows } = await (supabase as any)
        .from('event_rsvps').select('event_id,user_id').in('event_id', allIds);
      const result: Record<string, { id: string; title: string; rsvpEmails: Set<string> }[]> = {};
      for (const [stageId, evs] of Object.entries(eventsByStage)) {
        result[stageId] = evs.map(ev => {
          const uids = (rsvpRows || []).filter((r: any) => r.event_id === ev.id).map((r: any) => r.user_id);
          return { ...ev, rsvpEmails: new Set(uids) };
        });
      }
      setAttendanceMap(result);
    } catch { /* non-critical */ }
  }, [clubId]);

  useEffect(() => { fetchAttendanceData(); }, [fetchAttendanceData]);

  const refreshOfficerScores = useCallback(async () => {
    if (!user || applicants.length === 0 || aiCriteria.length === 0) return;
    const ids = applicants.map(a => a.id);
    const { data } = await (supabase as any)
      .from('officer_rubric_scores').select('applicant_id, requirement_id, score')
      .eq('officer_id', user.id).in('applicant_id', ids);
    if (!data) return;
    const byApplicant: Record<string, Record<string, any>> = {};
    for (const row of data) {
      if (!byApplicant[row.applicant_id]) byApplicant[row.applicant_id] = {};
      byApplicant[row.applicant_id][row.requirement_id] = { requirementId: row.requirement_id, score: row.score, note: '' };
    }
    const map: Record<string, number> = {};
    for (const [appId, scores] of Object.entries(byApplicant)) {
      const ws = calcWeightedScore(scores, aiCriteria);
      if (ws !== null) map[appId] = ws;
    }
    setOfficerScoreMap(map);
  }, [user, applicants, aiCriteria]);

  useEffect(() => { refreshOfficerScores(); }, [refreshOfficerScores]);

  useEffect(() => {
    fetchForm().then(setFormQuestions).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId]);

  // ── Drawer ───────────────────────────────────────────────────────────────────

  const openDrawer = (applicant: Applicant) => {
    setDrawerApplicant(applicant);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setTimeout(() => { refreshOfficerScores(); refreshVoteMap(); }, 300);
  };

  const handleMoveFromDrawer = async (applicantId: string, stageId: string): Promise<boolean> => {
    const ok = await onMoveApplicant(applicantId, stageId, clubName);
    if (ok) {
      setDrawerApplicant(prev => prev ? { ...prev, stage_id: stageId } : prev);
      await onRefresh();
    }
    return ok;
  };

  const handleRunAISingle = async (applicantId: string) => {
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session) { toast.error('Please log in'); return; }
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-screen-applicants`,
        { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.session.access_token}` },
          body: JSON.stringify({ club_id: clubId, applicant_ids: [applicantId] }) }
      );
      if (!res.ok) throw new Error();
      const result = await res.json();
      toast.success('AI screening complete');
      await onRefresh();
      const updated = applicants.find(a => a.id === applicantId);
      if (updated && result.results?.[0]) setDrawerApplicant({ ...updated, ...result.results[0], id: updated.id });
    } catch { toast.error('AI screening failed'); }
  };

  // ── Export CSV ───────────────────────────────────────────────────────────────

  const exportCSV = () => {
    const getStageName = (id: string | null) => stages.find(s => s.id === id)?.label ?? 'Unknown';
    const rows = [
      ['Name', 'Email', 'Major', 'Year', 'Stage', 'Final Decision', 'AI Score', 'Notes', 'Applied At'],
      ...applicants.map(a => [
        `${a.first_name} ${a.last_name}`, a.email, a.major ?? '', a.year ?? '',
        getStageName(a.stage_id), (a as any).final_decision ?? '', (a as any).fit_score ?? '',
        (a as any).notes ?? '', new Date(a.created_at).toLocaleDateString(),
      ]),
    ];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${clubName.replace(/\s+/g, '_')}_applicants.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${applicants.length} applicants`);
  };

  // ── Bulk move wrapper ────────────────────────────────────────────────────────

  const handleBulkMove = async (ids: string[], stageId: string) => {
    await onBulkMoveApplicants(ids, stageId, clubName);
    await onRefresh();
  };

  // ── Scoring badge count ──────────────────────────────────────────────────────

  const myAssignedCount = useMemo(() =>
    applicants.filter(a => (a as any).assigned_to === user?.id).length,
  [applicants, user]);

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full gap-0">

      {/* ── Top nav ── */}
      <div className="flex items-center justify-between mb-5 shrink-0">
        <div className="flex items-center gap-1 border border-white/10 rounded-xl p-1 bg-zinc-900/60">
          {NAV.map(({ view, label, icon }) => (
            <button
              key={view}
              onClick={() => setActiveView(view)}
              className={`relative flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeView === view
                  ? 'bg-zinc-700 text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
              }`}
            >
              {icon}
              <span className="hidden sm:inline">{label}</span>
              {view === 'scoring' && myAssignedCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-gold text-zinc-900 text-[9px] font-bold flex items-center justify-center">
                  {myAssignedCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {(activeView === 'pipeline' || activeView === 'applicants') && (
            <button
              onClick={exportCSV}
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white border border-white/10 rounded-lg px-3 py-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Export
            </button>
          )}
        </div>
      </div>

      {/* ── Active view ── */}
      <div className="flex-1 min-h-0 overflow-hidden">

        {activeView === 'pipeline' && (
          <PipelineView
            clubId={clubId}
            clubName={clubName}
            stages={stages}
            applicants={applicants}
            officerScoreMap={officerScoreMap}
            onMoveApplicant={onMoveApplicant}
            onDeleteApplicant={onDeleteApplicant}
            onOpenDrawer={openDrawer}
            onRefresh={onRefresh}
            onConfigureRubric={() => setActiveView('settings')}
          />
        )}

        {activeView === 'applicants' && (
          <ApplicantsView
            stages={stages}
            applicants={applicants}
            onOpenDrawer={openDrawer}
            onDeleteApplicant={onDeleteApplicant}
            onBulkMove={handleBulkMove}
          />
        )}

        {activeView === 'scoring' && (
          <ScoringView
            clubId={clubId}
            stages={stages}
            applicants={applicants}
            onOpenDrawer={openDrawer}
            onRefresh={onRefresh}
          />
        )}

        {activeView === 'form' && (
          <div className="h-full overflow-y-auto">
            <FormBuilder clubId={clubId} />
          </div>
        )}

        {activeView === 'settings' && (
          <div className="h-full overflow-y-auto">
            <SettingsView
              clubId={clubId}
              clubName={clubName}
              applyUrl={applyUrl}
              stages={stages}
              settings={settings}
              onUpdateStage={onUpdateStage}
              onAddStage={onAddStage}
              onDeleteStage={onDeleteStage}
            />
          </div>
        )}

      </div>

      {/* ── Applicant detail drawer ── */}
      {drawerApplicant && (
        <ApplicantDetailDrawer
          open={drawerOpen}
          onClose={closeDrawer}
          applicant={drawerApplicant}
          stages={stages}
          clubId={clubId}
          // clubName={clubName} // not used in drawer, can be removed
          formQuestions={formQuestions}
          // voteData={voteMap[drawerApplicant.id]} // not used in drawer, can be removed
          // attendanceData={attendanceMap[drawerApplicant.stage_id ?? ''] ?? []} // not used in drawer, can be removed
          onMoveApplicant={handleMoveFromDrawer}
          onUpdateFinalDecision={onUpdateFinalDecision}
          onUpdateNotes={onUpdateNotes}
          onRunAIScreen={handleRunAISingle}
          // onDelete={async (id) => { await onDeleteApplicant(id); closeDrawer(); await onRefresh(); }} // not used in drawer, can be removed
        />
      )}

    </div>
  );
}
