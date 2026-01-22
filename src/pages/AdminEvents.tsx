import { useState, useEffect, useCallback } from 'react';
import { externalSupabase, ExternalEvent } from '@/integrations/external-supabase/client';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, Check, X, ExternalLink, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface EditingEvent {
  id: string;
  original_title: string;
  original_start_time: string;
  original_end_time: string | null;
  original_location: string | null;
  club_handle: string | null;
  source_url: string | null;
  caption: string | null;
  corrected_title: string;
  corrected_start_time: string;
  corrected_end_time: string;
  corrected_location: string;
  verified: boolean;
}

export default function AdminEvents() {
  const [events, setEvents] = useState<ExternalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingEvent, setEditingEvent] = useState<EditingEvent | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchUnverifiedEvents = useCallback(async () => {
    setLoading(true);
    const { data, error } = await externalSupabase
      .from('events')
      .select('*')
      .eq('verified', false)
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Error fetching unverified events:', error);
      toast.error('Failed to load unverified events');
    } else {
      setEvents(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUnverifiedEvents();
  }, [fetchUnverifiedEvents]);

  const openEditModal = (event: ExternalEvent) => {
    setEditingEvent({
      id: event.id,
      original_title: event.title,
      original_start_time: event.start_time,
      original_end_time: event.end_time,
      original_location: event.location,
      club_handle: event.club_handle,
      source_url: event.source_url,
      caption: event.caption,
      corrected_title: event.corrected_title || '',
      corrected_start_time: event.corrected_start_time || '',
      corrected_end_time: event.corrected_end_time || '',
      corrected_location: event.corrected_location || '',
      verified: false,
    });
  };

  const handleSave = async () => {
    if (!editingEvent) return;
    
    setSaving(true);
    
    const updates: Record<string, unknown> = {
      verified: editingEvent.verified,
    };
    
    // Only set corrected fields if they have values
    if (editingEvent.corrected_title.trim()) {
      updates.corrected_title = editingEvent.corrected_title.trim();
    }
    if (editingEvent.corrected_start_time.trim()) {
      updates.corrected_start_time = editingEvent.corrected_start_time.trim();
    }
    if (editingEvent.corrected_end_time.trim()) {
      updates.corrected_end_time = editingEvent.corrected_end_time.trim();
    }
    if (editingEvent.corrected_location.trim()) {
      updates.corrected_location = editingEvent.corrected_location.trim();
    }

    const { error } = await externalSupabase
      .from('events')
      .update(updates)
      .eq('id', editingEvent.id);

    if (error) {
      console.error('Error updating event:', error);
      toast.error('Failed to update event');
    } else {
      toast.success(editingEvent.verified ? 'Event verified!' : 'Event updated!');
      setEditingEvent(null);
      fetchUnverifiedEvents();
    }
    
    setSaving(false);
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return '—';
    try {
      return format(parseISO(dateString), 'MMM d, yyyy h:mm a');
    } catch {
      return dateString;
    }
  };

  const isErrorData = (text: string | null): boolean => {
    if (!text) return false;
    return text.startsWith('{"') || text.startsWith('{\"') || text.includes('"error"');
  };

  const getDisplayTitle = (event: ExternalEvent): string => {
    if (isErrorData(event.title)) {
      return event.club_handle ? `@${event.club_handle}` : 'Event';
    }
    return event.title;
  };

  const openExternal = (url: string) => {
    try {
      const w = window.open(url, '_blank', 'noopener,noreferrer');
      if (w) return;
    } catch {}
    try {
      const w = window.top?.open?.(url, '_blank', 'noopener,noreferrer');
      if (w) return;
    } catch {}
    try {
      if (window.top) window.top.location.href = url;
    } catch {}
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-display font-bold text-foreground">Admin: Unverified Events</h1>
              <p className="text-muted-foreground mt-1">Review and verify events before they appear on the calendar</p>
            </div>
            <Button variant="outline" onClick={fetchUnverifiedEvents} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-gold animate-spin" />
            </div>
          ) : events.length === 0 ? (
            <div className="premium-card p-12 text-center">
              <Check className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">All caught up!</h2>
              <p className="text-muted-foreground">No unverified events to review.</p>
            </div>
          ) : (
            <div className="premium-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Start Time</TableHead>
                    <TableHead>Club Handle</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell className="font-medium max-w-[200px] truncate">
                        {getDisplayTitle(event)}
                      </TableCell>
                      <TableCell>{formatDateTime(event.start_time)}</TableCell>
                      <TableCell>
                        {event.club_handle ? (
                          <span className="text-gold">@{event.club_handle}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {event.source_url ? (
                          <button
                            onClick={() => openExternal(event.source_url!)}
                            className="text-gold hover:text-gold/80 flex items-center gap-1"
                          >
                            <ExternalLink className="w-4 h-4" />
                            View
                          </button>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => openEditModal(event)}>
                          Review
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </main>

      {/* Edit Modal */}
      <Dialog open={!!editingEvent} onOpenChange={(open) => !open && setEditingEvent(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-display">Review Event</DialogTitle>
          </DialogHeader>

          {editingEvent && (
            <div className="space-y-6 mt-4">
              {/* Original Data Preview */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Original Data</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Title:</span>
                    <p className="text-foreground break-words">{editingEvent.original_title}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Club:</span>
                    <p className="text-gold">{editingEvent.club_handle ? `@${editingEvent.club_handle}` : '—'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Start:</span>
                    <p className="text-foreground">{formatDateTime(editingEvent.original_start_time)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">End:</span>
                    <p className="text-foreground">{formatDateTime(editingEvent.original_end_time)}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Location:</span>
                    <p className="text-foreground">{editingEvent.original_location || '—'}</p>
                  </div>
                </div>
                {editingEvent.caption && (
                  <div className="pt-2 border-t border-border">
                    <span className="text-muted-foreground text-sm">Caption:</span>
                    <p className="text-foreground text-sm mt-1 whitespace-pre-wrap max-h-32 overflow-y-auto">
                      {editingEvent.caption}
                    </p>
                  </div>
                )}
                {editingEvent.source_url && (
                  <button
                    onClick={() => openExternal(editingEvent.source_url!)}
                    className="text-gold hover:text-gold/80 text-sm flex items-center gap-1 mt-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View Original Post
                  </button>
                )}
              </div>

              {/* Corrected Fields */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Corrections (optional)</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="corrected_title">Corrected Title</Label>
                  <Input
                    id="corrected_title"
                    value={editingEvent.corrected_title}
                    onChange={(e) => setEditingEvent({ ...editingEvent, corrected_title: e.target.value })}
                    placeholder="Leave blank to use original"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="corrected_start_time">Corrected Start Time</Label>
                    <Input
                      id="corrected_start_time"
                      type="datetime-local"
                      value={editingEvent.corrected_start_time}
                      onChange={(e) => setEditingEvent({ ...editingEvent, corrected_start_time: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="corrected_end_time">Corrected End Time</Label>
                    <Input
                      id="corrected_end_time"
                      type="datetime-local"
                      value={editingEvent.corrected_end_time}
                      onChange={(e) => setEditingEvent({ ...editingEvent, corrected_end_time: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="corrected_location">Corrected Location</Label>
                  <Input
                    id="corrected_location"
                    value={editingEvent.corrected_location}
                    onChange={(e) => setEditingEvent({ ...editingEvent, corrected_location: e.target.value })}
                    placeholder="Leave blank to use original"
                  />
                </div>
              </div>

              {/* Verified Toggle */}
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border">
                <div>
                  <Label htmlFor="verified" className="font-semibold">Mark as Verified</Label>
                  <p className="text-sm text-muted-foreground">Event will appear on the public calendar</p>
                </div>
                <Switch
                  id="verified"
                  checked={editingEvent.verified}
                  onCheckedChange={(checked) => setEditingEvent({ ...editingEvent, verified: checked })}
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button variant="outline" onClick={() => setEditingEvent(null)} disabled={saving}>
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button variant="gold" onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4 mr-2" />
                  )}
                  {editingEvent.verified ? 'Save & Verify' : 'Save Changes'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
