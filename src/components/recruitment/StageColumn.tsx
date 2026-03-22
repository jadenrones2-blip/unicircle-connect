import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { ChevronRight, Loader2 } from 'lucide-react';
import { ApplicantCard } from './ApplicantCard';
import type { RecruitmentStage, Applicant } from '@/hooks/useRecruitment';

interface StageColumnProps {
  stage: RecruitmentStage;
  applicants: Applicant[];
  nextStageId?: string;
  nextStageLabel?: string;
  onDeleteApplicant: (id: string) => void;
  onOpenDrawer?: (applicant: Applicant) => void;
  onAdvanceRound?: (applicantIds: string[], nextStageId: string) => Promise<void>;
}

export function StageColumn({ stage, applicants, nextStageId, nextStageLabel, onDeleteApplicant, onOpenDrawer, onAdvanceRound }: StageColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
  });

  const [advancing, setAdvancing] = useState(false);

  const acceptedApplicants = applicants.filter(a => a.final_decision === 'accepted');
  const canAdvance = !!nextStageId && acceptedApplicants.length > 0 && !!onAdvanceRound;

  const handleAdvance = async () => {
    if (!canAdvance || !nextStageId) return;
    setAdvancing(true);
    await onAdvanceRound!(acceptedApplicants.map(a => a.id), nextStageId);
    setAdvancing(false);
  };

  return (
    <div className="flex flex-col w-72 shrink-0">
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="font-medium text-sm text-zinc-200">{stage.label}</h3>
        <div className="flex items-center gap-2">
          {nextStageId && (
            <button
              onClick={handleAdvance}
              disabled={!canAdvance || advancing}
              title={canAdvance ? `Move ${acceptedApplicants.length} accepted → ${nextStageLabel}` : 'Mark applicants as Accepted in the drawer first'}
              className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full transition-colors ${
                canAdvance
                  ? 'bg-gold/20 text-gold hover:bg-gold/30 cursor-pointer'
                  : 'bg-white/5 text-zinc-600 cursor-not-allowed'
              }`}
            >
              {advancing ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <>
                  {canAdvance && <span>{acceptedApplicants.length}</span>}
                  <ChevronRight className="w-3 h-3" />
                </>
              )}
            </button>
          )}
          <span className="text-xs text-zinc-400 bg-white/10 px-2 py-0.5 rounded-full">
            {applicants.length}
          </span>
        </div>
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
