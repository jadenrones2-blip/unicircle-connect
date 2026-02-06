import { motion } from 'framer-motion';
import { CheckCircle2, Circle, Clock, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import type { StudentRecruitmentData } from '@/hooks/useStudentRecruitment';
import { useClubs } from '@/hooks/useExternalDB';

interface RecruitmentTrackerCardProps {
  data: StudentRecruitmentData;
  index: number;
}

export default function RecruitmentTrackerCard({ data, index }: RecruitmentTrackerCardProps) {
  const { application, stages, settings, currentStageIndex, progressPercent } = data;
  const { data: clubs } = useClubs();
  
  // Find club name from external DB
  const club = clubs.find(c => c.id === application.club_id);
  const clubName = club?.name || 'Club';

  const showStageNames = settings?.show_stage_names ?? false;
  const showProgressBar = settings?.show_progress_bar ?? true;
  const showTimeline = settings?.show_timeline ?? false;
  const customMessage = settings?.student_visible_message;

  const currentStage = stages[currentStageIndex];
  const isComplete = currentStageIndex === stages.length - 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm hover:border-amber-500/30 transition-colors">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg font-semibold">{clubName}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Applied {new Date(application.created_at).toLocaleDateString()}
              </p>
            </div>
            <Badge 
              variant={isComplete ? "default" : "secondary"}
              className={isComplete ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20"}
            >
              {isComplete ? "Complete" : "In Progress"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress Bar */}
          {showProgressBar && stages.length > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium text-foreground">{progressPercent}%</span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </div>
          )}

          {/* Current Stage Display */}
          {showStageNames && currentStage && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
              <Clock className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-medium">Current Stage:</span>
              <span className="text-sm text-muted-foreground">{currentStage.label}</span>
            </div>
          )}

          {/* Timeline View */}
          {showTimeline && stages.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Timeline</p>
              <div className="flex items-center gap-1">
                {stages.map((stage, idx) => (
                  <div key={stage.id} className="flex items-center">
                    <div className="flex flex-col items-center">
                      {idx < currentStageIndex ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : idx === currentStageIndex ? (
                        <div className="h-5 w-5 rounded-full border-2 border-amber-500 bg-amber-500/20 flex items-center justify-center">
                          <div className="h-2 w-2 rounded-full bg-amber-500" />
                        </div>
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground/50" />
                      )}
                      {showStageNames && (
                        <span className="text-xs text-muted-foreground mt-1 max-w-[60px] truncate text-center">
                          {stage.label}
                        </span>
                      )}
                    </div>
                    {idx < stages.length - 1 && (
                      <div 
                        className={`h-0.5 w-6 mx-1 ${
                          idx < currentStageIndex 
                            ? 'bg-green-500' 
                            : 'bg-muted-foreground/30'
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Custom Message from Club */}
          {customMessage && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
              <MessageSquare className="h-4 w-4 text-primary mt-0.5" />
              <p className="text-sm text-muted-foreground">{customMessage}</p>
            </div>
          )}

          {/* Minimal view if nothing is enabled */}
          {!showProgressBar && !showStageNames && !showTimeline && !customMessage && (
            <p className="text-sm text-muted-foreground">
              Your application is being reviewed. Check back for updates.
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
