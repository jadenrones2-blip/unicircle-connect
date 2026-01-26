import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, ChevronRight, UserMinus, Crown, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { ClubMembership } from '@/hooks/useClubMemberships';

interface MyClubsSectionProps {
  memberships: ClubMembership[];
  onRemoveMembership: (id: string) => void;
}

const statusIcons = {
  member: Users,
  officer: Crown,
  alumni: GraduationCap,
};

const statusColors = {
  member: 'bg-primary/10 text-primary',
  officer: 'bg-gold/10 text-gold',
  alumni: 'bg-muted text-muted-foreground',
};

export default function MyClubsSection({ memberships, onRemoveMembership }: MyClubsSectionProps) {
  if (memberships.length === 0) {
    return (
      <div className="text-center py-12 bg-muted/30 rounded-xl border border-dashed border-border">
        <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <h3 className="font-semibold text-foreground mb-1">No clubs yet</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Start by applying to clubs you're interested in
        </p>
        <Link to="/clubs">
          <Button variant="outline" size="sm">
            Browse Clubs
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {memberships.map((membership, index) => {
        const StatusIcon = statusIcons[membership.status];
        return (
          <motion.div
            key={membership.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="group flex items-center justify-between p-4 bg-card border border-border rounded-lg hover:border-primary/30 transition-all"
          >
            <div className="flex items-center gap-4">
              <div className={`p-2 rounded-lg ${statusColors[membership.status]}`}>
                <StatusIcon className="h-5 w-5" />
              </div>
              <div>
                <Link 
                  to={`/clubs/${membership.club_id}`}
                  className="font-medium text-foreground hover:text-primary transition-colors flex items-center gap-1"
                >
                  {membership.club_name}
                  <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs capitalize">
                    {membership.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Joined {new Date(membership.joined_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => onRemoveMembership(membership.id)}
            >
              <UserMinus className="h-4 w-4" />
            </Button>
          </motion.div>
        );
      })}
    </div>
  );
}
