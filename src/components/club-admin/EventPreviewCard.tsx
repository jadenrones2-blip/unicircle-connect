import { Calendar, Clock, MapPin, Instagram, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface EventPreviewCardProps {
  title: string;
  clubName: string;
  date: string;
  time?: string;
  location?: string;
  description?: string;
  imageUrl?: string | null;
  instagramUrl?: string;
  isDraft?: boolean;
}

export function EventPreviewCard({
  title,
  clubName,
  date,
  time,
  location,
  description,
  imageUrl,
  instagramUrl,
  isDraft,
}: EventPreviewCardProps) {
  const eventDate = date ? new Date(date) : null;
  const day = eventDate?.getDate() || '--';
  const month = eventDate?.toLocaleDateString('en-US', { month: 'short' }) || '---';

  const formattedTime = time
    ? new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    : null;

  return (
    <div className="premium-card overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-border bg-muted/30 flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Preview
        </span>
        {isDraft && (
          <Badge
            variant="outline"
            className="border-yellow-500/50 text-yellow-600 bg-yellow-500/10 text-xs"
          >
            Draft
          </Badge>
        )}
      </div>

      {/* Image */}
      {imageUrl ? (
        <div className="aspect-video w-full overflow-hidden bg-muted">
          <img
            src={imageUrl}
            alt={title || 'Event preview'}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="aspect-video w-full bg-gradient-to-br from-primary/10 to-gold/10 flex items-center justify-center">
          <Calendar className="w-12 h-12 text-muted-foreground/30" />
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        <div className="flex gap-3">
          {/* Date Block */}
          <div className="flex-shrink-0 w-14 h-14 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex flex-col items-center justify-center text-primary-foreground">
            <span className="text-lg font-display font-bold leading-none">{day}</span>
            <span className="text-[10px] uppercase tracking-wider opacity-80">{month}</span>
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            <h3 className="font-display text-base font-semibold text-foreground truncate">
              {title || 'Event Title'}
            </h3>
            <p className="text-sm text-gold font-medium truncate">@{clubName || 'clubhandle'}</p>

            <div className="flex flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
              {formattedTime && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formattedTime}
                </span>
              )}
              {location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  <span className="truncate max-w-[120px]">{location}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        {description && (
          <p className="mt-3 text-sm text-muted-foreground line-clamp-2">{description}</p>
        )}

        {/* Instagram Link */}
        {instagramUrl && (
          <div className="mt-3 pt-3 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2 text-pink-500 border-pink-500/30 hover:bg-pink-500/10"
              asChild
            >
              <a href={instagramUrl} target="_blank" rel="noopener noreferrer">
                <Instagram className="w-4 h-4" />
                View on Instagram
                <ExternalLink className="w-3 h-3 ml-auto" />
              </a>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
