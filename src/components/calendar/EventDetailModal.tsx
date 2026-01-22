import { format, parseISO } from 'date-fns';
import { Calendar, MapPin, ExternalLink, Building2, AtSign, FileText } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalEvent } from '@/integrations/external-supabase/client';

interface EventDetailModalProps {
  event: ExternalEvent | null;
  isOpen: boolean;
  onClose: () => void;
}

export function EventDetailModal({ event, isOpen, onClose }: EventDetailModalProps) {
  if (!event) return null;

  const startDate = parseISO(event.start_time);
  const endDate = event.end_time ? parseISO(event.end_time) : null;

  const formatTime = (date: Date) => format(date, 'h:mm a');
  const formatDate = (date: Date) => format(date, 'EEEE, MMMM d, yyyy');

  // Check if a string looks like JSON error data
  const isErrorData = (text: string | null): boolean => {
    if (!text) return false;
    return text.startsWith('{"') || text.startsWith('{\"') || text.includes('"error"');
  };

  // Get a clean display title - fall back to club_handle if title is error data
  const displayTitle = isErrorData(event.title) 
    ? (event.club_handle ? `@${event.club_handle}` : 'Event')
    : event.title;

  // Only show caption if it's not error data
  const displayCaption = isErrorData(event.caption) ? null : event.caption;

  const openExternal = (url: string) => {
    // Instagram often blocks being loaded inside iframes. In the Lovable preview,
    // opening a link can still be treated as an iframe navigation, so we:
    // 1) Try a new tab on the current window
    // 2) Try a new tab from the top window (escape the iframe)
    // 3) Fall back to navigating the top window
    try {
      const w = window.open(url, '_blank', 'noopener,noreferrer');
      if (w) return;
    } catch {
      // ignore
    }

    try {
      const topWindow = window.top;
      const w = topWindow?.open?.(url, '_blank', 'noopener,noreferrer');
      if (w) return;
    } catch {
      // ignore
    }

    try {
      if (window.top) window.top.location.href = url;
    } catch {
      // ignore
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

        <div className="flex justify-end mt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
