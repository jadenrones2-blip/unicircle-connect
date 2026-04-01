import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { ClubAdminSidebar } from '@/components/club-admin/ClubAdminSidebar';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Star, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { toast } from 'sonner';

const STAGES = ['member', 'applied', 'under_review', 'interview', 'accepted', 'rejected'] as const;
type Stage = typeof STAGES[number];

const STAGE_COLORS: Record<Stage, string> = {
  member: '#b8860b',
  applied: '#3b82f6',
  under_review: '#eab308',
  interview: '#a855f7',
  accepted: '#22c55e',
  rejected: '#ef4444',
};

const STAGE_LABELS: Record<Stage, string> = {
  member: 'Member',
  applied: 'Applied',
  under_review: 'Under Review',
  interview: 'Interview',
  accepted: 'Accepted',
  rejected: 'Rejected',
};

interface ReviewerScore {
  culture_fit: number | null;
  experience: number | null;
  involvement: number | null;
  avg: number | null;
}

interface ScorecardRow {
  id: string;
  first_name: string;
  last_name: string;
  stage: Stage;
  major: string | null;
  year: string | null;
  reviewerScores: Record<string, ReviewerScore>; // reviewer_id → scores
  overallAvg: number | null;
  reviewCount: number;
}

function ScoreCell({ value }: { value: number | null }) {
  if (value == null) return <span className="text-zinc-700">—</span>;
  const color = value >= 4 ? '#22c55e' : value >= 3 ? '#eab308' : '#ef4444';
  return (
    <span className="inline-flex items-center justify-center w-7 h-7 rounded-md text-xs font-bold"
      style={{ background: color + '22', color }}>
      {value}
    </span>
  );
}

function AvgCell({ value }: { value: number | null }) {
  if (value == null) return <span className="text-zinc-600 text-sm">—</span>;
  const color = value >= 4 ? '#22c55e' : value >= 3 ? '#eab308' : '#ef4444';
  return (
    <span className="flex items-center gap-1 font-bold text-sm" style={{ color }}>
      <Star className="w-3.5 h-3.5 fill-current" />
      {value.toFixed(1)}
    </span>
  );
}

type SortKey = 'name' | 'avg' | 'reviews';
type SortDir = 'asc' | 'desc';

