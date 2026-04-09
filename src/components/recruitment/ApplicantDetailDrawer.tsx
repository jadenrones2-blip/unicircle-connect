import { useState, useEffect, useCallback } from 'react';
import { ThumbsUp, ThumbsDown, Minus, Sparkles, Loader2, Check, Star, Download, ClipboardList } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { Applicant, FormQuestion } from '@/hooks/useRecruitment';
import { useRecruitmentRequirements } from '@/hooks/useRecruitmentRequirements';
import { useRubricScoring, parseCriterionValue, calcWeightedScore } from '@/hooks/useRubricScoring';

type VoteValue = 'yes' | 'no' | 'maybe';
type FinalDecision = 'pending' | 'accepted' | 'waitlisted' | 'rejected';

interface VoteTally {
  yes: number;
  no: number;
  maybe: number;
}

interface ApplicantDetailDrawerProps {
  applicant: Applicant | null;
  open: boolean;
  onClose: () => void;
  clubId: string;
  formQuestions: FormQuestion[];
  onUpdateFinalDecision: (id: string, decision: string) => Promise<boolean>;
  onUpdateNotes: (id: string, notes: string) => Promise<boolean>;
  onRunAIScreen: (applicantId: string) => Promise<void>;
}

// ─── Fit score badge ──────────────────────────────────────────────────────────

function FitScoreBadge({ score }: { score: number | null }) {
  if (score === null || score === undefined) return null;
  const color =
    score >= 80
      ? 'bg-green-500/10 text-green-400 border-green-500/20'
      : score >= 60
      ? 'bg-gold/10 text-gold border-gold/20'
      : score >= 40
      ? 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
      : 'bg-red-500/10 text-red-400 border-red-500/20';

  return (
    <Badge className={`gap-1.5 ${color}`}>
      <Sparkles className="w-3 h-3" />
      {score} AI Score
    </Badge>
  );
}

// ─── Vote button ──────────────────────────────────────────────────────────────

