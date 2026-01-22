import { useEffect, useState, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { EventClickArg } from '@fullcalendar/core';
import { externalSupabase } from '@/integrations/external-supabase/client';
import { EventDetailModal } from './EventDetailModal';
import { Loader2, Calendar, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface ExternalEventWithHandle {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  location: string | null;
  source: string | null;
  club_id: string | null;
  club_handle: string | null;
  source_url: string | null;
  caption: string | null;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string | null;
  extendedProps: {
    description: string | null;
    location: string | null;
    clubId: string | null;
    source: string | null;
    clubHandle: string | null;
    sourceUrl: string | null;
    caption: string | null;
  };
}

export default function ClubsCalendar() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [rawEvents, setRawEvents] = useState<ExternalEventWithHandle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<ExternalEventWithHandle | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    
    // Calculate date range: 30 days ago to 30 days from now
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysFromNow = new Date(now);
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    const { data, error } = await externalSupabase
      .from('events')
      .select('*')
      .gte('start_time', thirtyDaysAgo.toISOString())
      .lte('start_time', thirtyDaysFromNow.toISOString())
      .order('start_time', { ascending: true });

    if (!error && data) {
      setRawEvents(data as ExternalEventWithHandle[]);
      
      // Helper to check if text is JSON error data
      const isErrorData = (text: string | null): boolean => {
        if (!text) return false;
        return text.startsWith('{"') || text.startsWith('{\"') || text.includes('"error"');
      };

      // Get clean display title - fall back to club_handle if title is error data
      const getDisplayTitle = (event: ExternalEventWithHandle): string => {
        if (isErrorData(event.title)) {
          return event.club_handle ? `@${event.club_handle}` : 'Event';
        }
        return event.title;
      };
      
      const formattedEvents: CalendarEvent[] = data.map((event: ExternalEventWithHandle) => ({
        id: event.id,
        title: getDisplayTitle(event),
        start: event.start_time,
        end: event.end_time,
        extendedProps: {
          description: event.description,
          location: event.location,
          clubId: event.club_id,
          source: event.source,
          clubHandle: event.club_handle,
          sourceUrl: event.source_url,
          caption: event.caption
        }
      }));
      setEvents(formattedEvents);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // Fetch initial events
    fetchEvents();

    // Subscribe to real-time changes (Supabase v2 API)
    const channel = externalSupabase
      .channel('events-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events'
        },
        (payload) => {
          console.log('Realtime update:', payload);
          fetchEvents(); // Refetch on any change
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });

    return () => {
      externalSupabase.removeChannel(channel);
    };
  }, [fetchEvents]);

  const handleEventClick = (info: EventClickArg) => {
    const event = info.event;
    setSelectedEvent({
      id: event.id,
      title: event.title,
      start_time: event.startStr,
      end_time: event.endStr || null,
      description: event.extendedProps.description,
      location: event.extendedProps.location,
      club_id: event.extendedProps.clubId,
      source: event.extendedProps.source,
      club_handle: event.extendedProps.clubHandle,
      source_url: event.extendedProps.sourceUrl,
      caption: event.extendedProps.caption
    });
    setIsModalOpen(true);
  };

  if (loading && events.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-gold animate-spin" />
      </div>
    );
  }

  const formatEventTime = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy h:mm a');
    } catch {
      return dateString;
    }
  };

  // Helper to check if text is JSON error data (for list view)
  const isErrorData = (text: string | null): boolean => {
    if (!text) return false;
    return text.startsWith('{"') || text.startsWith('{\"') || text.includes('"error"');
  };

  // Get clean display title for list view
  const getListDisplayTitle = (event: ExternalEventWithHandle): string => {
    if (isErrorData(event.title)) {
      return event.club_handle ? `@${event.club_handle}` : 'Event';
    }
    return event.title;
  };

  return (
    <div className="clubs-calendar space-y-8">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay'
        }}
        events={events}
        eventClick={handleEventClick}
        height="auto"
        eventDisplay="block"
        dayMaxEvents={3}
        moreLinkClick="popover"
      />

      {/* Events List View */}
      <div className="premium-card p-6">
        <h3 className="text-xl font-display font-semibold text-foreground mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gold" />
          All Events
        </h3>
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-gold animate-spin" />
          </div>
        ) : rawEvents.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No events found</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Start Time</TableHead>
                  <TableHead>Club Handle</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rawEvents.map((event) => (
                  <TableRow 
                    key={event.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => {
                      setSelectedEvent(event);
                      setIsModalOpen(true);
                    }}
                  >
                    <TableCell className="font-medium">{getListDisplayTitle(event)}</TableCell>
                    <TableCell>{formatEventTime(event.start_time)}</TableCell>
                    <TableCell>
                      {event.club_handle ? (
                        <span className="text-gold">@{event.club_handle}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <EventDetailModal
        event={selectedEvent}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedEvent(null);
        }}
      />
    </div>
  );
}
