import { memo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Club, RecruitingStatus } from '@/data/mockData';

interface ClubListItemProps {
  club: Club;
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

const isGreekOrg = (club: Club): boolean => {
  const searchText = `${club.name} ${club.category} ${club.categoryBucket || ''}`.toLowerCase();
  return (
    searchText.includes('panhellenic') ||
    searchText.includes('interfraternity') ||
    searchText.includes('fraternity') ||
    searchText.includes('sorority')
  );
};

const ClubListItemComponent = ({ club }: ClubListItemProps) => {
  const showGreekTag = isGreekOrg(club);

  return (
    <Link
      to={`/clubs/${club.id}`}
      className="group flex items-center justify-between gap-4 py-4 px-5 bg-card border border-border rounded-lg hover:border-gold/30 hover:bg-muted/30 transition-all duration-200"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-1">
          <h3 className="font-display text-base font-semibold text-foreground group-hover:text-gold transition-colors truncate">
            {club.name}
          </h3>
          {club.category && (
            <Badge
              variant="secondary"
              className="bg-muted text-muted-foreground border-0 text-xs flex-shrink-0 hidden sm:inline-flex"
            >
              {club.category}
            </Badge>
          )}
          {showGreekTag && (
            <Badge
              variant="secondary"
              className="bg-purple-500/10 text-purple-600 border-purple-500/20 text-xs flex-shrink-0 hidden sm:inline-flex"
            >
              Greek
            </Badge>
          )}
        </div>
        {club.description && (
          <p className="text-sm text-muted-foreground line-clamp-1">{club.description}</p>
        )}
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        {club.recruitingStatus !== 'closed' && (
          <Badge
            variant="outline"
            className={`text-xs hidden sm:inline-flex ${getStatusStyles(club.recruitingStatus)}`}
          >
            {getStatusLabel(club.recruitingStatus)}
          </Badge>
        )}
        <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-gold group-hover:translate-x-1 transition-all" />
      </div>
    </Link>
  );
};

ClubListItemComponent.displayName = 'ClubListItem';

export default memo(ClubListItemComponent);
