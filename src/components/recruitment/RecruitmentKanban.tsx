import { useState, useEffect } from 'react';
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
import { Settings2, LayoutGrid, Table, FileText } from 'lucide-react';
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
import { FormBuilder } from './FormBuilder';
import { ApplicantDetailDrawer } from './ApplicantDetailDrawer';
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
}: RecruitmentKanbanProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

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

  const [activeView, setActiveView] = useState<'kanban' | 'table' | 'settings' | 'form'>('kanban');

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-display font-semibold text-foreground">
            Applicant Pipeline
          </h2>
          <p className="text-sm text-muted-foreground">
            {activeView === 'kanban' && 'Drag and drop applicants between stages'}
            {activeView === 'table' && 'View and manage all applicants'}
            {activeView === 'settings' && 'Configure screening requirements'}
            {activeView === 'form' && 'Build the application form students fill out'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(activeView === 'kanban' || activeView === 'table') && (
            <>
              <StudentVisibilitySettings
                clubId={clubId}
                settings={settings}
                onUpdate={onRefresh}
              />
              <CSVDataMapper onImport={onBulkAddApplicants} />
              <AddApplicantDialog onAdd={onAddApplicant} />
            </>
          )}
          <div className="flex border rounded-md">
            <Button
              variant={activeView === 'kanban' ? 'secondary' : 'ghost'}
              size="sm"
              className="rounded-r-none"
              onClick={() => setActiveView('kanban')}
              title="Kanban Board"
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button
              variant={activeView === 'table' ? 'secondary' : 'ghost'}
              size="sm"
              className="rounded-none border-x"
              onClick={() => setActiveView('table')}
              title="Table View"
            >
              <Table className="w-4 h-4" />
            </Button>
            <Button
              variant={activeView === 'form' ? 'secondary' : 'ghost'}
              size="sm"
              className="rounded-none border-r"
              onClick={() => setActiveView('form')}
              title="Application Form"
            >
              <FileText className="w-4 h-4" />
            </Button>
            <Button
              variant={activeView === 'settings' ? 'secondary' : 'ghost'}
              size="sm"
              className="rounded-l-none"
              onClick={() => setActiveView('settings')}
              title="Screening Settings"
            >
              <Settings2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
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
              {stages.map((stage) => (
                <StageColumn
                  key={stage.id}
                  stage={stage}
                  applicants={getApplicantsForStage(stage.id)}
                  onDeleteApplicant={onDeleteApplicant}
                  onOpenDrawer={openDrawer}
                />
              ))}
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

      {activeView === 'form' && (
        <div className="max-w-2xl">
          <FormBuilder clubId={clubId} fetchForm={fetchForm} saveForm={saveForm} />
        </div>
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
