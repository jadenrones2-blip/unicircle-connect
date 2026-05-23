import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface AdminProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  role_title: string | null;
  avatar_url: string | null;
  bio: string | null;
  major: string | null;
  graduation_year: string | null;
  contact_email: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  portfolio_url: string | null;
  calendly_url: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

export type AdminProfileUpdate = Partial<
  Pick<
    AdminProfile,
    | 'display_name'
    | 'role_title'
    | 'avatar_url'
    | 'bio'
    | 'major'
    | 'graduation_year'
    | 'contact_email'
    | 'linkedin_url'
    | 'github_url'
    | 'portfolio_url'
    | 'calendly_url'
    | 'phone'
  >
>;

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
        const { data, error: fetchError } = await (supabase as any)
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

  const createProfile = async (data: {
    display_name: string;
    role_title: string;
    avatar_url?: string;
    bio?: string;
    major?: string;
    graduation_year?: string;
    contact_email?: string;
    linkedin_url?: string;
    github_url?: string;
    portfolio_url?: string;
    calendly_url?: string;
    phone?: string;
  }) => {
    if (!user) throw new Error('Not authenticated');

    const { data: newProfile, error: insertError } = await (supabase as any)
      .from('admin_profiles')
      .insert({
        user_id: user.id,
        display_name: data.display_name,
        role_title: data.role_title,
        avatar_url: data.avatar_url || null,
        bio: data.bio || null,
        major: data.major || null,
        graduation_year: data.graduation_year || null,
        contact_email: data.contact_email || user.email || null,
        linkedin_url: data.linkedin_url || null,
        github_url: data.github_url || null,
        portfolio_url: data.portfolio_url || null,
        calendly_url: data.calendly_url || null,
        phone: data.phone || null,
      })
      .select()
      .single();

    if (insertError) throw insertError;
    setProfile(newProfile);
    return newProfile;
  };

  const updateProfile = async (data: AdminProfileUpdate) => {
    if (!user || !profile) throw new Error('Not authenticated or no profile');

    const { data: updatedProfile, error: updateError } = await (supabase as any)
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
