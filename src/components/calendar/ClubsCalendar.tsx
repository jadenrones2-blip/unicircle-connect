import { useEffect, useState, useCallback, useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { EventClickArg } from '@fullcalendar/core';
import { ExternalEvent } from '@/hooks/useExternalEvents';
import { EventDetailModal } from './EventDetailModal';
import {
  Loader2,
  Calendar,
  MapPin,
  Search,
  X,
  Users,
  BookOpen,
  Briefcase,
  Music,
  UtensilsCrossed,
  LayoutGrid,
  Clock,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';
import { dataClient } from '@/integrations/supabase/dataClient';
import { supabase } from '@/integrations/supabase/client';
import { formatEventDate, formatEventTime } from '@/lib/formatters';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';

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

// Check if a string looks like JSON error data
function isErrorData(text: string | null): boolean {
  if (!text) return false;
  return text.startsWith('{"') || text.startsWith('{\"') || text.includes('"error"');
}

// Get a clean display title — fall back to club_handle if title is error data
function getDisplayTitle(event: ExternalEvent): string {
  if (isErrorData(event.title)) {
    return event.club_handle ? `@${event.club_handle}` : 'Event';
  }
  return event.title;
}

const EVENT_TYPES = [
  { label: 'All', icon: LayoutGrid, color: 'hsl(43 74% 56%)', keywords: [] },
  {
    label: 'Social',
    icon: Users,
    color: '#f472b6',
    keywords: [
      'social',
      'mixer',
      'hangout',
      'party',
      'game night',
      'trivia',
      'karaoke',
      'bonding',
      'picnic',
      'gathering',
    ],
  },
  {
    label: 'Food',
    icon: UtensilsCrossed,
    color: '#fb923c',
    keywords: [
      'food',
      'pizza',
      'lunch',
      'dinner',
      'potluck',
      'free food',
      'snacks',
      'boba',
      'brunch',
      'eat',
      'taco',
      'bbq',
    ],
  },
  {
    label: 'Workshop',
    icon: BookOpen,
    color: '#60a5fa',
    keywords: [
      'workshop',
      'training',
      'seminar',
      'lecture',
      'info session',
      'webinar',
      'panel',
      'talk',
      'speaker',
      'learn',
    ],
  },
  {
    label: 'Recruitment',
    icon: Briefcase,
    color: '#818cf8',
    keywords: [
      'recruitment',
      'rush',
      'apply',
      'applications',
      'interest meeting',
      'info night',
      'recruiting',
    ],
  },
  {
    label: 'Performance',
    icon: Music,
    color: '#2dd4bf',
    keywords: [
      'concert',
      'performance',
      'show',
      'showcase',
      'exhibit',
      'demo',
      'film',
      'screening',
      'recital',
    ],
  },
] as const;

type EventTypeLabel = (typeof EVENT_TYPES)[number]['label'];

function inferEventType(event: ExternalEvent, foodFlagIds?: Set<string>): EventTypeLabel {
  // AI-classified food flag takes priority over keyword matching
  if (foodFlagIds?.has(String(event.id))) return 'Food';
  const text = [
    event.corrected_title || event.title || '',
    event.caption || '',
    event.description || '',
  ]
    .join(' ')
    .toLowerCase();
  for (const t of EVENT_TYPES) {
    if (t.label === 'All') continue;
    if (t.keywords.some((kw) => text.includes(kw))) return t.label;
  }
  return 'All';
}

export default function ClubsCalendar() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [rawEvents, setRawEvents] = useState<ExternalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<ExternalEvent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedType, setSelectedType] = useState<EventTypeLabel>('All');
  const [foodFlags, setFoodFlags] = useState<Set<string>>(new Set());

  // Fetch Claude-classified food flags from main DB
  useEffect(() => {
    (supabase as any)
      .from('event_food_flags')
      .select('event_id')
      .eq('has_food', true)
      .then(({ data }: any) => {
        if (data) setFoodFlags(new Set(data.map((r: any) => r.event_id)));
      })
      .catch(() => {}); // non-critical
  }, []);

  const fetchEvents = useCallback(async () => {
    setLoading(true);

    try {
      const { data, error: dbError } = await dataClient
        .from('events')
        .select('*')
        .eq('verified', true)
        .order('start_time', { ascending: true })
        .limit(500);

      if (dbError) {
        toast.error('Failed to load events. Please refresh the page.');
        return;
      }

      // Apply coalesce logic for corrected fields
      const processedEvents = (data as ExternalEvent[]).map((event) => ({
        ...event,
        title: event.corrected_title || event.title,
        start_time: event.corrected_start_time || event.start_time,
        end_time: event.corrected_end_time || event.end_time,
        location: event.corrected_location || event.location,
      }));

      // Deduplicate by normalized title
      const seen = new Set<string>();
      const dedupedEvents = processedEvents.filter((event) => {
        const title = (event.title || '').trim().toLowerCase();
        if (!title) return true;
        if (seen.has(title)) return false;
        seen.add(title);
        return true;
      });

      setRawEvents(dedupedEvents);

      const formattedEvents: CalendarEvent[] = dedupedEvents.map((event) => ({
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
          caption: event.caption,
        },
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
      created_at: null,
    });
    setIsModalOpen(true);
  };

  const normalizeQ = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();

  const filteredEvents = useMemo(() => {
    const q = normalizeQ(searchText);
    return rawEvents.filter((e) => {
      const title = (e.corrected_title || e.title || '').toLowerCase();
      const handle = (e.club_handle || '').toLowerCase();
      const location = (e.corrected_location || e.location || '').toLowerCase();
      const matchesSearch = !q || title.includes(q) || handle.includes(q) || location.includes(q);
      const matchesType = selectedType === 'All' || inferEventType(e, foodFlags) === selectedType;
      return matchesSearch && matchesType;
    });
  }, [rawEvents, searchText, selectedType, foodFlags]);

  const filteredCalendarEvents = useMemo(() => {
    const q = normalizeQ(searchText);
    return events.filter((e) => {
      const title = (e.title || '').toLowerCase();
      const handle = (e.extendedProps.clubHandle || '').toLowerCase();
      const matchesSearch = !q || title.includes(q) || handle.includes(q);
      const raw = rawEvents.find((r) => r.id === e.id);
      const matchesType =
        selectedType === 'All' || !raw || inferEventType(raw, foodFlags) === selectedType;
      return matchesSearch && matchesType;
    });
  }, [events, searchText, selectedType, rawEvents, foodFlags]);

  const [view, setView] = useState<'browse' | 'calendar'>('browse');

  // Events grouped by category for the "All" browse view
  const eventsByCategory = useMemo(() => {
    const q = normalizeQ(searchText);
    return EVENT_TYPES.filter((t) => t.label !== 'All')
      .map((t) => ({
        ...t,
        events: rawEvents.filter((e) => {
          const title = (e.corrected_title || e.title || '').toLowerCase();
          const handle = (e.club_handle || '').toLowerCase();
          const loc = (e.corrected_location || e.location || '').toLowerCase();
          const matchesSearch = !q || title.includes(q) || handle.includes(q) || loc.includes(q);
          return matchesSearch && inferEventType(e, foodFlags) === t.label;
        }),
      }))
      .filter((t) => t.events.length > 0);
  }, [rawEvents, searchText, foodFlags]);

  const openEvent = (e: ExternalEvent) => {
    setSelectedEvent(e);
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
    <div className="clubs-calendar space-y-6">
      {/* ── Top bar: search + view toggle ── */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder="Search events, clubs..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="pl-9 pr-9 h-10 bg-white/5 border-white/10 text-foreground placeholder:text-muted-foreground focus:border-gold/50 rounded-xl"
          />
          {searchText && (
            <button
              onClick={() => setSearchText('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* View toggle */}
        <div className="flex items-center bg-white/5 border border-white/10 rounded-xl p-1 gap-1 shrink-0">
          <button
            onClick={() => setView('browse')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${view === 'browse' ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Browse
          </button>
          <button
            onClick={() => setView('calendar')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${view === 'calendar' ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            <Calendar className="w-3 h-3" /> Calendar
          </button>
        </div>
      </div>

      {/* ── Category pills ── */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {EVENT_TYPES.map((t) => {
          const isActive = selectedType === t.label;
          const Icon = t.icon;
          return (
            <button
              key={t.label}
              onClick={() => setSelectedType(t.label)}
              style={isActive ? { background: t.color, color: '#000', borderColor: t.color } : {}}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all whitespace-nowrap ${
                isActive
                  ? 'border-transparent'
                  : 'bg-transparent text-zinc-500 border-white/10 hover:text-white hover:border-white/20'
              }`}
            >
              <Icon className="w-3 h-3" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ── Calendar view ── */}
      {view === 'calendar' && (
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay',
          }}
          events={filteredCalendarEvents}
          eventClick={handleEventClick}
          height="auto"
          eventDisplay="block"
          dayMaxEvents={3}
          moreLinkClick="popover"
          displayEventTime={false}
        />
      )}

      {/* ── Browse view ── */}
      {view === 'browse' && (
        <div className="space-y-10">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-gold animate-spin" />
            </div>
          ) : filteredEvents.length === 0 ? (
            <p className="text-muted-foreground text-center py-16">
              {searchText ? `No events match "${searchText}"` : 'No events found'}
            </p>
          ) : selectedType === 'All' ? (
            /* ── Grouped by category ── */
            eventsByCategory.map(({ label, color, icon: Icon, events: catEvents }) => (
              <div key={label}>
                {/* Section header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ background: `${color}20`, border: `1px solid ${color}40` }}
                    >
                      <Icon className="w-3.5 h-3.5" style={{ color }} />
                    </div>
                    <h3 className="font-display font-semibold text-white text-base">{label}</h3>
                    <span className="text-xs text-zinc-600 font-medium">{catEvents.length}</span>
                  </div>
                  <button
                    onClick={() => setSelectedType(label as EventTypeLabel)}
                    className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    See all <ChevronRight className="w-3 h-3" />
                  </button>
                </div>

                {/* Horizontal scroll row */}
                <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
                  {catEvents.slice(0, 10).map((e) => (
                    <EventBrowseCard
                      key={e.id}
                      event={e}
                      color={color}
                      icon={Icon}
                      onClick={() => openEvent(e)}
                    />
                  ))}
                </div>
              </div>
            ))
          ) : (
            /* ── Filtered grid ── */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredEvents.map((e) => {
                const cat = EVENT_TYPES.find((t) => t.label === selectedType);
                return (
                  <EventBrowseCard
                    key={e.id}
                    event={e}
                    color={cat?.color ?? 'hsl(43 74% 56%)'}
                    icon={cat?.icon}
                    onClick={() => openEvent(e)}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

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

/* ── Eventbrite-style event card ── */
function EventBrowseCard({
  event,
  color,
  icon: Icon,
  onClick,
}: {
  event: ExternalEvent;
  color: string;
  icon?: LucideIcon;
  onClick: () => void;
}) {
  const date = event.corrected_start_time || event.start_time;
  const d = date ? new Date(date) : null;
  const dayNum = d ? d.toLocaleDateString('en-US', { day: '2-digit' }) : '—';
  const dayName = d ? d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase() : '';
  const month = d ? d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase() : '';
  const time = date ? formatEventTime(date) : '';
  const loc = event.corrected_location || event.location;
  const title = event.corrected_title || event.title || 'Event';

  return (
    <button
      onClick={onClick}
      className="shrink-0 w-56 text-left bg-zinc-900 border border-white/[0.07] rounded-2xl overflow-hidden hover:border-white/20 hover:bg-zinc-800 transition-all group"
    >
      {/* Color banner with date */}
      <div
        className="h-20 relative flex items-end px-4 pb-3"
        style={{
          background: `radial-gradient(ellipse at 90% -30%, ${color}45, transparent 60%), linear-gradient(135deg, ${color}25, ${color}08)`,
          borderBottom: `1px solid ${color}25`,
        }}
      >
        <div className="absolute top-3 left-4 flex items-baseline gap-1.5">
          <span className="text-2xl font-black leading-none" style={{ color }}>
            {dayNum}
          </span>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold" style={{ color, opacity: 0.8 }}>
              {month}
            </span>
            <span className="text-[10px] font-bold text-zinc-500">{dayName}</span>
          </div>
        </div>
        {Icon && (
          <div
            className="absolute top-3 right-3 w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: `${color}20`, border: `1px solid ${color}40` }}
          >
            <Icon className="w-3.5 h-3.5" style={{ color }} />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <p className="text-sm font-semibold text-zinc-100 line-clamp-2 leading-snug mb-2 group-hover:text-white transition-colors">
          {title}
        </p>
        {event.club_handle && (
          <p className="text-xs font-medium mb-2" style={{ color }}>
            @{event.club_handle}
          </p>
        )}
        <div className="flex flex-col gap-1">
          {time && (
            <div className="flex items-center gap-1.5 text-xs text-zinc-500">
              <Clock className="w-3 h-3 shrink-0" />
              <span>{time}</span>
            </div>
          )}
          {loc && (
            <div className="flex items-center gap-1.5 text-xs text-zinc-500">
              <MapPin className="w-3 h-3 shrink-0" />
              <span className="line-clamp-1">{loc}</span>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
