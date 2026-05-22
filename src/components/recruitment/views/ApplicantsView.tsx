import { useState, useMemo } from 'react';
import { Search, ChevronUp, ChevronDown, Star, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { RecruitmentStage, Applicant } from '@/hooks/useRecruitment';

interface ApplicantsViewProps {
  stages: RecruitmentStage[];
  applicants: Applicant[];
  onOpenDrawer: (applicant: Applicant) => void;
  onDeleteApplicant: (id: string) => Promise<boolean>;
  onBulkMove: (ids: string[], stageId: string) => Promise<void>;
}

type SortKey =
  | 'name'
  | 'stage'
  | 'major'
  | 'year'
  | 'gpa'
  | 'fit_score'
  | 'decision'
  | 'created_at';
type SortDir = 'asc' | 'desc';

const DECISION_COLORS: Record<string, string> = {
  accepted: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  rejected: 'text-red-400 bg-red-400/10 border-red-400/20',
  waitlisted: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  pending: 'text-zinc-500 bg-zinc-800 border-zinc-700',
};

function scoreColor(score: number): string {
  if (score >= 75) return 'text-emerald-400';
  if (score >= 50) return 'text-yellow-400';
  return 'text-red-400';
}

export function ApplicantsView({
  stages,
  applicants,
  onOpenDrawer,
  onDeleteApplicant,
  onBulkMove,
}: ApplicantsViewProps) {
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [decisionFilter, setDecisionFilter] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStageId, setBulkStageId] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  const stageMap = useMemo(() => Object.fromEntries(stages.map((s) => [s.id, s.label])), [stages]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return applicants
      .filter((a) => {
        if (q && !`${a.first_name} ${a.last_name} ${a.email}`.toLowerCase().includes(q))
          return false;
        if (stageFilter !== 'all' && a.stage_id !== stageFilter) return false;
        const dec = (a as any).final_decision ?? 'pending';
        if (decisionFilter !== 'all' && dec !== decisionFilter) return false;
        return true;
      })
      .sort((a, b) => {
        let va: any, vb: any;
        switch (sortKey) {
          case 'name':
            va = `${a.first_name} ${a.last_name}`;
            vb = `${b.first_name} ${b.last_name}`;
            break;
          case 'stage':
            va = stageMap[a.stage_id ?? ''] ?? '';
            vb = stageMap[b.stage_id ?? ''] ?? '';
            break;
          case 'major':
            va = a.major ?? '';
            vb = b.major ?? '';
            break;
          case 'year':
            va = a.year ?? '';
            vb = b.year ?? '';
            break;
          case 'gpa':
            va = a.gpa ?? -1;
            vb = b.gpa ?? -1;
            break;
          case 'fit_score':
            va = (a as any).fit_score ?? -1;
            vb = (b as any).fit_score ?? -1;
            break;
          case 'decision':
            va = (a as any).final_decision ?? '';
            vb = (b as any).final_decision ?? '';
            break;
          default:
            va = a.created_at;
            vb = b.created_at;
        }
        if (va < vb) return sortDir === 'asc' ? -1 : 1;
        if (va > vb) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });
  }, [applicants, search, stageFilter, decisionFilter, sortKey, sortDir, stageMap]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) =>
    sortKey === col ? (
      sortDir === 'asc' ? (
        <ChevronUp className="w-3 h-3" />
      ) : (
        <ChevronDown className="w-3 h-3" />
      )
    ) : (
      <ChevronDown className="w-3 h-3 opacity-30" />
    );

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((a) => a.id)));
  };

  const handleBulkMove = async () => {
    if (!bulkStageId || selected.size === 0) return;
    await onBulkMove([...selected], bulkStageId);
    setSelected(new Set());
    setBulkStageId('');
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleting(id);
    await onDeleteApplicant(id);
    setDeleting(null);
  };

  const thClass =
    'px-3 py-2.5 text-left text-[11px] font-semibold text-zinc-500 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:text-zinc-300 transition-colors';

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or email…"
            className="pl-8 h-8 bg-zinc-900 border-white/10 text-white text-sm"
          />
        </div>

        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          className="h-8 bg-zinc-900 border border-white/10 text-zinc-300 rounded-md px-2 text-sm"
        >
          <option value="all">All stages</option>
          {stages.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>

        <select
          value={decisionFilter}
          onChange={(e) => setDecisionFilter(e.target.value)}
          className="h-8 bg-zinc-900 border border-white/10 text-zinc-300 rounded-md px-2 text-sm"
        >
          <option value="all">All decisions</option>
          <option value="pending">Pending</option>
          <option value="accepted">Accepted</option>
          <option value="rejected">Rejected</option>
          <option value="waitlisted">Waitlisted</option>
        </select>

        <p className="text-xs text-zinc-600 ml-auto">
          {filtered.length} of {applicants.length}
        </p>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gold/8 border border-gold/20 shrink-0">
          <span className="text-xs text-gold font-medium">{selected.size} selected</span>
          <select
            value={bulkStageId}
            onChange={(e) => setBulkStageId(e.target.value)}
            className="h-7 bg-zinc-900 border border-white/10 text-zinc-300 rounded px-2 text-xs"
          >
            <option value="">Move to stage…</option>
            {stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <Button
            size="sm"
            onClick={handleBulkMove}
            disabled={!bulkStageId}
            className="h-7 bg-gold text-zinc-900 text-xs font-semibold hover:bg-gold/90 px-2"
          >
            Move
          </Button>
          <button
            onClick={() => setSelected(new Set())}
            className="text-xs text-zinc-500 hover:text-zinc-300 ml-1"
          >
            Clear
          </button>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto rounded-xl border border-white/8">
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 bg-zinc-950 z-10">
            <tr>
              <th className="px-3 py-2.5 w-8">
                <input
                  type="checkbox"
                  checked={selected.size === filtered.length && filtered.length > 0}
                  onChange={toggleAll}
                  className="accent-gold"
                />
              </th>
              <th className={thClass} onClick={() => toggleSort('name')}>
                <span className="flex items-center gap-1">
                  Name <SortIcon col="name" />
                </span>
              </th>
              <th className={thClass} onClick={() => toggleSort('stage')}>
                <span className="flex items-center gap-1">
                  Stage <SortIcon col="stage" />
                </span>
              </th>
              <th className={thClass} onClick={() => toggleSort('major')}>
                <span className="flex items-center gap-1">
                  Major <SortIcon col="major" />
                </span>
              </th>
              <th className={thClass} onClick={() => toggleSort('year')}>
                <span className="flex items-center gap-1">
                  Year <SortIcon col="year" />
                </span>
              </th>
              <th className={thClass} onClick={() => toggleSort('gpa')}>
                <span className="flex items-center gap-1">
                  GPA <SortIcon col="gpa" />
                </span>
              </th>
              <th className={thClass} onClick={() => toggleSort('fit_score')}>
                <span className="flex items-center gap-1">
                  AI Score <SortIcon col="fit_score" />
                </span>
              </th>
              <th className={thClass} onClick={() => toggleSort('decision')}>
                <span className="flex items-center gap-1">
                  Decision <SortIcon col="decision" />
                </span>
              </th>
              <th className={thClass} onClick={() => toggleSort('created_at')}>
                <span className="flex items-center gap-1">
                  Applied <SortIcon col="created_at" />
                </span>
              </th>
              <th className="px-3 py-2.5 w-8" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((applicant, i) => {
              const fitScore = (applicant as any).fit_score as number | null;
              const decision = (applicant as any).final_decision ?? 'pending';
              const isStandout = (applicant as any).is_standout;
              return (
                <tr
                  key={applicant.id}
                  onClick={() => onOpenDrawer(applicant)}
                  className={`border-t border-white/5 hover:bg-zinc-800/60 cursor-pointer transition-colors ${
                    i % 2 === 0 ? 'bg-transparent' : 'bg-zinc-900/30'
                  } ${selected.has(applicant.id) ? 'bg-gold/5' : ''}`}
                >
                  <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected.has(applicant.id)}
                      onChange={() => toggleSelect(applicant.id)}
                      className="accent-gold"
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      {isStandout && <Star className="w-3 h-3 text-gold fill-gold shrink-0" />}
                      <span className="font-medium text-white">
                        {applicant.first_name} {applicant.last_name}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-500">{applicant.email}</p>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-xs text-zinc-400">
                      {stageMap[applicant.stage_id ?? ''] ?? '—'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-zinc-400 text-xs">{applicant.major ?? '—'}</td>
                  <td className="px-3 py-2.5 text-zinc-400 text-xs">{applicant.year ?? '—'}</td>
                  <td className="px-3 py-2.5 text-zinc-400 text-xs">{applicant.gpa ?? '—'}</td>
                  <td className="px-3 py-2.5">
                    {fitScore !== null && fitScore !== undefined ? (
                      <span className={`text-xs font-semibold ${scoreColor(fitScore)}`}>
                        {fitScore}
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-600">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border capitalize ${DECISION_COLORS[decision] ?? DECISION_COLORS.pending}`}
                    >
                      {decision}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-zinc-500 text-xs whitespace-nowrap">
                    {new Date(applicant.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </td>
                  <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => handleDelete(applicant.id, e)}
                      disabled={deleting === applicant.id}
                      className="p-1 text-zinc-700 hover:text-red-400 transition-colors rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center text-zinc-600 text-sm">
                  No applicants match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
