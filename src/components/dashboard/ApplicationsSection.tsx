import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, CheckCircle, XCircle, Undo2, ChevronRight, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { ClubApplication } from '@/hooks/useClubMemberships';

interface ApplicationsSectionProps {
  applications: ClubApplication[];
  onWithdraw: (id: string) => void;
}

const statusConfig = {
  pending: {
    icon: Clock,
    color: 'bg-amber-500/10 text-amber-600',
    badge: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    label: 'Pending',
  },
  accepted: {
    icon: CheckCircle,
    color: 'bg-green-500/10 text-green-600',
    badge: 'bg-green-500/10 text-green-600 border-green-500/20',
    label: 'Accepted',
  },
  rejected: {
    icon: XCircle,
    color: 'bg-destructive/10 text-destructive',
    badge: 'bg-destructive/10 text-destructive border-destructive/20',
    label: 'Not Selected',
  },
  withdrawn: {
    icon: Undo2,
    color: 'bg-muted text-muted-foreground',
    badge: 'bg-muted text-muted-foreground border-border',
    label: 'Withdrawn',
  },
};

export default function ApplicationsSection({
  applications,
  onWithdraw,
}: ApplicationsSectionProps) {
  const activeApplications = applications.filter((app) => app.status !== 'withdrawn');

  if (activeApplications.length === 0) {
    return (
      <div className="text-center py-12 bg-muted/30 rounded-xl border border-dashed border-border">
        <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <h3 className="font-semibold text-foreground mb-1">No applications</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Apply to clubs from the recommendations below
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {activeApplications.map((application, index) => {
        const config = statusConfig[application.status];
        const StatusIcon = config.icon;

        return (
          <motion.div
            key={application.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="group flex items-center justify-between p-4 bg-card border border-border rounded-lg hover:border-primary/30 transition-all"
          >
            <div className="flex items-center gap-4">
              <div className={`p-2 rounded-lg ${config.color}`}>
                <StatusIcon className="h-5 w-5" />
              </div>
              <div>
                <Link
                  to={`/clubs/${application.club_id}`}
                  className="font-medium text-foreground hover:text-primary transition-colors flex items-center gap-1"
                >
                  {application.club_name}
                  <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className={`text-xs ${config.badge}`}>
                    {config.label}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Applied {new Date(application.applied_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
            {application.status === 'pending' && (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => onWithdraw(application.id)}
              >
                <Undo2 className="h-4 w-4 mr-1" />
                Withdraw
              </Button>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
