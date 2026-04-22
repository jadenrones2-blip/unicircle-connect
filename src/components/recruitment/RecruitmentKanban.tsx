import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { dataClient } from '@/integrations/supabase/dataClient';
import { getStageColor } from '@/lib/stageColors';
import { useAuth } from '@/hooks/useAuth';
import { useRecruitmentRequirements } from '@/hooks/useRecruitmentRequirements';
import { calcWeightedScore } from '@/hooks/useRubricScoring';
import { toast } from 'sonner';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  closestCorners,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { Settings2, LayoutGrid, Table, FileText, Download, Mail, Users, Pencil, Plus, Trash2, Check, X, BarChart2, FileDown } from 'lucide-react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StageColumn } from './StageColumn';
import { ApplicantCard } from './ApplicantCard';
import { AddApplicantDialog } from './AddApplicantDialog';
import { CSVDataMapper } from './CSVDataMapper';
import { ApplicantTableView } from './ApplicantTableView';
import { RequirementsBuilder } from './RequirementsBuilder';
import { StudentVisibilitySettings } from './StudentVisibilitySettings';
import { BulkAIScreen } from './BulkAIScreen';
import { FormBuilder } from './FormBuilder';
import { MessageComposer } from './MessageComposer';
import { ApplicantDetailDrawer } from './ApplicantDetailDrawer';
import { ApplicantRosterView } from './ApplicantRosterView';
import type { RecruitmentStage, Applicant, RecruitmentSettings, FormQuestion } from '@/hooks/useRecruitment';

interface RecruitmentKanbanProps {
  clubId: string;
  clubName: string;
  stages: RecruitmentStage[];
  applicants: Applicant[];
  settings: RecruitmentSettings | null;
  onMoveApplicant: (applicantId: string, newStageId: string, clubName?: string) => Promise<boolean>;
  onAddApplicant: (applicant: {
    first_name: string;
    last_name: string;
    email: string;
    major?: string;
    year?: string;
  }) => Promise<boolean>;
  onBulkAddApplicants: (applicants: {
    first_name: string;
    last_name: string;
    email: string;
    major?: string;
    year?: string;
    gpa?: number;
    metadata?: Record<string, string>;
  }[]) => Promise<{ success: number; failed: number }>;
  onDeleteApplicant: (id: string) => Promise<boolean>;
  onUpdateStage: (stageId: string, label: string) => Promise<boolean>;
  onAddStage: (label: string) => Promise<boolean>;
  onDeleteStage: (stageId: string) => Promise<boolean>;
  onRefresh: () => Promise<void>;
  fetchForm: () => Promise<FormQuestion[]>;
  saveForm: (questions: FormQuestion[]) => Promise<boolean>;
  onUpdateFinalDecision: (id: string, decision: string) => Promise<boolean>;
  onUpdateNotes: (id: string, notes: string) => Promise<boolean>;
  jumpToForm?: boolean;
  onJumpToFormHandled?: () => void;
}

