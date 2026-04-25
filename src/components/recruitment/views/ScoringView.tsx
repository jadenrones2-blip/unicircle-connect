import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useRubricScoring, parseCriterionValue, calcWeightedScore } from '@/hooks/useRubricScoring';
import { useRecruitmentRequirements } from '@/hooks/useRecruitmentRequirements';
import { Check, ChevronDown, ChevronRight, UserPlus, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { RecruitmentStage, Applicant } from '@/hooks/useRecruitment';

interface ScoringViewProps {
  clubId: string;
  stages: RecruitmentStage[];
  applicants: Applicant[];
  onOpenDrawer: (applicant: Applicant) => void;
  onRefresh: () => Promise<void>;
}

// ── Officer fetcher ───────────────────────────────────────────────────────────

interface Officer { user_id: string; email: string; name?: string; }

function useClubOfficers(clubId: string) {
  const [officers, setOfficers] = useState<Officer[]>([]);
  useEffect(() => {
    (supabase as any)
      .from('club_officers')
      .select('user_id, email')
      .eq('club_id', clubId.trim().toLowerCase())
      .then(({ data }: any) => setOfficers(data || []));
  }, [clubId]);
  return officers;
}

// ── Score detail for a single applicant ─────────────────────────────────────

interface ScoreDetailProps {
  applicant: Applicant;
  clubId: string;
  stages: RecruitmentStage[];
  officers: Officer[];
  onOpenDrawer: () => void;
  onAssign: (applicantId: string, userId: string | null) => Promise<void>;
}

function ScoreDetail({ applicant, clubId, stages, officers, onOpenDrawer, onAssign }: ScoreDetailProps) {
  const { aiCriteria } = useRecruitmentRequirements(clubId);
  const { scores, saving, scoreError, saveScore, teamAvgForCriterion, loading } = useRubricScoring(applicant.id) as any;
  const { user } = useAuth();

  const [localScores, setLocalScores] = useState<Record<string, number>>({});
  const [localNotes, setLocalNotes] = useState<Record<string, string>>({});
  const [responsesOpen, setResponsesOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    const s: Record<string, number> = {};
    const n: Record<string, string> = {};
    for (const [reqId, cs] of Object.entries(scores as Record<string, any>)) {
      s[reqId] = cs.score;
      n[reqId] = cs.note || '';
    }
    setLocalScores(s);
    setLocalNotes(n);
  }, [scores]);

  const handleSave = async (reqId: string) => {
    const score = localScores[reqId];
    if (!score) { toast.error('Please select a score first'); return; }
    await saveScore(reqId, score, localNotes[reqId] || '');
    toast.success('Score saved');
  };

  const myWeightedScore = useMemo(() => {
    const built: Record<string, any> = {};
    for (const [reqId, sc] of Object.entries(localScores)) {
      built[reqId] = { requirementId: reqId, score: sc, note: localNotes[reqId] || '' };
    }
    return calcWeightedScore(built, aiCriteria);
  }, [localScores, aiCriteria]);

  const assignedOfficer = officers.find(o => o.user_id === (applicant as any).assigned_to);
  const stageName = stages.find(s => s.id === applicant.stage_id)?.label ?? '—';

  const handleAssign = async (userId: string | null) => {
    setAssigning(true);
    setAssignOpen(false);
    await onAssign(applicant.id, userId);
    setAssigning(false);
  };

  const responses = applicant.metadata ? Object.entries(applicant.metadata) : [];

  return (
    <div className="flex flex-col gap-5 h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-white">
            {applicant.first_name} {applicant.last_name}
          </h3>
          <p className="text-sm text-zinc-500">
            {[applicant.major, applicant.year].filter(Boolean).join(' · ')} · {stageName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Assignment */}
          <div className="relative">
            <button
              onClick={() => setAssignOpen(v => !v)}
              disabled={assigning}
              className="flex items-center gap-1.5 text-xs text-zinc-400 border border-white/10 rounded-lg px-2.5 py-1.5 hover:text-white hover:border-white/20 transition-colors"
            >
              {assigning ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserPlus className="w-3 h-3" />}
              {assignedOfficer ? assignedOfficer.email.split('@')[0] : 'Assign'}
            </button>
            {assignOpen && (
              <div className="absolute right-0 top-full mt-1 z-20 bg-zinc-900 border border-white/10 rounded-lg shadow-xl min-w-[180px] py-1">
                <button
                  onClick={() => handleAssign(null)}
                  className="w-full text-left px-3 py-2 text-xs text-zinc-400 hover:bg-white/5"
                >
                  Unassign
                </button>
                {officers.map(o => (
                  <button
                    key={o.user_id}
                    onClick={() => handleAssign(o.user_id)}
                    className="w-full text-left px-3 py-2 text-xs text-zinc-300 hover:bg-white/5 flex items-center justify-between"
                  >
                    <span>{o.email.split('@')[0]}</span>
                    {o.user_id === user?.id && <span className="text-zinc-600">you</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={onOpenDrawer}
            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-gold transition-colors"
          >
            Full profile <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* My weighted score */}
      {myWeightedScore !== null && (
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/5 border border-white/8">
          <div>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">My weighted score</p>
            <p className="text-2xl font-bold text-gold">{myWeightedScore}</p>
          </div>
          {(applicant as any).fit_score !== null && (applicant as any).fit_score !== undefined && (
            <div className="ml-6">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">AI score</p>
              <p className="text-2xl font-bold text-zinc-300">{(applicant as any).fit_score}</p>
            </div>
          )}
        </div>
      )}

      {/* Form responses (collapsible) */}
      {responses.length > 0 && (
        <div className="rounded-lg border border-white/8">
          <button
            onClick={() => setResponsesOpen(v => !v)}
            className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium text-zinc-300 hover:text-white transition-colors"
          >
            <span>Application responses</span>
            {responsesOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          {responsesOpen && (
            <div className="border-t border-white/8 px-3 py-3 space-y-3">
              {responses.map(([key, value]) => (
                <div key={key}>
                  <p className="text-[11px] text-zinc-500 mb-0.5">{key}</p>
                  <p className="text-sm text-zinc-300 leading-relaxed">{String(value)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Criteria scoring */}
      {loading ? (
        <div className="flex items-center gap-2 text-zinc-500 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading scores…
        </div>
      ) : aiCriteria.length === 0 ? (
        <div className="text-sm text-zinc-500 py-4 text-center border border-dashed border-white/10 rounded-lg">
          No scoring criteria defined yet. Add AI criteria in Settings.
        </div>
      ) : (
        <div className="space-y-4">
          {aiCriteria.map(req => {
            const { description, weight } = parseCriterionValue(req);
            const teamAvg = teamAvgForCriterion(req.id);
            const myScore = localScores[req.id];
            const isSaved = !!scores[req.id];

            return (
              <div key={req.id} className="rounded-lg border border-white/8 bg-zinc-900/50 p-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <p className="text-sm text-zinc-200 flex-1">{description}</p>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gold/10 text-gold border border-gold/20 shrink-0">
                    w:{weight}
                  </span>
                </div>

                {/* 1-5 score selector */}
                <div className="flex items-center gap-2 mb-2">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      onClick={() => setLocalScores(prev => ({ ...prev, [req.id]: n }))}
                      className={`w-9 h-9 rounded-lg border text-sm font-semibold transition-all ${
                        myScore === n
                          ? 'bg-gold text-zinc-900 border-gold'
                          : 'bg-zinc-800 text-zinc-400 border-white/10 hover:border-white/30 hover:text-white'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                  <span className="text-xs text-zinc-600 ml-1">/ 5</span>
                </div>

                {/* Note */}
                <input
                  type="text"
                  value={localNotes[req.id] ?? ''}
                  onChange={e => setLocalNotes(prev => ({ ...prev, [req.id]: e.target.value }))}
                  placeholder="Add a note (optional)…"
                  className="w-full bg-transparent text-xs text-zinc-400 placeholder:text-zinc-600 focus:outline-none border-b border-white/8 focus:border-white/20 py-1 transition-colors mb-2"
                />

                {/* Footer row */}
                <div className="flex items-center justify-between">
                  <div className="text-xs text-zinc-600">
                    Team avg: {teamAvg !== null ? <span className="text-zinc-400">{teamAvg}/5</span> : '—'}
                  </div>
                  <button
                    onClick={() => handleSave(req.id)}
                    disabled={saving === req.id || !myScore}
                    className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border transition-all disabled:opacity-40 ${
                      isSaved
                        ? 'text-emerald-400 border-emerald-400/30 bg-emerald-400/8'
                        : 'text-gold border-gold/30 bg-gold/8 hover:bg-gold/15'
                    }`}
                  >
                    {saving === req.id
                      ? <Loader2 className="w-3 h-3 animate-spin" />
                      : isSaved ? <><Check className="w-3 h-3" /> Saved</> : 'Save score'
                    }
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Scoring view (two-panel) ──────────────────────────────────────────────────

export function ScoringView({ clubId, stages, applicants, onOpenDrawer, onRefresh }: ScoringViewProps) {
  const { user } = useAuth();
  const officers = useClubOfficers(clubId);
  const [queueFilter, setQueueFilter] = useState<'mine' | 'all'>('mine');
  const [selected, setSelected] = useState<Applicant | null>(null);
  const { aiCriteria } = useRecruitmentRequirements(clubId);

  const [assignedMap, setAssignedMap] = useState<Record<string, string | null>>({});

  // Sync assigned_to from applicants
  useEffect(() => {
    const m: Record<string, string | null> = {};
    for (const a of applicants) m[a.id] = (a as any).assigned_to ?? null;
    setAssignedMap(m);
  }, [applicants]);

  const handleAssign = useCallback(async (applicantId: string, userId: string | null) => {
    const { error } = await (supabase as any)
      .from('applicants')
      .update({ assigned_to: userId })
      .eq('id', applicantId);
    if (error) { toast.error('Failed to assign'); return; }
    setAssignedMap(prev => ({ ...prev, [applicantId]: userId }));
    toast.success(userId ? 'Assigned' : 'Unassigned');
  }, []);

  const queue = useMemo(() => {
    let list = applicants;
    if (queueFilter === 'mine') list = list.filter(a => assignedMap[a.id] === user?.id);
    return list;
  }, [applicants, queueFilter, assignedMap, user]);

  // Auto-select first in queue
  useEffect(() => {
    if (!selected && queue.length > 0) setSelected(queue[0]);
  }, [queue]);

  const stageMap = Object.fromEntries(stages.map(s => [s.id, s.label]));

  return (
    <div className="flex gap-4 h-full min-h-0">
      {/* LEFT — Queue */}
      <div className="w-72 shrink-0 flex flex-col border border-white/8 rounded-xl overflow-hidden">
        {/* Queue header */}
        <div className="px-3 py-3 border-b border-white/8">
          <h3 className="text-sm font-semibold text-white mb-2">Scoring Queue</h3>
          <div className="flex gap-1 p-0.5 rounded-lg bg-zinc-900 border border-white/8">
            {(['mine', 'all'] as const).map(f => (
              <button
                key={f}
                onClick={() => setQueueFilter(f)}
                className={`flex-1 py-1 rounded-md text-xs font-medium transition-colors ${
                  queueFilter === f ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {f === 'mine' ? 'Assigned to Me' : 'All Applicants'}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-zinc-600 mt-1.5">{queue.length} applicant{queue.length !== 1 ? 's' : ''}</p>
        </div>

        {/* Queue list */}
        <div className="flex-1 overflow-y-auto">
          {queue.length === 0 ? (
            <div className="p-4 text-center">
              <p className="text-xs text-zinc-600">
                {queueFilter === 'mine'
                  ? 'No applicants assigned to you yet.'
                  : 'No applicants in the pipeline.'}
              </p>
            </div>
          ) : (
            queue.map(applicant => {
              const isActive = selected?.id === applicant.id;
              const assignedTo = assignedMap[applicant.id];
              const assignedOfficer = officers.find(o => o.user_id === assignedTo);

              return (
                <button
                  key={applicant.id}
                  onClick={() => setSelected(applicant)}
                  className={`w-full text-left px-3 py-3 border-b border-white/5 transition-colors ${
                    isActive ? 'bg-gold/8 border-l-2 border-l-gold' : 'hover:bg-white/5'
                  }`}
                >
                  <p className="text-sm font-medium text-white truncate">
                    {applicant.first_name} {applicant.last_name}
                  </p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    {stageMap[applicant.stage_id ?? ''] ?? '—'}
                    {assignedOfficer && (
                      <span className="ml-2 text-gold/70">→ {assignedOfficer.email.split('@')[0]}</span>
                    )}
                  </p>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT — Score detail */}
      <div className="flex-1 min-w-0 border border-white/8 rounded-xl p-5 overflow-hidden">
        {selected ? (
          <ScoreDetail
            applicant={selected}
            clubId={clubId}
            stages={stages}
            officers={officers}
            onOpenDrawer={() => onOpenDrawer(selected)}
            onAssign={handleAssign}
          />
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm text-zinc-600">Select an applicant from the queue to score them.</p>
          </div>
        )}
      </div>
    </div>
  );
}
