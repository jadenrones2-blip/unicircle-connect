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
      // Get the current user's email from auth
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        return { success: false, error: 'User email not found. Please log in again.' };
      }

      // Get user's profile for name info
      const { data: profileData } = await supabase
        .from('profiles')
        .select('display_name, email')
        .eq('user_id', userId)
        .maybeSingle();

      // Parse name from profile or email
      let firstName = 'Student';
      let lastName = '';
      
      if (profileData?.display_name) {
        const nameParts = profileData.display_name.trim().split(' ');
        firstName = nameParts[0] || 'Student';
        lastName = nameParts.slice(1).join(' ') || '';
      } else {
        // Use email prefix as fallback
        const emailPrefix = user.email.split('@')[0];
        firstName = emailPrefix;
      }

      // Create club_applications record (for dashboard tracking)
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

      // Also create applicants record (for recruitment pipeline)
      // This allows club admins to see the applicant in their kanban
      // and allows students to see their progress in the recruitment tracker
      // Get the first stage for this club (if any exists)
      const { data: firstStage } = await supabase
        .from('recruitment_stages')
        .select('id')
        .eq('club_id', clubId)
        .order('order_index', { ascending: true })
        .limit(1)
        .maybeSingle();

      // Insert into applicants table - this may fail due to RLS if the club
      // hasn't enabled recruitment, but we still want the club_applications to succeed
      await supabase
        .from('applicants')
        .insert({
          club_id: clubId,
          first_name: firstName,
          last_name: lastName,
          email: user.email,
          stage_id: firstStage?.id || null,
        });
      // Note: We don't throw on error here because the club may not have
      // recruitment enabled, but the application should still go through

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
