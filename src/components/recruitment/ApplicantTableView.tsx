import { useState, useMemo } from 'react';
import {
  Sparkles,
  Filter,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Loader2,
  RotateCcw,
  Trash2,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { RecruitmentStage, Applicant } from '@/hooks/useRecruitment';

interface ApplicantTableViewProps {
  clubId: string;
  stages: RecruitmentStage[];
  applicants: Applicant[];
  onMoveApplicant: (applicantId: string, newStageId: string) => Promise<boolean>;
  onDeleteApplicant: (id: string) => Promise<boolean>;
  onRefresh: () => Promise<void>;
}

type SortField = 'name' | 'fit_score' | 'created_at';
type SortOrder = 'asc' | 'desc';

export function ApplicantTableView({
  clubId,
  stages,
  applicants,
  onMoveApplicant,
  onDeleteApplicant,
  onRefresh,
}: ApplicantTableViewProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [screening, setScreening] = useState(false);
  const [bulkMoving, setBulkMoving] = useState(false);
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [filterStage, setFilterStage] = useState<string>('all');
  const [filterStrictPass, setFilterStrictPass] = useState<string>('all');

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredApplicants.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredApplicants.map((a) => a.id)));
    }
  };

  const filteredApplicants = useMemo(() => {
    let result = [...applicants];

    if (filterStage !== 'all') {
      result = result.filter((a) => a.stage_id === filterStage);
    }

    if (filterStrictPass === 'pass') {
      result = result.filter((a) => (a as unknown as { passes_strict_filters?: boolean }).passes_strict_filters === true);
    } else if (filterStrictPass === 'fail') {
      result = result.filter((a) => (a as unknown as { passes_strict_filters?: boolean }).passes_strict_filters === false);
    }

    // Sort
    result.sort((a, b) => {
      let valA: string | number | null;
      let valB: string | number | null;

      if (sortField === 'name') {
        valA = `${a.first_name} ${a.last_name}`.toLowerCase();
        valB = `${b.first_name} ${b.last_name}`.toLowerCase();
      } else if (sortField === 'fit_score') {
        valA = (a as unknown as { fit_score?: number }).fit_score ?? -1;
        valB = (b as unknown as { fit_score?: number }).fit_score ?? -1;
      } else {
        valA = a.created_at;
        valB = b.created_at;
      }

      if (valA === null) return 1;
      if (valB === null) return -1;
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [applicants, filterStage, filterStrictPass, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const getStageName = (stageId: string | null) => {
    if (!stageId) return 'Unassigned';
    const stage = stages.find((s) => s.id === stageId);
    return stage?.label || 'Unknown';
  };

  const getFitScoreBadge = (score: number | null | undefined) => {
    if (score === null || score === undefined) {
      return <Badge variant="outline">Not scored</Badge>;
    }
    if (score >= 80) {
      return <Badge variant="default" className="bg-accent/20 text-accent border-accent/30">{score}</Badge>;
    }
    if (score >= 60) {
      return <Badge className="bg-gold/10 text-gold border-gold/20">{score}</Badge>;
    }
    if (score >= 40) {
      return <Badge variant="secondary">{score}</Badge>;
    }
    return <Badge variant="destructive">{score}</Badge>;
  };

  const runAIScreening = async () => {
    if (selectedIds.size === 0) {
      toast.error('Select applicants to screen');
      return;
    }

    setScreening(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session) {
        toast.error('Please log in');
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-screen-applicants`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.session.access_token}`,
          },
          body: JSON.stringify({
            club_id: clubId,
            applicant_ids: Array.from(selectedIds),
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Screening failed');
      }

      const result = await response.json();
      toast.success(`Screened ${result.results.length} applicant(s)`);
      await onRefresh();
      setSelectedIds(new Set());
    } catch (error) {
      console.error('Screening error:', error);
      toast.error(error instanceof Error ? error.message : 'Screening failed');
    } finally {
      setScreening(false);
    }
  };

  const bulkMoveToStage = async (stageId: string) => {
    if (selectedIds.size === 0) return;

    setBulkMoving(true);
    let successCount = 0;

    for (const id of selectedIds) {
      const success = await onMoveApplicant(id, stageId);
      if (success) successCount++;
    }

    toast.success(`Moved ${successCount} applicant(s)`);
    setSelectedIds(new Set());
    setBulkMoving(false);
  };

  const bulkDelete = async () => {
    if (selectedIds.size === 0) return;

    const confirmed = window.confirm(
      `Delete ${selectedIds.size} applicant(s)? This cannot be undone.`
    );
    if (!confirmed) return;

    let successCount = 0;
    for (const id of selectedIds) {
      const success = await onDeleteApplicant(id);
      if (success) successCount++;
    }

    toast.success(`Deleted ${successCount} applicant(s)`);
    setSelectedIds(new Set());
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel>Filter by Stage</DropdownMenuLabel>
              <Select value={filterStage} onValueChange={setFilterStage}>
                <SelectTrigger className="mx-2 mb-2 w-[calc(100%-16px)]">
                  <SelectValue placeholder="All stages" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  {stages.map((stage) => (
                    <SelectItem key={stage.id} value={stage.id}>
                      {stage.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <DropdownMenuSeparator />
              <DropdownMenuLabel>Strict Filter Status</DropdownMenuLabel>
              <Select value={filterStrictPass} onValueChange={setFilterStrictPass}>
                <SelectTrigger className="mx-2 mb-2 w-[calc(100%-16px)]">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="pass">Passes Filters</SelectItem>
                  <SelectItem value="fail">Fails Filters</SelectItem>
                </SelectContent>
              </Select>
            </DropdownMenuContent>
          </DropdownMenu>

          {(filterStage !== 'all' || filterStrictPass !== 'all') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFilterStage('all');
                setFilterStrictPass('all');
              }}
            >
              Clear filters
            </Button>
          )}
        </div>

        <p className="text-sm text-muted-foreground">
          {filteredApplicants.length} applicant{filteredApplicants.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 p-3 mb-4 rounded-lg bg-primary/5 border border-primary/20">
          <span className="text-sm font-medium">
            {selectedIds.size} selected
          </span>

          <div className="flex-1 flex items-center gap-2">
            <Button
              variant="gold"
              size="sm"
              onClick={runAIScreening}
              disabled={screening}
            >
              {screening ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              Run AI Screening
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={bulkMoving}>
                  {bulkMoving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <ArrowRight className="w-4 h-4 mr-2" />
                  )}
                  Bulk Move
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {stages.map((stage) => (
                  <DropdownMenuItem
                    key={stage.id}
                    onClick={() => bulkMoveToStage(stage.id)}
                  >
                    Move to {stage.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={bulkDelete}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedIds(new Set())}
          >
            Clear selection
          </Button>
        </div>
      )}

      {/* Table */}
      <ScrollArea className="flex-1 border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={
                    filteredApplicants.length > 0 &&
                    selectedIds.size === filteredApplicants.length
                  }
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead
                className="cursor-pointer hover:text-foreground"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center gap-1">
                  Name
                  {sortField === 'name' &&
                    (sortOrder === 'asc' ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    ))}
                </div>
              </TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Major / Year</TableHead>
              <TableHead
                className="cursor-pointer hover:text-foreground"
                onClick={() => handleSort('fit_score')}
              >
                <div className="flex items-center gap-1">
                  Fit Score
                  {sortField === 'fit_score' &&
                    (sortOrder === 'asc' ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    ))}
                </div>
              </TableHead>
              <TableHead>Strict</TableHead>
              <TableHead className="w-[200px]">AI Summary</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredApplicants.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No applicants match your filters
                </TableCell>
              </TableRow>
            ) : (
              filteredApplicants.map((applicant) => {
                const extended = applicant as unknown as {
                  fit_score?: number;
                  ai_summary?: string;
                  passes_strict_filters?: boolean;
                };

                return (
                  <TableRow
                    key={applicant.id}
                    className={selectedIds.has(applicant.id) ? 'bg-primary/5' : ''}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(applicant.id)}
                        onCheckedChange={() => toggleSelect(applicant.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {applicant.first_name} {applicant.last_name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {applicant.email}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{getStageName(applicant.stage_id)}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {applicant.major || '-'} / {applicant.year || '-'}
                    </TableCell>
                    <TableCell>{getFitScoreBadge(extended.fit_score)}</TableCell>
                    <TableCell>
                      {extended.passes_strict_filters === true && (
                        <Check className="w-4 h-4 text-green-500" />
                      )}
                      {extended.passes_strict_filters === false && (
                        <Badge variant="destructive" className="text-xs">
                          Fail
                        </Badge>
                      )}
                      {extended.passes_strict_filters === undefined && (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {extended.ai_summary ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <p className="text-xs text-muted-foreground truncate max-w-[180px] cursor-help">
                                {extended.ai_summary}
                              </p>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-sm">
                              <p className="text-sm">{extended.ai_summary}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}
