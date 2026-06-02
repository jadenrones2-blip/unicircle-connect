import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Search, Loader2, ChevronRight, Upload, Download, X, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import Papa from 'papaparse';

const STAGE_PALETTE = [
  '#3b82f6', // blue
  '#eab308', // yellow
  '#a855f7', // purple
  '#22c55e', // green
  '#ef4444', // red
  '#06b6d4', // cyan
  '#f97316', // orange
  '#b8860b', // gold
];

interface RecruitmentStage {
  id: string;
  club_id: string;
  label: string;
  order_index: number;
}

interface Applicant {
  id: string;
  club_id: string;
  stage_id: string | null;
  first_name: string;
  last_name: string;
  email: string;
  major: string | null;
  year: string | null;
  notes: string | null;
  final_decision: string | null;
  created_at: string;
}

export default function OrgPeopleDashboard() {
  const { clubId } = useParams<{ clubId: string }>();
  const [stages, setStages] = useState<RecruitmentStage[]>([]);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [adding, setAdding] = useState(false);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStageId, setBulkStageId] = useState<string>('');
  const [bulkMoving, setBulkMoving] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Confirm dialog state — either { kind: 'one', id, name } or { kind: 'bulk', ids }
  type DeleteTarget =
    | { kind: 'one'; id: string; name: string }
    | { kind: 'bulk'; ids: string[] }
    | null;
  const [pendingDelete, setPendingDelete] = useState<DeleteTarget>(null);

  const [smartImporting, setSmartImporting] = useState(false);
  const smartImportRef = useRef<HTMLInputElement>(null);

  const [nigoQueue, setNigoQueue] = useState<any[]>([]);
  const [nigoEdits, setNigoEdits] = useState<Record<number, any>>({});
  const [nigoSaving, setNigoSaving] = useState<Record<number, boolean>>({});

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    year: '',
    major: '',
    stage_id: '',
    notes: '',
  });

  // ─── Derived stage maps ─────────────────────────────────────────────────────
  const stageById = useMemo(() => {
    const m: Record<string, RecruitmentStage> = {};
    stages.forEach((s) => (m[s.id] = s));
    return m;
  }, [stages]);

  const stageColorById = useMemo(() => {
    const m: Record<string, string> = {};
    stages.forEach((s, i) => (m[s.id] = STAGE_PALETTE[i % STAGE_PALETTE.length]));
    return m;
  }, [stages]);

  // Case-insensitive label → stage_id (for CSV imports)
  const stageIdByLabel = useMemo(() => {
    const m: Record<string, string> = {};
    stages.forEach((s) => {
      const norm = s.label.toLowerCase().trim();
      m[norm] = s.id;
    });
    return m;
  }, [stages]);

  // Resolve a CSV stage value to a stage_id (with aliasing)
  const resolveStageId = useCallback(
    (raw: any): string | null => {
      if (stages.length === 0) return null;
      const norm = String(raw || '')
        .toLowerCase()
        .trim();
      if (!norm) return stages[0].id;
      if (stageIdByLabel[norm]) return stageIdByLabel[norm];
      // Fuzzy aliases — pick the first stage whose label contains the alias
      const aliases: Record<string, string[]> = {
        applied: ['applied', 'applicant', 'application', 'new'],
        screening: ['screening', 'screen', 'review', 'under review'],
        interview: ['interview', 'interviewing'],
        accepted: ['accepted', 'accept', 'offered', 'hired'],
        rejected: ['rejected', 'reject', 'denied', 'declined'],
        member: ['member', 'active'],
      };
      for (const [key, list] of Object.entries(aliases)) {
        if (list.includes(norm)) {
          const match = stages.find((s) => s.label.toLowerCase().includes(key));
          if (match) return match.id;
        }
      }
      return stages[0].id;
    },
    [stages, stageIdByLabel]
  );

  // ─── Fetch ──────────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    if (!clubId) return;
    setLoading(true);

    const [stagesRes, applicantsRes] = await Promise.all([
      supabase
        .from('recruitment_stages')
        .select('*')
        .eq('club_id', clubId)
        .order('order_index', { ascending: true }),
      (supabase as any)
        .from('applicants')
        .select('*')
        .eq('club_id', clubId)
        .order('created_at', { ascending: false }),
    ]);

    console.log('[people] fetchAll for clubId:', clubId);
    console.log('[people] stages result:', {
      error: stagesRes.error,
      count: stagesRes.data?.length,
      stages: stagesRes.data,
    });
    console.log('[people] applicants result:', {
      error: applicantsRes.error,
      count: applicantsRes.data?.length,
    });

    if (stagesRes.error) {
      toast.error(`Stages: ${stagesRes.error.message}`);
    }
    if (applicantsRes.error) {
      toast.error(`Applicants: ${applicantsRes.error.message}`);
    }

    setStages((stagesRes.data as RecruitmentStage[]) || []);
    setApplicants((applicantsRes.data as Applicant[]) || []);
    setLoading(false);
  }, [clubId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Default Add Person stage = first stage
  useEffect(() => {
    if (!form.stage_id && stages.length > 0) {
      setForm((f) => ({ ...f, stage_id: stages[0].id }));
    }
  }, [stages, form.stage_id]);

  useEffect(() => {
    setSelected(new Set());
  }, [stageFilter, search]);

  // ─── Filtering ──────────────────────────────────────────────────────────────
  const filtered = applicants.filter((p) => {
    const matchesStage = stageFilter === 'all' || p.stage_id === stageFilter;
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      `${p.first_name} ${p.last_name}`.toLowerCase().includes(q) ||
      p.email?.toLowerCase().includes(q) ||
      p.major?.toLowerCase().includes(q);
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

  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    applicants.forEach((p) => {
      if (p.stage_id) counts[p.stage_id] = (counts[p.stage_id] || 0) + 1;
    });
    return counts;
  }, [applicants]);

  // ─── Bulk move ──────────────────────────────────────────────────────────────
  const handleBulkMove = async () => {
    if (!bulkStageId || selected.size === 0) return;
    setBulkMoving(true);
    const ids = [...selected];
    const { error } = await (supabase as any)
      .from('applicants')
      .update({ stage_id: bulkStageId, updated_at: new Date().toISOString() })
      .in('id', ids);
    if (error) {
      console.error('[people] bulk move error:', error);
      toast.error(error.message || 'Failed to move people');
      setBulkMoving(false);
      return;
    }
    toast.success(
      `Moved ${ids.length} ${ids.length === 1 ? 'person' : 'people'} to ${stageById[bulkStageId]?.label}`
    );
    setSelected(new Set());
    setBulkStageId('');
    fetchAll();
    setBulkMoving(false);
  };

  // ─── Delete (single + bulk) — open confirm dialog, execute on confirm ──────
  const requestDeleteOne = (id: string, name: string) => {
    setPendingDelete({ kind: 'one', id, name });
  };

  const requestDeleteBulk = () => {
    if (selected.size === 0) return;
    setPendingDelete({ kind: 'bulk', ids: [...selected] });
  };

  // Calls the admin-delete-applicants edge function with the user's JWT.
  // The function verifies ownership server-side and uses service role to
  // bypass RLS — so deletes work even if there's a club_id casing mismatch.
  const callDeleteFn = async (ids: string[]): Promise<{ deletedIds: string[]; error?: string }> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return { deletedIds: [], error: 'Not signed in' };

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/admin-delete-applicants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ club_id: clubId, ids }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { deletedIds: [], error: json.error || `HTTP ${res.status}` };
      }
      return { deletedIds: json.deleted_ids ?? [], error: undefined };
    } catch (e: any) {
      return { deletedIds: [], error: e?.message || 'Network error' };
    }
  };

  const executeDelete = async () => {
    if (!pendingDelete) return;

    const ids = pendingDelete.kind === 'one' ? [pendingDelete.id] : pendingDelete.ids;

    if (pendingDelete.kind === 'one') setDeletingId(pendingDelete.id);
    else setBulkDeleting(true);

    const { deletedIds, error } = await callDeleteFn(ids);

    console.log('[people] delete via fn:', {
      requested: ids.length,
      deleted: deletedIds.length,
      error,
    });

    if (error) {
      // Fallback: try direct delete via RLS in case the edge function isn't deployed yet
      console.warn('[people] edge fn failed, trying direct delete fallback');
      const { data, error: directErr } = await (supabase as any)
        .from('applicants')
        .delete()
        .in('id', ids)
        .select('id');

      if (directErr) {
        toast.error(`Delete failed: ${directErr.message}`);
      } else if (!data || data.length === 0) {
        toast.error(
          `Delete blocked. Edge function not deployed yet — deploy 'admin-delete-applicants' in Supabase dashboard, or run the normalize-club-ids SQL.`
        );
      } else {
        const got = data.map((r: { id: string }) => r.id);
        toast.success(`Deleted ${got.length} (via fallback)`);
        setApplicants((prev) => prev.filter((a) => !got.includes(a.id)));
        setSelected(new Set());
      }
    } else if (deletedIds.length === 0) {
      toast.error("Server says you're not an owner/officer of this club.");
    } else {
      toast.success(
        `Deleted ${deletedIds.length} ${deletedIds.length === 1 ? 'person' : 'people'}`
      );
      setApplicants((prev) => prev.filter((a) => !deletedIds.includes(a.id)));
      setSelected(new Set());
    }

    setDeletingId(null);
    setBulkDeleting(false);
    setPendingDelete(null);
    fetchAll();
  };

  // ─── Add Person ─────────────────────────────────────────────────────────────
  const handleAdd = async () => {
    if (!form.first_name.trim() || !form.last_name.trim()) {
      toast.error('First and last name required');
      return;
    }
    if (!form.email.trim()) {
      toast.error('Email is required');
      return;
    }
    setAdding(true);
    const { error } = await (supabase as any).from('applicants').insert({
      club_id: clubId,
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      email: form.email.trim().toLowerCase(),
      year: form.year || null,
      major: form.major.trim() || null,
      stage_id: form.stage_id || stages[0]?.id || null,
      notes: form.notes.trim() || null,
    });
    if (error) {
      console.error('[people] add error:', error);
      toast.error(error.message || 'Failed to add person');
      setAdding(false);
      return;
    }
    toast.success('Person added to Recruitment kanban');
    setAddOpen(false);
    setForm({
      first_name: '',
      last_name: '',
      email: '',
      year: '',
      major: '',
      stage_id: stages[0]?.id || '',
      notes: '',
    });
    fetchAll();
    setAdding(false);
  };

  // ─── Export CSV ─────────────────────────────────────────────────────────────
  const handleExport = () => {
    const data = filtered.map((p) => ({
      first_name: p.first_name,
      last_name: p.last_name,
      email: p.email || '',
      year: p.year || '',
      major: p.major || '',
      stage: p.stage_id ? stageById[p.stage_id]?.label || '' : '',
      notes: p.notes || '',
    }));
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const stageSlug =
      stageFilter !== 'all' ? (stageById[stageFilter]?.label || 'filtered').toLowerCase() + '_' : '';
    a.download = `people_${stageSlug}export.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${data.length} ${data.length === 1 ? 'person' : 'people'}`);
  };

  // ─── CSV import (client-side, writes to applicants) ─────────────────────────
  const pickHeader = (headers: string[], candidates: string[]): string | null => {
    const norm = headers.map((h) => h.toLowerCase().trim().replace(/[_\s-]+/g, ' '));
    for (const c of candidates) {
      const idx = norm.indexOf(c);
      if (idx >= 0) return headers[idx];
    }
    return null;
  };

  const parseCsvClientSide = (file: File): Promise<{ inserted: number; failed: any[] }> =>
    new Promise((resolve) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          const headers = (results.meta.fields || []).filter(Boolean) as string[];
          const nameCol = pickHeader(headers, ['name', 'full name', 'student', 'student name']);
          const firstNameCol = pickHeader(headers, ['first name', 'firstname', 'given name', 'first']);
          const lastNameCol = pickHeader(headers, ['last name', 'lastname', 'surname', 'family name', 'last']);
          const emailCol = pickHeader(headers, ['email', 'e mail', 'email address', 'student email']);
          const majorCol = pickHeader(headers, ['major', 'department', 'field', 'study', 'role', 'position']);
          const yearCol = pickHeader(headers, ['year', 'grad year', 'graduation year', 'class', 'class year', 'years exp']);
          const stageCol = pickHeader(headers, ['stage', 'status', 'state']);
          const notesCol = pickHeader(headers, ['notes', 'note', 'comments', 'comment', 'source']);

          const failed: any[] = [];
          const payload: any[] = [];

          for (const row of (results.data as any[]) || []) {
            let firstName = firstNameCol ? String(row[firstNameCol] || '').trim() : '';
            let lastName = lastNameCol ? String(row[lastNameCol] || '').trim() : '';

            if (!firstName && nameCol && row[nameCol]) {
              const parts = String(row[nameCol]).trim().split(/\s+/);
              firstName = parts[0] || '';
              lastName = parts.slice(1).join(' ') || '';
            }

            const email = emailCol ? String(row[emailCol] || '').trim().toLowerCase() : '';

            if (!firstName || !email || !email.includes('@')) {
              failed.push({
                first_name: firstName,
                last_name: lastName,
                email,
                major: majorCol ? row[majorCol] : '',
                flag_reason: !firstName
                  ? 'Name could not be determined'
                  : !email
                    ? 'Missing email address'
                    : 'Invalid email format',
              });
              continue;
            }

            payload.push({
              club_id: clubId,
              first_name: firstName,
              last_name: lastName || '',
              email,
              major: majorCol ? String(row[majorCol] || '').trim() || null : null,
              year: yearCol ? String(row[yearCol] || '').trim() || null : null,
              stage_id: resolveStageId(stageCol ? row[stageCol] : null),
              notes: notesCol ? String(row[notesCol] || '').trim() || null : null,
            });
          }

          console.log('[csv import] clubId:', clubId, 'stages:', stages.length, 'payload:', payload.length);
          if (payload.length > 0) {
            console.log('[csv import] sample row:', payload[0]);
          }

          let inserted = 0;
          for (let i = 0; i < payload.length; i += 100) {
            const chunk = payload.slice(i, i + 100);
            const { error } = await (supabase as any).from('applicants').insert(chunk);
            if (error) {
              console.error('[csv import] insert error:', error);
              chunk.forEach((p) =>
                failed.push({
                  ...p,
                  flag_reason: `DB error (${error.code || 'unknown'}): ${error.message}`,
                })
              );
            } else {
              inserted += chunk.length;
            }
          }

          // Verify rows actually landed (RLS could filter on read)
          if (inserted > 0) {
            const emails = payload.map((p) => p.email);
            const { data: verifyRows, error: verifyErr } = await (supabase as any)
              .from('applicants')
              .select('id, email')
              .eq('club_id', clubId)
              .in('email', emails.slice(0, 100));
            console.log('[csv import] post-insert verify:', {
              verifyErr,
              foundCount: verifyRows?.length,
              expectedAtLeast: Math.min(100, emails.length),
            });
            if (verifyErr) {
              toast.error(`Insert succeeded but read blocked: ${verifyErr.message}`);
            } else if ((verifyRows?.length || 0) === 0) {
              toast.error(
                "Rows inserted but can't read them back. RLS policy may be blocking reads — check that you're the owner/officer of this club."
              );
            }
          }

          resolve({ inserted, failed });
        },
        error: (err: any) => {
          console.error('[csv import] parse error:', err);
          resolve({ inserted: 0, failed: [{ flag_reason: `CSV parse error: ${err.message}` }] });
        },
      });
    });

  const handleSmartImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !clubId) return;
    e.target.value = '';

    if (stages.length === 0) {
      toast.error("No recruitment stages set up yet — visit the Recruitment tab first to create them.");
      return;
    }

    setSmartImporting(true);
    try {
      const isCsv = file.name.toLowerCase().endsWith('.csv');

      if (isCsv) {
        const { inserted, failed } = await parseCsvClientSide(file);
        if (inserted === 0 && failed.length === 0) {
          toast.error('No rows found in file');
        } else {
          toast.success(
            `${inserted} member${inserted !== 1 ? 's' : ''} imported into Recruitment${failed.length > 0 ? ` · ${failed.length} need attention` : ''}`
          );
        }
        if (failed.length > 0) {
          setNigoQueue(failed);
          setNigoEdits({});
        }
        fetchAll();
        return;
      }

      // XLS / XLSX → AI edge function
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
      if (nigoCount > 0) {
        setNigoQueue(json.nigo_queue ?? []);
        setNigoEdits({});
      }
      fetchAll();
    } catch (err: any) {
      console.error('[import] error:', err);
      toast.error(err?.message || 'Import failed — please try again');
    } finally {
      setSmartImporting(false);
    }
  };

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
                {applicants.length} total · {stages.length} stages · synced with Recruitment kanban
              </p>
              <p className="text-[10px] text-zinc-700 font-mono mt-0.5">
                club: {clubId} · stages: {stages.length} · loaded: {applicants.length}
              </p>
            </div>
            <div className="flex gap-2">
              <Link to={`/club-admin/clubs/${clubId}/recruitment`}>
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
                  <Upload className="w-4 h-4 mr-1.5" /> Export CSV
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
                  <Download className="w-4 h-4 mr-1.5" />
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
                      const { error } = await (supabase as any).from('applicants').insert({
                        club_id: clubId,
                        first_name: firstName,
                        last_name: lastName,
                        email,
                        major: edit.major || null,
                        year: edit.grad_year ? String(edit.grad_year) : null,
                        stage_id: stages[0]?.id || null,
                      });

                      if (error) throw error;
                      toast.success(`${firstName} ${lastName} imported!`);
                      setNigoQueue((prev) => prev.filter((_, i) => i !== idx));
                      setNigoEdits((prev) => {
                        const next = { ...prev };
                        delete next[idx];
                        return next;
                      });
                      fetchAll();
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
              All ({applicants.length})
            </button>
            {stages.map((s) => (
              <button
                key={s.id}
                onClick={() => setStageFilter(s.id)}
                className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
                style={
                  stageFilter === s.id
                    ? { background: stageColorById[s.id], color: '#000' }
                    : { background: 'rgba(255,255,255,0.05)', color: '#a1a1aa' }
                }
              >
                {s.label} ({stageCounts[s.id] || 0})
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
                <Select value={bulkStageId} onValueChange={setBulkStageId}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white h-8 text-sm w-44">
                    <SelectValue placeholder="Move to stage..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#111] border-white/10">
                    {stages.map((s) => (
                      <SelectItem key={s.id} value={s.id} className="text-white">
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleBulkMove}
                  disabled={!bulkStageId || bulkMoving}
                  size="sm"
                  className="bg-gold text-zinc-900 font-semibold hover:bg-gold/90 h-8"
                >
                  {bulkMoving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Move'}
                </Button>
                <Button
                  onClick={requestDeleteBulk}
                  disabled={bulkDeleting}
                  size="sm"
                  variant="outline"
                  className="border-red-500/30 text-red-400 hover:bg-red-500/10 h-8"
                >
                  {bulkDeleting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                    </>
                  )}
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
              {applicants.length === 0
                ? 'No people yet. Add your first member or import a roster.'
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
                      Decision
                    </th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((person, i) => {
                    const stage = person.stage_id ? stageById[person.stage_id] : undefined;
                    const stageColor = person.stage_id ? stageColorById[person.stage_id] : '#71717a';
                    return (
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
                          {stage ? (
                            <span
                              className="px-2 py-0.5 rounded-full text-xs font-medium"
                              style={{
                                background: stageColor + '22',
                                color: stageColor,
                              }}
                            >
                              {stage.label}
                            </span>
                          ) : (
                            <span className="text-zinc-600 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {person.final_decision === 'accepted' ? (
                            <span className="text-green-400">✓ Accepted</span>
                          ) : person.final_decision === 'rejected' ? (
                            <span className="text-red-400">✗ Rejected</span>
                          ) : (
                            <span className="text-zinc-600">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() =>
                                requestDeleteOne(
                                  person.id,
                                  `${person.first_name} ${person.last_name}`.trim()
                                )
                              }
                              disabled={deletingId === person.id}
                              className="text-zinc-600 hover:text-red-400 transition-colors disabled:opacity-50"
                              title="Delete"
                            >
                              {deletingId === person.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                            <Link
                              to={`/club-admin/clubs/${clubId}/recruitment?applicant=${person.id}`}
                              className="text-zinc-500 hover:text-white transition-colors"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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
              <Label className="text-zinc-400 text-xs">Email *</Label>
              <Input
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="bg-white/5 border-white/10 text-white mt-1"
                placeholder="required"
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
                value={form.stage_id}
                onValueChange={(v) => setForm((f) => ({ ...f, stage_id: v }))}
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white mt-1">
                  <SelectValue placeholder="Select stage" />
                </SelectTrigger>
                <SelectContent className="bg-[#111] border-white/10">
                  {stages.map((s) => (
                    <SelectItem key={s.id} value={s.id} className="text-white">
                      {s.label}
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
              disabled={adding || stages.length === 0}
              className="bg-gold text-zinc-900 font-semibold hover:bg-gold/90"
            >
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Person'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Custom delete confirmation dialog */}
      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <AlertDialogContent className="bg-[#111] border-white/10 text-white">
          <AlertDialogHeader>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div className="flex-1">
                <AlertDialogTitle className="text-white text-lg">
                  {pendingDelete?.kind === 'bulk'
                    ? `Delete ${pendingDelete.ids.length} ${pendingDelete.ids.length === 1 ? 'person' : 'people'}?`
                    : pendingDelete?.kind === 'one'
                      ? `Delete ${pendingDelete.name}?`
                      : 'Delete?'}
                </AlertDialogTitle>
                <AlertDialogDescription className="text-zinc-400 mt-2 leading-relaxed">
                  This is <span className="text-red-400 font-semibold">permanent</span> — they'll
                  also be removed from the Recruitment kanban, along with any rubric scores,
                  deliberation votes, and notes attached to them. This cannot be undone.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel className="bg-transparent border-white/10 text-zinc-300 hover:bg-white/5 hover:text-white">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={executeDelete}
              disabled={bulkDeleting || deletingId !== null}
              className="bg-red-500 text-white hover:bg-red-600 font-semibold"
            >
              {bulkDeleting || deletingId !== null ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-1.5" />
                  Delete permanently
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  );
}
