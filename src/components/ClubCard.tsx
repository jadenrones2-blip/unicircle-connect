import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Users, Calendar, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Club } from "@/data/mockData";

interface ClubCardProps {
  club: Club;
  index: number;
}

const ClubCard = ({ club, index }: ClubCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group premium-card overflow-hidden"
    >
      {/* Image */}
      <div className="relative h-48 overflow-hidden">
        <img
          src={club.imageUrl}
          alt={club.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 to-transparent" />
        
        {/* Recruiting Badge */}
        {club.isRecruiting && (
          <Badge className="absolute top-3 right-3 bg-gold text-primary-foreground border-0">
            Recruiting
          </Badge>
        )}
        
        {/* Category */}
        <span className="absolute bottom-3 left-3 text-xs font-medium text-white/90 bg-white/20 backdrop-blur-sm px-2 py-1 rounded">
          {club.category}
        </span>
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="font-display text-lg font-semibold text-foreground mb-2 group-hover:text-gold transition-colors">
          {club.name}
        </h3>
        
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
          {club.description}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {club.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs font-normal">
              {tag}
            </Badge>
          ))}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            {club.memberCount} members
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {club.meetingSchedule}
          </span>
        </div>

        {/* Action */}
        <Button variant="outline" size="sm" className="w-full group/btn" asChild>
          <Link to={`/clubs/${club.id}`}>
            View Details
            <ArrowRight className="w-3.5 h-3.5 ml-2 transition-transform group-hover/btn:translate-x-1" />
          </Link>
        </Button>
      </div>
    </motion.div>
  );
};

export default ClubCard;
