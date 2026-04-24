import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, Check, Clock, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Club } from '@/data/mockData';

interface RecommendedClubCardProps {
  club: Club;
  score: number;
  index: number;
  hasApplied: boolean;
  isMember: boolean;
  onApply: () => void;
  isApplying?: boolean;
}

export default function RecommendedClubCard({
  club,
  score,
  index,
  hasApplied,
  isMember,
  onApply,
  isApplying,
}: RecommendedClubCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group bg-card border border-border rounded-lg overflow-hidden hover:border-gold/30 hover:shadow-md transition-all duration-200"
    >
      {/* Content */}
      <div className="p-5">
        {/* Header badges */}
        <div className="flex items-center justify-between mb-3">
          <Badge className="bg-gold/10 text-gold border-0 text-[10px] tracking-wider uppercase font-semibold">
            {score} {score === 1 ? 'match' : 'matches'}
          </Badge>
          {club.recruitingStatus === 'open' && (
            <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 text-xs">
              Recruiting
            </Badge>
          )}
        </div>

        {/* Title */}
        <Link to={`/clubs/${club.id}`}>
          <h3 className="font-display font-bold text-foreground group-hover:text-gold transition-colors line-clamp-1 mb-2 tracking-tight">
            {club.name}
          </h3>
        </Link>

        {/* Description */}
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
          {club.description || 'Discover this club and what they offer.'}
        </p>

        {/* Category */}
        <div className="flex items-center gap-2 mb-4">
          <Badge variant="secondary" className="text-xs">
            {club.categoryBucket || club.category}
          </Badge>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {isMember ? (
            <Button variant="outline" size="sm" className="flex-1" disabled>
              <Check className="h-4 w-4 mr-1" />
              Member
            </Button>
          ) : hasApplied ? (
            <Button variant="outline" size="sm" className="flex-1" disabled>
              <Clock className="h-4 w-4 mr-1" />
              Applied
            </Button>
          ) : (
            <Button 
              variant="gold" 
              size="sm" 
              className="flex-1"
              onClick={onApply}
              disabled={isApplying}
            >
              <UserPlus className="h-4 w-4 mr-1" />
              {isApplying ? 'Applying...' : 'Apply'}
            </Button>
          )}
          <Button variant="ghost" size="sm" asChild>
            <Link to={`/clubs/${club.id}`}>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
