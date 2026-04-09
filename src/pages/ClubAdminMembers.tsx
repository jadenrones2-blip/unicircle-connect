import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useClubOwnership } from '@/hooks/useClubOwnership';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { ClubAdminSidebar } from '@/components/club-admin/ClubAdminSidebar';
import { AdminBreadcrumb } from '@/components/club-admin/AdminBreadcrumb';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Plus, Trash2, Upload, Download, Users, Search, DollarSign, Calendar, Trophy, Check, X, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import { dataClient } from '@/integrations/supabase/dataClient';

interface ClubMember {
  id: string;
  club_id: string;
  name: string;
  email: string | null;
  pid: string | null;
  major: string | null;
  year: string | null;
  status: 'active' | 'inactive' | 'alumni';
  role: 'member' | 'officer';
  joined_at: string | null;
  notes: string | null;
  dues_paid: boolean | null;
  dues_amount: number | null;
  dues_due_date: string | null;
  points: number | null;
  created_at: string;
  updated_at: string;
}

interface AttendanceSession {
  id: string;
  club_id: string;
  name: string;
  date: string;
  created_at: string;
}

interface AttendanceRecord {
  id: string;
  session_id: string;
  member_id: string;
  present: boolean;
}

interface PointTransaction {
  id: string;
  club_id: string;
  member_id: string;
  points: number;
  reason: string | null;
  created_at: string;
}

type ActiveTab = 'roster' | 'dues' | 'attendance' | 'points';
type StatusFilter = 'all' | 'active' | 'inactive';

const STATUS_COLORS: Record<string, string> = {
  active: '#34d399',
  inactive: '#71717a',
};

const YEARS = ['Freshman', 'Sophomore', 'Junior', 'Senior', 'Graduate', 'Other'] as const;


