import { useState } from 'react';
import {
  DndContext, DragEndEvent, DragOverEvent, DragStartEvent, DragOverlay,
  closestCorners, PointerSensor, TouchSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDroppable } from '@dnd-kit/core';
import { Star, BarChart2 } from 'lucide-react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { BulkAIScreen } from '../BulkAIScreen';
import type { RecruitmentStage, Applicant } from '@/hooks/useRecruitment';

interface PipelineViewProps {
  clubId: string;
  clubName: string;
  stages: RecruitmentStage[];
  applicants: Applicant[];
  officerScoreMap: Record<string, number>;
  onMoveApplicant: (id: string, stageId: string, clubName?: string) => Promise<boolean>;
  onDeleteApplicant: (id: string) => Promise<boolean>;
  onOpenDrawer: (applicant: Applicant) => void;
  onRefresh: () => Promise<void>;
  onConfigureRubric: () => void;
}

function scoreColor(score: number): string {
  if (score >= 75) return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
  if (score >= 50) return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
  return 'text-red-400 bg-red-400/10 border-red-400/20';
}

function initials(first: string, last: string): string {
  return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase();
}

// ── Compact draggable card ──────────────────────────────────────────────────

interface CompactCardProps {
  applicant: Applicant;
  officerScore?: number;
  onClick: () => void;
}

function CompactCard({ applicant, officerScore, onClick }: CompactCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: applicant.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const isStandout = (applicant as any).is_standout;
  const fitScore = (applicant as any).fit_score as number | null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="group flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-white/6 bg-zinc-900 hover:border-gold/30 hover:bg-zinc-800/80 transition-all cursor-pointer select-none"
    >
      {/* Avatar */}
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
        isStandout ? 'bg-gold text-zinc-900' : 'bg-zinc-700 text-zinc-300'
      }`}>
        {initials(applicant.first_name, applicant.last_name)}
      </div>

      {/* Name + meta */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <p className="text-sm font-medium text-white truncate leading-tight">
            {applicant.first_name} {applicant.last_name}
          </p>
          {isStandout && <Star className="w-3 h-3 text-gold fill-gold shrink-0" />}
        </div>
        {(applicant.major || applicant.year) && (
          <p className="text-[11px] text-zinc-500 truncate leading-tight">
            {[applicant.major, applicant.year].filter(Boolean).join(' · ')}
          </p>
        )}
      </div>

      {/* Scores */}
      <div className="flex items-center gap-1.5 shrink-0">
        {fitScore !== null && fitScore !== undefined && (
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${scoreColor(fitScore)}`}>
            {fitScore}
          </span>
        )}
        {officerScore !== undefined && (
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded border text-zinc-400 bg-zinc-800 border-zinc-700">
            <BarChart2 className="w-2.5 h-2.5 inline mr-0.5" />{officerScore}
          </span>
        )}
      </div>
    </div>
  );
}

// Overlay card when dragging
function DragCard({ applicant }: { applicant: Applicant }) {
  return (
    <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-gold/40 bg-zinc-800 shadow-xl cursor-grabbing w-64">
      <div className="w-7 h-7 rounded-full bg-gold text-zinc-900 flex items-center justify-center text-[10px] font-bold shrink-0">
        {initials(applicant.first_name, applicant.last_name)}
      </div>
      <p className="text-sm font-medium text-white truncate">
        {applicant.first_name} {applicant.last_name}
      </p>
    </div>
  );
}

// ── Stage column ─────────────────────────────────────────────────────────────

interface StageColProps {
  stage: RecruitmentStage;
  applicants: Applicant[];
  officerScoreMap: Record<string, number>;
  onOpenDrawer: (a: Applicant) => void;
}

function StageCol({ stage, applicants, officerScoreMap, onOpenDrawer }: StageColProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col w-[270px] shrink-0 rounded-xl border transition-colors ${
        isOver ? 'border-gold/40 bg-gold/5' : 'border-white/8 bg-zinc-900/40'
      }`}
    >
      {/* Column header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/6">
        <span className="text-xs font-semibold text-zinc-300 truncate">{stage.label}</span>
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-white/8 text-zinc-500 shrink-0">
          {applicants.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex-1 p-2 space-y-1.5 min-h-[80px]">
        <SortableContext items={applicants.map(a => a.id)} strategy={verticalListSortingStrategy}>
          {applicants.map(applicant => (
            <CompactCard
              key={applicant.id}
              applicant={applicant}
              officerScore={officerScoreMap[applicant.id]}
              onClick={() => onOpenDrawer(applicant)}
            />
          ))}
        </SortableContext>
        {applicants.length === 0 && (
          <div className="h-12 flex items-center justify-center">
            <p className="text-[11px] text-zinc-700">Drop here</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Pipeline view ─────────────────────────────────────────────────────────────

export function PipelineView({
  clubId, clubName, stages, applicants, officerScoreMap,
  onMoveApplicant, onDeleteApplicant, onOpenDrawer, onRefresh, onConfigureRubric,
}: PipelineViewProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  const activeApplicant = activeId ? applicants.find(a => a.id === activeId) : null;

  const handleDragStart = (e: DragStartEvent) => setActiveId(e.active.id as string);

  const handleDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    setActiveId(null);
    if (!over) return;

    const applicantId = active.id as string;
    const overId = over.id as string;

    const targetStage = stages.find(s => s.id === overId);
    if (targetStage) {
      const applicant = applicants.find(a => a.id === applicantId);
      if (applicant && applicant.stage_id !== targetStage.id) {
        await onMoveApplicant(applicantId, targetStage.id, clubName);
      }
      return;
    }

    const targetApplicant = applicants.find(a => a.id === overId);
    if (targetApplicant?.stage_id) {
      const applicant = applicants.find(a => a.id === applicantId);
      if (applicant && applicant.stage_id !== targetApplicant.stage_id) {
        await onMoveApplicant(applicantId, targetApplicant.stage_id, clubName);
      }
    }
  };

  const handleDragOver = (_e: DragOverEvent) => {};

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 shrink-0">
        <p className="text-sm text-zinc-500 flex-1">
          {applicants.length} applicant{applicants.length !== 1 ? 's' : ''} across {stages.length} stage{stages.length !== 1 ? 's' : ''}
        </p>
        <BulkAIScreen
          clubId={clubId}
          stages={stages}
          applicants={applicants}
          onComplete={onRefresh}
          onConfigureRubric={onConfigureRubric}
        />
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[11px] text-zinc-600 shrink-0">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> AI score ≥75</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" /> 50–74</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> &lt;50</span>
        <span className="flex items-center gap-1"><Star className="w-3 h-3 text-gold fill-gold" /> Standout</span>
      </div>

      {/* Kanban board */}
      <ScrollArea className="flex-1 min-h-0">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
        >
          <div className="flex gap-3 pb-4 min-h-[400px]">
            {stages.map(stage => (
              <StageCol
                key={stage.id}
                stage={stage}
                applicants={applicants.filter(a => a.stage_id === stage.id)}
                officerScoreMap={officerScoreMap}
                onOpenDrawer={onOpenDrawer}
              />
            ))}
          </div>
          <DragOverlay>
            {activeApplicant && <DragCard applicant={activeApplicant} />}
          </DragOverlay>
        </DndContext>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
