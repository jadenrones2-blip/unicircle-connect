import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import type { StudentRecruitmentData } from '@/hooks/useStudentRecruitment';

interface RecruitmentTrackerCardProps {
  data: StudentRecruitmentData;
}

export default function RecruitmentTrackerCard({ data }: RecruitmentTrackerCardProps) {
  const { application, stages, settings, currentStageIndex, progressPercent, clubName } = data;

  const isQuickInterest = application.is_quick_interest;
  const isComplete = !isQuickInterest && currentStageIndex === stages.length - 1 && stages.length > 0;

  const showProgressBar = settings?.show_progress_bar ?? true;
  const showStageNames = settings?.show_stage_names ?? false;
  const customMessage = settings?.student_visible_message;

  const formattedDate = new Date(application.created_at).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
  });

  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900 p-5 space-y-4 hover:border-white/20 transition-colors">

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display font-semibold text-white text-base truncate">{clubName}</p>
          <p className="text-xs text-zinc-500 mt-0.5">
            {isQuickInterest ? 'Expressed interest' : 'Applied'} · {formattedDate}
          </p>
        </div>
        {isQuickInterest ? (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-white/10 shrink-0">
            Interested
          </span>
        ) : isComplete ? (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 shrink-0">
            Complete
          </span>
        ) : (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gold/10 text-gold border border-gold/20 shrink-0">
            In Review
          </span>
        )}
      </div>

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

      {/* Progress bar — full applications only */}
      {!isQuickInterest && showProgressBar && stages.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-zinc-500">Progress</span>
            <span className="text-zinc-300 font-medium">{progressPercent}%</span>
          </div>
          <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gold rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Stage dots */}
      {!isQuickInterest && stages.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          {stages.map((stage, idx) => (
            <div key={stage.id} className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full shrink-0 ${
                idx < currentStageIndex ? 'bg-emerald-400' :
                idx === currentStageIndex ? 'bg-gold' :
                'bg-zinc-700'
              }`} />
              {showStageNames && (
                <span className={`text-[10px] ${
                  idx === currentStageIndex ? 'text-zinc-300' : 'text-zinc-600'
                }`}>
                  {stage.label}
                </span>
              )}
              {idx < stages.length - 1 && (
                <div className={`h-px w-3 ${idx < currentStageIndex ? 'bg-emerald-400/60' : 'bg-zinc-700'}`} />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Custom message from club */}
      {customMessage && (
        <div className="px-3 py-2.5 rounded-lg bg-white/5 border border-white/8">
          <p className="text-xs text-zinc-400 leading-relaxed">{customMessage}</p>
        </div>
      )}

      {/* Minimal fallback */}
      {!isQuickInterest && !showProgressBar && stages.length === 0 && !customMessage && (
        <p className="text-xs text-zinc-500">Your application is being reviewed.</p>
      )}
    </div>
  );
}
