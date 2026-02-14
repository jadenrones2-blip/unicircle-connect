import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface StudentApplication {
  id: string;
  club_id: string;
  stage_id: string | null;
  first_name: string;
  last_name: string;
  email: string;
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
      // Fetch applicant records for this user's email
      const { data: applicantData, error: applicantError } = await supabase
        .from('applicants')
        .select('id, club_id, stage_id, first_name, last_name, email, major, year, metadata, created_at, updated_at')
        .eq('email', user.email);

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

      // For each application, fetch stages and settings
      const enrichedApplications: StudentRecruitmentData[] = [];

      for (const app of applicantData) {
        // Fetch stages for this club
        const { data: stagesData } = await supabase
          .from('recruitment_stages')
          .select('*')
          .eq('club_id', app.club_id)
          .order('order_index', { ascending: true });

        // Fetch settings for this club
        const { data: settingsData } = await supabase
          .from('recruitment_settings')
          .select('*')
          .eq('club_id', app.club_id)
          .maybeSingle();

        const stages = stagesData || [];
        const currentStageIndex = app.stage_id 
          ? stages.findIndex(s => s.id === app.stage_id)
          : 0;
        const totalStages = stages.length;
        const progressPercent = totalStages > 0 
          ? Math.round(((currentStageIndex + 1) / totalStages) * 100)
          : 0;

        enrichedApplications.push({
          application: app,
          stages,
          settings: settingsData as ClubRecruitmentSettings | null,
          currentStageIndex: currentStageIndex >= 0 ? currentStageIndex : 0,
          totalStages,
          progressPercent,
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

  return {
    applications,
    loading,
    refetch: fetchApplications,
  };
}
