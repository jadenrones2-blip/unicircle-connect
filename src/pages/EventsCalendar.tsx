import { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Calendar,
  Filter,
  ChevronLeft,
  ChevronRight,
  List,
  Grid3X3,
  Loader2,
  MapPin,
  Clock,
  Sparkles,
} from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import EventCard from '@/components/EventCard';
import ExpressInterestModal from '@/components/ExpressInterestModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useClubs, useEvents } from '@/hooks/useExternalDB';
import { useAuth } from '@/hooks/useAuth';
import { useUserInterests } from '@/hooks/useUserInterests';
import { useRecommendedEvents, type RecommendedEvent } from '@/hooks/useRecommendedEvents';
import { formatEventTime, formatEventDateLong } from '@/lib/formatters';
import { EventDetailModal } from '@/components/calendar/EventDetailModal';
import type { ExternalEvent } from '@/hooks/useExternalEvents';

const eventTypes = ['All', 'Recruitment', 'Event', 'Workshop', 'Social'];
type ViewMode = 'list' | 'calendar';

// ── Compact recommended event card ──────────────────────────────────────────

function ForYouCard({
  event,
  onClick,
}: {
  event: RecommendedEvent;
  onClick: () => void;
}) {
  const rawDate = event.corrected_start_time || event.start_time;
  const d = rawDate ? new Date(rawDate) : null;
  const dayNum = d ? d.toLocaleDateString('en-US', { day: 'numeric' }) : '—';
  const month = d ? d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase() : '';
  const time = rawDate ? formatEventTime(rawDate) : '';
  const title = event.corrected_title || event.title || 'Event';
  const loc = event.corrected_location || event.location;

  return (
    <button
      onClick={onClick}
      className="shrink-0 w-56 text-left bg-zinc-900 border border-white/[0.07] rounded-2xl overflow-hidden hover:border-gold/30 hover:bg-zinc-800/80 transition-all group"
    >
      <div
        className="h-16 px-4 flex items-center gap-3"
        style={{
          background: 'linear-gradient(135deg, rgba(196,150,28,0.15), rgba(196,150,28,0.04))',
          borderBottom: '1px solid rgba(196,150,28,0.1)',
        }}
      >
        <div className="text-center shrink-0">
          <span className="text-xl font-black text-gold leading-none block">{dayNum}</span>
          <span className="text-[9px] font-bold text-gold/60 tracking-wider">{month}</span>
        </div>
        <div className="w-px h-6 bg-white/10 shrink-0" />
        <div className="min-w-0">
          {event.club_name && (
            <p className="text-[11px] font-semibold text-gold/80 truncate">{event.club_name}</p>
          )}
          {time && <p className="text-[10px] text-zinc-500">{time}</p>}
        </div>
      </div>
      <div className="p-3">
        <p className="text-sm font-semibold text-zinc-100 line-clamp-2 leading-snug mb-2 group-hover:text-white transition-colors">
          {title}
        </p>
        {loc && (
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="line-clamp-1">{loc}</span>
          </div>
        )}
      </div>
    </button>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

const EventsCalendar = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { fetchInterests } = useUserInterests();

  const [selectedType, setSelectedType] = useState('All');
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [interestValues, setInterestValues] = useState<string[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<ExternalEvent | null>(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [modalData, setModalData] = useState<{
    isOpen: boolean;
    clubName: string;
    clubId: string;
  }>({ isOpen: false, clubName: '', clubId: '' });

  const { data: clubs, loading: clubsLoading } = useClubs();
  const { data: events, loading: eventsLoading } = useEvents(clubs);
  const { events: recommendedEvents, loading: recLoading } = useRecommendedEvents(
    clubs,
    interestValues,
    8
  );

  // Fetch interests for logged-in users
  useEffect(() => {
    if (!user?.id) return;
    fetchInterests(user.id).then((data) => {
      setInterestValues(data.map((i) => i.interest_value));
    });
  }, [user?.id, fetchInterests]);

  const loading = clubsLoading || eventsLoading;

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const matchesType =
        selectedType === 'All' || event.type.toLowerCase() === selectedType.toLowerCase();
      const eventDate = new Date(event.date);
      const matchesMonth =
        eventDate.getMonth() === currentMonth.getMonth() &&
        eventDate.getFullYear() === currentMonth.getFullYear();
      return matchesType && matchesMonth;
    });
  }, [events, selectedType, currentMonth]);

  const eventsByDate = useMemo(() => {
    return filteredEvents.reduce(
      (acc, event) => {
        if (!acc[event.date]) acc[event.date] = [];
        acc[event.date].push(event);
        return acc;
      },
      {} as Record<string, typeof events>
    );
  }, [filteredEvents]);

  const sortedDates = Object.keys(eventsByDate).sort();

  const handleExpressInterest = (clubId: string) => {
    const club = clubs.find((c) => c.id === clubId);
    if (club) setModalData({ isOpen: true, clubName: club.name, clubId: club.id });
  };

  const getDaysInMonth = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + (direction === 'next' ? 1 : -1));
      return d;
    });
  };

  const getEventsForDay = (day: number) => {
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return filteredEvents.filter((e) => e.date === dateStr);
  };

  const typeColors: Record<string, string> = {
    recruitment: 'bg-gold',
    event: 'bg-primary',
    workshop: 'bg-blue-500',
    social: 'bg-green-500',
  };

  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDayOfMonth = getFirstDayOfMonth(currentMonth);
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const showForYou = user && interestValues.length > 0 && recommendedEvents.length > 0;

  return (
    <main className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="pt-28 pb-10 md:pt-36 md:pb-12 px-4">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-3xl mx-auto"
          >
            <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-4">
              Events & <span className="text-gradient-gold">Recruitment</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Never miss an opportunity. Find club events, recruitment drives, and workshops.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── For You shelf ── */}
      {(showForYou || (user && recLoading && interestValues.length > 0)) && (
        <section className="pb-10 px-4">
          <div className="container mx-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-gold" />
                <div>
                  <h2 className="font-display text-base font-bold text-white leading-none">
                    For You
                  </h2>
                  <p className="text-[11px] text-zinc-500 mt-0.5">Matched to your interests</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/onboarding?retake=true')}
                className="text-xs text-zinc-500 hover:text-gold transition-colors"
              >
                Update interests →
              </button>
            </div>

            {recLoading ? (
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="shrink-0 w-56 h-36 rounded-2xl bg-zinc-900 animate-pulse"
                  />
                ))}
              </div>
            ) : (
              <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
                {recommendedEvents.map((event) => (
                  <ForYouCard
                    key={event.id}
                    event={event}
                    onClick={() => {
                      setSelectedEvent(event as unknown as ExternalEvent);
                      setIsEventModalOpen(true);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Calendar navigation + filters ── */}
      <section className="pb-8 px-4">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" onClick={() => navigateMonth('prev')}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <h2 className="text-xl font-display font-semibold min-w-[180px] text-center">
                {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h2>
              <Button variant="outline" size="icon" onClick={() => navigateMonth('next')}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4 mr-2" /> List
              </Button>
              <Button
                variant={viewMode === 'calendar' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('calendar')}
              >
                <Grid3X3 className="w-4 h-4 mr-2" /> Calendar
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-6">
            {eventTypes.map((type) => (
              <Badge
                key={type}
                variant={selectedType === type ? 'default' : 'outline'}
                className={`cursor-pointer transition-all ${
                  selectedType === type
                    ? 'bg-gold text-primary-foreground hover:bg-gold/90'
                    : 'hover:border-gold/50'
                }`}
                onClick={() => setSelectedType(type)}
              >
                {type}
              </Badge>
            ))}
          </div>
        </div>
      </section>

      {/* ── Events view ── */}
      <section className="pb-20 px-4">
        <div className="container mx-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-gold animate-spin mb-4" />
              <p className="text-muted-foreground">Loading events...</p>
            </div>
          ) : viewMode === 'list' ? (
            sortedDates.length > 0 ? (
              <div className="space-y-6">
                {sortedDates.map((date) => (
                  <div key={date}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gold" />
                        <h3 className="font-display font-semibold text-foreground text-sm">
                          {new Date(date).toLocaleDateString('en-US', {
                            weekday: 'long',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </h3>
                      </div>
                      <div className="flex-1 h-px bg-border" />
                      <Badge variant="secondary" className="text-xs">
                        {eventsByDate[date].length} event
                        {eventsByDate[date].length !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {eventsByDate[date].map((event, index) => (
                        <EventCard key={event.id} event={event} index={index} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-16"
              >
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <Filter className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-display font-semibold text-foreground mb-2">
                  No events this month
                </h3>
                <p className="text-muted-foreground text-sm">
                  Try a different month or remove the type filter
                </p>
              </motion.div>
            )
          ) : (
            // Calendar grid view
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="premium-card overflow-hidden"
            >
              <div className="grid grid-cols-7 border-b border-border">
                {weekDays.map((day) => (
                  <div
                    key={day}
                    className="p-3 text-center text-sm font-medium text-muted-foreground bg-muted/50"
                  >
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="min-h-[120px] p-2 border-r border-b border-border bg-muted/20"
                  />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dayEvents = getEventsForDay(day);
                  const isToday =
                    new Date().toDateString() ===
                    new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day).toDateString();
                  return (
                    <div
                      key={day}
                      className={`min-h-[120px] p-2 border-r border-b border-border hover:bg-muted/30 transition-colors ${isToday ? 'bg-gold/5' : ''}`}
                    >
                      <div
                        className={`text-sm font-medium mb-1 ${
                          isToday
                            ? 'w-7 h-7 rounded-full bg-gold text-primary-foreground flex items-center justify-center'
                            : 'text-foreground'
                        }`}
                      >
                        {day}
                      </div>
                      <div className="space-y-1">
                        {dayEvents.slice(0, 3).map((event) => (
                          <Link
                            key={event.id}
                            to={`/clubs/${event.clubId}`}
                            className={`block text-xs p-1.5 rounded truncate text-white hover:opacity-80 transition-opacity ${typeColors[event.type] || 'bg-primary'}`}
                          >
                            {event.title}
                          </Link>
                        ))}
                        {dayEvents.length > 3 && (
                          <div className="text-xs text-muted-foreground pl-1">
                            +{dayEvents.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {Array.from({
                  length: (7 - ((firstDayOfMonth + daysInMonth) % 7)) % 7,
                }).map((_, i) => (
                  <div
                    key={`empty-end-${i}`}
                    className="min-h-[120px] p-2 border-r border-b border-border bg-muted/20"
                  />
                ))}
              </div>
              <div className="p-4 border-t border-border bg-muted/30">
                <div className="flex flex-wrap gap-4 text-xs">
                  {[
                    { label: 'Recruitment', color: 'bg-gold' },
                    { label: 'Event', color: 'bg-primary' },
                    { label: 'Workshop', color: 'bg-blue-500' },
                    { label: 'Social', color: 'bg-green-500' },
                  ].map(({ label, color }) => (
                    <div key={label} className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded ${color}`} />
                      <span className="text-muted-foreground">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-gradient-to-br from-primary to-primary/90">
        <div className="container mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-display font-bold text-primary-foreground mb-4">
              Running a Club?
            </h2>
            <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">
              List your events and recruitment drives to reach thousands of students
            </p>
            <Link to="/submit-event">
              <Button
                variant="outline"
                size="lg"
                className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
              >
                Add Your Event
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      <Footer />

      <EventDetailModal
        event={selectedEvent}
        isOpen={isEventModalOpen}
        onClose={() => {
          setIsEventModalOpen(false);
          setSelectedEvent(null);
        }}
      />

      <ExpressInterestModal
        isOpen={modalData.isOpen}
        onClose={() => setModalData((prev) => ({ ...prev, isOpen: false }))}
        clubName={modalData.clubName}
        clubId={modalData.clubId}
      />
    </main>
  );
};

export default EventsCalendar;
