import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Calendar, MapPin, Clock, ArrowRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalEvent } from '@/integrations/external-supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserInterests } from '@/hooks/useUserInterests';
import { useExternalEvents } from '@/hooks/useExternalEvents';
import { useEventRecommendations } from '@/hooks/useEventRecommendations';
import { EventDetailModal } from '@/components/calendar/EventDetailModal';

export function RecommendedEvents() {
  const { user } = useAuth();
  const { fetchInterests } = useUserInterests();
  const { events } = useExternalEvents();
  const [interests, setInterests] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<ExternalEvent | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchInterests(user.id).then(setInterests);
    }
  }, [user, fetchInterests]);

  const { recommendedEvents, hasInterests } = useEventRecommendations(events, interests, 4);

  // Don't show if not logged in or no interests
  if (!user || !hasInterests || recommendedEvents.length === 0) {
    return null;
  }

  const handleEventClick = (event: ExternalEvent) => {
    setSelectedEvent(event);
    setModalOpen(true);
  };

  const formatEventDate = (dateStr: string) => {
    const date = parseISO(dateStr);
    return format(date, 'MMM d');
  };

  const formatEventTime = (dateStr: string) => {
    const date = parseISO(dateStr);
    return format(date, 'h:mm a');
  };

  // Clean title helper
  const getDisplayTitle = (event: ExternalEvent) => {
    const title = event.corrected_title || event.title;
    if (!title || title.startsWith('{"') || title.startsWith('{\"')) {
      return event.club_handle ? `@${event.club_handle}` : 'Event';
    }
    return title;
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="premium-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-gold" />
              <h2 className="text-lg font-semibold text-foreground">Recommended for You</h2>
            </div>
            <Link to="/dashboard">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                Update Interests
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>

          <p className="text-sm text-muted-foreground mb-4">
            Events matching your interests and career goals
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recommendedEvents.map((event, index) => (
              <motion.button
                key={event.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => handleEventClick(event)}
                className="text-left p-4 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors group"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-medium text-foreground group-hover:text-gold transition-colors line-clamp-1">
                    {getDisplayTitle(event)}
                  </h3>
                </div>

                {event.club_handle && (
                  <p className="text-sm text-gold mb-2">@{event.club_handle}</p>
                )}

                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-3">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatEventDate(event.start_time)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatEventTime(event.start_time)}
                  </span>
                  {(event.corrected_location || event.location) && (
                    <span className="flex items-center gap-1 line-clamp-1">
                      <MapPin className="w-3 h-3" />
                      {event.corrected_location || event.location}
                    </span>
                  )}
                </div>

                {/* Matched interests tags */}
                {event.matchedInterests.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    <span className="text-xs text-muted-foreground mr-1">Matched:</span>
                    {event.matchedInterests.slice(0, 3).map((interest, i) => (
                      <Badge 
                        key={i} 
                        variant="outline" 
                        className="text-xs bg-gold/10 text-gold border-gold/20 capitalize"
                      >
                        {interest}
                      </Badge>
                    ))}
                    {event.matchedInterests.length > 3 && (
                      <Badge variant="outline" className="text-xs text-muted-foreground">
                        +{event.matchedInterests.length - 3} more
                      </Badge>
                    )}
                  </div>
                )}
              </motion.button>
            ))}
          </div>
        </div>
      </motion.div>

      <EventDetailModal
        event={selectedEvent}
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedEvent(null);
        }}
      />
    </>
  );
}
