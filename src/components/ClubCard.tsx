import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Club, RecruitingStatus } from "@/data/mockData";

interface ClubCardProps {
  club: Club;
  index: number;
}

const getStatusStyles = (status: RecruitingStatus) => {
  switch (status) {
    case 'open':
      return 'bg-green-500/10 text-green-600 border-green-500/20';
    case 'upcoming':
      return 'bg-gold/10 text-gold border-gold/20';
    case 'closed':
      return 'bg-muted text-muted-foreground border-border';
  }
};

const getStatusLabel = (status: RecruitingStatus) => {
  switch (status) {
    case 'open':
      return 'Open';
    case 'upcoming':
      return 'Upcoming';
    case 'closed':
      return 'Closed';
  }
};

const ClubCard = ({ club, index }: ClubCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group bg-card border border-border rounded-lg overflow-hidden hover:border-gold/30 hover:shadow-md transition-all duration-300"
    >
      {/* Image */}
      <div className="relative h-40 overflow-hidden">
        <img
          src={club.imageUrl}
          alt={club.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/50 to-transparent" />
        
        {/* Category Badge */}
        {club.category && (
          <Badge 
            variant="secondary" 
            className="absolute top-3 left-3 bg-background/80 backdrop-blur-sm text-foreground border-0"
          >
            {club.category}
          </Badge>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="font-display text-lg font-semibold text-foreground group-hover:text-gold transition-colors leading-tight">
            {club.name}
          </h3>
          {/* Recruiting Status */}
          <Badge 
            variant="outline" 
            className={`flex-shrink-0 text-xs ${getStatusStyles(club.recruitingStatus)}`}
          >
            {getStatusLabel(club.recruitingStatus)}
          </Badge>
        </div>
        
        {club.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
            {club.description}
          </p>
        )}

        {/* Action */}
        <Button variant="outline" size="sm" className="w-full group/btn" asChild>
          <Link to={`/clubs/${club.id}`}>
            View Club
            <ArrowRight className="w-3.5 h-3.5 ml-2 transition-transform group-hover/btn:translate-x-1" />
          </Link>
        </Button>
      </div>
    </motion.div>
  );
};

export default ClubCard;
