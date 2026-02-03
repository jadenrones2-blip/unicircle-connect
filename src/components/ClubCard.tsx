import { memo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Club, RecruitingStatus } from "@/data/mockData";

interface ClubCardProps {
  club: Club;
}

const getStatusStyles = (status: RecruitingStatus) => {
  switch (status) {
    case "open":
      return "bg-green-500/10 text-green-600 border-green-500/20";
    case "upcoming":
      return "bg-gold/10 text-gold border-gold/20";
    case "closed":
      return "bg-muted text-muted-foreground border-border";
  }
};

const getStatusLabel = (status: RecruitingStatus) => {
  switch (status) {
    case "open":
      return "Open";
    case "upcoming":
      return "Upcoming";
    case "closed":
      return "Closed";
  }
};

const isGreekOrg = (club: Club): boolean => {
  const searchText = `${club.name} ${club.category} ${club.categoryBucket || ''}`.toLowerCase();
  return searchText.includes('panhellenic') || 
         searchText.includes('interfraternity') || 
         searchText.includes('fraternity') || 
         searchText.includes('sorority');
};

const ClubCardComponent = ({ club }: ClubCardProps) => {
  const showGreekTag = isGreekOrg(club);
  
  return (
    <motion.div
      initial={false}
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      className="group bg-card border border-border rounded-lg overflow-hidden hover:border-gold/30 hover:shadow-md transition-all duration-300 p-5"
    >
      {/* Header with category and status */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          {club.category && (
            <Badge
              variant="secondary"
              className="bg-muted text-muted-foreground border-0 text-xs"
            >
              {club.category}
            </Badge>
          )}
          {showGreekTag && (
            <Badge
              variant="secondary"
              className="bg-purple-500/10 text-purple-600 border-purple-500/20 text-xs"
            >
              Greek
            </Badge>
          )}
        </div>
        {/* Only show Open/Upcoming status, hide Closed */}
        {club.recruitingStatus !== "closed" && (
          <Badge
            variant="outline"
            className={`flex-shrink-0 text-xs ${getStatusStyles(club.recruitingStatus)}`}
          >
            {getStatusLabel(club.recruitingStatus)}
          </Badge>
        )}
      </div>

      {/* Title */}
      <h3 className="font-display text-lg font-semibold text-foreground group-hover:text-gold transition-colors leading-tight mb-2">
        {club.name}
      </h3>

      {/* Description */}
      {club.description && (
        <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
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
    </motion.div>
  );
};

ClubCardComponent.displayName = "ClubCard";

export default memo(ClubCardComponent);