function VoteButton({
  value,
  current,
  onClick,
  disabled,
}: {
  value: VoteValue;
  current: VoteValue | null;
  onClick: () => void;
  disabled: boolean;
}) {
  const isActive = current === value;
  const icon = value === 'yes' ? <ThumbsUp className="w-4 h-4" /> : value === 'no' ? <ThumbsDown className="w-4 h-4" /> : <Minus className="w-4 h-4" />;
  const label = value === 'yes' ? 'Yes' : value === 'no' ? 'No' : 'Maybe';
  const activeClass =
    value === 'yes'
      ? 'bg-green-500/10 text-green-400 border-green-500/30'
      : value === 'no'
      ? 'bg-red-500/10 text-red-400 border-red-500/30'
      : 'bg-zinc-500/10 text-zinc-300 border-zinc-500/30';

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors disabled:opacity-50 ${
        isActive ? activeClass : 'border-white/10 text-zinc-500 hover:border-white/20 hover:text-zinc-300'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

// ─── Main Drawer ──────────────────────────────────────────────────────────────

export function ApplicantDetailDrawer({
  applicant,
  open,
  onClose,
  clubId,
  formQuestions,
  onUpdateFinalDecision,
  onUpdateNotes,
  onRunAIScreen,
}: ApplicantDetailDrawerProps) {
  const { user } = useAuth();

  // Deliberation state
  const [myVote, setMyVote] = useState<VoteValue | null>(null);
  const [comment, setComment] = useState('');
  const [tally, setTally] = useState<VoteTally>({ yes: 0, no: 0, maybe: 0 });
  const [voteSaving, setVoteSaving] = useState(false);

  // Final decision
  const [decision, setDecision] = useState<FinalDecision>('pending');
  const [decisionSaving, setDecisionSaving] = useState(false);

  // Notes
  const [notes, setNotes] = useState('');
  const [notesSaving, setNotesSaving] = useState(false);
  const [notesDirty, setNotesDirty] = useState(false);

  // AI screening
  const [aiRunning, setAiRunning] = useState(false);

  // Rubric scoring
  const { aiCriteria } = useRecruitmentRequirements(clubId);
  const { scores, saving: scoreSaving, saveScore, teamAvgForCriterion } = useRubricScoring(
    open && applicant ? applicant.id : null
  );
  const [scoreNotes, setScoreNotes] = useState<Record<string, string>>({});

  // Sync local note state from loaded scores
  useEffect(() => {
    if (open && applicant) {
      const notes: Record<string, string> = {};
      Object.values(scores).forEach((s) => { notes[s.requirementId] = s.note; });
      setScoreNotes(notes);
    }
  }, [open, applicant?.id, scores]);

  const fetchVotes = useCallback(async () => {
    if (!applicant?.id || !user) return;
    try {
      const { data, error } = await (supabase as any)
        .from('deliberation_votes')
        .select('voter_id, vote, comment')
        .eq('applicant_id', applicant.id);

      if (error) return;

      const myRow = data?.find((v) => v.voter_id === user.id);
      setMyVote((myRow?.vote as VoteValue) || null);
      setComment(myRow?.comment || '');

      const t: VoteTally = { yes: 0, no: 0, maybe: 0 };
      for (const row of data || []) {
        if (row.vote === 'yes') t.yes++;
        else if (row.vote === 'no') t.no++;
        else if (row.vote === 'maybe') t.maybe++;
      }
      setTally(t);
    } catch {
      // deliberation_votes table might not exist yet — fail silently
    }
  }, [applicant?.id, user]);

  useEffect(() => {
    if (open && applicant) {
      setDecision((applicant as any).final_decision || 'pending');
      setNotes(applicant.notes || '');
      setNotesDirty(false);
      fetchVotes();
    }
  }, [open, applicant, fetchVotes]);

  const handleVote = async (vote: VoteValue) => {
    if (!applicant?.id || !user) return;
    setVoteSaving(true);
    try {
      const { error } = await (supabase as any)
        .from('deliberation_votes')
        .upsert(
          { applicant_id: applicant.id, voter_id: user.id, vote, comment: comment || null },
          { onConflict: 'applicant_id,voter_id' }
        );
      if (error) throw error;
      setMyVote(vote);
      await fetchVotes();
    } catch {
      toast.error('Failed to save vote');
    } finally {
      setVoteSaving(false);
    }
  };

  const handleSaveComment = async () => {
    if (!applicant?.id || !user || !myVote) {
      toast.error('Cast your vote first, then save your comment.');
      return;
    }
    setVoteSaving(true);
    try {
      const { error } = await (supabase as any)
        .from('deliberation_votes')
        .upsert(
          { applicant_id: applicant.id, voter_id: user.id, vote: myVote, comment: comment || null },
          { onConflict: 'applicant_id,voter_id' }
        );
      if (error) throw error;
      toast.success('Comment saved');
    } catch {
      toast.error('Failed to save comment');
    } finally {
      setVoteSaving(false);
    }
  };

  const handleDecisionChange = async (value: string) => {
    if (!applicant?.id) return;
    setDecisionSaving(true);
    const ok = await onUpdateFinalDecision(applicant.id, value);
    if (ok) setDecision(value as FinalDecision);
    setDecisionSaving(false);
  };

  const handleSaveNotes = async () => {
    if (!applicant?.id) return;
    setNotesSaving(true);
    const ok = await onUpdateNotes(applicant.id, notes);
    if (ok) setNotesDirty(false);
    setNotesSaving(false);
  };

  const handleRunAI = async () => {
    if (!applicant?.id) return;
    setAiRunning(true);
    await onRunAIScreen(applicant.id);
    setAiRunning(false);
  };

  if (!applicant) return null;

  const metadata = applicant.metadata as Record<string, string> | null;
  const isStandout = applicant.is_standout ?? ((applicant.fit_score ?? 0) >= 85 && applicant.passes_strict_filters !== false);

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg bg-zinc-950 border-white/10 text-white overflow-y-auto"
      >
        {isStandout && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-gold/10 border-b border-gold/20 -mx-6 -mt-6 mb-4">
            <Star className="w-4 h-4 text-gold fill-gold shrink-0" />
            <p className="text-sm font-medium text-gold">AI Standout — worth keeping a close eye on</p>
          </div>
        )}
        <SheetHeader className="pb-4 border-b border-white/10">
          <SheetTitle className="text-left text-white font-display text-xl">
            {applicant.first_name} {applicant.last_name}
          </SheetTitle>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-sm text-zinc-400">{applicant.email}</span>
            <FitScoreBadge score={applicant.fit_score} />
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {applicant.major && (
              <Badge variant="outline" className="text-zinc-400 border-white/10 text-xs">
                {applicant.major}
              </Badge>
            )}
            {applicant.year && (
              <Badge variant="outline" className="text-zinc-400 border-white/10 text-xs">
                {applicant.year}
              </Badge>
            )}
            {applicant.gpa !== null && (
              <Badge variant="outline" className="text-zinc-400 border-white/10 text-xs">
                GPA {applicant.gpa}
              </Badge>
            )}
          </div>
        </SheetHeader>

        <div className="space-y-6 pt-5">
          {/* Application Responses */}
          {formQuestions.length > 0 && metadata && Object.keys(metadata).length > 0 && (
            <section>
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">
                Application Responses
              </p>
              <div className="space-y-4">
                {formQuestions.map((q) => {
                  const answer = metadata[q.id];
                  if (!answer) return null;
                  const isVideo =
                    q.type === 'video' ||
                    /\.(mp4|mov|webm)(\?|$)/i.test(answer) ||
                    answer.includes('application-videos');
                  return (
                    <div key={q.id} className="space-y-1">
                      <p className="text-xs text-zinc-500">{q.label}</p>
                      {isVideo ? (
                        <div className="rounded-lg border border-white/10 overflow-hidden bg-zinc-900">
                          <video
                            src={answer}
                            controls
                            playsInline
                            className="w-full aspect-video object-cover bg-black"
                          />
                          <div className="px-3 py-2 flex items-center justify-end">
                            <a
                              href={answer}
                              target="_blank"
                              rel="noopener noreferrer"
                              download
                              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                            >
                              <Download className="w-3.5 h-3.5" />
                              Download
                            </a>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-zinc-200 bg-zinc-900 rounded-lg px-3 py-2 border border-white/10">
                          {answer}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* AI Summary */}
          <section>
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">
              AI Summary
            </p>
            {applicant.ai_summary ? (
              <p className="text-sm text-zinc-300 bg-zinc-900 rounded-lg px-3 py-2 border border-white/10 leading-relaxed">
                {applicant.ai_summary}
              </p>
            ) : (
              <div className="flex items-center gap-3">
                <p className="text-sm text-zinc-500">No AI summary yet.</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRunAI}
                  disabled={aiRunning}
                  className="border-white/10 text-zinc-400"
                >
                  {aiRunning ? (
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  )}
                  Run AI Screen
                </Button>
              </div>
            )}
          </section>

          {/* Rubric Scoring */}
          {aiCriteria.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">
                  Your Scores
                </p>
                {(() => {
                  const ws = calcWeightedScore(scores, aiCriteria);
                  return ws !== null ? (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gold/10 border border-gold/20">
                      <ClipboardList className="w-3.5 h-3.5 text-gold" />
                      <span className="text-sm font-bold text-gold">{ws}</span>
                      <span className="text-xs text-gold/70">/ 100</span>
                    </div>
                  ) : null;
                })()}
              </div>

              <div className="space-y-4">
                {aiCriteria.map((req) => {
                  const { description, weight } = parseCriterionValue(req);
                  const myScore = scores[req.id]?.score ?? 0;
                  const teamAvg = teamAvgForCriterion(req.id);
                  const isSaving = scoreSaving === req.id;

                  return (
                    <div key={req.id} className="rounded-xl border border-white/10 bg-zinc-900/60 p-3.5 space-y-3">
                      {/* Criterion header */}
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm text-zinc-200 leading-snug">{description}</p>
                        <div className="flex items-center gap-0.5 shrink-0 ml-2 mt-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <div
                              key={i}
                              className={`w-1.5 h-1.5 rounded-full ${i < weight ? 'bg-gold/50' : 'bg-white/10'}`}
                            />
                          ))}
                          <span className="text-[10px] text-zinc-600 ml-1.5">w{weight}</span>
                        </div>
                      </div>

                      {/* 1–5 dot selector */}
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1.5">
                          {[1, 2, 3, 4, 5].map((val) => (
                            <button
                              key={val}
                              type="button"
                              disabled={isSaving}
                              onClick={() => saveScore(req.id, val, scoreNotes[req.id] || '')}
                              title={`${val}/5`}
                              className={`w-8 h-8 rounded-full border text-xs font-bold transition-all ${
                                myScore === val
                                  ? 'bg-gold border-gold text-zinc-900 scale-110'
                                  : myScore > 0 && val <= myScore
                                  ? 'bg-gold/30 border-gold/50 text-gold'
                                  : 'bg-white/5 border-white/15 text-zinc-600 hover:border-white/30 hover:text-zinc-300'
                              }`}
                            >
                              {val}
                            </button>
                          ))}
                        </div>
                        <div className="flex items-center gap-2 ml-1">
                          {myScore > 0 && (
                            <span className="text-sm font-semibold text-white">{myScore}/5</span>
                          )}
                          {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-500" />}
                          {teamAvg !== null && (
                            <span className="text-xs text-zinc-600">team avg {teamAvg}</span>
                          )}
                        </div>
                      </div>

                      {/* Qualitative note */}
                      <input
                        value={scoreNotes[req.id] || ''}
                        onChange={(e) => setScoreNotes((prev) => ({ ...prev, [req.id]: e.target.value }))}
                        onBlur={() => {
                          if (myScore > 0) saveScore(req.id, myScore, scoreNotes[req.id] || '');
                        }}
                        placeholder="Add a note for this criterion… (optional)"
                        className="w-full bg-transparent text-xs text-zinc-400 placeholder:text-zinc-700 focus:outline-none border-b border-transparent focus:border-white/15 py-0.5 transition-colors"
                      />
                    </div>
                  );
                })}
              </div>

              {aiCriteria.length > 0 && Object.keys(scores).length === 0 && (
                <p className="text-xs text-zinc-600 text-center mt-2">
                  Click the numbered dots above to score each criterion
                </p>
              )}
            </section>
          )}

          {/* Deliberation */}
          <section>
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">
              Deliberation
            </p>

            {/* Vote buttons */}
            <div className="flex gap-2 mb-3">
              {(['yes', 'no', 'maybe'] as VoteValue[]).map((v) => (
                <VoteButton
                  key={v}
                  value={v}
                  current={myVote}
                  onClick={() => handleVote(v)}
                  disabled={voteSaving}
                />
              ))}
            </div>

            {/* Comment */}
            <div className="space-y-2 mb-3">
              <Label className="text-zinc-400 text-xs">Comment (optional)</Label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={2}
                placeholder="Add a note about this applicant..."
                className="bg-zinc-900 border-white/10 text-white placeholder:text-zinc-600 resize-none text-sm"
              />
              <Button
                variant="outline"
                size="sm"
                className="border-white/10 text-zinc-400"
                onClick={handleSaveComment}
                disabled={voteSaving}
              >
                {voteSaving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Check className="w-3 h-3 mr-1" />}
                Save comment
              </Button>
            </div>

            {/* Tally */}
            <div className="flex gap-4 text-sm">
              <span className="text-green-400 font-medium">{tally.yes} Yes</span>
              <span className="text-zinc-500">·</span>
              <span className="text-red-400 font-medium">{tally.no} No</span>
              <span className="text-zinc-500">·</span>
              <span className="text-zinc-400 font-medium">{tally.maybe} Maybe</span>
            </div>
          </section>

          {/* Final Decision */}
          <section>
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">
              Final Decision
            </p>
            <div className="flex items-center gap-3">
              <Select value={decision} onValueChange={handleDecisionChange} disabled={decisionSaving}>
                <SelectTrigger className="bg-zinc-900 border-white/10 text-white w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-950 border-white/10">
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="waitlisted">Waitlisted</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              {decisionSaving && <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />}
              {decision === 'accepted' && (
                <Badge className="bg-green-500/10 text-green-400 border-green-500/20">Accepted</Badge>
              )}
              {decision === 'rejected' && (
                <Badge className="bg-red-500/10 text-red-400 border-red-500/20">Rejected</Badge>
              )}
              {decision === 'waitlisted' && (
                <Badge className="bg-gold/10 text-gold border-gold/20">Waitlisted</Badge>
              )}
            </div>
          </section>

          {/* Notes */}
          <section>
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">
              Officer Notes
            </p>
            <Textarea
              value={notes}
              onChange={(e) => { setNotes(e.target.value); setNotesDirty(true); }}
              rows={4}
              placeholder="Private notes visible only to club officers..."
              className="bg-zinc-900 border-white/10 text-white placeholder:text-zinc-600 resize-none text-sm mb-2"
            />
            {notesDirty && (
              <Button
                variant="outline"
                size="sm"
                className="border-white/10 text-zinc-400"
                onClick={handleSaveNotes}
                disabled={notesSaving}
              >
                {notesSaving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Check className="w-3 h-3 mr-1" />}
                Save notes
              </Button>
            )}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
