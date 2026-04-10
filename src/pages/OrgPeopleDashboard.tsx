import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { ClubAdminSidebar } from '@/components/club-admin/ClubAdminSidebar';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Search, Loader2, ChevronRight, Star, Upload, Download, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { toast } from 'sonner';
import Papa from 'papaparse';

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

const VALID_STAGES = new Set(STAGES as readonly string[]);

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

interface CsvRow {
  first_name: string;
  last_name: string;
  email: string;
  year: string;
  major: string;
  stage: string;
  notes: string;
  _valid: boolean;
  _error: string;
}

function normalizeStage(raw: string): string {
  const s = raw.toLowerCase().trim().replace(/\s+/g, '_');
  if (VALID_STAGES.has(s)) return s;
  const aliases: Record<string, string> = {
    'under review': 'under_review',
    'review': 'under_review',
    'accept': 'accepted',
    'reject': 'rejected',
    'interviews': 'interview',
    'members': 'member',
    'apply': 'applied',
  };
  return aliases[raw.toLowerCase().trim()] || 'applied';
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

  // CSV import state
  const [importOpen, setImportOpen] = useState(false);
  const [csvRows, setCsvRows] = useState<CsvRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [importDone, setImportDone] = useState(false);
  const [importResult, setImportResult] = useState<{ inserted: number; skipped: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', year: '', major: '',
    stage: 'applied' as Stage, notes: '',
  });

  const fetchPeople = async () => {
    if (!clubId) return;
    setLoading(true);

    const { data: peopleData, error } = await (supabase as any)
      .from('people')
      .select('*')
      .eq('organization_id', clubId)
      .order('created_at', { ascending: false });

    if (error) { toast.error('Failed to load people'); setLoading(false); return; }

    const ids = peopleData?.map((p: Person) => p.id) || [];
    let reviewMap: Record<string, number> = {};

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

    setPeople((peopleData || []).map((p: Person) => ({ ...p, avg_score: reviewMap[p.id] ?? null })));
    setLoading(false);
  };

  useEffect(() => { fetchPeople(); }, [clubId]);

  // Clear selection when filter/search changes
  useEffect(() => { setSelected(new Set()); }, [stageFilter, search]);

  const filtered = people.filter(p => {
    const matchesStage = stageFilter === 'all' || p.stage === stageFilter;
    const matchesSearch = !search ||
      `${p.first_name} ${p.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
      p.email?.toLowerCase().includes(search.toLowerCase()) ||
      p.major?.toLowerCase().includes(search.toLowerCase());
    return matchesStage && matchesSearch;
  });

  const allFilteredSelected = filtered.length > 0 && filtered.every(p => selected.has(p.id));

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(p => p.id)));
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
    if (error) { toast.error('Failed to move people'); setBulkMoving(false); return; }
    toast.success(`Moved ${ids.length} ${ids.length === 1 ? 'person' : 'people'} to ${STAGE_LABELS[bulkStage]}`);
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
    if (error) { toast.error('Failed to add person'); setAdding(false); return; }
    toast.success('Person added');
    setAddOpen(false);
    setForm({ first_name: '', last_name: '', email: '', year: '', major: '', stage: 'applied', notes: '' });
    fetchPeople();
    setAdding(false);
  };

  // ─── Export CSV ──────────────────────────────────────────────────────────────
  const handleExport = () => {
    const data = filtered.map(p => ({
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

  // ─── CSV import ─────────────────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      // Strip BOM, lowercase, trim, collapse spaces → underscores
      transformHeader: (h) => h.replace(/^\uFEFF/, '').toLowerCase().trim().replace(/\s+/g, '_'),
      complete: (results) => {
        const rows = (results.data as any[]).map((row) => {
          // Handle combined "Name" / "Full Name" column — split on first space
          const combinedName = (row.name || row.full_name || row.fullname || row.student_name || row.applicant_name || '').trim();
          const combinedParts = combinedName ? combinedName.split(/\s+/) : [];

          let firstName = (row.first_name || row.firstname || (combinedParts[0] ?? '')).trim();
          let lastName  = (row.last_name  || row.lastname  || combinedParts.slice(1).join(' ')).trim();

          // If only one token in combined field, use it as both to avoid "Missing last name"
          if (combinedName && !lastName) lastName = firstName;

          const email = (
            row.email || row.email_address || row.ucsd_email ||
            row.school_email || row.student_email || row.contact_email || ''
          ).trim().toLowerCase();

          const year = (row.year || row.class_year || row.academic_year || row.grade_level || '').trim();
          const major = (row.major || row.field_of_study || row.area_of_study || row.concentration || '').trim();
          const stageRaw = (row.stage || '').trim();
          const notes = (row.notes || '').trim();

          let error = '';
          if (!firstName) error = 'Missing first name';
          else if (!lastName) error = 'Missing last name';
          return {
            first_name: firstName, last_name: lastName, email, year, major,
            stage: stageRaw ? normalizeStage(stageRaw) : 'applied',
            notes, _valid: !error, _error: error,
          } as CsvRow;
        });
        setCsvRows(rows);
        setImportDone(false);
        setImportResult(null);
      },
      error: () => toast.error('Failed to parse CSV'),
    });
    e.target.value = '';
  };

  const handleImport = async () => {
    const valid = csvRows.filter(r => r._valid);
    if (!valid.length) { toast.error('No valid rows to import'); return; }
    setImporting(true);
    const payload = valid.map(r => ({
      organization_id: clubId,
      first_name: r.first_name, last_name: r.last_name,
      email: r.email || null, year: r.year || null,
      major: r.major || null, stage: r.stage as Stage,
      notes: r.notes || null,
    }));
    let inserted = 0;
    for (let i = 0; i < payload.length; i += 100) {
      const batch = payload.slice(i, i + 100);
      const { error } = await (supabase as any).from('people').insert(batch);
      if (error) toast.error(`Batch ${Math.floor(i / 100) + 1} failed: ${error.message}`);
      else inserted += batch.length;
    }
    setImportResult({ inserted, skipped: csvRows.filter(r => !r._valid).length });
    setImportDone(true);
    setImporting(false);
    fetchPeople();
  };

  const closeImport = () => {
    setImportOpen(false);
    setCsvRows([]);
    setImportDone(false);
    setImportResult(null);
  };

  const downloadTemplate = () => {
    const csv = 'first_name,last_name,email,year,major,stage,notes\nJane,Smith,jane@ucsd.edu,Junior,Economics,applied,\nJohn,Doe,john@ucsd.edu,Sophomore,Business,member,';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'people_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const stageCounts = STAGES.reduce((acc, s) => {
    acc[s] = people.filter(p => p.stage === s).length;
    return acc;
  }, {} as Record<Stage, number>);

  const validCount = csvRows.filter(r => r._valid).length;
  const invalidCount = csvRows.filter(r => !r._valid).length;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full" style={{ background: '#0A0A0A' }}>
        <ClubAdminSidebar />
        <main className="flex-1 p-6 overflow-auto">
          <SidebarTrigger className="mb-4" />

          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-display font-bold text-white">People</h1>
              <p className="text-zinc-500 text-sm mt-0.5">{people.length} total · members &amp; applicants</p>
            </div>
            <div className="flex gap-2">
              <Link to={`/club-admin/clubs/${clubId}/pipeline`}>
                <Button variant="outline" className="border-white/10 text-zinc-300 hover:bg-white/5">
                  Pipeline View
                </Button>
              </Link>
              {filtered.length > 0 && (
                <Button onClick={handleExport} variant="outline" className="border-white/10 text-zinc-300 hover:bg-white/5">
                  <Download className="w-4 h-4 mr-1.5" /> Export CSV
                </Button>
              )}
              <Button onClick={() => setImportOpen(true)} variant="outline" className="border-white/10 text-zinc-300 hover:bg-white/5">
                <Upload className="w-4 h-4 mr-1.5" /> Import CSV
              </Button>
              <Button onClick={() => setAddOpen(true)} className="bg-gold text-zinc-900 font-semibold hover:bg-gold/90">
                <Plus className="w-4 h-4 mr-1" /> Add Person
              </Button>
            </div>
          </div>

          {/* Stage filter tabs */}
          <div className="flex gap-2 flex-wrap mb-4">
            <button
              onClick={() => setStageFilter('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${stageFilter === 'all' ? 'bg-gold text-zinc-900' : 'bg-white/5 text-zinc-400 hover:bg-white/10'}`}
            >
              All ({people.length})
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

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              placeholder="Search by name, email, or major..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-zinc-500"
            />
          </div>

          {/* Bulk action bar */}
          {selected.size > 0 && (
            <div className="flex items-center gap-3 mb-4 px-4 py-3 rounded-xl border border-gold/20 bg-gold/5">
              <span className="text-sm text-zinc-300 font-medium">{selected.size} selected</span>
              <div className="flex items-center gap-2 ml-auto">
                <Select value={bulkStage} onValueChange={v => setBulkStage(v as Stage)}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white h-8 text-sm w-44">
                    <SelectValue placeholder="Move to stage..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#111] border-white/10">
                    {STAGES.map(s => (
                      <SelectItem key={s} value={s} className="text-white">{STAGE_LABELS[s]}</SelectItem>
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
                <button onClick={() => setSelected(new Set())} className="text-zinc-500 hover:text-white transition-colors ml-1">
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
                    <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Name</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Major / Year</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Stage</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Avg Score</th>
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
                        <div className="font-medium text-white">{person.first_name} {person.last_name}</div>
                        {person.email && <div className="text-xs text-zinc-500">{person.email}</div>}
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-400">
                        {[person.major, person.year].filter(Boolean).join(' · ') || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{ background: STAGE_COLORS[person.stage] + '22', color: STAGE_COLORS[person.stage] }}
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
                        ) : <span className="text-zinc-600 text-sm">—</span>}
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
                <Input value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} className="bg-white/5 border-white/10 text-white mt-1" />
              </div>
              <div>
                <Label className="text-zinc-400 text-xs">Last Name *</Label>
                <Input value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} className="bg-white/5 border-white/10 text-white mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-zinc-400 text-xs">Email</Label>
              <Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="bg-white/5 border-white/10 text-white mt-1" placeholder="optional" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-zinc-400 text-xs">Major</Label>
                <Input value={form.major} onChange={e => setForm(f => ({ ...f, major: e.target.value }))} className="bg-white/5 border-white/10 text-white mt-1" />
              </div>
              <div>
                <Label className="text-zinc-400 text-xs">Year</Label>
                <Select value={form.year} onValueChange={v => setForm(f => ({ ...f, year: v }))}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent className="bg-[#111] border-white/10">
                    {['Freshman', 'Sophomore', 'Junior', 'Senior', 'Graduate'].map(y => (
                      <SelectItem key={y} value={y} className="text-white">{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-zinc-400 text-xs">Stage</Label>
              <Select value={form.stage} onValueChange={v => setForm(f => ({ ...f, stage: v as Stage }))}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white mt-1"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#111] border-white/10">
                  {STAGES.map(s => <SelectItem key={s} value={s} className="text-white">{STAGE_LABELS[s]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-zinc-400 text-xs">Notes</Label>
              <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="bg-white/5 border-white/10 text-white mt-1" placeholder="optional" />
            </div>
          </div>
          <DialogFooter className="mt-2">
            <Button variant="ghost" onClick={() => setAddOpen(false)} className="text-zinc-400">Cancel</Button>
            <Button onClick={handleAdd} disabled={adding} className="bg-gold text-zinc-900 font-semibold hover:bg-gold/90">
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Person'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CSV Import Dialog */}
      <Dialog open={importOpen} onOpenChange={closeImport}>
        <DialogContent className="bg-[#111] border-white/10 text-white max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Import from CSV</DialogTitle>
          </DialogHeader>

          {importDone ? (
            <div className="flex flex-col items-center py-8 gap-4">
              <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-green-500" />
              </div>
              <div className="text-center">
                <p className="text-white font-semibold text-lg">{importResult?.inserted} people imported</p>
                {importResult?.skipped ? <p className="text-zinc-500 text-sm mt-1">{importResult.skipped} rows skipped due to errors</p> : null}
              </div>
              <Button onClick={closeImport} className="bg-gold text-zinc-900 font-semibold hover:bg-gold/90">Done</Button>
            </div>
          ) : csvRows.length === 0 ? (
            <div className="space-y-4 py-2">
              <p className="text-zinc-400 text-sm">
                Upload a CSV — column names are flexible. Accepted headers:
              </p>
              <ul className="text-zinc-500 text-xs space-y-0.5 list-disc list-inside">
                <li><code className="text-zinc-300">Name</code> or <code className="text-zinc-300">Full Name</code> <span className="text-zinc-600">(auto-splits into first + last)</span>, or separate <code className="text-zinc-300">First Name</code> / <code className="text-zinc-300">Last Name</code></li>
                <li><code className="text-zinc-300">Email</code>, <code className="text-zinc-300">Email Address</code>, <code className="text-zinc-300">UCSD Email</code></li>
                <li><code className="text-zinc-300">Major</code>, <code className="text-zinc-300">Year</code> <span className="text-zinc-600">(optional)</span></li>
              </ul>
              <p className="text-zinc-500 text-xs">Valid stages: member, applied, under_review, interview, accepted, rejected. Defaults to <em>applied</em> if blank.</p>
              <label className="flex flex-col items-center justify-center gap-3 border border-dashed border-white/15 rounded-xl py-10 cursor-pointer hover:border-white/30 transition-colors">
                <Upload className="w-6 h-6 text-zinc-500" />
                <span className="text-sm text-zinc-400">Click to upload CSV</span>
                <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
              </label>
              <button onClick={downloadTemplate} className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
                <Download className="w-3.5 h-3.5" /> Download template CSV
              </button>
            </div>
          ) : (
            <div className="flex flex-col flex-1 min-h-0 gap-4">
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1.5 text-green-400"><CheckCircle2 className="w-4 h-4" /> {validCount} ready</span>
                {invalidCount > 0 && <span className="flex items-center gap-1.5 text-red-400"><AlertCircle className="w-4 h-4" /> {invalidCount} skipped</span>}
                <button onClick={() => setCsvRows([])} className="ml-auto text-xs text-zinc-500 hover:text-zinc-300 transition-colors">Choose different file</button>
              </div>
              <div className="flex-1 overflow-auto rounded-lg border border-white/10 min-h-0">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-[#111]">
                    <tr className="border-b border-white/10">
                      {['#', 'Name', 'Email', 'Major / Year', 'Stage', 'Status'].map(h => (
                        <th key={h} className="text-left px-3 py-2 text-xs text-zinc-500 font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {csvRows.map((row, i) => (
                      <tr key={i} className={`border-b border-white/5 ${!row._valid ? 'opacity-50' : ''}`}>
                        <td className="px-3 py-2 text-zinc-600">{i + 1}</td>
                        <td className="px-3 py-2 text-white">{row.first_name} {row.last_name}</td>
                        <td className="px-3 py-2 text-zinc-400">{row.email || '—'}</td>
                        <td className="px-3 py-2 text-zinc-400">{[row.major, row.year].filter(Boolean).join(' · ') || '—'}</td>
                        <td className="px-3 py-2">
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                            style={{
                              background: VALID_STAGES.has(row.stage) ? STAGE_COLORS[row.stage as Stage] + '22' : 'rgba(255,255,255,0.05)',
                              color: VALID_STAGES.has(row.stage) ? STAGE_COLORS[row.stage as Stage] : '#71717a',
                            }}>
                            {STAGE_LABELS[row.stage as Stage] || row.stage || 'applied'}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          {row._valid
                            ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                            : <span className="flex items-center gap-1 text-red-400 text-xs"><AlertCircle className="w-3.5 h-3.5" />{row._error}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={closeImport} className="text-zinc-400">Cancel</Button>
                <Button onClick={handleImport} disabled={importing || validCount === 0} className="bg-gold text-zinc-900 font-semibold hover:bg-gold/90">
                  {importing ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Importing...</> : `Import ${validCount} ${validCount === 1 ? 'Person' : 'People'}`}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
