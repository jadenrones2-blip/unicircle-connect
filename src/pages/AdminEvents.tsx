import { useState, useEffect, useCallback } from 'react';
import { ExternalEvent } from '@/hooks/useExternalEvents';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Check, ExternalLink, RefreshCw, X, Zap } from 'lucide-react';
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
  club_handle: string | null;
  title: string;
  caption: string | null;
  posted_at: string | null;
  source_url: string | null;
  original_start_time: string;
  original_end_time: string | null;
  original_location: string | null;
  corrected_title: string;
  corrected_start_time: string;
  corrected_end_time: string;
  corrected_location: string;
}

export default function AdminEvents() {
  const [events, setEvents] = useState<ExternalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingEvent, setEditingEvent] = useState<EditingEvent | null>(null);
  const [saving, setSaving] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [scrapeResult, setScrapeResult] = useState<{
    clubsProcessed: number;
    postsFetched: number;
    eventsExtracted: number;
  } | null>(null);

  const handleScrapeInstagram = async () => {
    setScraping(true);
    setScrapeResult(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('scrape-events');
      
      if (error) {
        console.error('Scrape error:', error);
        toast.error('Failed to scrape Instagram');
        return;
      }
      
      if (data?.success) {
        setScrapeResult({
          clubsProcessed: data.clubsSearched || 0,
          postsFetched: 0,
          eventsExtracted: data.eventsExtracted || 0,
        });
        toast.success(`Found ${data.eventsExtracted || 0} events from web search`);
        fetchUnverifiedEvents();
      } else {
        toast.error(data?.error || 'Scrape failed');
      }
    } catch (err) {
      console.error('Scrape error:', err);
      toast.error('Failed to scrape Instagram');
    } finally {
      setScraping(false);
    }
  };

  const fetchUnverifiedEvents = useCallback(async () => {
    setLoading(true);
    
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/external-db-proxy?table=events&select=*&limit=100&filters=${encodeURIComponent(JSON.stringify({ verified: false }))}`,
        {
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch');
      }

      const result = await response.json();
      const allEvents: ExternalEvent[] = result.data || [];

      // Filter out past events
      const now = new Date();
      const futureEvents = allEvents.filter((e) => {
        const start = new Date(e.corrected_start_time || e.start_time);
        return start >= now;
      });

      // Deduplicate by normalized title (same event scraped multiple times)
      const seen = new Set<string>();
      const uniqueEvents = futureEvents.filter((event) => {
        const title = (event.corrected_title || event.title || '').trim().toLowerCase();
        if (!title) return true; // keep events without titles
        if (seen.has(title)) return false;
        seen.add(title);
        return true;
      });

      setEvents(uniqueEvents);
    } catch (err) {
      console.error('Error fetching unverified events:', err);
      toast.error('Failed to load review queue');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUnverifiedEvents();
  }, [fetchUnverifiedEvents]);

  const openEditModal = (event: ExternalEvent) => {
    setEditingEvent({
      id: event.id,
      club_handle: event.club_handle,
      title: event.title,
      caption: event.caption,
      posted_at: event.posted_at,
      source_url: event.source_url,
      original_start_time: event.start_time,
      original_end_time: event.end_time,
      original_location: event.location,
      corrected_title: event.corrected_title || '',
      corrected_start_time: event.corrected_start_time ? formatDateTimeLocal(event.corrected_start_time) : '',
      corrected_end_time: event.corrected_end_time ? formatDateTimeLocal(event.corrected_end_time) : '',
      corrected_location: event.corrected_location || '',
    });
  };

  const formatDateTimeLocal = (dateString: string): string => {
    try {
      const date = parseISO(dateString);
      return format(date, "yyyy-MM-dd'T'HH:mm");
    } catch {
      return '';
    }
  };

  const handleApprove = async () => {
    if (!editingEvent) return;
    
    setSaving(true);
    
    const updates: Record<string, unknown> = {
      verified: true,
      reviewed_at: new Date().toISOString(),
    };
    
    // Only set corrected fields if they have values
    if (editingEvent.corrected_title.trim()) {
      updates.corrected_title = editingEvent.corrected_title.trim();
    }
    if (editingEvent.corrected_start_time.trim()) {
      updates.corrected_start_time = new Date(editingEvent.corrected_start_time).toISOString();
    }
    if (editingEvent.corrected_end_time.trim()) {
      updates.corrected_end_time = new Date(editingEvent.corrected_end_time).toISOString();
    }
    if (editingEvent.corrected_location.trim()) {
      updates.corrected_location = editingEvent.corrected_location.trim();
    }

    // Use edge function for update
    const { data: response, error } = await supabase.functions.invoke('external-db-proxy', {
      body: {
        table: 'events',
        action: 'update',
        id: editingEvent.id,
        record: updates,
      },
    });

    if (error || response?.error) {
      console.error('Error approving event:', error);
      toast.error('Failed to approve event');
    } else {
      toast.success('Event approved and will now appear on calendar!');
      
      // Send email notification to club owner
      const finalTitle = editingEvent.corrected_title.trim() || editingEvent.title;
      const finalStartTime = editingEvent.corrected_start_time 
        ? new Date(editingEvent.corrected_start_time).toISOString()
        : editingEvent.original_start_time;
      const finalLocation = editingEvent.corrected_location.trim() || editingEvent.original_location;
      
      if (editingEvent.club_handle) {
        supabase.functions.invoke('notify-event-approved', {
          body: {
            eventTitle: finalTitle,
            clubHandle: editingEvent.club_handle,
            startTime: finalStartTime,
            location: finalLocation,
          },
        }).catch((err) => {
          console.error('Failed to send approval notification:', err);
        });
      }
      
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
              <h1 className="text-3xl font-display font-bold text-foreground">Review Queue</h1>
              <p className="text-muted-foreground mt-1">
                {events.length} events pending review • Runs daily at 6am PT
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="gold" onClick={handleScrapeInstagram} disabled={scraping}>
                {scraping ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4 mr-2" />
                )}
                {scraping ? 'Scraping...' : 'Scrape Now'}
              </Button>
              <Button variant="outline" onClick={fetchUnverifiedEvents} disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>

          {scrapeResult && (
            <div className="premium-card p-4 mb-6 border-gold/30">
              <div className="flex items-center gap-6 text-sm">
                <div>
                  <span className="text-muted-foreground">Clubs Processed:</span>{' '}
                  <span className="font-semibold text-foreground">{scrapeResult.clubsProcessed}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Posts Fetched:</span>{' '}
                  <span className="font-semibold text-foreground">{scrapeResult.postsFetched}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Events Extracted:</span>{' '}
                  <span className="font-semibold text-gold">{scrapeResult.eventsExtracted}</span>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-gold animate-spin" />
            </div>
          ) : events.length === 0 ? (
            <div className="premium-card p-12 text-center">
              <Check className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">All caught up!</h2>
              <p className="text-muted-foreground">No events pending review.</p>
            </div>
          ) : (
            <div className="premium-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Club</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead className="max-w-[200px]">Caption</TableHead>
                    <TableHead>Posted</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell>
                        {event.club_handle ? (
                          <span className="text-gold font-medium">@{event.club_handle}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="font-medium max-w-[150px] truncate">
                        {getDisplayTitle(event)}
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <p className="text-sm text-muted-foreground truncate">
                          {isErrorData(event.caption) ? '—' : (event.caption || '—')}
                        </p>
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDateTime(event.posted_at)}
                      </TableCell>
                      <TableCell>
                        {event.source_url ? (
                          <button
                            onClick={() => openExternal(event.source_url!)}
                            className="text-gold hover:text-gold/80 flex items-center gap-1 text-sm"
                          >
                            <ExternalLink className="w-4 h-4" />
                            View
                          </button>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="gold" onClick={() => openEditModal(event)}>
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

      {/* Review Modal */}
      <Dialog open={!!editingEvent} onOpenChange={(open) => !open && setEditingEvent(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-display flex items-center gap-2">
              Review Event
              {editingEvent?.club_handle && (
                <span className="text-gold text-base font-normal">@{editingEvent.club_handle}</span>
              )}
            </DialogTitle>
          </DialogHeader>

          {editingEvent && (
            <div className="space-y-6 mt-4">
              {/* Source Link - Prominent */}
              {editingEvent.source_url && (
                <button
                  onClick={() => openExternal(editingEvent.source_url!)}
                  className="w-full p-4 bg-gold/10 border border-gold/20 rounded-lg flex items-center justify-center gap-2 text-gold hover:bg-gold/20 transition-colors"
                >
                  <ExternalLink className="w-5 h-5" />
                  <span className="font-medium">Open Instagram Post</span>
                </button>
              )}

              {/* Original Data Preview */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Scraped Data</h3>
                
                <div>
                  <span className="text-sm text-muted-foreground">Title:</span>
                  <p className="text-foreground text-sm break-words">{editingEvent.title}</p>
                </div>
                
                {editingEvent.caption && !isErrorData(editingEvent.caption) && (
                  <div>
                    <span className="text-sm text-muted-foreground">Caption:</span>
                    <p className="text-foreground text-sm whitespace-pre-wrap max-h-32 overflow-y-auto">
                      {editingEvent.caption}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm pt-2 border-t border-border">
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
                  {editingEvent.posted_at && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Posted:</span>
                      <p className="text-foreground">{formatDateTime(editingEvent.posted_at)}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Corrected Fields */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Corrections <span className="font-normal">(leave blank to use scraped values)</span>
                </h3>
                
                <div className="space-y-2">
                  <Label htmlFor="corrected_title">Corrected Title</Label>
                  <Input
                    id="corrected_title"
                    value={editingEvent.corrected_title}
                    onChange={(e) => setEditingEvent({ ...editingEvent, corrected_title: e.target.value })}
                    placeholder="e.g. Spring Social Mixer"
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
                    placeholder="e.g. Student Union Room 201"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button variant="outline" onClick={() => setEditingEvent(null)} disabled={saving}>
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button variant="gold" onClick={handleApprove} disabled={saving}>
                  {saving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4 mr-2" />
                  )}
                  Approve
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
