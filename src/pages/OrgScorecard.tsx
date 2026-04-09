import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { ClubAdminSidebar } from '@/components/club-admin/ClubAdminSidebar';
import { AdminBreadcrumb } from '@/components/club-admin/AdminBreadcrumb';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, ThumbsUp, ThumbsDown, Minus, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { toast } from 'sonner';
import { useClubOwnership } from '@/hooks/useClubOwnership';

const DECISION_COLORS: Record<string, string> = {
  accepted: '#22c55e',
  rejected: '#ef4444',
  pending: '#a1a1aa',
  waitlisted: '#eab308',
};

const DECISION_LABELS: Record<string, string> = {
  accepted: 'Accepted',
  rejected: 'Rejected',
  pending: 'Pending',
  waitlisted: 'Waitlisted',
};

interface VoteTally {
  yes: number;
  no: number;
  maybe: number;
}

interface ScorecardRow {
  id: string;
  first_name: string;
  last_name: string;
  stageLabel: string;
  stageColor: string;
  major: string | null;
  year: string | null;
  fit_score: number | null;
  tally: VoteTally;
  totalVotes: number;
  final_decision: string | null;
}

type SortKey = 'name' | 'fit' | 'votes' | 'stage';
type SortDir = 'asc' | 'desc';

const STAGE_PALETTE = [
  '#3b82f6', '#a855f7', '#f97316', '#06b6d4', '#10b981', '#ec4899',
];

function FitCell({ value }: { value: number | null }) {
  if (value == null) return <span className="text-zinc-700">—</span>;
  const pct = Math.round(value);
  const color = pct >= 75 ? '#22c55e' : pct >= 50 ? '#eab308' : '#ef4444';
  return (
    <span
      className="inline-flex items-center justify-center px-2 py-0.5 rounded-md text-xs font-bold"
      style={{ background: color + '22', color }}
    >
      {pct}%
    </span>
  );
}

function VoteCell({ tally }: { tally: VoteTally }) {
  const total = tally.yes + tally.no + tally.maybe;
  if (total === 0) return <span className="text-zinc-700">—</span>;
  return (
    <div className="flex items-center gap-2 text-xs">
      {tally.yes > 0 && (
        <span className="flex items-center gap-1 text-emerald-400">
          <ThumbsUp className="w-3 h-3" />{tally.yes}
        </span>
      )}
      {tally.maybe > 0 && (
        <span className="flex items-center gap-1 text-yellow-400">
          <Minus className="w-3 h-3" />{tally.maybe}
        </span>
      )}
      {tally.no > 0 && (
        <span className="flex items-center gap-1 text-red-400">
          <ThumbsDown className="w-3 h-3" />{tally.no}
        </span>
      )}
    </div>
  );
}

