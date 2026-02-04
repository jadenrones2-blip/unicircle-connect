import { useEffect, useState, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { EventClickArg } from '@fullcalendar/core';
import { ExternalEvent } from '@/hooks/useExternalEvents';
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
  const [rawEvents, setRawEvents] = useState<ExternalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<ExternalEvent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    
    try {
      // Use edge function instead of direct client
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/external-db-proxy?table=events&select=*&orderBy=start_time&orderAsc=true&limit=500&filters=${encodeURIComponent(JSON.stringify({ verified: true }))}`,
        {
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );

      if (!response.ok) return;
      
      const result = await response.json();
      const data = result.data || [];

      // Apply coalesce logic for corrected fields
      const processedEvents = (data as ExternalEvent[]).map(event => ({
        ...event,
        title: event.corrected_title || event.title,
        start_time: event.corrected_start_time || event.start_time,
        end_time: event.corrected_end_time || event.end_time,
        location: event.corrected_location || event.location,
      }));
      
      setRawEvents(processedEvents);
      
      // Helper to check if text is JSON error data
      const isErrorData = (text: string | null): boolean => {
        if (!text) return false;
        return text.startsWith('{"') || text.startsWith('{\"') || text.includes('"error"');
      };

      // Get clean display title - fall back to club_handle if title is error data
      const getDisplayTitle = (event: ExternalEvent): string => {
        if (isErrorData(event.title)) {
          return event.club_handle ? `@${event.club_handle}` : 'Event';
        }
        return event.title;
      };
      
      const formattedEvents: CalendarEvent[] = processedEvents.map((event) => ({
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
    } catch (err) {
      console.error('Error fetching events:', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchEvents();
    
    // Poll for updates every 30 seconds
    const pollInterval = setInterval(fetchEvents, 30000);

    return () => {
      clearInterval(pollInterval);
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
      caption: event.extendedProps.caption,
      verified: null,
      corrected_title: null,
      corrected_start_time: null,
      corrected_end_time: null,
      corrected_location: null,
      reviewed_at: null,
      posted_at: null,
      created_at: null
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

  const formatEventDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'EEE, MMM d');
    } catch {
      return dateString;
    }
  };

  const formatEventTime = (dateString: string) => {
    try {
      return format(new Date(dateString), 'h:mm a');
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
  const getListDisplayTitle = (event: ExternalEvent): string => {
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
        displayEventTime={false}
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
                  <TableHead>Event</TableHead>
                  <TableHead>Club</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Time</TableHead>
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
                    <TableCell>
                      {event.club_handle ? (
                        <span className="text-gold">@{event.club_handle}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>{formatEventDate(event.start_time)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{formatEventTime(event.start_time)}</TableCell>
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
