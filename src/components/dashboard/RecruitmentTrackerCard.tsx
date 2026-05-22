import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle, Info, Clock } from 'lucide-react';
import type { StudentRecruitmentData } from '@/hooks/useStudentRecruitment';

function timeAgo(dateStr: string): string {
  const ms = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

interface RecruitmentTrackerCardProps {
  data: StudentRecruitmentData;
}

export default function RecruitmentTrackerCard({ data }: RecruitmentTrackerCardProps) {
  const { application, stages, settings, currentStageIndex, clubName } = data;

  const isQuickInterest = application.is_quick_interest;
  const finalDecision = application.final_decision;
  const isAccepted = finalDecision === 'accepted';
  const isRejected = finalDecision === 'rejected';
  const customMessage = settings?.student_visible_message;

  const appliedDate = new Date(application.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  const currentStageName = stages[currentStageIndex]?.label;

  return (
    <div
      className={`rounded-xl border bg-zinc-900 p-5 space-y-4 transition-all ${
        isAccepted
          ? 'border-emerald-400/30 hover:border-emerald-400/50'
          : isRejected
            ? 'border-white/8 hover:border-white/15'
            : 'border-white/10 hover:border-white/20'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display font-semibold text-white text-base truncate">{clubName}</p>
          <p className="text-xs text-zinc-500 mt-0.5 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {isQuickInterest ? 'Expressed interest' : 'Applied'} · {appliedDate}
            {application.updated_at !== application.created_at && (
              <span className="text-zinc-600"> · Updated {timeAgo(application.updated_at)}</span>
            )}
          </p>
        </div>

        {/* Status badge */}
        {isQuickInterest ? (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-white/10 shrink-0">
            Interested
          </span>
        ) : isAccepted ? (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-400/15 text-emerald-400 border border-emerald-400/25 shrink-0">
            Accepted
          </span>
        ) : isRejected ? (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-500 border border-white/8 shrink-0">
            Reviewed
          </span>
        ) : (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gold/10 text-gold border border-gold/20 shrink-0">
            In Review
          </span>
        )}
      </div>

      {/* Decision banner */}
      {isAccepted && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-400/10 border border-emerald-400/20">
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-emerald-400">You're in!</p>
            <p className="text-xs text-zinc-400">Congratulations — you've been accepted.</p>
          </div>
        </div>
      )}

      {isRejected && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-zinc-800/60 border border-white/8">
          <Info className="w-5 h-5 text-zinc-500 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-zinc-300">Application reviewed</p>
            <p className="text-xs text-zinc-500">
              Thank you for applying — it was a competitive cycle.
            </p>
          </div>
        </div>
      )}

      {/* Quick interest — complete application CTA */}
      {isQuickInterest && (
        <Link
          to={`/clubs/${application.club_id}/apply`}
          className="flex items-center justify-between w-full px-3 py-2.5 rounded-lg border border-gold/30 bg-gold/8 hover:bg-gold/15 transition-colors group"
        >
          <div>
            <p className="text-sm font-medium text-gold">Complete your application</p>
            <p className="text-xs text-zinc-500">Fill out the full form to be considered</p>
          </div>
          <ArrowRight className="w-4 h-4 text-gold group-hover:translate-x-0.5 transition-transform" />
        </Link>
      )}

      {/* Stage step tracker — full applications with stages */}
      {!isQuickInterest && stages.length > 0 && (
        <div>
          {/* Current stage callout */}
          {!finalDecision && currentStageName && (
            <p className="text-xs text-zinc-400 mb-3">
              Currently at: <span className="text-gold font-medium">{currentStageName}</span>
            </p>
          )}

          {/* Step dots with labels */}
          <div className="overflow-x-auto -mx-1 px-1">
            <div className="flex items-start min-w-max gap-0">
              {stages.map((stage, idx) => {
                const isCompleted = idx < currentStageIndex;
                const isCurrent = idx === currentStageIndex && !finalDecision;
                return (
                  <div key={stage.id} className="flex items-start">
                    <div
                      className="flex flex-col items-center gap-1.5"
                      style={{ minWidth: '68px' }}
                    >
                      {/* Circle */}
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold border-2 transition-all ${
                          isAccepted && idx <= currentStageIndex
                            ? 'bg-emerald-400/20 border-emerald-400 text-emerald-400'
                            : isCompleted
                              ? 'bg-emerald-400/15 border-emerald-400/70 text-emerald-400'
                              : isCurrent
                                ? 'bg-gold/20 border-gold text-gold shadow-[0_0_10px_rgba(212,175,55,0.25)]'
                                : 'bg-zinc-800 border-zinc-700 text-zinc-600'
                        }`}
                      >
                        {isCompleted || (isAccepted && idx <= currentStageIndex) ? '✓' : idx + 1}
                      </div>

                      {/* Label */}
                      <span
                        className={`text-[10px] text-center leading-tight px-0.5 ${
                          isCurrent
                            ? 'text-zinc-200 font-medium'
                            : isCompleted
                              ? 'text-emerald-400/60'
                              : 'text-zinc-600'
                        }`}
                        style={{ maxWidth: '64px' }}
                      >
                        {stage.label}
                      </span>
                    </div>

                    {/* Connector */}
                    {idx < stages.length - 1 && (
                      <div
                        className={`h-px mt-3.5 w-6 mx-0.5 rounded-full shrink-0 ${
                          idx < currentStageIndex ? 'bg-emerald-400/50' : 'bg-zinc-700'
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Custom message from club */}
      {customMessage && (
        <div className="px-3 py-2.5 rounded-lg bg-white/5 border border-white/8">
          <p className="text-xs text-zinc-400 leading-relaxed">{customMessage}</p>
        </div>
      )}

      {/* Fallback if no stage data */}
      {!isQuickInterest && stages.length === 0 && !customMessage && !finalDecision && (
        <p className="text-xs text-zinc-500">Your application is under review.</p>
      )}
    </div>
  );
}
