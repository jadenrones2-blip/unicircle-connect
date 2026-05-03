import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { dataClient } from '@/integrations/supabase/dataClient';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface StudentApplication {
  id: string;
  club_id: string;
  stage_id: string | null;
  final_decision: string | null;
  first_name: string;
  last_name: string;
  email: string;
  major: string | null;
  year: string | null;
  is_quick_interest: boolean;
  created_at: string;
  updated_at: string;
}

export interface RecruitmentStage {
  id: string;
  club_id: string;
  label: string;
  order_index: number;
}

export interface ClubRecruitmentSettings {
  club_id: string;
  show_stage_names: boolean;
  show_progress_bar: boolean;
  show_timeline: boolean;
  student_visible_message: string | null;
}

export interface StudentRecruitmentData {
  application: StudentApplication;
  stages: RecruitmentStage[];
  settings: ClubRecruitmentSettings | null;
  currentStageIndex: number;
  totalStages: number;
  progressPercent: number;
  clubName: string;
}

export function useStudentRecruitment() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<StudentRecruitmentData[]>([]);
  const [loading, setLoading] = useState(true);
  // Track previous state so we can detect meaningful changes for notifications
  const prevApplicationsRef = useRef<StudentRecruitmentData[]>([]);

  const fetchApplications = useCallback(async (silent = false) => {
    if (!user?.email) {
      setLoading(false);
      return;
    }
    if (!silent) setLoading(true);

    try {
      const { data: applicantData, error: applicantError } = await supabase
        .from('applicants')
        .select('id, club_id, stage_id, final_decision, first_name, last_name, email, major, year, is_quick_interest, created_at, updated_at')
        .eq('email', user.email)
        .order('created_at', { ascending: false });

      if (applicantError) {
        console.error('Error fetching applicant data:', applicantError);
        setLoading(false);
        return;
      }

      if (!applicantData || applicantData.length === 0) {
        setApplications([]);
        setLoading(false);
        return;
      }

      // Batch fetch club names from external DB
      const clubIds = [...new Set(applicantData.map((a: any) => a.club_id))];
      const { data: clubRows } = await dataClient
        .from('clubs')
        .select('id, name')
        .in('id', clubIds as string[]);

      const clubNameMap: Record<string, string> = {};
      for (const c of clubRows ?? []) {
        clubNameMap[(c as any).id] = (c as any).name;
      }

      const enrichedApplications: StudentRecruitmentData[] = [];

      for (const app of applicantData) {
        const { data: stagesData } = await supabase
          .from('recruitment_stages')
          .select('*')
          .eq('club_id', app.club_id)
          .order('order_index', { ascending: true });

        const { data: settingsData } = await supabase
          .from('recruitment_settings')
          .select('*')
          .eq('club_id', app.club_id)
          .maybeSingle();

        const stages = stagesData || [];
        const currentStageIndex = app.stage_id
          ? stages.findIndex((s: any) => s.id === app.stage_id)
          : 0;
        const totalStages = stages.length;
        const progressPercent = totalStages > 0
          ? Math.round(((currentStageIndex + 1) / totalStages) * 100)
          : 0;

        enrichedApplications.push({
          application: {
            ...app,
            final_decision: (app as any).final_decision ?? null,
            is_quick_interest: (app as any).is_quick_interest ?? false,
          } as StudentApplication,
          stages: stages as RecruitmentStage[],
          settings: settingsData as ClubRecruitmentSettings | null,
          currentStageIndex: currentStageIndex >= 0 ? currentStageIndex : 0,
          totalStages,
          progressPercent,
          clubName: clubNameMap[app.club_id] ?? 'Club',
        });
      }

      // Diff against previous state to fire notifications
      if (prevApplicationsRef.current.length > 0) {
        for (const next of enrichedApplications) {
          const prev = prevApplicationsRef.current.find(p => p.application.id === next.application.id);
          if (!prev) continue;

          const stageMoved = prev.application.stage_id !== next.application.stage_id;
          const decisionPosted = !prev.application.final_decision && next.application.final_decision;

          if (decisionPosted) {
            if (next.application.final_decision === 'accepted') {
              toast.success(`You've been accepted to ${next.clubName}! 🎉`);
            } else if (next.application.final_decision === 'rejected') {
              toast.info(`A decision has been posted for your ${next.clubName} application.`);
            }
          } else if (stageMoved) {
            const stageName = next.stages[next.currentStageIndex]?.label;
            toast.success(
              stageName
                ? `Your ${next.clubName} application moved to "${stageName}"`
                : `Your ${next.clubName} application status was updated`
            );
          }
        }
      }

      prevApplicationsRef.current = enrichedApplications;
      setApplications(enrichedApplications);
    } catch (error) {
      console.error('Error in fetchApplications:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  // Initial fetch
  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  // Realtime subscription — fires whenever an applicant row with this email is updated
  useEffect(() => {
    if (!user?.email) return;

    const channel = supabase
      .channel(`student-applications-${user.email}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'applicants' },
        (payload) => {
          if ((payload.new as any)?.email === user.email) {
            fetchApplications(true);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.email, fetchApplications]);

  return { applications, loading, refetch: fetchApplications };
}
