import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { dataClient } from '@/integrations/supabase/dataClient';
import { useAuth } from '@/hooks/useAuth';

export interface StudentApplication {
  id: string;
  club_id: string;
  stage_id: string | null;
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

  const fetchApplications = useCallback(async () => {
    if (!user?.email) {
      setLoading(false);
      return;
    }

    try {
      const { data: applicantData, error: applicantError } = await supabase
        .from('applicants')
        .select('id, club_id, stage_id, first_name, last_name, email, major, year, is_quick_interest, created_at, updated_at')
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

      setApplications(enrichedApplications);
    } catch (error) {
      console.error('Error in fetchApplications:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  return { applications, loading, refetch: fetchApplications };
}
