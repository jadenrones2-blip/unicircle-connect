import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  isToday,
  parseISO,
  addMonths,
  subMonths
} from 'date-fns';
import { ChevronLeft, ChevronRight, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalEvent } from '@/integrations/external-supabase/client';
import { EventDetailModal } from './EventDetailModal';

interface MonthlyCalendarProps {
  events: ExternalEvent[];
  loading: boolean;
  error: string | null;
  onRefetch: () => void;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function MonthlyCalendar({ events, loading, error, onRefetch }: MonthlyCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<ExternalEvent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentMonth]);

  // Group events by date
  const eventsByDate = useMemo(() => {
    const grouped: Record<string, ExternalEvent[]> = {};
    
    events.forEach(event => {
      const dateKey = format(parseISO(event.start_time), 'yyyy-MM-dd');
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(event);
    });

    return grouped;
  }, [events]);

  const handlePrevMonth = () => setCurrentMonth(prev => subMonths(prev, 1));
  const handleNextMonth = () => setCurrentMonth(prev => addMonths(prev, 1));
  const handleToday = () => setCurrentMonth(new Date());

  const handleEventClick = (event: ExternalEvent) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
  };

  const getEventsForDay = (day: Date) => {
    const dateKey = format(day, 'yyyy-MM-dd');
    return eventsByDate[dateKey] || [];
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <AlertCircle className="w-12 h-12 text-destructive mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">Failed to load events</h3>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={onRefetch} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handlePrevMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-xl md:text-2xl font-display font-semibold min-w-[200px] text-center">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <Button variant="outline" size="icon" onClick={handleNextMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleToday}>
            Today
          </Button>
          <Button variant="ghost" size="icon" onClick={onRefetch} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Loading overlay */}
      {loading && (
        <div className="flex items-center justify-center py-4 mb-4">
          <Loader2 className="w-5 h-5 text-gold animate-spin mr-2" />
          <span className="text-sm text-muted-foreground">Loading events...</span>
        </div>
      )}

      {/* Calendar Grid */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="border border-border rounded-lg overflow-hidden bg-card"
      >
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 border-b border-border bg-muted/50">
          {WEEKDAYS.map(day => (
            <div 
              key={day} 
              className="p-3 text-center text-sm font-medium text-muted-foreground"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, index) => {
            const dayEvents = getEventsForDay(day);
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isDayToday = isToday(day);

            return (
              <div
                key={index}
                className={`min-h-[100px] md:min-h-[120px] p-2 border-r border-b border-border last:border-r-0 transition-colors ${
                  !isCurrentMonth ? 'bg-muted/30' : 'hover:bg-muted/20'
                } ${isDayToday ? 'bg-gold/5' : ''}`}
              >
                {/* Day Number */}
                <div className={`text-sm font-medium mb-1 ${
                  isDayToday 
                    ? 'w-7 h-7 rounded-full bg-gold text-primary-foreground flex items-center justify-center' 
                    : isCurrentMonth 
                      ? 'text-foreground' 
                      : 'text-muted-foreground/50'
                }`}>
                  {format(day, 'd')}
                </div>

                {/* Events */}
                <div className="space-y-1">
                  {dayEvents.slice(0, 3).map(event => (
                    <button
                      key={event.id}
                      onClick={() => handleEventClick(event)}
                      className="w-full text-left text-xs p-1.5 rounded bg-primary text-primary-foreground hover:bg-primary/80 transition-colors truncate"
                    >
                      {format(parseISO(event.start_time), 'h:mm a')} {event.title}
                    </button>
                  ))}
                  {dayEvents.length > 3 && (
                    <Badge 
                      variant="secondary" 
                      className="text-xs cursor-pointer hover:bg-muted"
                      onClick={() => {
                        // Show the 4th event on click
                        if (dayEvents[3]) {
                          handleEventClick(dayEvents[3]);
                        }
                      }}
                    >
                      +{dayEvents.length - 3} more
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Event count */}
      <div className="mt-4 text-sm text-muted-foreground text-center">
        {events.length} total event{events.length !== 1 ? 's' : ''} loaded
        <span className="mx-2">•</span>
        <span className="text-green-500">● Realtime connected</span>
      </div>

      {/* Event Detail Modal */}
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
