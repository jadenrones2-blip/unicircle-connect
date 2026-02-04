import { useState } from "react";
import { motion } from "framer-motion";
import { Users, Calendar, Loader2, Info } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";

export type RecruitmentCycle = "fall" | "winter" | "spring" | "rolling" | "none";
export type RecruitmentStatus = "open" | "upcoming" | "closed";

interface RecruitmentStatusCardProps {
  clubId: string;
  clubName: string;
  currentStatus: RecruitmentStatus;
  currentCycle: RecruitmentCycle;
  onUpdate?: () => void;
}

// Get current academic year (e.g., "2025-26")
function getAcademicYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  // Academic year starts in Fall (August/September)
  if (month >= 7) {
    return `${year}-${(year + 1).toString().slice(-2)}`;
  }
  return `${year - 1}-${year.toString().slice(-2)}`;
}

export function RecruitmentStatusCard({
  clubId,
  clubName,
  currentStatus,
  currentCycle,
  onUpdate,
}: RecruitmentStatusCardProps) {
  const [isRecruiting, setIsRecruiting] = useState(currentStatus !== "closed");
  const [status, setStatus] = useState<RecruitmentStatus>(currentStatus);
  const [cycle, setCycle] = useState<RecruitmentCycle>(currentCycle);
  const [isSaving, setIsSaving] = useState(false);

  const academicYear = getAcademicYear();

  const handleToggleRecruiting = async (checked: boolean) => {
    setIsRecruiting(checked);
    const newStatus = checked ? "open" : "closed";
    setStatus(newStatus);
    await saveRecruitmentStatus(newStatus, cycle);
  };

  const handleStatusChange = async (newStatus: RecruitmentStatus) => {
    setStatus(newStatus);
    setIsRecruiting(newStatus !== "closed");
    await saveRecruitmentStatus(newStatus, cycle);
  };

  const handleCycleChange = async (newCycle: RecruitmentCycle) => {
    setCycle(newCycle);
    await saveRecruitmentStatus(status, newCycle);
  };

  const saveRecruitmentStatus = async (
    newStatus: RecruitmentStatus,
    newCycle: RecruitmentCycle
  ) => {
    setIsSaving(true);
    try {
      const { error } = await supabase.functions.invoke("external-db-proxy", {
        body: {
          table: "clubs",
          action: "update",
          id: clubId,
          record: {
            recruitingStatus: newStatus,
            recruitment_cycle: newCycle,
          },
        },
      });

      if (error) throw error;

      toast.success("Recruitment status updated!");
      onUpdate?.();
    } catch (err) {
      console.error("Error updating recruitment status:", err);
      toast.error("Failed to update recruitment status");
      // Revert on error
      setStatus(currentStatus);
      setCycle(currentCycle);
      setIsRecruiting(currentStatus !== "closed");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="premium-card p-6"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Recruitment Status</h3>
            <p className="text-sm text-muted-foreground">
              Let students know if you're accepting new members
            </p>
          </div>
        </div>
        {isSaving && (
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        )}
      </div>

      <div className="space-y-5">
        {/* Main Toggle */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
          <div className="flex items-center gap-3">
            <Switch
              id="recruiting-toggle"
              checked={isRecruiting}
              onCheckedChange={handleToggleRecruiting}
              disabled={isSaving}
            />
            <Label htmlFor="recruiting-toggle" className="cursor-pointer">
              <span className="font-medium">
                {isRecruiting ? "Currently Recruiting" : "Not Recruiting"}
              </span>
            </Label>
          </div>
          <Badge
            variant="outline"
            className={
              isRecruiting
                ? "bg-green-500/10 text-green-600 border-green-500/20"
                : "bg-muted text-muted-foreground"
            }
          >
            {isRecruiting ? "Active" : "Inactive"}
          </Badge>
        </div>

        {/* Detailed Controls - shown when recruiting is on */}
        {isRecruiting && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="grid gap-4 md:grid-cols-2"
          >
            {/* Status Select */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label className="text-sm text-muted-foreground">Status</Label>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-3 h-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      "Open" shows a green badge on your profile. "Upcoming" shows a gold badge for planned recruitment.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Select
                value={status}
                onValueChange={(v) => handleStatusChange(v as RecruitmentStatus)}
                disabled={isSaving}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                      Open for Applications
                    </span>
                  </SelectItem>
                  <SelectItem value="upcoming">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-gold" />
                      Upcoming Recruitment
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Cycle Select */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label className="text-sm text-muted-foreground">
                  Recruitment Cycle
                </Label>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-3 h-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      Select which UCSD recruitment period this is for. Rolling means you accept applications year-round.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Select
                value={cycle}
                onValueChange={(v) => handleCycleChange(v as RecruitmentCycle)}
                disabled={isSaving}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fall">
                    <span className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Fall {academicYear}
                    </span>
                  </SelectItem>
                  <SelectItem value="winter">
                    <span className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Winter {academicYear}
                    </span>
                  </SelectItem>
                  <SelectItem value="spring">
                    <span className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Spring {academicYear}
                    </span>
                  </SelectItem>
                  <SelectItem value="rolling">
                    <span className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Rolling Admissions
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </motion.div>
        )}

        {/* Beta Notice */}
        <div className="flex items-start gap-3 p-3 rounded-lg bg-gold/5 border border-gold/20">
          <Info className="w-4 h-4 text-gold mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Beta Feature:</span>{" "}
            Recruitment tracking is coming soon. For now, this updates your public profile to show students you're recruiting.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
