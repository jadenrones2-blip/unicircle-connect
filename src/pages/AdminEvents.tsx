import { useState, useEffect, useCallback } from 'react';
import { ExternalEvent } from '@/hooks/useExternalEvents';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Check, ExternalLink, RefreshCw, X, Zap, Trash2, Square, CheckSquare } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
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
  const [rejecting, setRejecting] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkRejecting, setBulkRejecting] = useState(false);
  const [scrapeResult, setScrapeResult] = useState<{
    clubsProcessed: number;
    postsFetched: number;
    eventsExtracted: number;
    clubBreakdown?: Record<string, number>;
  } | null>(null);
  const [scrapingCSI, setScrapingCSI] = useState(false);
  const [csiScrapeResult, setCsiScrapeResult] = useState<{
    clubsScraped: number;
    withEmail: number;
    withInstagram: number;
    creditsUsed: number;
    categoryBreakdown?: Record<string, number>;
  } | null>(null);
  const [scrapingLuma, setScrapingLuma] = useState(false);
  const [lumaScrapeResult, setLumaScrapeResult] = useState<{
    eventsFound: number;
    eventsInserted: number;
    eventsDuplicate: number;
    handlesScraped: number;
  } | null>(null);

  const handleScrapeCSI = async () => {
    setScrapingCSI(true);
    setCsiScrapeResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('scrape-csi');

      if (error) {
        console.error('CSI scrape error:', error);
        toast.error(`CSI error: ${error.message || JSON.stringify(error)}`);
        return;
      }

      if (data?.success) {
        setCsiScrapeResult({
          clubsScraped: data.clubsScraped || 0,
          withEmail: data.withEmail || 0,
          withInstagram: data.withInstagram || 0,
          creditsUsed: data.creditsUsed || 0,
          categoryBreakdown: data.categoryBreakdown || undefined,
        });
        toast.success(`Scraped ${data.clubsScraped} clubs — ${data.withEmail} emails found`);
      } else {
        toast.error(data?.error || 'CSI scrape failed');
      }
    } catch (err) {
      toast.error('Failed to scrape CSI contacts');
    } finally {
      setScrapingCSI(false);
    }
  };

  const handleScrapeLuma = async () => {
    setScrapingLuma(true);
    setLumaScrapeResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('scrape-luma-events', {
        body: { dryRun: false },
      });

      if (error) {
        console.error('Luma scrape error:', error);
        toast.error(`Luma error: ${error.message || JSON.stringify(error)}`);
        return;
      }

      if (data?.success) {
        setLumaScrapeResult({
          eventsFound: data.eventsFound || 0,
          eventsInserted: data.eventsInserted || 0,
          eventsDuplicate: data.eventsDuplicate || 0,
          handlesScraped: data.handlesScraped || 0,
        });
        toast.success(`Luma: ${data.eventsInserted || 0} new events saved`);
        fetchUnverifiedEvents();
      } else {
        toast.error(data?.error || 'Luma scrape failed');
      }
    } catch (err) {
      toast.error('Failed to scrape Luma events');
    } finally {
      setScrapingLuma(false);
    }
  };

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
          clubBreakdown: data.clubBreakdown || undefined,
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

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === events.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(events.map(e => e.id)));
    }
  };

  const handleBulkReject = async () => {
    if (selectedIds.size === 0) return;
    
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      toast.error('You must be logged in');
      return;
    }

    setBulkRejecting(true);

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/external-db-proxy?table=events&action=admin-bulk-delete`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ ids: Array.from(selectedIds), reason: 'bulk_rejected' }),
      }
    );

    if (!response.ok) {
      toast.error('Failed to reject events');
    } else {
      toast.success(`Rejected ${selectedIds.size} events`);
      setSelectedIds(new Set());
      fetchUnverifiedEvents();
    }

    setBulkRejecting(false);
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
    
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      toast.error('You must be logged in to approve events. Go to /login?role=admin');
      return;
    }
    
    setSaving(true);
    
    const updates: Record<string, unknown> = {
      verified: true,
      reviewed_at: new Date().toISOString(),
    };
    
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

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/external-db-proxy?table=events&action=admin-review`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: editingEvent.id,
          record: updates,
        }),
      }
    );

    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      console.error('Error approving event:', result);
      toast.error('Failed to approve event');
    } else {
      toast.success('Event approved and will now appear on calendar!');
      
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

  const handleReject = async () => {
    if (!editingEvent) return;
    
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      toast.error('You must be logged in to reject events. Go to /login?role=admin');
      return;
    }
    
    setRejecting(true);
    
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/external-db-proxy?table=events&action=admin-delete`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ id: editingEvent.id, reason: 'rejected' }),
      }
    );

    if (!response.ok) {
      console.error('Error rejecting event:', await response.json().catch(() => ({})));
      toast.error('Failed to reject event');
    } else {
      toast.success('Event rejected and removed');
      setEditingEvent(null);
      fetchUnverifiedEvents();
    }
    
    setRejecting(false);
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
              <Button variant="outline" onClick={handleScrapeCSI} disabled={scrapingCSI}>
                {scrapingCSI ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4 mr-2" />
                )}
                {scrapingCSI ? 'Scraping CSI...' : 'Scrape CSI Contacts'}
              </Button>
              <Button variant="outline" onClick={handleScrapeLuma} disabled={scrapingLuma}>
                {scrapingLuma ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4 mr-2" />
                )}
                {scrapingLuma ? 'Scraping Luma...' : 'Scrape Luma'}
              </Button>
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
            <div className="premium-card p-4 mb-6 border-gold/30 space-y-3">
              <div className="flex items-center gap-6 text-sm">
                <div>
                  <span className="text-muted-foreground">Clubs Searched:</span>{' '}
                  <span className="font-semibold text-foreground">{scrapeResult.clubsProcessed}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Events Extracted:</span>{' '}
                  <span className="font-semibold text-gold">{scrapeResult.eventsExtracted}</span>
                </div>
              </div>
              {scrapeResult.clubBreakdown && Object.keys(scrapeResult.clubBreakdown).length > 0 && (
                <div className="border-t border-border pt-3">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Events by Club</h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(scrapeResult.clubBreakdown)
                      .sort(([, a], [, b]) => b - a)
                      .map(([club, count]) => (
                        <span key={club} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gold/10 text-sm">
                          <span className="text-foreground font-medium">{club}</span>
                          <span className="text-gold font-semibold">{count}</span>
                        </span>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {csiScrapeResult && (
            <div className="premium-card p-4 mb-6 border-border space-y-3">
              <h4 className="text-sm font-semibold text-foreground">CSI Contacts Scraped</h4>
              <div className="flex items-center gap-6 text-sm">
                <div>
                  <span className="text-muted-foreground">Clubs Scraped:</span>{' '}
                  <span className="font-semibold text-foreground">{csiScrapeResult.clubsScraped}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">With Email:</span>{' '}
                  <span className="font-semibold text-green-500">{csiScrapeResult.withEmail}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">With Instagram:</span>{' '}
                  <span className="font-semibold text-foreground">{csiScrapeResult.withInstagram}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Credits Used:</span>{' '}
                  <span className="font-semibold text-foreground">{csiScrapeResult.creditsUsed}</span>
                </div>
              </div>
              {csiScrapeResult.categoryBreakdown && Object.keys(csiScrapeResult.categoryBreakdown).length > 0 && (
                <div className="border-t border-border pt-3">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Clubs by Category</h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(csiScrapeResult.categoryBreakdown)
                      .sort(([, a], [, b]) => b - a)
                      .map(([cat, count]) => (
                        <span key={cat} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted text-sm">
                          <span className="text-foreground font-medium">{cat}</span>
                          <span className="text-muted-foreground font-semibold">{count}</span>
                        </span>
                      ))}
                  </div>
                </div>
              )}
              <p className="text-xs text-muted-foreground pt-1">
                Contacts saved to <span className="font-mono">csi_club_contacts</span> table in Supabase. Export from Table Editor to get your outreach CSV.
              </p>
            </div>
          )}

          {lumaScrapeResult && (
            <div className="premium-card p-4 mb-6 border-border space-y-3">
              <h4 className="text-sm font-semibold text-foreground">Luma Events Scraped</h4>
              <div className="flex items-center gap-6 text-sm">
                <div>
                  <span className="text-muted-foreground">Handles Scraped:</span>{' '}
                  <span className="font-semibold text-foreground">{lumaScrapeResult.handlesScraped}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Events Found:</span>{' '}
                  <span className="font-semibold text-foreground">{lumaScrapeResult.eventsFound}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">New Events:</span>{' '}
                  <span className="font-semibold text-green-500">{lumaScrapeResult.eventsInserted}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Duplicates Skipped:</span>{' '}
                  <span className="font-semibold text-muted-foreground">{lumaScrapeResult.eventsDuplicate}</span>
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
              {selectedIds.size > 0 && (
                <div className="flex items-center gap-3 px-4 py-3 bg-destructive/10 border-b border-border">
                  <span className="text-sm font-medium text-foreground">
                    {selectedIds.size} selected
                  </span>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleBulkReject}
                    disabled={bulkRejecting}
                  >
                    {bulkRejecting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4 mr-2" />
                    )}
                    Reject Selected
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
                    Clear
                  </Button>
                </div>
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={events.length > 0 && selectedIds.size === events.length}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
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
                    <TableRow key={event.id} className={selectedIds.has(event.id) ? 'bg-muted/50' : ''}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(event.id)}
                          onCheckedChange={() => toggleSelect(event.id)}
                        />
                      </TableCell>
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
              <div className="flex justify-between pt-4 border-t border-border">
                <Button variant="destructive" onClick={handleReject} disabled={saving || rejecting}>
                  {rejecting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 mr-2" />
                  )}
                  Reject
                </Button>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setEditingEvent(null)} disabled={saving || rejecting}>
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  <Button variant="gold" onClick={handleApprove} disabled={saving || rejecting}>
                    {saving ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4 mr-2" />
                    )}
                    Approve
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
