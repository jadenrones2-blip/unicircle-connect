import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
import { Settings2, LayoutGrid, Table, FileText, Download, Mail, Users } from 'lucide-react';
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
  onRefresh,
  fetchForm,
  saveForm,
  onUpdateFinalDecision,
  onUpdateNotes,
  jumpToForm,
  onJumpToFormHandled,
}: RecruitmentKanbanProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

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

  const [activeView, setActiveView] = useState<'kanban' | 'table' | 'roster' | 'settings' | 'form' | 'messages'>(
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
              { view: 'kanban',   icon: <LayoutGrid className="w-4 h-4" />, title: 'Kanban Board' },
              { view: 'table',    icon: <Table className="w-4 h-4" />,      title: 'Table View' },
              { view: 'roster',   icon: <Users className="w-4 h-4" />,      title: 'Roster' },
              { view: 'form',     icon: <FileText className="w-4 h-4" />,   title: 'Application Form' },
              { view: 'messages', icon: <Mail className="w-4 h-4" />,       title: 'Message Applicants' },
              { view: 'settings', icon: <Settings2 className="w-4 h-4" />, title: 'Screening Settings' },
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
        {(activeView === 'kanban' || activeView === 'table' || activeView === 'roster') && (
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
              <span className="hidden sm:inline">Export</span>
            </Button>
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
                    nextStageId={nextStage?.id}
                    nextStageLabel={nextStage?.label}
                    onDeleteApplicant={onDeleteApplicant}
                    onOpenDrawer={openDrawer}
                    onAdvanceRound={handleAdvanceRound}
                  />
                );
              })}
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
        onClose={() => setDrawerOpen(false)}
        clubId={clubId}
        formQuestions={formQuestions}
        onUpdateFinalDecision={onUpdateFinalDecision}
        onUpdateNotes={onUpdateNotes}
        onRunAIScreen={handleRunAISingleApplicant}
      />
    </div>
  );
}
