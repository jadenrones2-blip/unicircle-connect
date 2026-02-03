import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface AdminProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  role_title: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export function useAdminProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('admin_profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (fetchError) throw fetchError;
        setProfile(data);
      } catch (err) {
        console.error('Error fetching admin profile:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const createProfile = async (data: { display_name: string; role_title: string; avatar_url?: string }) => {
    if (!user) throw new Error('Not authenticated');

    const { data: newProfile, error: insertError } = await supabase
      .from('admin_profiles')
      .insert({
        user_id: user.id,
        display_name: data.display_name,
        role_title: data.role_title,
        avatar_url: data.avatar_url || null,
      })
      .select()
      .single();

    if (insertError) throw insertError;
    setProfile(newProfile);
    return newProfile;
  };

  const updateProfile = async (data: Partial<{ display_name: string; role_title: string; avatar_url: string }>) => {
    if (!user || !profile) throw new Error('Not authenticated or no profile');

    const { data: updatedProfile, error: updateError } = await supabase
      .from('admin_profiles')
      .update(data)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) throw updateError;
    setProfile(updatedProfile);
    return updatedProfile;
  };

  const isProfileComplete = profile && profile.display_name && profile.role_title;

  return {
    profile,
    loading,
    error,
    createProfile,
    updateProfile,
    isProfileComplete,
  };
}
