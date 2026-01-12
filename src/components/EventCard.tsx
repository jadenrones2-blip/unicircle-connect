import { motion } from "framer-motion";
import { Calendar, Clock, MapPin, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Event } from "@/data/mockData";

interface EventCardProps {
  event: Event;
  index: number;
  onExpressInterest?: () => void;
}

const typeColors = {
  recruitment: "bg-gold text-primary-foreground",
  event: "bg-primary text-primary-foreground",
  workshop: "bg-blue-500 text-white",
  social: "bg-green-500 text-white"
};

const typeLabels = {
  recruitment: "Recruitment",
  event: "Event",
  workshop: "Workshop",
  social: "Social"
};

const EventCard = ({ event, index, onExpressInterest }: EventCardProps) => {
  const eventDate = new Date(event.date);
  const day = eventDate.getDate();
  const month = eventDate.toLocaleDateString('en-US', { month: 'short' });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group premium-card overflow-hidden"
    >
      <div className="flex">
        {/* Date Block */}
        <div className="flex-shrink-0 w-20 bg-gradient-to-br from-primary to-primary/80 flex flex-col items-center justify-center text-primary-foreground">
          <span className="text-2xl font-display font-bold">{day}</span>
          <span className="text-xs uppercase tracking-wider opacity-80">{month}</span>
        </div>

        {/* Content */}
        <div className="flex-1 p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-display text-base font-semibold text-foreground group-hover:text-gold transition-colors line-clamp-1">
              {event.title}
            </h3>
            <Badge className={`${typeColors[event.type]} border-0 text-xs flex-shrink-0`}>
              {typeLabels[event.type]}
            </Badge>
          </div>

          <p className="text-xs text-gold font-medium mb-2">{event.clubName}</p>
          
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {event.description}
          </p>

          {/* Event Details */}
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-3">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {event.time}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {event.location}
            </span>
          </div>

          {/* Action */}
          {event.type === 'recruitment' && onExpressInterest && (
            <Button 
              variant="gold" 
              size="sm" 
              className="w-full"
              onClick={onExpressInterest}
            >
              <Users className="w-3.5 h-3.5 mr-2" />
              Express Interest
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default EventCard;