export default function OrgScorecard() {
  const { clubId } = useParams<{ clubId: string }>();
  const [rows, setRows] = useState<ScorecardRow[]>([]);
  const [reviewers, setReviewers] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [stageFilter, setStageFilter] = useState<Stage | 'all'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('avg');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  useEffect(() => {
    if (!clubId) return;
    (async () => {
      setLoading(true);

      // Fetch all people
      const { data: people, error: peopleError } = await (supabase as any)
        .from('people')
        .select('id, first_name, last_name, stage, major, year')
        .eq('organization_id', clubId);

      if (peopleError) { toast.error('Failed to load people'); setLoading(false); return; }
      if (!people?.length) { setRows([]); setLoading(false); return; }

      const personIds = people.map((p: any) => p.id);

      // Fetch all reviews for these people
      const { data: reviews } = await (supabase as any)
        .from('reviews')
        .select('person_id, reviewer_id, culture_fit, experience, involvement')
        .in('person_id', personIds);

      // Collect unique reviewer IDs
      const reviewerIds = [...new Set((reviews || []).map((r: any) => r.reviewer_id))] as string[];

      // Fetch reviewer display names
      let nameMap: Record<string, string> = {};
      if (reviewerIds.length > 0) {
        const { data: profiles } = await (supabase as any)
          .from('admin_profiles')
          .select('user_id, display_name')
          .in('user_id', reviewerIds);
        (profiles || []).forEach((p: any) => { nameMap[p.user_id] = p.display_name || 'Anonymous'; });
      }

      // Build reviewer list (stable order)
      const reviewerList = reviewerIds.map(id => ({ id, name: nameMap[id] || 'Anonymous' }));
      setReviewers(reviewerList);

      // Group reviews by person
      const reviewsByPerson: Record<string, any[]> = {};
      (reviews || []).forEach((r: any) => {
        if (!reviewsByPerson[r.person_id]) reviewsByPerson[r.person_id] = [];
        reviewsByPerson[r.person_id].push(r);
      });

      // Build scorecard rows
      const scorecardRows: ScorecardRow[] = people.map((p: any) => {
        const personReviews = reviewsByPerson[p.id] || [];
        const reviewerScores: Record<string, ReviewerScore> = {};

        personReviews.forEach((r: any) => {
          const scores = [r.culture_fit, r.experience, r.involvement].filter((s): s is number => s != null);
          reviewerScores[r.reviewer_id] = {
            culture_fit: r.culture_fit,
            experience: r.experience,
            involvement: r.involvement,
            avg: scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null,
          };
        });

        // Overall avg across all reviews
        const allScores: number[] = [];
        personReviews.forEach((r: any) => {
          [r.culture_fit, r.experience, r.involvement].forEach(s => { if (s != null) allScores.push(s); });
        });

        return {
          id: p.id,
          first_name: p.first_name,
          last_name: p.last_name,
          stage: p.stage as Stage,
          major: p.major,
          year: p.year,
          reviewerScores,
          overallAvg: allScores.length ? allScores.reduce((a, b) => a + b, 0) / allScores.length : null,
          reviewCount: personReviews.length,
        };
      });

      setRows(scorecardRows);
      setLoading(false);
    })();
  }, [clubId]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const filtered = rows.filter(r => stageFilter === 'all' || r.stage === stageFilter);

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sortKey === 'avg') {
      const aVal = a.overallAvg ?? -1;
      const bVal = b.overallAvg ?? -1;
      cmp = aVal - bVal;
    } else if (sortKey === 'reviews') {
      cmp = a.reviewCount - b.reviewCount;
    } else {
      cmp = `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`);
    }
    return sortDir === 'desc' ? -cmp : cmp;
  });

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ArrowUpDown className="w-3 h-3 text-zinc-600 ml-1" />;
    return sortDir === 'desc'
      ? <ArrowDown className="w-3 h-3 text-gold ml-1" />
      : <ArrowUp className="w-3 h-3 text-gold ml-1" />;
  }

  const stageCounts = STAGES.reduce((acc, s) => {
    acc[s] = rows.filter(r => r.stage === s).length;
    return acc;
  }, {} as Record<Stage, number>);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full" style={{ background: '#0A0A0A' }}>
        <ClubAdminSidebar />
        <main className="flex-1 p-6 overflow-auto">
          <SidebarTrigger className="mb-4" />

          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-display font-bold text-white">Scorecard</h1>
              <p className="text-zinc-500 text-sm mt-0.5">
                {sorted.length} {sorted.length === 1 ? 'person' : 'people'} · {reviewers.length} {reviewers.length === 1 ? 'reviewer' : 'reviewers'}
              </p>
            </div>
            <div className="flex gap-2">
              <Link to={`/club-admin/clubs/${clubId}/people`}>
                <button className="px-3 py-1.5 rounded-lg border border-white/10 text-zinc-300 text-sm hover:bg-white/5 transition-colors">
                  List View
                </button>
              </Link>
              <Link to={`/club-admin/clubs/${clubId}/pipeline`}>
                <button className="px-3 py-1.5 rounded-lg border border-white/10 text-zinc-300 text-sm hover:bg-white/5 transition-colors">
                  Pipeline
                </button>
              </Link>
            </div>
          </div>

          {/* Stage filter tabs */}
          <div className="flex gap-2 flex-wrap mb-6">
            <button
              onClick={() => setStageFilter('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${stageFilter === 'all' ? 'bg-white text-black' : 'bg-white/5 text-zinc-400 hover:bg-white/10'}`}
            >
              All ({rows.length})
            </button>
            {STAGES.map(s => (
              <button
                key={s}
                onClick={() => setStageFilter(s)}
                className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
                style={stageFilter === s
                  ? { background: STAGE_COLORS[s], color: '#000' }
                  : { background: 'rgba(255,255,255,0.05)', color: '#a1a1aa' }}
              >
                {STAGE_LABELS[s]} ({stageCounts[s]})
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-6 h-6 text-gold animate-spin" />
            </div>
          ) : sorted.length === 0 ? (
            <div className="text-center py-20 text-zinc-500">
              {rows.length === 0
                ? 'No people yet. Add people and submit reviews to see the scorecard.'
                : 'No results for this stage.'}
            </div>
          ) : (
            <div className="rounded-xl border border-white/10 overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02]">
                    {/* Rank */}
                    <th className="px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-left w-10">#</th>

                    {/* Name — sortable */}
                    <th className="px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-left">
                      <button onClick={() => handleSort('name')} className="flex items-center hover:text-zinc-300 transition-colors">
                        Name <SortIcon col="name" />
                      </button>
                    </th>

                    {/* Stage */}
                    <th className="px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-left">Stage</th>

                    {/* Per-reviewer columns: 3 sub-cols each */}
                    {reviewers.map(r => (
                      <th key={r.id} colSpan={3} className="px-2 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-center border-l border-white/5">
                        <div className="truncate max-w-[120px] mx-auto">{r.name}</div>
                        <div className="flex justify-center gap-3 text-[10px] text-zinc-600 font-normal mt-1 normal-case tracking-normal">
                          <span>Cult</span><span>Exp</span><span>Inv</span>
                        </div>
                      </th>
                    ))}

                    {/* Reviews count — sortable */}
                    <th className="px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-center border-l border-white/5">
                      <button onClick={() => handleSort('reviews')} className="flex items-center mx-auto hover:text-zinc-300 transition-colors">
                        Reviews <SortIcon col="reviews" />
                      </button>
                    </th>

                    {/* Overall avg — sortable */}
                    <th className="px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-left border-l border-white/5">
                      <button onClick={() => handleSort('avg')} className="flex items-center hover:text-zinc-300 transition-colors">
                        Avg <SortIcon col="avg" />
                      </button>
                    </th>

                    <th className="px-4 py-3 w-8" />
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((row, i) => (
                    <tr
                      key={row.id}
                      className={`border-b border-white/5 hover:bg-white/[0.03] transition-colors ${i === sorted.length - 1 ? 'border-0' : ''}`}
                    >
                      {/* Rank */}
                      <td className="px-4 py-3 text-zinc-600 font-mono text-xs">{i + 1}</td>

                      {/* Name */}
                      <td className="px-4 py-3">
                        <div className="font-medium text-white">{row.first_name} {row.last_name}</div>
                        {(row.major || row.year) && (
                          <div className="text-xs text-zinc-500 mt-0.5">
                            {[row.major, row.year].filter(Boolean).join(' · ')}
                          </div>
                        )}
                      </td>

                      {/* Stage */}
                      <td className="px-4 py-3">
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
                          style={{ background: STAGE_COLORS[row.stage] + '22', color: STAGE_COLORS[row.stage] }}
                        >
                          {STAGE_LABELS[row.stage]}
                        </span>
                      </td>

                      {/* Per-reviewer scores */}
                      {reviewers.map(r => {
                        const s = row.reviewerScores[r.id];
                        return (
                          <td key={r.id} colSpan={3} className="border-l border-white/5">
                            <div className="flex items-center justify-center gap-2 px-2 py-3">
                              <ScoreCell value={s?.culture_fit ?? null} />
                              <ScoreCell value={s?.experience ?? null} />
                              <ScoreCell value={s?.involvement ?? null} />
                            </div>
                          </td>
                        );
                      })}

                      {/* Review count */}
                      <td className="px-4 py-3 text-center text-zinc-500 text-xs border-l border-white/5">
                        {row.reviewCount}
                      </td>

                      {/* Overall avg */}
                      <td className="px-4 py-3 border-l border-white/5">
                        <AvgCell value={row.overallAvg} />
                      </td>

                      {/* Link */}
                      <td className="px-4 py-3 text-right">
                        <Link
                          to={`/club-admin/clubs/${clubId}/people/${row.id}`}
                          className="text-zinc-500 hover:text-white transition-colors"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>
    </SidebarProvider>
  );
}
