import { useState, useEffect, useCallback } from 'react';
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

export default function ClubAdminEvents() {
  const { clubId } = useParams<{ clubId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { ownedClubs, loading: ownershipLoading, isOwnerOf } = useClubOwnership();
  
  const [events, setEvents] = useState<ExternalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteEventId, setDeleteEventId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const club = ownedClubs.find((c) => c.clubId === clubId);

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

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login?redirect=/club-admin');
      return;
    }
    
    if (!ownershipLoading && clubId && !isOwnerOf(clubId)) {
      navigate('/club-admin');
      toast.error('You do not own this club');
      return;
    }

    if (club) {
      fetchClubEvents();
    }
  }, [user, authLoading, ownershipLoading, clubId, isOwnerOf, club, navigate, fetchClubEvents]);

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

  if (authLoading || ownershipLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-gold animate-spin" />
      </div>
    );
  }

  if (!user || !club) return null;

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
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-gold animate-spin" />
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
                            {event.source_url && (
                              <Button
                                variant="ghost"
                                size="icon"
                                asChild
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
    </SidebarProvider>
  );
}
