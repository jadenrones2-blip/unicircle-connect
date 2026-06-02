import { useState } from 'react';
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
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDroppable } from '@dnd-kit/core';
import { Star, BarChart2, X, ChevronRight } from 'lucide-react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { BulkAIScreen } from '../BulkAIScreen';
import type { RecruitmentStage, Applicant } from '@/hooks/useRecruitment';

interface PipelineViewProps {
  clubId: string;
  clubName: string;
  stages: RecruitmentStage[];
  applicants: Applicant[];
  officerScoreMap: Record<string, number>;
  voteMap: Record<string, { yes: number; no: number; maybe: number }>;
  onMoveApplicant: (id: string, stageId: string, clubName?: string) => Promise<boolean>;
  onDeleteApplicant: (id: string) => Promise<boolean>;
  onOpenDrawer: (applicant: Applicant) => void;
  onRefresh: () => Promise<void>;
  onConfigureRubric: () => void;
  onBulkMove: (ids: string[], stageId: string) => Promise<void>;
}

// Major abbreviations — longest match first to avoid partial shadowing
const MAJOR_ABBR: [string, string][] = [
  ['computer science and engineering', 'CS/E'],
  ['electrical and computer engineering', 'ECE'],
  ['mathematics-economics', 'Math-Econ'],
  ['management science', 'Mgmt Sci'],
  ['international studies', "Int'l Studies"],
  ['computer science', 'CS'],
  ['cognitive science', 'CogSci'],
  ['political science', 'PolSci'],
  ['electrical engineering', 'EE'],
  ['mechanical engineering', 'MechE'],
  ['aerospace engineering', 'AeroE'],
  ['structural engineering', 'StructE'],
  ['chemical engineering', 'ChemE'],
  ['bioengineering', 'BioE'],
  ['nano engineering', 'NanoE'],
  ['human development', 'Human Dev'],
  ['environmental studies', 'Enviro'],
  ['global health', 'Global Hlth'],
  ['public health', 'Pub Health'],
  ['visual arts', 'Visual Arts'],
  ['ethnic studies', 'Ethnic Std'],
  ['data science', 'Data Sci'],
  ['mathematics', 'Math'],
  ['biochemistry', 'BioChem'],
  ['psychology', 'Psych'],
  ['economics', 'Econ'],
  ['neuroscience', 'Neuro'],
  ['sociology', 'Sociol'],
  ['chemistry', 'Chem'],
  ['philosophy', 'Phil'],
  ['linguistics', 'Ling'],
  ['literature', 'Lit'],
  ['communication', 'Comm'],
  ['history', 'Hist'],
  ['physics', 'Phys'],
  ['biology', 'Bio'],
  ['business', 'Business'],
  ['theater', 'Theater'],
  ['music', 'Music'],
  ['art', 'Art'],
];

function abbreviateMajor(major: string | null | undefined): string {
  if (!major) return '';
  const lower = major.toLowerCase().trim();
  for (const [pattern, abbr] of MAJOR_ABBR) {
    if (lower.includes(pattern)) return abbr;
  }
  return major.length > 12 ? major.slice(0, 11) + '…' : major;
}

function abbreviateYear(year: string | null | undefined): string {
  if (!year) return '';
  const lower = year.toLowerCase().trim();
  if (lower === 'freshman' || lower.startsWith('1st') || lower.startsWith('first')) return '1st';
  if (lower === 'sophomore' || lower.startsWith('2nd') || lower.startsWith('second')) return '2nd';
  if (lower === 'junior' || lower.startsWith('3rd') || lower.startsWith('third')) return '3rd';
  if (lower === 'senior' || lower.startsWith('4th') || lower.startsWith('fourth')) return '4th';
  if (lower.includes('graduate') || lower.includes('grad')) return 'Grad';
  return year;
}

function scoreColor(score: number): string {
  if (score >= 75) return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
  if (score >= 50) return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
  return 'text-red-400 bg-red-400/10 border-red-400/20';
}

function initials(first: string, last: string): string {
  return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase();
}

// ── Compact draggable card ────────────────────────────────────────────────────

interface CompactCardProps {
  applicant: Applicant;
  officerScore?: number;
  vote?: { yes: number; no: number; maybe: number };
  isSelected: boolean;
  onSelect: (id: string) => void;
  onClick: () => void;
}

