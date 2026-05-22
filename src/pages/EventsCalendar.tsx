import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Filter, ChevronLeft, ChevronRight, List, Grid3X3, Loader2 } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import EventCard from '@/components/EventCard';
import ExpressInterestModal from '@/components/ExpressInterestModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useClubs, useEvents } from '@/hooks/useExternalDB';

const eventTypes = ['All', 'Recruitment', 'Event', 'Workshop', 'Social'];

type ViewMode = 'list' | 'calendar';

const EventsCalendar = () => {
  const [selectedType, setSelectedType] = useState('All');
  const [currentMonth, setCurrentMonth] = useState(new Date(2025, 1, 1)); // February 2025
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [modalData, setModalData] = useState<{ isOpen: boolean; clubName: string; clubId: string }>(
    {
      isOpen: false,
      clubName: '',
      clubId: '',
    }
  );

  const { data: clubs, loading: clubsLoading } = useClubs();
  const { data: events, loading: eventsLoading } = useEvents(clubs);

  const loading = clubsLoading || eventsLoading;

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const matchesType =
        selectedType === 'All' || event.type.toLowerCase() === selectedType.toLowerCase();

      // Filter by current month
      const eventDate = new Date(event.date);
      const matchesMonth =
        eventDate.getMonth() === currentMonth.getMonth() &&
        eventDate.getFullYear() === currentMonth.getFullYear();

      return matchesType && matchesMonth;
    });
  }, [events, selectedType, currentMonth]);

  // Group events by date
  const eventsByDate = useMemo(() => {
    return filteredEvents.reduce(
      (acc, event) => {
        if (!acc[event.date]) {
          acc[event.date] = [];
        }
        acc[event.date].push(event);
        return acc;
      },
      {} as Record<string, typeof events>
    );
  }, [filteredEvents]);

  const sortedDates = Object.keys(eventsByDate).sort();

  const handleExpressInterest = (clubId: string) => {
    const club = clubs.find((c) => c.id === clubId);
    if (club) {
      setModalData({
        isOpen: true,
        clubName: club.name,
        clubId: club.id,
      });
    }
  };

  // Calendar grid helpers
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth((prev) => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  const getEventsForDay = (day: number) => {
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return filteredEvents.filter((event) => event.date === dateStr);
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

  return (
    <main className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="pt-28 pb-12 md:pt-36 md:pb-16 px-4">
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

      {/* Calendar Navigation */}
      <section className="pb-8 px-4">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            {/* Month Navigation */}
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

            {/* View Toggle */}
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4 mr-2" />
                List
              </Button>
              <Button
                variant={viewMode === 'calendar' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('calendar')}
              >
                <Grid3X3 className="w-4 h-4 mr-2" />
                Calendar
              </Button>
            </div>
          </div>

          {/* Type Filters */}
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

      {/* Events View */}
      <section className="pb-20 px-4">
        <div className="container mx-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-gold animate-spin mb-4" />
              <p className="text-muted-foreground">Loading events...</p>
            </div>
          ) : viewMode === 'list' ? (
            // List View
            sortedDates.length > 0 ? (
              <div className="space-y-6">
                {sortedDates.map((date) => (
                  <div key={date}>
                    {/* Date Header */}
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

                    {/* Events for this date */}
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
                  No events found
                </h3>
                <p className="text-muted-foreground">
                  Try adjusting your filters or check back later
                </p>
              </motion.div>
            )
          ) : (
            // Calendar Grid View
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="premium-card overflow-hidden"
            >
              {/* Weekday Headers */}
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

              {/* Calendar Days */}
              <div className="grid grid-cols-7">
                {/* Empty cells for days before the first of the month */}
                {Array.from({ length: firstDayOfMonth }).map((_, index) => (
                  <div
                    key={`empty-${index}`}
                    className="min-h-[120px] p-2 border-r border-b border-border bg-muted/20"
                  />
                ))}

                {/* Days of the month */}
                {Array.from({ length: daysInMonth }).map((_, index) => {
                  const day = index + 1;
                  const dayEvents = getEventsForDay(day);
                  const isToday =
                    new Date().toDateString() ===
                    new Date(
                      currentMonth.getFullYear(),
                      currentMonth.getMonth(),
                      day
                    ).toDateString();

                  return (
                    <div
                      key={day}
                      className={`min-h-[120px] p-2 border-r border-b border-border hover:bg-muted/30 transition-colors ${
                        isToday ? 'bg-gold/5' : ''
                      }`}
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
                            className={`block text-xs p-1.5 rounded truncate text-white hover:opacity-80 transition-opacity ${typeColors[event.type]}`}
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

                {/* Empty cells for remaining days */}
                {Array.from({ length: (7 - ((firstDayOfMonth + daysInMonth) % 7)) % 7 }).map(
                  (_, index) => (
                    <div
                      key={`empty-end-${index}`}
                      className="min-h-[120px] p-2 border-r border-b border-border bg-muted/20"
                    />
                  )
                )}
              </div>

              {/* Legend */}
              <div className="p-4 border-t border-border bg-muted/30">
                <div className="flex flex-wrap gap-4 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-gold" />
                    <span className="text-muted-foreground">Recruitment</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-primary" />
                    <span className="text-muted-foreground">Event</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-blue-500" />
                    <span className="text-muted-foreground">Workshop</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-green-500" />
                    <span className="text-muted-foreground">Social</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </section>

      {/* Recruitment CTA */}
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
            <Button
              variant="outline"
              size="lg"
              className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
            >
              Add Your Event
            </Button>
          </motion.div>
        </div>
      </section>

      <Footer />

      {/* Express Interest Modal */}
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