export default function ClubAdminMembers() {
  const { clubId } = useParams<{ clubId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { ownedClubs, loading: ownershipLoading } = useClubOwnership();
  const csvInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<ActiveTab>('roster');
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [saving, setSaving] = useState(false);
  const [deleteMemberId, setDeleteMemberId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [importing, setImporting] = useState(false);

  // Dues state
  const [editingDues, setEditingDues] = useState<string | null>(null);
  const [duesAmount, setDuesAmount] = useState('');
  const [duesDueDate, setDuesDueDate] = useState('');

  // Attendance state
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<AttendanceSession | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [showNewSession, setShowNewSession] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');
  const [newSessionDate, setNewSessionDate] = useState('');
  const [creatingSession, setCreatingSession] = useState(false);
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  // Points state
  const [pointTransactions, setPointTransactions] = useState<PointTransaction[]>([]);
  const [showAddPoints, setShowAddPoints] = useState<ClubMember | null>(null);
  const [pointAmount, setPointAmount] = useState('');
  const [pointReason, setPointReason] = useState('');
  const [addingPoints, setAddingPoints] = useState(false);

  const normalizeId = (id?: string) => (id ?? '').trim().toLowerCase();
  const club = ownedClubs.find((c) => normalizeId(c.clubId) === normalizeId(clubId));

  const isOwner = useMemo(() => {
    const target = normalizeId(clubId);
    if (!target) return false;
    return ownedClubs.some((c) => normalizeId(c.clubId) === target);
  }, [clubId, ownedClubs]);

  const fetchMembers = useCallback(async () => {
    if (!clubId) return;
    setLoading(true);
    try {
      const { data, error } = await dataClient
        .from('club_members')
        .select('*')
        .eq('club_id', clubId)
        .order('name');
      if (error) throw new Error(error.message);
      setMembers((data ?? []) as ClubMember[]);
    } catch (err) {
      console.error('Failed to load members:', err);
      toast.error('Failed to load members');
    } finally {
      setLoading(false);
    }
  }, [clubId]);

  const fetchSessions = useCallback(async () => {
    if (!clubId) return;
    try {
      const { data } = await dataClient
        .from('attendance_sessions')
        .select('*')
        .eq('club_id', clubId)
        .order('date', { ascending: false });
      setSessions((data ?? []) as AttendanceSession[]);
    } catch (err) {
      console.warn('Attendance sessions not available (run migration):', err);
    }
  }, [clubId]);

  const fetchAttendanceRecords = useCallback(async (sessionId: string) => {
    setLoadingAttendance(true);
    try {
      const { data } = await dataClient
        .from('attendance_records')
        .select('*')
        .eq('session_id', sessionId);
      setAttendanceRecords((data ?? []) as AttendanceRecord[]);
    } catch (err) {
      console.warn('Attendance records not available:', err);
    } finally {
      setLoadingAttendance(false);
    }
  }, []);

  const fetchPointTransactions = useCallback(async () => {
    if (!clubId) return;
    try {
      const { data } = await dataClient
        .from('point_transactions')
        .select('*')
        .eq('club_id', clubId)
        .order('created_at', { ascending: false })
        .limit(50);
      setPointTransactions((data ?? []) as PointTransaction[]);
    } catch (err) {
      console.warn('Point transactions not available (run migration):', err);
    }
  }, [clubId]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      toast.error('Please log in to access club admin');
      navigate(`/login?redirect=${encodeURIComponent(`/club-admin/clubs/${clubId}/members`)}`);
    }
  }, [authLoading, user, clubId, navigate]);

  useEffect(() => {
    if (authLoading || !user || ownershipLoading) return;
    if (clubId && !isOwner) {
      toast.error('You do not own this club');
      navigate('/club-admin');
    }
  }, [authLoading, user, ownershipLoading, clubId, isOwner, navigate]);

  useEffect(() => {
    if (club && !authLoading && user && !ownershipLoading && isOwner) {
      fetchMembers();
    }
  }, [authLoading, user, ownershipLoading, club, isOwner, fetchMembers]);

  useEffect(() => {
    if (activeTab === 'attendance' && club) fetchSessions();
    if (activeTab === 'points' && club) fetchPointTransactions();
  }, [activeTab, club, fetchSessions, fetchPointTransactions]);

  useEffect(() => {
    if (selectedSession) fetchAttendanceRecords(selectedSession.id);
  }, [selectedSession, fetchAttendanceRecords]);

  const stats = useMemo(() => ({
    total: members.length,
    active: members.filter((m) => m.status === 'active').length,
    inactive: members.filter((m) => m.status === 'inactive').length,
    officers: members.filter((m) => m.role === 'officer').length,
  }), [members]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return members.filter((m) => {
      if (statusFilter !== 'all' && m.status !== statusFilter) return false;
      if (q) return m.name.toLowerCase().includes(q) || (m.email ?? '').toLowerCase().includes(q) || (m.pid ?? '').toLowerCase().includes(q);
      return true;
    });
  }, [members, search, statusFilter]);

  // ── Roster handlers ────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!deleteMemberId) return;
    setDeleting(true);
    try {
      const { error } = await dataClient.from('club_members').delete().eq('id', deleteMemberId);
      if (error) throw new Error(error.message);
      setMembers((prev) => prev.filter((m) => m.id !== deleteMemberId));
      toast.success('Member removed');
    } catch (err) { console.error(err); toast.error('Failed to remove member'); }
    finally { setDeleting(false); setDeleteMemberId(null); }
  };

  const cycleStatus = async (member: ClubMember) => {
    const next: Record<string, ClubMember['status']> = { active: 'inactive', inactive: 'active', alumni: 'active' };
    const newStatus = next[member.status];
    try {
      const { error } = await dataClient.from('club_members').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', member.id);
      if (error) throw new Error(error.message);
      setMembers((prev) => prev.map((m) => m.id === member.id ? { ...m, status: newStatus } : m));
    } catch (err) { console.error(err); toast.error('Failed to update status'); }
  };

  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !clubId) return;
    setImporting(true);
    try {
      const text = await file.text();
      // Split on newlines, strip BOM, filter blanks
      const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      if (lines.length < 2) { toast.error('CSV must have a header row and at least one data row'); return; }

      // Parse headers — strip quotes
      const rawHeaders = lines[0].split(',').map((h) => h.replace(/^["']|["']$/g, '').trim().toLowerCase());

      // Flexible column resolver — accepts many common naming conventions
      const resolve = (...candidates: string[]) => {
        for (const c of candidates) {
          const idx = rawHeaders.findIndex((h) => h === c || h.replace(/[\s_-]/g, '') === c.replace(/[\s_-]/g, ''));
          if (idx >= 0) return idx;
        }
        return -1;
      };

      // Name: try combined first, then split first+last
      const fullNameIdx  = resolve('name', 'fullname', 'full name', 'full_name', 'member name', 'student name', 'member');
      const firstNameIdx = resolve('first name', 'firstname', 'first', 'given name');
      const lastNameIdx  = resolve('last name', 'lastname', 'last', 'surname', 'family name');
      const emailIdx     = resolve('email', 'email address', 'e-mail', 'emailaddress');
      const pidIdx       = resolve('pid', 'student id', 'studentid', 'id', 'student_id', 'a-number', 'anumber');
      const majorIdx     = resolve('major', 'major/minor', 'degree', 'program', 'field of study');
      const yearIdx      = resolve('year', 'class year', 'grade', 'year in school', 'academic year', 'level');
      const roleIdx      = resolve('role', 'position', 'title');
      const notesIdx     = resolve('notes', 'note', 'comments', 'comment', 'remarks');
      const joinedIdx    = resolve('joined', 'joined at', 'join date', 'start date', 'date joined');

      const hasName = fullNameIdx >= 0 || (firstNameIdx >= 0 && lastNameIdx >= 0) || firstNameIdx >= 0;
      if (!hasName) {
        toast.error('Could not find a name column. Expected "name", "full name", or "first name" + "last name".');
        return;
      }

      // Parse a CSV line respecting quoted fields
      const parseLine = (line: string): string[] => {
        const cols: string[] = [];
        let cur = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const ch = line[i];
          if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
          else if (ch === '"') { inQuotes = !inQuotes; }
          else if (ch === ',' && !inQuotes) { cols.push(cur.trim()); cur = ''; }
          else { cur += ch; }
        }
        cols.push(cur.trim());
        return cols;
      };

      const get = (cols: string[], idx: number) => (idx >= 0 && idx < cols.length ? cols[idx].replace(/^["']|["']$/g, '').trim() : '');

      const rows = lines.slice(1).map((line) => {
        const cols = parseLine(line);

        let name = '';
        if (fullNameIdx >= 0) {
          name = get(cols, fullNameIdx);
        } else {
          const first = get(cols, firstNameIdx);
          const last  = lastNameIdx >= 0 ? get(cols, lastNameIdx) : '';
          name = [first, last].filter(Boolean).join(' ');
        }
        if (!name) return null;

        const yearRaw = get(cols, yearIdx);
        // Normalize year: "Jr" → "Junior", "Sr" → "Senior" etc.
        const yearMap: Record<string, string> = {
          '1': 'Freshman', 'first': 'Freshman', 'fr': 'Freshman', 'frosh': 'Freshman',
          '2': 'Sophomore', 'second': 'Sophomore', 'so': 'Sophomore', 'soph': 'Sophomore',
          '3': 'Junior', 'third': 'Junior', 'jr': 'Junior',
          '4': 'Senior', 'fourth': 'Senior', 'sr': 'Senior',
          '5': 'Graduate', 'grad': 'Graduate', 'graduate': 'Graduate', 'ms': 'Graduate', 'phd': 'Graduate',
        };
        const normalizedYear = yearMap[yearRaw.toLowerCase()] ?? (YEARS.includes(yearRaw as typeof YEARS[number]) ? yearRaw : null);

        const roleRaw = get(cols, roleIdx).toLowerCase();
        const role: ClubMember['role'] = roleRaw.includes('officer') || roleRaw.includes('exec') || roleRaw.includes('lead') ? 'officer' : 'member';

        return {
          club_id: clubId,
          name,
          email:     get(cols, emailIdx)  || null,
          pid:       get(cols, pidIdx)     || null,
          major:     get(cols, majorIdx)   || null,
          year:      normalizedYear,
          role,
          notes:     get(cols, notesIdx)   || null,
          joined_at: get(cols, joinedIdx)  || null,
          status:    'active' as const,
        };
      }).filter(Boolean) as Omit<ClubMember, 'id' | 'dues_paid' | 'dues_amount' | 'dues_due_date' | 'points' | 'created_at' | 'updated_at'>[];

      if (rows.length === 0) { toast.error('No valid rows found in CSV'); return; }
      const { error } = await dataClient.from('club_members').insert(rows);
      if (error) throw new Error(error.message);
      toast.success(`Imported ${rows.length} member${rows.length !== 1 ? 's' : ''}`);
      fetchMembers();
    } catch (err) { console.error(err); toast.error('Failed to import CSV'); }
    finally { setImporting(false); if (csvInputRef.current) csvInputRef.current.value = ''; }
  };

  const handleCsvExport = () => {
    const list = filtered.length > 0 && (search || statusFilter !== 'all') ? filtered : members;
    if (list.length === 0) { toast.error('No members to export'); return; }
    const q = (v: string | number | null | undefined) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const headers = ['Full Name', 'Email', 'PID', 'Major', 'Year', 'Status', 'Role', 'Joined At', 'Dues Paid', 'Dues Amount', 'Dues Due Date', 'Points', 'Notes'];
    const rows = list.map((m) => [
      q(m.name), q(m.email), q(m.pid), q(m.major), q(m.year),
      q(m.status), q(m.role), q(m.joined_at ? new Date(m.joined_at).toLocaleDateString() : ''),
      q(m.dues_paid ? 'Yes' : 'No'), q(m.dues_amount ?? ''), q(m.dues_due_date ?? ''),
      q(m.points ?? 0), q(m.notes),
    ].join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${club?.clubName ?? 'members'}_roster_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${list.length} member${list.length !== 1 ? 's' : ''}`);
  };

  // ── Dues handlers ──────────────────────────────────────────────────────────

  const toggleDuesPaid = async (member: ClubMember) => {
    const newPaid = !member.dues_paid;
    try {
      const { error } = await dataClient.from('club_members').update({ dues_paid: newPaid, updated_at: new Date().toISOString() }).eq('id', member.id);
      if (error) throw new Error(error.message);
      setMembers((prev) => prev.map((m) => m.id === member.id ? { ...m, dues_paid: newPaid } : m));
    } catch (err) { console.error(err); toast.error('Failed to update dues'); }
  };

  const saveDuesEdit = async (member: ClubMember) => {
    try {
      const { error } = await dataClient.from('club_members').update({
        dues_amount: duesAmount ? parseFloat(duesAmount) : null,
        dues_due_date: duesDueDate || null,
        updated_at: new Date().toISOString(),
      }).eq('id', member.id);
      if (error) throw new Error(error.message);
      setMembers((prev) => prev.map((m) => m.id === member.id ? { ...m, dues_amount: duesAmount ? parseFloat(duesAmount) : null, dues_due_date: duesDueDate || null } : m));
      setEditingDues(null);
      toast.success('Dues updated');
    } catch (err) { console.error(err); toast.error('Failed to update dues'); }
  };

  const markAllPaid = async () => {
    const unpaid = members.filter((m) => !m.dues_paid);
    if (unpaid.length === 0) { toast.error('All members are already marked as paid'); return; }
    try {
      await Promise.all(unpaid.map((m) => dataClient.from('club_members').update({ dues_paid: true, updated_at: new Date().toISOString() }).eq('id', m.id)));
      setMembers((prev) => prev.map((m) => ({ ...m, dues_paid: true })));
      toast.success(`Marked ${unpaid.length} members as paid`);
    } catch (err) { console.error(err); toast.error('Failed to mark all paid'); }
  };

  // ── Attendance handlers ────────────────────────────────────────────────────

  const createSession = async () => {
    if (!newSessionName.trim() || !newSessionDate || !clubId) return;
    setCreatingSession(true);
    try {
      const { data, error } = await dataClient.from('attendance_sessions').insert({
        club_id: clubId, name: newSessionName.trim(), date: newSessionDate,
      }).select().single();
      if (error) throw new Error(error.message);
      const newSession = data as AttendanceSession;
      setSessions((prev) => [newSession, ...prev]);
      setSelectedSession(newSession);
      setShowNewSession(false);
      setNewSessionName('');
      setNewSessionDate('');
      toast.success('Session created');
    } catch (err) { console.error(err); toast.error('Failed to create session'); }
    finally { setCreatingSession(false); }
  };

  const toggleAttendance = async (memberId: string) => {
    if (!selectedSession) return;
    const existing = attendanceRecords.find((r) => r.member_id === memberId);
    const newPresent = existing ? !existing.present : true;
    try {
      await dataClient.from('attendance_records').upsert({
        session_id: selectedSession.id, member_id: memberId, present: newPresent,
      }, { onConflict: 'session_id,member_id' });
      setAttendanceRecords((prev) => {
        const idx = prev.findIndex((r) => r.member_id === memberId);
        if (idx >= 0) { const next = [...prev]; next[idx] = { ...next[idx], present: newPresent }; return next; }
        return [...prev, { id: '', session_id: selectedSession.id, member_id: memberId, present: newPresent }];
      });
    } catch (err) { console.error(err); toast.error('Failed to update attendance'); }
  };

  // ── Points handlers ────────────────────────────────────────────────────────

  const handleAddPoints = async () => {
    if (!showAddPoints || !pointAmount || !clubId) return;
    const pts = parseInt(pointAmount, 10);
    if (isNaN(pts) || pts === 0) { toast.error('Enter a valid non-zero point amount'); return; }
    setAddingPoints(true);
    try {
      const { error: txError } = await dataClient.from('point_transactions').insert({
        club_id: clubId, member_id: showAddPoints.id, points: pts, reason: pointReason.trim() || null,
      });
      if (txError) throw new Error(txError.message);
      const newPoints = (showAddPoints.points ?? 0) + pts;
      const { error: updateError } = await dataClient.from('club_members').update({ points: newPoints, updated_at: new Date().toISOString() }).eq('id', showAddPoints.id);
      if (updateError) throw new Error(updateError.message);
      setMembers((prev) => prev.map((m) => m.id === showAddPoints.id ? { ...m, points: newPoints } : m));
      fetchPointTransactions();
      setShowAddPoints(null);
      setPointAmount('');
      setPointReason('');
      toast.success(`${pts > 0 ? '+' : ''}${pts} points for ${showAddPoints.name}`);
    } catch (err) { console.error(err); toast.error('Failed to add points'); }
    finally { setAddingPoints(false); }
  };

  // ── Loading/guard states ───────────────────────────────────────────────────

  if (authLoading || ownershipLoading || (!club && ownedClubs.length === 0)) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-8 h-8 text-gold animate-spin" /></div>;
  }
  if (!user) return null;
  if (!club) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <ClubAdminSidebar />
          <main className="flex-1 p-8">
            <div className="text-center py-12">
              <h2 className="text-xl font-semibold mb-2">Club not found</h2>
              <p className="text-muted-foreground mb-4">You may not have access to this club or it doesn't exist.</p>
              <Button variant="outline" asChild><Link to="/club-admin">Back to Dashboard</Link></Button>
            </div>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  const TABS: { key: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { key: 'roster', label: 'Roster', icon: <Users className="w-3.5 h-3.5" /> },
    { key: 'dues', label: 'Dues', icon: <DollarSign className="w-3.5 h-3.5" /> },
    { key: 'attendance', label: 'Attendance', icon: <Calendar className="w-3.5 h-3.5" /> },
    { key: 'points', label: 'Points', icon: <Trophy className="w-3.5 h-3.5" /> },
  ];

  const today = new Date().toISOString().split('T')[0];
  const activeMembers = members.filter((m) => m.status === 'active');
  const sortedByPoints = [...activeMembers].sort((a, b) => (b.points ?? 0) - (a.points ?? 0));

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <ClubAdminSidebar />

        <main className="flex-1">
          {/* Header */}
          <header className="h-16 border-b border-border flex items-center justify-between px-4 gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <SidebarTrigger className="shrink-0" />
              <div className="min-w-0">
                <h1 className="text-base sm:text-xl font-display font-bold text-foreground tracking-tight truncate">{club.clubName}</h1>
                <p className="text-xs text-muted-foreground tracking-wide uppercase font-medium">Members</p>
              </div>
            </div>
            {activeTab === 'roster' && (
              <div className="flex gap-2 shrink-0">
                <input ref={csvInputRef} type="file" accept=".csv" className="hidden" onChange={handleCsvImport} />
                <Button variant="outline" size="sm" onClick={() => csvInputRef.current?.click()} disabled={importing}>
                  {importing ? <Loader2 className="w-4 h-4 animate-spin sm:mr-2" /> : <Upload className="w-4 h-4 sm:mr-2" />}
                  <span className="hidden sm:inline">Import CSV</span>
                </Button>
                <Button variant="outline" size="sm" onClick={handleCsvExport}>
                  <Download className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Export</span>
                </Button>
              </div>
            )}
            {activeTab === 'attendance' && (
              <Button variant="gold" onClick={() => setShowNewSession(true)} className="shrink-0">
                <Plus className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">New Session</span>
              </Button>
            )}
          </header>

          <div className="p-6 space-y-5">
            <AdminBreadcrumb items={[{ label: club.clubName, href: `/clubs/${clubId}` }, { label: 'Members' }]} />

            {/* Stats strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[{ label: 'Total', value: stats.total }, { label: 'Active', value: stats.active }, { label: 'Inactive', value: stats.inactive }, { label: 'Officers', value: stats.officers }].map((s) => (
                <div key={s.label} className="rounded-xl border border-border bg-card p-4 text-center">
                  <p className="text-2xl font-bold font-display text-foreground">{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Tab pills */}
            <div className="flex flex-wrap gap-2">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                  style={activeTab === tab.key
                    ? { background: 'hsl(43 74% 56%)', color: '#000' }
                    : { background: 'transparent', color: '#71717a', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  {tab.icon}{tab.label}
                </button>
              ))}
            </div>

            {/* ── ROSTER TAB ─────────────────────────────────────────────── */}
            {activeTab === 'roster' && (
              <>
                <div className="flex flex-wrap gap-3 items-center">
                  <div className="relative w-full sm:flex-1 sm:min-w-[200px] sm:max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Search name, email, PID…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(['all', 'active', 'inactive'] as StatusFilter[]).map((s) => (
                      <button key={s} onClick={() => setStatusFilter(s)} className="shrink-0 px-3 py-1 rounded-full text-xs font-medium capitalize transition-all"
                        style={statusFilter === s ? { background: s === 'all' ? 'hsl(43 74% 56%)' : STATUS_COLORS[s], color: '#000', border: '1px solid transparent' } : { background: 'transparent', color: '#71717a', border: '1px solid rgba(255,255,255,0.1)' }}>
                        {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {loading ? (
                  <div className="premium-card overflow-hidden">
                    <Table>
                      <TableHeader><TableRow>{['Name','Email','PID','Major','Year','Status','Role','Joined',''].map((h) => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader>
                      <TableBody>{[...Array(5)].map((_, i) => <TableRow key={i}>{[...Array(9)].map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>)}</TableBody>
                    </Table>
                  </div>
                ) : members.length === 0 ? (
                  <div className="text-center py-20">
                    <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-foreground mb-2">No members yet</h2>
                    <p className="text-muted-foreground mb-6">Import your roster from a CSV file to get started.</p>
                    <Button variant="gold" onClick={() => csvInputRef.current?.click()}><Upload className="w-4 h-4 mr-2" />Import CSV</Button>
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="text-center py-16">
                    <p className="text-muted-foreground">No members match your search or filter.</p>
                    <Button variant="ghost" className="mt-3" onClick={() => { setSearch(''); setStatusFilter('all'); }}>Clear filters</Button>
                  </div>
                ) : (
                  <div className="premium-card overflow-hidden">
                    <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>PID</TableHead>
                          <TableHead>Major</TableHead><TableHead>Year</TableHead><TableHead>Status</TableHead>
                          <TableHead>Role</TableHead><TableHead>Joined</TableHead><TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filtered.map((member) => (
                          <TableRow key={member.id}>
                            <TableCell className="font-medium">{member.name}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{member.email ?? '—'}</TableCell>
                            <TableCell className="text-sm text-muted-foreground font-mono">{member.pid ?? '—'}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{member.major ?? '—'}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{member.year ?? '—'}</TableCell>
                            <TableCell>
                              <button onClick={() => cycleStatus(member)} title="Click to cycle status" className="cursor-pointer">
                                <Badge style={{ background: STATUS_COLORS[member.status] + '22', color: STATUS_COLORS[member.status], border: `1px solid ${STATUS_COLORS[member.status]}44` }} className="capitalize text-xs font-medium">{member.status}</Badge>
                              </button>
                            </TableCell>
                            <TableCell><span className="text-xs text-muted-foreground capitalize">{member.role}</span></TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {member.joined_at ? new Date(member.joined_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—'}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setDeleteMemberId(member.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    </div>
                    <div className="px-4 py-2 border-t border-border text-xs text-muted-foreground">
                      {filtered.length} of {members.length} member{members.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ── DUES TAB ───────────────────────────────────────────────── */}
            {activeTab === 'dues' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-zinc-500">
                    <span className="text-green-400 font-medium">{members.filter((m) => m.dues_paid).length}</span> paid ·{' '}
                    <span className="text-red-400 font-medium">{members.filter((m) => !m.dues_paid).length}</span> unpaid
                  </div>
                  <Button variant="outline" size="sm" onClick={markAllPaid} className="text-green-400 border-green-500/30 hover:bg-green-500/10 hover:text-green-400">
                    <Check className="w-3.5 h-3.5 mr-1.5" />Mark All Paid
                  </Button>
                </div>

                <div className="premium-card overflow-hidden">
                  <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead><TableHead>Email</TableHead>
                        <TableHead>Amount</TableHead><TableHead>Due Date</TableHead>
                        <TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {members.map((member) => {
                        const isOverdue = member.dues_due_date && member.dues_due_date < today && !member.dues_paid;
                        const isEditing = editingDues === member.id;
                        return (
                          <TableRow key={member.id}>
                            <TableCell className="font-medium">{member.name}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{member.email ?? '—'}</TableCell>
                            <TableCell>
                              {isEditing ? (
                                <Input type="number" step="0.01" min="0" value={duesAmount} onChange={(e) => setDuesAmount(e.target.value)} placeholder="0.00" className="w-24 h-7 text-sm bg-zinc-900 border-white/10 text-white" />
                              ) : (
                                <span className="text-sm text-muted-foreground">{member.dues_amount != null ? `$${member.dues_amount.toFixed(2)}` : '—'}</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {isEditing ? (
                                <Input type="date" value={duesDueDate} onChange={(e) => setDuesDueDate(e.target.value)} className="w-36 h-7 text-sm bg-zinc-900 border-white/10 text-white" />
                              ) : (
                                <span className={`text-sm ${isOverdue ? 'text-red-400' : 'text-muted-foreground'}`}>
                                  {member.dues_due_date ? new Date(member.dues_due_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                                  {isOverdue && <span className="ml-1.5 text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded-full">Overdue</span>}
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              <button onClick={() => toggleDuesPaid(member)} className="cursor-pointer">
                                <Badge style={member.dues_paid
                                  ? { background: '#34d39922', color: '#34d399', border: '1px solid #34d39944' }
                                  : { background: '#ef444422', color: '#ef4444', border: '1px solid #ef444444' }}
                                  className="text-xs font-medium">
                                  {member.dues_paid ? 'Paid' : 'Unpaid'}
                                </Badge>
                              </button>
                            </TableCell>
                            <TableCell className="text-right">
                              {isEditing ? (
                                <div className="flex gap-1 justify-end">
                                  <Button size="sm" variant="ghost" className="h-7 px-2 text-green-400 hover:text-green-400" onClick={() => saveDuesEdit(member)}><Check className="w-3.5 h-3.5" /></Button>
                                  <Button size="sm" variant="ghost" className="h-7 px-2 text-zinc-500 hover:text-zinc-400" onClick={() => setEditingDues(null)}><X className="w-3.5 h-3.5" /></Button>
                                </div>
                              ) : (
                                <Button size="sm" variant="ghost" className="h-7 px-2 text-zinc-500 hover:text-zinc-300" onClick={() => { setEditingDues(member.id); setDuesAmount(member.dues_amount?.toString() ?? ''); setDuesDueDate(member.dues_due_date ?? ''); }}>Edit</Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  </div>
                  {members.length === 0 && <div className="p-8 text-center text-zinc-500 text-sm">No members yet. Add members in the Roster tab first.</div>}
                </div>
              </div>
            )}

            {/* ── ATTENDANCE TAB ─────────────────────────────────────────── */}
            {activeTab === 'attendance' && (
              <div className="flex flex-col sm:flex-row gap-4 min-h-[400px]">
                {/* Sessions list */}
                <div className="w-full sm:w-64 sm:shrink-0 space-y-2">
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">Sessions</p>
                  {sessions.length === 0 ? (
                    <div className="text-sm text-zinc-600 py-4 text-center">No sessions yet.<br/>Create one to start tracking.</div>
                  ) : (
                    sessions.map((session) => (
                      <button
                        key={session.id}
                        onClick={() => setSelectedSession(session)}
                        className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all ${selectedSession?.id === session.id ? 'bg-gold/10 border border-gold/30 text-white' : 'bg-zinc-900/40 border border-white/8 text-zinc-400 hover:text-white hover:border-white/15'}`}
                      >
                        <p className="font-medium truncate">{session.name}</p>
                        <p className="text-xs text-zinc-600 mt-0.5">
                          {new Date(session.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </button>
                    ))
                  )}
                </div>

                {/* Attendance grid */}
                <div className="flex-1">
                  {!selectedSession ? (
                    <div className="flex flex-col items-center justify-center h-full text-zinc-600 text-sm">
                      <Calendar className="w-10 h-10 mb-3 opacity-30" />
                      {sessions.length > 0 ? 'Select a session to view attendance' : 'Create a session to get started'}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-white font-semibold">{selectedSession.name}</h3>
                          <p className="text-xs text-zinc-500">
                            {new Date(selectedSession.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                        <span className="text-sm text-zinc-400">
                          <span className="text-green-400 font-medium">{attendanceRecords.filter((r) => r.present).length}</span>
                          {' / '}{activeMembers.length} attended
                        </span>
                      </div>

                      {loadingAttendance ? (
                        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-gold animate-spin" /></div>
                      ) : activeMembers.length === 0 ? (
                        <p className="text-zinc-600 text-sm">No active members to track.</p>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {activeMembers.map((member) => {
                            const record = attendanceRecords.find((r) => r.member_id === member.id);
                            const present = record?.present ?? false;
                            return (
                              <button
                                key={member.id}
                                onClick={() => toggleAttendance(member.id)}
                                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-left transition-all text-sm ${present ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-zinc-900/40 border-white/8 text-zinc-500 hover:border-white/15 hover:text-zinc-400'}`}
                              >
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${present ? 'bg-green-500/20' : 'bg-zinc-800'}`}>
                                  {present ? <Check className="w-3 h-3" /> : <X className="w-3 h-3 opacity-40" />}
                                </div>
                                <span className="truncate font-medium">{member.name.split(' ')[0]}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── POINTS TAB ─────────────────────────────────────────────── */}
            {activeTab === 'points' && (
              <div className="space-y-5">
                <div>
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">Leaderboard</p>
                  {sortedByPoints.length === 0 ? (
                    <div className="text-sm text-zinc-600 text-center py-8">No active members yet.</div>
                  ) : (
                    <div className="space-y-2">
                      {sortedByPoints.map((member, idx) => (
                        <div key={member.id} className="flex items-center gap-3 rounded-lg border border-white/8 bg-zinc-900/40 px-4 py-3">
                          <span className={`text-sm font-bold w-6 shrink-0 ${idx === 0 ? 'text-gold' : idx === 1 ? 'text-zinc-300' : idx === 2 ? 'text-amber-600' : 'text-zinc-600'}`}>
                            #{idx + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-medium truncate">{member.name}</p>
                            <p className="text-xs text-zinc-600 truncate">{member.email ?? member.year ?? ''}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-gold font-bold font-display text-lg">{member.points ?? 0}</span>
                            <Button size="sm" variant="outline" className="h-7 px-2 text-xs text-zinc-400 border-white/10 hover:border-white/20 hover:text-white"
                              onClick={() => { setShowAddPoints(member); setPointAmount(''); setPointReason(''); }}>
                              <Plus className="w-3 h-3 mr-1" />Points
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {pointTransactions.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">Recent Transactions</p>
                    <div className="space-y-1.5">
                      {pointTransactions.slice(0, 20).map((tx) => {
                        const m = members.find((mb) => mb.id === tx.member_id);
                        return (
                          <div key={tx.id} className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-zinc-900/30 border border-white/6 text-sm">
                            <span className={`font-bold w-14 shrink-0 ${tx.points > 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {tx.points > 0 ? '+' : ''}{tx.points}
                            </span>
                            <span className="text-zinc-300 font-medium">{m?.name ?? 'Unknown'}</span>
                            {tx.reason && <span className="text-zinc-500 truncate">{tx.reason}</span>}
                            <span className="ml-auto text-zinc-700 text-xs shrink-0">
                              {new Date(tx.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteMemberId} onOpenChange={() => setDeleteMemberId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to remove this member from the roster? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* New Session Modal */}
      <Dialog open={showNewSession} onOpenChange={setShowNewSession}>
        <DialogContent className="sm:max-w-md bg-zinc-950 border-white/10">
          <DialogHeader><DialogTitle className="text-white font-display">New Attendance Session</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-zinc-300">Session Name</Label>
              <Input value={newSessionName} onChange={(e) => setNewSessionName(e.target.value)} placeholder="e.g. Weekly Meeting, Spring Kickoff" className="bg-zinc-900 border-white/10 text-white placeholder:text-zinc-600" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-zinc-300">Date</Label>
              <Input type="date" value={newSessionDate} onChange={(e) => setNewSessionDate(e.target.value)} className="bg-zinc-900 border-white/10 text-white" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewSession(false)} className="border-white/20 text-white hover:bg-white/10 hover:text-white">Cancel</Button>
            <Button variant="gold" onClick={createSession} disabled={creatingSession || !newSessionName.trim() || !newSessionDate}>
              {creatingSession ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}Create Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Points Modal */}
      <Dialog open={!!showAddPoints} onOpenChange={(o) => { if (!o) setShowAddPoints(null); }}>
        <DialogContent className="sm:max-w-sm bg-zinc-950 border-white/10">
          <DialogHeader><DialogTitle className="text-white font-display">Points for {showAddPoints?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-zinc-300">Points <span className="text-zinc-500">(use negative to deduct)</span></Label>
              <Input type="number" value={pointAmount} onChange={(e) => setPointAmount(e.target.value)} placeholder="e.g. 10 or -5" className="bg-zinc-900 border-white/10 text-white placeholder:text-zinc-600" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-zinc-300">Reason <span className="text-zinc-600">(optional)</span></Label>
              <Input value={pointReason} onChange={(e) => setPointReason(e.target.value)} placeholder="e.g. Helped at event, Attended meeting" className="bg-zinc-900 border-white/10 text-white placeholder:text-zinc-600" />
            </div>
            {showAddPoints && (
              <p className="text-xs text-zinc-600">Current balance: <span className="text-zinc-400 font-medium">{showAddPoints.points ?? 0} pts</span></p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddPoints(null)}>Cancel</Button>
            <Button variant="gold" onClick={handleAddPoints} disabled={addingPoints || !pointAmount}>
              {addingPoints ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trophy className="w-4 h-4 mr-2" />}Add Points
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
