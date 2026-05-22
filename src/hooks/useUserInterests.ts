import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface UserInterest {
  id: string;
  user_id: string;
  interest_category: string;
  interest_value: string;
  created_at: string;
}

export function useUserInterests() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInterests = useCallback(async (userId: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('user_interests')
        .select('*')
        .eq('user_id', userId);

      if (fetchError) throw fetchError;
      return data as UserInterest[];
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch interests';
      setError(message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const saveInterests = useCallback(
    async (userId: string, interests: { category: string; value: string }[]) => {
      setLoading(true);
      setError(null);
      try {
        // Delete existing interests first
        await supabase.from('user_interests').delete().eq('user_id', userId);

        // Insert new interests
        const records = interests.map((i) => ({
          user_id: userId,
          interest_category: i.category,
          interest_value: i.value,
        }));

        if (records.length > 0) {
          const { error: insertError } = await supabase.from('user_interests').insert(records);

          if (insertError) throw insertError;
        }

        return { success: true };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to save interests';
        setError(message);
        return { success: false, error: message };
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const hasCompletedOnboarding = useCallback(async (userId: string) => {
    try {
      const { data, error: fetchError } = await supabase
        .from('user_interests')
        .select('id')
        .eq('user_id', userId)
        .limit(1);

      if (fetchError) throw fetchError;
      return data && data.length > 0;
    } catch {
      return false;
    }
  }, []);

  const fetchResumeSignals = useCallback(async (userId: string): Promise<string[]> => {
    try {
      const { data, error: fetchError } = await (supabase as any)
        .from('profiles')
        .select('resume_signals')
        .eq('user_id', userId)
        .maybeSingle();

      if (fetchError || !data) return [];
      return Array.isArray(data.resume_signals) ? data.resume_signals : [];
    } catch {
      return [];
    }
  }, []);

  return {
    loading,
    error,
    fetchInterests,
    saveInterests,
    hasCompletedOnboarding,
    fetchResumeSignals,
  };
}
