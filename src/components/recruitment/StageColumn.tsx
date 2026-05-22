import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import {
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Loader2,
  Pencil,
  Trash2,
  Check,
  X,
} from 'lucide-react';
import { ApplicantCard } from './ApplicantCard';
import type { RecruitmentStage, Applicant } from '@/hooks/useRecruitment';
import { getStageColor } from '@/lib/stageColors';
import { Badge } from '@/components/ui/badge.tsx';

interface AttendanceEvent {
  id: string;
  title: string;
  rsvpEmails: Set<string>;
}

interface StageColumnProps {
  stage: RecruitmentStage;
  applicants: Applicant[];
  allStages?: RecruitmentStage[];
  officerScoreMap?: Record<string, number>;
  nextStageId?: string;
  nextStageLabel?: string;
  isIntake?: boolean;
  attendanceEvents?: AttendanceEvent[];
  onDeleteApplicant: (id: string) => void;
  onOpenDrawer?: (applicant: Applicant) => void;
  onAdvanceRound?: (applicantIds: string[], nextStageId: string) => Promise<void>;
  onMoveApplicant?: (applicantId: string, stageId: string) => void;
  onRenameStage?: (stageId: string, label: string) => Promise<boolean>;
  onDeleteStage?: (stageId: string) => Promise<boolean>;
  editingStageId?: string | null;
  editingStageLabel?: string;
  setEditingStageId?: (id: string | null) => void;
  setEditingStageLabel?: (label: string) => void;
  selectedApplicants: string[];
  onToggleSelect: (id: string) => void;
}

export function StageColumn({
  stage,
  applicants,
  allStages,
  officerScoreMap,
  nextStageId,
  nextStageLabel,
  isIntake,
  attendanceEvents,
  onDeleteApplicant,
  onOpenDrawer,
  onAdvanceRound,
  onMoveApplicant,
  onRenameStage,
  onDeleteStage,
  editingStageId,
  editingStageLabel,
  setEditingStageId,
  setEditingStageLabel,
  selectedApplicants,
  onToggleSelect,
}: StageColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
  });

  const [advancing, setAdvancing] = useState(false);
  const [attendanceOpen, setAttendanceOpen] = useState(false);

  const stageColor = getStageColor(stage, allStages ?? [stage]);

  const acceptedApplicants = applicants.filter((a) => a.final_decision === 'accepted');
  const canAdvance = !!nextStageId && acceptedApplicants.length > 0 && !!onAdvanceRound;

  // Sort: screened applicants by score desc, unscreened at the bottom
  const sortedApplicants = [...applicants].sort((a, b) => {
    if (a.fit_score !== null && b.fit_score !== null) return b.fit_score - a.fit_score;
    if (a.fit_score !== null) return -1;
    if (b.fit_score !== null) return 1;
    return 0;
  });

  const handleAdvance = async () => {
    if (!canAdvance || !nextStageId) return;
    setAdvancing(true);
    await onAdvanceRound!(
      acceptedApplicants.map((a) => a.id),
      nextStageId
    );
    setAdvancing(false);
  };

  return (
    <div className={`flex flex-col w-72 shrink-0 ${isIntake ? 'border-blue-500 pl-2' : ''}`}>
      <div className="flex items-center justify-between mb-3 px-1 group">
        {editingStageId === stage.id ? (
          <div className="flex items-center gap-1 flex-1 mr-2">
            <input
              autoFocus
              value={editingStageLabel}
              onChange={(e) => setEditingStageLabel?.(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onRenameStage?.(stage.id, editingStageLabel || '');
                  setEditingStageId?.(null);
                }
                if (e.key === 'Escape') setEditingStageId?.(null);
              }}
              className="flex-1 text-sm font-medium bg-zinc-800 border border-gold/40 rounded px-2 py-0.5 text-white outline-none"
            />
            <button
              onClick={() => {
                onRenameStage?.(stage.id, editingStageLabel || '');
                setEditingStageId?.(null);
              }}
              className="text-green-400 hover:text-green-300"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setEditingStageId?.(null)}
              className="text-zinc-500 hover:text-zinc-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 flex-1 mr-2">
            <span style={{ background: stageColor }} className="w-2 h-2 rounded-full shrink-0" />
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-sm text-zinc-200">{stage.label}</h3>
              {isIntake && (
                <Badge variant="outline" className="bg-blue-500/20 text-blue-400">
                  Applied
                </Badge>
              )}
            </div>
            {onRenameStage && (
              <button
                onClick={() => {
                  setEditingStageId?.(stage.id);
                  setEditingStageLabel?.(stage.label);
                }}
                className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-zinc-300 transition-opacity"
              >
                <Pencil className="w-3 h-3" />
              </button>
            )}
            {onDeleteStage && (
              <button
                onClick={() => onDeleteStage(stage.id)}
                className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-opacity"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
        <div className="flex items-center gap-2">
          {nextStageId && (
            <button
              onClick={handleAdvance}
              disabled={!canAdvance || advancing}
              title={
                canAdvance
                  ? `Move ${acceptedApplicants.length} accepted → ${nextStageLabel}`
                  : 'Mark applicants as Accepted in the drawer first'
              }
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
          isOver ? 'border-gold/50 bg-gold/5' : 'border-white/15 bg-white/5'
        }`}
      >
        <SortableContext
          items={sortedApplicants.map((a) => a.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {sortedApplicants.map((applicant) => (
              <ApplicantCard
                key={applicant.id}
                applicant={applicant}
                onDelete={onDeleteApplicant}
                onOpen={onOpenDrawer}
                stages={allStages}
                currentStageId={stage.id}
                onMove={onMoveApplicant}
                officerScore={officerScoreMap?.[applicant.id] ?? null}
                isSelected={selectedApplicants.includes(applicant.id)}
                onSelect={onToggleSelect}
              />
            ))}
            {applicants.length === 0 && (
              <div className="text-center py-8 text-sm text-zinc-600">
                {isIntake ? 'Applications will appear here' : 'Drop applicants here'}
              </div>
            )}
          </div>
        </SortableContext>
      </div>

      {attendanceEvents && attendanceEvents.length > 0 && (
        <div className="mt-2 rounded-lg border border-white/10 bg-zinc-900/40 overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-3 py-2 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
            onClick={() => setAttendanceOpen((o) => !o)}
          >
            <span className="font-medium">Attendance</span>
            {attendanceOpen ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
          {attendanceOpen && (
            <div className="border-t border-white/10 px-3 py-2 space-y-2">
              {attendanceEvents.map((ev) => {
                const attended = applicants.filter((a) => ev.rsvpEmails.has(a.email));
                return (
                  <div key={ev.id}>
                    <p className="text-xs text-zinc-500 mb-1 truncate">
                      <span className="font-medium text-zinc-300">
                        {attended.length}/{applicants.length}
                      </span>{' '}
                      attended <span className="italic">{ev.title}</span>
                    </p>
                    <div className="space-y-0.5">
                      {applicants.map((a) => (
                        <div key={a.id} className="flex items-center gap-1.5 text-xs">
                          {ev.rsvpEmails.has(a.email) ? (
                            <span className="text-green-400">✓</span>
                          ) : (
                            <span className="text-zinc-600">—</span>
                          )}
                          <span
                            className={
                              ev.rsvpEmails.has(a.email) ? 'text-zinc-300' : 'text-zinc-600'
                            }
                          >
                            {a.first_name} {a.last_name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
