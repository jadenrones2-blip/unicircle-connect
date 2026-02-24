import { Heart, Bookmark, Sparkles, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Club } from '@/data/mockData';

interface SavedClubsSectionProps {
  savedClubIds: string[];
  clubs: Club[];
  recommendedClubs: { club: Club; score: number; matchedCategories: string[] }[];
  onUnsave: (clubId: string) => void;
}

export default function SavedClubsSection({
  savedClubIds,
  clubs,
  recommendedClubs,
  onUnsave,
}: SavedClubsSectionProps) {
  const savedClubsList = clubs.filter((c) => savedClubIds.includes(c.id));

  return (
    <div className="space-y-10">
      {/* Saved Clubs */}
      {savedClubsList.length === 0 ? (
        <div className="text-center py-16 bg-muted/30 rounded-xl">
          <Bookmark className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No saved clubs yet</h3>
          <p className="text-muted-foreground mb-4">
            Browse clubs and tap the heart icon to save ones you're interested in.
          </p>
          <Button variant="outline" asChild>
            <Link to="/clubs">
              Browse Clubs
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {savedClubsList.map((club, index) => (
            <motion.div
              key={club.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-card border border-border rounded-lg p-5 group hover:border-gold/30 transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                {club.category && (
                  <Badge variant="secondary" className="text-xs">
                    {club.category}
                  </Badge>
                )}
                <button
                  onClick={() => onUnsave(club.id)}
                  className="p-1 rounded-full hover:bg-muted transition-colors"
                  title="Unsave"
                >
                  <Heart className="w-4 h-4 fill-red-500 text-red-500" />
                </button>
              </div>
              <h4 className="font-display font-semibold text-foreground group-hover:text-gold transition-colors mb-2">
                {club.name}
              </h4>
              {club.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                  {club.description}
                </p>
              )}
              <Button variant="outline" size="sm" className="w-full" asChild>
                <Link to={`/clubs/${club.id}`}>
                  View Club
                  <ArrowRight className="w-3.5 h-3.5 ml-2" />
                </Link>
              </Button>
            </motion.div>
          ))}
        </div>
      )}

      {/* Similar Club Recommendations */}
      {recommendedClubs.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-gold" />
            <h3 className="font-display text-lg font-bold text-foreground tracking-tight">
              Similar Clubs You Might Like
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendedClubs.map(({ club, matchedCategories }, index) => (
              <motion.div
                key={club.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-card border border-border rounded-lg p-5 hover:border-primary/30 transition-all"
              >
                <div className="flex items-center gap-2 flex-wrap mb-3">
                  {matchedCategories.slice(0, 2).map((cat) => (
                    <Badge key={cat} variant="outline" className="text-xs border-primary/30 text-primary">
                      {cat}
                    </Badge>
                  ))}
                </div>
                <h4 className="font-display font-semibold text-foreground mb-2">
                  {club.name}
                </h4>
                {club.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {club.description}
                  </p>
                )}
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <Link to={`/clubs/${club.id}`}>
                    View Club
                    <ArrowRight className="w-3.5 h-3.5 ml-2" />
                  </Link>
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