function CompactCard({
  applicant,
  officerScore,
  vote,
  isSelected,
  onSelect,
  onClick,
}: CompactCardProps) {
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
  const hasVotes = vote && (vote.yes > 0 || vote.no > 0 || vote.maybe > 0);

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      className={`group flex items-center gap-2.5 px-3 py-2.5 rounded-lg border bg-zinc-900 hover:border-gold/30 hover:bg-zinc-800/80 transition-all cursor-pointer select-none ${
        isSelected ? 'border-blue-500/50 bg-zinc-800/60' : 'border-white/6'
      }`}
    >
      {/* Checkbox — stop pointer so it doesn't bubble to card onClick */}
      <div
        className="shrink-0"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(applicant.id);
        }}
      >
        <Checkbox
          checked={isSelected}
          className="border-zinc-600 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
        />
      </div>

      {/* Avatar = drag handle only. Listeners here so the rest of the card
          responds to onClick normally instead of DnD intercepting clicks. */}
      <div
        {...attributes}
        {...listeners}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        title="Drag to move"
        className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 cursor-grab active:cursor-grabbing ${
          isStandout ? 'bg-gold text-zinc-900' : 'bg-zinc-700 text-zinc-300'
        }`}
      >
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
            {[abbreviateMajor(applicant.major), abbreviateYear(applicant.year)]
              .filter(Boolean)
              .join(' · ')}
          </p>
        )}
      </div>

      {/* Scores + vote tally + open indicator */}
      <div className="flex items-center gap-1.5 shrink-0">
        {fitScore !== null && fitScore !== undefined && (
          <span
            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${scoreColor(fitScore)}`}
          >
            {fitScore}
          </span>
        )}
        {officerScore !== undefined && (
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded border text-zinc-400 bg-zinc-800 border-zinc-700">
            <BarChart2 className="w-2.5 h-2.5 inline mr-0.5" />
            {officerScore}
          </span>
        )}
        {hasVotes && (
          <span className="flex items-center gap-0.5 text-[10px] font-bold">
            {vote!.yes > 0 && <span className="text-emerald-400">{vote!.yes}✓</span>}
            {vote!.no > 0 && <span className="text-red-400">{vote!.no}✗</span>}
            {vote!.maybe > 0 && <span className="text-yellow-400">{vote!.maybe}~</span>}
          </span>
        )}
        <ChevronRight className="w-3 h-3 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  );
}

// Overlay card shown while dragging
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

// ── Stage column ──────────────────────────────────────────────────────────────

interface StageColProps {
  stage: RecruitmentStage;
  applicants: Applicant[];
  officerScoreMap: Record<string, number>;
  voteMap: Record<string, { yes: number; no: number; maybe: number }>;
  selectedIds: Set<string>;
  onSelect: (id: string) => void;
  onSelectAll: (applicantIds: string[], select: boolean) => void;
  onOpenDrawer: (a: Applicant) => void;
}

