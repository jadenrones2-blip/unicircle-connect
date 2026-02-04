import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

export interface RecruitmentRequirement {
  id: string;
  club_id: string;
  type: 'strict' | 'ai';
  criterion: string;
  value: Json;
  created_at: string;
  updated_at: string;
}

export interface StrictFilter {
  id: string;
  criterion: 'min_gpa' | 'allowed_majors' | 'allowed_years';
  value: number | string[];
}

export interface AICriteria {
  id: string;
  criterion: string;
  description: string;
}

export function useRecruitmentRequirements(clubId: string | undefined) {
  const { user } = useAuth();
  const [requirements, setRequirements] = useState<RecruitmentRequirement[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequirements = useCallback(async () => {
    if (!clubId || !user) return;

    const { data, error } = await supabase
      .from('recruitment_requirements')
      .select('*')
      .eq('club_id', clubId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching requirements:', error);
      return;
    }

    // Cast the type field to our expected union type
    const typedData = (data || []).map((item) => ({
      ...item,
      type: item.type as 'strict' | 'ai',
    }));

    setRequirements(typedData);
  }, [clubId, user]);

  useEffect(() => {
    const loadData = async () => {
      if (!clubId || !user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      await fetchRequirements();
      setLoading(false);
    };

    loadData();
  }, [clubId, user, fetchRequirements]);

  const addRequirement = async (
    type: 'strict' | 'ai',
    criterion: string,
    value: Json
  ) => {
    if (!clubId || !user) return false;

    const { error } = await supabase
      .from('recruitment_requirements')
      .insert([{
        club_id: clubId,
        type,
        criterion,
        value,
      }]);

    if (error) {
      console.error('Error adding requirement:', error);
      toast.error('Failed to add requirement');
      return false;
    }

    await fetchRequirements();
    toast.success('Requirement added!');
    return true;
  };

  const updateRequirement = async (
    id: string,
    updates: { criterion?: string; value?: Json }
  ) => {
    if (!user) return false;

    const { error } = await supabase
      .from('recruitment_requirements')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('Error updating requirement:', error);
      toast.error('Failed to update requirement');
      return false;
    }

    await fetchRequirements();
    toast.success('Requirement updated!');
    return true;
  };

  const deleteRequirement = async (id: string) => {
    if (!user) return false;

    const { error } = await supabase
      .from('recruitment_requirements')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting requirement:', error);
      toast.error('Failed to delete requirement');
      return false;
    }

    setRequirements((prev) => prev.filter((r) => r.id !== id));
    toast.success('Requirement removed');
    return true;
  };

  const strictFilters = requirements.filter((r) => r.type === 'strict');
  const aiCriteria = requirements.filter((r) => r.type === 'ai');

  return {
    requirements,
    strictFilters,
    aiCriteria,
    loading,
    addRequirement,
    updateRequirement,
    deleteRequirement,
    refetch: fetchRequirements,
  };
}
