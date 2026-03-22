import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { ApplicantCard } from './ApplicantCard';
import type { RecruitmentStage, Applicant } from '@/hooks/useRecruitment';

interface StageColumnProps {
  stage: RecruitmentStage;
  applicants: Applicant[];
  onDeleteApplicant: (id: string) => void;
  onOpenDrawer?: (applicant: Applicant) => void;
}

export function StageColumn({ stage, applicants, onDeleteApplicant, onOpenDrawer }: StageColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
  });

  return (
    <div className="flex flex-col w-72 shrink-0">
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="font-medium text-sm text-zinc-200">{stage.label}</h3>
        <span className="text-xs text-zinc-400 bg-white/10 px-2 py-0.5 rounded-full">
          {applicants.length}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className={`flex-1 min-h-[200px] p-2 rounded-lg border-2 border-dashed transition-colors ${
          isOver
            ? 'border-gold/50 bg-gold/5'
            : 'border-white/15 bg-white/5'
        }`}
      >
        <SortableContext 
          items={applicants.map(a => a.id)} 
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {applicants.map((applicant) => (
              <ApplicantCard
                key={applicant.id}
                applicant={applicant}
                onDelete={onDeleteApplicant}
                onOpen={onOpenDrawer}
              />
            ))}
            {applicants.length === 0 && (
              <div className="text-center py-8 text-sm text-zinc-600">
                Drop applicants here
              </div>
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  );
}