export default function OrgScorecard() {
  const { clubId } = useParams<{ clubId: string }>();
  const { ownedClubs } = useClubOwnership();
  const clubName = ownedClubs.find(c => c.clubId === clubId)?.clubName || 'Club';

  const [rows, setRows] = useState<ScorecardRow[]>([]);
  const [stageLabels, setStageLabels] = useState<{ id: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [decisionFilter, setDecisionFilter] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('fit');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  useEffect(() => {
    if (!clubId) return;
    (async () => {
      setLoading(true);

      // Fetch stages
      const { data: stages, error: stagesError } = await supabase
        .from('recruitment_stages')
        .select('id, label, order_index')
        .eq('club_id', clubId)
        .order('order_index', { ascending: true });

      if (stagesError) { toast.error('Failed to load stages'); setLoading(false); return; }

      const stageMap: Record<string, { label: string; color: string }> = {};
      (stages || []).forEach((s, i) => {
        stageMap[s.id] = { label: s.label, color: STAGE_PALETTE[i % STAGE_PALETTE.length] };
      });
      setStageLabels((stages || []).map(s => ({ id: s.id, label: s.label })));

      // Fetch applicants
      const { data: applicants, error: appError } = await supabase
        .from('applicants')
        .select('id, first_name, last_name, major, year, stage_id, fit_score, final_decision')
        .eq('club_id', clubId);

      if (appError) { toast.error('Failed to load applicants'); setLoading(false); return; }
      if (!applicants?.length) { setRows([]); setLoading(false); return; }

      const applicantIds = applicants.map((a: any) => a.id);

      // Fetch votes
      const { data: votes } = await (supabase as any)
        .from('deliberation_votes')
        .select('applicant_id, vote')
        .in('applicant_id', applicantIds);

      // Tally votes per applicant
      const tallyMap: Record<string, VoteTally> = {};
      for (const v of votes || []) {
        if (!tallyMap[v.applicant_id]) tallyMap[v.applicant_id] = { yes: 0, no: 0, maybe: 0 };
        if (v.vote === 'yes') tallyMap[v.applicant_id].yes++;
        else if (v.vote === 'no') tallyMap[v.applicant_id].no++;
        else if (v.vote === 'maybe') tallyMap[v.applicant_id].maybe++;
      }

      const scorecardRows: ScorecardRow[] = applicants.map((a: any) => {
        const stage = a.stage_id ? stageMap[a.stage_id] : null;
        const tally = tallyMap[a.id] || { yes: 0, no: 0, maybe: 0 };
        return {
          id: a.id,
          first_name: a.first_name,
          last_name: a.last_name,
          stageLabel: stage?.label || 'Unknown',
          stageColor: stage?.color || '#71717a',
          major: a.major,
          year: a.year,
          fit_score: a.fit_score,
          tally,
          totalVotes: tally.yes + tally.no + tally.maybe,
          final_decision: a.final_decision,
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

  const filtered = rows.filter(r => {
    if (stageFilter !== 'all' && r.stageLabel !== stageFilter) return false;
    if (decisionFilter !== 'all' && (r.final_decision || 'pending') !== decisionFilter) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sortKey === 'fit') {
      cmp = (a.fit_score ?? -1) - (b.fit_score ?? -1);
    } else if (sortKey === 'votes') {
      cmp = a.totalVotes - b.totalVotes;
    } else if (sortKey === 'stage') {
      cmp = a.stageLabel.localeCompare(b.stageLabel);
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

  // Count by stage label
  const stageCounts = stageLabels.reduce((acc, s) => {
    acc[s.label] = rows.filter(r => r.stageLabel === s.label).length;
    return acc;
  }, {} as Record<string, number>);

  const decisionOptions = ['pending', 'accepted', 'rejected', 'waitlisted'];
  const decisionCounts = decisionOptions.reduce((acc, d) => {
    acc[d] = rows.filter(r => (r.final_decision || 'pending') === d).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full overflow-hidden" style={{ background: '#0A0A0A' }}>
        <ClubAdminSidebar />
        <main className="flex-1 flex flex-col min-h-screen min-w-0 overflow-hidden">
          <header className="h-14 flex items-center px-4 gap-3 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <SidebarTrigger className="text-zinc-500 hover:text-white transition-colors" />
            <AdminBreadcrumb items={[
              { label: clubName, href: `/club-admin/clubs/${clubId}/events` },
              { label: 'Scorecard' }
            ]} />
          </header>

          <div className="flex-1 p-5 sm:p-7 overflow-auto">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h1 className="text-xl font-display font-bold text-white">Scorecard</h1>
                <p className="text-zinc-500 text-sm mt-0.5">
                  {sorted.length} of {rows.length} applicant{rows.length !== 1 ? 's' : ''}
                </p>
              </div>
              <Link
                to={`/club-admin/clubs/${clubId}/recruitment`}
                className="px-3 py-1.5 rounded-lg border border-white/10 text-zinc-300 text-sm hover:bg-white/5 transition-colors"
              >
                ← Pipeline
              </Link>
            </div>

            {/* Stage filter pills */}
            {stageLabels.length > 0 && (
              <div className="flex gap-2 flex-wrap mb-3">
                <button
                  onClick={() => setStageFilter('all')}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${stageFilter === 'all' ? 'bg-gold text-zinc-900' : 'bg-white/5 text-zinc-400 hover:bg-white/10'}`}
                >
                  All Stages ({rows.length})
                </button>
                {stageLabels.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setStageFilter(s.label)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${stageFilter === s.label ? 'bg-white/15 text-white' : 'bg-white/5 text-zinc-400 hover:bg-white/10'}`}
                  >
                    {s.label} ({stageCounts[s.label] || 0})
                  </button>
                ))}
              </div>
            )}

            {/* Decision filter pills */}
            <div className="flex gap-2 flex-wrap mb-5">
              <button
                onClick={() => setDecisionFilter('all')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${decisionFilter === 'all' ? 'bg-gold text-zinc-900' : 'bg-white/5 text-zinc-400 hover:bg-white/10'}`}
              >
                All Decisions
              </button>
              {decisionOptions.filter(d => decisionCounts[d] > 0).map(d => (
                <button
                  key={d}
                  onClick={() => setDecisionFilter(d)}
                  className="px-3 py-1 rounded-full text-xs font-medium transition-colors"
                  style={decisionFilter === d
                    ? { background: DECISION_COLORS[d], color: '#fff' }
                    : { background: 'rgba(255,255,255,0.05)', color: '#a1a1aa' }}
                >
                  {DECISION_LABELS[d]} ({decisionCounts[d]})
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
                  ? 'No applicants yet. Share the apply link to start collecting applications.'
                  : 'No results for the selected filters.'}
              </div>
            ) : (
              <div className="rounded-xl border border-white/10 overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.02]">
                      <th className="px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-left w-10">#</th>
                      <th className="px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-left">
                        <button onClick={() => handleSort('name')} className="flex items-center hover:text-zinc-300 transition-colors">
                          Name <SortIcon col="name" />
                        </button>
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-left">
                        <button onClick={() => handleSort('stage')} className="flex items-center hover:text-zinc-300 transition-colors">
                          Stage <SortIcon col="stage" />
                        </button>
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-left">
                        <button onClick={() => handleSort('fit')} className="flex items-center hover:text-zinc-300 transition-colors">
                          AI Fit <SortIcon col="fit" />
                        </button>
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-left">
                        <button onClick={() => handleSort('votes')} className="flex items-center hover:text-zinc-300 transition-colors">
                          Votes <SortIcon col="votes" />
                        </button>
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-left">Decision</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((row, i) => (
                      <tr
                        key={row.id}
                        className={`border-b border-white/5 hover:bg-white/[0.03] transition-colors ${i === sorted.length - 1 ? 'border-0' : ''}`}
                      >
                        <td className="px-4 py-3 text-zinc-600 font-mono text-xs">{i + 1}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-white">{row.first_name} {row.last_name}</div>
                          {(row.major || row.year) && (
                            <div className="text-xs text-zinc-500 mt-0.5">
                              {[row.major, row.year].filter(Boolean).join(' · ')}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
                            style={{ background: row.stageColor + '22', color: row.stageColor }}
                          >
                            {row.stageLabel}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <FitCell value={row.fit_score} />
                        </td>
                        <td className="px-4 py-3">
                          <VoteCell tally={row.tally} />
                        </td>
                        <td className="px-4 py-3">
                          {row.final_decision && row.final_decision !== 'pending' ? (
                            <span
                              className="px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
                              style={{
                                background: (DECISION_COLORS[row.final_decision] || '#71717a') + '22',
                                color: DECISION_COLORS[row.final_decision] || '#71717a',
                              }}
                            >
                              {DECISION_LABELS[row.final_decision] || row.final_decision}
                            </span>
                          ) : (
                            <span className="text-zinc-600 text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
