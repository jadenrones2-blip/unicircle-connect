import { format, parseISO } from 'date-fns';
import { Calendar, Clock, MapPin, Link as LinkIcon, Building2, X } from 'lucide-react';
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-display pr-8">{event.title}</DialogTitle>
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

          {/* Location */}
          {event.location && (
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-gold mt-0.5 flex-shrink-0" />
              <p className="text-foreground">{event.location}</p>
            </div>
          )}

          {/* Source */}
          {event.source && (
            <div className="flex items-start gap-3">
              <LinkIcon className="w-5 h-5 text-gold mt-0.5 flex-shrink-0" />
              <Badge variant="secondary" className="text-xs">
                {event.source}
              </Badge>
            </div>
          )}

          {/* Club ID */}
          {event.club_id && (
            <div className="flex items-start gap-3">
              <Building2 className="w-5 h-5 text-gold mt-0.5 flex-shrink-0" />
              <p className="text-sm text-muted-foreground">Club: {event.club_id}</p>
            </div>
          )}

          {/* Description */}
          {event.description && (
            <div className="pt-2 border-t border-border">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {event.description}
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
