import { motion } from 'framer-motion';
import { Users, Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export type RecruitmentCycle = 'fall' | 'winter' | 'spring' | 'rolling' | 'none';
export type RecruitmentStatus = 'open' | 'upcoming' | 'closed';

interface RecruitmentStatusCardProps {
  clubId: string;
  clubName: string;
  currentStatus: RecruitmentStatus;
  currentCycle: RecruitmentCycle;
  onUpdate?: () => void;
}

export function RecruitmentStatusCard({}: RecruitmentStatusCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="premium-card p-6 opacity-60 pointer-events-none select-none"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              Recruitment Status
              <Lock className="w-3.5 h-3.5 text-muted-foreground" />
            </h3>
            <p className="text-sm text-muted-foreground">
              Coming soon — this feature is not yet available
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
        <div className="flex items-center gap-3">
          <Switch id="recruiting-toggle" checked={false} disabled />
          <Label htmlFor="recruiting-toggle">
            <span className="font-medium text-muted-foreground">Not Recruiting</span>
          </Label>
        </div>
        <Badge variant="outline" className="bg-muted text-muted-foreground">
          Inactive
        </Badge>
      </div>
    </motion.div>
  );
}
