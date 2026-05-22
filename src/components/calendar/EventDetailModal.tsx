import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import {
  Calendar,
  MapPin,
  ExternalLink,
  Building2,
  AtSign,
  FileText,
  CalendarPlus,
  Users,
  Loader2,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalEvent } from '@/hooks/useExternalEvents';
import { dataClient as supabase } from '@/integrations/supabase/dataClient';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface EventDetailModalProps {
  event: ExternalEvent | null;
  isOpen: boolean;
  onClose: () => void;
}

export function EventDetailModal({ event, isOpen, onClose }: EventDetailModalProps) {
  const { user } = useAuth();
  const [isRsvped, setIsRsvped] = useState(false);
  const [rsvpCount, setRsvpCount] = useState<number | null>(null);
  const [rsvpLoading, setRsvpLoading] = useState(false);

  useEffect(() => {
    if (!event || !isOpen) return;

    const fetchRsvpData = async () => {
      try {
        const { count, error: countError } = await supabase
          .from('event_rsvps')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', event.id);

        if (!countError) setRsvpCount(count ?? 0);

        if (user) {
          const { data, error: rsvpError } = await supabase
            .from('event_rsvps')
            .select('id')
            .eq('event_id', event.id)
            .eq('user_id', user.id)
            .maybeSingle();

          if (!rsvpError) setIsRsvped(!!data);
        } else {
          setIsRsvped(false);
        }
      } catch {
        // Table may not exist yet
      }
    };

    fetchRsvpData();
  }, [event, isOpen, user]);

  useEffect(() => {
    if (!isOpen) {
      setIsRsvped(false);
      setRsvpCount(null);
    }
  }, [isOpen]);

  if (!event) return null;

  const startDate = parseISO(event.start_time);
  const endDate = event.end_time ? parseISO(event.end_time) : null;

  const formatTime = (date: Date) => format(date, 'h:mm a');
  const formatDate = (date: Date) => format(date, 'EEEE, MMMM d, yyyy');

  const isErrorData = (text: string | null): boolean => {
    if (!text) return false;
    return text.startsWith('{"') || text.startsWith('{\"') || text.includes('"error"');
  };

  const displayTitle = isErrorData(event.title)
    ? event.club_handle
      ? `@${event.club_handle}`
      : 'Event'
    : event.title;

  const displayCaption = isErrorData(event.caption) ? null : event.caption;

  const buildGoogleCalendarUrl = () => {
    const toGCal = (iso: string) => {
      try {
        return new Date(iso)
          .toISOString()
          .replace(/[-:]/g, '')
          .replace(/\.\d{3}Z$/, 'Z');
      } catch {
        return '';
      }
    };
    const title = encodeURIComponent(displayTitle);
    const start = toGCal(event.start_time);
    const end = event.end_time ? toGCal(event.end_time) : toGCal(event.start_time);
    const dates = `${start}/${end}`;
    const details = encodeURIComponent(displayCaption || '');
    const location = encodeURIComponent(event.location || '');
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}`;
  };

  const openExternal = (url: string) => {
    try {
      const w = window.open(url, '_blank', 'noopener,noreferrer');
      if (w) return;
    } catch {
      /* ignore */
    }
    try {
      const topWindow = window.top;
      const w = topWindow?.open?.(url, '_blank', 'noopener,noreferrer');
      if (w) return;
    } catch {
      /* ignore */
    }
    try {
      if (window.top) window.top.location.href = url;
    } catch {
      /* ignore */
    }
  };

  const handleRsvp = async () => {
    if (!user) {
      toast.error('Please log in to RSVP');
      return;
    }

    setRsvpLoading(true);
    try {
      if (isRsvped) {
        const { error } = await supabase
          .from('event_rsvps')
          .delete()
          .eq('event_id', event.id)
          .eq('user_id', user.id);

        if (error) throw error;

        setIsRsvped(false);
        setRsvpCount((prev) => (prev !== null ? Math.max(0, prev - 1) : prev));
        toast.success('RSVP removed');
      } else {
        const { error } = await supabase
          .from('event_rsvps')
          .insert({ event_id: event.id, user_id: user.id, status: 'going' });

        if (error) throw error;

        setIsRsvped(true);
        setRsvpCount((prev) => (prev !== null ? prev + 1 : 1));
        toast.success("You're going!");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      toast.error(message);
    } finally {
      setRsvpLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-display pr-8">{displayTitle}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Date & Time */}
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-gold mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-foreground">{formatDate(startDate)}</p>
              <p className="text-sm text-muted-foreground">
                {formatTime(startDate)}
                {endDate && ` – ${formatTime(endDate)}`}
              </p>
            </div>
          </div>

          {/* Club Handle */}
          {event.club_handle && (
            <div className="flex items-start gap-3">
              <AtSign className="w-5 h-5 text-gold mt-0.5 flex-shrink-0" />
              <p className="text-foreground font-medium">@{event.club_handle}</p>
            </div>
          )}

          {/* Location */}
          {event.location && (
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-gold mt-0.5 flex-shrink-0" />
              <p className="text-foreground">{event.location}</p>
            </div>
          )}

          {/* Source URL */}
          {event.source_url && (
            <div className="flex items-start gap-3">
              <ExternalLink className="w-5 h-5 text-gold mt-0.5 flex-shrink-0" />
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  openExternal(event.source_url!);
                }}
                className="text-gold hover:text-gold/80 underline underline-offset-2 transition-colors text-left"
              >
                View Original Post
              </button>
            </div>
          )}

          {/* Source Badge */}
          {event.source && (
            <div className="flex items-start gap-3">
              <Building2 className="w-5 h-5 text-gold mt-0.5 flex-shrink-0" />
              <Badge variant="secondary" className="text-xs">
                {event.source}
              </Badge>
            </div>
          )}

          {/* Details (Caption) */}
          {displayCaption && (
            <div className="pt-2 border-t border-border">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-gold" />
                <span className="text-sm font-medium text-foreground">Details</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {displayCaption}
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 justify-end mt-4 items-center">
          {/* RSVP count */}
          {rsvpCount !== null && rsvpCount > 0 && (
            <span className="flex items-center gap-1 text-sm text-muted-foreground mr-auto">
              <Users className="w-4 h-4" />
              {rsvpCount} {rsvpCount === 1 ? 'person' : 'people'} going
            </span>
          )}

          {/* RSVP Button */}
          <Button
            variant={isRsvped ? 'gold' : 'outline'}
            size="sm"
            onClick={handleRsvp}
            disabled={rsvpLoading}
            className="gap-2"
          >
            {rsvpLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isRsvped ? (
              'Going ✓'
            ) : (
              'RSVP'
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => openExternal(buildGoogleCalendarUrl())}
            className="gap-2"
          >
            <CalendarPlus className="w-4 h-4" />
            Add to Google Calendar
          </Button>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
