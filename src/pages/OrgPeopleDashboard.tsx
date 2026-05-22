import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { ClubAdminSidebar } from '@/components/club-admin/ClubAdminSidebar';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Plus, Search, Loader2, ChevronRight, Star, Upload, Download, X } from 'lucide-react';
import { toast } from 'sonner';
import Papa from 'papaparse';

const STAGES = ['member', 'applied', 'under_review', 'interview', 'accepted', 'rejected'] as const;
type Stage = (typeof STAGES)[number];

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

interface Person {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  year: string | null;
  major: string | null;
  stage: Stage;
  notes: string | null;
  created_at: string;
  avg_score?: number | null;
}

export default function OrgPeopleDashboard() {
  const { clubId } = useParams<{ clubId: string }>();
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [stageFilter, setStageFilter] = useState<Stage | 'all'>('all');
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [adding, setAdding] = useState(false);

  // Bulk selection
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStage, setBulkStage] = useState<Stage | ''>('');
  const [bulkMoving, setBulkMoving] = useState(false);

  // Smart import state
  const [smartImporting, setSmartImporting] = useState(false);
  const smartImportRef = useRef<HTMLInputElement>(null);

  // NIGO (Not In Good Order) queue — rows Claude couldn't fully clean
  const [nigoQueue, setNigoQueue] = useState<any[]>([]);
  const [nigoEdits, setNigoEdits] = useState<Record<number, any>>({});
  const [nigoSaving, setNigoSaving] = useState<Record<number, boolean>>({});

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    year: '',
    major: '',
    stage: 'applied' as Stage,
    notes: '',
  });

  const fetchPeople = async () => {
    if (!clubId) return;
    setLoading(true);

    const { data: peopleData, error } = await (supabase as any)
      .from('people')
      .select('*')
      .eq('organization_id', clubId)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load people');
      setLoading(false);
      return;
    }

    const ids = peopleData?.map((p: Person) => p.id) || [];
    const reviewMap: Record<string, number> = {};

    if (ids.length > 0) {
      const { data: reviews } = await (supabase as any)
        .from('reviews')
        .select('person_id, culture_fit, experience, involvement')
        .in('person_id', ids);

      if (reviews) {
        const grouped: Record<string, number[]> = {};
        reviews.forEach((r: any) => {
          const scores = [r.culture_fit, r.experience, r.involvement].filter(Boolean);
          if (scores.length) {
            if (!grouped[r.person_id]) grouped[r.person_id] = [];
            grouped[r.person_id].push(...scores);
          }
        });
        Object.entries(grouped).forEach(([pid, scores]) => {
          reviewMap[pid] = (scores as number[]).reduce((a, b) => a + b, 0) / scores.length;
        });
      }
    }

    setPeople(
      (peopleData || []).map((p: Person) => ({ ...p, avg_score: reviewMap[p.id] ?? null }))
    );
    setLoading(false);
  };

  useEffect(() => {
    fetchPeople();
  }, [clubId]);

  // Clear selection when filter/search changes
  useEffect(() => {
    setSelected(new Set());
  }, [stageFilter, search]);

  const filtered = people.filter((p) => {
    const matchesStage = stageFilter === 'all' || p.stage === stageFilter;
    const matchesSearch =
      !search ||
      `${p.first_name} ${p.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
      p.email?.toLowerCase().includes(search.toLowerCase()) ||
      p.major?.toLowerCase().includes(search.toLowerCase());
    return matchesStage && matchesSearch;
  });

  const allFilteredSelected = filtered.length > 0 && filtered.every((p) => selected.has(p.id));

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((p) => p.id)));
    }
  };

  const handleBulkMove = async () => {
    if (!bulkStage || selected.size === 0) return;
    setBulkMoving(true);
    const ids = [...selected];
    const { error } = await (supabase as any)
      .from('people')
      .update({ stage: bulkStage })
      .in('id', ids);
    if (error) {
      toast.error('Failed to move people');
      setBulkMoving(false);
      return;
    }
    toast.success(
      `Moved ${ids.length} ${ids.length === 1 ? 'person' : 'people'} to ${STAGE_LABELS[bulkStage]}`
    );
    setSelected(new Set());
    setBulkStage('');
    fetchPeople();
    setBulkMoving(false);
  };

  const handleAdd = async () => {
    if (!form.first_name.trim() || !form.last_name.trim()) {
      toast.error('First and last name required');
      return;
    }
    setAdding(true);
    const { error } = await (supabase as any).from('people').insert({
      organization_id: clubId,
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      email: form.email.trim() || null,
      year: form.year || null,
      major: form.major.trim() || null,
      stage: form.stage,
      notes: form.notes.trim() || null,
    });
    if (error) {
      toast.error('Failed to add person');
      setAdding(false);
      return;
    }
    toast.success('Person added');
    setAddOpen(false);
    setForm({
      first_name: '',
      last_name: '',
      email: '',
      year: '',
      major: '',
      stage: 'applied',
      notes: '',
    });
    fetchPeople();
    setAdding(false);
  };

  // ─── Export CSV ──────────────────────────────────────────────────────────────
  const handleExport = () => {
    const data = filtered.map((p) => ({
      first_name: p.first_name,
      last_name: p.last_name,
      email: p.email || '',
      year: p.year || '',
      major: p.major || '',
      stage: p.stage,
      notes: p.notes || '',
      avg_score: p.avg_score != null ? p.avg_score.toFixed(2) : '',
    }));
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `people_${stageFilter !== 'all' ? stageFilter + '_' : ''}export.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${data.length} ${data.length === 1 ? 'person' : 'people'}`);
  };

  // ─── Smart AI import ────────────────────────────────────────────────────────
  const handleSmartImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !clubId) return;
    e.target.value = '';
    setSmartImporting(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Not signed in');
        return;
      }
      const fd = new FormData();
      fd.append('file', file);
      fd.append('club_id', clubId);
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const res = await fetch(`${supabaseUrl}/functions/v1/ingest-roster`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: fd,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error || 'Import failed');
        return;
      }
      if (json.error) {
        toast.error(json.error);
        return;
      }

      const nigoCount = json.nigo_count ?? 0;
      toast.success(
        `${json.inserted} members imported${nigoCount > 0 ? ` · ${nigoCount} need attention` : ''}`
      );

      // Surface NIGO queue in the UI so officers can fix individual rows
      if (nigoCount > 0) {
        setNigoQueue(json.nigo_queue ?? []);
        setNigoEdits({});
      }

      fetchPeople();
    } catch {
      toast.error('Import failed — please try again');
    } finally {
      setSmartImporting(false);
    }
  };

  const stageCounts = STAGES.reduce(
    (acc, s) => {
      acc[s] = people.filter((p) => p.stage === s).length;
      return acc;
    },
    {} as Record<Stage, number>
  );

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full" style={{ background: '#0A0A0A' }}>
        <ClubAdminSidebar />
        <main className="flex-1 p-6 overflow-auto">
          <SidebarTrigger className="mb-4" />

          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-display font-bold text-white">People</h1>
              <p className="text-zinc-500 text-sm mt-0.5">
                {people.length} total · members &amp; applicants
              </p>
            </div>
            <div className="flex gap-2">
              <Link to={`/club-admin/clubs/${clubId}/pipeline`}>
                <Button
                  variant="outline"
                  className="border-white/10 text-zinc-300 hover:bg-white/5"
                >
                  Pipeline View
                </Button>
              </Link>
              {filtered.length > 0 && (
                <Button
                  onClick={handleExport}
                  variant="outline"
                  className="border-white/10 text-zinc-300 hover:bg-white/5"
                >
                  <Download className="w-4 h-4 mr-1.5" /> Export CSV
                </Button>
              )}
              <Button
                onClick={() => smartImportRef.current?.click()}
                disabled={smartImporting}
                variant="outline"
                className="border-white/10 text-zinc-300 hover:bg-white/5"
              >
                {smartImporting ? (
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-1.5" />
                )}
                {smartImporting ? 'Importing...' : 'Import Roster'}
              </Button>
              <input
                ref={smartImportRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={handleSmartImport}
              />
              <Button
                onClick={() => setAddOpen(true)}
                className="bg-gold text-zinc-900 font-semibold hover:bg-gold/90"
              >
                <Plus className="w-4 h-4 mr-1" /> Add Person
              </Button>
            </div>
          </div>

          {/* ── NIGO Queue — Action Needed ────────────────────────────────── */}
          {nigoQueue.length > 0 && (
            <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/5 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-amber-500/20">
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  <span className="text-sm font-semibold text-amber-400">
                    Action Needed — {nigoQueue.length} member{nigoQueue.length !== 1 ? 's' : ''}{' '}
                    couldn't be imported
                  </span>
                </div>
                <button
                  onClick={() => setNigoQueue([])}
                  className="text-zinc-500 hover:text-white transition-colors"
                  aria-label="Dismiss"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4 space-y-3">
                {nigoQueue.map((row, idx) => {
                  const edit = nigoEdits[idx] ?? row;
                  const isSaving = nigoSaving[idx] ?? false;

                  const handleFix = async () => {
                    const firstName = (edit.first_name || '').trim();
                    const lastName = (edit.last_name || '').trim();
                    const email = (edit.email || '').trim().toLowerCase();
                    if (!firstName || !lastName || !email || !email.includes('@')) {
                      toast.error('Please fill in name and a valid email before saving');
                      return;
                    }
                    setNigoSaving((prev) => ({ ...prev, [idx]: true }));
                    try {
                      const { error } = await (supabase as any).from('people').upsert(
                        {
                          organization_id: clubId,
                          first_name: firstName,
                          last_name: lastName,
                          email,
                          major: edit.major || null,
                          status: ['applicant', 'member', 'alumni'].includes(edit.status)
                            ? edit.status
                            : 'applicant',
                          gender: ['male', 'female', 'non-binary', 'unspecified'].includes(
                            edit.gender
                          )
                            ? edit.gender
                            : 'unspecified',
                          grad_year: Number.isInteger(edit.grad_year) ? edit.grad_year : null,
                          stage: 'applied',
                        },
                        { onConflict: 'email,organization_id' }
                      );

                      if (error) throw error;
                      toast.success(`${firstName} ${lastName} imported!`);
                      setNigoQueue((prev) => prev.filter((_, i) => i !== idx));
                      setNigoEdits((prev) => {
                        const next = { ...prev };
                        delete next[idx];
                        return next;
                      });
                      fetchPeople();
                    } catch (err: any) {
                      toast.error(err.message || 'Failed to save');
                    } finally {
                      setNigoSaving((prev) => ({ ...prev, [idx]: false }));
                    }
                  };

                  return (
                    <div
                      key={idx}
                      className="rounded-lg border border-amber-500/20 bg-zinc-900 p-4"
                    >
                      <p className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider mb-3">
                        ⚠ {row.flag_reason}
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                        {[
                          { key: 'first_name', label: 'First Name', required: true },
                          { key: 'last_name', label: 'Last Name', required: true },
                          { key: 'email', label: 'Email', required: true },
                          { key: 'major', label: 'Major', required: false },
                        ].map(({ key, label, required }) => (
                          <div key={key}>
                            <label className="text-[10px] text-zinc-500 mb-1 block">
                              {label}
                              {required && <span className="text-amber-400 ml-0.5">*</span>}
                            </label>
                            <input
                              type="text"
                              value={edit[key] || ''}
                              onChange={(e) =>
                                setNigoEdits((prev) => ({
                                  ...prev,
                                  [idx]: { ...(prev[idx] ?? row), [key]: e.target.value },
                                }))
                              }
                              placeholder={label}
                              className="w-full h-8 px-2.5 text-xs rounded-lg bg-zinc-800 border border-white/10 text-white placeholder:text-zinc-600 focus:border-amber-400/50 focus:outline-none"
                            />
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={handleFix}
                        disabled={isSaving}
                        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25 transition-colors disabled:opacity-50"
                      >
                        {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                        {isSaving ? 'Saving...' : 'Save & Import →'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Stage filter tabs */}
          <div className="flex gap-2 flex-wrap mb-4">
            <button
              onClick={() => setStageFilter('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${stageFilter === 'all' ? 'bg-gold text-zinc-900' : 'bg-white/5 text-zinc-400 hover:bg-white/10'}`}
            >
              All ({people.length})
            </button>
            {STAGES.map((s) => (
              <button
                key={s}
                onClick={() => setStageFilter(s)}
                className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
                style={
                  stageFilter === s
                    ? { background: STAGE_COLORS[s], color: '#000' }
                    : { background: 'rgba(255,255,255,0.05)', color: '#a1a1aa' }
                }
              >
                {STAGE_LABELS[s]} ({stageCounts[s]})
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              placeholder="Search by name, email, or major..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-zinc-500"
            />
          </div>

          {/* Bulk action bar */}
          {selected.size > 0 && (
            <div className="flex items-center gap-3 mb-4 px-4 py-3 rounded-xl border border-gold/20 bg-gold/5">
              <span className="text-sm text-zinc-300 font-medium">{selected.size} selected</span>
              <div className="flex items-center gap-2 ml-auto">
                <Select value={bulkStage} onValueChange={(v) => setBulkStage(v as Stage)}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white h-8 text-sm w-44">
                    <SelectValue placeholder="Move to stage..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#111] border-white/10">
                    {STAGES.map((s) => (
                      <SelectItem key={s} value={s} className="text-white">
                        {STAGE_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleBulkMove}
                  disabled={!bulkStage || bulkMoving}
                  size="sm"
                  className="bg-gold text-zinc-900 font-semibold hover:bg-gold/90 h-8"
                >
                  {bulkMoving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Move'}
                </Button>
                <button
                  onClick={() => setSelected(new Set())}
                  className="text-zinc-500 hover:text-white transition-colors ml-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Table */}
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-6 h-6 text-gold animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-zinc-500">
              {people.length === 0
                ? 'No people yet. Add your first member or applicant.'
                : 'No results match your filters.'}
            </div>
          ) : (
            <div className="rounded-xl border border-white/10 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02]">
                    <th className="px-4 py-3 w-8">
                      <input
                        type="checkbox"
                        checked={allFilteredSelected}
                        onChange={toggleSelectAll}
                        className="accent-yellow-500 w-4 h-4 cursor-pointer"
                      />
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                      Major / Year
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                      Stage
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                      Avg Score
                    </th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((person, i) => (
                    <tr
                      key={person.id}
                      className={`border-b border-white/5 hover:bg-white/[0.03] transition-colors ${i === filtered.length - 1 ? 'border-0' : ''} ${selected.has(person.id) ? 'bg-gold/[0.03]' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selected.has(person.id)}
                          onChange={() => toggleSelect(person.id)}
                          className="accent-yellow-500 w-4 h-4 cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-white">
                          {person.first_name} {person.last_name}
                        </div>
                        {person.email && (
                          <div className="text-xs text-zinc-500">{person.email}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-400">
                        {[person.major, person.year].filter(Boolean).join(' · ') || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{
                            background: STAGE_COLORS[person.stage] + '22',
                            color: STAGE_COLORS[person.stage],
                          }}
                        >
                          {STAGE_LABELS[person.stage]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {person.avg_score != null ? (
                          <span className="flex items-center gap-1 text-sm text-zinc-300">
                            <Star className="w-3.5 h-3.5 text-gold fill-gold" />
                            {person.avg_score.toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-zinc-600 text-sm">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          to={`/club-admin/clubs/${clubId}/people/${person.id}`}
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

      {/* Add Person Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="bg-[#111] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Add Person</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-zinc-400 text-xs">First Name *</Label>
                <Input
                  value={form.first_name}
                  onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
                  className="bg-white/5 border-white/10 text-white mt-1"
                />
              </div>
              <div>
                <Label className="text-zinc-400 text-xs">Last Name *</Label>
                <Input
                  value={form.last_name}
                  onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
                  className="bg-white/5 border-white/10 text-white mt-1"
                />
              </div>
            </div>
            <div>
              <Label className="text-zinc-400 text-xs">Email</Label>
              <Input
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="bg-white/5 border-white/10 text-white mt-1"
                placeholder="optional"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-zinc-400 text-xs">Major</Label>
                <Input
                  value={form.major}
                  onChange={(e) => setForm((f) => ({ ...f, major: e.target.value }))}
                  className="bg-white/5 border-white/10 text-white mt-1"
                />
              </div>
              <div>
                <Label className="text-zinc-400 text-xs">Year</Label>
                <Select
                  value={form.year}
                  onValueChange={(v) => setForm((f) => ({ ...f, year: v }))}
                >
                  <SelectTrigger className="bg-white/5 border-white/10 text-white mt-1">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#111] border-white/10">
                    {['Freshman', 'Sophomore', 'Junior', 'Senior', 'Graduate'].map((y) => (
                      <SelectItem key={y} value={y} className="text-white">
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-zinc-400 text-xs">Stage</Label>
              <Select
                value={form.stage}
                onValueChange={(v) => setForm((f) => ({ ...f, stage: v as Stage }))}
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#111] border-white/10">
                  {STAGES.map((s) => (
                    <SelectItem key={s} value={s} className="text-white">
                      {STAGE_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-zinc-400 text-xs">Notes</Label>
              <Input
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className="bg-white/5 border-white/10 text-white mt-1"
                placeholder="optional"
              />
            </div>
          </div>
          <DialogFooter className="mt-2">
            <Button variant="ghost" onClick={() => setAddOpen(false)} className="text-zinc-400">
              Cancel
            </Button>
            <Button
              onClick={handleAdd}
              disabled={adding}
              className="bg-gold text-zinc-900 font-semibold hover:bg-gold/90"
            >
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Person'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
