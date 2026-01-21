import { useEffect, useState, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { EventClickArg } from '@fullcalendar/core';
import { externalSupabase, ExternalEvent } from '@/integrations/external-supabase/client';
import { EventDetailModal } from './EventDetailModal';
import { Loader2 } from 'lucide-react';

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
  };
}

export default function ClubsCalendar() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<ExternalEvent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    const { data, error } = await externalSupabase
      .from('events')
      .select('*')
      .eq('source', 'instagram')
      .order('start_time', { ascending: true });

    if (!error && data) {
      const formattedEvents: CalendarEvent[] = data.map((event: ExternalEvent) => ({
        id: event.id,
        title: event.title,
        start: event.start_time,
        end: event.end_time,
        extendedProps: {
          description: event.description,
          location: event.location,
          clubId: event.club_id,
          source: event.source
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
      source: event.extendedProps.source
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

  return (
    <div className="clubs-calendar">
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
