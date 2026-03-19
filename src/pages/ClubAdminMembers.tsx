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
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Plus, Trash2, Upload, Download, Users, Search } from 'lucide-react';
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
  created_at: string;
  updated_at: string;
}

type StatusFilter = 'all' | 'active' | 'inactive' | 'alumni';

const STATUS_COLORS: Record<string, string> = {
  active: '#34d399',
  inactive: '#71717a',
  alumni: '#60a5fa',
};

const YEARS = ['Freshman', 'Sophomore', 'Junior', 'Senior', 'Graduate', 'Other'] as const;

const defaultForm = {
  name: '',
  email: '',
  pid: '',
  major: '',
  year: '',
  status: 'active' as const,
  role: 'member' as const,
  joined_at: '',
  notes: '',
};

export default function ClubAdminMembers() {
  const { clubId } = useParams<{ clubId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { ownedClubs, loading: ownershipLoading } = useClubOwnership();
  const csvInputRef = useRef<HTMLInputElement>(null);

  const [members, setMembers] = useState<ClubMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [deleteMemberId, setDeleteMemberId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [importing, setImporting] = useState(false);

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

  // Auth guard
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      const redirect = `/club-admin/clubs/${clubId}/members`;
      toast.error('Please log in to access club admin');
      navigate(`/login?redirect=${encodeURIComponent(redirect)}`);
    }
  }, [authLoading, user, clubId, navigate]);

  // Ownership guard
  useEffect(() => {
    if (authLoading || !user || ownershipLoading) return;
    if (clubId && !isOwner) {
      toast.error('You do not own this club');
      navigate('/club-admin');
    }
  }, [authLoading, user, ownershipLoading, clubId, isOwner, navigate]);

  // Fetch when ready
  useEffect(() => {
    if (club && !authLoading && user && !ownershipLoading && isOwner) {
      fetchMembers();
    }
  }, [authLoading, user, ownershipLoading, club, isOwner, fetchMembers]);

  // Stats
  const stats = useMemo(() => ({
    total: members.length,
    active: members.filter((m) => m.status === 'active').length,
    officers: members.filter((m) => m.role === 'officer').length,
    alumni: members.filter((m) => m.status === 'alumni').length,
  }), [members]);

  // Filtered list
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return members.filter((m) => {
      if (statusFilter !== 'all' && m.status !== statusFilter) return false;
      if (q) {
        return (
          m.name.toLowerCase().includes(q) ||
          (m.email ?? '').toLowerCase().includes(q) ||
          (m.pid ?? '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [members, search, statusFilter]);

  const handleAddMember = async () => {
    if (!form.name.trim() || !clubId) return;
    setSaving(true);
    try {
      const { error } = await dataClient.from('club_members').insert({
        club_id: clubId,
        name: form.name.trim(),
        email: form.email.trim() || null,
        pid: form.pid.trim() || null,
        major: form.major.trim() || null,
        year: form.year || null,
        status: form.status,
        role: form.role,
        joined_at: form.joined_at || null,
        notes: form.notes.trim() || null,
      });
      if (error) throw new Error(error.message);
      toast.success('Member added');
      setShowAddModal(false);
      setForm(defaultForm);
      fetchMembers();
    } catch (err) {
      console.error(err);
      toast.error('Failed to add member');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteMemberId) return;
    setDeleting(true);
    try {
      const { error } = await dataClient
        .from('club_members')
        .delete()
        .eq('id', deleteMemberId);
      if (error) throw new Error(error.message);
      setMembers((prev) => prev.filter((m) => m.id !== deleteMemberId));
      toast.success('Member removed');
    } catch (err) {
      console.error(err);
      toast.error('Failed to remove member');
    } finally {
      setDeleting(false);
      setDeleteMemberId(null);
    }
  };

  const cycleStatus = async (member: ClubMember) => {
    const next: Record<string, ClubMember['status']> = {
      active: 'inactive',
      inactive: 'alumni',
      alumni: 'active',
    };
    const newStatus = next[member.status];
    try {
      const { error } = await dataClient
        .from('club_members')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', member.id);
      if (error) throw new Error(error.message);
      setMembers((prev) =>
        prev.map((m) => (m.id === member.id ? { ...m, status: newStatus } : m))
      );
    } catch (err) {
      console.error(err);
      toast.error('Failed to update status');
    }
  };

  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !clubId) return;
    setImporting(true);

    try {
      const text = await file.text();
      const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
      if (lines.length < 2) {
        toast.error('CSV must have a header row and at least one data row');
        return;
      }

      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
      const nameIdx = headers.indexOf('name');
      if (nameIdx === -1) {
        toast.error('CSV must have a "name" column');
        return;
      }
      const emailIdx = headers.indexOf('email');
      const pidIdx = headers.indexOf('pid');
      const majorIdx = headers.indexOf('major');
      const yearIdx = headers.indexOf('year');

      const rows = lines.slice(1).map((line) => {
        const cols = line.split(',').map((c) => c.trim());
        const year = yearIdx >= 0 ? cols[yearIdx] : '';
        const validYear = YEARS.includes(year as typeof YEARS[number]) ? year : null;
        return {
          club_id: clubId,
          name: cols[nameIdx] ?? '',
          email: emailIdx >= 0 ? cols[emailIdx] || null : null,
          pid: pidIdx >= 0 ? cols[pidIdx] || null : null,
          major: majorIdx >= 0 ? cols[majorIdx] || null : null,
          year: validYear,
          status: 'active' as const,
          role: 'member' as const,
        };
      }).filter((r) => r.name);

      if (rows.length === 0) {
        toast.error('No valid rows found in CSV');
        return;
      }

      const { error } = await dataClient.from('club_members').insert(rows);
      if (error) throw new Error(error.message);
      toast.success(`Imported ${rows.length} member${rows.length !== 1 ? 's' : ''}`);
      fetchMembers();
    } catch (err) {
      console.error(err);
      toast.error('Failed to import CSV');
    } finally {
      setImporting(false);
      if (csvInputRef.current) csvInputRef.current.value = '';
    }
  };

  const handleCsvExport = () => {
    if (members.length === 0) { toast.error('No members to export'); return; }
    const header = 'name,email,pid,major,year,status,role,joined_at,notes';
    const rows = members.map((m) =>
      [m.name, m.email ?? '', m.pid ?? '', m.major ?? '', m.year ?? '', m.status, m.role, m.joined_at ?? '', m.notes ?? '']
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${club?.clubName ?? 'members'}_roster.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Loading states
  if (authLoading || ownershipLoading || (!club && ownedClubs.length === 0)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-gold animate-spin" />
      </div>
    );
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
              <p className="text-muted-foreground mb-4">
                You may not have access to this club or it doesn't exist.
              </p>
              <Button variant="outline" asChild>
                <Link to="/club-admin">Back to Dashboard</Link>
              </Button>
            </div>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <ClubAdminSidebar />

        <main className="flex-1">
          {/* Header */}
          <header className="h-16 border-b border-border flex items-center justify-between px-4">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <div>
                <h1 className="text-xl font-display font-bold text-foreground tracking-tight">
                  {club.clubName}
                </h1>
                <p className="text-xs text-muted-foreground tracking-wide uppercase font-medium">
                  Member Roster
                </p>
              </div>
            </div>
            <Button variant="gold" onClick={() => setShowAddModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Member
            </Button>
          </header>

          <div className="p-6 space-y-6">
            <AdminBreadcrumb
              items={[
                { label: club.clubName, href: `/clubs/${clubId}` },
                { label: 'Members' },
              ]}
            />

            {/* Stats strip */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Total', value: stats.total },
                { label: 'Active', value: stats.active },
                { label: 'Officers', value: stats.officers },
                { label: 'Alumni', value: stats.alumni },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl border border-border bg-card p-4 text-center"
                >
                  <p className="text-2xl font-bold font-display text-foreground">{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Toolbar */}
            <div className="flex flex-wrap gap-3 items-center">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px] max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search name, email, PID…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Status filter pills */}
              <div className="flex gap-1.5">
                {(['all', 'active', 'inactive', 'alumni'] as StatusFilter[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className="shrink-0 px-3 py-1 rounded-full text-xs font-medium capitalize transition-all"
                    style={
                      statusFilter === s
                        ? {
                            background: s === 'all' ? 'hsl(43 74% 56%)' : STATUS_COLORS[s],
                            color: '#000',
                            border: `1px solid transparent`,
                          }
                        : { background: 'transparent', color: '#71717a', border: '1px solid rgba(255,255,255,0.1)' }
                    }
                  >
                    {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>

              <div className="ml-auto flex gap-2">
                {/* CSV import */}
                <input
                  ref={csvInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleCsvImport}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => csvInputRef.current?.click()}
                  disabled={importing}
                  title="CSV columns: name, email, pid, major, year"
                >
                  {importing ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  Import CSV
                </Button>

                {/* CSV export */}
                <Button variant="outline" size="sm" onClick={handleCsvExport}>
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>

            {/* Table */}
            {loading ? (
              <div className="premium-card overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {['Name', 'Email', 'PID', 'Major', 'Year', 'Status', 'Role', 'Joined', ''].map((h) => (
                        <TableHead key={h}>{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...Array(5)].map((_, i) => (
                      <TableRow key={i}>
                        {[...Array(9)].map((__, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : members.length === 0 ? (
              <div className="text-center py-20">
                <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-foreground mb-2">No members yet</h2>
                <p className="text-muted-foreground mb-6">
                  Add members manually or import from a CSV file.
                </p>
                <div className="flex justify-center gap-3">
                  <Button variant="gold" onClick={() => setShowAddModal(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Member
                  </Button>
                  <Button variant="outline" onClick={() => csvInputRef.current?.click()}>
                    <Upload className="w-4 h-4 mr-2" />
                    Import CSV
                  </Button>
                </div>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-muted-foreground">No members match your search or filter.</p>
                <Button
                  variant="ghost"
                  className="mt-3"
                  onClick={() => { setSearch(''); setStatusFilter('all'); }}
                >
                  Clear filters
                </Button>
              </div>
            ) : (
              <div className="premium-card overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>PID</TableHead>
                      <TableHead>Major</TableHead>
                      <TableHead>Year</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">{member.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {member.email ?? '—'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground font-mono">
                          {member.pid ?? '—'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {member.major ?? '—'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {member.year ?? '—'}
                        </TableCell>
                        <TableCell>
                          <button
                            onClick={() => cycleStatus(member)}
                            title="Click to cycle status"
                            className="cursor-pointer"
                          >
                            <Badge
                              style={{
                                background: STATUS_COLORS[member.status] + '22',
                                color: STATUS_COLORS[member.status],
                                border: `1px solid ${STATUS_COLORS[member.status]}44`,
                              }}
                              className="capitalize text-xs font-medium"
                            >
                              {member.status}
                            </Badge>
                          </button>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground capitalize">
                            {member.role}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {member.joined_at
                            ? new Date(member.joined_at).toLocaleDateString('en-US', {
                                month: 'short',
                                year: 'numeric',
                              })
                            : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteMemberId(member.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="px-4 py-2 border-t border-border text-xs text-muted-foreground">
                  {filtered.length} of {members.length} member{members.length !== 1 ? 's' : ''}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Add Member Modal */}
      <Dialog open={showAddModal} onOpenChange={(o) => { setShowAddModal(o); if (!o) setForm(defaultForm); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Add Member</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  placeholder="Full name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="student@ucsd.edu"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="pid">PID</Label>
                <Input
                  id="pid"
                  placeholder="A12345678"
                  value={form.pid}
                  onChange={(e) => setForm((f) => ({ ...f, pid: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="major">Major</Label>
                <Input
                  id="major"
                  placeholder="Computer Science"
                  value={form.major}
                  onChange={(e) => setForm((f) => ({ ...f, major: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="year">Year</Label>
                <Select value={form.year} onValueChange={(v) => setForm((f) => ({ ...f, year: v }))}>
                  <SelectTrigger id="year" className="mt-1">
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {YEARS.map((y) => (
                      <SelectItem key={y} value={y}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as ClubMember['status'] }))}>
                  <SelectTrigger id="status" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="alumni">Alumni</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="role">Role</Label>
                <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v as ClubMember['role'] }))}>
                  <SelectTrigger id="role" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="officer">Officer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="joined_at">Joined</Label>
                <Input
                  id="joined_at"
                  type="date"
                  value={form.joined_at}
                  onChange={(e) => setForm((f) => ({ ...f, joined_at: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Optional notes…"
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  className="mt-1 resize-none"
                  rows={2}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddModal(false); setForm(defaultForm); }}>
              Cancel
            </Button>
            <Button
              variant="gold"
              onClick={handleAddMember}
              disabled={saving || !form.name.trim()}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Add Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteMemberId} onOpenChange={() => setDeleteMemberId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this member from the roster? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  );
}
