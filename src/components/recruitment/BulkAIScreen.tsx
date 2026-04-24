import { useState } from 'react';
import { Loader2, Brain, Settings2, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useRecruitmentRequirements } from '@/hooks/useRecruitmentRequirements';
import type { RecruitmentStage, Applicant } from '@/hooks/useRecruitment';

const BATCH_SIZE = 15;

interface BulkAIScreenProps {
  clubId: string;
  stages: RecruitmentStage[];
  applicants: Applicant[];
  onComplete: () => Promise<void>;
  onConfigureRubric: () => void;
}

export function BulkAIScreen({ clubId, stages, applicants, onComplete, onConfigureRubric }: BulkAIScreenProps) {
  const { aiCriteria, strictFilters } = useRecruitmentRequirements(clubId);
  const [open, setOpen] = useState(false);
  const [targetStageId, setTargetStageId] = useState<string>('all');
  const [acceptAbove, setAcceptAbove] = useState(75);
  const [rejectBelow, setRejectBelow] = useState(40);
  const [applyThresholds, setApplyThresholds] = useState(false);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [done, setDone] = useState(false);

  const targetApplicants =
    targetStageId === 'all'
      ? applicants
      : applicants.filter((a) => a.stage_id === targetStageId);

  const handleClose = (v: boolean) => {
    if (running) return;
    setOpen(v);
    if (!v) {
      setDone(false);
      setProgress({ done: 0, total: 0 });
    }
  };

  const handleRun = async () => {
    if (targetApplicants.length === 0) {
      toast.error('No applicants to screen');
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session) {
      toast.error('Please log in');
      return;
    }

    setRunning(true);
    setDone(false);

    const ids = targetApplicants.map((a) => a.id);
    setProgress({ done: 0, total: ids.length });

    // Process in fixed-size batches sequentially to stay under edge function timeout
    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
      const batch = ids.slice(i, i + BATCH_SIZE);
      try {
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-screen-applicants`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${sessionData.session.access_token}`,
            },
            body: JSON.stringify({ club_id: clubId, applicant_ids: batch }),
          }
        );
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          console.error('Batch failed:', err);
        }
      } catch (e) {
        console.error('Batch error:', e);
      }
      setProgress({ done: Math.min(i + BATCH_SIZE, ids.length), total: ids.length });
    }

    // Refresh so kanban shows updated scores
    await onComplete();

    // Auto-apply thresholds if opted in
    if (applyThresholds) {
      const { data: freshApplicants } = await supabase
        .from('applicants')
        .select('id, fit_score')
        .eq('club_id', clubId)
        .in('id', ids);

      if (freshApplicants && freshApplicants.length > 0) {
        const acceptIds: string[] = [];
        const rejectIds: string[] = [];

        for (const app of freshApplicants) {
          if (app.fit_score !== null) {
            if (app.fit_score >= acceptAbove) acceptIds.push(app.id);
            else if (app.fit_score < rejectBelow) rejectIds.push(app.id);
          }
        }

        const updatePromises: Promise<unknown>[] = [];
        if (acceptIds.length > 0) {
          updatePromises.push(
            (supabase.from('applicants') as any).update({ final_decision: 'accepted' }).in('id', acceptIds)
          );
        }
        if (rejectIds.length > 0) {
          updatePromises.push(
            (supabase.from('applicants') as any).update({ final_decision: 'rejected' }).in('id', rejectIds)
          );
        }

        if (updatePromises.length > 0) {
          await Promise.all(updatePromises);
          const total = acceptIds.length + rejectIds.length;
          const pending = ids.length - total;
          toast.success(
            `Auto-decided ${total} applicants — ${acceptIds.length} accepted, ${rejectIds.length} rejected${pending > 0 ? `, ${pending} pending manual review` : ''}`
          );
          await onComplete();
        }
      }
    }

    setRunning(false);
    setDone(true);
    toast.success(`AI screening complete — ${ids.length} applicants evaluated`);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 border-white/15 text-zinc-300 hover:text-white hover:bg-white/5"
        >
          AI Screen
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Bulk AI Screening
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-1">
          {/* Scope selector */}
          <div className="space-y-1.5">
            <Label className="text-zinc-300">Screen applicants in</Label>
            <select
              value={targetStageId}
              onChange={(e) => setTargetStageId(e.target.value)}
              disabled={running}
              className="w-full bg-zinc-900 border border-white/15 text-zinc-200 rounded-md px-3 py-2 text-sm disabled:opacity-50"
            >
              <option value="all">All stages — {applicants.length} applicants</option>
              {stages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label} — {applicants.filter((a) => a.stage_id === s.id).length} applicants
                </option>
              ))}
            </select>
            <p className="text-xs text-zinc-500">
              Already-screened applicants will be re-evaluated with the latest rubric.
            </p>
          </div>

          {/* Rubric summary */}
          <div className="rounded-lg bg-white/5 border border-white/10 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Rubric</p>
              <button
                onClick={() => { setOpen(false); onConfigureRubric(); }}
                className="flex items-center gap-1 text-xs text-zinc-500 hover:text-gold transition-colors"
              >
                <Settings2 className="w-3 h-3" />
                Configure
              </button>
            </div>
            {aiCriteria.length === 0 && strictFilters.length === 0 ? (
              <p className="text-xs text-zinc-500">
                No rubric set up yet.{' '}
                <button
                  onClick={() => { setOpen(false); onConfigureRubric(); }}
                  className="text-gold underline underline-offset-2 hover:no-underline"
                >
                  Configure the rubric
                </button>{' '}
                before screening for best results.
              </p>
            ) : (
              <div className="space-y-1">
                {strictFilters.length > 0 && (
                  <p className="text-xs text-zinc-400">
                    <span className="font-medium text-zinc-300">{strictFilters.length} strict filter{strictFilters.length !== 1 ? 's' : ''}</span>
                    {' '}— auto-fail candidates who don&apos;t qualify
                  </p>
                )}
                {aiCriteria.length > 0 && (
                  <>
                    <p className="text-xs text-zinc-400 mb-1.5">
                      <span className="font-medium text-zinc-300">{aiCriteria.length} AI criteria</span>
                      {' '}— Claude will evaluate each applicant against:
                    </p>
                    <div className="space-y-1 pl-1">
                      {aiCriteria.slice(0, 3).map((c) => {
                        const val = c.value as { description: string; weight?: number };
                        return (
                          <div key={c.id} className="flex items-start gap-1.5">
                            <Brain className="w-3 h-3 text-gold mt-0.5 shrink-0" />
                            <p className="text-xs text-zinc-500 line-clamp-1">{val.description}</p>
                          </div>
                        );
                      })}
                      {aiCriteria.length > 3 && (
                        <p className="text-xs text-zinc-600 pl-4.5">+{aiCriteria.length - 3} more</p>
                      )}
                    </div>
                  </>
                )}
                <div className="flex items-center gap-1.5 pt-1.5 border-t border-white/5 mt-1.5">
                  <Star className="w-3 h-3 text-gold fill-gold" />
                  <p className="text-xs text-zinc-500">Claude will flag ~10–15% of candidates as Standouts</p>
                </div>
              </div>
            )}
          </div>

          {/* Auto-threshold toggle */}
          <div className="rounded-lg bg-white/5 border border-white/10 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-200 font-medium">Auto-apply decisions</p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Mark Accept / Reject automatically by score after screening
                </p>
              </div>
              <button
                onClick={() => setApplyThresholds((v) => !v)}
                disabled={running}
                className={`relative w-10 h-5 rounded-full transition-colors disabled:opacity-50 ${
                  applyThresholds ? 'bg-gold' : 'bg-zinc-700'
                }`}
              >
                <span
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                    applyThresholds ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {applyThresholds && (
              <div className="space-y-4 pt-1">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-emerald-400">Accept if score ≥</span>
                    <span className="text-emerald-400 font-semibold">{acceptAbove}</span>
                  </div>
                  <input
                    type="range"
                    min={rejectBelow + 1}
                    max={99}
                    value={acceptAbove}
                    onChange={(e) => setAcceptAbove(Number(e.target.value))}
                    disabled={running}
                    className="w-full accent-emerald-500 disabled:opacity-50"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-red-400">Reject if score &lt;</span>
                    <span className="text-red-400 font-semibold">{rejectBelow}</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={acceptAbove - 1}
                    value={rejectBelow}
                    onChange={(e) => setRejectBelow(Number(e.target.value))}
                    disabled={running}
                    className="w-full accent-red-500 disabled:opacity-50"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
                  <div className="rounded bg-emerald-500/10 border border-emerald-500/20 px-2 py-1.5">
                    <div className="text-emerald-400 font-medium">≥ {acceptAbove}</div>
                    <div className="text-zinc-500">Accept</div>
                  </div>
                  <div className="rounded bg-yellow-500/10 border border-yellow-500/20 px-2 py-1.5">
                    <div className="text-yellow-400 font-medium">{rejectBelow}–{acceptAbove - 1}</div>
                    <div className="text-zinc-500">Pending</div>
                  </div>
                  <div className="rounded bg-red-500/10 border border-red-500/20 px-2 py-1.5">
                    <div className="text-red-400 font-medium">&lt; {rejectBelow}</div>
                    <div className="text-zinc-500">Reject</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Progress bar */}
          {(running || done) && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-zinc-400">
                <span>{done ? 'Screening complete' : `Screening in batches of ${BATCH_SIZE}...`}</span>
                <span>{progress.done} / {progress.total}</span>
              </div>
              <Progress
                value={progress.total > 0 ? (progress.done / progress.total) * 100 : 0}
                className="h-2"
              />
            </div>
          )}

          <Button
            onClick={handleRun}
            disabled={running || targetApplicants.length === 0}
            className="w-full gap-2 bg-gold text-zinc-900 hover:bg-gold/90 font-medium"
          >
            {running ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Screening {progress.done} / {progress.total}…
              </>
            ) : (
              <>
                Run AI Screen — {targetApplicants.length} applicant{targetApplicants.length !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