function StageCol({
  stage,
  applicants,
  officerScoreMap,
  voteMap,
  selectedIds,
  onSelect,
  onSelectAll,
  onOpenDrawer,
}: StageColProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  const allSelected = applicants.length > 0 && applicants.every((a) => selectedIds.has(a.id));

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col w-[270px] shrink-0 rounded-xl border transition-colors ${
        isOver ? 'border-gold/40 bg-gold/5' : 'border-white/8 bg-zinc-900/40'
      }`}
    >
      {/* Column header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/6">
        {/* Select-all checkbox for this column */}
        <div
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onSelectAll(
              applicants.map((a) => a.id),
              !allSelected
            );
          }}
        >
          <Checkbox
            checked={allSelected}
            className="border-zinc-600 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
          />
        </div>
        <span className="text-xs font-semibold text-zinc-300 truncate flex-1">{stage.label}</span>
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-white/8 text-zinc-500 shrink-0">
          {applicants.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex-1 p-2 space-y-1.5 min-h-[80px]">
        <SortableContext items={applicants.map((a) => a.id)} strategy={verticalListSortingStrategy}>
          {applicants.map((applicant) => (
            <CompactCard
              key={applicant.id}
              applicant={applicant}
              officerScore={officerScoreMap[applicant.id]}
              vote={voteMap[applicant.id]}
              isSelected={selectedIds.has(applicant.id)}
              onSelect={onSelect}
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
  clubId,
  clubName,
  stages,
  applicants,
  officerScoreMap,
  voteMap,
  onMoveApplicant,
  onDeleteApplicant,
  onOpenDrawer,
  onRefresh,
  onConfigureRubric,
  onBulkMove,
}: PipelineViewProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkMoving, setBulkMoving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  );

  const activeApplicant = activeId ? applicants.find((a) => a.id === activeId) : null;

  const handleDragStart = (e: DragStartEvent) => setActiveId(e.active.id as string);

  const handleDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    setActiveId(null);
    if (!over) return;
    const applicantId = active.id as string;
    const overId = over.id as string;
    const targetStage = stages.find((s) => s.id === overId);
    if (targetStage) {
      const applicant = applicants.find((a) => a.id === applicantId);
      if (applicant && applicant.stage_id !== targetStage.id) {
        await onMoveApplicant(applicantId, targetStage.id, clubName);
      }
      return;
    }
    const targetApplicant = applicants.find((a) => a.id === overId);
    if (targetApplicant?.stage_id) {
      const applicant = applicants.find((a) => a.id === applicantId);
      if (applicant && applicant.stage_id !== targetApplicant.stage_id) {
        await onMoveApplicant(applicantId, targetApplicant.stage_id, clubName);
      }
    }
  };

  const handleDragOver = (_e: DragOverEvent) => {};

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = (ids: string[], select: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => (select ? next.add(id) : next.delete(id)));
      return next;
    });
  };

  const handleBulkMove = async (stageId: string) => {
    if (!selectedIds.size || bulkMoving) return;
    setBulkMoving(true);
    await onBulkMove([...selectedIds], stageId);
    setSelectedIds(new Set());
    setBulkMoving(false);
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 shrink-0">
        <p className="text-sm text-zinc-500 flex-1">
          {applicants.length} applicant{applicants.length !== 1 ? 's' : ''} across {stages.length}{' '}
          stage{stages.length !== 1 ? 's' : ''}
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
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> AI ≥75
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" /> 50–74
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> &lt;50
        </span>
        <span className="flex items-center gap-1">
          <Star className="w-3 h-3 text-gold fill-gold" /> Standout
        </span>
        <span className="flex items-center gap-1">
          <span className="text-emerald-400 font-bold">✓</span>
          <span className="text-red-400 font-bold">✗</span>
          <span className="text-yellow-400 font-bold ml-0.5">~</span>
          Officer votes
        </span>
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
            {stages.map((stage) => (
              <StageCol
                key={stage.id}
                stage={stage}
                applicants={applicants.filter((a) => a.stage_id === stage.id)}
                officerScoreMap={officerScoreMap}
                voteMap={voteMap}
                selectedIds={selectedIds}
                onSelect={toggleSelect}
                onSelectAll={handleSelectAll}
                onOpenDrawer={onOpenDrawer}
              />
            ))}
          </div>
          <DragOverlay>{activeApplicant && <DragCard applicant={activeApplicant} />}</DragOverlay>
        </DndContext>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Bulk action bar — appears when anything is selected */}
      {selectedIds.size > 0 && (
        <div className="shrink-0 flex items-center gap-3 px-4 py-3 bg-zinc-900 border border-blue-500/30 rounded-xl animate-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-sm font-semibold text-white">{selectedIds.size} selected</span>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="flex items-center gap-1 text-xs text-zinc-500 hover:text-white transition-colors"
            >
              <X className="w-3 h-3" /> Clear
            </button>
          </div>
          <div className="w-px h-5 bg-white/10 shrink-0" />
          <span className="text-xs text-zinc-500 shrink-0">Move to →</span>
          <div className="flex items-center gap-1.5 flex-wrap flex-1">
            {stages.map((stage) => (
              <button
                key={stage.id}
                disabled={bulkMoving}
                onClick={() => handleBulkMove(stage.id)}
                className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-zinc-300 hover:border-blue-400/40 hover:text-white hover:bg-blue-500/10 transition-all disabled:opacity-40"
              >
                {stage.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
