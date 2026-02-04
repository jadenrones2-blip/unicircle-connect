import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface RecruitmentStage {
  id: string;
  club_id: string;
  label: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface Applicant {
  id: string;
  club_id: string;
  stage_id: string | null;
  first_name: string;
  last_name: string;
  email: string;
  major: string | null;
  year: string | null;
  notes: string | null;
  gpa: number | null;
  metadata: Record<string, string> | null;
  fit_score: number | null;
  ai_summary: string | null;
  passes_strict_filters: boolean | null;
  created_at: string;
  updated_at: string;
}

// Type to cast database response to Applicant
type ApplicantRow = Omit<Applicant, 'metadata'> & { metadata: unknown };

export interface RecruitmentSettings {
  id: string;
  club_id: string;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export function useRecruitment(clubId: string | undefined) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<RecruitmentSettings | null>(null);
  const [stages, setStages] = useState<RecruitmentStage[]>([]);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    if (!clubId || !user) return;
    
    const { data, error } = await supabase
      .from('recruitment_settings')
      .select('*')
      .eq('club_id', clubId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching recruitment settings:', error);
      return null;
    }
    
    setSettings(data);
    return data;
  }, [clubId, user]);

  const fetchStages = useCallback(async () => {
    if (!clubId || !user) return;
    
    const { data, error } = await supabase
      .from('recruitment_stages')
      .select('*')
      .eq('club_id', clubId)
      .order('order_index', { ascending: true });

    if (error) {
      console.error('Error fetching recruitment stages:', error);
      return;
    }
    
    setStages(data || []);
  }, [clubId, user]);

  const fetchApplicants = useCallback(async () => {
    if (!clubId || !user) return;
    
    const { data, error } = await supabase
      .from('applicants')
      .select('*')
      .eq('club_id', clubId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching applicants:', error);
      return;
    }
    
    // Cast metadata to our expected type
    const typedApplicants: Applicant[] = (data || []).map((row) => ({
      ...row,
      metadata: (row.metadata as Record<string, string>) || null,
    }));
    
    setApplicants(typedApplicants);
  }, [clubId, user]);

  useEffect(() => {
    const loadData = async () => {
      if (!clubId || !user) {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      await Promise.all([fetchSettings(), fetchStages(), fetchApplicants()]);
      setLoading(false);
    };

    loadData();
  }, [clubId, user, fetchSettings, fetchStages, fetchApplicants]);

  const enableRecruitment = async () => {
    if (!clubId || !user) return false;

    const { error } = await supabase
      .from('recruitment_settings')
      .upsert({
        club_id: clubId,
        is_enabled: true,
      }, {
        onConflict: 'club_id'
      });

    if (error) {
      console.error('Error enabling recruitment:', error);
      toast.error('Failed to enable recruitment');
      return false;
    }

    await fetchSettings();
    toast.success('Recruitment enabled!');
    return true;
  };

  const createStages = async (stageLabels: string[]) => {
    if (!clubId || !user) return false;

    const stagesToInsert = stageLabels.map((label, index) => ({
      club_id: clubId,
      label,
      order_index: index,
    }));

    const { error } = await supabase
      .from('recruitment_stages')
      .insert(stagesToInsert);

    if (error) {
      console.error('Error creating stages:', error);
      toast.error('Failed to create stages');
      return false;
    }

    await fetchStages();
    toast.success('Stages created!');
    return true;
  };

  const addApplicant = async (applicant: {
    first_name: string;
    last_name: string;
    email: string;
    major?: string;
    year?: string;
  }) => {
    if (!clubId || !user || stages.length === 0) return false;

    const { error } = await supabase
      .from('applicants')
      .insert({
        club_id: clubId,
        stage_id: stages[0].id,
        first_name: applicant.first_name,
        last_name: applicant.last_name,
        email: applicant.email,
        major: applicant.major || null,
        year: applicant.year || null,
      });

    if (error) {
      console.error('Error adding applicant:', error);
      toast.error('Failed to add applicant');
      return false;
    }

    await fetchApplicants();
    toast.success('Applicant added!');
    return true;
  };

  const bulkAddApplicants = async (applicantsList: {
    first_name: string;
    last_name: string;
    email: string;
    major?: string;
    year?: string;
    gpa?: number;
    metadata?: Record<string, string>;
  }[]): Promise<{ success: number; failed: number }> => {
    if (!clubId || !user || stages.length === 0) {
      return { success: 0, failed: applicantsList.length };
    }

    const firstStageId = stages[0].id;
    let successCount = 0;
    let failedCount = 0;

    // Insert in batches of 50
    const batchSize = 50;
    for (let i = 0; i < applicantsList.length; i += batchSize) {
      const batch = applicantsList.slice(i, i + batchSize).map(applicant => ({
        club_id: clubId,
        stage_id: firstStageId,
        first_name: applicant.first_name,
        last_name: applicant.last_name,
        email: applicant.email,
        major: applicant.major || null,
        year: applicant.year || null,
        gpa: applicant.gpa || null,
        metadata: applicant.metadata || {},
      }));

      const { data, error } = await supabase
        .from('applicants')
        .insert(batch)
        .select();

      if (error) {
        console.error('Error in batch insert:', error);
        failedCount += batch.length;
      } else {
        successCount += data?.length || 0;
      }
    }

    await fetchApplicants();
    
    if (successCount > 0) {
      toast.success(`Imported ${successCount} applicant${successCount !== 1 ? 's' : ''}`);
    }
    if (failedCount > 0) {
      toast.error(`${failedCount} applicant${failedCount !== 1 ? 's' : ''} failed to import`);
    }

    return { success: successCount, failed: failedCount };
  };

  const updateApplicantStage = async (applicantId: string, newStageId: string, clubName?: string) => {
    if (!user) return false;

    const { error } = await supabase
      .from('applicants')
      .update({ stage_id: newStageId })
      .eq('id', applicantId);

    if (error) {
      console.error('Error updating applicant stage:', error);
      toast.error('Failed to move applicant');
      return false;
    }

    // Find the applicant and stage for notification
    const applicant = applicants.find(a => a.id === applicantId);
    const newStage = stages.find(s => s.id === newStageId);

    // Send notification for interview/accepted stages
    if (applicant && newStage && clubName) {
      try {
        const response = await supabase.functions.invoke('notify-applicant-stage', {
          body: {
            applicantId: applicant.id,
            applicantEmail: applicant.email,
            applicantName: `${applicant.first_name} ${applicant.last_name}`,
            stageName: newStage.label,
            clubName: clubName,
            clubId: clubId,
          },
        });
        
        if (response.data?.success && response.data?.emailResponse) {
          toast.success(`Notification sent to ${applicant.first_name}`);
        }
      } catch (notifyError) {
        console.error('Failed to send stage notification:', notifyError);
        // Don't fail the stage update if notification fails
      }
    }

    setApplicants(prev => 
      prev.map(a => a.id === applicantId ? { ...a, stage_id: newStageId } : a)
    );
    return true;
  };

  const deleteApplicant = async (applicantId: string) => {
    if (!user) return false;

    const { error } = await supabase
      .from('applicants')
      .delete()
      .eq('id', applicantId);

    if (error) {
      console.error('Error deleting applicant:', error);
      toast.error('Failed to delete applicant');
      return false;
    }

    setApplicants(prev => prev.filter(a => a.id !== applicantId));
    toast.success('Applicant removed');
    return true;
  };

  return {
    settings,
    stages,
    applicants,
    loading,
    isEnabled: settings?.is_enabled ?? false,
    hasStages: stages.length > 0,
    enableRecruitment,
    createStages,
    addApplicant,
    bulkAddApplicants,
    updateApplicantStage,
    deleteApplicant,
    refetch: async () => {
      await Promise.all([fetchSettings(), fetchStages(), fetchApplicants()]);
    }
  };
}
