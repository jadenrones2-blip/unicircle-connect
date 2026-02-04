import { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { StageColumn } from './StageColumn';
import { ApplicantCard } from './ApplicantCard';
import { AddApplicantDialog } from './AddApplicantDialog';
import type { RecruitmentStage, Applicant } from '@/hooks/useRecruitment';

interface RecruitmentKanbanProps {
  stages: RecruitmentStage[];
  applicants: Applicant[];
  onMoveApplicant: (applicantId: string, newStageId: string) => Promise<boolean>;
  onAddApplicant: (applicant: {
    first_name: string;
    last_name: string;
    email: string;
    major?: string;
    year?: string;
  }) => Promise<boolean>;
  onDeleteApplicant: (id: string) => Promise<boolean>;
}

export function RecruitmentKanban({
  stages,
  applicants,
  onMoveApplicant,
  onAddApplicant,
  onDeleteApplicant,
}: RecruitmentKanbanProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
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
        await onMoveApplicant(applicantId, targetStage.id);
      }
      return;
    }

    // Check if dropped on another applicant (get their stage)
    const targetApplicant = applicants.find(a => a.id === overId);
    if (targetApplicant && targetApplicant.stage_id) {
      const applicant = applicants.find(a => a.id === applicantId);
      if (applicant && applicant.stage_id !== targetApplicant.stage_id) {
        await onMoveApplicant(applicantId, targetApplicant.stage_id);
      }
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    // Could add preview logic here if needed
  };

  const getApplicantsForStage = (stageId: string) => {
    return applicants.filter(a => a.stage_id === stageId);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-display font-semibold text-foreground">
            Applicant Pipeline
          </h2>
          <p className="text-sm text-muted-foreground">
            Drag and drop applicants between stages
          </p>
        </div>
        <AddApplicantDialog onAdd={onAddApplicant} />
      </div>

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
    </div>
  );
}
