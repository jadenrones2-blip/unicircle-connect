import { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { MoreHorizontal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// ---------- Types ----------

interface ATSApplicant {
  id: string;
  name: string;
  major: string;
  gpa: number;
  stageId: string;
  score?: number;
  hasResume?: boolean;
  accepted?: boolean;
}

interface ATSStage {
  id: string;
  label: string;
}

// ---------- Demo Data ----------

const STAGES: ATSStage[] = [
  { id: 'applied', label: 'Applied' },
  { id: 'review', label: 'Under Review' },
  { id: 'interview', label: 'Interview' },
  { id: 'accepted', label: 'Accepted' },
];

const INITIAL_APPLICANTS: ATSApplicant[] = [
  { id: '1', name: 'Sarah Chen', major: 'CS', gpa: 3.8, stageId: 'applied', hasResume: true },
  { id: '2', name: 'James Park', major: 'Data Sci', gpa: 3.6, stageId: 'applied', hasResume: true },
  { id: '3', name: 'Emily Rodriguez', major: 'Math', gpa: 3.9, stageId: 'applied' },
  { id: '4', name: 'Alex Kim', major: 'CS', gpa: 3.7, stageId: 'review', score: 87 },
  { id: '5', name: 'Maya Patel', major: 'Econ', gpa: 3.5, stageId: 'review', score: 72 },
  { id: '6', name: 'Jordan Lee', major: 'CS', gpa: 3.9, stageId: 'interview', score: 94 },
  { id: '7', name: 'Taylor Nguyen', major: 'CS', gpa: 4.0, stageId: 'accepted', accepted: true },
];

// ---------- Applicant Card ----------

function ATSApplicantCard({ applicant }: { applicant: ATSApplicant }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: applicant.id });

  const initials = applicant.name
    .split(' ')
    .map((n) => n[0])
    .join('');

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`rounded-xl p-4 cursor-grab active:cursor-grabbing transition-all ${
        isDragging
          ? 'opacity-50 shadow-xl scale-105'
          : 'hover:ring-1 hover:ring-white/10'
      }`}
      style={{
        ...(transform ? { transform: CSS.Transform.toString(transform), transition } : {}),
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-gold/20 text-gold flex items-center justify-center text-sm font-semibold shrink-0">
          {initials}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{applicant.name}</p>
          <p className="text-xs text-zinc-500 mt-0.5">
            {applicant.major} · {applicant.gpa} GPA
          </p>

          <div className="flex items-center gap-2 mt-2.5 flex-wrap">
            {applicant.hasResume && (
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Resume ✓
              </span>
            )}
            {applicant.score != null && (
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-gold/10 text-gold border border-gold/20">
                Score: {applicant.score}
              </span>
            )}
            {applicant.accepted && (
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                ✓ Accepted
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- Drag Overlay Card ----------

function ATSApplicantOverlay({ applicant }: { applicant: ATSApplicant }) {
  const initials = applicant.name
    .split(' ')
    .map((n) => n[0])
    .join('');

  return (
    <div
      className="rounded-xl p-4 rotate-3 shadow-2xl"
      style={{
        background: 'rgba(30,30,30,0.95)',
        border: '1px solid rgba(255,255,255,0.1)',
        width: 280,
      }}
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-gold/20 text-gold flex items-center justify-center text-sm font-semibold shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{applicant.name}</p>
          <p className="text-xs text-zinc-500 mt-0.5">
            {applicant.major} · {applicant.gpa} GPA
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------- Stage Column ----------

function ATSStageColumn({
  stage,
  applicants,
}: {
  stage: ATSStage;
  applicants: ATSApplicant[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });

  return (
    <div className="flex flex-col w-72 shrink-0">
      <div className="flex items-center gap-2.5 mb-4 px-1">
        <span className="text-xs font-semibold text-black bg-gold w-7 h-7 flex items-center justify-center rounded-lg">
          {applicants.length}
        </span>
        <h3 className="text-sm font-semibold text-white tracking-wide">
          {stage.label}
        </h3>
      </div>

      <div
        ref={setNodeRef}
        className={`flex-1 rounded-2xl p-3 transition-all min-h-[250px] ${
          isOver ? 'ring-2 ring-gold/40 bg-gold/5' : ''
        }`}
        style={{
          background: isOver ? undefined : 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.04)',
        }}
      >
        <SortableContext
          items={applicants.map((a) => a.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2.5">
            {applicants.map((applicant) => (
              <ATSApplicantCard key={applicant.id} applicant={applicant} />
            ))}
          </div>
        </SortableContext>
      </div>
    </div>
  );
}

// ---------- ATS Board ----------

export default function ATSBoard() {
  const [applicants, setApplicants] = useState<ATSApplicant[]>(INITIAL_APPLICANTS);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const activeApplicant = activeId
    ? applicants.find((a) => a.id === activeId)
    : null;

  const totalApplicants = applicants.length;

  const getApplicantsForStage = (stageId: string) =>
    applicants.filter((a) => a.stageId === stageId);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const applicantId = active.id as string;
    const overId = over.id as string;

    const targetStage = STAGES.find((s) => s.id === overId);
    if (targetStage) {
      setApplicants((prev) =>
        prev.map((a) =>
          a.id === applicantId ? { ...a, stageId: targetStage.id } : a
        )
      );
      return;
    }

    const targetApplicant = applicants.find((a) => a.id === overId);
    if (targetApplicant) {
      setApplicants((prev) =>
        prev.map((a) =>
          a.id === applicantId ? { ...a, stageId: targetApplicant.stageId } : a
        )
      );
    }
  };

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: '#0D0D0D', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <div className="p-5 sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-display font-bold text-white tracking-tight">
              Fall 2025 Recruitment
            </h3>
            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs">
              Active
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-zinc-500">
              {totalApplicants} applicants
            </span>
            <button className="text-zinc-500 hover:text-white transition-colors">
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Kanban Board */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 overflow-x-auto pb-4">
            {STAGES.map((stage) => (
              <ATSStageColumn
                key={stage.id}
                stage={stage}
                applicants={getApplicantsForStage(stage.id)}
              />
            ))}
          </div>

          <DragOverlay>
            {activeApplicant && <ATSApplicantOverlay applicant={activeApplicant} />}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}
