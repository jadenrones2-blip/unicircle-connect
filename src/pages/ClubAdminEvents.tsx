import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useClubOwnership } from '@/hooks/useClubOwnership';
import { externalSupabase, ExternalEvent } from '@/integrations/external-supabase/client';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { ClubAdminSidebar } from '@/components/club-admin/ClubAdminSidebar';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, Calendar, ExternalLink, Edit, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
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
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EventEditModal } from '@/components/club-admin/EventEditModal';

export default function ClubAdminEvents() {
  const { clubId } = useParams<{ clubId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { ownedClubs, loading: ownershipLoading } = useClubOwnership();
  
  const [events, setEvents] = useState<ExternalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteEventId, setDeleteEventId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ExternalEvent | null>(null);

  const normalizeId = (id?: string) => (id ?? '').trim().toLowerCase();
  const club = ownedClubs.find((c) => normalizeId(c.clubId) === normalizeId(clubId));

  // IMPORTANT: avoid depending on unstable function references from hooks in effects.
  // We compute ownership from data to prevent accidental refetch loops.
  const isOwner = useMemo(() => {
    const target = normalizeId(clubId);
    if (!target) return false;
    return ownedClubs.some((c) => normalizeId(c.clubId) === target);
  }, [clubId, ownedClubs]);

  const fetchClubEvents = useCallback(async () => {
    if (!clubId || !club) return;
    
    setLoading(true);
    try {
      // Fetch events by club_handle (which matches club name pattern)
      const { data, error } = await externalSupabase
        .from('events')
        .select('*')
        .or(`club_handle.ilike.%${club.clubName}%,title.ilike.%${club.clubName}%`)
        .order('start_time', { ascending: false })
        .limit(50);

      if (error) throw error;
      setEvents(data || []);
    } catch (err) {
      console.error('Error fetching club events:', err);
      toast.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  }, [clubId, club]);

  // Require authentication first
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      const redirect = clubId ? `/club-admin/clubs/${clubId}/events` : '/club-admin';
      toast.error('Please log in to access club admin');
      navigate(`/login?redirect=${encodeURIComponent(redirect)}`);
    }
  }, [authLoading, user, clubId, navigate]);

  // Check ownership after auth completes
  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    if (ownershipLoading) return;
    if (clubId && !isOwner) {
      toast.error('You do not own this club');
      navigate('/club-admin');
    }
  }, [authLoading, user, ownershipLoading, clubId, isOwner, navigate]);

  // Fetch events only when everything is ready
  useEffect(() => {
    if (club && !authLoading && user && !ownershipLoading && isOwner) {
      fetchClubEvents();
    }
  }, [authLoading, user, ownershipLoading, club, isOwner, fetchClubEvents]);

  const handleDelete = async () => {
    if (!deleteEventId) return;
    
    setDeleting(true);
    try {
      const { error } = await externalSupabase
        .from('events')
        .delete()
        .eq('id', deleteEventId);

      if (error) throw error;
      
      setEvents((prev) => prev.filter((e) => e.id !== deleteEventId));
      toast.success('Event deleted');
    } catch (err) {
      console.error('Error deleting event:', err);
      toast.error('Failed to delete event');
    } finally {
      setDeleting(false);
      setDeleteEventId(null);
    }
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return '—';
    try {
      return format(parseISO(dateString), 'MMM d, yyyy h:mm a');
    } catch {
      return dateString;
    }
  };

  // Keep showing loader while ownership is loading OR club hasn't been found yet
  // This prevents flashing "Club not found" before ownership data arrives
  if (authLoading || ownershipLoading || (!club && ownedClubs.length === 0)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-gold animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  // Only show "Club not found" after ownership has fully loaded and club is still missing
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
          <header className="h-16 border-b border-border flex items-center justify-between px-4">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <div>
                <h1 className="text-xl font-display font-semibold text-foreground">
                  {club.clubName}
                </h1>
                <p className="text-sm text-muted-foreground">Event Management</p>
              </div>
            </div>
            <Button variant="gold" asChild>
              <Link to={`/submit-event?club=${clubId}`}>
                <Plus className="w-4 h-4 mr-2" />
                New Event
              </Link>
            </Button>
          </header>

          <div className="p-6">
          {loading ? (
              <div className="premium-card overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...Array(5)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <Skeleton className="h-5 w-48" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-36" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-28" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-5 w-20 rounded-full" />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Skeleton className="h-8 w-8 rounded-md" />
                            <Skeleton className="h-8 w-8 rounded-md" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-20">
                <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  No Events Yet
                </h2>
                <p className="text-muted-foreground mb-6">
                  Create your first event to get started.
                </p>
                <Button variant="gold" asChild>
                  <Link to={`/submit-event?club=${clubId}`}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Event
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="premium-card overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell>
                          <div className="font-medium">
                            {event.corrected_title || event.title}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDateTime(event.corrected_start_time || event.start_time)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {event.corrected_location || event.location || '—'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={event.verified ? 'default' : 'secondary'}>
                            {event.verified ? 'Published' : 'Pending'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditingEvent(event)}
                              title="Edit event"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            {event.source_url && (
                              <Button
                                variant="ghost"
                                size="icon"
                                asChild
                                title="View original"
                              >
                                <a
                                  href={event.source_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setDeleteEventId(event.id)}
                              title="Delete event"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </main>
      </div>

      <AlertDialog open={!!deleteEventId} onOpenChange={() => setDeleteEventId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this event? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EventEditModal
        event={editingEvent}
        isOpen={!!editingEvent}
        onClose={() => setEditingEvent(null)}
        onSaved={fetchClubEvents}
      />
    </SidebarProvider>
  );
}
