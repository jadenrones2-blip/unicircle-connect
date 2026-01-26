import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ClubMembership {
  id: string;
  user_id: string;
  club_id: string;
  club_name: string;
  status: 'member' | 'officer' | 'alumni';
  joined_at: string;
  created_at: string;
}

export interface ClubApplication {
  id: string;
  user_id: string;
  club_id: string;
  club_name: string;
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
  applied_at: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useClubMemberships() {
  const [memberships, setMemberships] = useState<ClubMembership[]>([]);
  const [applications, setApplications] = useState<ClubApplication[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMemberships = useCallback(async (userId: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('club_memberships')
        .select('*')
        .eq('user_id', userId)
        .order('joined_at', { ascending: false });

      if (fetchError) throw fetchError;
      setMemberships((data as ClubMembership[]) || []);
      return data || [];
    } catch (err: any) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchApplications = useCallback(async (userId: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('club_applications')
        .select('*')
        .eq('user_id', userId)
        .order('applied_at', { ascending: false });

      if (fetchError) throw fetchError;
      setApplications((data as ClubApplication[]) || []);
      return data || [];
    } catch (err: any) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const applyToClub = useCallback(async (userId: string, clubId: string, clubName: string, notes?: string) => {
    try {
      const { data, error: insertError } = await supabase
        .from('club_applications')
        .insert({
          user_id: userId,
          club_id: clubId,
          club_name: clubName,
          notes: notes || null,
        })
        .select()
        .single();

      if (insertError) throw insertError;
      setApplications(prev => [data as ClubApplication, ...prev]);
      return { success: true, data };
    } catch (err: any) {
      // Handle unique constraint violation (already applied)
      if (err.code === '23505') {
        return { success: false, error: 'You have already applied to this club' };
      }
      return { success: false, error: err.message };
    }
  }, []);

  const withdrawApplication = useCallback(async (applicationId: string) => {
    try {
      const { error: updateError } = await supabase
        .from('club_applications')
        .update({ status: 'withdrawn' })
        .eq('id', applicationId);

      if (updateError) throw updateError;
      setApplications(prev =>
        prev.map(app =>
          app.id === applicationId ? { ...app, status: 'withdrawn' as const } : app
        )
      );
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, []);

  const addMembership = useCallback(async (userId: string, clubId: string, clubName: string) => {
    try {
      const { data, error: insertError } = await supabase
        .from('club_memberships')
        .insert({
          user_id: userId,
          club_id: clubId,
          club_name: clubName,
        })
        .select()
        .single();

      if (insertError) throw insertError;
      setMemberships(prev => [data as ClubMembership, ...prev]);
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, []);

  const removeMembership = useCallback(async (membershipId: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('club_memberships')
        .delete()
        .eq('id', membershipId);

      if (deleteError) throw deleteError;
      setMemberships(prev => prev.filter(m => m.id !== membershipId));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, []);

  const hasApplied = useCallback((clubId: string) => {
    return applications.some(app => app.club_id === clubId && app.status === 'pending');
  }, [applications]);

  const isMember = useCallback((clubId: string) => {
    return memberships.some(m => m.club_id === clubId);
  }, [memberships]);

  return {
    memberships,
    applications,
    loading,
    error,
    fetchMemberships,
    fetchApplications,
    applyToClub,
    withdrawApplication,
    addMembership,
    removeMembership,
    hasApplied,
    isMember,
  };
}
