import { Link } from 'react-router-dom';
import { Users, ArrowRight, UserPlus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRecruitment } from '@/hooks/useRecruitment';

interface RecruitmentDashboardCardProps {
  clubId: string;
  clubName: string;
}

export function RecruitmentDashboardCard({ clubId, clubName }: RecruitmentDashboardCardProps) {
  const { isEnabled, hasStages, applicants, stages, loading } = useRecruitment(clubId);

  if (loading) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-6">
          <div className="animate-pulse flex items-center gap-4">
            <div className="w-12 h-12 bg-muted rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-1/2" />
              <div className="h-3 bg-muted rounded w-1/3" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Not enabled state - prominent CTA
  if (!isEnabled) {
    return (
      <Card className="border-gold/30 bg-gradient-to-br from-gold/5 to-transparent overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-gold/10">
              <Users className="w-5 h-5 text-gold" />
            </div>
            <div>
              <CardTitle className="text-base font-display font-bold tracking-tight">
                Start Recruiting
              </CardTitle>
              <p className="text-sm text-muted-foreground">{clubName}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Track applicants through your recruitment pipeline with our Kanban-style board.
          </p>
          <Button variant="gold" size="sm" asChild className="w-full">
            <Link to={`/club-admin/clubs/${clubId}/recruitment`}>
              <UserPlus className="w-4 h-4 mr-2" />
              Enable Recruitment
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Enabled but no stages - needs setup
  if (!hasStages) {
    return (
      <Card className="border-yellow-500/30 bg-yellow-500/5">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-yellow-500/10">
              <Users className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <CardTitle className="text-base font-display font-bold tracking-tight">
                Finish Setup
              </CardTitle>
              <p className="text-sm text-muted-foreground">{clubName}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Complete your recruitment pipeline setup to start tracking applicants.
          </p>
          <Button
            variant="outline"
            size="sm"
            asChild
            className="w-full border-yellow-500/50 hover:bg-yellow-500/10"
          >
            <Link to={`/club-admin/clubs/${clubId}/recruitment`}>
              Complete Setup
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Active recruitment - show stats
  const applicantsByStage = stages.map((stage) => ({
    label: stage.label,
    count: applicants.filter((a) => a.stage_id === stage.id).length,
  }));

  return (
    <Card className="border-gold/20 hover:border-gold/40 transition-colors">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-gold/10">
              <Users className="w-5 h-5 text-gold" />
            </div>
            <div>
              <CardTitle className="text-base font-display font-bold tracking-tight">
                Recruitment
              </CardTitle>
              <p className="text-sm text-muted-foreground">{clubName}</p>
            </div>
          </div>
          <Badge variant="outline" className="border-gold/50 text-gold bg-gold/10">
            {applicants.length} applicant{applicants.length !== 1 ? 's' : ''}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* Pipeline preview */}
        <div className="flex gap-1 mb-4">
          {applicantsByStage.map((stage, idx) => (
            <div key={idx} className="flex-1 text-center">
              <div className="text-lg font-display font-bold text-foreground">{stage.count}</div>
              <div className="text-[10px] text-muted-foreground truncate uppercase tracking-wider font-medium">
                {stage.label}
              </div>
            </div>
          ))}
        </div>

        <Button variant="outline" size="sm" asChild className="w-full">
          <Link to={`/club-admin/clubs/${clubId}/recruitment`}>
            Open Pipeline
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