export function RecruitmentKanban({
  clubId,
  clubName,
  stages,
  applicants,
  settings,
  onMoveApplicant,
  onAddApplicant,
  onBulkAddApplicants,
  onDeleteApplicant,
  onUpdateStage,
  onAddStage,
  onDeleteStage,
  onRefresh,
  fetchForm,
  saveForm,
  onUpdateFinalDecision,
  onUpdateNotes,
  jumpToForm,
  onJumpToFormHandled,
}: RecruitmentKanbanProps) {
  const { user } = useAuth();
  const { aiCriteria } = useRecruitmentRequirements(clubId);
  const [officerScoreMap, setOfficerScoreMap] = useState<Record<string, number>>({});

  const [voteMap, setVoteMap] = useState<Record<string, { yes: number; no: number; maybe: number }>>({});
  const [attendanceMap, setAttendanceMap] = useState<Record<string, { id: string; title: string; rsvpEmails: Set<string> }[]>>({});

  const refreshVoteMap = useCallback(async () => {
    if (applicants.length === 0) return;
    const ids = applicants.map(a => a.id);
    try {
      const { data } = await (supabase as any)
        .from('deliberation_votes')
        .select('applicant_id, vote')
        .in('applicant_id', ids);
      if (!data) return;
      const map: Record<string, { yes: number; no: number; maybe: number }> = {};
      for (const row of data) {
        if (!map[row.applicant_id]) map[row.applicant_id] = { yes: 0, no: 0, maybe: 0 };
        if (row.vote === 'yes') map[row.applicant_id].yes++;
        else if (row.vote === 'no') map[row.applicant_id].no++;
        else if (row.vote === 'maybe') map[row.applicant_id].maybe++;
      }
      setVoteMap(map);
    } catch {
      // deliberation_votes might not exist — fail silently
    }
  }, [applicants]);

  useEffect(() => {
    refreshVoteMap();
  }, [refreshVoteMap]);

  const fetchAttendanceData = useCallback(async () => {
    if (!clubId) return;
    try {
      const { data: eventRows } = await (dataClient as any)
        .from('events')
        .select('id,title,corrected_title,recruitment_stage_id')
        .eq('club_handle', clubId)
        .eq('is_recruitment_event', true);

      if (!eventRows || eventRows.length === 0) return;

      const eventsByStage: Record<string, { id: string; title: string }[]> = {};
      for (const ev of eventRows) {
        const stageId = ev.recruitment_stage_id as string | null;
        if (!stageId) continue;
        if (!eventsByStage[stageId]) eventsByStage[stageId] = [];
        eventsByStage[stageId].push({ id: ev.id, title: ev.corrected_title || ev.title || 'Event' });
      }

      const allEventIds = eventRows.map((e: { id: string }) => e.id);
      const { data: rsvpRows } = await (supabase as any)
        .from('event_rsvps')
        .select('event_id,user_id')
        .in('event_id', allEventIds);

      if (!rsvpRows || rsvpRows.length === 0) {
        // No RSVPs yet — still build the map with empty sets
        const result: Record<string, { id: string; title: string; rsvpEmails: Set<string> }[]> = {};
        for (const [stageId, evs] of Object.entries(eventsByStage)) {
          result[stageId] = evs.map((ev) => ({ ...ev, rsvpEmails: new Set<string>() }));
        }
        setAttendanceMap(result);
        return;
      }

      const rsvpByEvent: Record<string, string[]> = {};
      for (const row of rsvpRows) {
        if (!rsvpByEvent[row.event_id]) rsvpByEvent[row.event_id] = [];
        rsvpByEvent[row.event_id].push(row.user_id);
      }

      const uniqueUserIds = [...new Set(rsvpRows.map((r: { user_id: string }) => r.user_id))];
      const { data: profileRows } = await (supabase as any)
        .from('profiles')
        .select('user_id,email')
        .in('user_id', uniqueUserIds);

      const userIdToEmail: Record<string, string> = {};
      for (const p of (profileRows || [])) {
        userIdToEmail[p.user_id] = p.email;
      }

      const result: Record<string, { id: string; title: string; rsvpEmails: Set<string> }[]> = {};
      for (const [stageId, evs] of Object.entries(eventsByStage)) {
        result[stageId] = evs.map((ev) => {
          const userIds = rsvpByEvent[ev.id] ?? [];
          const rsvpEmails = new Set(userIds.map((uid) => userIdToEmail[uid]).filter(Boolean) as string[]);
          return { ...ev, rsvpEmails };
        });
      }
      setAttendanceMap(result);
    } catch {
      // fail silently — attendance is non-critical
    }
  }, [clubId]);

  useEffect(() => {
    fetchAttendanceData();
  }, [fetchAttendanceData]);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [editingStageLabel, setEditingStageLabel] = useState('');
  const [addingStage, setAddingStage] = useState(false);
  const [newStageLabel, setNewStageLabel] = useState('');

  // Fetch officer's own rubric scores for all applicants and compute weighted totals
  const refreshOfficerScores = useCallback(async () => {
    if (!user || applicants.length === 0 || aiCriteria.length === 0) return;
    const ids = applicants.map(a => a.id);
    const { data } = await (supabase as any)
      .from('officer_rubric_scores')
      .select('applicant_id, requirement_id, score')
      .eq('officer_id', user.id)
      .in('applicant_id', ids);

    if (!data) return;

    // Group rows by applicant_id into the CriterionScore shape calcWeightedScore expects
    const byApplicant: Record<string, Record<string, { requirementId: string; score: number; note: string }>> = {};
    for (const row of data) {
      if (!byApplicant[row.applicant_id]) byApplicant[row.applicant_id] = {};
      byApplicant[row.applicant_id][row.requirement_id] = {
        requirementId: row.requirement_id,
        score: row.score,
        note: '',
      };
    }

    const map: Record<string, number> = {};
    for (const [appId, scores] of Object.entries(byApplicant)) {
      const ws = calcWeightedScore(scores, aiCriteria);
      if (ws !== null) map[appId] = ws;
    }
    setOfficerScoreMap(map);
  }, [user, applicants, aiCriteria]);

  useEffect(() => {
    refreshOfficerScores();
  }, [refreshOfficerScores]);

  const handleRenameStage = async (stageId: string) => {
    if (!editingStageLabel.trim()) return;
    await onUpdateStage(stageId, editingStageLabel.trim());
    setEditingStageId(null);
  };

  const handleAddStage = async () => {
    if (!newStageLabel.trim()) return;
    await onAddStage(newStageLabel.trim());
    setNewStageLabel('');
    setAddingStage(false);
  };

  const exportCSV = () => {
    const getStageName = (stageId: string | null) =>
      stages.find(s => s.id === stageId)?.label ?? 'Unknown';

    const rows = [
      ['Name', 'Email', 'Major', 'Year', 'Stage', 'Final Decision', 'AI Score', 'Notes', 'Applied At'],
      ...applicants.map(a => [
        `${a.first_name} ${a.last_name}`,
        a.email,
        a.major ?? '',
        a.year ?? '',
        getStageName(a.stage_id),
        (a as any).final_decision ?? '',
        (a as any).ai_score ?? '',
        (a as any).notes ?? '',
        new Date(a.created_at).toLocaleDateString(),
      ]),
    ];

    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${clubName.replace(/\s+/g, '_')}_applicants.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${applicants.length} applicants`);
  };

  const exportScorecardPDF = async () => {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' });

    const sorted = [...applicants].sort((a, b) => (b.fit_score ?? -1) - (a.fit_score ?? -1));
    const getStageName = (id: string | null) => stages.find(s => s.id === id)?.label ?? '—';

    // Header
    doc.setFontSize(18);
    doc.setTextColor(30, 30, 30);
    doc.text(`${clubName} — Applicant Scorecard`, 40, 44);
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} · ${sorted.length} applicant${sorted.length !== 1 ? 's' : ''}`, 40, 60);

    autoTable(doc, {
      startY: 76,
      head: [['#', 'Name', 'Major / Year', 'Stage', 'AI Score', 'Officer Score', 'Votes', 'Decision']],
      body: sorted.map((a, i) => {
        const votes = voteMap[a.id] ?? { yes: 0, no: 0, maybe: 0 };
        const voteStr = [
          votes.yes   > 0 ? `${votes.yes} Yes`   : '',
          votes.no    > 0 ? `${votes.no} No`      : '',
          votes.maybe > 0 ? `${votes.maybe} Maybe` : '',
        ].filter(Boolean).join('  ') || '—';
        const decision = (a as any).final_decision ?? 'pending';
        return [
          i + 1,
          `${a.first_name} ${a.last_name}`,
          [a.major, a.year].filter(Boolean).join(' · ') || '—',
          getStageName(a.stage_id),
          a.fit_score !== null && a.fit_score !== undefined ? a.fit_score : '—',
          officerScoreMap[a.id] !== undefined ? officerScoreMap[a.id] : '—',
          voteStr,
          decision === 'pending' ? '—' : decision.charAt(0).toUpperCase() + decision.slice(1),
        ];
      }),
      styles: { fontSize: 9, cellPadding: 6, textColor: [30, 30, 30] },
      headStyles: { fillColor: [24, 24, 27], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 248, 250] },
      columnStyles: {
        0: { halign: 'center', cellWidth: 28 },
        4: { halign: 'center' },
        5: { halign: 'center' },
        6: { halign: 'center' },
        7: { halign: 'center' },
      },
    });

    doc.save(`${clubName.replace(/\s+/g, '_')}_scorecard.pdf`);
    toast.success('Scorecard exported as PDF');
  };

  // Applicant detail drawer
  const [drawerApplicant, setDrawerApplicant] = useState<Applicant | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [formQuestions, setFormQuestions] = useState<FormQuestion[]>([]);

  // Load form questions once (for drawer to display responses with labels)
  useEffect(() => {
    fetchForm().then(setFormQuestions).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId]);

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

  const handleRunAISingleApplicant = async (applicantId: string) => {
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session) { toast.error('Please log in'); return; }
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-screen-applicants`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.session.access_token}`,
          },
          body: JSON.stringify({ club_id: clubId, applicant_ids: [applicantId] }),
        }
      );
      if (!response.ok) throw new Error('Screening failed');
      const result = await response.json();
      toast.success(`AI screening complete`);
      await onRefresh();
      // Update drawer applicant with fresh data
      const updated = applicants.find(a => a.id === applicantId);
      if (updated && result.results?.[0]) {
        setDrawerApplicant({ ...updated, ...result.results[0], id: updated.id });
      }
    } catch {
      toast.error('AI screening failed');
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    })
  );

  const activeApplicant = activeId 
    ? applicants.find(a => a.id === activeId) 
    : null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const applicantId = active.id as string;
    const overId = over.id as string;

    // Check if dropped on a stage column
    const targetStage = stages.find(s => s.id === overId);
    if (targetStage) {
      const applicant = applicants.find(a => a.id === applicantId);
      if (applicant && applicant.stage_id !== targetStage.id) {
        await onMoveApplicant(applicantId, targetStage.id, clubName);
      }
      return;
    }

    // Check if dropped on another applicant (get their stage)
    const targetApplicant = applicants.find(a => a.id === overId);
    if (targetApplicant && targetApplicant.stage_id) {
      const applicant = applicants.find(a => a.id === applicantId);
      if (applicant && applicant.stage_id !== targetApplicant.stage_id) {
        await onMoveApplicant(applicantId, targetApplicant.stage_id, clubName);
      }
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    // Could add preview logic here if needed
  };

  const getApplicantsForStage = (stageId: string) => {
    return applicants.filter(a => a.stage_id === stageId);
  };

  const handleAdvanceRound = async (applicantIds: string[], nextStageId: string) => {
    await Promise.all(applicantIds.map(id => onMoveApplicant(id, nextStageId, clubName)));
    await onRefresh();
  };

  const [activeView, setActiveView] = useState<'kanban' | 'scorecard' | 'table' | 'roster' | 'settings' | 'form' | 'messages'>(
    typeof window !== 'undefined' && window.innerWidth < 768 ? 'table' : 'kanban'
  );

  useEffect(() => {
    if (jumpToForm) {
      setActiveView('form');
      onJumpToFormHandled?.();
    }
  }, [jumpToForm]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex flex-col gap-3 mb-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-xl font-display font-semibold text-white">
              Applicant Pipeline
            </h2>
            <p className="text-sm text-zinc-500 hidden sm:block">
              {activeView === 'kanban' && 'Drag and drop applicants between stages'}
              {activeView === 'scorecard' && 'Full applicant scorecard sorted by AI fit score'}
              {activeView === 'table' && 'View and manage all applicants'}
              {activeView === 'roster' && 'Applicant roster with full names and demographics'}
              {activeView === 'settings' && 'Configure screening requirements'}
              {activeView === 'form' && 'Build the application form students fill out'}
              {activeView === 'messages' && 'Compose and send emails to applicants'}
            </p>
          </div>
          {/* View switcher — always visible */}
          <div className="flex border border-white/15 rounded-md shrink-0">
            {([
              { view: 'kanban',    icon: <LayoutGrid className="w-4 h-4" />,  title: 'Kanban Board' },
              { view: 'scorecard', icon: <BarChart2 className="w-4 h-4" />,   title: 'Scorecard' },
              { view: 'table',     icon: <Table className="w-4 h-4" />,       title: 'Table View' },
              { view: 'roster',    icon: <Users className="w-4 h-4" />,       title: 'Roster' },
              { view: 'form',      icon: <FileText className="w-4 h-4" />,    title: 'Application Form' },
              { view: 'messages',  icon: <Mail className="w-4 h-4" />,        title: 'Message Applicants' },
              { view: 'settings',  icon: <Settings2 className="w-4 h-4" />,  title: 'Screening Settings' },
            ] as const).map(({ view, icon, title }, i, arr) => (
              <button
                key={view}
                title={title}
                onClick={() => setActiveView(view)}
                className={`px-3 py-1.5 transition-colors ${
                  activeView === view
                    ? 'bg-white/10 text-white'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                } ${i === 0 ? 'rounded-l-md' : ''} ${i === arr.length - 1 ? 'rounded-r-md' : 'border-r border-white/15'}`}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>
        {/* Action buttons — wrap on mobile */}
        {(activeView === 'kanban' || activeView === 'scorecard' || activeView === 'table' || activeView === 'roster') && (
          <div className="flex flex-wrap items-center gap-2">
            <StudentVisibilitySettings
              clubId={clubId}
              settings={settings}
              onUpdate={onRefresh}
            />
            <BulkAIScreen
              clubId={clubId}
              stages={stages}
              applicants={applicants}
              onComplete={onRefresh}
              onConfigureRubric={() => setActiveView('settings')}
            />
            <CSVDataMapper onImport={onBulkAddApplicants} />
            <Button size="sm" variant="outline" onClick={exportCSV} className="gap-1.5 border-white/20 text-white hover:bg-white/10">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export CSV</span>
            </Button>
            {activeView === 'scorecard' && (
              <Button size="sm" variant="outline" onClick={exportScorecardPDF} className="gap-1.5 border-white/20 text-white hover:bg-white/10">
                <FileDown className="w-4 h-4" />
                <span className="hidden sm:inline">Export PDF</span>
              </Button>
            )}
            <AddApplicantDialog onAdd={onAddApplicant} />
          </div>
        )}
      </div>

      {activeView === 'kanban' && (
        <ScrollArea className="flex-1 -mx-6 px-6">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
          >
            <div className="flex gap-4 pb-4" style={{ minWidth: 'max-content' }}>
              {stages.map((stage, i) => {
                const nextStage = stages[i + 1];
                return (
                  <StageColumn
                    key={stage.id}
                    stage={stage}
                    applicants={getApplicantsForStage(stage.id)}
                    allStages={stages}
                    officerScoreMap={officerScoreMap}
                    nextStageId={nextStage?.id}
                    nextStageLabel={nextStage?.label}
                    isIntake={stage.is_intake}
                    attendanceEvents={attendanceMap[stage.id]}
                    onDeleteApplicant={onDeleteApplicant}
                    onOpenDrawer={openDrawer}
                    onAdvanceRound={handleAdvanceRound}
                    onMoveApplicant={(applicantId, stageId) => onMoveApplicant(applicantId, stageId, clubName)}
                    onRenameStage={onUpdateStage}
                    onDeleteStage={onDeleteStage}
                    editingStageId={editingStageId}
                    editingStageLabel={editingStageLabel}
                    setEditingStageId={setEditingStageId}
                    setEditingStageLabel={setEditingStageLabel}
                  />
                );
              })}

              {/* Add stage */}
              <div className="flex flex-col justify-start pt-1 w-48 shrink-0">
                {addingStage ? (
                  <div className="flex items-center gap-1">
                    <input
                      autoFocus
                      placeholder="Stage name"
                      value={newStageLabel}
                      onChange={e => setNewStageLabel(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleAddStage(); if (e.key === 'Escape') setAddingStage(false); }}
                      className="flex-1 text-xs bg-zinc-800 border border-gold/40 rounded px-2 py-1 text-white outline-none"
                    />
                    <button onClick={handleAddStage} className="text-green-400 hover:text-green-300"><Check className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setAddingStage(false)} className="text-zinc-500 hover:text-zinc-300"><X className="w-3.5 h-3.5" /></button>
                  </div>
                ) : (
                  <button
                    onClick={() => setAddingStage(true)}
                    className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-gold border border-dashed border-white/10 hover:border-gold/30 rounded-lg px-3 py-2 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Stage
                  </button>
                )}
              </div>
            </div>

            <DragOverlay>
              {activeApplicant && (
                <div className="rotate-3">
                  <ApplicantCard 
                    applicant={activeApplicant} 
                    onDelete={() => {}} 
                  />
                </div>
              )}
            </DragOverlay>
          </DndContext>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      )}

      {activeView === 'scorecard' && (() => {
        const stageColorMap = stages.reduce<Record<string, string>>((acc, s) => {
          acc[s.id] = getStageColor(s, stages);
          return acc;
        }, {});
        const sorted = [...applicants].sort((a, b) => (b.fit_score ?? -1) - (a.fit_score ?? -1));
        return (
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-zinc-900/60">
                  <th className="text-left py-3 px-3 text-xs text-zinc-500 font-medium w-8">#</th>
                  <th className="text-left py-3 px-3 text-xs text-zinc-500 font-medium">Applicant</th>
                  <th className="text-left py-3 px-3 text-xs text-zinc-500 font-medium">Stage</th>
                  <th className="text-right py-3 px-3 text-xs text-zinc-500 font-medium">AI Score</th>
                  <th className="text-right py-3 px-3 text-xs text-zinc-500 font-medium">Officer Score</th>
                  <th className="text-center py-3 px-3 text-xs text-zinc-500 font-medium">Votes</th>
                  <th className="text-left py-3 px-3 text-xs text-zinc-500 font-medium">Decision</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((applicant, i) => {
                  const votes = voteMap[applicant.id] ?? { yes: 0, no: 0, maybe: 0 };
                  const stage = stages.find(s => s.id === applicant.stage_id);
                  const stageColor = stageColorMap[applicant.stage_id ?? ''] ?? '#71717a';
                  const decision = (applicant as any).final_decision ?? 'pending';
                  const officerScore = officerScoreMap[applicant.id];
                  const hasVotes = votes.yes > 0 || votes.no > 0 || votes.maybe > 0;
                  return (
                    <tr
                      key={applicant.id}
                      onClick={() => openDrawer(applicant)}
                      className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors last:border-0"
                    >
                      <td className="py-2.5 px-3 text-zinc-600 text-xs">{i + 1}</td>
                      <td className="py-2.5 px-3">
                        <p className="font-medium text-white text-sm">{applicant.first_name} {applicant.last_name}</p>
                        {(applicant.major || applicant.year) && (
                          <p className="text-xs text-zinc-500 mt-0.5">{[applicant.major, applicant.year].filter(Boolean).join(' · ')}</p>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        {stage && (
                          <span
                            className="px-2 py-0.5 rounded-full text-xs font-medium"
                            style={{ background: `${stageColor}22`, color: stageColor }}
                          >
                            {stage.label}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {applicant.fit_score !== null && applicant.fit_score !== undefined ? (
                          <span className={`font-medium text-sm ${
                            applicant.fit_score >= 80 ? 'text-green-400' :
                            applicant.fit_score >= 60 ? 'text-gold' : 'text-zinc-400'
                          }`}>{applicant.fit_score}</span>
                        ) : <span className="text-zinc-700">—</span>}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {officerScore !== undefined ? (
                          <span className="text-gold font-medium text-sm">{officerScore}</span>
                        ) : <span className="text-zinc-700">—</span>}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {hasVotes ? (
                          <span className="flex items-center justify-center gap-1.5 text-xs">
                            {votes.yes > 0 && <span className="text-green-400">{votes.yes}✓</span>}
                            {votes.no > 0 && <span className="text-red-400">{votes.no}✗</span>}
                            {votes.maybe > 0 && <span className="text-zinc-400">{votes.maybe}?</span>}
                          </span>
                        ) : <span className="text-zinc-700">—</span>}
                      </td>
                      <td className="py-2.5 px-3">
                        {decision !== 'pending' && (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            decision === 'accepted' ? 'bg-green-500/10 text-green-400' :
                            decision === 'rejected' ? 'bg-red-500/10 text-red-400' :
                            'bg-gold/10 text-gold'
                          }`}>
                            {decision.charAt(0).toUpperCase() + decision.slice(1)}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {applicants.length === 0 && (
              <div className="text-center py-16 text-sm text-zinc-600">No applicants yet</div>
            )}
          </div>
        );
      })()}

      {activeView === 'table' && (
        <ApplicantTableView
          clubId={clubId}
          clubName={clubName}
          stages={stages}
          applicants={applicants}
          onMoveApplicant={onMoveApplicant}
          onDeleteApplicant={onDeleteApplicant}
          onRefresh={onRefresh}
          onOpenDrawer={openDrawer}
        />
      )}

      {activeView === 'roster' && (
        <ApplicantRosterView
          stages={stages}
          applicants={applicants}
          onOpenDrawer={openDrawer}
        />
      )}

      {activeView === 'form' && (
        <div className="max-w-2xl">
          <FormBuilder clubId={clubId} fetchForm={fetchForm} saveForm={saveForm} />
        </div>
      )}

      {activeView === 'messages' && (
        <MessageComposer clubId={clubId} clubName={clubName} stages={stages} applicants={applicants} />
      )}

      {activeView === 'settings' && (
        <div className="max-w-2xl">
          <RequirementsBuilder clubId={clubId} />
        </div>
      )}

      {/* Applicant detail drawer */}
      <ApplicantDetailDrawer
        applicant={drawerApplicant}
        open={drawerOpen}
        onClose={closeDrawer}
        clubId={clubId}
        stages={stages}
        formQuestions={formQuestions}
        onUpdateFinalDecision={onUpdateFinalDecision}
        onUpdateNotes={onUpdateNotes}
        onRunAIScreen={handleRunAISingleApplicant}
        onMoveApplicant={handleMoveFromDrawer}
      />
    </div>
  );
}
