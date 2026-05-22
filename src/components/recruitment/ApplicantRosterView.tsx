import { useState, useMemo } from 'react';
import { Search, GraduationCap, Mail, Star } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ApplicantAvatar } from './ApplicantCard';
import type { RecruitmentStage, Applicant } from '@/hooks/useRecruitment';

interface ApplicantRosterViewProps {
  stages: RecruitmentStage[];
  applicants: Applicant[];
  onOpenDrawer?: (applicant: Applicant) => void;
}

const DECISION_STYLES: Record<string, string> = {
  accepted: 'bg-green-500/10 text-green-400 border-green-500/20',
  rejected: 'bg-red-500/10 text-red-400 border-red-500/20',
  waitlisted: 'bg-gold/10 text-gold border-gold/20',
  pending: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
};

export function ApplicantRosterView({
  stages,
  applicants,
  onOpenDrawer,
}: ApplicantRosterViewProps) {
  const [search, setSearch] = useState('');
  const [filterStage, setFilterStage] = useState('all');

  const getStageName = (stageId: string | null) =>
    stages.find((s) => s.id === stageId)?.label ?? 'Unassigned';

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return applicants.filter((a) => {
      const matchesSearch =
        !q ||
        `${a.first_name} ${a.last_name}`.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) ||
        (a.major ?? '').toLowerCase().includes(q);
      const matchesStage = filterStage === 'all' || a.stage_id === filterStage;
      return matchesSearch && matchesStage;
    });
  }, [applicants, search, filterStage]);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, major…"
            className="pl-9 bg-zinc-900 border-white/10 text-white placeholder:text-zinc-600 h-9"
          />
        </div>

        {/* Stage filter pills */}
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setFilterStage('all')}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              filterStage === 'all'
                ? 'bg-white/10 border-white/20 text-white'
                : 'border-white/10 text-zinc-500 hover:text-zinc-300'
            }`}
          >
            All ({applicants.length})
          </button>
          {stages.map((s) => {
            const count = applicants.filter((a) => a.stage_id === s.id).length;
            return (
              <button
                key={s.id}
                onClick={() => setFilterStage(s.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  filterStage === s.id
                    ? 'bg-white/10 border-white/20 text-white'
                    : 'border-white/10 text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {s.label} ({count})
              </button>
            );
          })}
        </div>

        <p className="text-xs text-zinc-600 ml-auto">
          {filtered.length} of {applicants.length} applicant{applicants.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Roster grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-white/10 rounded-xl">
          <p className="text-sm text-zinc-500">No applicants match your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((applicant) => {
            const extended = applicant as unknown as {
              fit_score?: number;
              ai_summary?: string;
              is_standout?: boolean;
              final_decision?: string;
            };
            const isStandout =
              extended.is_standout ??
              ((extended.fit_score ?? 0) >= 85 &&
                (applicant as any).passes_strict_filters !== false);
            const decision = extended.final_decision ?? 'pending';

            return (
              <button
                key={applicant.id}
                type="button"
                onClick={() => onOpenDrawer?.(applicant)}
                className={`w-full text-left rounded-xl border p-4 transition-colors hover:bg-zinc-800/50 ${
                  isStandout ? 'border-gold/30 bg-gold/5' : 'border-white/10 bg-zinc-900/60'
                }`}
              >
                {/* Top row: avatar + name + standout star */}
                <div className="flex items-center gap-3 mb-3">
                  <ApplicantAvatar
                    firstName={applicant.first_name}
                    lastName={applicant.last_name}
                    avatarUrl={(applicant as any).avatar_url}
                    size="lg"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      {isStandout && <Star className="w-3.5 h-3.5 text-gold fill-gold shrink-0" />}
                      <p className="font-semibold text-sm text-white truncate">
                        {applicant.first_name} {applicant.last_name}
                      </p>
                    </div>
                    <p className="text-xs text-zinc-500 truncate">{applicant.email}</p>
                  </div>
                </div>

                {/* Demographics row */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {applicant.major && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 border border-white/8 text-xs text-zinc-400">
                      <GraduationCap className="w-3 h-3" />
                      {applicant.major}
                    </span>
                  )}
                  {applicant.year && (
                    <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/8 text-xs text-zinc-400">
                      {applicant.year}
                    </span>
                  )}
                  {applicant.gpa !== null && applicant.gpa !== undefined && (
                    <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/8 text-xs text-zinc-400">
                      GPA {applicant.gpa}
                    </span>
                  )}
                </div>

                {/* Bottom row: stage + decision + AI score */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge variant="outline" className="text-zinc-400 border-white/10 text-xs">
                      {getStageName(applicant.stage_id)}
                    </Badge>
                    {decision !== 'pending' && (
                      <Badge
                        className={`text-xs border ${DECISION_STYLES[decision] ?? DECISION_STYLES.pending}`}
                      >
                        {decision.charAt(0).toUpperCase() + decision.slice(1)}
                      </Badge>
                    )}
                  </div>
                  {extended.fit_score !== undefined && extended.fit_score !== null && (
                    <span className="flex items-center gap-1 text-xs text-zinc-500">
                      {extended.fit_score}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
